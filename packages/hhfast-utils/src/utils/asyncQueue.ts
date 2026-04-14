/**
 * 异步任务队列。
 *
 * 支持带并发控制的异步任务排队执行，可用于批量接口调用、文件处理等场景。
 *
 * @example
 * ```typescript
 * const queue = new AsyncQueue<number>({ concurrency: 2 })
 *
 * // 添加任务
 * queue.enqueue(async () => {
 *   await delay(100)
 *   return 1
 * })
 *
 * // 批量添加
 * await queue.enqueueAll([
 *   async () => { await delay(50); return 2 },
 *   async () => { await delay(100); return 3 },
 * ])
 *
 * // 清空队列
 * queue.clear()
 * ```
 */
export class AsyncQueue<T> {
  private readonly tasks: Array<() => Promise<T>> = []
  private readonly concurrency: number
  private running = 0
  private readonly waiting: Array<{
    resolve: (value: T) => void
    reject: (error: unknown) => void
    task: () => Promise<T>
  }> = []

  /**
   * @param options 配置项。
   * @param options.concurrency 并发数，默认 1。
   */
  constructor(options: { concurrency?: number } = {}) {
    this.concurrency = Math.max(1, options.concurrency ?? 1)
  }

  /**
   * 入队一个异步任务。
   * @param task 任务函数。
   * @returns 返回任务结果。
   */
  enqueue(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.tasks.push(task)
      this.waiting.push({ resolve, reject, task })
      this.process()
    })
  }

  /**
   * 入队多个异步任务。
   * @param tasks 任务函数数组。
   * @returns 返回所有任务结果数组。
   */
  enqueueAll(tasks: Array<() => Promise<T>>): Promise<T[]> {
    return Promise.all(tasks.map((task) => this.enqueue(task)))
  }

  /**
   * 清空队列。
   */
  clear(): void {
    this.tasks.length = 0
    this.waiting.length = 0
  }

  /**
   * 获取当前排队数量。
   */
  get size(): number {
    return this.tasks.length
  }

  /**
   * 获取当前运行数量。
   */
  get runningCount(): number {
    return this.running
  }

  /**
   * 处理队列。
   */
  private process(): void {
    while (this.running < this.concurrency && this.waiting.length > 0) {
      const item = this.waiting.shift()
      if (!item) {
        break
      }
      const index = this.tasks.indexOf(item.task)
      if (index >= 0) {
        this.tasks.splice(index, 1)
      }
      this.running += 1
      item.task()
        .then(item.resolve)
        .catch(item.reject)
        .finally(() => {
          this.running -= 1
          this.process()
        })
    }
  }
}
