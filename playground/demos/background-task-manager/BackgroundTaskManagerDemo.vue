<script setup lang="ts">
import { computed, onBeforeUnmount, reactive } from 'vue'
import {
  BackgroundTaskManager,
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

/**
 * @description 组件展示层状态。
 */
const state = reactive({
  tasks: [] as BackgroundTask<DemoTaskPayload, { done: true }>[],
  log: [] as string[],
})

/**
 * @description 记录一条日志，最多保留 30 条。
 * @param message 日志文案。
 */
const pushLog = (message: string): void => {
  state.log.unshift(`[${new Date().toLocaleTimeString()}] ${message}`)
  if (state.log.length > 30) {
    state.log.length = 30
  }
}

/**
 * @description 刷新任务快照到视图层。
 */
const syncTasks = (): void => {
  state.tasks = manager.getTasks() as BackgroundTask<DemoTaskPayload, { done: true }>[]
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
      durationMs: 1800 + Math.round(Math.random() * 2200),
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
    const steps = 8
    const stepMs = Math.max(120, Math.floor(payload.durationMs / steps))

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
</script>

<template>
  <section class="task-demo">
    <h2 class="task-demo__title">Background Task Manager Demo</h2>

    <p class="task-demo__desc">
      通用后台任务管理器示例：支持并发调度、进度上报、取消、自动重试与清理。
    </p>

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
      <h3 class="task-demo__sub-title">事件日志</h3>
      <ul class="log-list">
        <li v-for="(line, index) in state.log" :key="`${line}-${index}`" class="mono">
          {{ line }}
        </li>
      </ul>
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
  max-height: 180px;
  overflow: auto;
}
</style>

