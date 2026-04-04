import type { BackgroundTask } from '../backgroundTaskManager'
import { prefixedId } from '../../../utils/uuid'
import { readJson, writeJson, getWebStorage } from './jsonKeyValueStorage'
import type { TaskHistoryStoreOptions, TaskStorageBackend } from './types'

/**
 * 单条历史记录（一次完成事件的追加快照）。
 */
export interface TaskHistoryEntry {
  /** 历史条目 ID（非任务 ID）。 */
  id: string
  /** 任务快照。 */
  task: BackgroundTask
  /** 写入历史的时间戳。 */
  recordedAt: number
  /** 执行耗时（毫秒），有起止时间时存在。 */
  duration?: number
}

/**
 * 历史统计汇总。
 */
export interface TaskHistoryStats {
  total: number
  byStatus: Record<string, number>
  byType: Record<string, number>
  avgDuration: number
  successRate: number
}

/**
 * 历史查询条件。
 */
export interface TaskHistoryQuery {
  type?: string
  status?: string
  startTime?: number
  endTime?: number
  taskId?: string
}

function computeStatsFromEntries(entries: readonly TaskHistoryEntry[]): TaskHistoryStats {
  const total = entries.length
  if (total === 0) {
    return {
      total: 0,
      byStatus: {},
      byType: {},
      avgDuration: 0,
      successRate: 0,
    }
  }

  const byStatus: Record<string, number> = {}
  const byType: Record<string, number> = {}
  let totalDuration = 0
  let successCount = 0

  for (const entry of entries) {
    const task = entry.task

    byStatus[task.status] = (byStatus[task.status] ?? 0) + 1
    byType[task.type] = (byType[task.type] ?? 0) + 1

    if (entry.duration !== undefined) {
      totalDuration += entry.duration
    }
    if (task.status === 'succeeded') {
      successCount += 1
    }
  }

  const entriesWithDuration = entries.filter((e) => e.duration !== undefined)

  return {
    total,
    byStatus,
    byType,
    avgDuration:
      entriesWithDuration.length > 0 ? totalDuration / entriesWithDuration.length : 0,
    successRate: successCount / total,
  }
}

/**
 * 任务执行历史存储：追加式记录、查询与可选 Web 持久化。
 */
export class TaskHistoryStore {
  private readonly maxRecords: number
  private readonly storageKey: string
  private readonly backend: TaskStorageBackend
  private readonly entries: TaskHistoryEntry[] = []

  constructor(options: TaskHistoryStoreOptions = {}) {
    this.maxRecords = Math.max(
      1,
      options.maxHistoryRecords ?? options.maxRecords ?? 100,
    )
    this.storageKey = options.storageKey ?? 'hhfast_task_history'
    this.backend = options.backend ?? 'localStorage'

    if (this.backend === 'localStorage' || this.backend === 'sessionStorage') {
      this.hydrateFromWebStorage()
    }
  }

  /**
   * 记录一条已完成（或取消）任务。
   *
   * @param task 任务快照。
   */
  record(task: BackgroundTask): void {
    const duration =
      task.startedAt && task.finishedAt ? task.finishedAt - task.startedAt : undefined

    const entry: TaskHistoryEntry = {
      id: prefixedId('hist'),
      task: { ...task },
      recordedAt: Date.now(),
      duration,
    }

    this.entries.push(entry)

    if (this.entries.length > this.maxRecords) {
      this.entries.splice(0, this.entries.length - this.maxRecords)
    }
  }

  /**
   * 批量记录。
   *
   * @param tasks 任务快照列表。
   */
  recordAll(tasks: BackgroundTask[]): void {
    for (const task of tasks) {
      this.record(task)
    }
  }

  /**
   * 清空内存中的历史（不自动写回存储，需自行 {@link TaskHistoryStore.save}）。
   */
  clear(): void {
    this.entries.length = 0
  }

  /**
   * 按历史条目 ID 删除。
   *
   * @param id 历史条目 ID。
   * @returns 是否删除成功。
   */
  remove(id: string): boolean {
    const index = this.entries.findIndex((e) => e.id === id)
    if (index < 0) {
      return false
    }
    this.entries.splice(index, 1)
    return true
  }

  /**
   * 条件查询。
   *
   * @param query 过滤条件。
   */
  query(query: TaskHistoryQuery = {}): TaskHistoryEntry[] {
    return this.entries.filter((entry) => {
      const task = entry.task

      if (query.taskId && task.id !== query.taskId) {
        return false
      }
      if (query.type && task.type !== query.type) {
        return false
      }
      if (query.status && task.status !== query.status) {
        return false
      }
      if (query.startTime && entry.recordedAt < query.startTime) {
        return false
      }
      if (query.endTime && entry.recordedAt > query.endTime) {
        return false
      }

      return true
    })
  }

  /**
   * 最近 N 条。
   *
   * @param n 条数。
   */
  recent(n: number = 10): TaskHistoryEntry[] {
    return this.entries.slice(-Math.min(n, this.entries.length))
  }

  /**
   * 按任务 ID 查找所有历史条目。
   *
   * @param taskId 任务 ID。
   */
  getByTaskId(taskId: string): TaskHistoryEntry[] {
    return this.entries.filter((e) => e.task.id === taskId)
  }

  /**
   * 按任务类型查找。
   *
   * @param type 类型。
   */
  getByType(type: string): TaskHistoryEntry[] {
    return this.query({ type })
  }

  /**
   * 全量统计。
   */
  getStats(): TaskHistoryStats {
    return computeStatsFromEntries(this.entries)
  }

  /**
   * 仅针对某一任务类型的统计。
   *
   * @param type 任务类型。
   */
  getTypeStats(type: string): TaskHistoryStats {
    const subset = this.entries.filter((e) => e.task.type === type)
    return computeStatsFromEntries(subset)
  }

  /**
   * 将当前历史写入存储（Web 后端为同步 IO，仍返回 Promise 以统一异步表面）。
   */
  async save(): Promise<void> {
    if (this.backend === 'memory') {
      return
    }
    const storage = getWebStorage(this.backend)
    writeJson(storage, this.storageKey, this.entries)
  }

  /**
   * 从存储读取并替换内存中的历史（保留 `maxRecords` 截断）。
   */
  async load(): Promise<void> {
    if (this.backend === 'memory') {
      return
    }
    this.hydrateFromWebStorage()
  }

  /**
   * 导出为 JSON 字符串。
   */
  export(): string {
    return JSON.stringify(this.entries, null, 2)
  }

  /**
   * 自 JSON 导入并应用条数上限。
   *
   * @param json JSON 字符串。
   */
  import(json: string): void {
    try {
      const parsed = JSON.parse(json) as TaskHistoryEntry[]
      this.entries.length = 0
      this.entries.push(...parsed.slice(-this.maxRecords))
    }
    catch (error) {
      // eslint-disable-next-line no-console
      console.error('[TaskHistoryStore] import failed:', error)
    }
  }

  private hydrateFromWebStorage(): void {
    if (this.backend === 'memory') {
      return
    }
    const storage = getWebStorage(this.backend)
    const parsed = readJson<TaskHistoryEntry[]>(storage, this.storageKey)
    if (!parsed || !Array.isArray(parsed)) {
      return
    }
    this.entries.length = 0
    this.entries.push(...parsed.slice(-this.maxRecords))
  }
}

/**
 * 创建任务历史存储实例。
 *
 * @param options 配置项。
 */
export function createTaskHistoryStore(options: TaskHistoryStoreOptions = {}): TaskHistoryStore {
  return new TaskHistoryStore(options)
}
