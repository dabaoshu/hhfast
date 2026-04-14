<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import {
  BackgroundTaskManager,
  TaskScheduler,
  TaskHistoryStore,
  createTaskSnapshotStore,
  type BackgroundTask,
  type BackgroundTaskManagerPlugin,
} from '@/index'

type DemoTaskType = 'file:upload' | 'job:report'

interface DemoTaskPayload {
  name: string
  durationMs: number
  failRate: number
}

interface TypeStats {
  total: number
  succeeded: number
  failed: number
}

const typeStats = reactive<Record<string, TypeStats>>({})

const statsPlugin: BackgroundTaskManagerPlugin = {
  onTaskUpdated(prev, next) {
    const endStates: Array<BackgroundTask['status']> = ['succeeded', 'failed', 'cancelled']
    if (!endStates.includes(next.status) || endStates.includes(prev.status)) {
      return
    }
    const key = next.type
    const item =
      typeStats[key]
      ?? (typeStats[key] = {
        total: 0,
        succeeded: 0,
        failed: 0,
      })
    item.total += 1
    if (next.status === 'succeeded') {
      item.succeeded += 1
    }
    else if (next.status === 'failed') {
      item.failed += 1
    }
  },
}

const manager = new BackgroundTaskManager({
  concurrency: 6,
  defaultMaxRetries: 1,
  retryDelay: (attempt) => attempt * 1000,
  plugins: [statsPlugin],
})

// ============ TaskScheduler ============
const scheduler = new TaskScheduler({ manager })

// ============ TaskHistoryStore ============
const historyStore = new TaskHistoryStore({ backend: 'memory', maxRecords: 100 })

// ============ TaskSnapshotStore ============
const snapshotStore = createTaskSnapshotStore({
  backend: 'memory',
  maxRecords: 200,
})

/**
 * @description 组件展示层状态。
 */
const state = reactive({
  tasks: [] as BackgroundTask<DemoTaskPayload, { done: true }>[],
  log: [] as string[],
  scheduledTasks: [] as ReturnType<TaskScheduler['getScheduledTasks']>,
  historyEntries: [] as ReturnType<TaskHistoryStore['query']>,
  historyStats: null as ReturnType<TaskHistoryStore['getStats']> | null,
  activeTab: 'tasks' as 'tasks' | 'scheduler' | 'history',
})

/**
 * @description 记录一条日志，最多保留 50 条。
 * @param message 日志文案。
 */
const pushLog = (message: string): void => {
  state.log.unshift(`[${new Date().toLocaleTimeString()}] ${message}`)
  if (state.log.length > 50) {
    state.log.length = 50
  }
}

/**
 * @description 刷新任务快照到视图层。
 */
const syncTasks = (): void => {
  state.tasks = manager.getTasks() as BackgroundTask<DemoTaskPayload, { done: true }>[]
  state.scheduledTasks = scheduler.getScheduledTasks()
  state.historyEntries = historyStore.query()
  state.historyStats = historyStore.getStats()
}

/**
 * @description 生成模拟任务。
 * @param type 任务类型。
 * @returns 入队任务 ID。
 */
const createDemoTask = (type: DemoTaskType): string => {
  const id = manager.enqueue<DemoTaskPayload>({
    type,
    payload: {
      name: `${type}-${Math.random().toString(36).slice(2, 6)}`,
      durationMs: 1500 + Math.round(Math.random() * 2000),
      failRate: type === 'file:upload' ? 0.2 : 0.35,
    },
    maxRetries: 2,
  })
  pushLog(`已创建任务 ${id}`)
  return id
}

/**
 * @description 批量创建混合任务。
 * @param count 任务数量。
 */
const createBurstTasks = (count: number): void => {
  for (let i = 0; i < count; i += 1) {
    const type: DemoTaskType = Math.random() > 0.5 ? 'file:upload' : 'job:report'
    createDemoTask(type)
  }
}

/**
 * @description 注册通用模拟处理器。
 * @param type 任务类型。
 */
const registerMockHandler = (type: DemoTaskType): void => {
  manager.register<DemoTaskPayload, { done: true }>(type, async ({ id, payload, signal, setProgress }) => {
    const steps = 6
    const stepMs = Math.max(100, Math.floor(payload.durationMs / steps))

    for (let i = 1; i <= steps; i += 1) {
      if (signal.aborted) {
        throw new Error('任务已取消')
      }
      await new Promise((resolve) => setTimeout(resolve, stepMs))
      setProgress(i / steps, `阶段 ${i}/${steps}`)
    }

    if (Math.random() < payload.failRate) {
      throw new Error(`模拟失败: ${id}`)
    }
    return { done: true }
  })
}

registerMockHandler('file:upload')
registerMockHandler('job:report')

// 监听任务完成并记录历史
manager.on('task-updated', (task) => {
  if (task && ['succeeded', 'failed', 'cancelled'].includes(task.status)) {
    historyStore.record(task)
    // 同步到持久化
    snapshotStore.saveTask(task)
    syncTasks()
  }
})

// 调度器事件
scheduler.on('scheduled', (task) => {
  pushLog(`[调度] 定时任务已添加: ${task?.id}`)
  syncTasks()
})
scheduler.on('executing', (task) => {
  pushLog(`[调度] 执行中: ${task?.id}`)
})
scheduler.on('executed', (task) => {
  pushLog(`[调度] 已执行 ${task?.executions} 次: ${task?.id}`)
})
scheduler.on('removed', (task) => {
  pushLog(`[调度] 已移除: ${task?.id}`)
})

// 启动调度器
scheduler.start()

const unsubscribers = [
  manager.on('task-added', (task) => {
    if (task) {
      pushLog(`任务创建: ${task.id}`)
    }
    syncTasks()
  }),
  manager.on('task-updated', (task) => {
    if (task) {
      pushLog(`任务更新: ${task.id} -> ${task.status}`)
    }
    syncTasks()
  }),
  manager.on('task-removed', (task) => {
    if (task) {
      pushLog(`任务移除: ${task.id}`)
    }
    syncTasks()
  }),
  manager.on('idle', () => {
    pushLog('队列空闲')
    syncTasks()
  }),
]

onBeforeUnmount(() => {
  unsubscribers.forEach((off) => off())
  scheduler.stop()
  snapshotStore.destroy()
})

const taskStats = computed(() => {
  const total = state.tasks.length
  const running = state.tasks.filter((item) => item.status === 'running').length
  const pending = state.tasks.filter((item) => item.status === 'pending').length
  const failed = state.tasks.filter((item) => item.status === 'failed').length
  return { total, running, pending, failed }
})

const typeStatsList = computed(() => {
  return Object.entries(typeStats).map(([type, v]) => ({
    type,
    total: v.total,
    succeeded: v.succeeded,
    failed: v.failed,
    successRate: v.total ? Math.round((v.succeeded / v.total) * 100) : 0,
  }))
})

/**
 * @description 创建上传任务。
 */
const createUploadTask = (): void => {
  createDemoTask('file:upload')
}

/**
 * @description 创建报表任务。
 */
const createReportTask = (): void => {
  createDemoTask('job:report')
}

/**
 * @description 取消指定任务。
 * @param id 任务 ID。
 */
const cancelTask = (id: string): void => {
  manager.cancel(id)
}

/**
 * @description 重试指定任务。
 * @param id 任务 ID。
 */
const retryTask = (id: string): void => {
  manager.retry(id)
}

/**
 * @description 清理终态任务。
 */
const clearFinishedTasks = (): void => {
  const count = manager.clearFinished()
  pushLog(`已清理任务 ${count} 个`)
  syncTasks()
}

// ============ 调度器操作 ============

/**
 * @description 添加延迟任务（5 秒后执行）。
 */
const addDelayTask = (): void => {
  const id = scheduler.delay('job:report', { name: 'delay_task' }, 5000)
  pushLog(`已添加延迟任务（5秒）: ${id}`)
}

/**
 * @description 添加定时任务（10 秒后执行）。
 */
const addScheduledTask = (): void => {
  const id = scheduler.schedule('job:report', { name: 'scheduled_task' }, Date.now() + 10000)
  pushLog(`已添加定时任务（10秒）: ${id}`)
}

/**
 * @description 添加重复任务（每 5 秒执行一次，最多 3 次）。
 */
const addRepeatingTask = (): void => {
  const id = scheduler.schedule('job:report', { name: 'repeating_task' }, Date.now() + 3000, {
    repeating: true,
    interval: 5000,
    maxExecutions: 3,
    priority: 1,
  })
  pushLog(`已添加重复任务（5秒间隔，最多3次）: ${id}`)
}

/**
 * @description 取消定时任务。
 * @param id 定时任务 ID。
 */
const cancelScheduledTask = (id: string): void => {
  scheduler.cancel(id)
  pushLog(`已取消定时任务: ${id}`)
}

// ============ 历史记录操作 ============

/**
 * @description 查询失败记录。
 */
const queryFailedHistory = (): void => {
  state.historyEntries = historyStore.query({ status: 'failed' })
  pushLog(`查询到 ${state.historyEntries.length} 条失败记录`)
}

/**
 * @description 查询所有历史。
 */
const queryAllHistory = (): void => {
  state.historyEntries = historyStore.query()
  pushLog(`历史记录共 ${state.historyEntries.length} 条`)
}

/**
 * @description 获取统计。
 */
const refreshStats = (): void => {
  state.historyStats = historyStore.getStats()
  pushLog(`统计已刷新`)
}

/**
 * @description 清空历史。
 */
const clearHistory = (): void => {
  historyStore.clear()
  syncTasks()
  pushLog(`历史已清空`)
}

/**
 * @description 导出历史。
 */
const exportHistory = (): void => {
  const json = historyStore.export()
  navigator.clipboard.writeText(json).then(() => {
    pushLog(`历史已复制到剪贴板（共 ${historyStore.query().length} 条）`)
  })
}

// ============ 持久化操作 ============

/**
 * @description 查询持久化中的失败任务。
 */
const queryPersistenceFailed = async (): void => {
  const failedTasks = await snapshotStore.queryTasks(t => t.status === 'failed')
  pushLog(`持久化中查询到 ${failedTasks.length} 条失败任务`)
}

/**
 * @description 清理持久化。
 */
const clearPersistence = async (): void => {
  await snapshotStore.clear()
  pushLog(`持久化已清空`)
}
</script>

<template>
  <section class="task-demo">
    <h2 class="task-demo__title">Background Task Manager Demo</h2>

    <p class="task-demo__desc">
      通用后台任务管理器，支持并发调度、进度上报、取消、自动重试。
      <br>
      增强模块：TaskScheduler（定时调度）、TaskHistoryStore（历史）、TaskSnapshotStore（快照持久化）。
    </p>

    <!-- Tab 切换 -->
    <div class="task-demo__tabs">
      <button
        type="button"
        class="tab-btn"
        :class="{ 'tab-btn--active': state.activeTab === 'tasks' }"
        @click="state.activeTab = 'tasks'"
      >
        任务管理
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ 'tab-btn--active': state.activeTab === 'scheduler' }"
        @click="state.activeTab = 'scheduler'"
      >
        定时调度
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ 'tab-btn--active': state.activeTab === 'history' }"
        @click="state.activeTab = 'history'"
      >
        历史记录
      </button>
    </div>

    <!-- ============ 任务管理 Tab ============ -->
    <div v-show="state.activeTab === 'tasks'" class="task-demo__panel">
      <div class="task-demo__toolbar">
        <button type="button" class="btn btn--primary" @click="createUploadTask">
          新建上传任务
        </button>
        <button type="button" class="btn btn--primary" @click="createReportTask">
          新建报表任务
        </button>
        <button type="button" class="btn" @click="createBurstTasks(10)">
          一键创建 10 个任务
        </button>
        <button type="button" class="btn" @click="createBurstTasks(30)">
          一键创建 30 个任务
        </button>
        <button type="button" class="btn" @click="manager.pause">
          暂停调度
        </button>
        <button type="button" class="btn" @click="manager.resume">
          恢复调度
        </button>
        <button type="button" class="btn btn--danger" @click="clearFinishedTasks">
          清理已完成
        </button>
      </div>

      <div class="task-demo__stats">
        <span>总数: {{ taskStats.total }}</span>
        <span>运行中: {{ taskStats.running }}</span>
        <span>排队中: {{ taskStats.pending }}</span>
        <span>失败: {{ taskStats.failed }}</span>
      </div>

      <div class="task-demo__card">
        <table class="task-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>类型</th>
              <th>状态</th>
              <th>进度</th>
              <th>重试</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in state.tasks" :key="task.id">
              <td class="mono">{{ task.id }}</td>
              <td>{{ task.type }}</td>
              <td>
                <span class="status" :data-status="task.status">{{ task.status }}</span>
              </td>
              <td>
                <div class="progress">
                  <div class="progress__bar" :style="{ width: `${Math.round(task.progress * 100)}%` }" />
                </div>
                <small>{{ Math.round(task.progress * 100) }}%</small>
              </td>
              <td>{{ task.attempts }} / {{ task.maxRetries }}</td>
              <td class="actions">
                <button type="button" class="btn btn--mini" @click="cancelTask(task.id)">
                  取消
                </button>
                <button type="button" class="btn btn--mini" @click="retryTask(task.id)">
                  重试
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="task-demo__card">
        <h3 class="task-demo__sub-title">按类型统计（来自插件）</h3>
        <table class="task-table">
          <thead>
            <tr>
              <th>类型</th>
              <th>总数</th>
              <th>成功</th>
              <th>失败</th>
              <th>成功率</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in typeStatsList" :key="row.type">
              <td>{{ row.type }}</td>
              <td>{{ row.total }}</td>
              <td>{{ row.succeeded }}</td>
              <td>{{ row.failed }}</td>
              <td>{{ row.successRate }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============ 定时调度 Tab ============ -->
    <div v-show="state.activeTab === 'scheduler'" class="task-demo__panel">
      <div class="task-demo__toolbar">
        <button type="button" class="btn btn--primary" @click="addDelayTask">
          延迟 5 秒执行
        </button>
        <button type="button" class="btn btn--primary" @click="addScheduledTask">
          定时 10 秒后执行
        </button>
        <button type="button" class="btn btn--primary" @click="addRepeatingTask">
          添加重复任务（5秒间隔）
        </button>
        <button type="button" class="btn" @click="scheduler.stop()">
          停止调度器
        </button>
        <button type="button" class="btn" @click="scheduler.start()">
          启动调度器
        </button>
        <button type="button" class="btn btn--danger" @click="scheduler.clear()">
          清空调度
        </button>
      </div>

      <div class="task-demo__card">
        <h3 class="task-demo__sub-title">定时任务列表</h3>
        <table class="task-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>类型</th>
              <th>执行时间</th>
              <th>优先级</th>
              <th>状态</th>
              <th>执行次数</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in state.scheduledTasks" :key="task.id">
              <td class="mono">{{ task.id }}</td>
              <td>{{ task.type }}</td>
              <td>{{ new Date(task.scheduledAt).toLocaleTimeString() }}</td>
              <td>{{ task.priority }}</td>
              <td>
                <span class="status" :data-status="task.enabled ? 'succeeded' : 'cancelled'">
                  {{ task.enabled ? '启用' : '禁用' }}
                </span>
              </td>
              <td>{{ task.executions }}{{ task.maxExecutions > 0 ? ` / ${task.maxExecutions}` : '' }}</td>
              <td>
                <button type="button" class="btn btn--mini" @click="cancelScheduledTask(task.id)">
                  取消
                </button>
              </td>
            </tr>
            <tr v-if="state.scheduledTasks.length === 0">
              <td colspan="7" class="empty">暂无定时任务</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============ 历史记录 Tab ============ -->
    <div v-show="state.activeTab === 'history'" class="task-demo__panel">
      <div class="task-demo__toolbar">
        <button type="button" class="btn" @click="queryAllHistory">
          查询所有历史
        </button>
        <button type="button" class="btn" @click="queryFailedHistory">
          仅看失败记录
        </button>
        <button type="button" class="btn" @click="refreshStats">
          刷新统计
        </button>
        <button type="button" class="btn" @click="exportHistory">
          导出历史
        </button>
        <button type="button" class="btn btn--danger" @click="clearHistory">
          清空历史
        </button>
      </div>

      <div v-if="state.historyStats" class="task-demo__stats">
        <span>总记录: {{ state.historyStats.total }}</span>
        <span>成功率: {{ (state.historyStats.successRate * 100).toFixed(1) }}%</span>
        <span>平均耗时: {{ state.historyStats.avgDuration.toFixed(0) }}ms</span>
      </div>

      <div class="task-demo__card">
        <h3 class="task-demo__sub-title">历史统计（按状态）</h3>
        <div v-if="state.historyStats" class="stats-grid">
          <div v-for="(count, status) in state.historyStats.byStatus" :key="status" class="stats-item">
            <span class="status" :data-status="status">{{ status }}</span>
            <strong>{{ count }}</strong>
          </div>
        </div>
      </div>

      <div class="task-demo__card">
        <h3 class="task-demo__sub-title">历史统计（按类型）</h3>
        <div v-if="state.historyStats" class="stats-grid">
          <div v-for="(count, type) in state.historyStats.byType" :key="type" class="stats-item">
            <span class="type-label">{{ type }}</span>
            <strong>{{ count }}</strong>
          </div>
        </div>
      </div>

      <div class="task-demo__card">
        <h3 class="task-demo__sub-title">历史记录列表</h3>
        <table class="task-table">
          <thead>
            <tr>
              <th>任务ID</th>
              <th>类型</th>
              <th>状态</th>
              <th>耗时</th>
              <th>记录时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in state.historyEntries.slice(0, 20)" :key="entry.id">
              <td class="mono">{{ entry.task.id }}</td>
              <td>{{ entry.task.type }}</td>
              <td>
                <span class="status" :data-status="entry.task.status">{{ entry.task.status }}</span>
              </td>
              <td>{{ entry.duration ? `${entry.duration}ms` : '-' }}</td>
              <td>{{ new Date(entry.recordedAt).toLocaleTimeString() }}</td>
            </tr>
            <tr v-if="state.historyEntries.length === 0">
              <td colspan="5" class="empty">暂无历史记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============ 事件日志（始终显示） ============ -->
    <div class="task-demo__card task-demo__log">
      <h3 class="task-demo__sub-title">事件日志</h3>
      <ul class="log-list">
        <li v-for="(line, index) in state.log" :key="`${line}-${index}`" class="mono">
          {{ line }}
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.task-demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-demo__title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}

.task-demo__desc {
  margin: 0;
  color: #666;
  line-height: 1.6;
}

.task-demo__tabs {
  display: flex;
  gap: 4px;
  border-bottom: 2px solid #e8e8e8;
}

.tab-btn {
  border: none;
  background: transparent;
  color: #666;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}

.tab-btn:hover {
  color: #1677ff;
}

.tab-btn--active {
  color: #1677ff;
  border-bottom-color: #1677ff;
}

.task-demo__panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-demo__toolbar,
.task-demo__stats {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.task-demo__stats span {
  background: #f5f7fa;
  padding: 6px 8px;
  border-radius: 8px;
  font-size: 13px;
}

.task-demo__card {
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  background: #fff;
  padding: 12px;
}

.task-demo__sub-title {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
}

.task-demo__log {
  max-height: 200px;
  overflow: auto;
}

.stats-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.stats-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f5f7fa;
  padding: 8px 12px;
  border-radius: 8px;
}

.type-label {
  font-family: 'Consolas', monospace;
  font-size: 12px;
  color: #666;
}

.btn {
  border: 1px solid #d9d9d9;
  background: #fff;
  color: #333;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 13px;
  cursor: pointer;
}

.btn--mini {
  padding: 4px 8px;
  font-size: 12px;
}

.btn--primary {
  background: #1677ff;
  border-color: #1677ff;
  color: #fff;
}

.btn--danger {
  color: #cf1322;
  border-color: #ffa39e;
}

.task-table {
  width: 100%;
  border-collapse: collapse;
}

.task-table th,
.task-table td {
  border-bottom: 1px solid #f0f0f0;
  text-align: left;
  padding: 8px 6px;
  font-size: 12px;
  vertical-align: middle;
}

.task-table th {
  color: #666;
  font-weight: 600;
}

.mono {
  font-family: 'Consolas', 'Menlo', monospace;
}

.actions {
  display: flex;
  gap: 6px;
}

.empty {
  text-align: center;
  color: #999;
  padding: 20px !important;
}

.status {
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
}

.status[data-status='pending'] {
  background: #fffbe6;
  color: #ad6800;
}

.status[data-status='running'] {
  background: #e6f4ff;
  color: #0958d9;
}

.status[data-status='succeeded'] {
  background: #f6ffed;
  color: #237804;
}

.status[data-status='failed'] {
  background: #fff1f0;
  color: #a8071a;
}

.status[data-status='cancelled'] {
  background: #fafafa;
  color: #595959;
}

.progress {
  width: 120px;
  height: 8px;
  border-radius: 999px;
  background: #f0f0f0;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress__bar {
  height: 8px;
  background: #1677ff;
  transition: width 0.2s;
}

.log-list {
  margin: 0;
  padding-left: 16px;
  max-height: 160px;
  overflow: auto;
  font-size: 12px;
}
</style>
