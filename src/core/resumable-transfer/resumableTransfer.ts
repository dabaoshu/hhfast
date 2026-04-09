import { prefixedId } from '../../utils/uuid'
import { delayMs } from '../../utils/retryUtility'
import type {
  ChunkEventExtra,
  ChunkSnapshot,
  ChunkStatus,
  CreateTransferTaskOptions,
  MergeFn,
  ResumableTransferEventName,
  ResumableTransferListener,
  ResumableTransferOptions,
  TransferFn,
  TransferProgressStore,
  TransferTaskPersistSnapshot,
  TransferTaskSnapshot,
  TransferTaskStatus,
} from './resumableTransfer.types'

// ─── 内部类型（不导出） ────────────────────────────────────

interface InternalChunkRecord<TChunk = unknown> {
  index: number
  data: TChunk
  status: ChunkStatus
  result?: unknown
  error?: unknown
  attempts: number
}

interface InternalTaskRecord<TChunk = unknown, TChunkResult = unknown, TResult = unknown> {
  id: string
  name?: string
  status: TransferTaskStatus
  chunks: InternalChunkRecord<TChunk>[]
  completedCount: number
  totalCount: number
  concurrency: number
  maxRetries: number
  transferFn: TransferFn<TChunk, TChunkResult>
  mergeFn?: MergeFn<TChunkResult, TResult>
  result?: TResult
  error?: unknown
  createdAt: number
  startedAt?: number
  finishedAt?: number
  metadata?: Record<string, unknown>
  controller?: AbortController
  /** 用于计算速率的滚动时间戳。 */
  completionTimestamps: number[]
  runningChunkCount: number
  autoStart: boolean
}

// ─── 默认重试间隔（指数退避） ──────────────────────────────

const defaultRetryDelay = (attempt: number): number =>
  Math.min(30_000, 1000 * Math.pow(2, Math.max(0, attempt - 1)))

// ─── 主类 ──────────────────────────────────────────────────

/**
 * 通用断点续传管理器。
 *
 * 支持任意可分片的数据传输任务，提供暂停 / 恢复 / 重试 / 并发控制 / 持久化等能力。
 * 框架无关，仅依赖 TS/JS 运行时。
 */
export class ResumableTransfer {
  private readonly tasks = new Map<string, InternalTaskRecord>()
  private readonly listeners = new Map<
    ResumableTransferEventName,
    Set<ResumableTransferListener>
  >()
  private readonly concurrency: number
  private readonly maxRetries: number
  private readonly retryDelay: (attempt: number) => number
  private readonly storage?: TransferProgressStore
  private readonly autoRetry: boolean

  constructor(options: ResumableTransferOptions = {}) {
    this.concurrency = Math.max(1, options.concurrency ?? 3)
    this.maxRetries = Math.max(0, options.maxRetries ?? 3)
    this.retryDelay = options.retryDelay ?? defaultRetryDelay
    this.storage = options.storage
    this.autoRetry = options.autoRetry ?? true
  }

  // ─── 公开方法 ──────────────────────────────────────────

  /**
   * 创建传输任务。
   * @returns 任务 ID。
   */
  create<TChunk, TChunkResult = unknown, TResult = unknown>(
    options: CreateTransferTaskOptions<TChunk, TChunkResult, TResult>,
  ): string {
    const id = options.id ?? prefixedId('transfer')
    if (this.tasks.has(id)) {
      throw new Error(`Transfer task with id "${id}" already exists.`)
    }
    if (options.chunks.length === 0) {
      throw new Error('Transfer task must have at least one chunk.')
    }

    const task: InternalTaskRecord<TChunk, TChunkResult, TResult> = {
      id,
      name: options.name,
      status: 'pending',
      chunks: options.chunks.map((data, index) => ({
        index,
        data,
        status: 'pending' as ChunkStatus,
        result: undefined,
        error: undefined,
        attempts: 0,
      })),
      completedCount: 0,
      totalCount: options.chunks.length,
      concurrency: Math.max(1, options.concurrency ?? this.concurrency),
      maxRetries: Math.max(0, options.maxRetries ?? this.maxRetries),
      transferFn: options.transferFn as TransferFn,
      mergeFn: options.mergeFn as MergeFn | undefined,
      createdAt: Date.now(),
      completionTimestamps: [],
      runningChunkCount: 0,
      autoStart: options.autoStart ?? true,
      metadata: options.metadata ? { ...options.metadata } : undefined,
    }

    this.tasks.set(id, task)
    this.emit('task-created', this.cloneTaskSnapshot(task))
    this.persistTask(task)

    if (task.autoStart) {
      this.start(id)
    }

    return id
  }

  /** 开始或恢复传输。 */
  start(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) return false
    if (task.status !== 'pending' && task.status !== 'paused') return false

    task.status = 'running'
    task.startedAt ??= Date.now()
    task.controller = new AbortController()

    this.emit('task-started', this.cloneTaskSnapshot(task))
    this.persistTask(task)
    this.scheduleChunks(task)

    return true
  }

  /** 暂停传输。 */
  pause(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task || task.status !== 'running') return false

    task.controller?.abort()
    task.controller = undefined
    task.status = 'paused'

    // 将正在传输的分片回退为 pending
    for (const chunk of task.chunks) {
      if (chunk.status === 'transferring') {
        chunk.status = 'pending'
      }
    }
    task.runningChunkCount = 0

    this.emit('task-paused', this.cloneTaskSnapshot(task))
    this.persistTask(task)

    return true
  }

  /** 取消传输。 */
  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) return false
    if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
      return false
    }

    task.controller?.abort()
    task.controller = undefined
    task.status = 'cancelled'
    task.finishedAt = Date.now()
    task.runningChunkCount = 0

    this.emit('task-cancelled', this.cloneTaskSnapshot(task))

    if (this.storage) {
      void this.storage.remove(taskId).catch(err => {
        // eslint-disable-next-line no-console
        console.error('[ResumableTransfer][storage] remove failed:', err)
      })
    }

    return true
  }

  /** 重试失败任务（保留已完成分片）。 */
  retry(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task || task.status !== 'failed') return false

    // 只重置失败的分片
    for (const chunk of task.chunks) {
      if (chunk.status === 'failed') {
        chunk.status = 'pending'
        chunk.attempts = 0
        chunk.error = undefined
        chunk.result = undefined
      }
    }

    task.status = 'pending'
    task.error = undefined
    task.finishedAt = undefined
    task.completionTimestamps = []
    task.runningChunkCount = 0

    this.emit('task-created', this.cloneTaskSnapshot(task))
    this.start(taskId)

    return true
  }

  /** 获取任务快照。 */
  getTask(taskId: string): TransferTaskSnapshot | undefined {
    const task = this.tasks.get(taskId)
    return task ? this.cloneTaskSnapshot(task) : undefined
  }

  /** 获取全部任务快照（按创建时间排序）。 */
  getAllTasks(): TransferTaskSnapshot[] {
    return [...this.tasks.values()]
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(task => this.cloneTaskSnapshot(task))
  }

  /** 移除已结束的任务（running/pending 状态不允许移除）。 */
  removeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) return false
    if (task.status === 'running' || task.status === 'pending') return false

    this.tasks.delete(taskId)

    if (this.storage) {
      void this.storage.remove(taskId).catch(err => {
        // eslint-disable-next-line no-console
        console.error('[ResumableTransfer][storage] remove failed:', err)
      })
    }

    return true
  }

  /** 从持久化存储恢复单个任务（恢复后状态为 paused，需手动调用 start）。 */
  async restoreTask<TChunk, TChunkResult = unknown, TResult = unknown>(
    taskId: string,
    transferFn: TransferFn<TChunk, TChunkResult>,
    mergeFn?: MergeFn<TChunkResult, TResult>,
  ): Promise<boolean> {
    if (!this.storage) return false

    const snapshot = await this.storage.load(taskId)
    if (!snapshot) return false
    if (this.tasks.has(taskId)) return false

    let completedCount = 0
    for (const c of snapshot.chunks) {
      if (c.status === 'completed') completedCount++
    }

    const task: InternalTaskRecord = {
      id: snapshot.id,
      name: snapshot.name,
      status: 'paused',
      chunks: snapshot.chunks.map(c => ({
        index: c.index,
        data: c.data,
        status: c.status === 'completed' ? 'completed' as ChunkStatus : 'pending' as ChunkStatus,
        result: undefined,
        error: undefined,
        attempts: c.attempts,
      })),
      completedCount,
      totalCount: snapshot.totalCount,
      concurrency: this.concurrency,
      maxRetries: this.maxRetries,
      transferFn: transferFn as TransferFn,
      mergeFn: mergeFn as MergeFn | undefined,
      createdAt: snapshot.createdAt,
      startedAt: snapshot.startedAt,
      metadata: snapshot.metadata ? { ...snapshot.metadata } : undefined,
      completionTimestamps: [],
      runningChunkCount: 0,
      autoStart: false,
    }

    this.tasks.set(taskId, task)
    this.emit('task-created', this.cloneTaskSnapshot(task))

    return true
  }

  /** 批量恢复任务。 */
  async restoreAllTasks(
    fnMap: Record<string, { transferFn: TransferFn; mergeFn?: MergeFn }>,
  ): Promise<string[]> {
    if (!this.storage) return []

    const snapshots = await this.storage.loadAll()
    const restoredIds: string[] = []

    for (const snapshot of snapshots) {
      const fns = fnMap[snapshot.id]
      if (!fns) continue
      const ok = await this.restoreTask(snapshot.id, fns.transferFn, fns.mergeFn)
      if (ok) restoredIds.push(snapshot.id)
    }

    return restoredIds
  }

  /** 订阅事件，返回取消订阅函数。 */
  on(
    eventName: ResumableTransferEventName,
    listener: ResumableTransferListener,
  ): () => void {
    const bucket = this.listeners.get(eventName) ?? new Set<ResumableTransferListener>()
    bucket.add(listener)
    this.listeners.set(eventName, bucket)

    return () => {
      const current = this.listeners.get(eventName)
      current?.delete(listener)
      if (current && current.size === 0) {
        this.listeners.delete(eventName)
      }
    }
  }

  /** 销毁实例，中止所有进行中的任务。 */
  destroy(): void {
    for (const task of this.tasks.values()) {
      task.controller?.abort()
    }
    this.tasks.clear()
    this.listeners.clear()
  }

  // ─── 私有方法 ──────────────────────────────────────────

  /** 调度分片传输。 */
  private scheduleChunks(task: InternalTaskRecord): void {
    if (task.status !== 'running') return

    const pendingChunks = task.chunks.filter(c => c.status === 'pending')

    while (task.runningChunkCount < task.concurrency && pendingChunks.length > 0) {
      const chunk = pendingChunks.shift()!
      chunk.status = 'transferring'
      task.runningChunkCount += 1
      void this.processChunk(task, chunk)
    }

    // 所有分片都处理完毕
    if (task.runningChunkCount === 0 && task.status === 'running') {
      const allCompleted = task.chunks.every(c => c.status === 'completed')
      if (allCompleted) {
        void this.finalizeTask(task)
      } else {
        const hasFailed = task.chunks.some(c => c.status === 'failed')
        if (hasFailed) {
          task.status = 'failed'
          task.finishedAt = Date.now()
          task.error = new Error('One or more chunks failed.')
          this.emit('task-failed', this.cloneTaskSnapshot(task))
          this.persistTask(task)
        }
      }
    }
  }

  /** 处理单个分片（含重试逻辑）。 */
  private async processChunk(task: InternalTaskRecord, chunk: InternalChunkRecord): Promise<void> {
    chunk.attempts += 1

    try {
      const result = await task.transferFn({
        taskId: task.id,
        index: chunk.index,
        chunk: chunk.data,
        signal: task.controller!.signal,
      })

      chunk.status = 'completed'
      chunk.result = result
      chunk.error = undefined
      task.completedCount += 1
      task.completionTimestamps.push(Date.now())

      this.emit('chunk-success', this.cloneTaskSnapshot(task), { chunkIndex: chunk.index })
      this.emit('progress', this.cloneTaskSnapshot(task))
      this.persistTask(task)
    } catch (error) {
      // 被中止（暂停 / 取消），回退分片状态并退出
      if (task.status !== 'running') {
        if (chunk.status === 'transferring') {
          chunk.status = 'pending'
        }
        task.runningChunkCount = Math.max(0, task.runningChunkCount - 1)
        return
      }

      chunk.error = error

      if (this.autoRetry && chunk.attempts < task.maxRetries) {
        chunk.status = 'pending'
        this.emit('chunk-error', this.cloneTaskSnapshot(task), {
          chunkIndex: chunk.index,
          error,
        })

        try {
          await delayMs(this.retryDelay(chunk.attempts), task.controller?.signal)
        } catch {
          // 等待期间被中止
          task.runningChunkCount = Math.max(0, task.runningChunkCount - 1)
          return
        }

        // 延迟后再次检查任务状态
        if (task.status !== 'running') {
          task.runningChunkCount = Math.max(0, task.runningChunkCount - 1)
          return
        }
      } else {
        chunk.status = 'failed'
        this.emit('chunk-error', this.cloneTaskSnapshot(task), {
          chunkIndex: chunk.index,
          error,
        })
      }

      this.emit('progress', this.cloneTaskSnapshot(task))
      this.persistTask(task)
    }

    task.runningChunkCount = Math.max(0, task.runningChunkCount - 1)
    this.scheduleChunks(task)
  }

  /** 所有分片完成后的收尾工作。 */
  private async finalizeTask(task: InternalTaskRecord): Promise<void> {
    if (task.mergeFn) {
      try {
        const chunkResults = task.chunks
          .sort((a, b) => a.index - b.index)
          .map(c => c.result)
        task.result = await task.mergeFn(chunkResults)
      } catch (error) {
        task.status = 'failed'
        task.error = error
        task.finishedAt = Date.now()
        this.emit('task-failed', this.cloneTaskSnapshot(task))
        this.persistTask(task)
        return
      }
    }

    task.status = 'completed'
    task.finishedAt = Date.now()
    this.emit('task-completed', this.cloneTaskSnapshot(task))
    this.persistTask(task)
  }

  /** 发送事件（listener 错误隔离）。 */
  private emit(
    eventName: ResumableTransferEventName,
    snapshot: TransferTaskSnapshot,
    extra?: ChunkEventExtra,
  ): void {
    const bucket = this.listeners.get(eventName)
    if (!bucket || bucket.size === 0) return
    for (const listener of bucket) {
      try {
        listener(snapshot, extra)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[ResumableTransfer][listener error]', eventName, error)
      }
    }
  }

  /** 克隆任务快照（防御性拷贝）。 */
  private cloneTaskSnapshot(task: InternalTaskRecord): TransferTaskSnapshot {
    return {
      id: task.id,
      name: task.name,
      status: task.status,
      chunks: task.chunks.map<ChunkSnapshot>(c => ({
        index: c.index,
        data: c.data,
        status: c.status,
        result: c.result,
        error: c.error,
        attempts: c.attempts,
      })),
      completedCount: task.completedCount,
      totalCount: task.totalCount,
      progress: this.computeProgress(task),
      speed: this.computeSpeed(task),
      eta: this.computeEta(task),
      result: task.result,
      error: task.error,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      finishedAt: task.finishedAt,
      metadata: task.metadata ? { ...task.metadata } : undefined,
    }
  }

  /** 持久化任务（fire-and-forget）。 */
  private persistTask(task: InternalTaskRecord): void {
    if (!this.storage) return
    void this.storage.save(task.id, this.toPersistSnapshot(task)).catch(error => {
      // eslint-disable-next-line no-console
      console.error('[ResumableTransfer][storage error]', error)
    })
  }

  /** 转换为可序列化的持久化快照。 */
  private toPersistSnapshot(task: InternalTaskRecord): TransferTaskPersistSnapshot {
    return {
      id: task.id,
      name: task.name,
      status: task.status,
      chunks: task.chunks.map(c => ({
        index: c.index,
        data: c.data,
        // transferring 分片持久化为 pending（页面刷新后需重新传输）
        status: c.status === 'transferring' ? 'pending' : c.status,
        attempts: c.attempts,
      })),
      completedCount: task.completedCount,
      totalCount: task.totalCount,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      metadata: task.metadata ? { ...task.metadata } : undefined,
    }
  }

  // ─── 速率 / ETA 计算 ──────────────────────────────────

  private computeProgress(task: InternalTaskRecord): number {
    if (task.totalCount === 0) return 1
    return task.completedCount / task.totalCount
  }

  /** 基于最近 20 个分片完成时间戳的滚动窗口速率（分片/秒）。 */
  private computeSpeed(task: InternalTaskRecord): number {
    const ts = task.completionTimestamps
    if (ts.length < 2) return 0
    const window = ts.length > 20 ? ts.slice(-20) : ts
    const elapsed = window[window.length - 1] - window[0]
    if (elapsed <= 0) return 0
    return ((window.length - 1) / elapsed) * 1000
  }

  /** 预估剩余时间（毫秒）。 */
  private computeEta(task: InternalTaskRecord): number {
    const speed = this.computeSpeed(task)
    if (speed <= 0) return 0
    const remaining = task.totalCount - task.completedCount
    return Math.round((remaining / speed) * 1000)
  }
}
