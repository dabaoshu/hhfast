<script setup lang="ts">
/**
 * @description ResumableTransfer 断点续传 Demo — 真实文件上传联调
 */
import { reactive, ref, onBeforeUnmount } from 'vue'
import {
  ResumableTransfer,
  computeFileMd5,
  type TransferTaskSnapshot,
  type ChunkTransferContext,
  type TransferProgressStore,
  type TransferTaskPersistSnapshot,
  type FileMd5Progress,
} from '@nnnb/hhfast-utils'

/** 上传 API；生产构建通过 VITE_API_BASE 指向 Render 等服务 */
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3099'
const CHUNK_SIZE = 2 * 1024 * 1024 // 2MB per chunk
const UPLOAD_RECORDS_KEY = 'hhfast-resumable-transfer-upload-records'

/** 可序列化的上传记录（不含 Blob，供 sessionStorage 持久化） */
interface UploadRecord {
  taskId: string
  filename: string
  size: number
  lastModified: number
  fileKey: string
  chunkSize: number
  totalChunks: number
  completedChunks: number
  completedChunkIndices: number[]
  progress: number
  status: TransferTaskSnapshot['status'] | 'merged'
  createdAt: number
  updatedAt: number
  mergedSize?: number
  md5?: string
}

/**
 * 从 sessionStorage 读取上传记录。
 */
function loadUploadRecords(): UploadRecord[] {
  try {
    const raw = sessionStorage.getItem(UPLOAD_RECORDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<UploadRecord>[]
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeUploadRecord)
  } catch {
    return []
  }
}

/**
 * 兼容旧版 session 记录，补齐断点续传所需字段。
 */
function normalizeUploadRecord(record: Partial<UploadRecord>): UploadRecord {
  const filename = record.filename ?? record.taskId ?? 'unknown'
  return {
    taskId: record.taskId ?? filename,
    filename,
    size: record.size ?? 0,
    lastModified: record.lastModified ?? 0,
    fileKey: record.fileKey ?? filename,
    chunkSize: record.chunkSize ?? CHUNK_SIZE,
    totalChunks: record.totalChunks ?? 0,
    completedChunks: record.completedChunks ?? 0,
    completedChunkIndices: record.completedChunkIndices ?? [],
    progress: record.progress ?? 0,
    status: record.status ?? 'pending',
    createdAt: record.createdAt ?? Date.now(),
    updatedAt: record.updatedAt ?? Date.now(),
    mergedSize: record.mergedSize,
    md5: record.md5,
  }
}

/**
 * 将上传记录写入 sessionStorage。
 */
function saveUploadRecords(records: UploadRecord[]): void {
  sessionStorage.setItem(UPLOAD_RECORDS_KEY, JSON.stringify(records))
}

/**
 * 由已合并记录还原 Merged Files 列表。
 */
function mergedFilesFromRecords(records: UploadRecord[]) {
  return records
    .filter((record) => record.status === 'merged')
    .map((record) => ({
      taskId: record.taskId,
      filename: record.filename,
      size: record.mergedSize ?? record.size,
      md5: record.md5,
    }))
}

/**
 * 生成文件唯一标识，用于刷新后匹配相同文件。
 */
function makeFileKey(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`
}

/**
 * 查询服务端已上传的分片索引。
 */
async function fetchUploadedIndices(taskId: string): Promise<number[]> {
  try {
    const resp = await fetch(`${API_BASE}/upload/status/${taskId}`)
    if (!resp.ok) return []
    const data = (await resp.json()) as { uploadedIndices?: number[] }
    return Array.isArray(data.uploadedIndices) ? data.uploadedIndices : []
  } catch {
    return []
  }
}

/** 判断是否可断点续传。 */
function isResumableRecord(record: UploadRecord): boolean {
  return record.status !== 'merged'
    && record.status !== 'cancelled'
    && record.completedChunks < record.totalChunks
}

/**
 * Demo 用进度存储：内存快照 + 同步 session 记录（不含 Blob）。
 */
class DemoTransferProgressStore implements TransferProgressStore {
  private readonly snapshots = new Map<string, TransferTaskPersistSnapshot>()
  private readonly onPersist: (snapshot: TransferTaskPersistSnapshot) => void

  constructor(onPersist: (snapshot: TransferTaskPersistSnapshot) => void) {
    this.onPersist = onPersist
  }

  /** 写入一次性恢复快照（重选相同文件时使用）。 */
  seed(snapshot: TransferTaskPersistSnapshot): void {
    this.snapshots.set(snapshot.id, snapshot)
  }

  async save(_taskId: string, snapshot: TransferTaskPersistSnapshot): Promise<void> {
    this.snapshots.set(snapshot.id, snapshot)
    this.onPersist(snapshot)
  }

  async load(taskId: string): Promise<TransferTaskPersistSnapshot | undefined> {
    return this.snapshots.get(taskId)
  }

  async remove(taskId: string): Promise<void> {
    this.snapshots.delete(taskId)
  }

  async loadAll(): Promise<TransferTaskPersistSnapshot[]> {
    return [...this.snapshots.values()]
  }
}

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

/** 由持久化快照同步 session 上传记录。 */
function syncRecordFromPersistSnapshot(snapshot: TransferTaskPersistSnapshot) {
  const metadata = snapshot.metadata ?? {}
  const completedChunkIndices = snapshot.chunks
    .filter((chunk) => chunk.status === 'completed')
    .map((chunk) => chunk.index)

  upsertUploadRecord({
    taskId: snapshot.id,
    filename: snapshot.name ?? snapshot.id,
    size: (metadata.size as number) ?? 0,
    lastModified: (metadata.lastModified as number) ?? 0,
    fileKey: (metadata.fileKey as string) ?? makeFileKeyFromMeta(snapshot.name ?? '', metadata),
    chunkSize: (metadata.chunkSize as number) ?? CHUNK_SIZE,
    totalChunks: snapshot.totalCount,
    completedChunks: snapshot.completedCount,
    completedChunkIndices,
    progress: snapshot.totalCount > 0 ? snapshot.completedCount / snapshot.totalCount : 0,
    status: snapshot.status,
    createdAt: snapshot.createdAt,
  })
}

/** 从元数据还原 fileKey（兼容旧记录）。 */
function makeFileKeyFromMeta(name: string, metadata: Record<string, unknown>): string {
  const size = metadata.size as number | undefined
  const lastModified = metadata.lastModified as number | undefined
  if (size != null && lastModified != null) {
    return `${name}|${size}|${lastModified}`
  }
  return name
}

const progressStore = new DemoTransferProgressStore(syncRecordFromPersistSnapshot)

const transfer = new ResumableTransfer({
  concurrency: 3,
  maxRetries: 3,
  storage: progressStore,
})

// ─── 响应式状态 ──────────────────────────────────────

const state = reactive({
  tasks: [] as TransferTaskSnapshot[],
  log: [] as string[],
  mergedFiles: [] as Array<{ taskId: string; filename: string; size: number; md5?: string }>,
  uploadRecords: loadUploadRecords(),
  hashing: null as { filename: string; progress: FileMd5Progress } | null,
})

const fileInput = ref<HTMLInputElement>()

/** 限速预设（KB/s），0 表示不限速 */
const SPEED_PRESETS = [
  { label: '不限速', value: 0 },
  { label: '2 MB/s', value: 2048 },
  { label: '512 KB/s', value: 512 },
  { label: '128 KB/s', value: 128 },
  { label: '32 KB/s', value: 32 },
] as const

/** 当前上传速度上限（KB/s），0 为不限速 */
const uploadSpeedKBps = ref(0)

/**
 * 格式化速度上限展示文案。
 */
function formatSpeedLimit(kbps: number): string {
  if (kbps <= 0) return '不限速'
  if (kbps >= 1024) {
    const mbps = kbps / 1024
    return `${Number.isInteger(mbps) ? mbps : mbps.toFixed(1)} MB/s`
  }
  return `${kbps} KB/s`
}

/**
 * 按目标速率等待，用于模拟慢速上传。
 */
async function waitForSpeedLimit(bytes: number, signal: AbortSignal): Promise<void> {
  const kbps = uploadSpeedKBps.value
  if (kbps <= 0) return

  const delayMs = Math.ceil((bytes / (kbps * 1024)) * 1000)
  if (delayMs <= 0) return

  await delayWithAbort(delayMs, signal)
}

/**
 * 可被取消的延时。
 */
function delayWithAbort(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
      return
    }

    const timer = window.setTimeout(() => resolve(), ms)
    signal.addEventListener('abort', () => {
      window.clearTimeout(timer)
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

/** 新建或更新一条上传记录并持久化。 */
function upsertUploadRecord(record: Omit<UploadRecord, 'createdAt' | 'updatedAt'> & Partial<Pick<UploadRecord, 'createdAt'>>) {
  const now = Date.now()
  const index = state.uploadRecords.findIndex((item) => item.taskId === record.taskId)

  if (index >= 0) {
    state.uploadRecords[index] = {
      ...state.uploadRecords[index],
      ...record,
      updatedAt: now,
    }
  } else {
    state.uploadRecords.push({
      ...record,
      createdAt: record.createdAt ?? now,
      updatedAt: now,
    })
  }

  saveUploadRecords(state.uploadRecords)
  state.mergedFiles = mergedFilesFromRecords(state.uploadRecords)
}

/** 删除一条上传记录。 */
function removeUploadRecord(taskId: string) {
  state.uploadRecords = state.uploadRecords.filter((item) => item.taskId !== taskId)
  saveUploadRecords(state.uploadRecords)
  state.mergedFiles = mergedFilesFromRecords(state.uploadRecords)
}

/** 清空当前会话的上传记录。 */
function clearUploadRecords() {
  state.uploadRecords = []
  saveUploadRecords(state.uploadRecords)
  state.mergedFiles = []
}

/** 将内存中的任务快照同步到 session 记录。 */
function syncUploadRecordsFromTasks() {
  for (const task of state.tasks) {
    const metadata = task.metadata ?? {}
    const completedChunkIndices = task.chunks
      .filter((chunk) => chunk.status === 'completed')
      .map((chunk) => chunk.index)

    upsertUploadRecord({
      taskId: task.id,
      filename: task.name ?? task.id,
      size: (metadata.size as number) ?? 0,
      lastModified: (metadata.lastModified as number) ?? 0,
      fileKey: (metadata.fileKey as string) ?? makeFileKeyFromMeta(task.name ?? task.id, metadata),
      chunkSize: (metadata.chunkSize as number) ?? CHUNK_SIZE,
      totalChunks: task.totalCount,
      completedChunks: task.completedCount,
      completedChunkIndices,
      progress: task.progress,
      status: task.status,
      createdAt: task.createdAt,
    })
  }
}

state.mergedFiles = mergedFilesFromRecords(state.uploadRecords)

function refreshTasks() {
  state.tasks = transfer.getAllTasks()
  syncUploadRecordsFromTasks()
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

/**
 * 查询服务端是否已有相同 MD5 文件（秒传）。
 */
async function checkInstantUpload(md5: string, file: File): Promise<{
  exists: boolean
  file?: { filename: string; size: number }
}> {
  try {
    const resp = await fetch(`${API_BASE}/upload/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        md5,
        size: file.size,
        filename: file.name,
      }),
    })
    if (!resp.ok) return { exists: false }
    const data = await resp.json() as {
      exists?: boolean
      file?: { filename: string; size: number }
    }
    return {
      exists: Boolean(data.exists),
      file: data.file,
    }
  } catch {
    return { exists: false }
  }
}

/**
 * 在 Worker 中计算整文件 MD5，并更新 UI 进度。
 */
async function hashFileBeforeUpload(file: File): Promise<string> {
  state.hashing = {
    filename: file.name,
    progress: { loaded: 0, total: file.size, ratio: 0 },
  }
  addLog(`Hashing: ${file.name} (Worker)`)

  try {
    const md5 = await computeFileMd5(file, {
      onProgress: (progress) => {
        if (state.hashing?.filename === file.name) {
          state.hashing.progress = progress
        }
      },
    })
    addLog(`MD5 ready: ${file.name} → ${md5}`)
    return md5
  } finally {
    if (state.hashing?.filename === file.name) {
      state.hashing = null
    }
  }
}

// ─── 上传分片函数 ────────────────────────────────────

async function uploadChunk(ctx: ChunkTransferContext<FileChunk>): Promise<void> {
  const { taskId, chunk, signal } = ctx
  const task = transfer.getTask(taskId)

  await waitForSpeedLimit(chunk.blob.size, signal)

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

async function mergeChunks(
  taskId: string,
  filename: string,
  totalChunks: number,
  md5?: string,
): Promise<void> {
  const resp = await fetch(`${API_BASE}/upload/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, filename, totalChunks, md5 }),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Merge failed: ${resp.status} ${text}`)
  }

  const data = await resp.json()
  upsertUploadRecord({
    taskId,
    filename: data.filename ?? filename,
    size: (transfer.getTask(taskId)?.metadata?.size as number) ?? data.size ?? 0,
    totalChunks,
    completedChunks: totalChunks,
    progress: 1,
    status: 'merged',
    mergedSize: data.size,
    md5: data.md5 ?? md5,
  })
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
    const md5 = s.metadata?.md5 as string | undefined
    mergeChunks(s.id, s.name ?? 'unknown', s.totalCount, md5)
      .then(() => addLog(`Merged: ${s.name ?? s.id}${md5 ? ` (MD5 verified)` : ''}`))
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

  void (async () => {
    for (const file of files) {
      await createOrResumeUpload(file)
    }
    refreshTasks()
  })()

  input.value = ''
}

/**
 * 创建新上传任务，或在刷新后重选相同文件时断点续传。
 */
async function createOrResumeUpload(file: File) {
  const fileKey = makeFileKey(file)
  const md5 = await hashFileBeforeUpload(file)
  const instant = await checkInstantUpload(md5, file)

  if (instant.exists) {
    const taskId = `instant_${md5.slice(0, 12)}`
    addLog(`Instant upload hit: ${file.name} (MD5 ${md5})`)
    upsertUploadRecord({
      taskId,
      filename: instant.file?.filename ?? file.name,
      size: file.size,
      lastModified: file.lastModified,
      fileKey,
      chunkSize: CHUNK_SIZE,
      totalChunks: 0,
      completedChunks: 0,
      completedChunkIndices: [],
      progress: 1,
      status: 'merged',
      mergedSize: instant.file?.size ?? file.size,
      md5,
    })
    return
  }

  const chunks = sliceFile(file)
  const resumableRecord = state.uploadRecords.find(
    (record) => record.fileKey === fileKey
      && record.chunkSize === CHUNK_SIZE
      && record.totalChunks === chunks.length
      && isResumableRecord(record),
  )

  if (resumableRecord && !transfer.getTask(resumableRecord.taskId)) {
    const serverIndices = await fetchUploadedIndices(resumableRecord.taskId)
    const completedSet = new Set([
      ...resumableRecord.completedChunkIndices,
      ...serverIndices,
    ])
    const completedCount = chunks.filter((chunk) => completedSet.has(chunk.index)).length

    if (completedCount >= chunks.length) {
      addLog(`All chunks already uploaded: ${file.name} — merging...`)
      upsertUploadRecord({
        taskId: resumableRecord.taskId,
        filename: file.name,
        size: file.size,
        lastModified: file.lastModified,
        fileKey,
        chunkSize: CHUNK_SIZE,
        totalChunks: chunks.length,
        completedChunks: chunks.length,
        completedChunkIndices: chunks.map((chunk) => chunk.index),
        progress: 1,
        status: 'completed',
        createdAt: resumableRecord.createdAt,
      })
      await mergeChunks(resumableRecord.taskId, file.name, chunks.length, resumableRecord.md5 ?? md5)
        .then(() => addLog(`Merged: ${file.name}`))
        .catch((err: Error) => addLog(`Merge error: ${err.message}`))
      return
    }

    const snapshot: TransferTaskPersistSnapshot = {
      id: resumableRecord.taskId,
      name: file.name,
      status: 'paused',
      chunks: chunks.map((chunk) => ({
        index: chunk.index,
        data: chunk,
        status: completedSet.has(chunk.index) ? 'completed' : 'pending',
        attempts: 0,
      })),
      completedCount,
      totalCount: chunks.length,
      createdAt: resumableRecord.createdAt,
      metadata: {
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        fileKey,
        chunkSize: CHUNK_SIZE,
        md5,
      },
    }

    progressStore.seed(snapshot)
    const restored = await transfer.restoreTask(resumableRecord.taskId, uploadChunk)
    if (restored) {
      transfer.start(resumableRecord.taskId)
      addLog(
        `Resumed: ${file.name} (${completedCount}/${chunks.length} chunks already uploaded)`,
      )
      syncRecordFromPersistSnapshot(snapshot)
      return
    }
  }

  if (resumableRecord && transfer.getTask(resumableRecord.taskId)) {
    addLog(`Task already active: ${file.name}`)
    return
  }

  const taskId = transfer.create({
    name: file.name,
    chunks,
    transferFn: uploadChunk,
    autoStart: true,
    metadata: {
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      fileKey,
      chunkSize: CHUNK_SIZE,
      md5,
    },
  })

  upsertUploadRecord({
    taskId,
    filename: file.name,
    size: file.size,
    lastModified: file.lastModified,
    fileKey,
    chunkSize: CHUNK_SIZE,
    totalChunks: chunks.length,
    completedChunks: 0,
    completedChunkIndices: [],
    progress: 0,
    status: 'pending',
    md5,
  })

  addLog(`Created: ${file.name} (${formatSize(file.size)}, ${chunks.length} chunks, MD5 ${md5})`)
}

function pauseTask(id: string) { transfer.pause(id) }
function startTask(id: string) { transfer.start(id) }
function cancelTask(id: string) { transfer.cancel(id) }
function retryTask(id: string) { transfer.retry(id) }
function removeTask(id: string) {
  transfer.removeTask(id)
  removeUploadRecord(id)
  refreshTasks()
}

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
      真实文件断点续传演示。上传前在 <strong>Web Worker</strong> 中计算整文件 MD5，用于秒传查重与合并后校验。
      上传 API：<code>{{ API_BASE }}</code>。
      本地后端：<code>pnpm --filter @nnnb/hhfast-playground-backend dev</code>
    </p>

    <!-- 选择文件 -->
    <div class="pg-card">
      <h3>Select File</h3>
      <p class="pg-card-desc">
        选择文件后先在 Worker 中计算 MD5，再检查秒传；未命中则分片（每片 <code>{{ formatSize(CHUNK_SIZE) }}</code>）上传。支持多选。
        刷新页面后重新选择<strong>相同文件</strong>（文件名、大小、修改时间一致）可断点续传。
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

      <div v-if="state.hashing" class="rt-hash-panel">
        <div class="rt-hash-header">
          <span>Computing MD5: {{ state.hashing.filename }}</span>
          <span>{{ (state.hashing.progress.ratio * 100).toFixed(1) }}%</span>
        </div>
        <div class="rt-progress-bar">
          <div
            class="rt-progress-fill rt-progress-fill--hash"
            :style="{ width: (state.hashing.progress.ratio * 100) + '%' }"
          />
        </div>
        <p class="rt-hash-hint">
          {{ formatSize(state.hashing.progress.loaded) }} / {{ formatSize(state.hashing.progress.total) }}
          — 在 Worker 中计算，不阻塞页面交互
        </p>
      </div>

      <div class="rt-speed-control">
        <div class="rt-speed-header">
          <span class="rt-speed-label">Upload Speed Limit</span>
          <span class="rt-speed-value">{{ formatSpeedLimit(uploadSpeedKBps) }}</span>
        </div>
        <input
          v-model.number="uploadSpeedKBps"
          class="rt-speed-slider"
          type="range"
          min="0"
          max="4096"
          step="32"
        />
        <div class="rt-speed-presets">
          <button
            v-for="preset in SPEED_PRESETS"
            :key="preset.label"
            type="button"
            class="btn btn--small"
            :class="{ 'rt-speed-preset--active': uploadSpeedKBps === preset.value }"
            @click="uploadSpeedKBps = preset.value"
          >
            {{ preset.label }}
          </button>
        </div>
        <p class="rt-speed-hint">
          通过分片上传前的等待时间模拟网络限速，便于观察断点续传与进度变化。
        </p>
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
            <span v-if="task.metadata?.md5" class="rt-task-md5" :title="String(task.metadata.md5)">
              MD5 {{ String(task.metadata.md5).slice(0, 8) }}…
            </span>
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
      <div class="rt-card-header">
        <h3>Merged Files</h3>
        <button class="btn btn--small" type="button" @click="clearUploadRecords">
          Clear Session Records
        </button>
      </div>
      <table class="pg-table">
        <thead>
          <tr><th>Filename</th><th>Size</th><th>MD5</th></tr>
        </thead>
        <tbody>
          <tr v-for="f in state.mergedFiles" :key="f.taskId">
            <td>{{ f.filename }}</td>
            <td>{{ formatSize(f.size) }}</td>
            <td class="rt-md5-cell">{{ f.md5 ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 会话上传记录 -->
    <div v-if="state.uploadRecords.length > 0" class="pg-card">
      <h3>Session Upload Records</h3>
      <p class="pg-card-desc">
        当前浏览器标签页的上传记录，保存在 <code>sessionStorage</code>。
        刷新后重选相同文件时会结合服务端分片状态继续上传。
      </p>
      <table class="pg-table">
        <thead>
          <tr>
            <th>Filename</th>
            <th>Status</th>
            <th>Progress</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in state.uploadRecords" :key="record.taskId">
            <td>{{ record.filename }}</td>
            <td>
              <span class="rt-status" :class="statusClass(record.status === 'merged' ? 'completed' : record.status)">
                {{ record.status === 'merged' ? 'Merged' : statusLabel(record.status) }}
              </span>
            </td>
            <td>{{ record.completedChunks }}/{{ record.totalChunks }} ({{ (record.progress * 100).toFixed(1) }}%)</td>
            <td>{{ new Date(record.updatedAt).toLocaleTimeString() }}</td>
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
.rt-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.rt-card-header h3 {
  margin: 0;
}

.rt-speed-control {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.rt-hash-panel {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
}

.rt-hash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #389e0d;
}

.rt-hash-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: #666;
}

.rt-progress-fill--hash {
  background: #52c41a;
}

.rt-task-md5 {
  font-size: 11px;
  color: #8c8c8c;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
}

.rt-md5-cell {
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  word-break: break-all;
}

.rt-speed-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.rt-speed-label {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.rt-speed-value {
  font-size: 12px;
  font-weight: 600;
  color: #1677ff;
}

.rt-speed-slider {
  width: 100%;
  margin: 0;
  accent-color: #1677ff;
}

.rt-speed-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.rt-speed-preset--active {
  background: #e8f0fe;
  color: #1677ff;
  border-color: #91caff;
}

.rt-speed-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: #999;
  line-height: 1.6;
}

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
