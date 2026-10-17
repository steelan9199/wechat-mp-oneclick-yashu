# 踩坑记录

按踩坑顺序整理。做新选项前先读一遍，能省掉大量试错。

---

## 1. 同一个 class 在页面上有多份，必须靠结构定位

页面有 3 个 `input.js_author`：2 个隐藏模板 + 1 个真正可见的。`querySelector('input.js_author')` 命中的是第一个隐藏模板。

**症状**：脚本日志显示值写进去了（读回也对），但提交时页面提示"作者不能为空"。因为读回读的也是那个隐藏框。

**解法**：`span.js_customerauthor_container > input.js_author`，或限定在弹框容器内 + 可见性过滤。

## 2. 页面顶部的文章作者框也带 `js_author js_counter`

```html
<input id="author" class="frm_input js_author js_counter js_field edui-default">
```

它和弹框里的原创作者框 class 几乎一样。**任何"按 class 找 author"的思路都会误伤它**，包括"优先取带 js_counter 的"这种看似聪明的写法——反而更容易选中它，因为它在 DOM 里靠前。

## 3. 一次性赋值无效，必须逐字符

微信的 `js_counter` 组件（那个 `0/8` 计数器）只认逐字符增长的事件序列。

实测结果：

| 输入方式 | 值是否写进 DOM | 能否通过校验 |
|---|---|---|
| `input.value = x` | 是 | 否 |
| 原生 setter + 派发 `input` / `change` | 是 | 否 |
| `document.execCommand('insertText')` | 是 | 否 |
| **逐字符 setter + keydown/beforeinput/input/keyup** | 是 | **是** |

**结论**：`type` 动作默认 `"mode": "composed"`，不要为了快改成 `instant`。

逐字符实现要点：

```js
for (let i = 0; i < text.length; i++) {
  const ch = text[i];
  el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ch }));
  el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, data: ch, inputType: 'insertText' }));
  setValue.call(el, text.slice(0, i + 1));          // 值必须逐字增长
  el.dispatchEvent(new InputEvent('input', { bubbles: true, data: ch, inputType: 'insertText' }));
  el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ch }));
  await sleep(80);                                   // 太快会漏事件
}
```

## 4. 不能用 `offsetParent` 判断可见

`position: fixed` 元素的 `offsetParent` 返回 `null`，弹框大量使用 fixed 定位。误判会导致"弹框明明关着却算没关"或反过来。

**一律用**：

```js
const r = el.getBoundingClientRect();
const visible = r.width > 1 && r.height > 1 && getComputedStyle(el).visibility !== 'hidden';
```

## 5. 关掉 F12 才能用 debugger 通道（本项目已弃用该方案）

1.1.0 曾用 CDP 派发真实输入，能过校验但会弹"正在调试此浏览器"横幅，且必须关闭开发者工具。1.3.0 起已移除，纯脚本足够。

## 6. 合成 click 是有效的

点「未声明」、点「确定」用 `el.click()` 都能生效，不需要真实鼠标事件。真正挑剔的是**带计数器/受控组件的输入框**，只有输入需要特殊处理。

## 7. 更新扩展的正确姿势

- 改文件 → `edge://extensions/` 点**重新加载** → 再**刷新公众号页面**
- 只刷新网页不生效，扩展的旧代码还在内存里
- `manifest.json` 的 `version` 不触发任何自动更新，只是标识；但改 `permissions` 后必须重新加载
- 扩展 ID 与文件夹路径绑定，换路径等于换了个新扩展，`storage` 里的值会丢

## 8. 作者名有 8 字上限

`max-length="8"`，超过 8 个字符会被拦。测试时别用 `aaa啊啊啊aaa`（9 字符）这种数据，会误判成程序有问题。

## 9. 点击确定后要判定，别只看日志

只打印"已点击确定"没有意义。必须检查目标元素是否消失/弹框是否关闭，否则会把失败当成功。`verify` 字段就是干这个的。

## 10. 弹框里的可见性会随选项变化

原创类型 radio 切换后，弹框里的字段会增减（比如选"转载"会多出白名单输入框）。写步骤时先在目标状态下取选择器，别在默认状态下取。

## 11. 原创弹框和赞赏弹框共用 `mp-image-product-dialog` 容器

两个弹框的「确定」按钮**路径不同**：

| 弹框 | 确定按钮路径片段 |
|---|---|
| 原创 | `... __ft > div > div:nth-child(2) > button` |
| 赞赏 | `... __ft > div > div.operate-btn__group > div:nth-child(1) > button` |

DOM 里两个弹框同时存在（一个关着但节点还在），靠 `pick` 的可见性过滤才能选中真正要点的那个。所以赞赏的确定按钮必须先用带 `operate-btn__group` 的精确路径，泛化选择器 `button.weui-desktop-btn_primary` 只作最后兜底，并配 `"text": "确定"` + `"pick": "last"`。

## 12. 协议勾选框是"隐藏 input + 视觉图标"，要点 input 本身

```html
<label class="weui-desktop-form__check-label">
  <input type="checkbox" class="weui-desktop-form__checkbox">  <!-- 被 CSS 隐藏 -->
  <i class="weui-desktop-icon-checkbox"></i>                    <!-- 用户看到的勾 -->
</label>
```

- 直接点 `<label>` 或 `<i>`：**不幂等**——已勾选时再点会取消勾选，然后确定按钮变灰，表现为"点了确定没反应"
- 正确写法：`toggle` + `visibleOnly: false` 作用在 `input` 上。`toggle` 读 `input.checked` 判断当前真实状态，已是目标状态就跳过
- 同类陷阱：任何 `.weui-desktop-switch__input` / `.weui-desktop-form__checkbox` 都适用此规则

## 13. 赞赏成功判定看文案，不看开关

赞赏开关成功后的表现不是"变绿"，而是右侧文案从「不开启」变成「账户: 公众号名」。`verify` 用 `action: "text"` + `value: "账户"` 才可靠。

