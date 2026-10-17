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

## 千万不要用的选择器

| 选择器 | 为什么不行 |
|---|---|
| `document.querySelector('input.js_author')` | 页面有 **3 个** `input.js_author`，命中的是隐藏模板 |
| `input.js_counter` / `input.js_author.js_counter` | 页面顶部的文章作者框 `#author` **也带这两个 class** |
| `#author` | 这是页面顶部的文章作者字段，不是弹框里的原创作者 |

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

- 「赞赏」开关在原创弹框内，class 含 `js_reward_switch`，操作方式应为点击其可见父级（`toggle` 动作会自动退到 `.setting-group__switch`）
- 原创类型是三选一 radio，用 `radio` 动作 + `index` 定位

**这些尚未实测，接入前必须先手工验证一遍选择器。**

---

## 元素定位的通则

1. 先用 DevTools 手动走一遍流程，记录每一步的目标元素
2. 右键 → Copy → Copy selector，拿到精确路径
3. 再用结构（父级 class 链）写一个更稳的备选，两个都填进 `target` 数组
4. 判断"可见"一律用 `getBoundingClientRect()` 的宽高，**不要用 `offsetParent`**（`position:fixed` 容器的后代会被误判为不可见）
5. 页面里有隐藏模板是常态，任何 `querySelector` 都要做可见性过滤
