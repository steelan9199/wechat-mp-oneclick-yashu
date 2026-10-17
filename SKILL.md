---
name: wechat-mp-oneclick-yashu
description: 生成与维护「公众号一键设置」Edge 扩展，在公众号图文编辑页自动完成原创声明、赞赏、留言等设置。激活条件：用户消息须包含以下关键词之一:`公众号插件开发`。
---

# 公众号一键设置扩展

产出一个可直接加载到 Edge 的浏览器扩展，用于在微信公众号图文编辑页自动完成各种设置项（目前有「原创声明」「赞赏」「留言」，可按同一套方式继续扩展）。

核心设计：**纯配置驱动**。执行器只实现"动作能力"（点击、输入、开关、等待、校验），业务逻辑全在 `actions.json`。加一个新设置项 = 加一段 JSON，`background.js` 一行都不用改。

## 何时使用

- 用户要新增/修改/删除扩展里的某个设置项（**新增前先发 `references/input-template.md` 的清单**）
- 用户报告"插件跑了但页面提示作者不能为空"之类的失败
- 需要查公众号后台某元素的稳定选择器
- 需要重新产出一份可加载的扩展目录或 zip
- 用户问怎么安装、怎么更新、版本号怎么控制

## 目录结构

```
wechat-mp-oneclick-yashu/
├── SKILL.md                     本文件
├── assets/plugin/               插件源码（唯一真相源）
│   ├── manifest.json            MV3 配置
│   ├── actions.json             ★ 所有设置项都在这里
│   ├── background.js            通用执行器（不随业务改动）
│   ├── popup.html / popup.js    弹窗，按 actions.json 自动渲染卡片
│   └── icons/                   16 / 48 / 128 图标
├── scripts/build.py             校验 + 复制 + 打包
└── references/
    ├── selectors.md             已实测的选择器清单
    ├── input-template.md        ★ 加新功能时先发给用户填的清单
    └── pitfalls.md              踩坑记录（改之前先读）
```

## 产出插件

```bash
python scripts/build.py --out <目标目录>              # 版本号保持当前值
python scripts/build.py --bump --out <目标目录>       # 版本号第 3 位 +1（2.0.0 → 2.0.1）
python scripts/build.py --bump minor --out <目标目录> # 版本号第 2 位 +1
python scripts/build.py --bump major --out <目标目录> # 版本号第 1 位 +1
```

默认输出到 `./dist/公众号一键设置`，并在同级生成同名 zip。脚本会先校验 `manifest.json`、`actions.json`、必需文件和图标，缺东西直接报错，不会产出半成品。

**版本号由 `--bump` 控制**：带上就升位，并把新版本写回 `assets/plugin/manifest.json`（所以是持久递增，下次从这里继续）；不带就沿用当前版本。用户说"版本号加一"时，就加 `--bump`。

## 首次安装到 Edge

安装这一步**必须人工完成**，浏览器不允许任何程序自动安装本地扩展，也不要在回答里承诺自动化。

1. 地址栏输入 `edge://extensions/` 回车
2. 打开页面上的「开发人员模式」开关
3. 点「加载解压缩的扩展」，选中 `build.py` 输出的插件目录（要选到**直接含 `manifest.json` 的那一层**，不要选它的上级目录）
4. 列表里出现「公众号一键设置」后，点它的「详细信息」→ 打开「在工具栏中显示」，图标会固定到地址栏右侧
5. 打开公众号图文编辑页（草稿状态），**刷新一次页面**
6. 点工具栏图标 → 填作者名 → 点「执行」

### 安装时的常见报错

| 报错 / 现象 | 原因 |
|---|---|
| 「清单文件缺失或不可读取」 | 目录层级选错，要选到含 `manifest.json` 的那层 |
| 「此扩展程序可能已损坏」 | 输出目录文件不全，重跑 `build.py` |
| 工具栏找不到图标 | 没打开「在工具栏中显示」 |
| 加载成功但点执行没反应 | 标签页没刷新；扩展首次加载后必须刷新页面 |

### 后续更新

1. 重跑 `build.py` 生成新产物
2. 在 `edge://extensions/` 点该扩展卡片上的**重新加载**箭头（不需要重新选目录）
3. 刷新公众号页面

改了 `manifest.json` 的 `permissions` 时，必须重新加载扩展 + 刷新页面，否则新权限不生效。已装过的不要重复「加载解压缩」。

## 版本管理

skill 目录本身是 git 仓库，远程为 `git@github.com:steelan9199/wechat-mp-oneclick-yashu.git`。

改完内容（新增设置项、改选择器、改脚本）后提交：

```bash
cd "C:/Users/Administrator/.workbuddy/skills/wechat-mp-oneclick-yashu"
git add -A && git commit -m "feat: 加赞赏设置" && git push
```

`dist/` 与 `*.zip` 已在 `.gitignore` 中忽略，产物不进仓库。

## 新增一个设置项（主流程）

### 第 0 步：先向用户索要信息清单（强制，不许跳过）

收到"加一个 XX 设置"的请求后，**先不要读代码、不要改任何文件**，把 `references/input-template.md` 从「一」到「四」原样发给用户，等用户填完再开工。

没有真实选择器和父级结构时只能靠猜。本项目的原创声明功能就因为输入框定位错误（页面有 3 个同名 input、顶部文章作者框 class 几乎一样）返工了 4 轮，代价远大于等用户填一次清单。

**例外（2026-10 起，留言验证过）**：如果新功能满足**全部**条件——纯点击、无输入、目标文案在页面上唯一、且失败后果只是"没点上"（不会写错数据）——可以直接用 `text` + 文本兜底实现，不必等清单。「不开启留言」就是这么加的，一次通过。只要碰输入框、同 class 多份、或需要读/切状态，仍然必须先拿真实 DOM。

清单必须覆盖：

- **全局**：功能名、所在页面、前置状态、输入参数及限制、成功标志、失败提示原文
- **每个元素**：元素 HTML、selector、父级元素 HTML、可见与否、动作类型
- **输入类额外**：旁边有没有字数计数器（`0/8` 这种）

用户填完先做自查，缺任何一项都追问，**不要用默认值糊过去**：

| 检查项 | 缺失后果 |
|---|---|
| 父级元素信息 | 同 class 重复元素必踩坑，会写错输入框 |
| 可见性说明 | 无法确认目标是唯一可见元素 |
| 成功判定标准 | `verify` 写不出来，失败会被当成功 |
| 输入框有无计数器 | 可能用错输入模式，页面提示"不能为空" |

### 第 1 步：手工走一遍

拿用户给的清单在页面上手工核对一遍，确认每个元素在选择器下确实能唯一命中可见目标。对不上的地方先问清楚，再写配置。

### 第 2 步：写配置

往 `assets/plugin/actions.json` 的 `actions` 数组追加一项。选择器优先用结构定位（父级 class 链），不要用裸 class。两个候选写进 `target` 数组。

### 第 3 步：构建并实测

跑 `build.py` → 重载扩展 → 刷新页面 → 点执行，确认日志出现 `✔ 校验通过`。

### 第 4 步：补文档

把新确认的选择器写进 `references/selectors.md`，把新踩的坑写进 `references/pitfalls.md`。

### 配置写法

真实可用的完整例子（「赞赏」，2026-10 实测通过，无输入参数）：

```json
{
  "id": "reward",
  "name": "赞赏",
  "desc": "点「不开启」→ 同意协议 → 确定，成功后显示「账户: xxx」",
  "steps": [
    { "action": "click", "desc": "点击赞赏开关（不开启）", "wait": 1000,
      "target": [
        "#js_reward_setting_area > div > div.setting-group__switch.js_reward_open > span",
        "#js_reward_setting_area .js_reward_open span.js_reward_setting_tips"
      ] },
    { "action": "waitFor", "desc": "等待赞赏设置弹框", "timeout": 8000,
      "target": [".reward-setting-dialog__footer", ".agreement-check-btn__wrp"] },
    { "action": "toggle", "desc": "勾选《赞赏功能使用协议》", "checked": true,
      "visibleOnly": false, "optional": true, "wait": 300,
      "target": [".agreement-check-btn__wrp input.weui-desktop-form__checkbox",
                 "#vue_app mp-image-product-dialog input.weui-desktop-form__checkbox"] },
    { "action": "click", "desc": "点击「确定」", "text": "确定", "pick": "last", "wait": 1000,
      "target": [
        "#vue_app > mp-image-product-dialog > div > div.weui-desktop-dialog__wrp > div > div.weui-desktop-dialog__ft > div > div.operate-btn__group > div:nth-child(1) > button",
        ".reward-setting-dialog__footer .operate-btn__group button.weui-desktop-btn_primary",
        "button.weui-desktop-btn.weui-desktop-btn_primary"
      ] }
  ],
  "verify": { "action": "text", "value": "账户", "timeout": 8000,
    "target": ["#js_reward_setting_area span.js_reward_setting_tips",
               "#js_reward_setting_area .js_reward_open .js_reward_setting_tips"] }
}
```

带输入参数时，加 `inputs` 数组，`key` 在 steps 里用 `{{key}}` 引用：

```json
"inputs": [
  { "key": "author", "label": "作者名", "placeholder": "请输入作者（≤8字）", "maxLength": 8, "default": "" }
],
"steps": [
  { "action": "type", "desc": "填写作者名", "mode": "composed", "value": "{{author}}",
    "target": ["span.js_customerauthor_container > input.js_author"] }
]
```

弹窗会自动为每个 `key` 渲染输入框，并在 `chrome.storage.local` 里记住上次填的值；`maxLength` 会同时限制输入框和提交校验。

具体选择器一律以 `references/selectors.md` 为准，那边是实测记录。

## 动作能力

| action | 参数 | 说明 |
|---|---|---|
| `click` | `target` `text` `pick` `index` `climb` | 点元素。`pick: "last"` 取最后一个可见的；`climb: true` 点最近的 `cursor:pointer` 祖先 |
| `type` | `target` `value` `mode` | 输入。`mode` 默认 `composed`（逐字符），别改成 `instant` |
| `toggle` | `target` `checked` | 开关，幂等（已是目标状态就不点）。目标隐藏时自动退到 `.setting-group__switch` 父级 |
| `radio` | `target` | 单选，幂等 |
| `waitFor` | `target` `timeout` | 等元素出现，默认 5s |
| `waitGone` | `target` `timeout` | 等元素消失 |
| `sleep` | `ms` | 纯等待，页面动画慢时用 |

公共字段：`target`（字符串或字符串数组，按顺序试）、`text`（按文本精确过滤，忽略空白）、`index`、`visibleOnly: false`（允许操作隐藏元素）、`optional: true`（找不到就跳过）、`wait`（动作后额外等待毫秒）、`desc`（日志里显示的名字）。

**文本兜底**：`target` 里的选择器全部落空、且写了 `text` 时，执行器会自动全文档找「文本完全相等的最内层可见元素」。适合类名未知/改版场景（「留言」就是靠它）。不想要这个行为写 `"textScan": false`。注意兜底只能定位，不能提供幂等判断。

**关于隐藏 checkbox（协议勾选、开关类）**：`toggle` 的幂等只在能读到 `input.checked` 时成立。`visibleOnly` 不为 false 且 input 藏着时，执行器会退到父级 `<label>`/`<div>` 上点——那玩意没有 `checked` 属性，每次都会点，已勾选时等于**取消勾选**。所以操作隐藏 checkbox 一律写成 `target: <input 的精确选择器>` + `"visibleOnly": false`，让它在 input 本身上判断状态。

`verify.action`：`gone` / `exists` / `checked` / `value` / `text`。`verify.optional: true` 时校验不通过只记警告，不让整体失败（谨慎使用，会掩盖真失败）。

## 硬规则

违反其中任何一条都会得到"看起来成功、实际失败"的结果。

1. **输入一律 `mode: "composed"`**。微信的 `js_counter` 组件只认逐字符增长的事件序列，一次性赋值 DOM 里有值但组件状态是空，提交时被判"作者不能为空"。
2. **判可见用 `getBoundingClientRect()` 的宽高**，不要用 `offsetParent`——`position: fixed` 的后代会被误判为不可见。
3. **禁止裸选择器 `input.js_author`**。页面有 3 个，且顶部文章作者框 `#author` 的 class 里**同样带** `js_author js_counter`，任何靠 class 的判断都会误伤。只能用 `span.js_customerauthor_container > input.js_author` 这类结构定位。
4. **每一步都写 `desc`**，否则弹窗日志没法定位卡在哪一步。
5. **每个设置项必须有 `verify`**。只打印"已点击确定"毫无意义，必须验证目标状态真的变了。
6. **改完必须三件事**：跑 build、重载扩展、刷新页面。只刷新网页不生效。
7. **版本号只在用户要求升位时加 `--bump`**。同一份代码重复打包不要反复升位，否则版本号失去意义；`--bump` 会写回源码，属于持久变更。
8. **加新功能前必须先发清单**。把 `references/input-template.md` 发给用户、等用户填完，才能开始写配置。收到清单前列出的信息之前不许动 `actions.json`。
9. **同页可能有多个弹框同时存在**。原创、赞赏共用 `mp-image-product-dialog` 这个容器，关掉的弹框节点仍在 DOM 里。定位弹框内的按钮必须"弹框专属 class + 可见性过滤"双保险，点确定一律配 `"text": "确定"` + `"pick": "last"`，否则可能点到另一个弹框的按钮。
10. **每加一项就把实测通过的选择器写回 `references/selectors.md`**。选择器会随微信改版失效，文档是下次排障的第一手依据。

## 排障

| 现象 | 原因 |
|---|---|
| 日志显示值写进去了，页面仍提示"不能为空" | 选错元素（隐藏模板），或用了 `instant` |
| 点执行毫无反应 | 扩展没重载 / 页面没刷新 / 不在图文编辑页 |
| `❌ 找不到元素` | 选择器过期，去 `references/selectors.md` 核对；或弹框还没出现，加 `waitFor` |
| `❌ 校验未通过` | 操作被页面拦下，先抓页面自己的提示文字 |
| 提示"不能超过 8 个字" | 输入值本身超长，不是程序问题 |
| 赞赏：日志有"点击确定"但校验未通过 | 协议没勾上，确定按钮是灰的。检查 `.agreement-check-btn__wrp input.weui-desktop-form__checkbox` 是否带 `visibleOnly: false` |
| 赞赏：点了确定却弹回原来的弹框 / 没变化 | 点到了原创弹框的确定。两个弹框共用容器，必须 `text: "确定"` + `pick: "last"` |
| 赞赏：`❌ 找不到元素：点击赞赏开关` | 页面没滚动到设置区，或 `#js_reward_setting_area` 尚未渲染（先点一次文章设置） |
| 留言：`❌ 找不到元素：点击「不开启留言」` | 留言本来已开启（日志「相近的文案」会显示 `已开启`），或设置区还没渲染。属正常，不是故障 |
| 留言：点了确定页面没反应 | 确定按钮不在 `mp-image-product-dialog` 内，dump 弹框 DOM 后把选择器补到 `target` 第一位 |

需要抓页面提示文字时，在页面控制台跑：

```js
[...document.querySelectorAll('div,span,p')]
  .filter(e => e.children.length === 0 && /作者|不能|错误/.test(e.textContent || ''))
  .map(e => e.textContent.trim())
```
