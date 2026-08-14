# 贡献指南

欢迎为 `dsh-answer-pet` 贡献代码、文档或宠物主题！本指南介绍如何报告问题、搭建本地开发环境、遵循项目约定以及提交合并请求（PR）。

## 如何贡献

| 贡献类型 | 途径 |
|---|---|
| 报告 Bug | 在 [Issues](https://github.com/Nanki-nn/dsh-answer-pet/issues) 新建 issue，尽量附上复现步骤、`dsh web` 版本、插件版本和浏览器/控制台报错 |
| 功能建议 | 新建 issue，说明使用场景和期望行为，方便讨论设计 |
| 提交代码 | Fork 仓库，按下文「开发流程」提交 PR |
| 新增宠物主题 | 阅读 [PetTheme v1 开发指南](./docs/PET_THEME.md)，主题贡献同样走 PR |
| 完善文档 | README、本指南和 `docs/` 下的文档都欢迎改进 |

## 开发环境

- **Node.js ≥ 20**（构建脚本使用 `import.meta.dirname`，本地开发环境为 Node 22）。
- 本机已安装并配置好 DSH CLI（`dsh` 命令），用于本地挂载插件验证。

克隆仓库并安装依赖：

```sh
git clone https://github.com/Nanki-nn/dsh-answer-pet.git
cd dsh-answer-pet
npm install
```

## 常用命令

```sh
npm test                 # 运行全部单元测试（node:test）
npm run build:client     # 重建 .dsh-plugin/client.js
npm run check:client     # 校验 client.js 与构建器输出一致（不一致即非零退出）
```

本地挂载到 Web profile 进行验证：

```sh
dsh plugin --profile web add "/绝对路径/dsh-answer-pet"
```

- 只修改了客户端源码：刷新页面即可看到效果（客户端 bundle 由插件按修改时间注入）。
- 修改了 Node half（`.dsh-plugin/index.mjs` 或 `src/` 中宿主侧用到的逻辑）：必须**重启 `dsh web`**，仅刷新浏览器不会加载新宿主逻辑。
- 修改了配置 schema：同样需要重启 `dsh web` 后刷新。

## 项目结构

```text
.dsh-plugin/
├─ index.mjs                  # Node half：监听 session/event，提供 /state、/events、/config
├─ src/
│  ├─ config.mjs              # 配置 schema、默认值与 BUILTIN_THEME_IDS（单一来源）
│  ├─ progress.mjs            # 进度阶段机、token 估算与速率 EMA（纯逻辑，可单测）
│  ├─ session-meta.mjs        # 会话标题与运行状态折叠（纯逻辑，可单测）
│  ├─ trace.mjs               # 模型轨迹折叠与安全摘要（纯逻辑，可单测）
│  └─ routes.mjs              # HTTP 路由前缀（单一来源）
├─ client/
│  ├─ index.mjs               # 浏览器核心：状态卡、拖拽、气泡、数据连接
│  └─ themes/
│     ├─ runtime.mjs          # PetTheme v1 校验、注册、回退
│     ├─ blue-whale.mjs       # 默认主题
│     └─ orange-cat.mjs       # 示例主题与开发模板
└─ client.js                  # 构建产物，勿手改
scripts/build-client.mjs      # 客户端 bundle 构建器
tests/*.test.mjs              # node:test 单元测试
docs/PET_THEME.md             # 主题契约与开发流程
```

## 开发规范

- **代码风格**：与现有代码保持一致——2 空格缩进、单引号、不加分号、多行字面量使用尾随逗号。注释使用中文。
- **纯逻辑可单测**：`src/progress.mjs`、`src/session-meta.mjs`、`src/trace.mjs`、`src/routes.mjs` 保持零宿主依赖；新增的推导/折叠逻辑应写成纯函数并配单元测试，不要塞进宿主回调里。
- **配置单一来源**：新增配置项时，默认值、schema 和 clamp 只写在 `src/config.mjs`；消费端不得复制第二份默认值。
- **路由前缀单一来源**：新增 HTTP 端点时在 `src/routes.mjs` 定义路径，客户端与 Node half 都从这里引用。
- **客户端零平台依赖**：`scripts/build-client.mjs` 的 `SOURCES` 所列文件（运行时、主题、核心）一律不使用 `import` / `export`；bundle 由构建脚本纯文本拼接生成。
- **禁止手改构建产物**：`.dsh-plugin/client.js` 是生成文件。修改了客户端源码后必须执行 `npm run build:client` 重建，`npm run check:client` 会在 CI 中逐字节校验。
- **隐私约束**：工具轨迹只从白名单字段（`description`、`query`、`pattern`、`file_path`、`path`、`url`）提取短摘要；不要在轨迹面板展示完整命令、完整参数或原始 JSON。
- **主题安全边界**：不注入外部 SVG、不执行第三方 JavaScript；主题 id 与动画名遵循 kebab-case。

## 提交 PR 的流程

1. Fork 仓库并基于 `main` 新建功能分支，命名建议：`feat/xxx`、`fix/xxx`、`docs/xxx`、`theme/xxx`。
2. 完成改动，补齐或更新单元测试。
3. 本地全量验证通过：

   ```sh
   npm test
   npm run build:client   # 若改动涉及客户端源码
   npm run check:client
   ```

4. 提交信息使用 Conventional Commits 风格，例如：

   ```text
   feat(theme): 新增 xxx 宠物主题
   fix(progress): 修正流式 token 估算溢出
   docs: 补充配置项说明
   ```

5. 发起 PR 到 `main`，在描述中说明：
   - 改动动机与效果；
   - 涉及的结构性变更（是否新增了配置项、主题或端点）；
   - 本地验证结果（测试与 `check:client` 是否通过）。

如果改动新增或修改了宠物主题，请在 PR 描述中附上 [审核清单](./docs/PET_THEME.md#审核清单) 的核对结果。

## 新增宠物主题

主题开发不涉及框架核心，推荐直接阅读 [PetTheme v1 开发指南](./docs/PET_THEME.md)。关键步骤：

1. 复制 `orange-cat.mjs` 作为模板，修改 `id`、`name`、SVG、CSS 与阶段文案。
2. 将主题 id 加入 `src/config.mjs` 的 `BUILTIN_THEME_IDS`。
3. 将主题文件加入 `scripts/build-client.mjs` 的 `SOURCES`（运行时之后、核心客户端之前）。
4. 执行 `npm test`、`npm run build:client`、`npm run check:client`，并在本地 settings 中切换主题验证。

## 发布相关（维护者）

- 版本号遵循语义化版本；`0.6.0` 引入配置 schema 变更后要求重启 `dsh web`，此类破坏性说明要写进 README 的升级提示。
- 发布前确保 `npm run check:client` 通过，`client.js` 与构建器输出一致。

## 行为准则

保持友善、就事论事。讨论设计时请优先考虑现有契约（PetTheme v1、事件折叠语义）的稳定性，避免不必要地破坏向后兼容。

## License

贡献即表示你同意你的改动以本项目相同的 [MIT License](./LICENSE) 授权发布。
