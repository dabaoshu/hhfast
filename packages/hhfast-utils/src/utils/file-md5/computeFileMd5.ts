import { DEFAULT_CHUNK_SIZE, hashBlobWithSparkMd5 } from './sparkMd5Hash'
import type { ComputeFileMd5Options, FileMd5Progress } from './types'

/**
 * 在主线程流式计算 Blob MD5（无 Worker 时的回退方案）。
 */
export async function computeFileMd5OnMainThread(
  file: Blob,
  options: ComputeFileMd5Options = {},
): Promise<string> {
  return hashBlobWithSparkMd5(file, options)
}

/**
 * 在 Web Worker 中流式计算文件 MD5，不阻塞主线程 UI。
 *
 * @param file 待计算的文件或 Blob。
 * @param options 分块大小、进度回调、取消信号。
 * @returns 32 位小写十六进制 MD5 字符串。
 */
export function computeFileMd5(
  file: Blob,
  options: ComputeFileMd5Options = {},
): Promise<string> {
  if (typeof Worker === 'undefined') {
    return computeFileMd5OnMainThread(file, options)
  }

  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./fileMd5.worker.ts', import.meta.url), {
      type: 'module',
    })

    const cleanup = () => {
      options.signal?.removeEventListener('abort', onAbort)
      worker.terminate()
    }

    const onAbort = () => {
      cleanup()
      reject(options.signal?.reason ?? new DOMException('Aborted', 'AbortError'))
    }

    if (options.signal?.aborted) {
      worker.terminate()
      reject(options.signal.reason ?? new DOMException('Aborted', 'AbortError'))
      return
    }

    options.signal?.addEventListener('abort', onAbort, { once: true })

    worker.onmessage = (event: MessageEvent) => {
      const message = event.data as {
        type: string
        loaded?: number
        total?: number
        md5?: string
        message?: string
      }

      switch (message.type) {
        case 'progress': {
          const loaded = message.loaded ?? 0
          const total = message.total ?? file.size
          const progress: FileMd5Progress = {
            loaded,
            total,
            ratio: total > 0 ? loaded / total : 1,
          }
          options.onProgress?.(progress)
          break
        }
        case 'done': {
          cleanup()
          resolve(message.md5 ?? '')
          break
        }
        case 'error': {
          cleanup()
          reject(new Error(message.message ?? 'MD5 worker failed'))
          break
        }
        default:
          break
      }
    }

    worker.onerror = (error) => {
      cleanup()
      reject(error)
    }

    worker.postMessage({
      type: 'start',
      file,
      chunkSize,
    })
  })
}
