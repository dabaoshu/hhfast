/** MD5 计算进度。 */
export interface FileMd5Progress {
  /** 已处理字节数。 */
  loaded: number
  /** 文件总字节数。 */
  total: number
  /** 进度比例 0-1。 */
  ratio: number
}

/** 计算文件 MD5 的选项。 */
export interface ComputeFileMd5Options {
  /**
   * 分块读取大小（字节），默认 2MB。
   * Worker 内按此大小流式读取 Blob，避免一次性加载大文件。
   */
  chunkSize?: number
  /** 进度回调（在主线程触发）。 */
  onProgress?: (progress: FileMd5Progress) => void
  /** 取消信号；触发后会终止 Worker。 */
  signal?: AbortSignal
}
