import type { BackgroundTask } from '../backgroundTaskManager'
import { prefixedId } from '../../../utils/uuid'
import { readJson, writeJson, getWebStorage } from './jsonKeyValueStorage'
import type { TaskSnapshotStoreOptions, TaskStorageBackend } from './types'

/**
 * 任务快照存储：按任务 ID upsert，供恢复 pending 与插件持久化。
 */
export interface TaskSnapshotStore {
  saveTask(task: BackgroundTask): Promise<void>
  saveTasks(tasks: BackgroundTask[]): Promise<void>
  loadTasks(): Promise<BackgroundTask[]>
  deleteTask(id: string): Promise<void>
  clear(): Promise<void>
  getTask(id: string): Promise<BackgroundTask | undefined>
  queryTasks(predicate: (task: BackgroundTask) => boolean): Promise<BackgroundTask[]>
  destroy(): void
}

class WebStorageSnapshotStore implements TaskSnapshotStore {
  private readonly storage: Storage
  private readonly storageKey: string
  private readonly maxRecords: number
  private tasks = new Map<string, BackgroundTask>()

  constructor(storage: Storage, storageKey: string, maxRecords: number) {
    this.storage = storage
    this.storageKey = storageKey
    this.maxRecords = maxRecords
    this.hydrateFromStorage()
  }

  async saveTask(task: BackgroundTask): Promise<void> {
    this.tasks.set(task.id, { ...task })
    this.trimIfNeeded()
    this.persist()
  }

  async saveTasks(tasks: BackgroundTask[]): Promise<void> {
    for (const task of tasks) {
      this.tasks.set(task.id, { ...task })
    }
    this.trimIfNeeded()
    this.persist()
  }

  async loadTasks(): Promise<BackgroundTask[]> {
    return [...this.tasks.values()]
  }

  async deleteTask(id: string): Promise<void> {
    this.tasks.delete(id)
    this.persist()
  }

  async clear(): Promise<void> {
    this.tasks.clear()
    this.persist()
  }

  async getTask(id: string): Promise<BackgroundTask | undefined> {
    return this.tasks.get(id)
  }

  async queryTasks(predicate: (task: BackgroundTask) => boolean): Promise<BackgroundTask[]> {
    return [...this.tasks.values()].filter(predicate)
  }

  destroy(): void {
    this.tasks.clear()
  }

  private hydrateFromStorage(): void {
    const parsed = readJson<BackgroundTask[]>(this.storage, this.storageKey)
    if (!parsed || !Array.isArray(parsed)) {
      return
    }
    for (const task of parsed) {
      this.tasks.set(task.id, task)
    }
  }

  private persist(): void {
    writeJson(this.storage, this.storageKey, [...this.tasks.values()])
  }

  private trimIfNeeded(): void {
    if (this.tasks.size <= this.maxRecords) {
      return
    }

    const entries = [...this.tasks.entries()].sort(
      (a, b) => (a[1].createdAt ?? 0) - (b[1].createdAt ?? 0),
    )

    const toRemove = entries.slice(0, entries.length - this.maxRecords)
    for (const [id] of toRemove) {
      this.tasks.delete(id)
    }
  }
}

class MemorySnapshotStore implements TaskSnapshotStore {
  private readonly maxRecords: number
  private readonly tasks = new Map<string, BackgroundTask>()

  constructor(maxRecords: number) {
    this.maxRecords = maxRecords
  }

  async saveTask(task: BackgroundTask): Promise<void> {
    this.tasks.set(task.id, { ...task })
    this.trimIfNeeded()
  }

  async saveTasks(tasks: BackgroundTask[]): Promise<void> {
    for (const task of tasks) {
      this.tasks.set(task.id, { ...task })
    }
    this.trimIfNeeded()
  }

  async loadTasks(): Promise<BackgroundTask[]> {
    return [...this.tasks.values()]
  }

  async deleteTask(id: string): Promise<void> {
    this.tasks.delete(id)
  }

  async clear(): Promise<void> {
    this.tasks.clear()
  }

  async getTask(id: string): Promise<BackgroundTask | undefined> {
    return this.tasks.get(id)
  }

  async queryTasks(predicate: (task: BackgroundTask) => boolean): Promise<BackgroundTask[]> {
    return [...this.tasks.values()].filter(predicate)
  }

  destroy(): void {
    this.tasks.clear()
  }

  private trimIfNeeded(): void {
    if (this.tasks.size <= this.maxRecords) {
      return
    }

    const entries = [...this.tasks.entries()].sort(
      (a, b) => (a[1].createdAt ?? 0) - (b[1].createdAt ?? 0),
    )

    const toRemove = entries.slice(0, entries.length - this.maxRecords)
    for (const [id] of toRemove) {
      this.tasks.delete(id)
    }
  }
}

function resolveMaxSnapshotRecords(options: TaskSnapshotStoreOptions): number {
  return Math.max(
    1,
    options.maxSnapshotRecords ?? options.maxRecords ?? 100,
  )
}

/**
 * 创建任务快照存储（localStorage / sessionStorage / memory）。
 *
 * @param options 配置项。
 */
export function createTaskSnapshotStore(
  options: TaskSnapshotStoreOptions = {},
): TaskSnapshotStore {
  const {
    backend = 'localStorage',
    storageKey = `hhfast_persistence_${prefixedId('')}`,
  } = options

  const maxRecords = resolveMaxSnapshotRecords(options)

  const b = backend as TaskStorageBackend
  switch (b) {
    case 'localStorage':
      return new WebStorageSnapshotStore(getWebStorage('localStorage'), storageKey, maxRecords)
    case 'sessionStorage':
      return new WebStorageSnapshotStore(getWebStorage('sessionStorage'), storageKey, maxRecords)
    case 'memory':
      return new MemorySnapshotStore(maxRecords)
    default:
      throw new Error(`Unknown snapshot storage backend: ${backend}`)
  }
}

/**
 * IndexedDB 实现的任务快照存储（大量任务场景）。
 */
export class IndexedDBAdapter implements TaskSnapshotStore {
  private readonly dbName: string
  private readonly storeName: string
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  constructor(dbName: string = 'hhfast_tasks', storeName: string = 'tasks') {
    this.dbName = dbName
    this.storeName = storeName
    this.initPromise = this.init()
  }

  private async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1)

      request.onerror = () => reject(request.error)

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' })
          store.createIndex('type', 'type', { unique: false })
          store.createIndex('status', 'status', { unique: false })
          store.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }
    })
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (this.initPromise) {
      await this.initPromise
      this.initPromise = null
    }
    if (!this.db) {
      throw new Error('IndexedDB not initialized')
    }
    return this.db
  }

  async saveTask(task: BackgroundTask): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite')
      tx.objectStore(this.storeName).put({ ...task })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async saveTasks(tasks: BackgroundTask[]): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite')
      const store = tx.objectStore(this.storeName)
      for (const task of tasks) {
        store.put({ ...task })
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async loadTasks(): Promise<BackgroundTask[]> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly')
      const request = tx.objectStore(this.storeName).getAll()
      request.onsuccess = () => resolve(request.result ?? [])
      request.onerror = () => reject(request.error)
    })
  }

  async deleteTask(id: string): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite')
      tx.objectStore(this.storeName).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async clear(): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite')
      tx.objectStore(this.storeName).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async getTask(id: string): Promise<BackgroundTask | undefined> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly')
      const request = tx.objectStore(this.storeName).get(id)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async queryTasks(predicate: (task: BackgroundTask) => boolean): Promise<BackgroundTask[]> {
    const tasks = await this.loadTasks()
    return tasks.filter(predicate)
  }

  destroy(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
    this.initPromise = null
  }
}
