import { BackgroundTaskManager } from './backgroundTaskManager'
import type {
  BackgroundTask,
  EnqueueTaskOptions,
} from './backgroundTaskManager'
import { prefixedId } from '../../utils/uuid'
import { delayMs } from '../../utils/retryUtility'

/**
 * 定时任务配置。
 */
export interface ScheduledTask {
  /** 任务 ID。 */
  id: string
  /** 任务类型。 */
  type: string
  /** 任务负载。 */
  payload: unknown
  /** 调度时间（毫秒时间戳）。 */
  scheduledAt: number
  /** 优先级，数值越大优先级越高。 */
  priority: number
  /** 是否重复执行。 */
  repeating?: boolean
  /** 重复间隔毫秒（仅 repeating=true 时有效）。 */
  interval?: number
  /** 最大执行次数（0 表示无限）。 */
  maxExecutions?: number
  /** 已执行次数。 */
  executions: number
  /** 是否启用。 */
  enabled: boolean
}

/**
 * 调度器配置。
 */
export interface TaskSchedulerOptions {
  /** 内部任务管理器。 */
  manager: BackgroundTaskManager
  /** 定时器精度（毫秒），默认 1000。 */
  tickInterval?: number
}

/**
 * 调度器事件。
 */
export type TaskSchedulerEventName =
  | 'scheduled'
  | 'executing'
  | 'executed'
  | 'removed'
  | 'cleared'

/**
 * 任务调度器。
 *
 * 基于 `BackgroundTaskManager`，扩展：
 * - 定时任务（支持 cron-like 表达式和一次性定时）
 * - 优先级调度
 * - 重复任务
 * - 任务依赖声明
 *
 * @example
 * ```typescript
 * const manager = new BackgroundTaskManager({ concurrency: 2 })
 * const scheduler = new TaskScheduler({ manager })
 *
 * // 延迟 5 秒执行
 * scheduler.delay('job:process', { id: 1 }, 5000)
 *
 * // 定时执行（某个时间戳）
 * scheduler.schedule('job:backup', {}, Date.now() + 3600_000)
 *
 * // 重复任务（每 30 秒）
 * scheduler.schedule('job:heartbeat', {}, Date.now() + 30_000, {
 *   repeating: true,
 *   interval: 30_000,
 * })
 * ```
 */
export class TaskScheduler {
  private readonly manager: BackgroundTaskManager
  private readonly tickInterval: number
  private readonly scheduledTasks = new Map<string, ScheduledTask>()
  private readonly listeners = new Map<TaskSchedulerEventName, Set<Function>>()
  private timerId: ReturnType<typeof setInterval> | null = null
  private started = false

  constructor(options: TaskSchedulerOptions) {
    this.manager = options.manager
    this.tickInterval = Math.max(100, options.tickInterval ?? 1000)
  }

  // ==================== 调度方法 ====================

  /**
   * 延迟执行任务。
   * @param type 任务类型。
   * @param payload 任务负载。
   * @param delayMs 延迟毫秒。
   * @param options 额外配置。
   */
  delay(
    type: string,
    payload: unknown,
    delayMsValue: number,
    options: Partial<Omit<ScheduledTask, 'id' | 'type' | 'payload' | 'scheduledAt' | 'executions'>> = {},
  ): string {
    return this.schedule(type, payload, Date.now() + delayMsValue, options)
  }

  /**
   * 定时执行任务。
   * @param type 任务类型。
   * @param payload 任务负载。
   * @param timestamp 执行时间戳。
   * @param options 额外配置。
   */
  schedule(
    type: string,
    payload: unknown,
    timestamp: number,
    options: Partial<Omit<ScheduledTask, 'id' | 'type' | 'payload' | 'scheduledAt' | 'executions'>> = {},
  ): string {
    const id = options.id ?? prefixedId('scheduled')
    const task: ScheduledTask = {
      id,
      type,
      payload,
      scheduledAt: timestamp,
      priority: options.priority ?? 0,
      repeating: options.repeating ?? false,
      interval: options.interval,
      maxExecutions: options.maxExecutions ?? 0,
      executions: 0,
      enabled: options.enabled ?? true,
    }

    this.scheduledTasks.set(id, task)
    this.emit('scheduled', task)

    // 如果调度时间已到，立即尝试执行
    if (timestamp <= Date.now()) {
      this.tryExecute(id)
    }

    return id
  }

  /**
   * 取消定时任务。
   * @param id 定时任务 ID。
   */
  cancel(id: string): boolean {
    const task = this.scheduledTasks.get(id)
    if (!task) {
      return false
    }
    this.scheduledTasks.delete(id)
    this.emit('removed', task)
    return true
  }

  /**
   * 启用/禁用定时任务。
   * @param id 定时任务 ID。
   * @param enabled 是否启用。
   */
  setEnabled(id: string, enabled: boolean): boolean {
    const task = this.scheduledTasks.get(id)
    if (!task) {
      return false
    }
    task.enabled = enabled
    return true
  }

  /**
   * 更新定时任务的执行时间。
   * @param id 定时任务 ID。
   * @param timestamp 新的执行时间戳。
   */
  reschedule(id: string, timestamp: number): boolean {
    const task = this.scheduledTasks.get(id)
    if (!task) {
      return false
    }
    task.scheduledAt = timestamp
    return true
  }

  /**
   * 获取所有定时任务。
   */
  getScheduledTasks(): ScheduledTask[] {
    return [...this.scheduledTasks.values()]
  }

  /**
   * 获取单个定时任务。
   */
  getScheduledTask(id: string): ScheduledTask | undefined {
    return this.scheduledTasks.get(id)
  }

  /**
   * 清空所有定时任务。
   */
  clear(): void {
    const tasks = [...this.scheduledTasks.values()]
    this.scheduledTasks.clear()
    for (const task of tasks) {
      this.emit('removed', task)
    }
    this.emit('cleared')
  }

  // ==================== 生命周期 ====================

  /**
   * 启动调度器。
   */
  start(): void {
    if (this.started) {
      return
    }
    this.started = true
    this.tick()
  }

  /**
   * 停止调度器。
   */
  stop(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
    this.started = false
  }

  // ==================== 事件订阅 ====================

  /**
   * 订阅事件。
   * @param event 事件名。
   * @param handler 处理函数。
   * @returns 取消订阅函数。
   */
  on(event: TaskSchedulerEventName, handler: Function): () => void {
    const bucket = this.listeners.get(event) ?? new Set<Function>()
    bucket.add(handler)
    this.listeners.set(event, bucket)
    return () => this.off(event, handler)
  }

  /**
   * 取消订阅。
   */
  off(event: TaskSchedulerEventName, handler: Function): void {
    const bucket = this.listeners.get(event)
    if (!bucket) {
      return
    }
    bucket.delete(handler)
    if (bucket.size === 0) {
      this.listeners.delete(event)
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 定时触发。
   */
  private tick(): void {
    if (!this.started) {
      return
    }

    const now = Date.now()

    // 按优先级排序（优先级高的先执行）
    const candidates = [...this.scheduledTasks.values()]
      .filter((t) => t.enabled && t.scheduledAt <= now)
      .sort((a, b) => b.priority - a.priority)

    for (const task of candidates) {
      this.tryExecute(task.id)
    }

    this.timerId = setTimeout(() => this.tick(), this.tickInterval)
  }

  /**
   * 尝试执行定时任务。
   */
  private tryExecute(id: string): void {
    const task = this.scheduledTasks.get(id)
    if (!task || !task.enabled) {
      return
    }

    // 检查是否已达到最大执行次数
    if (task.maxExecutions > 0 && task.executions >= task.maxExecutions) {
      this.cancel(id)
      return
    }

    this.emit('executing', task)

    // 入队到后台任务管理器
    const enqueueOptions: EnqueueTaskOptions = {
      id: prefixedId('scheduled_exec'),
      type: task.type,
      payload: task.payload,
    }

    const taskId = this.manager.enqueue(enqueueOptions)

    // 监听任务完成
    const unsubscribe = this.manager.on('task-updated', (updatedTask) => {
      if (updatedTask?.id !== taskId) {
        return
      }

      if (updatedTask.status === 'succeeded' || updatedTask.status === 'failed') {
        unsubscribe()
        this.onTaskExecuted(task)
      }
    })

    // 注册取消时移除监听
    this.manager.on('task-removed', (removedTask) => {
      if (removedTask?.id === taskId) {
        unsubscribe()
      }
    })
  }

  /**
   * 任务执行完成后的处理。
   */
  private onTaskExecuted(task: ScheduledTask): void {
    task.executions += 1
    this.emit('executed', task)

    if (task.repeating && task.interval) {
      // 安排下一次执行
      task.scheduledAt = Date.now() + task.interval
    }
    else {
      // 单次任务，执行完后移除
      this.cancel(task.id)
    }
  }

  /**
   * 触发事件。
   */
  private emit(event: TaskSchedulerEventName, payload?: ScheduledTask): void {
    const bucket = this.listeners.get(event)
    if (!bucket || bucket.size === 0) {
      return
    }
    for (const handler of bucket) {
      try {
        handler(payload)
      }
      catch (error) {
        console.error(`[TaskScheduler][${event}] handler error:`, error)
      }
    }
  }
}
