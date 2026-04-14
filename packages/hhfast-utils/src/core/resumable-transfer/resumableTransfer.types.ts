// ─── 状态枚举 ────────────────────────────────────────────

/** 分片传输状态。 */
export type ChunkStatus = 'pending' | 'transferring' | 'completed' | 'failed'

/** 传输任务状态。 */
export type TransferTaskStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'

// ─── 分片 ────────────────────────────────────────────────

/** 单个分片快照（公开只读）。 */
export interface ChunkSnapshot<TChunk = unknown> {
  /** 分片索引（0-based）。 */
  index: number
  /** 用户传入的分片数据。 */
  data: TChunk
  /** 分片状态。 */
  status: ChunkStatus
  /** 传输结果（成功时由 transferFn 返回）。 */
  result?: unknown
  /** 失败时的错误信息。 */
  error?: unknown
  /** 已尝试次数。 */
  attempts: number
}

// ─── 任务快照 ────────────────────────────────────────────

/** 传输任务快照（公开只读）。 */
export interface TransferTaskSnapshot<TChunk = unknown, TResult = unknown> {
  /** 任务 ID。 */
  id: string
  /** 任务名称（可选，便于 UI 展示）。 */
  name?: string
  /** 任务状态。 */
  status: TransferTaskStatus
  /** 分片快照列表。 */
  chunks: ChunkSnapshot<TChunk>[]
  /** 已完成分片数。 */
  completedCount: number
  /** 总分片数。 */
  totalCount: number
  /** 进度 0-1。 */
  progress: number
  /** 传输速率（分片/秒）。 */
  speed: number
  /** 预估剩余时间（毫秒），0 表示无法估算。 */
  eta: number
  /** 合并结果（所有分片完成后由 mergeFn 返回）。 */
  result?: TResult
  /** 任务级错误。 */
  error?: unknown
  /** 创建时间戳。 */
  createdAt: number
  /** 开始时间戳。 */
  startedAt?: number
  /** 完成时间戳。 */
  finishedAt?: number
  /** 用户自定义元数据。 */
  metadata?: Record<string, unknown>
}

// ─── 传输函数 ────────────────────────────────────────────

/** 分片传输上下文。 */
export interface ChunkTransferContext<TChunk = unknown> {
  /** 任务 ID。 */
  taskId: string
  /** 分片索引。 */
  index: number
  /** 分片数据。 */
  chunk: TChunk
  /** 取消信号。 */
  signal: AbortSignal
}

/** 分片传输函数（用户提供）。 */
export type TransferFn<TChunk = unknown, TChunkResult = unknown> = (
  ctx: ChunkTransferContext<TChunk>,
) => Promise<TChunkResult>

/** 合并函数：所有分片完成后调用。 */
export type MergeFn<TChunkResult = unknown, TResult = unknown> = (
  chunkResults: TChunkResult[],
) => TResult | Promise<TResult>

// ─── 创建任务参数 ────────────────────────────────────────

/** 创建传输任务参数。 */
export interface CreateTransferTaskOptions<
  TChunk = unknown,
  TChunkResult = unknown,
  TResult = unknown,
> {
  /** 指定任务 ID，不传则自动生成。 */
  id?: string
  /** 任务名称。 */
  name?: string
  /** 分片数组。 */
  chunks: TChunk[]
  /** 分片传输函数。 */
  transferFn: TransferFn<TChunk, TChunkResult>
  /** 全部分片完成后的合并函数（可选）。 */
  mergeFn?: MergeFn<TChunkResult, TResult>
  /** 单任务并发分片数，不传使用全局默认。 */
  concurrency?: number
  /** 单任务最大重试次数，不传使用全局默认。 */
  maxRetries?: number
  /** 是否创建后自动开始，默认 true。 */
  autoStart?: boolean
  /** 用户自定义元数据。 */
  metadata?: Record<string, unknown>
}

// ─── 全局配置 ────────────────────────────────────────────

/** ResumableTransfer 全局配置。 */
export interface ResumableTransferOptions {
  /** 默认任务并发分片数，默认 3。 */
  concurrency?: number
  /** 默认最大重试次数，默认 3。 */
  maxRetries?: number
  /**
   * 重试间隔策略。
   * @param attempt 第几次重试（从 1 开始）。
   * @returns 间隔毫秒。
   */
  retryDelay?: (attempt: number) => number
  /** 外部存储适配器（可选）。 */
  storage?: TransferProgressStore
  /** 是否在分片失败后自动重试，默认 true。 */
  autoRetry?: boolean
}

// ─── 事件 ────────────────────────────────────────────────

/** 事件名称。 */
export type ResumableTransferEventName =
  | 'task-created'
  | 'task-started'
  | 'task-paused'
  | 'task-completed'
  | 'task-failed'
  | 'task-cancelled'
  | 'chunk-success'
  | 'chunk-error'
  | 'progress'

/** chunk 事件附加信息。 */
export interface ChunkEventExtra {
  /** 分片索引。 */
  chunkIndex: number
  /** 分片错误（仅 chunk-error）。 */
  error?: unknown
}

/** 事件监听回调。 */
export type ResumableTransferListener<TChunk = unknown, TResult = unknown> = (
  snapshot: TransferTaskSnapshot<TChunk, TResult>,
  extra?: ChunkEventExtra,
) => void

// ─── 持久化 ────────────────────────────────────────────

/**
 * 可序列化的持久化快照（不含函数引用）。
 * transferFn / mergeFn 需要用户在恢复时重新绑定。
 */
export interface TransferTaskPersistSnapshot {
  id: string
  name?: string
  status: TransferTaskStatus
  chunks: Array<{
    index: number
    data: unknown
    status: ChunkStatus
    attempts: number
  }>
  completedCount: number
  totalCount: number
  createdAt: number
  startedAt?: number
  metadata?: Record<string, unknown>
}

/** 传输进度持久化接口。 */
export interface TransferProgressStore {
  /** 保存任务快照。 */
  save(taskId: string, snapshot: TransferTaskPersistSnapshot): Promise<void>
  /** 加载单任务快照。 */
  load(taskId: string): Promise<TransferTaskPersistSnapshot | undefined>
  /** 删除任务快照。 */
  remove(taskId: string): Promise<void>
  /** 加载所有已保存快照。 */
  loadAll(): Promise<TransferTaskPersistSnapshot[]>
}
