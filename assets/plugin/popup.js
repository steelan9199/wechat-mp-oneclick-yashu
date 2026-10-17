/* 公众号一键设置 — 弹窗
 * 只渲染一个「一键」按钮：按 actions.json 里 actions 的顺序依次执行全部设置项，
 * 每项之间间隔 runAll.gap 毫秒（默认 1000）。
 * 各设置项的输入参数（如有）仍然按 actions.json 自动渲染，值会记住。
 */

const $list = document.getElementById('list');

const keyOf = (actionId, key) => 'v:' + actionId + ':' + key;

function mk(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function setStatus(node, text, type) {
  node.textContent = text;
  node.className = 'status ' + (type || '');
  node.style.display = 'block';
}

function buildIntro(actions, gapSec) {
  const names = actions.map((a, i) => i + 1 + ' ' + (a.name || a.id)).join(' → ');
  return '按顺序执行：' + names + '，每项之间间隔 ' + gapSec + ' 秒。';
}

async function boot() {
  let cfg;
  try {
    const res = await fetch('actions.json');
    cfg = await res.json();
  } catch (e) {
    $list.appendChild(mk('div', 'desc', '读取 actions.json 失败：' + e.message));
    return;
  }

  const actions = (cfg.actions || []).filter((a) => a.enabled !== false);
  if (!actions.length) {
    $list.appendChild(mk('div', 'desc', 'actions.json 里没有配置任何设置项'));
    return;
  }

  const runAll = cfg.runAll || {};
  const gap = Number.isFinite(runAll.gap) ? runAll.gap : 1000;
  const gapSec = (gap / 1000).toFixed(gap % 1000 ? 1 : 0);

  const card = mk('div', 'card');
  card.appendChild(mk('div', 'card-head', runAll.name || '一键设置'));

  const intro = mk('div', 'desc', runAll.desc || buildIntro(actions, gapSec));
  intro.title = actions.map((a) => a.name || a.id).join(' / ');
  card.appendChild(intro);

  /* 输入参数：所有设置项的 inputs 汇总渲染（当前四项都不需要输入） */
  const fields = [];
  for (const a of actions) {
    for (const f of a.inputs || []) fields.push(Object.assign({ actionId: a.id }, f));
  }

  for (const f of fields) {
    const row = mk('div', 'row');
    row.appendChild(mk('label', null, f.label || f.key));

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = f.placeholder || '';
    inp.maxLength = f.maxLength || 64;
    inp.value = f.default || '';
    inp.dataset.key = f.key;
    inp.dataset.actionId = f.actionId;
    row.appendChild(inp);

    card.appendChild(row);
  }

  const btn = mk('button', null, runAll.buttonLabel || '一键设置');
  const status = mk('div', 'status');
  card.appendChild(btn);
  card.appendChild(status);
  $list.appendChild(card);

  /* 恢复上次填过的值 */
  if (fields.length) {
    const keys = fields.map((f) => keyOf(f.actionId, f.key));
    const saved = await chrome.storage.local.get(keys);
    card.querySelectorAll('input').forEach((inp) => {
      const k = keyOf(inp.dataset.actionId, inp.dataset.key);
      if (saved[k] != null) inp.value = saved[k];
    });
  }

  const fmt = (ts) => {
    const d = new Date(ts || Date.now());
    const p = (n) => String(n).padStart(2, '0');
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  };

  /* 上次执行的日志：弹窗中途被点掉也能看到结果 */
  const last = await chrome.storage.local.get('lastRun');
  if (last.lastRun && (last.lastRun.log || []).length) {
    setStatus(
      status,
      '上次执行 ' + fmt(last.lastRun.at) + '\n' + last.lastRun.log.join('\n'),
      ''
    );
  }

  btn.addEventListener('click', async () => {
    const values = {};
    let bad = null;

    for (const inp of card.querySelectorAll('input')) {
      const v = inp.value.trim();
      const f = fields.find(
        (x) => x.key === inp.dataset.key && x.actionId === inp.dataset.actionId
      ) || {};
      if (!v && !f.optional) { bad = (f.label || f.key) + ' 不能为空'; break; }
      if (f.maxLength && v.length > f.maxLength) {
        bad = (f.label || f.key) + ' 不能超过 ' + f.maxLength + ' 个字';
        break;
      }
      if (v) values[inp.dataset.key] = v;
    }

    if (bad) { setStatus(status, bad, 'err'); return; }

    if (Object.keys(values).length) {
      const toSave = {};
      for (const k in values) {
        const f = fields.find((x) => x.key === k);
        if (f) toSave[keyOf(f.actionId, k)] = values[k];
      }
      chrome.storage.local.set(toSave).catch(() => {});
    }

    btn.disabled = true;
    setStatus(status, '执行中…共 ' + actions.length + ' 项，期间不要切换标签页');

    /* 边跑边显示进度（后台每项结束都会写一份快照） */
    const ticker = setInterval(async () => {
      const cur = await chrome.storage.local.get('lastRun');
      const lr = cur.lastRun;
      if (!lr || !(lr.log || []).length) return;
      if (Date.now() - (lr.at || 0) > 3 * 60 * 1000) return;
      setStatus(status, '执行中…\n' + lr.log.join('\n'), '');
      status.scrollTop = status.scrollHeight;
    }, 800);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) throw new Error('取不到当前标签页');

      const res = await chrome.runtime.sendMessage({
        type: 'runAll',
        tabId: tab.id,
        values,
        gap
      });

      if (!res) {
        setStatus(status, '执行器无返回，重载扩展后重试', 'err');
      } else {
        setStatus(status, '完成于 ' + fmt() + '\n' + (res.log || []).join('\n'), res.ok ? 'ok' : 'err');
        status.scrollTop = status.scrollHeight;
      }
    } catch (e) {
      setStatus(status, '执行失败：' + (e && e.message ? e.message : e), 'err');
    } finally {
      clearInterval(ticker);
      btn.disabled = false;
    }
  });
}

boot();
