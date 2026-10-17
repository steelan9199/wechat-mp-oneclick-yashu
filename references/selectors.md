# 公众号后台已确认的选择器清单

平台：微信公众平台图文编辑页 `https://mp.weixin.qq.com/cgi-bin/appmsg?...`（草稿/编辑状态）。
所有选择器均在 2026-10 实测有效。页面改版后需重新核对。

---

## 原创声明

### 1. 「未声明」按钮（点击后弹出原创设置弹框）

```css
#js_original > div:nth-child(1) > div.setting-group__switch.js_original_apply.js_edit_ori > div
```

元素结构：

```html
<div class="setting-group__switch js_original_apply js_edit_ori">
  <input class="weui-desktop-switch__input js_original_apply js_ori_setting_checkbox"
         type="checkbox" style="display:none">
  <div class="js_unset_original_title">未声明</div>
  <i class="read-more__icon__more-inactive"></i>
</div>
```

备用：`.js_edit_ori .js_unset_original_title`

### 2. 弹框中的作者输入框（**唯一正确的那个**）

> **2026-10-18 起多数账号没有这个框了**：原创弹框的「作者」一栏改成预填的**只读文本**（显示账号作者名，如「牙叔教程」），
> DOM 里不存在 `input.js_author` / `span.js_customerauthor_container`。此时不要拿它当"弹框就绪"信号，
> 要等底部「确定」按钮（见第 3 节）。仅当作者栏是可编辑 input 时，下面的选择器才适用。

```css
span.js_customerauthor_container > input.js_author
```

完整路径：

```css
#js_original_edit_box > div > div:nth-child(3) > div.original_edit_inner_box > div > div > span.js_customerauthor_container.frm_input_box.with_counter.counter_in.append.count > input
```

父级结构：

```html
<span class="js_customerauthor_container frm_input_box with_counter counter_in append count">
  <input type="text" placeholder="请输入作者" max-length="8" class="frm_input js_counter js_author">
  <em class="frm_input_append frm_counter">0/8</em>
</span>
```

### 3. 「确定」按钮

```css
#vue_app > mp-image-product-dialog > div > div.weui-desktop-dialog__wrp > div > div.weui-desktop-dialog__ft > div > div:nth-child(2) > button
```

通用兜底（实测页面上只有一个「确定」按钮）：

```css
button.weui-desktop-btn.weui-desktop-btn_primary
```

配合 `"text": "确定"` + `"pick": "last"` 使用。

---

## 赞赏（`#js_reward_setting_area`）

### 1. 赞赏开关文案（点击后弹出赞赏设置弹框）

```css
#js_reward_setting_area > div > div.setting-group__switch.js_reward_open > span
```

备用：`#js_reward_setting_area .js_reward_open span.js_reward_setting_tips`

元素结构：

```html
<div class="setting-group__switch js_reward_open">
  <input class="weui-desktop-switch__input js_reward_setting_checkbox" type="checkbox" style="display:none">
  <span class="setting-group__switch-tips js_reward_setting_tips">不开启</span>
  <i class="read-more__icon__more"></i>
</div>
```

可见。点击后约 1s 弹出赞赏设置弹框。**注意**：这里的 `js_reward_open` 是独立区域内的大开关，与原创弹框里那个 `js_reward_switch`（另一个开关）不是同一个元素，别混用。

### 2. 弹框底部（判断弹框出现 / 定位确定按钮）

```css
.reward-setting-dialog__footer
```

### 3. 合作协议勾选框

```css
.agreement-check-btn__wrp input.weui-desktop-form__checkbox
```

父级：

```html
<div class="agreement-check-btn__wrp">
  <label class="weui-desktop-form__check-label">
    <input type="checkbox" checking="" class="weui-desktop-form__checkbox">
    <i class="weui-desktop-icon-checkbox"></i>
    <span class="weui-desktop-form__check-content">我已阅读并同意《微信公众平台赞赏功能使用协议》</span>
  </label>
</div>
```

真实 checkbox 被 CSS 隐藏，视觉是旁边的 `<i>`。配置里用 `toggle` + `visibleOnly: false` 直接点 input 本身（幂等：已勾选就跳过），比点 `<label>` 安全。

### 4. 「确定」按钮

```css
#vue_app > mp-image-product-dialog > div > div.weui-desktop-dialog__wrp > div > div.weui-desktop-dialog__ft > div > div.operate-btn__group > div:nth-child(1) > button
```

兜底：`.reward-setting-dialog__footer .operate-btn__group button.weui-desktop-btn_primary`，配合 `"text": "确定"` + `"pick": "last"`。

注意与原创弹框的确定按钮路径**不一样**（原创是 `div:nth-child(2) > button`，赞赏多了 `div.operate-btn__group`），两者共用同一个 `mp-image-product-dialog` 容器，所以必须靠可见性过滤区分。

### 5. 成功标志

```css
#js_reward_setting_area span.js_reward_setting_tips
```

成功后文本从「不开启」变成「账户: 公众号名」，用 `verify.action: "text"` + `value: "账户"` 判定。

---

## 留言（`#js_comment_setting_area`，2026-10-17 实测通过）

留言区和赞赏区结构同源：右侧一行文案 + `>` 图标，点文案弹设置弹框。开发时**没有拿到真实 DOM**，所以这一项用「选择器候选 + 文案兜底」双重定位，2026-10-17 实测跑通：

1. 先试 `target` 里的候选选择器（按赞赏区结构类推，未逐一验证哪一条命中）
2. 全部落空时，自动全文档按文本 `不开启留言` 找最内层可见元素（`pickByText`）
3. 点击时 `climb: true`，点本身或最近的 `cursor:pointer` 祖先

```json
{ "action": "click", "desc": "点击「不开启留言」", "text": "不开启留言", "climb": true, "wait": 1000,
  "target": [
    "#js_comment_setting_area > div > div.setting-group__switch > span",
    "#js_comment_setting_area .js_comment_setting_tips",
    "#js_comment_setting_area span.setting-group__switch-tips",
    ".js_comment_open span",
    ".js_comment_setting span.setting-group__switch-tips"
  ] }
```

### 弹框「确定」

留言弹框与原创/赞赏共用 `mp-image-product-dialog`，按钮是绿色 `weui-desktop-btn_primary`：

```css
mp-image-product-dialog .weui-desktop-dialog__ft button.weui-desktop-btn_primary
.weui-desktop-dialog__ft button.weui-desktop-btn_primary
```

配 `"text": "确定"` + `"pick": "last"`。校验用 `gone`：弹框关了 → 可见的「确定」消失。

### 已知限制

- **不幂等**：页面上没有「不开启留言」这行字（即留言已开启）时会报「找不到元素」，日志会附带页面上相近的文案，正常应显示 `已开启`。这是**预期行为**，不是故障。
- 成功判定用 `gone`，没用文案校验：点确定后留言行文案变「已开启」，但不同账号/灰度下文案可能不同，写死容易误报。

### 想收紧定位时可以做的

当前靠文案兜底虽然稳定，但每次都要扫全文档。若要把性能/精度做到最好，在页面控制台 dump 留言区，把真实选择器补到 `target` 第一位：

```js
const area = [...document.querySelectorAll('[id*="comment"],[class*="comment"]')]
  .filter(e => /留言/.test(e.textContent || ''));
area.slice(0, 3).map(e => e.outerHTML.slice(0, 1200));
```

---

## 创作来源（`#js_claim_source_area`，2026-10-17 实测通过）

「集合 / 原文链接 / 创作来源」三行结构相同，右侧都是「未添加」，**必须用行 id 限定**，不能靠文案兜底（页面上共 3 处「未添加」）。

### 1. 「未添加」按钮

```css
#js_claim_source_area > label > div.allow_click_opr.js_claim_source_desc > span.lbl_content_desc_default
```

备用：`#js_claim_source_area .js_claim_source_desc span.lbl_content_desc_default`

父级结构：

```html
<div class="allow_click_opr js_claim_source_desc">
  <span class="lbl_content_after lbl_content_desc js_claim_source_selected" style="display: none;"></span>
  <span class="lbl_content_after lbl_content_desc lbl_content_desc_default">未添加</span>
  <i class="lbl_content_after read-more__icon__more">icon</i>
</div>
```

注意父 div 的 `textContent` 是 `未添加icon`（`<i>` 里有字面量 `icon`），所以 `target` 里的 `text` 过滤只能落在 span 上，指向 div 的候选一定过不了文本过滤。配置里已加 `"textScan": false` 防止兜底误点「集合」行的「未添加」。

### 2. 弹框

```css
div.claim-source-dialog
```

在 `#vue_app > mp-image-product-dialog > div.claim-source-dialog`，与其他弹框共用 `mp-image-product-dialog`，靠 `div.claim-source-dialog` 这个专属 class 区隔。

### 3. 「内容由AI生成」选项

```css
div.claim-source-dialog .weui-desktop-form__check-content
```

配合 `"text": "内容由AI生成"`。父级：

```html
<div><label class="weui-desktop-form__check-label">
  <input type="radio" class="weui-desktop-form__radio" value="1">
  <i class="weui-desktop-icon-radio"></i>
  <span class="weui-desktop-form__check-content">内容由AI生成</span>
</label></div>
```

点 span 即可（事件冒泡到 label 切换 radio）。该弹框共 7 个声明类型：内容由AI生成（value=1）、素材来源官方媒体/网络新闻、内容剧情演绎仅供娱乐、个人观点仅供参考、健康医疗分享仅供参考、投资观点仅供参考、无需声明。

### 4. 「确认」按钮

```css
div.claim-source-dialog .weui-desktop-dialog__ft div.weui-desktop-btn_wrp button.weui-desktop-btn_primary
```

完整路径：`#vue_app > mp-image-product-dialog > div.claim-source-dialog > div.weui-desktop-dialog__wrp > div > div.weui-desktop-dialog__ft > div:nth-child(1) > button`

**这一项文案是「确认」，不是「确定」**。未选类型时按钮是禁用态（浅绿），点不动，所以选完选项要等 600ms 再点。

### 5. 成功标志

`#js_claim_source_area .js_claim_source_desc` 的文本从「未添加icon」变成「内容由AI生成…」。

`verify` 用 `action: "text"` + `value: "AI"`：只取「AI」两个字，兼容页面以后写成「内容由AI生成」/「AI生成」等不同文案；该容器里除状态文案外没有别的字，不会误命中。

**注意（需求笔记里的坑）**：用户笔记的「第四步 检查这个节点是否出现」贴的是 `留言自动精选公开`（`#js_comment_and_fansmsg_area`），那是上一条「留言」功能的记录，与本项无关。实测采用的是上面这条文案判据，一次通过。**照抄需求笔记的成功标志前，先确认它是不是同一行的元素。**

### 6. 各项候选选择器的实测命中情况

`2026-10-17` 一次通过，但**未逐条验证命中的是 `target` 里第几条**。若日后报「找不到元素」，按顺序排查：先看 `#js_claim_source_area` 是否还在（该行改版/未渲染），再看 `.js_claim_source_desc`、`span.lbl_content_desc_default` 这两个 class 有没有改名。

---

## 千万不要用的选择器

| 选择器 | 为什么不行 |
|---|---|
| `document.querySelector('input.js_author')` | 页面有 **3 个** `input.js_author`，命中的是隐藏模板 |
| `input.js_counter` / `input.js_author.js_counter` | 页面顶部的文章作者框 `#author` **也带这两个 class** |
| `#author` | 这是页面顶部的文章作者字段，不是弹框里的原创作者 |
| 按文本 `未添加` 全文档兜底 | 页面上有 **3 处**（集合 / 原文链接 / 创作来源），默认取第一个 = 点错行 |

页面顶部文章作者框的真实内容：

```html
<input id="author" type="text" placeholder="请输入作者"
       class="frm_input js_author js_counter js_field edui-default"
       name="author" max-length="8" autocomplete="off">
```

---

## 原创弹框内的其他字段（做后续选项时的线索）

从 `#js_original_edit_box` 内 dump 到的全部 input：

| class | value | 可见 | 用途推测 |
|---|---|---|---|
| `weui-desktop-form__radio js_original_type_radio` | 0 | 是 | 原创类型（选项 A） |
| `weui-desktop-form__radio js_original_type_radio` | 1 | 否 | 原创类型（选项 B，切换到才可见） |
| `weui-desktop-form__radio` | -1 | 是 | 原创类型第三项 |
| `js_reward_switch weui-desktop-switch__input` | on | 否 | **赞赏开关**（隐藏 checkbox，点在父级 switch 上） |
| `frm_input js_author` | 空 | 否 | 隐藏的作者模板 |
| `frm_input js_counter js_author` | 用户输入 | 是 | **真正的作者框** |
| `weui-desktop-form__input` | 空 | 是 | 白名单 / 转载来源输入框 |
| `weui-desktop-switch__input` | on | 是 | 另一个开关 |

推论：

- 原创弹框内的「赞赏」开关 class 含 `js_reward_switch`，操作方式应为点击其可见父级（`toggle` 动作会自动退到 `.setting-group__switch`）。**它与独立赞赏区的 `js_reward_open` 不是一个元素**，赞赏功能以第一节「赞赏」的选择器为准
- 原创类型是三选一 radio，用 `radio` 动作 + `index` 定位

**原创弹框内的这些尚未实测，接入前必须先手工验证一遍选择器。**

---

## 元素定位的通则

1. 先用 DevTools 手动走一遍流程，记录每一步的目标元素
2. 右键 → Copy → Copy selector，拿到精确路径
3. 再用结构（父级 class 链）写一个更稳的备选，两个都填进 `target` 数组
4. 判断"可见"一律用 `getBoundingClientRect()` 的宽高，**不要用 `offsetParent`**（`position:fixed` 容器的后代会被误判为不可见）
5. 页面里有隐藏模板是常态，任何 `querySelector` 都要做可见性过滤
