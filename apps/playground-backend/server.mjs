/**
 * 断点续传后端服务
 *
 * 接口：
 *   POST /upload/check   — 按 MD5 查询是否可秒传
 *   POST /upload/chunk   — 上传单个分片（multipart: file + taskId + index + totalChunks + filename）
 *   POST /upload/merge   — 合并所有分片（json: taskId, filename, totalChunks, md5?）
 *   GET  /upload/status/:taskId — 查询已上传分片列表
 *   DELETE /upload/:taskId      — 清理分片临时文件
 *
 * 启动：node server.mjs
 */

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

const PORT = 3099
const UPLOAD_DIR = path.resolve('uploads')
const MD5_INDEX_PATH = path.join(UPLOAD_DIR, 'md5-index.json')

// 确保上传目录存在
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

/** @type {Map<string, { filename: string, size: number, path: string }>} */
const md5Index = loadMd5Index()

/** 从磁盘加载 MD5 索引。 */
function loadMd5Index() {
  try {
    if (!fs.existsSync(MD5_INDEX_PATH)) return new Map()
    const raw = fs.readFileSync(MD5_INDEX_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return new Map()
    return new Map(Object.entries(parsed))
  } catch {
    return new Map()
  }
}

/** 持久化 MD5 索引。 */
function saveMd5Index() {
  const obj = Object.fromEntries(md5Index.entries())
  fs.writeFileSync(MD5_INDEX_PATH, JSON.stringify(obj, null, 2), 'utf8')
}

/** 计算文件 MD5。 */
function hashFileMd5(filePath) {
  const hash = createHash('md5')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

/** 获取某个 taskId 的临时分片目录。 */
function chunkDir(taskId) {
  return path.join(UPLOAD_DIR, `chunks_${taskId}`)
}

/** 读取 request body（限 2MB JSON）。 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (buf) => {
      size += buf.length
      if (size > 2 * 1024 * 1024) { reject(new Error('Body too large')); req.destroy() }
      chunks.push(buf)
    })
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
      catch { reject(new Error('Invalid JSON')) }
    })
    req.on('error', reject)
  })
}

/**
 * 极简 multipart/form-data 解析器（仅处理单文件 + 文本字段）。
 * 返回 { fields: Record<string, string>, file?: { data: Buffer, filename: string } }
 */
async function parseMultipart(req) {
  const contentType = req.headers['content-type'] || ''
  const boundaryMatch = contentType.match(/boundary=(.+)/)
  if (!boundaryMatch) throw new Error('Missing boundary')
  const boundary = boundaryMatch[1]
  const delimiter = `--${boundary}`

  const body = await new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (buf) => {
      size += buf.length
      // 限制 50MB
      if (size > 50 * 1024 * 1024) { reject(new Error('Body too large')); req.destroy() }
      chunks.push(buf)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })

  const result = { fields: {}, file: undefined }
  const bodyStr = body.toString('binary')
  const parts = bodyStr.split(delimiter).slice(1) // 第一段是空的

  for (const part of parts) {
    if (part.startsWith('--')) break // closing boundary

    const headerEnd = part.indexOf('\r\n\r\n')
    if (headerEnd === -1) continue
    const headers = part.slice(0, headerEnd)
    const content = part.slice(headerEnd + 4, part.endsWith('\r\n') ? part.length - 2 : part.length)

    const nameMatch = headers.match(/name="([^"]+)"/)
    if (!nameMatch) continue
    const fieldName = nameMatch[1]

    const filenameMatch = headers.match(/filename="([^"]*)"/)
    if (filenameMatch) {
      // 这是文件字段 — 从原始 Buffer 中提取（避免 binary encoding 损坏）
      const headerEndBytes = Buffer.from(headers + '\r\n\r\n', 'binary').length
      const partStartInBody = body.indexOf(Buffer.from(delimiter, 'binary')) // 找到这个 part 在 body 中的偏移
      // 更简单的方法：直接从 binary string 转回 Buffer
      const fileData = Buffer.from(content, 'binary')
      result.file = { data: fileData, filename: filenameMatch[1], fieldName }
    } else {
      result.fields[fieldName] = content.trim()
    }
  }

  return result
}

/** CORS 头。 */
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

/** 发送 JSON 响应。 */
function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

// ─── 路由处理 ──────────────────────────────────────────

async function handleUploadCheck(req, res) {
  const body = await readJsonBody(req)
  const { md5, size, filename } = body

  if (!md5 || typeof md5 !== 'string') {
    return json(res, 400, { error: 'Missing md5' })
  }

  const normalizedMd5 = md5.toLowerCase()
  const hit = md5Index.get(normalizedMd5)

  if (!hit || !fs.existsSync(hit.path)) {
    if (hit) md5Index.delete(normalizedMd5)
    return json(res, 200, { exists: false, md5: normalizedMd5 })
  }

  if (size != null && Number(size) !== hit.size) {
    return json(res, 200, { exists: false, md5: normalizedMd5, reason: 'size-mismatch' })
  }

  console.log(`[check] md5 hit: ${normalizedMd5} file=${hit.filename}`)
  json(res, 200, {
    exists: true,
    md5: normalizedMd5,
    file: {
      filename: filename ?? hit.filename,
      size: hit.size,
      path: hit.path,
    },
  })
}

async function handleUploadChunk(req, res) {
  const { fields, file } = await parseMultipart(req)
  const { taskId, index, totalChunks, filename } = fields

  if (!taskId || index == null || !file) {
    return json(res, 400, { error: 'Missing taskId / index / file' })
  }

  const dir = chunkDir(taskId)
  fs.mkdirSync(dir, { recursive: true })

  const chunkPath = path.join(dir, `chunk_${String(index).padStart(6, '0')}`)
  fs.writeFileSync(chunkPath, file.data)

  console.log(`[chunk] taskId=${taskId} index=${index} size=${file.data.length}`)
  json(res, 200, { ok: true, taskId, index: Number(index), size: file.data.length })
}

async function handleUploadMerge(req, res) {
  const body = await readJsonBody(req)
  const { taskId, filename, totalChunks, md5 } = body

  if (!taskId || !filename) {
    return json(res, 400, { error: 'Missing taskId / filename' })
  }

  const dir = chunkDir(taskId)
  if (!fs.existsSync(dir)) {
    return json(res, 404, { error: 'No chunks found for this taskId' })
  }

  // 按文件名排序合并
  const chunkFiles = fs.readdirSync(dir)
    .filter(f => f.startsWith('chunk_'))
    .sort()

  const safeName = filename.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fa5]/g, '_')
  const outputPath = path.join(UPLOAD_DIR, `${taskId}_${safeName}`)
  const writeStream = fs.createWriteStream(outputPath)

  for (const cf of chunkFiles) {
    const data = fs.readFileSync(path.join(dir, cf))
    writeStream.write(data)
  }
  writeStream.end()

  await new Promise((resolve) => writeStream.on('finish', resolve))

  const stat = fs.statSync(outputPath)
  const serverMd5 = hashFileMd5(outputPath)

  if (md5 && typeof md5 === 'string' && md5.toLowerCase() !== serverMd5) {
    fs.rmSync(outputPath, { force: true })
    return json(res, 400, {
      error: 'MD5 mismatch after merge',
      expected: md5.toLowerCase(),
      actual: serverMd5,
    })
  }

  md5Index.set(serverMd5, {
    filename: safeName,
    size: stat.size,
    path: outputPath,
  })
  saveMd5Index()

  // 清理分片目录
  fs.rmSync(dir, { recursive: true, force: true })

  console.log(`[merge] taskId=${taskId} file=${safeName} size=${stat.size} md5=${serverMd5}`)
  json(res, 200, {
    ok: true,
    filename: safeName,
    size: stat.size,
    path: outputPath,
    md5: serverMd5,
    verified: Boolean(md5),
  })
}

async function handleUploadStatus(req, res, taskId) {
  const dir = chunkDir(taskId)
  if (!fs.existsSync(dir)) {
    return json(res, 200, { taskId, uploadedIndices: [] })
  }

  const indices = fs.readdirSync(dir)
    .filter(f => f.startsWith('chunk_'))
    .map(f => parseInt(f.replace('chunk_', ''), 10))
    .sort((a, b) => a - b)

  json(res, 200, { taskId, uploadedIndices: indices })
}

async function handleUploadDelete(req, res, taskId) {
  const dir = chunkDir(taskId)
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
  json(res, 200, { ok: true })
}

// ─── HTTP Server ──────────────────────────────────────

const server = http.createServer(async (req, res) => {
  setCors(res)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)
  const pathname = url.pathname

  try {
    // POST /upload/check
    if (req.method === 'POST' && pathname === '/upload/check') {
      return await handleUploadCheck(req, res)
    }
    // POST /upload/chunk
    if (req.method === 'POST' && pathname === '/upload/chunk') {
      return await handleUploadChunk(req, res)
    }
    // POST /upload/merge
    if (req.method === 'POST' && pathname === '/upload/merge') {
      return await handleUploadMerge(req, res)
    }
    // GET /upload/status/:taskId
    if (req.method === 'GET' && pathname.startsWith('/upload/status/')) {
      const taskId = pathname.split('/').pop()
      return await handleUploadStatus(req, res, taskId)
    }
    // DELETE /upload/:taskId
    if (req.method === 'DELETE' && pathname.startsWith('/upload/')) {
      const taskId = pathname.split('/').pop()
      return await handleUploadDelete(req, res, taskId)
    }

    json(res, 404, { error: 'Not found' })
  } catch (err) {
    console.error('[error]', err)
    json(res, 500, { error: err.message })
  }
})

server.listen(PORT, () => {
  console.log(`\n  Resumable upload server running at http://localhost:${PORT}\n`)
  console.log(`  Endpoints:`)
  console.log(`    POST   /upload/check          Check instant upload by MD5`)
  console.log(`    POST   /upload/chunk          Upload a chunk`)
  console.log(`    POST   /upload/merge          Merge all chunks`)
  console.log(`    GET    /upload/status/:taskId  Query uploaded chunks`)
  console.log(`    DELETE /upload/:taskId         Clean up chunks\n`)
})
