# Background Task Manager（通用后台任务管理器）

`BackgroundTaskManager` 是一个**框架无关**的任务调度内核，适用于前端、Node.js 服务、Electron 等场景。

它专注于这些能力：

- 任务注册与入队（按 `type` 分发）
- 并发调度（`concurrency`）
- 失败重试（`maxRetries` + `retryDelay`）
- 进度上报（`setProgress`）
- 任务取消（`AbortController`）
- 事件订阅（任务变化、队列变化、空闲事件）

---

## 1. 引入与初始化

```ts
import { BackgroundTaskManager } from '@/core'

const taskManager = new BackgroundTaskManager({
  concurrency: 3,
  defaultMaxRetries: 1,
  retryDelay: (attempt) => attempt * 1000,
  autoStart: true,
})
```

---

## 2. 注册任务处理器

```ts
taskManager.register<{ fileId: string }, { url: string }>(
  'file:upload',
  async ({ payload, signal, setProgress }) => {
    setProgress(0.1, '开始上传')

    // 业务逻辑中可自行检查取消状态
    if (signal.aborted) {
      throw new Error('任务已取消')
    }

    // 模拟阶段进度
    setProgress(0.5, `上传中：${payload.fileId}`)

    // ... 执行异步上传
    await new Promise((resolve) => setTimeout(resolve, 800))

    setProgress(1, '上传完成')
    return { url: `https://example.com/${payload.fileId}` }
  },
)
```

---

## 3. 入队与执行

```ts
const id = taskManager.enqueue({
  type: 'file:upload',
  payload: { fileId: 'f_001' },
  maxRetries: 2,
})

console.log('task id:', id)
```

当 `autoStart=true` 时会自动调度；否则可手动调用：

```ts
taskManager.start()
```

---

## 4. 状态模型

任务状态为：

- `pending`：等待执行
- `running`：执行中
- `succeeded`：成功完成
- `failed`：执行失败（且无可用重试）
- `cancelled`：已取消

典型流转：

`pending -> running -> succeeded`

`pending -> running -> failed -> pending(重试) -> running -> ...`

`pending/running -> cancelled`

---

## 5. 事件订阅

支持事件：

- `task-added`
- `task-updated`
- `task-removed`
- `queue-changed`
- `idle`

```ts
const offTask = taskManager.on('task-updated', (task) => {
  if (!task) {
    return
  }
  console.log(`[${task.type}]`, task.status, task.progress, task.progressMessage)
})

const offIdle = taskManager.on('idle', () => {
  console.log('当前任务队列已空闲')
})

// 取消订阅
offTask()
offIdle()
```

---

## 6. 常用 API

### 调度与控制

- `pause()`：暂停调度（不影响已运行任务）
- `resume()`：恢复调度
- `start()`：主动触发调度
- `cancel(taskId)`：取消指定任务
- `retry(taskId)`：将失败任务重新入队

### 查询与清理

- `getTask(taskId)`：获取单任务快照
- `getTasks()`：获取所有任务快照
- `isIdle()`：是否空闲
- `remove(taskId)`：移除终态任务（成功/失败/取消）
- `clearFinished()`：批量清理终态任务

---

## 7. 类型说明（核心）

### `BackgroundTaskManagerOptions`

```ts
interface BackgroundTaskManagerOptions {
  concurrency?: number
  defaultMaxRetries?: number
  retryDelay?: (attempt: number) => number
  autoStart?: boolean
  plugins?: BackgroundTaskManagerPlugin[]
}
```

### `EnqueueTaskOptions`

```ts
interface EnqueueTaskOptions<TPayload = unknown> {
  id?: string
  type: string
  payload: TPayload
  maxRetries?: number
}
```

### `TaskExecuteContext`

```ts
interface TaskExecuteContext<TPayload = unknown> {
  id: string
  type: string
  payload: TPayload
  signal: AbortSignal
  setProgress: (progress: number, message?: string) => void
}

interface BackgroundTaskManagerPlugin {
  onInit?: (manager: BackgroundTaskManager) => void
  onTaskAdded?: (task: BackgroundTask) => void
  onTaskUpdated?: (prev: BackgroundTask, next: BackgroundTask) => void
  onTaskRemoved?: (task: BackgroundTask) => void
  onQueueChanged?: (tasks: ReadonlyArray<BackgroundTask>) => void
  onIdle?: () => void
}
```

---

## 8. 接入建议

- UI 框架层（Vue/React/Svelte）只负责订阅事件并渲染任务列表
- 任务核心逻辑放在 `register(type, handler)` 内，保持可测试
- 任务 `type` 建议采用命名空间风格：`module:action`
- 对可中断任务，优先使用支持 `AbortSignal` 的 API
- 对非幂等任务，谨慎设置 `maxRetries`

---

## 9. 最小封装示例（可复用）

```ts
import { BackgroundTaskManager } from '@/core'

export const taskManager = new BackgroundTaskManager({
  concurrency: 2,
  defaultMaxRetries: 0,
})

export const enqueueTask = taskManager.enqueue.bind(taskManager)
export const onTaskEvent = taskManager.on.bind(taskManager)
```

这样业务侧可以直接围绕 `enqueueTask` + `onTaskEvent` 构建统一后台任务中心。

---

## 10. 看板字段映射建议

如果你要实现类似“后台任务管理面板”，可直接基于 `BackgroundTask` 字段映射：

| 看板字段 | 来源 | 说明 |
|---|---|---|
| 任务 ID | `task.id` | 全局唯一 |
| 任务类型 | `task.type` | 建议按 `module:action` 命名 |
| 状态 | `task.status` | `pending/running/succeeded/failed/cancelled` |
| 进度条 | `task.progress` | 建议按 `0-1` 映射百分比 |
| 进度文案 | `task.progressMessage` | 阶段提示 |
| 创建时间 | `task.createdAt` | 用于排序与筛选 |
| 开始时间 | `task.startedAt` | 计算等待时长 |
| 完成时间 | `task.finishedAt` | 计算总耗时 |
| 尝试次数 | `task.attempts` | 观测重试情况 |
| 最大重试 | `task.maxRetries` | 与 `attempts` 配合展示 |
| 错误信息 | `task.error` | 失败原因展示 |

---

## 11. 错误与重试策略建议

- 瞬时错误（网络抖动、429/503）建议设置重试
- 业务错误（参数非法、权限不足）建议直接失败
- `retryDelay` 推荐指数退避，避免失败风暴
- 对幂等任务可放宽 `maxRetries`，对非幂等任务建议保守

参考策略：

```ts
const taskManager = new BackgroundTaskManager({
  defaultMaxRetries: 2,
  retryDelay: (attempt) => Math.min(10_000, 500 * 2 ** (attempt - 1)),
})
```

---

## 12. 调试与排障清单

- 任务一直 `pending`：检查是否 `pause()` 后未 `resume()`
- 入队报错 “No handler registered”：
  - 检查是否先 `register(type, handler)` 再 `enqueue`
  - 检查 `type` 字符串是否一致
- 取消无效：确认任务处理器内部是否尊重 `AbortSignal`
- 进度不更新：确认处理器中是否调用 `setProgress`

---

## 13. Playground 示例

仓库内可直接查看运行示例：

- `playground/demos/background-task-manager/BackgroundTaskManagerDemo.vue`

该示例包含：

- 多类型任务创建
- 并发调度
- 进度展示
- 取消与重试
- 事件日志与终态清理

---

## 14. 插件机制

`BackgroundTaskManager` 通过插件机制提供“横切能力”扩展点，例如：

- 日志追踪（统一记录任务生命周期）
- 监控与埋点（成功率、耗时、错误率）
- 链路追踪（traceId/spanId 串联）
- 审计记录（关键任务落库）
- 告警（连续失败触发告警）

### 14.1 生命周期钩子

插件可实现以下任意钩子：

- `onInit(manager)`：管理器初始化完成时调用
- `onTaskAdded(task)`：任务创建并入队后调用
- `onTaskUpdated(prev, next)`：任务状态或进度变化时调用
- `onTaskRemoved(task)`：任务被删除或被清理时调用
- `onQueueChanged(tasks)`：队列发生变化时调用
- `onIdle()`：当前无排队任务且无运行中任务时调用

内部会确保：

- 所有钩子都在 `try/catch` 包裹下执行
- 单个插件报错不会影响其他插件与核心调度

### 14.2 简单日志插件示例

```ts
import type {
  BackgroundTask,
  BackgroundTaskManager,
  BackgroundTaskManagerPlugin,
} from '@nnnb/hhfast-ui'

export function createConsoleLoggerPlugin(): BackgroundTaskManagerPlugin {
  return {
    onInit(manager: BackgroundTaskManager) {
      console.log('[TaskManager] init, idle =', manager.isIdle())
    },
    onTaskAdded(task: BackgroundTask) {
      console.log('[task-added]', task.id, task.type, task.status)
    },
    onTaskUpdated(prev, next) {
      if (prev.status !== next.status || prev.progress !== next.progress) {
        console.log(
          '[task-updated]',
          next.id,
          `${prev.status} -> ${next.status}`,
          `${Math.round(prev.progress * 100)}% -> ${Math.round(next.progress * 100)}%`,
        )
      }
    },
    onTaskRemoved(task) {
      console.log('[task-removed]', task.id, task.type, task.status)
    },
  }
}
```

使用方式：

```ts
const manager = new BackgroundTaskManager({
  concurrency: 3,
  plugins: [createConsoleLoggerPlugin()],
})
```

### 14.3 统计插件示例（按 type 聚合）

```ts
export interface TaskStats {
  total: number
  succeeded: number
  failed: number
  cancelled: number
  totalDurationMs: number
}

export type TaskStatsMap = Record<string, TaskStats>

export function createStatsPlugin(target: TaskStatsMap): BackgroundTaskManagerPlugin {
  return {
    onTaskUpdated(prev, next) {
      const endStates: BackgroundTaskStatus[] = ['succeeded', 'failed', 'cancelled']
      if (!endStates.includes(next.status) || endStates.includes(prev.status)) {
        return
      }

      const type = next.type
      const item =
        target[type]
        ?? (target[type] = {
          total: 0,
          succeeded: 0,
          failed: 0,
          cancelled: 0,
          totalDurationMs: 0,
        })

      item.total += 1
      if (next.status === 'succeeded') {
        item.succeeded += 1
      }
      else if (next.status === 'failed') {
        item.failed += 1
      }
      else if (next.status === 'cancelled') {
        item.cancelled += 1
      }

      if (next.startedAt && next.finishedAt) {
        item.totalDurationMs += next.finishedAt - next.startedAt
      }
    },
  }
}
```

业务侧可据此在 UI 中展示：

- 各任务类型成功率：`succeeded / total`
- 平均耗时：`totalDurationMs / total`
- 最近失败热点任务类型


