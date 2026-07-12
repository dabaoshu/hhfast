import { hashBlobWithSparkMd5 } from './sparkMd5Hash'

/** Worker 请求：开始计算。 */
interface FileMd5WorkerStartMessage {
  type: 'start'
  file: Blob
  chunkSize: number
}

/** Worker 响应：进度更新。 */
interface FileMd5WorkerProgressMessage {
  type: 'progress'
  loaded: number
  total: number
}

/** Worker 响应：计算完成。 */
interface FileMd5WorkerDoneMessage {
  type: 'done'
  md5: string
}

/** Worker 响应：计算失败。 */
interface FileMd5WorkerErrorMessage {
  type: 'error'
  message: string
}

/**
 * 在 Worker 中使用 spark-md5 流式计算 Blob MD5。
 */
self.onmessage = async (event: MessageEvent<FileMd5WorkerStartMessage>) => {
  const message = event.data
  if (message.type !== 'start') return

  try {
    const { file, chunkSize } = message
    const md5 = await hashBlobWithSparkMd5(file, {
      chunkSize,
      onProgress: ({ loaded, total }) => {
        const progress: FileMd5WorkerProgressMessage = {
          type: 'progress',
          loaded,
          total,
        }
        self.postMessage(progress)
      },
    })

    const done: FileMd5WorkerDoneMessage = {
      type: 'done',
      md5,
    }
    self.postMessage(done)
  } catch (error) {
    const err: FileMd5WorkerErrorMessage = {
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    }
    self.postMessage(err)
  }
}
