# dsh-answer-pet

<p align="center"><strong>DSH Web GUI 蓝鲸桌面宠物：实时展示回答进度与运行中的会话。</strong></p>
<img width="206" height="207" alt="image" src="https://github.com/user-attachments/assets/575dfe92-7b18-47be-830e-c2234587ed7a" />
`dsh-answer-pet` 是一个 DeepSeek Harness Web bundle 插件。它在页面中显示一只可拖拽的蓝鲸，并将每个运行会话的回答阶段、进度、模型轨迹、工具调用、token、输出速率和耗时展示为独立状态卡片。


## 功能

- 蓝鲸 SVG 桌面宠物，无外部图片资源。
- 实时显示开始处理、思考、输出、工具调用、完成和错误状态。
- 显示输出 token、token/s、耗时、进度百分比和文本片段。
- 多会话并发时，每个运行中的会话显示一张独立进度卡。
- 卡片内展示最近模型轨迹：分析任务、推理与规划、组织回答、调用工具及运行结果。
- 工具轨迹显示工具名、安全短描述、运行/完成/失败状态和耗时，不展示完整命令或原始参数。
- 状态卡可折叠；折叠后仅在有运行会话时显示会话数量。
- 拖拽位置持久化；单击蓝鲸只触发眨眼。
- 轮询与 SSE 结合：流式数据平滑更新，阶段切换即时刷新。
- 支持尺寸、停靠角、透明度、轮询间隔、进度卡和气泡配置。

## 安装

```sh
dsh plugin --profile web add github:Nanki-nn/dsh-answer-pet
```

安装后重启 `dsh web`，再刷新页面。

## 回答进度

| 阶段 | 蓝鲸表现 | 状态卡 |
|---|---|---|
| 空闲 | 缓慢漂浮、眨眼 | 不显示运行会话卡与数量 |
| `turn/start` | 开始处理 | 2% |
| 思考（`step/start`） | 观察、喷水 | 5% → 10% |
| 输出（`assistant/chunk`） | 摆尾、嘴角轻动 | 10% → 90%，按 token 填充 |
| 工具（`tool/call`） | 侧鳍拍动 | 冻结当前进度并显示工具名 |
| 完成（`turn/end`） | 眯眼庆祝 | 100% |
| 出错 | 错误状态动画 | 显示错误状态 |

进度计算规则：

- 优先使用 `assistant/chunk` 的 `usage` 数据；流式期间按文本长度估算。
- 有 `maxTokens` 时按 `outputTokens / maxTokens` 填充。
- 没有 `maxTokens` 时使用饱和曲线估算，避免进度长期停滞。
- 同一回合内进度单调不减。
- 输出速率使用 EMA 平滑估算。

## 交互

- **拖拽蓝鲸**：移动宠物，位置保存在 `localStorage`。
- **单击蓝鲸**：眨一次眼，不移动、不切换位置。
- **展开状态**：运行中的会话在蓝鲸上方显示为多张独立卡片。
- **收起状态**：卡片隐藏；有运行会话时，蓝鲸下方显示数量按钮。
- **点击数量按钮**：重新展开会话卡片。

## 配置

在 `<dshHome>/settings.yaml` 的 `answer-pet` section 中配置：

```yaml
answer-pet:
  size: 96          # 蓝鲸高度 px（48–200）
  corner: br        # 停靠角：br / bl / tr / tl
  opacity: 1        # 透明度（0.2–1）
  pollMs: 800       # /state 轮询间隔
  showBar: true     # 显示会话进度卡
  showBubble: true  # 显示状态气泡
```

## 架构

- `.dsh-plugin/index.mjs`：监听 `session/event`，按会话维护进度与 title/running 元数据，提供 `/answer-pet/state`、`/answer-pet/events` 和 `/answer-pet/config`。
- `.dsh-plugin/src/progress.mjs`：进度阶段机、token 填充和速率 EMA。
- `.dsh-plugin/src/session-meta.mjs`：从事件折叠会话标题和运行状态。
- `.dsh-plugin/src/trace.mjs`：折叠阶段与工具事件，生成有限长度、安全摘要的模型轨迹。
- `.dsh-plugin/client/index.mjs`：浏览器端 DOM、SVG、状态卡、轨迹时间线和交互实现。
- `.dsh-plugin/client.js`：由构建脚本生成的 DSH client bundle。

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

## License

MIT © Nanki-nn
