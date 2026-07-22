# hhfast Workspace

pnpm monorepo，包含两个 npm 包：

- `@nnnb/hhfast-ui`：Vue 3 组件与插件入口
- `@nnnb/hhfast-utils`：无框架 core/utils 能力

## 安装

```bash
pnpm add @nnnb/hhfast-ui
```

请确保项目已安装对等依赖：

```bash
pnpm add vue@^3.4
```

使用 **React 订阅 hooks** 时需安装 `react`（>=18，在 `peerDependencies` 中为可选）。

## 按框架选择入口

| 需求 | 导入 |
|------|------|
| Vue 应用（默认） | `import { HhfastUi, toast } from '@nnnb/hhfast-ui'` 或 `@nnnb/hhfast-ui/vue` |
| 仅 headless（无 UI 框架） | `import { pushToast, subscribeToastStore } from '@nnnb/hhfast-ui/headless'` |
| React 中订阅 Toast/Modal 快照 | `import { useToastListSnapshot } from '@nnnb/hhfast-ui/react'` |

样式可单独引入：`import '@nnnb/hhfast-ui/index.css'`（主入口仍会侧载样式，与构建一致时可二选一）。

## 快速开始

### 插件全量注册

入口包会侧载样式（`packages/hhfast-ui/src/index.ts` 内 `import './styles/tailwind.css'`）。在应用根节点安装插件后，可使用全局注册的组件与指令名：

| 注册名 | 说明 |
|--------|------|
| `HTable` | 表格 |
| `HTooltip` | 文字提示 |
| `HSplitter` / `HSplitterPanel` | 分割面板 |
| `HPopover` | 气泡卡片 |
| `HDrawer` | 抽屉 |
| `HConfigProvider` | 全局配置 |
| `HTree` | 树 |
| `v-tooltip` | Tooltip 指令（`app.directive('tooltip', …)`） |

```ts
import { createApp } from 'vue'
import HhfastUi from '@nnnb/hhfast-ui'
import App from './App.vue'

createApp(App).use(HhfastUi).mount('#app')
```

### 按需引入

```ts
import {
  HTable,
  toast,
  modal,
  HhfastUi,
} from '@nnnb/hhfast-ui'
```

命令式 API（如 `toast`、`modal`）通常需在布局中挂载对应 Layer 组件；详见 [docs/integration.md](docs/integration.md)。

## 样式与 Tailwind

库内样式基于 **Tailwind CSS v4** 思路（入口 CSS 使用 `@import "tailwindcss"` 及自定义工具类）。使用 Vite 时，推荐在应用侧安装 `@tailwindcss/vite` 与 `tailwindcss`，并与本库一致配置插件，以便扫描到你的页面类名。

若仅需库默认外观，一般只需正常安装并引入包入口（样式会随模块加载）。若你在业务代码中大量使用 Tailwind 工具类，请在应用 `vite.config` 中配置 Tailwind 插件，并在 `content`/`scan` 中包含业务源码（必要时包含 `node_modules/@nnnb/hhfast-ui/dist` 或源码路径，视打包方式而定）。更多说明见 [docs/integration.md](docs/integration.md)。

## Headless 与多框架

Toast / Modal 的实现位于 [`packages/hhfast-ui/src/components/toast`](packages/hhfast-ui/src/components/toast) 与 [`packages/hhfast-ui/src/components/modal`](packages/hhfast-ui/src/components/modal)。子路径 `@nnnb/hhfast-ui/headless` 与 `@nnnb/hhfast-ui/react` 见上表。

## API 文档

- **类型级 API（TypeDoc）**：克隆仓库后执行 `pnpm run docs:api`，生成：
  - HTML：`docs/api/index.html`（本地打开浏览）
  - JSON：`docs/api.json`（可供工具或后续 MCP 索引）
- **集成与模块导读**：[docs/integration.md](docs/integration.md)、[docs/modules-overview.md](docs/modules-overview.md)

> 发布到 npm 的 tarball 默认包含 `dist/` 与 `README.md`，不包含上述生成物；文档需在仓库内生成或通过站点部署。

## 开发本仓库

```bash
pnpm install
pnpm run dev          # 启动 apps/playground
pnpm run dev:backend  # 启动 apps/playground-backend
pnpm run build        # 构建 packages/*
pnpm run typecheck    # 类型检查 packages/*
pnpm run docs:api     # 生成 hhfast-ui API 文档
```

## 模块单独发布

本仓库是 `pnpm workspace`，`@nnnb/hhfast-ui` 与 `@nnnb/hhfast-utils` 可独立构建、独立发布，互不影响。

### 可用脚本（根目录执行）

```bash
# 仅构建指定模块
pnpm run build:ui
pnpm run build:utils

# 仅检查指定模块类型
pnpm run typecheck:ui
pnpm run typecheck:utils

# 单模块发布前检查与构建
pnpm run release:ui
pnpm run release:utils

# 完整发布门禁：测试、类型、构建、Playground E2E、tarball 消费验证
pnpm run release:check

# 单模块发布到 npm
pnpm run publish:ui
pnpm run publish:utils
```

### 推荐发布流程

```bash
# 1) 确认 npm 身份及远端版本
npm whoami
npm view @nnnb/hhfast-utils version
npm view @nnnb/hhfast-ui version

# 2) 执行完整门禁并生成本地 tarball
pnpm run release:check

# 3) 先发布 0.1.0 utils，确认 registry 可见
pnpm run publish:utils
npm view @nnnb/hhfast-utils@0.1.0 version

# 4) 再发布 0.1.0 UI
pnpm run publish:ui
```

发布命令均为本地手动操作；`release:check` 和 `verify:packages` 不会执行 `npm publish`。验证后的包位于 `artifacts/npm/`。

`@nnnb/hhfast-utils` 虽然包含 `background-task-manager`、`task-execution-chain` 等子路径导出，但它们属于同一个 npm 包（`@nnnb/hhfast-utils`），发布时统一随该包版本一起发布。

## 许可证

[MIT](LICENSE)
