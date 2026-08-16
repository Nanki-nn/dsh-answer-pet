# PetTheme v1 开发指南

`dsh-answer-pet` 将回答进度、模型轨迹和多会话状态卡保留在核心层，将宠物的 SVG、局部动画、宽高比和阶段文案放入声明式主题层。

## 当前边界

PetTheme v1 当前支持**随插件源码构建的可信内置主题**。它不会：

- 从 URL 下载主题；
- 扫描并执行第三方 JavaScript；
- 将未经清理的用户 SVG 注入 DSH 页面；
- 向主题暴露原始 `session/event` 或完整工具参数。

普通主题禁止 `<image>`。确需保留原画细节的可信内置主题可以显式声明 `trustedRaster: true`，但运行时只允许一张构建时注入的 `data:image/png;base64,...`，仍拒绝外部 URL、SVG data URI、事件属性和多个图片节点。这个能力不对配置或第三方动态主题开放。

开发者可以新增独立主题文件并向项目提交贡献。后续版本可在此契约保持稳定的前提下加入经过清理的本地主题包。

## 文件结构

```text
.dsh-plugin/client/
├─ themes/
│  ├─ runtime.mjs       # PetTheme v1 校验、注册、解析和回退
│  ├─ blue-whale.mjs        # 默认主题
│  ├─ orange-cat.mjs        # 示例主题
│  └─ silver-shaded-cat.mjs # 可信内嵌 PNG + SVG 状态覆盖层
└─ index.mjs                # 核心状态卡、拖拽、气泡和数据连接
```

构建脚本按顺序拼接运行时、主题和核心客户端。主题文件不使用 `import` / `export`，并调用运行时提供的 `registerPetTheme()`。

## 主题契约

```js
registerPetTheme({
  apiVersion: 1,
  id: 'my-pet',
  name: '我的宠物',
  aspectRatio: 1.25,
  markup: `<svg class="ap-pet-svg" viewBox="0 0 150 120">...</svg>`,
  css: `
[data-answer-pet][data-ap-theme="my-pet"] .my-tail {
  animation: my-tail-wave 1s ease-in-out infinite;
}
`,
  phases: {
    idle:   { animation: 'idle',   bubble: '我在这里～' },
    turn:   { animation: 'think',  bubble: '开始处理…' },
    think:  { animation: 'think',  bubble: '思考中…' },
    stream: { animation: 'stream', bubble: null },
    tool:   { animation: 'tool',   bubble: null },
    done:   { animation: 'done',   bubble: '完成啦！' },
    error:  { animation: 'error',  bubble: '遇到问题了…' },
  },
})
```

### 字段

| 字段 | 类型 | 约束 | 用途 |
|---|---|---|---|
| `apiVersion` | `number` | 当前必须为 `1` | 主题契约版本 |
| `id` | `string` | kebab-case，1–32 字符 | 配置值和 CSS scope |
| `name` | `string` | 非空 | 用户可读名称 |
| `aspectRatio` | `number` | `0.5`–`3` | 宽度 ÷ 高度；高度由 `size` 配置决定 |
| `markup` | `string` | 必须包含 `<svg` | 宠物矢量结构 |
| `trustedRaster` | `true`（可选） | 仅可信内置主题；只能内嵌一张 PNG | 保留原画细节的显式能力位 |
| `css` | `string` | 必须限定作用域 | 宠物局部样式与动画 |
| `phases` | `object` | 必须覆盖全部 7 个阶段 | 阶段动作和默认气泡 |

主题 id 重复、字段缺失、阶段缺失、API 版本错误或宽高比越界都会在注册时立即抛错。配置指定未知主题时，客户端回退到 `blue-whale`。

## 阶段接口

主题只接收归一化阶段，不解析 DSH 原始事件：

| 阶段 | 含义 | 核心行为 |
|---|---|---|
| `idle` | 空闲 | 无运行会话卡 |
| `turn` | 开始处理 | 回合刚打开 |
| `think` | 模型分析 | 推理或请求准备 |
| `stream` | 生成回答 | 气泡优先展示最近文本片段 |
| `tool` | 调用工具 | 气泡优先展示工具名 |
| `done` | 回答完成 | 进度 100% |
| `error` | 错误表现预留 | 主题必须定义，核心目前不将普通 `turn/end` 映射为 error |

`phases.*.animation` 会映射成舞台类名：

```html
<div class="ap-stage ap-anim-think">...</div>
```

核心还会提供：

```html
<div
  data-answer-pet
  data-ap-theme="my-pet"
  data-ap-theme-api="1"
  data-ap-phase="think"
  data-ap-running
>
```

主题 CSS 应使用 `data-ap-theme` 限定作用域，避免影响状态卡或 DSH 页面其他元素。

## SVG 约定

根 SVG 必须包含公共类：

```html
<svg class="ap-pet-svg" viewBox="0 0 150 120" aria-hidden="true">
```

建议：

- 使用 `viewBox`，不要写固定像素宽高；
- 为可动画部件添加主题专属 class；
- SVG `id` 添加主题前缀，避免渐变和裁剪路径冲突；
- 使用 `transform-box: fill-box` 和明确的 `transform-origin`；
- 支持 `prefers-reduced-motion`；
- 不引用远程图片、字体或样式；
- 不使用 `<script>`、`<foreignObject>`、事件属性或 `javascript:` URL。

## CSS 约定

所有选择器都必须以主题 scope 开始：

```css
[data-answer-pet][data-ap-theme="my-pet"] .my-tail { ... }
```

不要：

```css
/* 会污染整个页面 */
svg { ... }
.tail { ... }
body { ... }
```

动画名称也建议添加主题前缀：

```css
@keyframes ap-my-pet-tail { ... }
```

单击宠物时核心设置 `data-ap-click-blink`。主题可以选择实现对应表现：

```css
[data-answer-pet][data-ap-theme="my-pet"][data-ap-click-blink] .my-eye {
  animation: ap-my-pet-click-blink .24s ease-in-out 1 !important;
}
```

## 添加一个内置主题

1. 复制 `.dsh-plugin/client/themes/orange-cat.mjs`。
2. 修改 `id`、`name`、`aspectRatio`、SVG、CSS 和文案。
3. 将主题 id 加入 `.dsh-plugin/src/config.mjs` 的 `BUILTIN_THEME_IDS`。
4. 将主题文件加入 `scripts/build-client.mjs` 的 `SOURCES`，位置在运行时之后、核心客户端之前。
5. 执行：

```sh
npm test
npm run build:client
npm run check:client
```

6. 在 `<dshHome>/settings.yaml` 中切换验证：

```yaml
answer-pet:
  theme: my-pet
```

配置更新可实时挂载主题；首次安装或 Node half 发生变化时仍需重启 `dsh web`。

## 审核清单

- [ ] `apiVersion` 为 `1`
- [ ] id 符合 kebab-case 且不重复
- [ ] 7 个阶段完整
- [ ] 根节点包含 `.ap-pet-svg`
- [ ] 所有 CSS 都限定到自己的 `data-ap-theme`
- [ ] SVG id 和 keyframes 使用主题前缀
- [ ] 无脚本、事件属性、外部资源或 `foreignObject`
- [ ] 支持 reduced motion
- [ ] 单击眨眼（如果该宠物有眼睛）
- [ ] `npm test` 和 `npm run check:client` 通过
