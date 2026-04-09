# ResumableTransfer 断点续传

通用断点续传管理器，支持任意可分片的数据传输任务。

## 特性

- **分片并发**：可配置每个任务的并发分片数
- **暂停 / 恢复**：通过 AbortController 中止进行中的分片，恢复时从断点继续
- **自动重试**：分片失败后指数退避重试，可配置最大重试次数
- **断点续传**：`retry()` 只重置失败分片，已完成分片不受影响
- **持久化**：可插拔存储接口，内置 localStorage 实现
- **事件驱动**：完整的生命周期事件
- **速率估算**：基于滚动窗口的实时速度和 ETA 计算

## 快速开始

```ts
import { ResumableTransfer } from '@nnnb/hhfast-ui'

const transfer = new ResumableTransfer({
  concurrency: 3,
  maxRetries: 3,
})

// 监听进度
transfer.on('progress', (snapshot) => {
  console.log(`${(snapshot.progress * 100).toFixed(1)}%`)
})

// 创建任务
const taskId = transfer.create({
  chunks: [chunk1, chunk2, chunk3, chunk4, chunk5],
  transferFn: async (ctx) => {
    // ctx.chunk — 当前分片数据
    // ctx.signal — AbortSignal，支持取消
    await uploadChunk(ctx.chunk, ctx.signal)
  },
})

// 暂停
transfer.pause(taskId)

// 恢复
transfer.start(taskId)
```

## 文件上传示例

```ts
import {
  ResumableTransfer,
  createLocalStorageTransferStore,
} from '@nnnb/hhfast-ui'

const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB

function sliceFile(file: File): Array<{ index: number; blob: Blob }> {
  const chunks: Array<{ index: number; blob: Blob }> = []
  let offset = 0
  let index = 0
  while (offset < file.size) {
    chunks.push({ index, blob: file.slice(offset, offset + CHUNK_SIZE) })
    offset += CHUNK_SIZE
    index++
  }
  return chunks
}

const transfer = new ResumableTransfer({
  concurrency: 3,
  storage: createLocalStorageTransferStore(),
})

function uploadFile(file: File) {
  const chunks = sliceFile(file)

  return transfer.create({
    name: file.name,
    chunks,
    transferFn: async (ctx) => {
      const formData = new FormData()
      formData.append('chunk', ctx.chunk.blob)
      formData.append('index', String(ctx.chunk.index))
      formData.append('taskId', ctx.taskId)

      const resp = await fetch('/api/upload/chunk', {
        method: 'POST',
        body: formData,
        signal: ctx.signal,
      })
      if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`)
    },
    mergeFn: async () => {
      // 通知服务端合并分片
      await fetch('/api/upload/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: 'xxx', filename: file.name }),
      })
    },
    metadata: { filename: file.name, size: file.size },
  })
}
```

## 从持久化恢复

```ts
// 页面加载时恢复之前未完成的任务
const ids = await transfer.restoreAllTasks({
  'transfer_abc123': {
    transferFn: async (ctx) => { /* 同上 */ },
  },
})

// 恢复后任务状态为 paused，需手动启动
for (const id of ids) {
  transfer.start(id)
}
```

## API

### 构造参数 `ResumableTransferOptions`

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `concurrency` | `number` | `3` | 默认每任务并发分片数 |
| `maxRetries` | `number` | `3` | 默认最大重试次数 |
| `retryDelay` | `(attempt: number) => number` | 指数退避 | 重试间隔策略 |
| `storage` | `TransferProgressStore` | - | 持久化存储适配器 |
| `autoRetry` | `boolean` | `true` | 分片失败后是否自动重试 |

### 方法

| 方法 | 说明 |
|------|------|
| `create(options)` | 创建传输任务，返回 taskId |
| `start(taskId)` | 开始/恢复传输 |
| `pause(taskId)` | 暂停传输 |
| `cancel(taskId)` | 取消传输 |
| `retry(taskId)` | 重试失败任务（保留已完成分片） |
| `getTask(taskId)` | 获取任务快照 |
| `getAllTasks()` | 获取全部任务快照 |
| `removeTask(taskId)` | 移除已结束的任务 |
| `restoreTask(taskId, transferFn, mergeFn?)` | 从存储恢复单个任务 |
| `restoreAllTasks(fnMap)` | 批量恢复 |
| `on(event, listener)` | 订阅事件 |
| `destroy()` | 销毁实例 |

### 事件

| 事件 | 触发时机 |
|------|----------|
| `task-created` | 任务创建 / 恢复 |
| `task-started` | 任务开始传输 |
| `task-paused` | 任务暂停 |
| `task-completed` | 任务完成 |
| `task-failed` | 任务失败 |
| `task-cancelled` | 任务取消 |
| `chunk-success` | 单个分片完成 |
| `chunk-error` | 单个分片失败 |
| `progress` | 进度更新 |

### 任务快照 `TransferTaskSnapshot`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 任务 ID |
| `status` | `TransferTaskStatus` | 任务状态 |
| `progress` | `number` | 进度 0-1 |
| `speed` | `number` | 速率（分片/秒） |
| `eta` | `number` | 预估剩余时间（ms） |
| `completedCount` | `number` | 已完成分片数 |
| `totalCount` | `number` | 总分片数 |
| `chunks` | `ChunkSnapshot[]` | 分片详情 |
