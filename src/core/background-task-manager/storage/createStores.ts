import { createTaskSnapshotStore } from './taskSnapshotStore'
import { createTaskHistoryStore, TaskHistoryStore } from './taskHistoryStore'
import type { TaskSnapshotStore } from './taskSnapshotStore'
import type { TaskHistoryStoreOptions, TaskSnapshotStoreOptions, TaskStorageBundleOptions } from './types'

/**
 * 同时创建快照存储与历史存储。
 *
 * @param options 分组配置。
 * @returns `snapshot` 与 `history` 实例。
 */
export function createTaskStorage(options: TaskStorageBundleOptions = {}): {
  snapshot: TaskSnapshotStore
  history: TaskHistoryStore
} {
  return {
    snapshot: createTaskSnapshotStore(options.snapshot ?? {}),
    history: createTaskHistoryStore(options.history ?? {}),
  }
}

export { createTaskSnapshotStore, createTaskHistoryStore }
