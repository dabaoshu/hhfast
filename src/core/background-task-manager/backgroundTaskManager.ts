/**
 * 后台任务状态。
 */
export type BackgroundTaskStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled'

/**
 * 任务执行函数上下文。
 */
export interface TaskExecuteContext<TPayload = unknown> {
  /** 任务 ID。 */
  id: string
  /** 任务类型。 */
  type: string
  /** 任务负载。 */
  payload: TPayload
  /** 取消信号。 */
  signal: AbortSignal
  /**
   * 更新任务进度，范围建议 0 - 1。
   * @param progress 进度值。
   * @param message 可选进度文案。
   */
  setProgress: (progress: number, message?: string) => void
}

/**
 * 任务执行器。
 */
export type TaskExecutor<TPayload = unknown, TResult = unknown> = (
  ctx: TaskExecuteContext<TPayload>,
) => Promise<TResult>

/**
 * 单个任务快照。
 */
export interface BackgroundTask<TPayload = unknown, TResult = unknown> {
  id: string
  type: string
  payload: TPayload
  status: BackgroundTaskStatus
  progress: number
  progressMessage?: string
  createdAt: number
  startedAt?: number
  finishedAt?: number
  attempts: number
  maxRetries: number
  result?: TResult
  error?: unknown
}

/**
 * 入队参数。
 */
export interface EnqueueTaskOptions<TPayload = unknown> {
  /** 指定任务 ID，不传则自动生成。 */
  id?: string
  /** 任务类型。 */
  type: string
  /** 任务负载。 */
  payload: TPayload
  /** 单任务级重试次数，不传使用全局默认。 */
  maxRetries?: number
}

/**
 * 管理器配置。
 */
export interface BackgroundTaskManagerOptions {
  /** 并发执行数，默认 2。 */
  concurrency?: number
  /** 默认重试次数，默认 0。 */
  defaultMaxRetries?: number
  /**
   * 重试间隔策略。
   * @param attempt 第几次重试（从 1 开始）。
   * @returns 间隔毫秒。
   */
  retryDelay?: (attempt: number) => number
  /** 是否在入队后自动调度，默认 true。 */
  autoStart?: boolean
  /**
   * 插件列表，用于扩展日志、监控等横切能力。
   */
  plugins?: BackgroundTaskManagerPlugin[]
}

/**
 * 后台任务管理器插件。
 *
 * 插件只接收任务只读快照，不允许直接修改内部状态。
 */
export interface BackgroundTaskManagerPlugin {
  /**
   * 管理器初始化完成时触发。
   * @param manager 管理器实例。
   */
  onInit?: (manager: BackgroundTaskManager) => void

  /**
   * 新任务创建并入队后触发。
   * @param task 任务快照。
   */
  onTaskAdded?: (task: BackgroundTask) => void

  /**
   * 任务状态或进度发生变化时触发。
   * @param prev 上一次快照。
   * @param next 最新快照。
   */
  onTaskUpdated?: (prev: BackgroundTask, next: BackgroundTask) => void

  /**
   * 任务被删除或被清理时触发。
   * @param task 删除前最后一次快照。
   */
  onTaskRemoved?: (task: BackgroundTask) => void

  /**
   * 队列整体状态变化时触发（如入队、出队、重试入队等）。
   * @param tasks 当前任务快照列表。
   */
  onQueueChanged?: (tasks: ReadonlyArray<BackgroundTask>) => void

  /**
   * 当前无排队任务且无运行中任务时触发。
   */
  onIdle?: () => void
}

/**
 * 事件名称。
 */
export type BackgroundTaskManagerEventName =
  | 'task-added'
  | 'task-updated'
  | 'task-removed'
  | 'queue-changed'
  | 'idle'

/**
 * 事件监听回调。
 */
export type BackgroundTaskManagerListener = (task?: BackgroundTask) => void

interface InternalTaskRecord extends BackgroundTask {
  controller?: AbortController
}

const defaultRetryDelay = (attempt: number): number =>
  Math.min(30000, 500 * Math.pow(2, Math.max(0, attempt - 1)))

const createTaskId = (): string => {
  const random = Math.random().toString(36).slice(2, 8)
  return `task_${Date.now()}_${random}`
}

/**
 * 通用后台任务管理器。
 *
 * 特点：
 * - 框架无关，仅依赖 TS/JS 运行时；
 * - 支持任务类型注册、入队、并发调度；
 * - 支持进度上报、失败重试、取消与订阅事件。
 */
export class BackgroundTaskManager {
  private readonly handlers = new Map<string, TaskExecutor>()
  private readonly tasks = new Map<string, InternalTaskRecord>()
  private readonly queue: string[] = []
  private readonly listeners = new Map<
    BackgroundTaskManagerEventName,
    Set<BackgroundTaskManagerListener>
  >()
  private readonly concurrency: number
  private readonly defaultMaxRetries: number
  private readonly retryDelay: (attempt: number) => number
  private readonly autoStart: boolean
  private readonly plugins: BackgroundTaskManagerPlugin[]

  private runningCount = 0
  private paused = false

  /**
   * @param options 管理器配置。
   */
  constructor(options: BackgroundTaskManagerOptions = {}) {
    this.concurrency = Math.max(1, options.concurrency ?? 2)
    this.defaultMaxRetries = Math.max(0, options.defaultMaxRetries ?? 0)
    this.retryDelay = options.retryDelay ?? defaultRetryDelay
    this.autoStart = options.autoStart ?? true
    this.plugins = options.plugins?.slice() ?? []

    this.safeCallPlugins('onInit', this)
  }

  /**
   * 安全调用插件钩子，确保单个插件报错不会影响核心流程。
   * @param hook 钩子名称。
   * @param args 参数列表。
   */
  private safeCallPlugins(hook: keyof BackgroundTaskManagerPlugin, ...args: unknown[]): void {
    if (this.plugins.length === 0) {
      return
    }
    for (const plugin of this.plugins) {
      const fn = plugin[hook]
      if (typeof fn !== 'function') {
        continue
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fn as any)(...args)
      }
      catch (error) {
        // 插件错误仅记录，不中断任务调度。
        // eslint-disable-next-line no-console
        console.error('[BackgroundTaskManager][plugin error]', hook, error)
      }
    }
  }

  /**
   * 注册任务类型处理器。
   * @param type 任务类型。
   * @param handler 执行器。
   */
  register<TPayload = unknown, TResult = unknown>(
    type: string,
    handler: TaskExecutor<TPayload, TResult>,
  ): void {
    this.handlers.set(type, handler as TaskExecutor)
  }

  /**
   * 取消注册任务类型。
   * @param type 任务类型。
   */
  unregister(type: string): void {
    this.handlers.delete(type)
  }

  /**
   * 入队一个新任务。
   * @param options 入队参数。
   * @returns 任务 ID。
   */
  enqueue<TPayload = unknown>(options: EnqueueTaskOptions<TPayload>): string {
    const id = options.id ?? createTaskId()
    if (this.tasks.has(id)) {
      throw new Error(`Task with id "${id}" already exists.`)
    }
    if (!this.handlers.has(options.type)) {
      throw new Error(`No handler registered for task type "${options.type}".`)
    }

    const now = Date.now()
    const task: InternalTaskRecord = {
      id,
      type: options.type,
      payload: options.payload,
      status: 'pending',
      progress: 0,
      createdAt: now,
      attempts: 0,
      maxRetries: Math.max(0, options.maxRetries ?? this.defaultMaxRetries),
    }

    this.tasks.set(id, task)
    this.queue.push(id)

    const snapshot = this.cloneTask(task)
    this.emit('task-added', snapshot)
    this.safeCallPlugins('onTaskAdded', snapshot)
    this.emit('queue-changed')
    this.safeCallPlugins('onQueueChanged', this.getTasks())

    if (this.autoStart) {
      this.schedule()
    }

    return id
  }

  /**
   * 暂停调度（不影响已运行任务）。
   */
  pause(): void {
    this.paused = true
  }

  /**
   * 恢复调度。
   */
  resume(): void {
    if (!this.paused) {
      return
    }
    this.paused = false
    this.schedule()
  }

  /**
   * 主动触发调度。
   */
  start(): void {
    this.paused = false
    this.schedule()
  }

  /**
   * 取消指定任务。
   * @param id 任务 ID。
   * @returns 是否取消成功。
   */
  cancel(id: string): boolean {
    const task = this.tasks.get(id)
    if (!task) {
      return false
    }
    if (task.status === 'succeeded' || task.status === 'failed' || task.status === 'cancelled') {
      return false
    }

    task.controller?.abort()

    if (task.status === 'pending') {
      this.removeFromQueue(id)
      const prev = this.cloneTask(task)
      task.status = 'cancelled'
      task.finishedAt = Date.now()
      const next = this.cloneTask(task)
      this.safeCallPlugins('onTaskUpdated', prev, next)
      this.emit('task-updated', next)
      this.emit('queue-changed')
      this.safeCallPlugins('onQueueChanged', this.getTasks())
      this.emitIdleIfNeeded()
    }

    return true
  }

  /**
   * 重试已失败任务。
   * @param id 任务 ID。
   * @returns 是否已重入队列。
   */
  retry(id: string): boolean {
    const task = this.tasks.get(id)
    if (!task || task.status !== 'failed') {
      return false
    }
    task.status = 'pending'
    const prev = this.cloneTask(task)
    task.error = undefined
    task.progress = 0
    task.progressMessage = undefined
    task.startedAt = undefined
    task.finishedAt = undefined
    this.queue.push(id)

    const next = this.cloneTask(task)
    this.safeCallPlugins('onTaskUpdated', prev, next)
    this.emit('task-updated', next)
    this.emit('queue-changed')
    this.safeCallPlugins('onQueueChanged', this.getTasks())

    if (this.autoStart && !this.paused) {
      this.schedule()
    }

    return true
  }

  /**
   * 删除已终态任务（成功、失败、取消）。
   * @param id 任务 ID。
   * @returns 是否删除成功。
   */
  remove(id: string): boolean {
    const task = this.tasks.get(id)
    if (!task) {
      return false
    }
    if (task.status === 'running' || task.status === 'pending') {
      return false
    }
    const snapshot = this.cloneTask(task)
    this.tasks.delete(id)
    this.emit('task-removed', snapshot)
    this.safeCallPlugins('onTaskRemoved', snapshot)
    return true
  }

  /**
   * 批量清理终态任务。
   * @returns 清理数量。
   */
  clearFinished(): number {
    let count = 0
    for (const [id, task] of this.tasks) {
      if (task.status === 'succeeded' || task.status === 'failed' || task.status === 'cancelled') {
        const snapshot = this.cloneTask(task)
        this.tasks.delete(id)
        count += 1
        this.emit('task-removed', snapshot)
        this.safeCallPlugins('onTaskRemoved', snapshot)
      }
    }
    return count
  }

  /**
   * 查询单任务快照。
   * @param id 任务 ID。
   */
  getTask(id: string): BackgroundTask | undefined {
    const task = this.tasks.get(id)
    return task ? this.cloneTask(task) : undefined
  }

  /**
   * 查询所有任务快照（按创建顺序）。
   */
  getTasks(): BackgroundTask[] {
    return [...this.tasks.values()]
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((task) => this.cloneTask(task))
  }

  /**
   * 查询当前是否空闲（无待执行且无运行中任务）。
   */
  isIdle(): boolean {
    return this.runningCount === 0 && this.queue.length === 0
  }

  /**
   * 订阅事件。
   * @param eventName 事件名。
   * @param listener 监听器。
   * @returns 取消订阅函数。
   */
  on(
    eventName: BackgroundTaskManagerEventName,
    listener: BackgroundTaskManagerListener,
  ): () => void {
    const bucket = this.listeners.get(eventName) ?? new Set<BackgroundTaskManagerListener>()
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

  /**
   * 执行调度循环。
   */
  private schedule(): void {
    if (this.paused) {
      return
    }
    while (this.runningCount < this.concurrency && this.queue.length > 0) {
      const id = this.queue.shift()
      if (!id) {
        break
      }
      const task = this.tasks.get(id)
      if (!task || task.status !== 'pending') {
        continue
      }
      void this.runTask(task)
    }
    this.emit('queue-changed')
    this.safeCallPlugins('onQueueChanged', this.getTasks())
    this.emitIdleIfNeeded()
  }

  /**
   * 执行单任务。
   * @param task 任务记录。
   */
  private async runTask(task: InternalTaskRecord): Promise<void> {
    const handler = this.handlers.get(task.type)
    if (!handler) {
      const prev = this.cloneTask(task)
      task.status = 'failed'
      task.error = new Error(`No handler registered for task type "${task.type}".`)
      task.finishedAt = Date.now()
      const next = this.cloneTask(task)
      this.safeCallPlugins('onTaskUpdated', prev, next)
      this.emit('task-updated', next)
      return
    }

    const prevStart = this.cloneTask(task)
    task.status = 'running'
    task.startedAt = Date.now()
    task.finishedAt = undefined
    task.error = undefined
    task.controller = new AbortController()
    this.runningCount += 1
    const nextStart = this.cloneTask(task)
    this.safeCallPlugins('onTaskUpdated', prevStart, nextStart)
    this.emit('task-updated', nextStart)

    try {
      task.attempts += 1
      const result = await handler({
        id: task.id,
        type: task.type,
        payload: task.payload,
        signal: task.controller.signal,
        setProgress: (progress, message) => {
          const prev = this.cloneTask(task)
          const safe = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0
          task.progress = safe
          task.progressMessage = message
          const next = this.cloneTask(task)
          this.safeCallPlugins('onTaskUpdated', prev, next)
          this.emit('task-updated', next)
        },
      })

      const prev = this.cloneTask(task)
      task.result = result
      task.status = 'succeeded'
      task.progress = 1
      task.finishedAt = Date.now()
      const next = this.cloneTask(task)
      this.safeCallPlugins('onTaskUpdated', prev, next)
      this.emit('task-updated', next)
    }
    catch (error) {
      const prev = this.cloneTask(task)
      const isCancelled = task.controller.signal.aborted
      if (isCancelled) {
        task.status = 'cancelled'
        task.error = undefined
      }
      else {
        task.error = error
        const canRetry = task.attempts <= task.maxRetries
        if (canRetry) {
          task.status = 'pending'
          const delay = this.retryDelay(task.attempts)
          const nextPending = this.cloneTask(task)
          this.safeCallPlugins('onTaskUpdated', prev, nextPending)
          this.emit('task-updated', nextPending)
          setTimeout(() => {
            const latest = this.tasks.get(task.id)
            if (!latest || latest.status !== 'pending') {
              return
            }
            this.queue.push(task.id)
            this.emit('queue-changed')
            this.safeCallPlugins('onQueueChanged', this.getTasks())
            this.schedule()
          }, Math.max(0, delay))
          return
        }
        task.status = 'failed'
      }
      task.finishedAt = Date.now()
      const next = this.cloneTask(task)
      this.safeCallPlugins('onTaskUpdated', prev, next)
      this.emit('task-updated', next)
    }
    finally {
      task.controller = undefined
      this.runningCount = Math.max(0, this.runningCount - 1)
      this.schedule()
    }
  }

  /**
   * 从队列中移除任务。
   * @param id 任务 ID。
   */
  private removeFromQueue(id: string): void {
    const index = this.queue.indexOf(id)
    if (index >= 0) {
      this.queue.splice(index, 1)
    }
  }

  /**
   * 触发事件。
   * @param eventName 事件名。
   * @param task 任务快照。
   */
  private emit(eventName: BackgroundTaskManagerEventName, task?: BackgroundTask): void {
    const bucket = this.listeners.get(eventName)
    if (!bucket || bucket.size === 0) {
      return
    }
    for (const listener of bucket) {
      listener(task)
    }
  }

  /**
   * 仅在空闲时触发 idle 事件。
   */
  private emitIdleIfNeeded(): void {
    if (this.isIdle()) {
      this.emit('idle')
      this.safeCallPlugins('onIdle')
    }
  }

  /**
   * 克隆任务快照，避免外部篡改内部状态。
   * @param task 内部任务。
   */
  private cloneTask(task: InternalTaskRecord): BackgroundTask {
    return {
      id: task.id,
      type: task.type,
      payload: task.payload,
      status: task.status,
      progress: task.progress,
      progressMessage: task.progressMessage,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      finishedAt: task.finishedAt,
      attempts: task.attempts,
      maxRetries: task.maxRetries,
      result: task.result,
      error: task.error,
    }
  }
}

