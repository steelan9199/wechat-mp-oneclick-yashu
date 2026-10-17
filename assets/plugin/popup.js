/* 公众号一键设置 — 弹窗
 * 完全由 actions.json 驱动：配置里有几项，界面就渲染几张卡片。
 * 加新设置项不需要改本文件。
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

function renderCard(action) {
  const card = mk('div', 'card');

  const head = mk('div', 'card-head');
  head.appendChild(mk('span', null, action.name || action.id));
  card.appendChild(head);

  if (action.desc) card.appendChild(mk('div', 'desc', action.desc));

  const inputs = action.inputs || [];
  for (const f of inputs) {
    const row = mk('div', 'row');
    row.appendChild(mk('label', null, f.label || f.key));

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = f.placeholder || '';
    inp.maxLength = f.maxLength || 64;
    inp.value = f.default || '';
    inp.dataset.key = f.key;
    row.appendChild(inp);

    card.appendChild(row);
  }

  const btn = mk('button', null, '执行');
  const status = mk('div', 'status');
  card.appendChild(btn);
  card.appendChild(status);

  btn.addEventListener('click', async () => {
    const values = {};
    let bad = null;

    for (const inp of card.querySelectorAll('input')) {
      const v = inp.value.trim();
      const f = inputs.find((x) => x.key === inp.dataset.key) || {};
      if (!v) { bad = (f.label || f.key) + ' 不能为空'; break; }
      if (f.maxLength && v.length > f.maxLength) {
        bad = (f.label || f.key) + ' 不能超过 ' + f.maxLength + ' 个字';
        break;
      }
      values[inp.dataset.key] = v;
    }

    if (bad) { setStatus(status, bad, 'err'); return; }

    const toSave = {};
    for (const k in values) toSave[keyOf(action.id, k)] = values[k];
    chrome.storage.local.set(toSave).catch(() => {});

    btn.disabled = true;
    setStatus(status, '执行中…');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) throw new Error('取不到当前标签页');

      const res = await chrome.runtime.sendMessage({
        type: 'run',
        tabId: tab.id,
        actionId: action.id,
        values
      });

      if (!res) {
        setStatus(status, '执行器无返回，重载扩展后重试', 'err');
      } else {
        setStatus(status, (res.log || []).join('\n'), res.ok ? 'ok' : 'err');
      }
    } catch (e) {
      setStatus(status, '执行失败：' + (e && e.message ? e.message : e), 'err');
    } finally {
      btn.disabled = false;
    }
  });

  return card;
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

  const actions = cfg.actions || [];
  if (!actions.length) {
    $list.appendChild(mk('div', 'desc', 'actions.json 里没有配置任何设置项'));
    return;
  }

  for (const a of actions) $list.appendChild(renderCard(a));

  /* 恢复上次填过的值 */
  const nodes = [...$list.querySelectorAll('.card')];
  const keys = [];
  nodes.forEach((card, ci) => {
    card.querySelectorAll('input').forEach((inp) => {
      keys.push(keyOf(actions[ci].id, inp.dataset.key));
    });
  });

  const saved = await chrome.storage.local.get(keys);

  nodes.forEach((card, ci) => {
    card.querySelectorAll('input').forEach((inp) => {
      const k = keyOf(actions[ci].id, inp.dataset.key);
      if (saved[k] != null) inp.value = saved[k];
    });
  });
}

boot();
