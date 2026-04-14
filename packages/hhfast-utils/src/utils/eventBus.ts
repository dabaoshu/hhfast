/**
 * 事件总线。
 *
 * 提供应用内组件通信能力，支持任意两个模块之间的事件订阅与发布，
 * 从而实现解耦。
 *
 * @example
 * ```typescript
 * const bus = new EventBus()
 *
 * // 订阅
 * const unsubscribe = bus.on('user:login', (user) => {
 *   console.log('用户登录:', user)
 * })
 *
 * // 发布
 * bus.emit('user:login', { id: 1, name: '张三' })
 *
 * // 取消订阅
 * unsubscribe()
 * ```
 */
export class EventBus {
  private readonly listeners = new Map<string, Set<EventBusHandler>>()

  /**
   * 订阅事件。
   * @param event 事件名。
   * @param handler 处理函数。
   * @returns 取消订阅函数。
   */
  on<T = unknown>(event: string, handler: EventBusHandler<T>): () => void {
    const bucket = this.listeners.get(event) ?? new Set<EventBusHandler<T>>()
    bucket.add(handler as EventBusHandler<T>)
    this.listeners.set(event, bucket as Set<EventBusHandler>)
    return () => this.off(event, handler)
  }

  /**
   * 订阅一次性事件，触发后自动移除。
   * @param event 事件名。
   * @param handler 处理函数。
   */
  once<T = unknown>(event: string, handler: EventBusHandler<T>): void {
    const wrapped: EventBusHandler<T> = (payload) => {
      this.off(event, wrapped)
      handler(payload)
    }
    this.on(event, wrapped)
  }

  /**
   * 取消订阅。
   * @param event 事件名。
   * @param handler 处理函数。
   */
  off(event: string, handler: EventBusHandler): void {
    const bucket = this.listeners.get(event)
    if (!bucket) {
      return
    }
    bucket.delete(handler)
    if (bucket.size === 0) {
      this.listeners.delete(event)
    }
  }

  /**
   * 发布事件。
   * @param event 事件名。
   * @param payload 事件数据。
   */
  emit<T = unknown>(event: string, payload?: T): void {
    const bucket = this.listeners.get(event)
    if (!bucket || bucket.size === 0) {
      return
    }
    for (const handler of bucket) {
      try {
        handler(payload)
      }
      catch (error) {
        console.error(`[EventBus][${event}] handler error:`, error)
      }
    }
  }

  /**
   * 取消订阅所有事件。
   */
  clear(): void {
    this.listeners.clear()
  }

  /**
   * 获取已订阅的事件列表。
   */
  eventNames(): string[] {
    return [...this.listeners.keys()]
  }
}

type EventBusHandler<T = unknown> = (payload?: T) => void

/**
 * 全局事件总线实例。
 */
export const globalEventBus = new EventBus()
