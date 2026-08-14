# dsh-answer-pet

<p align="center"><strong>DSH Web 可扩展回答状态宠物框架：宠物主题、多会话进度与模型执行轨迹。</strong></p>

`dsh-answer-pet` 是一个 DeepSeek Harness Web bundle 插件和可扩展回答状态宠物框架。核心负责会话进度、模型轨迹和状态卡；声明式 `PetTheme v1` 负责宠物 SVG、动画、宽高比和阶段文案。默认使用蓝鲸，也内置橘猫示例主题。

<p align="center">
  <img src="./assets/dsh-answer-pet-demo.gif" width="560" alt="dsh-answer-pet 蓝鲸宠物、多会话进度卡和模型工具调用轨迹演示">
</p>

## 功能

- 可扩展 `PetTheme v1`：宠物外观与回答进度核心解耦。
- 内置蓝鲸和橘猫两个纯 SVG 主题，无外部图片资源。
- 实时显示开始处理、思考、输出、工具调用和完成状态；工具失败会在轨迹中标红。
- 显示输出 token、token/s、耗时、进度百分比和文本片段。
- 多会话并发时，每个运行中的会话显示一张独立进度卡。
- 卡片内展示最近模型轨迹：分析任务、推理与规划、组织回答、调用工具及运行结果。
- 工具轨迹显示工具名、安全短描述、运行/完成/失败状态和耗时，不展示完整命令或原始参数。
- 状态卡可折叠；折叠后仅在有运行会话时显示会话数量。
- 拖拽位置持久化；单击宠物只触发主题定义的眨眼表现。
- 轮询与 SSE 结合：流式数据平滑更新，阶段切换即时刷新。
- 支持主题、尺寸、停靠角、透明度、轮询间隔、进度卡和气泡配置。

## 宠物主题

| 主题 id | 名称 | 定位 |
|---|---|---|
| `blue-whale` | 蓝鲸 | 默认主题，保持原有喷水、摆尾、眨眼和完成表情 |
| `orange-cat` | 橘猫 | PetTheme v1 示例，包含摆尾、抬爪、说话和完成表情 |

在配置中切换：

```yaml
answer-pet:
  theme: orange-cat
```

主题更新会在下一次配置刷新时挂载。未知主题会安全回退到 `blue-whale`。

希望开发自己的宠物，请查看 [PetTheme v1 开发指南](./docs/PET_THEME.md)。当前版本只加载随插件构建、通过契约校验的可信内置主题，不执行第三方任意 JavaScript，也不注入未经清理的外部 SVG。

## 安装

```sh
dsh plugin --profile web add github:Nanki-nn/dsh-answer-pet
```

安装后重启 `dsh web`，再刷新页面。升级插件时重复执行同一条安装命令即可。

> 模型轨迹和主题配置都由插件的 Node half 提供；从旧版本升级到 `0.6.0` 后必须重启 `dsh web`，仅刷新浏览器不会加载新的配置 schema。

## 回答进度

| 阶段 | 主题接口 | 状态卡 |
|---|---|---|
| 空闲 | `idle` 动画与文案 | 不显示运行会话卡与数量 |
| `turn/start` | `turn` | 2% |
| 思考（`step/start`） | `think` | 5% → 10% |
| 输出（`assistant/chunk`） | `stream` | 10% → 90%，按 token 填充 |
| 工具（`tool/call`） | `tool` | 冻结当前进度并显示工具名 |
| 完成（`turn/end`） | `done` | 100% |

进度计算规则：

- 优先使用 `assistant/chunk` 的 `usage` 数据；流式期间按文本长度估算。
- 有 `maxTokens` 时按 `outputTokens / maxTokens` 填充。
- 没有 `maxTokens` 时使用饱和曲线估算，避免进度长期停滞。
- 同一回合内进度单调不减。
- 输出速率使用 EMA 平滑估算。

## 状态卡结构

每个运行会话对应一张状态卡，包含：

1. **标题行**：运行状态圆点、会话标题、进度百分比。
2. **统计行**：当前阶段、输出 token、token/s 和已运行时间。
3. **轨迹时间线**：最近的模型动作、工具调用、状态和耗时。
4. **进度条**：同一回合内平滑、单调填充；模型输出时显示流动效果。

多个会话同时运行时，卡片按会话独立更新并纵向排列。没有运行会话时不显示状态卡，也不显示数量按钮。

## 模型执行轨迹

每张运行会话卡都会展示最近的模型动作，例如：

```text
分析任务 · 步骤 1                  1s
推理与规划                         3s
调用 grep · SessionEvent           2s
组织回答                           5s
```

轨迹状态通过时间线圆点区分：

- **蓝色呼吸圆点**：当前正在执行。
- **绿色圆点**：动作或工具调用已完成。
- **红色圆点**：工具调用失败。

可识别的轨迹包括：

- 开始处理请求。
- 进入模型步骤并分析任务。
- 生成 reasoning 内容时显示“推理与规划”。
- 生成正文时显示“组织回答”。
- 原生 `tool/call` / `tool/result` 工具调用及结果。
- `run_code` 内部的 `tool/code-dispatch-start` / `tool/code-dispatch` 嵌套工具调用。

为避免轨迹区域过高，宿主最多保存最近 6 条，卡片显示最近 4 条。每个运行会话独立维护自己的轨迹。

### 参数与隐私

工具轨迹始终显示实际工具名，例如 `read`、`grep`、`pwsh`、`web_search`。参数区域只从以下白名单字段提取简短摘要：

- `description`
- `query`
- `pattern`
- `file_path`
- `path`
- `url`

插件不会在轨迹面板中显示完整 Shell 命令、完整工具参数或原始 JSON；摘要会压缩空白并限制长度。

## 交互

- **拖拽宠物**：移动宠物，位置保存在 `localStorage`。
- **单击宠物**：触发主题的单次眨眼，不移动、不切换位置。
- **展开状态**：运行中的会话在宠物上方显示为多张独立卡片。
- **收起状态**：卡片隐藏；有运行会话时，宠物下方显示数量按钮。
- **点击数量按钮**：重新展开会话卡片。

## 配置

在 `<dshHome>/settings.yaml` 的 `answer-pet` section 中配置：

```yaml
answer-pet:
  theme: blue-whale # blue-whale / orange-cat
  size: 96          # 宠物高度 px（48–200）
  corner: br        # 停靠角：br / bl / tr / tl
  opacity: 1        # 透明度（0.2–1）
  pollMs: 800       # /state 轮询间隔
  showBar: true     # 显示会话进度卡
  showBubble: true  # 显示状态气泡
```

## 常见问题

### 安装后没有看到宠物

确认插件安装到了 Web profile：

```sh
dsh plugin --profile web add github:Nanki-nn/dsh-answer-pet
```

然后停止并重新启动当前的 `dsh web` 进程，再刷新原来的 Web GUI 页面。单独启动另一个 Web 服务不会更新当前页面。

### 能看到宠物，但没有模型轨迹

轨迹依赖 Node half 监听 `session/event`。更新插件后必须重启 `dsh web`；仅刷新页面只能更新浏览器端样式，无法加载新的宿主逻辑。

### 为什么设置主题后仍显示蓝鲸

确认 `theme` 是已安装的主题 id。`0.6.0` 内置 `blue-whale` 和 `orange-cat`；未知或无效 id 会回退到蓝鲸。升级后还需要重启 `dsh web`，让新的 settings schema 生效。

### 为什么空闲时不显示数字 `0`

这是预期行为。数量按钮只在状态卡已收起且至少有一个运行会话时显示；空闲时保持界面简洁。

### 如何恢复被拖动的默认位置

在当前 DSH Web 页面打开浏览器开发者工具并执行：

```js
localStorage.removeItem('answer-pet:pos')
location.reload()
```

如需同时恢复状态卡的展开状态：

```js
localStorage.removeItem('answer-pet:bar')
location.reload()
```

### 为什么进度不是模型提供的精确百分比

多数模型接口不会报告“回答完成百分比”。插件根据阶段、token、`maxTokens` 和饱和曲线估算进度；真实 token usage 到达后会覆盖流式估算值。

## 架构

- `.dsh-plugin/index.mjs`：监听 `session/event`，按会话维护进度与 title/running 元数据，提供 `/answer-pet/state`、`/answer-pet/events` 和 `/answer-pet/config`。
- `.dsh-plugin/src/progress.mjs`：进度阶段机、token 填充和速率 EMA。
- `.dsh-plugin/src/session-meta.mjs`：从事件折叠会话标题和运行状态。
- `.dsh-plugin/src/trace.mjs`：折叠阶段与工具事件，生成有限长度、安全摘要的模型轨迹（宿主保留 6 条，客户端展示 4 条）。
- `.dsh-plugin/client/themes/runtime.mjs`：PetTheme v1 校验、注册、解析和蓝鲸回退。
- `.dsh-plugin/client/themes/blue-whale.mjs`：默认蓝鲸主题。
- `.dsh-plugin/client/themes/orange-cat.mjs`：橘猫示例主题和开发模板。
- `.dsh-plugin/client/index.mjs`：主题无关的浏览器 DOM、状态卡、轨迹时间线和交互核心。
- `.dsh-plugin/client.js`：由构建脚本按运行时 → 主题 → 核心顺序生成的 DSH client bundle。
- `docs/PET_THEME.md`：主题契约、安全约束和开发流程。

## 本地开发

```sh
npm install
npm test
node scripts/build-client.mjs
node scripts/build-client.mjs --check
```

本地安装：

```sh
dsh plugin --profile web add "D:\AI\dsh\dsh-answer-pet"
```

客户端 bundle 修改后刷新页面生效；Node half 修改后需要重启 `dsh web`。

想报告问题、提交代码或新增宠物主题，请阅读 [贡献指南](./CONTRIBUTING.md)。

## License

MIT © Nanki-nn
