/**
 * 重试工具。
 *
 * 提供通用重试逻辑，支持指数退避、可中断。
 *
 * @example
 * ```typescript
 * // 基础重试
 * await retry(() => fetch('/api/data'))
 *
 * // 自定义配置
 * await retry(() => fetch('/api/data'), {
 *   maxAttempts: 3,
 *   delay: 1000,
 *   backoff: 'exponential',
 *   onRetry: (error, attempt) => {
 *     console.log(`第 ${attempt} 次失败:`, error)
 *   }
 * })
 *
 * // 带取消信号
 * const controller = new AbortController()
 * await retry(() => fetch('/api/data', { signal: controller.signal }), {
 *   signal: controller.signal
 * })
 *
 * // 发送取消信号
 * controller.abort()
 * ```
 */

/**
 * 重试配置。
 */
export interface RetryOptions {
  /** 最大重试次数，默认 3。 */
  maxAttempts?: number
  /** 基础延迟毫秒，默认 1000。 */
  delay?: number
  /** 退避策略。 */
  backoff?: 'fixed' | 'exponential' | 'linear'
  /** 中断信号。 */
  signal?: AbortSignal
  /**
   * 重试前回调。
   * @param error 上一次错误。
   * @param attempt 当前尝试次数（从 1 开始）。
   * @returns 返回 true 可中断后续重试。
   */
  onRetry?: (error: unknown, attempt: number) => boolean | void
  /** 判定是否可重试的错误。默认始终重试。 */
  shouldRetry?: (error: unknown) => boolean
}

/**
 * 重试失败错误。
 */
export class RetriesExhaustedError extends Error {
  constructor(
    public readonly attempts: number,
    public readonly lastError: unknown,
  ) {
    super(`All ${attempts} attempts failed`)
    this.name = 'RetriesExhaustedError'
  }
}

/**
 * 取消错误类（delayMs / retry 在 signal 中断时使用）。
 */
class CancellationError extends Error {
  name = 'CancellationError'
  constructor() {
    super('Operation was cancelled')
  }
}

/**
 * 固定延迟毫秒后 resolve，与 `retry` 重试间隔等待逻辑一致；`signal` abort 时 reject。
 * @param ms 毫秒，小于 0 时按 0 处理。
 * @param signal 可选中断信号。
 */
export function delayMs(ms: number, signal?: AbortSignal): Promise<void> {
  const n = Math.max(0, ms)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, n)
    if (!signal) {
      return
    }
    if (signal.aborted) {
      clearTimeout(timer)
      reject(new CancellationError())
      return
    }
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new CancellationError())
    }, { once: true })
  })
}

/**
 * 计算延迟时间。
 * @param attempt 当前次数。
 * @param baseDelay 基础延迟。
 * @param backoff 退避策略。
 */
function computeDelay(attempt: number, baseDelay: number, backoff: NonNullable<RetryOptions['backoff']>): number {
  switch (backoff) {
    case 'fixed':
      return baseDelay
    case 'linear':
      return baseDelay * attempt
    case 'exponential':
      return baseDelay * Math.pow(2, attempt - 1)
    default:
      return baseDelay
  }
}

/**
 * 执行带重试的异步操作。
 * @param fn 要执行的异步函数。
 * @param options 重试配置。
 * @returns 执行结果。
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    delay: baseDelay = 1000,
    backoff = 'exponential',
    signal,
    onRetry,
    shouldRetry = () => true,
  } = options

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    // 检查中断信号
    if (signal?.aborted) {
      throw new CancellationError()
    }

    try {
      return await fn()
    }
    catch (error) {
      lastError = error

      // 检查是否应该重试
      if (attempt >= maxAttempts || !shouldRetry(error)) {
        throw new RetriesExhaustedError(attempt, error)
      }

      // 调用重试回调，可通过返回 true 中断
      if (onRetry) {
        const shouldStop = onRetry(error, attempt)
        if (shouldStop === true) {
          throw new RetriesExhaustedError(attempt, error)
        }
      }

      // 计算延迟
      const waitDuration = computeDelay(attempt, baseDelay, backoff)

      // 等待延迟
      await delayMs(waitDuration, signal)
    }
  }

  throw new RetriesExhaustedError(maxAttempts, lastError)
}

/**
 * 重试直到条件满足。
 * @param fn 要执行的异步函数。
 * @param condition 条件判断函数。
 * @param options 重试配置。
 */
export async function retryUntil<T>(
  fn: () => Promise<T>,
  condition: (value: T) => boolean,
  options: RetryOptions & { timeout?: number } = {},
): Promise<T> {
  const { timeout: timeoutMs, ...retryOptions } = options
  const startTime = Date.now()

  while (true) {
    if (timeoutMs && Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout after ${timeoutMs}ms waiting for condition`)
    }

    const value = await retry(fn, retryOptions)
    if (condition(value)) {
      return value
    }

    const pauseMs = retryOptions.delay ?? 1000
    await delayMs(pauseMs, retryOptions.signal)
  }
}
