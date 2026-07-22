# @nnnb/hhfast-utils

[中文](#中文) | [English](#english)

## 中文

`@nnnb/hhfast-utils` 是 hhfast 的无框架工具与核心模块集合。它可以独立用于非 Vue 场景，也可以和 `@nnnb/hhfast-ui` 一起组成完整的 Playground/UI 体验。

### 安装

```bash
pnpm add @nnnb/hhfast-utils
# 或
npm install @nnnb/hhfast-utils
```

包元数据要求 Node.js `>=18`。

### 子路径入口

| 入口 | 说明 |
| --- | --- |
| `@nnnb/hhfast-utils` | 从 `core` 和 `utils` 汇总导出的通用能力。 |
| `@nnnb/hhfast-utils/background-task-manager` | 后台任务管理器、调度器和持久化辅助能力。 |
| `@nnnb/hhfast-utils/task-execution-chain` | 任务执行链、栈追踪和链路差异比较。 |
| `@nnnb/hhfast-utils/resumable-transfer` | 面向浏览器的断点续传/上传辅助能力。 |
| `@nnnb/hhfast-utils/json-to-tree` | 将 JSON 或业务数据转换为树节点。 |
| `@nnnb/hhfast-utils/curl-to-request` | 将 cURL 命令解析为请求描述。 |

### 示例

```ts
import { AsyncQueue, retry, uuid } from '@nnnb/hhfast-utils'
import { jsonToTree } from '@nnnb/hhfast-utils/json-to-tree'
import { parseCurlCommand } from '@nnnb/hhfast-utils/curl-to-request'

const id = uuid()
const queue = new AsyncQueue<string>({ concurrency: 2 })
const tree = jsonToTree({ id, name: 'hhfast' })
const request = parseCurlCommand('curl -X GET https://api.example.com')

const result = await retry(() => queue.enqueue(async () => JSON.stringify(tree)))
console.log(result, request)
```

#### 任务执行链

```ts
import {
  TaskExecutionChain,
  TaskExecutionStackTracer,
} from '@nnnb/hhfast-utils/task-execution-chain'

const chain = new TaskExecutionChain()
const tracer = new TaskExecutionStackTracer(chain)
```

#### 后台任务管理

```ts
import { BackgroundTaskManager } from '@nnnb/hhfast-utils/background-task-manager'

const manager = new BackgroundTaskManager()
```

### Worker 资源说明

`resumable-transfer` 和文件 MD5 工具会在浏览器构建中使用 worker 资源。包构建会以相对 URL 输出 worker，方便 Vite 消费方从已发布包中打包它。

### Playground

交互示例位于 `apps/playground`，GitHub Pages 目标地址：

https://nnnb.github.io/hhfast/

本地开发：

```bash
pnpm dev
pnpm test:playground
```

### 开发与发布前检查

```bash
pnpm build:utils
pnpm typecheck:utils
pnpm test:utils
```

发布前在仓库根目录运行完整检查：

```bash
pnpm release:check
```

## English

`@nnnb/hhfast-utils` provides framework-agnostic utilities and core modules for hhfast. Use it without Vue, or pair it with `@nnnb/hhfast-ui` when building the full Playground/UI experience.

### Install

```bash
pnpm add @nnnb/hhfast-utils
# or
npm install @nnnb/hhfast-utils
```

Node.js `>=18` is required by the package metadata.

### Entry Points

| Entry point | Description |
| --- | --- |
| `@nnnb/hhfast-utils` | Shared utilities exported from `core` and `utils`. |
| `@nnnb/hhfast-utils/background-task-manager` | Background task manager, scheduler and persistence helpers. |
| `@nnnb/hhfast-utils/task-execution-chain` | Task execution chain, stack tracing and chain diff utilities. |
| `@nnnb/hhfast-utils/resumable-transfer` | Browser-oriented resumable upload/transfer helpers. |
| `@nnnb/hhfast-utils/json-to-tree` | Convert JSON/business data into tree nodes. |
| `@nnnb/hhfast-utils/curl-to-request` | Parse cURL commands into request descriptions. |

### Examples

```ts
import { AsyncQueue, retry, uuid } from '@nnnb/hhfast-utils'
import { jsonToTree } from '@nnnb/hhfast-utils/json-to-tree'
import { parseCurlCommand } from '@nnnb/hhfast-utils/curl-to-request'

const id = uuid()
const queue = new AsyncQueue<string>({ concurrency: 2 })
const tree = jsonToTree({ id, name: 'hhfast' })
const request = parseCurlCommand('curl -X GET https://api.example.com')

const result = await retry(() => queue.enqueue(async () => JSON.stringify(tree)))
console.log(result, request)
```

#### Task Execution Chain

```ts
import {
  TaskExecutionChain,
  TaskExecutionStackTracer,
} from '@nnnb/hhfast-utils/task-execution-chain'

const chain = new TaskExecutionChain()
const tracer = new TaskExecutionStackTracer(chain)
```

#### Background Task Manager

```ts
import { BackgroundTaskManager } from '@nnnb/hhfast-utils/background-task-manager'

const manager = new BackgroundTaskManager()
```

### Worker Asset Note

`resumable-transfer` and file MD5 helpers use a worker asset in browser builds. The package build emits the worker with a relative URL so Vite consumers can bundle it from the published package.

### Playground

The interactive demos for these utilities live in `apps/playground` and are intended for GitHub Pages at:

https://nnnb.github.io/hhfast/

Local development:

```bash
pnpm dev
pnpm test:playground
```

### Development And Release Check

```bash
pnpm build:utils
pnpm typecheck:utils
pnpm test:utils
```

Before publishing, run the workspace release gate from the repository root:

```bash
pnpm release:check
```

## License

MIT
