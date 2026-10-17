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

## 14. 选择器未知时用文本兜底，实测可行（但兜底不解决幂等）

留言这一项开发时没有真实 DOM，采用「候选选择器 → 全文档按文本」两级定位（`pickByText`），**2026-10-17 一次实测通过**。要点：

- 文本比较要**归一化空白**（`replace(/\s+/g, '')`），微信文案里常有 `确 定` 这种插空格
- 全文档扫描必须**先文本过滤、再判可见**。顺序反了会对上千个元素调 `getComputedStyle`，长页面直接卡死
- 命中的元素可能有多个祖先包着同样的文本，要取**最内层**（没有同文本子元素的那个），否则点到整个设置区容器
- 文本匹配无法区分上下文：`已开启` 这种短文案在「平台推荐」等行也会出现，所以**别拿它当幂等判据**
- 兜底方案的失败是"找不到"，不会静默成功；失败日志必须附带页面相近文案，否则无法定位是改版还是已是目标状态

**由此得出的方法论**：纯点击、文案在页面上唯一的设置项（「不开启留言」这种），可以直接靠 `text` 兜底上线，不必先让用户抓 DOM 和父级结构。**但只要涉及输入框、同 class 多份、或需要判断并切换状态，必须老老实实拿真实 DOM**——原创声明因为输入框定位错了返工 4 轮就是反例。

## 15. `verify` 的 `gone` 在"选择器不命中"时是假阳性

`gone` 的判定是 `pick()` 返回 null。选择器本身过期时也是 null，于是校验直接通过。

所以 `gone` 只能用**弹框专属容器**（`mp-image-product-dialog`、`.weui-desktop-dialog__ft`）内的元素，保证"不命中"只可能意味着弹框已关；不要拿泛化选择器做 `gone`。

## 16. 短文案兜底会点错行：三处「未添加」

「集合 / 原文链接 / 创作来源」三行右侧文案都是 `未添加`，`pickByText` 默认取第一个命中项 = **集合**行。创作来源这一项显式写了 `"textScan": false`，只用 `#js_claim_source_area` 限定的选择器定位；宁可直接报错，也不能点错行把状态设到别的设置项上。

同类风险：`已开启`、`不开启` 这类短文案在多行重复出现。凡是有兄弟行、结构相同的功能，都要用行 id 限定 + 关掉文本兜底。

## 17. 「确认」和「确定」是两个词

创作来源弹框的按钮是 **确认**，原创/赞赏/留言弹框是 **确定**。`text` 过滤是精确相等，写错一个字就报"找不到元素"，日志看起来却像页面改版。

判断依据：看实际截图里按钮上的字，别照抄上一个功能的配置。

另外创作来源的「确认」在未选类型时是**禁用态**（浅绿），点不动，所以选完选项要 `wait` 一下再点。

## 18. 需求笔记里的「成功标志」可能抄自上一条功能

用户给的创作来源笔记，第四步写的验证节点是「留言自动精选公开」（`#js_comment_and_fansmsg_area`）——那是上一条留言功能的记录，跟创作来源毫无关系。照抄会得到一个**永远校验不过**的配置，而页面其实早就设置成功了。

**做法**：
- 拿到「成功标志」先问一句：这个元素属于我要操作的那一行吗？（看 id / class 前缀是否对得上，`js_claim_source_*` vs `js_comment_*`）
- 对不上就自己从 DOM 推导：被操作的那一行（例：`#js_claim_source_area .js_claim_source_desc`）在成功前后的文本一定不同，用它当判据
- 推不出来就问用户「设置成功后那一行显示什么字」

## 19. `verify` 的文案判据取「关键子串」，不要取整句

创作来源成功后那行显示「内容由AI生成」，但微信改文案是常事（写成「AI生成」也不奇怪）。写 `value: "内容由AI生成"` 一旦改字就假失败；写 `value: "AI"` 则两种写法都过。

**选判据的规则**：
- 目标容器里**除了状态文案没有别的字**时，取最短的特征子串（`AI`、`账户`）
- 容器里混着别的文字时不能这么干，要收紧到具体那一个 span
- 判据要「成功前后必然不同」：`未添加` → `内容由AI生成` 的差异在 `AI` 上，成立；如果取 `内容`，也成立但更容易被其它文案污染

反面教材：留言的成功判据最后用了 `gone`（弹框关闭）而不是文案，因为灰度账号的文案不一致——同一件事，判据要按稳定性挑，不是按"看起来最严谨"挑。

## 20. 一键串联：单项失败不能中断后续

2.1.0 起弹窗只留一个「一键完成全部设置」按钮（`actions.json` 的 `runAll`），由 `background.js` 的 `runAll()` 按 `actions` 数组顺序串行执行，项与项之间 `runAll.gap`（默认 1000ms）。

关键取舍：

- **串行不是并行**：四项都操作同一片设置区、且共用 `mp-image-product-dialog` 容器，并行会互相点错弹框
- **失败继续跑**：已声明过原创、留言本来已开启都会让某一项"找不到元素"，这属于正常状态。若中断，后面三项永远执行不到，用户看到的就是"点一下只做完一半"
- **每项仍走自己的 `verify`**：合并成一个大 steps 数组会丢失分项校验，日志也分不清哪项挂了
- **最后给汇总**：`⚠ 完成 3/4，失败：赞赏` 这种一行结论，比翻日志快
- **间隔是必要的**：微信关弹框有动画，紧接着找下一个元素容易命中旧弹框节点（可见性过滤能挡大部分，但 1 秒最省心）；间隔别调到 0
- 新增设置项时默认会被自动纳入一键流程；不想让它参与就写 `"enabled": false`


