# 新增设置项 · 信息采集清单

**用途**：用户提出"加一个 XX 设置"时，把本文件从「一」到「四」原样发给用户，等用户填完再动手。不要跳过，不要猜。

**给用户的一句话**：照着填空就行，抓不到的东西留空，我按缺的再追问。

---

## 一、功能基本信息（必填）

```
1. 功能名称（显示在插件弹窗卡片上）：
2. 在公众号后台的哪个页面操作（图文编辑页 / 设置页 / 其他）：
3. 操作前需要先处于什么状态（比如"先打开原创弹框"）：
4. 需要我填写的参数：
   - 参数名：
   - 字数/数值限制：
   - 默认值：
   - （没有参数就写"无"）
5. 怎么算成功（页面上哪里变了：弹框关了 / 开关变绿 / 出现提示"已保存"；**并且贴一下变化后那一行的 HTML 或文字**）：
6. 失败时页面上的提示原文（试过的话贴一下）：
7. 这个设置行上/下有没有和它长得一样、文案也一样的兄弟行（比如「集合」「原文链接」「创作来源」三行都写「未添加」）：
```

---

## 二、每一步的元素信息（几个元素就复制几段）

```
### 步骤 1
- 动作（点击 / 输入 / 开关 / 单选，选一个）：
- 元素 HTML：
  （DevTools 里右键元素 → Copy → Copy element，粘贴到下面代码块）
  ```html

  ```
- selector：
  ```css

  ```
- 父级元素 HTML（往上 1~2 层）：
  ```html

  ```
- 这个元素在页面上看得见吗（看得见 / 看不见）：
- 动作完成后页面有什么变化（弹框出现 / 字段变多 / 无变化）：
- 需要等多久（大概毫秒，不确定写"不知道"）：

### 步骤 2
（同上，依此类推）
```

**输入类元素额外补一行**：

```
- 输入框旁边有没有字数计数（比如 0/8、3/64）：
```

有计数器的话，输入必须走逐字符模式（`type` 的默认 `mode: composed`），这个信息不能漏。

**弹窗内要选选项时额外补**（radio / 多选 / 下拉）：

```
- 弹窗容器的 class（比如 div.claim-source-dialog）：
- 要选的那一项的 HTML + selector：
- 底部按钮上的字（确定 / 确认 / 保存，照抄实际文字）：
- 按钮在没选选项时是灰的（禁用）吗：
```

按钮文案必须照抄。原创/赞赏/留言是「确定」，创作来源是「确认」，`text` 过滤是精确相等，差一个字就是"找不到元素"。

---

## 三、怎么抓这些信息（给用户的 30 秒教程）

1. 按 `F12` 打开开发者工具，切到 **Elements** 面板
2. 在页面上右键点住目标元素 → **检查**
3. Elements 里高亮的那一行就是它 → 右键 → **Copy → Copy element**
4. 再右键 → **Copy → Copy selector**
5. 在 Elements 里点它**上面那一行**（父级）→ 同样 Copy element
6. 每个要操作的步骤重复一遍

**能省一轮返工的三个提示**：

- 父级信息别省。同一个 class 在页面里出现多次是常态，只有父级结构才能区分"真正要点的那个"
- 页面上看得见 / 看不见一定要写。隐藏的同名模板是这类页面最常见的坑
- 动作后页面怎么变要写。不然等待时间只能靠猜

---

## 四、填好的示例（原创声明，照这个格式写）

### 基本信息

```
1. 功能名称：原创声明
2. 页面：图文编辑页（草稿状态）
3. 前置状态：无，直接点「未声明」按钮
4. 参数：作者名，最多 8 个字，默认空
5. 成功标志：原创弹框关闭，「未声明」变成「原创」
6. 失败提示：作者不能为空且不超过8个字
```

### 步骤 1 · 点击「未声明」

```html
<div class="setting-group__switch js_original_apply js_edit_ori">
  <input class="weui-desktop-switch__input js_original_apply js_ori_setting_checkbox" type="checkbox" style="display: none">
  <div class="js_unset_original_title">未声明</div>
  <i class="read-more__icon__more-inactive"></i>
</div>
```

```css
#js_original > div:nth-child(1) > div.setting-group__switch.js_original_apply.js_edit_ori > div
```

父级：`#js_original`，可见，点击后弹出原创设置弹框，约 500ms 出现。

### 步骤 2 · 输入作者名

```html
<input type="text" placeholder="请输入作者" max-length="8" class="frm_input js_counter js_author">
```

```css
#js_original_edit_box > div > div:nth-child(3) > div.original_edit_inner_box > div > div > span.js_customerauthor_container.frm_input_box.with_counter.counter_in.append.count > input
```

父级：

```html
<span class="js_customerauthor_container frm_input_box with_counter counter_in append count">
  <input type="text" placeholder="请输入作者" max-length="8" class="frm_input js_counter js_author">
  <em class="frm_input_append frm_counter">0/8</em>
</span>
```

可见。**旁边有 0/8 计数器**——这就是为什么必须逐字符输入。

### 步骤 3 · 点击「确定」

```html
<button type="button" class="weui-desktop-btn weui-desktop-btn_primary">确定</button>
```

```css
#vue_app > mp-image-product-dialog > div > div.weui-desktop-dialog__wrp > div > div.weui-desktop-dialog__ft > div > div:nth-child(2) > button
```

可见，点击后弹框关闭。

---

## 五、用户抓不到 selector 怎么办

只给元素 HTML 和一张页面截图也能开工，但首次成功率会下降。这种情况下：

1. 先按 HTML 里的 class 链条推导一个结构选择器
2. 明确告诉用户"这是推导的，需要实测一次"
3. 实测失败就让用户补 selector

---

## 六、拿到清单后的自查（必做）

| 检查项 | 缺失的后果 |
|---|---|
| 有父级元素信息吗？ | 没有 → 同 class 重复元素必踩坑，会写错输入框 |
| 有说明可见性吗？ | 没有 → 无法确认目标是唯一的可见元素 |
| 有成功判定标准吗？ | 没有 → `verify` 写不出来，失败会被当成功 |
| 成功标志的元素确实属于这一行吗？ | 属于别的功能 → 校验永远不过（创作来源笔记里抄了留言的节点） |
| 输入框有计数器说明吗？ | 没有 → 可能用错输入模式，页面提示"不能为空" |
| 动作后的页面变化写了吗？ | 没有 → 等待时间靠猜，容易找不到下一步的元素 |
| 有没有同文案的兄弟行？ | 有 → 文案兜底会点错行，必须行 id 限定 + `textScan: false` |
| 弹窗按钮文字抄准了吗？ | 抄错 → 「确认」写成「确定」就是找不到元素 |

缺任何一项都要向用户追问，**不要用默认值糊过去**。
