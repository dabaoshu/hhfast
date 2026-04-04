/**
 * 浏览器端任务存储后端（快照与历史共用，不含 IndexedDB）。
 */
export type TaskStorageBackend = 'localStorage' | 'sessionStorage' | 'memory'

/**
 * 任务快照存储（按 task.id upsert）配置。
 */
export interface TaskSnapshotStoreOptions {
  /** 存储后端；IndexedDB 请使用 `IndexedDBAdapter` 单独构造。 */
  backend?: TaskStorageBackend
  /** 存储键名。 */
  storageKey?: string
  /** 最大任务条数，超出按 `createdAt` 淘汰最旧。 */
  maxSnapshotRecords?: number
  /**
   * 同 {@link TaskSnapshotStoreOptions.maxSnapshotRecords}，兼容旧名 `maxRecords`。
   */
  maxRecords?: number
  /** 预留：自动保存间隔（毫秒），当前未使用。 */
  autoSaveInterval?: number
}

/**
 * 任务执行历史（追加式）存储配置。
 */
export interface TaskHistoryStoreOptions {
  /** 与快照一致的后端；不支持 IndexedDB（首期用 JSON 整包读写）。 */
  backend?: TaskStorageBackend
  /** 存储键名。 */
  storageKey?: string
  /** 最大历史条数，超出移除最旧。 */
  maxHistoryRecords?: number
  /**
   * 同 {@link TaskHistoryStoreOptions.maxHistoryRecords}，兼容旧名 `maxRecords`。
   */
  maxRecords?: number
}

/**
 * 同时创建快照与历史存储时的分组配置。
 */
export interface TaskStorageBundleOptions {
  /** 快照存储配置。 */
  snapshot?: TaskSnapshotStoreOptions
  /** 历史存储配置。 */
  history?: TaskHistoryStoreOptions
}
