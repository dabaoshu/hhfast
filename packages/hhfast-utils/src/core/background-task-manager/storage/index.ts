import type { TaskSnapshotStore } from './taskSnapshotStore'
import type { TaskSnapshotStoreOptions, TaskStorageBackend } from './types'
import type { TaskHistoryStoreOptions } from './types'
import { createTaskSnapshotStore } from './taskSnapshotStore'

export type {
  TaskStorageBackend,
  TaskSnapshotStoreOptions,
  TaskHistoryStoreOptions,
  TaskStorageBundleOptions,
} from './types'

export { readJson, writeJson, getWebStorage } from './jsonKeyValueStorage'

export type { TaskSnapshotStore } from './taskSnapshotStore'
export { createTaskSnapshotStore, IndexedDBAdapter } from './taskSnapshotStore'

export type { TaskHistoryEntry, TaskHistoryStats, TaskHistoryQuery } from './taskHistoryStore'
export { TaskHistoryStore, createTaskHistoryStore } from './taskHistoryStore'

export { createTaskStorage } from './createStores'

export {
  createTaskPersistencePlugin,
  restorePendingFromPersistence,
  restorePendingFromSnapshots,
} from './persistencePlugin'

/** @deprecated 请使用 {@link TaskSnapshotStore}。 */
export type TaskPersistenceAdapter = TaskSnapshotStore

/** @deprecated 请使用 {@link TaskSnapshotStoreOptions}。 */
export type TaskPersistenceOptions = TaskSnapshotStoreOptions

/** @deprecated 请使用 {@link TaskStorageBackend}。 */
export type StorageBackend = TaskStorageBackend

/**
 * @deprecated 请使用 {@link createTaskSnapshotStore}。
 */
export const createTaskPersistenceAdapter = createTaskSnapshotStore

/** @deprecated 请使用 {@link TaskHistoryStore}。 */
export { TaskHistoryStore as TaskHistoryManager } from './taskHistoryStore'

/** @deprecated 请使用 {@link TaskHistoryStoreOptions}。 */
export type TaskHistoryOptions = TaskHistoryStoreOptions
