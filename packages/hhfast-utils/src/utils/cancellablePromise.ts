/**
 * 可取消 Promise 工具。
 *
 * 为普通 Promise 添加取消能力，基于 AbortController 实现。
 *
 * @example
 * ```typescript
 * const { promise, cancel } = withCancellation(
 *   fetch('/api/data')
 * )
 *
 * // 取消请求
 * cancel()
 *
 * // 等待结果
 * try {
 *   const data = await promise
 * } catch (e) {
 *   if (isCanceledError(e)) {
 *     console.log('请求已取消')
 *   }
 * }
 * ```
 */

/**
 * 取消错误类型。
 */
export class CancellationError extends Error {
  readonly name = 'CancellationError'
  constructor() {
    super('Promise was cancelled')
  }
}

/**
 * 判断是否为取消错误。
 * @param error 错误对象。
 */
export function isCanceledError(error: unknown): boolean {
  return error instanceof CancellationError
}

/**
 * 为 Promise 添加取消能力。
 * @param promise 原始 Promise。
 * @returns 包含可取消 Promise 和取消函数的对象。
 */
export function withCancellation<T>(
  promise: Promise<T>,
): {
  promise: Promise<T>
  cancel: (reason?: string) => void
} {
  let cancelFn: ((reason?: string) => void) | null = null

  const wrapped = new Promise<T>((resolve, reject) => {
    const abortController = new AbortController()

    cancelFn = (reason?: string) => {
      abortController.abort()
      reject(new CancellationError())
    }

    promise
      .then((value) => {
        if (!abortController.signal.aborted) {
          resolve(value)
        }
      })
      .catch((error) => {
        if (!abortController.signal.aborted) {
          reject(error)
        }
      })
  })

  return {
    promise: wrapped,
    cancel: cancelFn!,
  }
}

/**
 * 延迟指定时间后拒绝的 Promise。
 * @param ms 延迟毫秒。
 * @param reason 拒绝原因。
 */
export function timeout<T = never>(
  ms: number,
  reason: string = `Timeout after ${ms}ms`,
): Promise<T> {
  return new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(reason)), ms)
  })
}

/**
 * 竞速 Promise 和超时。
 * @param promise 要竞速的 Promise。
 * @param ms 超时毫秒。
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T> {
  return Promise.race([promise, timeout<T>(ms)])
}

/**
 * 竞速多个 Promise，返回率先完成的结果。
 * @param promises Promise 数组。
 */
export function race<T>(promises: Promise<T>[]): Promise<T> {
  return Promise.race(promises)
}

/**
 * 等待所有 Promise 完成，即使部分失败。
 * @param promises Promise 数组。
 * @returns 包含结果和错误的数组。
 */
export async function settle<T>(
  promises: Promise<T>[],
): Promise<Array<{ status: 'fulfilled'; value: T } | { status: 'rejected'; reason: unknown }>> {
  return Promise.allSettled(promises)
}
