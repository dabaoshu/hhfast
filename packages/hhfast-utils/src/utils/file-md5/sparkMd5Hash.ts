import SparkMD5 from 'spark-md5'
import type { ComputeFileMd5Options } from './types'

const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024

/**
 * 若已中止则抛出 AbortError。
 */
function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('Aborted', 'AbortError')
  }
}

/**
 * 使用 spark-md5 流式计算 Blob MD5。
 */
export async function hashBlobWithSparkMd5(
  file: Blob,
  options: Pick<ComputeFileMd5Options, 'chunkSize' | 'onProgress' | 'signal'> = {},
): Promise<string> {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE
  const spark = new SparkMD5.ArrayBuffer()
  let offset = 0

  while (offset < file.size) {
    throwIfAborted(options.signal)

    const end = Math.min(offset + chunkSize, file.size)
    const buffer = await file.slice(offset, end).arrayBuffer()
    spark.append(buffer)
    offset = end

    options.onProgress?.({
      loaded: offset,
      total: file.size,
      ratio: file.size > 0 ? offset / file.size : 1,
    })
  }

  return spark.end()
}

export { DEFAULT_CHUNK_SIZE }
