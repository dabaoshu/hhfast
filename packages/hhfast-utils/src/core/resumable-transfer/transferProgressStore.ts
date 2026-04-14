import type {
  TransferProgressStore,
  TransferTaskPersistSnapshot,
} from './resumableTransfer.types'

/**
 * 基于 localStorage 的传输进度存储实现。
 *
 * 所有任务快照以 JSON 数组形式存储在单个 key 下。
 */
export class LocalStorageTransferStore implements TransferProgressStore {
  private readonly storageKey: string

  constructor(storageKey: string = 'hhfast_resumable_transfer') {
    this.storageKey = storageKey
  }

  async save(taskId: string, snapshot: TransferTaskPersistSnapshot): Promise<void> {
    const list = this.readAll()
    const idx = list.findIndex(s => s.id === taskId)
    if (idx >= 0) {
      list[idx] = snapshot
    } else {
      list.push(snapshot)
    }
    this.writeAll(list)
  }

  async load(taskId: string): Promise<TransferTaskPersistSnapshot | undefined> {
    return this.readAll().find(s => s.id === taskId)
  }

  async remove(taskId: string): Promise<void> {
    this.writeAll(this.readAll().filter(s => s.id !== taskId))
  }

  async loadAll(): Promise<TransferTaskPersistSnapshot[]> {
    return this.readAll()
  }

  // ─── private helpers ───────────────────────────────────

  private readAll(): TransferTaskPersistSnapshot[] {
    try {
      const raw = localStorage.getItem(this.storageKey)
      if (!raw) return []
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[ResumableTransfer][storage] readAll failed:', error)
      return []
    }
  }

  private writeAll(snapshots: TransferTaskPersistSnapshot[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(snapshots))
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[ResumableTransfer][storage] writeAll failed:', error)
    }
  }
}

/** 创建 localStorage 传输进度存储。 */
export function createLocalStorageTransferStore(
  storageKey?: string,
): TransferProgressStore {
  return new LocalStorageTransferStore(storageKey)
}
