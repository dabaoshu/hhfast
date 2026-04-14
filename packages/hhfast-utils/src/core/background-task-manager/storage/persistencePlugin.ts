  import type { BackgroundTask, BackgroundTaskManager, BackgroundTaskManagerPlugin } from '../backgroundTaskManager'
import type { TaskSnapshotStore } from './taskSnapshotStore'

/**
 * 将任务生命周期同步到快照存储的插件。
 *
 * @param store 任务快照存储。
 * @returns 可传入 `BackgroundTaskManager` 的 `plugins`。
 */
export function createTaskPersistencePlugin(store: TaskSnapshotStore): BackgroundTaskManagerPlugin {
  return {
    onTaskAdded(task: BackgroundTask) {
      void store.saveTask(task)
    },
    onTaskUpdated(_prev: BackgroundTask, next: BackgroundTask) {
      void store.saveTask(next)
    },
    onTaskRemoved(task: BackgroundTask) {
      void store.deleteTask(task.id)
    },
  }
}

/**
 * 从持久化快照恢复为队列中的待执行记录（仅处理 `status === 'pending'`）。
 * 不恢复 `running` 与终态任务，避免刷新后重复执行或状态不一致。
 * ID 已存在或对应 `type` 未注册时跳过该条。
 *
 * @param manager 后台任务管理器。
 * @param snapshots 快照列表（通常由存储 `loadTasks` 取得后再筛 `pending`）。
 * @returns 成功加入调度队列的任务 ID 列表。
 */
export function restorePendingFromSnapshots(
  manager: BackgroundTaskManager,
  snapshots: readonly BackgroundTask[],
): string[] {
  const restored: string[] = []

  for (const snapshot of snapshots) {
    if (snapshot.status !== 'pending') {
      continue
    }
    const id = manager.tryRestorePendingFromSnapshot(snapshot)
    if (id) {
      restored.push(id)
    }
  }

  manager.afterPendingRestoreBatch(restored.length)
  return restored
}

/**
 * 自快照存储加载后，仅将 `pending` 任务写回管理器队列。
 * 调用前须已为所有将出现的 `type` 注册处理器。
 *
 * @param manager 后台任务管理器。
 * @param store 快照存储。
 * @returns 实际恢复的任务 ID 列表。
 */
export async function restorePendingFromPersistence(
  manager: BackgroundTaskManager,
  store: TaskSnapshotStore,
): Promise<string[]> {
  const stored = await store.loadTasks()
  const pendingOnly = stored.filter((t) => t.status === 'pending')
  return restorePendingFromSnapshots(manager, pendingOnly)
}
