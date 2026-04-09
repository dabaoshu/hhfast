<script setup lang="ts">
/**
 * @description ResumableTransfer 断点续传 Demo — 真实文件上传联调
 */
import { reactive, ref, onBeforeUnmount } from 'vue'
import {
  ResumableTransfer,
  type TransferTaskSnapshot,
  type ChunkTransferContext,
} from '@/index'

const API_BASE = 'http://localhost:3099'
const CHUNK_SIZE = 2 * 1024 * 1024 // 2MB per chunk

// ─── 文件分片 ──────────────────────────────────────────

interface FileChunk {
  index: number
  blob: Blob
  start: number
  end: number
}

function sliceFile(file: File): FileChunk[] {
  const chunks: FileChunk[] = []
  let offset = 0
  let index = 0
  while (offset < file.size) {
    const end = Math.min(offset + CHUNK_SIZE, file.size)
    chunks.push({ index, blob: file.slice(offset, end), start: offset, end })
    offset = end
    index++
  }
  return chunks
}

// ─── Transfer 实例 ────────────────────────────────────

const transfer = new ResumableTransfer({
  concurrency: 3,
  maxRetries: 3,
})

// ─── 响应式状态 ──────────────────────────────────────

const state = reactive({
  tasks: [] as TransferTaskSnapshot[],
  log: [] as string[],
  mergedFiles: [] as Array<{ taskId: string; filename: string; size: number }>,
})

const fileInput = ref<HTMLInputElement>()

function refreshTasks() {
  state.tasks = transfer.getAllTasks()
}

function addLog(msg: string) {
  const time = new Date().toLocaleTimeString()
  state.log.unshift(`[${time}] ${msg}`)
  if (state.log.length > 80) state.log.length = 80
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

// ─── 上传分片函数 ────────────────────────────────────

async function uploadChunk(ctx: ChunkTransferContext<FileChunk>): Promise<void> {
  const { taskId, chunk, signal } = ctx
  const task = transfer.getTask(taskId)

  const formData = new FormData()
  formData.append('file', chunk.blob, `chunk_${chunk.index}`)
  formData.append('taskId', taskId)
  formData.append('index', String(chunk.index))
  formData.append('totalChunks', String(task?.totalCount ?? 0))
  formData.append('filename', task?.name ?? 'unknown')

  const resp = await fetch(`${API_BASE}/upload/chunk`, {
    method: 'POST',
    body: formData,
    signal,
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Upload chunk ${chunk.index} failed: ${resp.status} ${text}`)
  }
}

// ─── 合并函数 ────────────────────────────────────────

async function mergeChunks(taskId: string, filename: string, totalChunks: number): Promise<void> {
  const resp = await fetch(`${API_BASE}/upload/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, filename, totalChunks }),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Merge failed: ${resp.status} ${text}`)
  }

  const data = await resp.json()
  state.mergedFiles.push({ taskId, filename: data.filename, size: data.size })
}

// ─── 事件监听 ──────────────────────────────────────────

const unsubs = [
  transfer.on('task-started', (s) => {
    addLog(`Started: ${s.name ?? s.id}`)
    refreshTasks()
  }),
  transfer.on('task-paused', (s) => {
    addLog(`Paused: ${s.name ?? s.id} (${s.completedCount}/${s.totalCount} done)`)
    refreshTasks()
  }),
  transfer.on('task-completed', (s) => {
    addLog(`All chunks uploaded: ${s.name ?? s.id} — merging...`)
    // 触发合并
    mergeChunks(s.id, s.name ?? 'unknown', s.totalCount)
      .then(() => addLog(`Merged: ${s.name ?? s.id}`))
      .catch(err => addLog(`Merge error: ${err.message}`))
    refreshTasks()
  }),
  transfer.on('task-failed', (s) => {
    addLog(`Failed: ${s.name ?? s.id}`)
    refreshTasks()
  }),
  transfer.on('task-cancelled', (s) => {
    addLog(`Cancelled: ${s.name ?? s.id}`)
    // 清理服务端分片
    fetch(`${API_BASE}/upload/${s.id}`, { method: 'DELETE' }).catch(() => {})
    refreshTasks()
  }),
  transfer.on('progress', () => { refreshTasks() }),
  transfer.on('chunk-error', (s, extra) => {
    addLog(`Chunk ${extra?.chunkIndex} error in ${s.name ?? s.id}`)
    refreshTasks()
  }),
]

onBeforeUnmount(() => {
  unsubs.forEach(fn => fn())
  transfer.destroy()
})

// ─── 操作方法 ──────────────────────────────────────────

function triggerFileSelect() {
  fileInput.value?.click()
}

function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  for (const file of files) {
    const chunks = sliceFile(file)
    const taskId = transfer.create({
      name: file.name,
      chunks,
      transferFn: uploadChunk,
      autoStart: true,
      metadata: { size: file.size, type: file.type },
    })

    addLog(`Created: ${file.name} (${formatSize(file.size)}, ${chunks.length} chunks)`)
  }

  refreshTasks()
  // 清空 input 以便再次选择同一文件
  input.value = ''
}

function pauseTask(id: string) { transfer.pause(id) }
function startTask(id: string) { transfer.start(id) }
function cancelTask(id: string) { transfer.cancel(id) }
function retryTask(id: string) { transfer.retry(id) }
function removeTask(id: string) { transfer.removeTask(id); refreshTasks() }

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pending',
    running: 'Uploading',
    paused: 'Paused',
    completed: 'Done',
    failed: 'Failed',
    cancelled: 'Cancelled',
  }
  return map[status] ?? status
}

function statusClass(status: string): string {
  const map: Record<string, string> = {
    pending: 'status--pending',
    running: 'status--running',
    paused: 'status--paused',
    completed: 'status--completed',
    failed: 'status--failed',
    cancelled: 'status--cancelled',
  }
  return map[status] ?? ''
}
</script>

<template>
  <section class="pg-section">
    <h2>ResumableTransfer — File Upload</h2>
    <p class="pg-desc">
      真实文件断点续传演示。后端运行在 <code>localhost:3099</code>，
      启动命令：<code>node playground_backend/server.mjs</code>
    </p>

    <!-- 选择文件 -->
    <div class="pg-card">
      <h3>Select File</h3>
      <p class="pg-card-desc">
        选择文件后自动分片（每片 <code>{{ formatSize(CHUNK_SIZE) }}</code>）并开始上传。支持多选。
      </p>
      <input
        ref="fileInput"
        type="file"
        multiple
        style="display: none"
        @change="onFileSelected"
      />
      <div class="pg-actions">
        <button class="btn btn--blue" @click="triggerFileSelect">
          Choose File(s)
        </button>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="pg-card">
      <h3>Upload Tasks</h3>
      <div v-if="state.tasks.length === 0" class="rt-empty">
        No upload tasks. Select a file to start.
      </div>
      <div v-for="task in state.tasks" :key="task.id" class="rt-task">
        <div class="rt-task-header">
          <div class="rt-task-name-group">
            <span class="rt-task-name">{{ task.name ?? task.id }}</span>
            <span class="rt-task-size">{{ formatSize((task.metadata?.size as number) ?? 0) }}</span>
          </div>
          <span class="rt-status" :class="statusClass(task.status)">{{ statusLabel(task.status) }}</span>
        </div>

        <!-- 进度条 -->
        <div class="rt-progress-bar">
          <div
            class="rt-progress-fill"
            :class="{ 'rt-progress-fill--failed': task.status === 'failed' }"
            :style="{ width: (task.progress * 100) + '%' }"
          />
        </div>

        <div class="rt-task-info">
          <span>{{ task.completedCount }}/{{ task.totalCount }} chunks</span>
          <span>{{ (task.progress * 100).toFixed(1) }}%</span>
          <span v-if="task.speed > 0">{{ task.speed.toFixed(1) }} chunks/s</span>
          <span v-if="task.eta > 0">ETA: {{ (task.eta / 1000).toFixed(1) }}s</span>
        </div>

        <!-- 分片状态可视化 -->
        <div class="rt-chunk-bar">
          <div
            v-for="chunk in task.chunks"
            :key="chunk.index"
            class="rt-chunk-cell"
            :class="{
              'rt-chunk--completed': chunk.status === 'completed',
              'rt-chunk--transferring': chunk.status === 'transferring',
              'rt-chunk--failed': chunk.status === 'failed',
            }"
            :title="`Chunk ${chunk.index}: ${chunk.status} (${chunk.attempts} attempts)`"
          />
        </div>

        <!-- 操作按钮 -->
        <div class="rt-task-actions">
          <button v-if="task.status === 'running'" class="btn btn--small btn--orange" @click="pauseTask(task.id)">
            Pause
          </button>
          <button v-if="task.status === 'paused'" class="btn btn--small btn--blue" @click="startTask(task.id)">
            Resume
          </button>
          <button v-if="task.status === 'running' || task.status === 'paused'" class="btn btn--small btn--red" @click="cancelTask(task.id)">
            Cancel
          </button>
          <button v-if="task.status === 'failed'" class="btn btn--small btn--green" @click="retryTask(task.id)">
            Retry
          </button>
          <button
            v-if="task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled'"
            class="btn btn--small"
            @click="removeTask(task.id)"
          >
            Remove
          </button>
        </div>
      </div>
    </div>

    <!-- 已合并文件 -->
    <div v-if="state.mergedFiles.length > 0" class="pg-card">
      <h3>Merged Files</h3>
      <table class="pg-table">
        <thead>
          <tr><th>Filename</th><th>Size</th></tr>
        </thead>
        <tbody>
          <tr v-for="f in state.mergedFiles" :key="f.taskId">
            <td>{{ f.filename }}</td>
            <td>{{ formatSize(f.size) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 事件日志 -->
    <div class="pg-card">
      <h3>Event Log</h3>
      <div class="rt-log">
        <div v-for="(msg, i) in state.log" :key="i" class="rt-log-item">{{ msg }}</div>
        <div v-if="state.log.length === 0" class="rt-empty">No events yet.</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rt-task {
  padding: 14px 0;
  border-bottom: 1px solid #f0f0f0;
}
.rt-task:last-child { border-bottom: none; }

.rt-task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.rt-task-name-group {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.rt-task-name {
  font-weight: 600;
  font-size: 14px;
  word-break: break-all;
}
.rt-task-size {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.rt-status {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 12px;
  white-space: nowrap;
}
.status--pending   { background: #f0f0f0; color: #888; }
.status--running   { background: #e6f4ff; color: #1677ff; }
.status--paused    { background: #fff7e6; color: #fa8c16; }
.status--completed { background: #f6ffed; color: #52c41a; }
.status--failed    { background: #fff2f0; color: #ff4d4f; }
.status--cancelled { background: #f0f0f0; color: #999; }

.rt-progress-bar {
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}
.rt-progress-fill {
  height: 100%;
  background: #1677ff;
  border-radius: 3px;
  transition: width 0.3s ease;
}
.rt-progress-fill--failed {
  background: #ff4d4f;
}

.rt-task-info {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #888;
  margin-bottom: 8px;
}

.rt-chunk-bar {
  display: flex;
  gap: 2px;
  margin-bottom: 8px;
}
.rt-chunk-cell {
  flex: 1;
  height: 10px;
  background: #f0f0f0;
  border-radius: 2px;
  transition: background 0.2s;
  min-width: 4px;
}
.rt-chunk--completed    { background: #52c41a; }
.rt-chunk--transferring { background: #1677ff; animation: rt-pulse 1s infinite; }
.rt-chunk--failed       { background: #ff4d4f; }

@keyframes rt-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.rt-task-actions {
  display: flex;
  gap: 8px;
}
.btn--small {
  padding: 3px 12px;
  font-size: 12px;
}

.rt-log {
  max-height: 240px;
  overflow-y: auto;
  font-size: 12px;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  line-height: 1.8;
}
.rt-log-item {
  color: #555;
}

.rt-empty {
  color: #999;
  font-size: 13px;
  padding: 12px 0;
}
</style>
