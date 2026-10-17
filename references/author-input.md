# 原创声明 · 输入作者名的正确写法

**状态：当前版本（v2.0.4 起）已删除这一步**，原创声明只做「点未声明 → 点确定」。
本文件是**备用档案**：以后要恢复"自动填作者"，照这里抄，不要再从零试错。

> 2026-10-18 因用户要求移除填作者步骤。此前该写法已实测通过（2026-10-17，v2.0.0~2.0.3 在用）。

## ⚠️ 先看这条：多数账号现在没有作者输入框

2026-10-18 实测截图：原创弹框里「作者」一栏是**预填的只读文本**（如「牙叔教程」，直接显示账号作者名，不是 input），
整个弹框里**不存在** `input.js_author` / `span.js_customerauthor_container`。

所以：

- **不能把作者框当弹框就绪信号**。等 `input.js_author` 会一直等不到 → 报 `❌ 等不到元素：等待原创弹框就绪`（v2.0.4 的故障就是这个）。
- 弹框就绪要等**底部「确定」按钮**（见本文最后一节）。
- 只有作者栏是**可编辑 input**（新号未设作者名、或页面改版）时，才需要下面这套输入写法。

---

## 一句话结论

必须同时满足三条，缺一条就会被页面判"作者不能为空"：

1. 选择器用 `span.js_customerauthor_container > input.js_author`（**不能**裸写 `input.js_author`）
2. 输入用逐字符 `mode: "composed"`（**不能**用 `instant`、不能一次性赋值）
3. 填完读回值比对，再点「确定」

---

## 方案 A：插件内恢复（首选）

`assets/plugin/actions.json` 里把 `id: "original"` 整块替换成下面这段（就是 v2.0.3 的原文，可直接用）：

```json
{
  "id": "original",
  "name": "原创声明",
  "desc": "点击未声明 → 填作者 → 确定",
  "inputs": [
    {
      "key": "author",
      "label": "作者名",
      "placeholder": "请输入作者（≤8字）",
      "maxLength": 8,
      "default": ""
    }
  ],
  "steps": [
    {
      "action": "click",
      "desc": "点击「未声明」",
      "target": "#js_original > div:nth-child(1) > div.setting-group__switch.js_original_apply.js_edit_ori > div"
    },
    {
      "action": "waitFor",
      "desc": "等待原创弹框里的输入框",
      "target": [
        "span.js_customerauthor_container > input.js_author",
        "#js_original_edit_box input.js_author"
      ],
      "timeout": 8000
    },
    {
      "action": "type",
      "desc": "填写作者名",
      "mode": "composed",
      "target": [
        "span.js_customerauthor_container > input.js_author",
        "#js_original_edit_box input.js_author"
      ],
      "value": "{{author}}"
    },
    {
      "action": "click",
      "desc": "点击「确定」",
      "pick": "last",
      "target": [
        "#vue_app > mp-image-product-dialog > div > div.weui-desktop-dialog__wrp > div > div.weui-desktop-dialog__ft > div > div:nth-child(2) > button",
        "button.weui-desktop-btn.weui-desktop-btn_primary"
      ],
      "text": "确定"
    }
  ],
  "verify": {
    "action": "gone",
    "target": [
      "span.js_customerauthor_container > input.js_author",
      "#js_original_edit_box input.js_author"
    ],
    "timeout": 6000
  }
}
```

要点说明：

- `inputs` 和 `{{author}}` **必须成对**：删了 `inputs` 却留 `{{author}}`，值会被替换成空串，等于没填；留了 `inputs` 却没有 `type` 步骤，弹窗会白让用户填一个用不上的框。
- `type` 步骤执行完，执行器会读回 `el.value` 与 `step.value` 比对，不一致直接报"输入值与预期不一致，终止"。所以日志里 `✔ 填写作者名（框内「xxx」）` 才是真的成功。
- `verify` 用 `gone`（输入框消失）而不是查文字：弹框关闭即输入框消失，是最可靠的提交成功信号。作者为空被拦时弹框不关，这里就会失败。
- 作者名 8 字上限，`maxLength` 同时限制弹窗输入与提交校验，两处别只改一处。

改完必须重新打包（版本号会 +1）：

```bash
python scripts/build.py --bump --out <目标目录>
```

然后在 `edge://extensions/` 点「重新加载」，刷新编辑页。

---

## 方案 B：不装插件，直接在控制台注入

调试或临时救急时用。**F12 → Console 粘贴**（页面必须是公众号图文编辑页）：

```js
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const AUTHOR = '张三';                        // ← 改成作者名，≤8 字

  // 1. 点「未声明」打开弹框
  document.querySelector('#js_original > div:nth-child(1) > div.setting-group__switch.js_original_apply.js_edit_ori > div')?.click();
  await sleep(800);

  // 2. 定位真正的作者框：必须限定在 js_customerauthor_container 内
  const el = document.querySelector('span.js_customerauthor_container > input.js_author');
  if (!el) return console.warn('没找到作者输入框，弹框可能没打开');

  // 3. 逐字符写入（js_counter 组件只认这种增长序列）
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  el.focus(); el.click();
  setValue.call(el, '');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(80);

  for (let i = 0; i < AUTHOR.length; i++) {
    const ch = AUTHOR[i];
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ch }));
    el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, data: ch, inputType: 'insertText' }));
    setValue.call(el, AUTHOR.slice(0, i + 1));
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: ch, inputType: 'insertText' }));
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ch }));
    await sleep(80);
  }
  el.dispatchEvent(new Event('change', { bubbles: true }));

  // 4. 读回校验：不一致就别点确定
  if (el.value !== AUTHOR) return console.warn('写入被拦，框内是：', JSON.stringify(el.value));
  console.log('写入成功，框内：', el.value, '｜计数器：', el.parentElement.querySelector('.frm_counter')?.textContent);

  // 5. 点「确定」
  const btns = [...document.querySelectorAll('button.weui-desktop-btn.weui-desktop-btn_primary')]
    .filter((b) => b.textContent.trim() === '确定');
  (btns[btns.length - 1] || null)?.click();

  await sleep(1200);
  console.log('弹框是否已关闭：', !document.querySelector('span.js_customerauthor_container > input.js_author'));
})();
```

---

## 为什么不能用"看起来更简单"的写法

| 写法 | 结果 |
|---|---|
| `document.querySelector('input.js_author')` | 命中隐藏模板（页面上有 3 个同名 input），值写进了看不见的框，提交报"作者不能为空" |
| 按 class 找 `js_author js_counter` | 误伤页面顶部文章作者框 `#author`（class 几乎一样，且在 DOM 里更靠前） |
| `input.value = 'x'` | DOM 有值，组件状态为空，提交失败 |
| 原生 setter + `input`/`change` 一次性派发 | 同上，`0/8` 计数器不变 |
| `document.execCommand('insertText')` | 同上，实测不通过 |
| 逐字符 setter + keydown/beforeinput/input/keyup，间隔 80ms | **唯一通过** |

根因：作者框是微信 `js_counter` 组件，它只认逐字符增长的事件序列；批量赋值时它自己的状态没更新，提交时按内部状态判空。

---

## 失败现象排查

| 插件日志 | 原因 |
|---|---|
| `❌ 找不到元素：等待原创弹框里的输入框` | 弹框没打开（「未声明」点歪了），或页面已改版、选择器失效 |
| `✔ 填写作者名（框内「」）` | 值为空：`inputs` 缺了、或弹窗输入框没填就点了执行 |
| `⚠ 输入值与预期不一致，终止` | 框被 `maxlength` 截断（超过 8 字），或写到了错误的框 |
| `✔` 全绿但页面提示"作者不能为空" | 写到了隐藏模板，检查选择器是否退化成裸 `input.js_author` |
| `❌ 校验未通过（gone）` | 「确定」没点上或提交被前端拦下，先看框内值是否为空 |

---

## 当前（无作者输入）版本的对应写法

现在 `actions.json` 里的 `original` 是（v2.0.5 起）：

```json
{
  "id": "original",
  "name": "原创声明",
  "desc": "点击未声明 → 确定",
  "steps": [
    { "action": "click", "desc": "点击「未声明」", "target": "#js_original > div:nth-child(1) > div.setting-group__switch.js_original_apply.js_edit_ori > div" },
    { "action": "waitFor", "desc": "等待原创弹框的「确定」按钮", "timeout": 8000,
      "pick": "last", "text": "确定",
      "target": ["mp-image-product-dialog .weui-desktop-dialog__ft button.weui-desktop-btn_primary",
                 "button.weui-desktop-btn.weui-desktop-btn_primary"] },
    { "action": "click", "desc": "点击「确定」", "pick": "last", "text": "确定",
      "target": ["#vue_app > mp-image-product-dialog > div > div.weui-desktop-dialog__wrp > div > div.weui-desktop-dialog__ft > div > div:nth-child(2) > button",
                 "mp-image-product-dialog .weui-desktop-dialog__ft button.weui-desktop-btn_primary",
                 "button.weui-desktop-btn.weui-desktop-btn_primary"] }
  ],
  "verify": { "action": "gone", "timeout": 6000, "pick": "last", "text": "确定",
    "target": ["mp-image-product-dialog .weui-desktop-dialog__ft button.weui-desktop-btn_primary",
               "button.weui-desktop-btn.weui-desktop-btn_primary"] }
}
```

两个要点：

- `waitFor` 不是填作者，是等弹框渲染完（否则「确定」按钮还没出来就点空）。**等待目标必须选弹框内一定会出现的元素**——底部「确定」按钮是唯一在"作者只读"和"作者可编辑"两种弹框里都存在的锚点。
- `verify` 不能再用"作者输入框消失"判断：无输入框时它一开始就是 `null`，`gone` 会立即通过，形成**假绿**。统一改成「确定」按钮消失。

