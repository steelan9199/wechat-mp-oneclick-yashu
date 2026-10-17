/* 公众号一键设置 — 通用执行器
 *
 * 设计：本文件只实现"动作能力"，不硬编码任何业务逻辑。
 * 所有设置项都写在 actions.json 里。加新选项 = 加一段 JSON，本文件不动。
 *
 * 支持的动作（step.action）：
 *   click     点击元素          { target, text?, pick?, index?, visibleOnly?, climb?, wait? }
 *   type      输入文字          { target, value, mode?: "composed"|"instant" }
 *   toggle    开关（幂等）      { target, checked?: true|false }
 *   radio     单选（幂等）      { target }
 *   waitFor   等元素出现        { target, timeout? }
 *   waitGone  等元素消失        { target, timeout? }
 *   sleep     纯等待            { ms }
 *
 * 公共字段：
 *   target      字符串或字符串数组（按顺序试候选）
 *   text        按文本精确匹配过滤（忽略空白差异）；选择器全没命中时
 *               自动退化为「全文档按文本找最内层可见元素」，适合类名未知的场景。
 *               不想用这个兜底就写 "textScan": false
 *   pick        "first"（默认）| "last"
 *   index       取第几个
 *   visibleOnly false 时才允许操作 display:none 的元素
 *   climb       true 时点元素自身或最近的 cursor:pointer 祖先
 *   optional    true 时找不到元素就跳过
 *   wait        动作后的额外等待毫秒
 *
 * 校验（verify.action）：gone | exists | checked | value | text
 * verify.optional 为 true 时，校验不通过只记警告，不让整次执行失败。
 */

const CONFIG_FILE = 'actions.json';

let CONFIG = null;

async function loadConfig() {
  if (CONFIG) return CONFIG;
  const res = await fetch(chrome.runtime.getURL(CONFIG_FILE));
  CONFIG = await res.json();
  return CONFIG;
}

function interpolate(str, values) {
  return String(str).replace(/\{\{(\w+)\}\}/g, (_, k) =>
    values[k] != null ? values[k] : ''
  );
}

/* ===================== 页面内执行器（注入到 MAIN world） ===================== */

function pageRun(steps, verify) {
  return (async () => {
    const log = [];
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const isVisible = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 1 && r.height > 1 && getComputedStyle(el).visibility !== 'hidden';
    };

    const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, '');

    /* 取列表里的第 N 个：pick:last 取末尾，index 指定，默认第一个 */
    const nth = (list, spec) => {
      if (!list || !list.length) return null;
      const idx = spec.pick === 'last' ? list.length - 1 : (spec.index || 0);
      return list[idx] || list[0] || null;
    };

    /* 全文档按文本兜底：类名未知 / 改版时靠文案定位 */
    const pickByText = (spec) => {
      const want = norm(spec.text);
      if (!want || !document.body) return null;

      /* 先做纯文本过滤（不触发布局），再对少数命中项判可见，避免长页面卡顿 */
      const matched = [...document.querySelectorAll(
        'button,a,span,em,i,label,div,p,li,dt,dd,strong'
      )].filter((e) => norm(e.textContent) === want);

      if (!matched.length) return null;

      const pool = matched.filter(isVisible);
      if (!pool.length) return null;

      /* 只留最内层，避免点到包着一堆内容的容器 */
      const inner = pool.filter(
        (e) => ![...e.children].some((c) => norm(c.textContent) === want)
      );

      return nth(inner.length ? inner : pool, spec);
    };

    const pick = (spec) => {
      const targets = Array.isArray(spec.target) ? spec.target : [spec.target];
      const needVisible = spec.visibleOnly !== false;

      for (const t of targets) {
        if (!t || typeof t !== 'string') continue;

        let pool;
        try {
          pool = [...document.querySelectorAll(t)];
        } catch (e) {
          continue;
        }
        if (!pool.length) continue;
        if (needVisible) pool = pool.filter(isVisible);
        if (!pool.length) continue;
        if (spec.text) pool = pool.filter((e) => norm(e.textContent) === norm(spec.text));
        if (!pool.length) continue;

        return nth(pool, spec);
      }

      /* 选择器全部落空时才走文本兜底（textScan: false 可关闭） */
      if (spec.text && spec.textScan !== false) return pickByText(spec);
      return null;
    };

    /* 点最内层文字元素不一定触发事件，往上找可点击的祖先 */
    const climbClickable = (el) => {
      let node = el;
      for (let i = 0; i < 4 && node; i++) {
        let cursor = '';
        try { cursor = getComputedStyle(node).cursor; } catch (e) {}
        if (cursor === 'pointer') return node;
        node = node.parentElement;
      }
      return el;
    };

    const waitEl = async (spec, timeout) => {
      const end = Date.now() + (timeout || 5000);
      while (Date.now() < end) {
        const el = pick(spec);
        if (el) return el;
        await sleep(120);
      }
      return null;
    };

    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    ).set;

    const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));

    /* 逐字符输入：微信的 js_counter 组件只认这种增长式事件序列 */
    const typeComposed = async (el, text) => {
      el.focus();
      el.click();
      setValue.call(el, '');
      fire(el, 'input');
      await sleep(80);

      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        el.dispatchEvent(new KeyboardEvent('keydown', {
          bubbles: true, cancelable: true, key: ch
        }));
        el.dispatchEvent(new InputEvent('beforeinput', {
          bubbles: true, cancelable: true, data: ch, inputType: 'insertText'
        }));
        setValue.call(el, text.slice(0, i + 1));
        el.dispatchEvent(new InputEvent('input', {
          bubbles: true, data: ch, inputType: 'insertText'
        }));
        el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ch }));
        await sleep(80);
      }

      fire(el, 'change');
      return el.value;
    };

    /* 一次性赋值：普通输入框用它更快 */
    const typeInstant = async (el, text) => {
      el.focus();
      el.click();
      setValue.call(el, text);
      el.dispatchEvent(new InputEvent('input', {
        bubbles: true, data: text, inputType: 'insertText'
      }));
      fire(el, 'change');
      return el.value;
    };

    for (const step of steps) {
      const label = step.desc || step.action;

      try {
        if (step.action === 'sleep') {
          await sleep(step.ms || 500);
          continue;
        }

        if (step.action === 'waitFor') {
          const el = await waitEl(step, step.timeout);
          if (!el) {
            if (step.optional) { log.push('· 跳过（未出现）：' + label); continue; }
            log.push('❌ 等不到元素：' + label);
            return { ok: false, log };
          }
          log.push('· ' + label);
          continue;
        }

        if (step.action === 'waitGone') {
          const end = Date.now() + (step.timeout || 5000);
          while (Date.now() < end && pick(step)) await sleep(120);
          if (pick(step) && !step.optional) {
            log.push('❌ 元素一直没消失：' + label);
            return { ok: false, log };
          }
          log.push('· ' + label);
          continue;
        }

        let el = await waitEl(step, step.timeout || 4000);

        /* 开关类元素常常 display:none，自动退到可见的父级开关上点 */
        if (!el && step.action === 'toggle') {
          el = await waitEl({ target: step.target, visibleOnly: false }, 500);
          if (el) {
            const box = el.closest('.setting-group__switch') || el.parentElement;
            el = box && isVisible(box) ? box : null;
          }
        }

        if (!el) {
          if (step.optional) { log.push('· 跳过（未找到）：' + label); continue; }
          log.push('❌ 找不到元素：' + label + '（' + JSON.stringify(step.target) + '）');

          /* 附带页面实况，便于判断是「已经是目标状态」还是「改版了」 */
          if (step.text) {
            const head = norm(step.text).slice(0, 4);
            const near = [...new Set(
              [...document.querySelectorAll('span,div,button,a,p,label')]
                /* 先文案后可见性：避免对大页面上千个节点做布局计算 */
                .filter((e) => {
                  const t = (e.textContent || '').trim();
                  if (!t || t.length > 24 || !norm(t).includes(head)) return false;
                  return isVisible(e);
                })
                .map((e) => (e.textContent || '').trim())
            )].slice(0, 5);
            log.push('· 页面上相近的文案：' + (near.length ? near.join(' | ') : '无'));
          }

          return { ok: false, log };
        }

        if (step.action === 'click') {
          if (step.climb) el = climbClickable(el);
          try { el.scrollIntoView({ block: 'center', behavior: 'instant' }); } catch (e) {}
          await sleep(80);
          el.click();
          log.push('✔ ' + label);
        } else if (step.action === 'type') {
          const got = step.mode === 'instant'
            ? await typeInstant(el, step.value)
            : await typeComposed(el, step.value);
          log.push('✔ ' + label + '（框内「' + got + '」）');
          if (got !== step.value) {
            log.push('⚠ 输入值与预期不一致，终止');
            return { ok: false, log };
          }
        } else if (step.action === 'toggle') {
          const want = step.checked !== false;
          const now = 'checked' in el ? !!el.checked : null;
          if (now === want) {
            log.push('· 已是目标状态：' + label);
          } else {
            el.click();
            log.push('✔ ' + label);
          }
        } else if (step.action === 'radio') {
          if (el.checked) {
            log.push('· 已选中：' + label);
          } else {
            el.click();
            log.push('✔ ' + label);
          }
        } else {
          log.push('⚠ 未知动作 ' + step.action + '，已跳过：' + label);
        }

        await sleep(step.wait != null ? step.wait : 600);
      } catch (e) {
        log.push('❌ ' + label + ' 异常：' + (e && e.message ? e.message : e));
        return { ok: false, log };
      }
    }

    /* ===== 结果校验 ===== */
    if (verify && verify.action) {
      const end = Date.now() + (verify.timeout || 5000);
      let ok = false;

      while (Date.now() < end) {
        const el = pick(verify);
        if (verify.action === 'gone') ok = !el;
        else if (verify.action === 'exists') ok = !!el;
        else if (verify.action === 'checked') ok = !!el && !!el.checked;
        else if (verify.action === 'value') ok = !!el && el.value === verify.value;
        else if (verify.action === 'text') ok = !!el && (el.textContent || '').includes(verify.value);
        if (ok) break;
        await sleep(150);
      }

      if (!ok) {
        if (verify.optional) {
          log.push('⚠ 校验未通过（' + verify.action + '），已按可忽略处理');
          return { ok: true, log };
        }
        log.push('❌ 校验未通过（' + verify.action + '），操作可能被页面拦下');
        return { ok: false, log };
      }
      log.push('✔ 校验通过');
    }

    return { ok: true, log };
  })();
}

/* ===================== 主流程 ===================== */

async function runAction(tabId, actionId, values) {
  const log = [];

  const [hostRes] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => location.hostname
  });
  const host = hostRes ? hostRes.result : '';

  if (!/(^|\.)mp\.weixin\.qq\.com$/.test(host || '')) {
    return { ok: false, log: ['❌ 当前页面不是公众号后台（' + (host || '未知') + '）'] };
  }

  const cfg = await loadConfig();
  const action = (cfg.actions || []).find((a) => a.id === actionId);
  if (!action) {
    return { ok: false, log: ['❌ actions.json 里没有 id 为 ' + actionId + ' 的设置项'] };
  }

  const steps = JSON.parse(JSON.stringify(action.steps || [])).map((s) => {
    if (typeof s.value === 'string') s.value = interpolate(s.value, values || {});
    return s;
  });

  const [res] = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: pageRun,
    args: [steps, action.verify || null]
  });

  const out = res ? res.result : null;
  if (!out) return { ok: false, log: log.concat(['❌ 执行器没有返回结果，请刷新页面后重试']) };

  return { ok: !!out.ok, log: log.concat(out.log || []) };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'run') return;

  runAction(msg.tabId, msg.actionId, msg.values)
    .then((r) => sendResponse(r))
    .catch((e) =>
      sendResponse({ ok: false, log: ['❌ 异常：' + (e && e.message ? e.message : e)] })
    );

  return true;
});
