<script setup lang="ts">
/**
 * WorksChain Demo — 可视化行为动作观测
 *
 * 场景：模拟一个"用户行为录制与回放分析"系统
 * - 输入：用户行为序列（如点击按钮、输入文本、发起请求）
 * - 追踪：task-execution-chain 追踪每个行为的执行链路
 * - 解析：curl-parser 解析行为中的 HTTP 调用
 * - 结构化：json-to-tree 将行为数据展示为树结构
 * - 对比：ChainDiffer 对比不同行为版本的链路差异
 */
import { computed, reactive, ref } from 'vue'
import {
  ChainDiffer,
  TraceAll,
  TraceCall,
  TraceEnter,
  TraceVar,
  createTraceVariable,
  getLastTraceResult,
  type ChainDiffResult,
  type TaskExecutionEdge,
  type TaskExecutionNode,
  type TaskExecutionRenderResult,
} from '@/index' 

// 装饰器写法示例（Class & Method & Property 装饰器）
// 注意：需在 tsconfig.json 中开启 experimentalDecorators: true  
// 并配置 @babel/plugin-proposal-decorators (legacy 模式)
import { jsonToTree, type JsonTreeNode } from '@/index'
import {
  parseCurlCommand,
  toFlatTableRows,
  type ParsedCurlRequest,
  type CurlTableRow,
} from '@nnnb/hhfast-utils'

// ─────────────────────────────────────────────────────────────
// 行为定义类型
// ─────────────────────────────────────────────────────────────

interface BehaviorInput {
  type: 'http' | 'form' | 'transform'
  /** HTTP 场景：curl 命令 */
  curl?: string
  /** Form 场景：JSON 表单数据 */
  formJson?: string
  /** Transform 场景：JSON 源数据 */
  sourceJson?: string
}

interface BehaviorRunRecord {
  seq: number
  at: string
  input: BehaviorInput
  note: string
  snapshot: TaskExecutionRenderResult
}

// ─────────────────────────────────────────────────────────────
// 行为模拟服务（带 Trace 追踪）
// ─────────────────────────────────────────────────────────────

@TraceAll({ namePrefix: 'BehaviorSimulator', exclude: [] })
class BehaviorSimulator {
  @TraceVar({ name: 'requestCount' })
  requestCount = 0

  private _status = 'idle'
  get status(): string { return this._status }
  set status(v: string) { this._status = v }

  /**
   * @description 执行用户行为
   */
  @TraceEnter<BehaviorInput>({
    name: 'executeBehavior',
    type: 'entry',
    input: (args) => args[0] as BehaviorInput,
  })
  async executeBehavior(input: BehaviorInput): Promise<unknown> {
    this.requestCount = this.requestCount + 1
    this.status = 'running'
    const localSeq = createTraceVariable(this, 0, 'localSeq')
    localSeq.set(localSeq.get() + 1)

    if (input.type === 'http' && input.curl) {
      const parsed = parseCurlCommand(input.curl)
      await this.simulateNetwork(parsed)
      return { ok: true, parsedUrl: parsed.url, method: parsed.method }
    }
    else if (input.type === 'form' && input.formJson) {
      const data = JSON.parse(input.formJson)
      await this.validateForm(data)
      return { ok: true, recordCount: Array.isArray(data) ? data.length : 1 }
    }
    else if (input.type === 'transform' && input.sourceJson) {
      const data = JSON.parse(input.sourceJson)
      const tree = jsonToTree(data, { rootLabel: 'root' })
      await this.processTree(tree)
      return { ok: true, nodeCount: this.countNodes(tree) }
    }

    throw new Error('unknown behavior type')
  }

  @TraceCall({ name: 'simulateNetwork', type: 'internal' })
  private async simulateNetwork(req: ParsedCurlRequest): Promise<void> {
    await new Promise(r => setTimeout(r, 30))
    console.log(`[SimulateNetwork] ${req.method} ${req.url}`)
  }

  @TraceCall({ name: 'validateForm', type: 'internal' })
  private async validateForm(data: unknown): Promise<void> {
    await new Promise(r => setTimeout(r, 20))
    console.log('[ValidateForm]', data)
  }

  @TraceCall({ name: 'processTree', type: 'internal' })
  private async processTree(tree: JsonTreeNode): Promise<void> {
    await new Promise(r => setTimeout(r, 15))
    console.log('[ProcessTree]', tree.label)
  }

  private countNodes(node: JsonTreeNode): number {
    let count = 1
    node.children?.forEach(c => { count += this.countNodes(c) })
    return count
  }
}

const service = new BehaviorSimulator()

// ─────────────────────────────────────────────────────────────
// 视图状态
// ─────────────────────────────────────────────────────────────

const behaviorType = ref<BehaviorInput['type']>('http')
const httpInput = ref(`curl 'https://api.example.com/behavior/track' \\
  -X POST \\
  -H 'Content-Type: application/json' \\
  -H 'X-Track-Id: $trackId' \\
  -d '{"event":"click","element":"btn-submit","timestamp":1712000000}'`)

const formInput = ref(`{
  "username": "alice",
  "email": "alice@example.com",
  "actions": [
    { "type": "input", "field": "search", "value": "hello" },
    { "type": "click", "element": "#search-btn" }
  ]
}`)

const transformInput = ref(`{
  "behaviors": [
    { "id": 1, "event": "page_view", "path": "/home", "duration": 3200 },
    { "id": 2, "event": "click", "path": "/home", "element": "#banner", "value": "ad_1" },
    { "id": 3, "event": "page_view", "path": "/product", "duration": 8500 }
  ],
  "sessionId": "sess-abc123",
  "userId": 1001
}`)

const behaviorNote = ref('')
const lastError = ref('')
const isRunning = ref(false)
const selectedNodeId = ref('')

const currentBehaviorInput = computed<BehaviorInput>(() => {
  if (behaviorType.value === 'http') return { type: 'http', curl: httpInput.value }
  if (behaviorType.value === 'form') return { type: 'form', formJson: formInput.value }
  return { type: 'transform', sourceJson: transformInput.value }
})

const state = reactive<{ result: TaskExecutionRenderResult }>({
  result: { nodes: [], edges: [], mermaid: 'flowchart TD' },
})

const runRecords = ref<BehaviorRunRecord[]>([])
let runSeq = 0

// ChainDiffer 状态
const baselineSnapshot = ref<TaskExecutionRenderResult | null>(null)
const differOptions = reactive({ ignoreTiming: true, ignoreOutput: false, ignoreErrors: false })
const compareBeforeSeq = ref('')
const compareAfterSeq = ref('')

const cloneResult = (r: TaskExecutionRenderResult): TaskExecutionRenderResult => structuredClone(r)

const captureBaseline = (): void => {
  if (state.result.nodes.length === 0) { lastError.value = '请先执行一次行为'; return }
  baselineSnapshot.value = cloneResult(state.result)
}

const clearBaseline = (): void => { baselineSnapshot.value = null }

const baselineDiff = computed<ChainDiffResult | null>(() => {
  if (!baselineSnapshot.value) return null
  return new ChainDiffer(differOptions).compare(baselineSnapshot.value, state.result)
})

const recordsDiff = computed<ChainDiffResult | null>(() => {
  const l = Number(compareBeforeSeq.value)
  const r = Number(compareAfterSeq.value)
  if (!l || !r || l === r) return null
  const before = runRecords.value.find(x => x.seq === l)
  const after = runRecords.value.find(x => x.seq === r)
  if (!before?.snapshot || !after?.snapshot) return null
  return new ChainDiffer(differOptions).compare(before.snapshot, after.snapshot)
})

const displayDiff = computed<ChainDiffResult | null>(() =>
  !compareBeforeSeq.value ? baselineDiff.value : recordsDiff.value,
)

const diffSubtitle = computed(() => {
  if (!compareBeforeSeq.value) return '基准快照 → 当前画布'
  return `记录 #${compareBeforeSeq.value} → #${compareAfterSeq.value}`
})

// 当前行为结果的 curl 解析结果
const curlParsed = computed<ParsedCurlRequest | null>(() => {
  if (behaviorType.value !== 'http') return null
  try { return parseCurlCommand(httpInput.value) }
  catch { return null }
})

const curlFlatRows = computed<CurlTableRow[]>(() => {
  if (!curlParsed.value) return []
  return toFlatTableRows(curlParsed.value)
})

// 当前行为结果的 json 树
const behaviorTreeResult = computed<JsonTreeNode | null>(() => {
  const input = currentBehaviorInput.value
  try {
    if (input.type === 'form' && input.formJson) {
      return jsonToTree(JSON.parse(input.formJson), { rootLabel: 'formData' })
    }
    if (input.type === 'transform' && input.sourceJson) {
      return jsonToTree(JSON.parse(input.sourceJson), { rootLabel: 'sourceData' })
    }
    if (input.type === 'http' && input.curl) {
      return jsonToTree(parseCurlCommand(input.curl), { rootLabel: 'httpRequest' })
    }
  }
  catch { /* ignore */ }
  return null
})

const selectedNode = computed(() => state.result.nodes.find(n => n.id === selectedNodeId.value))

const nodeCount = computed(() => {
  const root = behaviorTreeResult.value
  if (!root) return 0
  let count = 0
  const walk = (n: JsonTreeNode): void => { count++; n.children?.forEach(walk) }
  walk(root)
  return count
})

const edgeLabel = (edge: TaskExecutionEdge): string => {
  const l = edge.label ? ` [${edge.label}]` : ''
  return `${edge.from} → ${edge.to}${l}`
}

const pretty = (v: unknown): string => {
  if (v === undefined) return '-'
  try { return JSON.stringify(v, null, 2) }
  catch { return String(v) }
}

const durationText = (node: TaskExecutionNode): string => {
  if (typeof node.startedAt !== 'number' || typeof node.finishedAt !== 'number') return '-'
  return `${Math.max(0, node.finishedAt - node.startedAt)}ms`
}

const parseInput = (): BehaviorInput | null => {
  const input = currentBehaviorInput.value
  if (input.type === 'http' && input.curl) {
    try { parseCurlCommand(input.curl) } catch (e) { lastError.value = e instanceof Error ? e.message : String(e); return null }
  }
  if (input.type === 'form' && input.formJson) {
    try { JSON.parse(input.formJson) } catch (e) { lastError.value = e instanceof Error ? e.message : String(e); return null }
  }
  if (input.type === 'transform' && input.sourceJson) {
    try { JSON.parse(input.sourceJson) } catch (e) { lastError.value = e instanceof Error ? e.message : String(e); return null }
  }
  return input
}

const runBehavior = async (): Promise<void> => {
  const input = parseInput()
  if (!input) return
  lastError.value = ''
  isRunning.value = true
  try {
    await service.executeBehavior(input)
  }
  catch (e) {
    lastError.value = e instanceof Error ? e.message : String(e)
  }
  finally { isRunning.value = false }

  const result = getLastTraceResult(service)
  if (!result) return
  state.result = result
  selectedNodeId.value = result.nodes[0]?.id ?? ''
  if (lastError.value) return

  runRecords.value = [
    { seq: ++runSeq, at: new Date().toISOString(), input: { ...input }, note: behaviorNote.value.trim(), snapshot: cloneResult(result) },
    ...runRecords.value,
  ].slice(0, 80)
}

const clearRecords = (): void => { runRecords.value = []; compareBeforeSeq.value = ''; compareAfterSeq.value = '' }

const setCompareBefore = (seq: number): void => { compareBeforeSeq.value = String(seq) }
const setCompareAfter = (seq: number): void => { compareAfterSeq.value = String(seq) }

const recordLabel = (row: BehaviorRunRecord): string => {
  const tail = row.note ? ` · ${row.note}` : ''
  return `#${row.seq} · ${row.input.type}${tail}`
}

const formatTime = (iso: string): string => {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return iso
  return new Date(t).toLocaleString('zh-CN', { hour12: false })
}

const markdownMermaid = computed(() => ['```mermaid', state.result.mermaid, '```'].join('\n'))
const copyMermaid = async (): Promise<void> => {
  try { await navigator.clipboard.writeText(markdownMermaid.value) }
  catch (e) { lastError.value = e instanceof Error ? e.message : String(e) }
}

// diff 辅助
const diffMarkMap = computed<Record<string, string>>(() => {
  const diff = displayDiff.value
  if (!diff?.nodeDiffs?.length) return {}
  return diff.nodeDiffs.reduce((acc, item) => { acc[item.id] = item.type; return acc }, {})
})

const mainBeforeNodes = computed(() =>
  (baselineSnapshot.value?.nodes ?? []).map(n => ({ node: n, mark: diffMarkMap.value[n.id] ?? 'unchanged' })),
)
const mainAfterNodes = computed(() =>
  state.result.nodes.map(n => ({ node: n, mark: diffMarkMap.value[n.id] ?? 'unchanged' })),
)

const diffHint = computed(() => {
  if (!compareBeforeSeq.value && !baselineSnapshot.value) return '执行行为后点击「设为基准」可对比链路差异'
  if (runRecords.value.length < 2) return '至少需要两条运行记录做对比'
  if (!compareBeforeSeq.value || !compareAfterSeq.value) return '选择两条记录进行对比'
  if (compareBeforeSeq.value === compareAfterSeq.value) return '选择两条不同的记录'
  return null
})
</script>

<template>
  <section class="works-chain-demo">
    <h2 class="works-chain-demo__title">行为动作观测（WorksChain）</h2>
    <p class="works-chain-demo__desc">
      模拟用户行为（HTTP 请求、表单提交、数据转换），结合
      <strong>TaskExecutionChain</strong> 追踪执行链路、
      <strong>CurlParser</strong> 解析 HTTP 行为、
      <strong>JsonToTree</strong> 结构化行为数据。
      支持 ChainDiffer 对比不同行为版本的链路差异。
    </p>

    <!-- 执行参数 -->
    <div class="panel param-panel">
      <h3 class="panel__title">行为输入</h3>
      <div class="behavior-type-tabs">
        <button type="button" class="bt-tab" :class="{ 'bt-tab--active': behaviorType === 'http' }"
          @click="behaviorType = 'http'">HTTP 请求</button>
        <button type="button" class="bt-tab" :class="{ 'bt-tab--active': behaviorType === 'form' }"
          @click="behaviorType = 'form'">表单提交流程</button>
        <button type="button" class="bt-tab" :class="{ 'bt-tab--active': behaviorType === 'transform' }"
          @click="behaviorType = 'transform'">数据转换</button>
      </div>

      <!-- HTTP 输入 -->
      <div v-if="behaviorType === 'http'" class="behavior-input-area">
        <textarea v-model="httpInput" class="behavior-textarea mono" spellcheck="false"
          placeholder="输入 curl 命令" />
      </div>

      <!-- Form 输入 -->
      <div v-else-if="behaviorType === 'form'" class="behavior-input-area">
        <textarea v-model="formInput" class="behavior-textarea mono" spellcheck="false"
          placeholder="输入 JSON 表单数据" />
      </div>

      <!-- Transform 输入 -->
      <div v-else class="behavior-input-area">
        <textarea v-model="transformInput" class="behavior-textarea mono" spellcheck="false"
          placeholder="输入 JSON 源数据" />
      </div>

      <div class="run-row">
        <input v-model="behaviorNote" class="run-row__note" type="text" maxlength="120"
          placeholder="备注（写入记录）" />
        <button type="button" class="btn btn--primary" :disabled="isRunning" @click="runBehavior">
          {{ isRunning ? '执行中…' : '执行行为' }}
        </button>
      </div>
      <p v-if="lastError" class="error">{{ lastError }}</p>
    </div>

    <!-- 行为数据预览（三栏） -->
    <div class="panel behavior-preview">
      <h3 class="panel__title">行为数据预览</h3>
      <div class="preview-grid">
        <!-- HTTP 解析结果 -->
        <div v-if="behaviorType === 'http'" class="preview-col">
          <h4 class="preview-col__title">HTTP 解析</h4>
          <div v-if="curlParsed" class="summary-grid">
            <div class="summary-item"><span class="summary-item__label">Method</span><span class="mono">{{ curlParsed.method }}</span></div>
            <div class="summary-item"><span class="summary-item__label">URL</span><span class="mono">{{ curlParsed.url || '-' }}</span></div>
            <div class="summary-item"><span class="summary-item__label">Path</span><span class="mono">{{ curlParsed.path }}</span></div>
            <div class="summary-item"><span class="summary-item__label">Body Type</span><span class="mono">{{ curlParsed.body.type }}</span></div>
          </div>
          <div class="table-wrap" style="margin-top:8px">
            <table class="result-table">
              <thead><tr><th>section</th><th>key</th><th>value</th></tr></thead>
              <tbody>
                <tr v-for="(row, i) in curlFlatRows" :key="i">
                  <td class="mono">{{ row.section }}</td>
                  <td class="mono">{{ row.key }}</td>
                  <td class="mono">{{ row.value || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- JSON 树结构 -->
        <div class="preview-col">
          <h4 class="preview-col__title">树结构（节点数：{{ nodeCount }}）</h4>
          <div v-if="behaviorTreeResult" class="tree-wrap">
            <ul class="tree-root">
              <li v-for="child in behaviorTreeResult.children" :key="child.id">
                <details>
                  <summary class="tree-node-summary">
                    <span class="tree-node-label">{{ child.label }}</span>
                    <span class="tree-node-value">{{ child.rawValue ?? '' }}</span>
                  </summary>
                  <ul v-if="child.children?.length" class="tree-children">
                    <li v-for="grand in child.children" :key="grand.id">
                      <details>
                        <summary class="tree-node-summary">
                          <span class="tree-node-label">{{ grand.label }}</span>
                          <span class="tree-node-value">{{ grand.rawValue ?? '' }}</span>
                        </summary>
                        <ul v-if="grand.children?.length" class="tree-children">
                          <li v-for="g2 in grand.children" :key="g2.id" class="tree-leaf">
                            <span class="tree-node-label">{{ g2.label }}</span>
                            <span class="tree-node-value">{{ g2.rawValue ?? '' }}</span>
                          </li>
                        </ul>
                      </details>
                    </li>
                  </ul>
                </details>
              </li>
            </ul>
          </div>
          <div v-else class="empty">暂无数据</div>
        </div>

        <!-- 链路 Mermaid 摘要 -->
        <div class="preview-col">
          <h4 class="preview-col__title">链路摘要</h4>
          <div v-if="state.result.nodes.length" class="chain-summary">
            <div class="summary-item"><span class="summary-item__label">节点数</span><span>{{ state.result.nodes.length }}</span></div>
            <div class="summary-item"><span class="summary-item__label">边数</span><span>{{ state.result.edges.length }}</span></div>
            <div class="summary-item"><span class="summary-item__label">总耗时</span>
              <span>{{ state.result.nodes.filter(n => typeof n.finishedAt === 'number' && typeof n.startedAt === 'number').reduce((s, n) => s + (n.finishedAt! - n.startedAt!), 0) }}ms</span>
            </div>
          </div>
          <pre class="mermaid-preview mono">{{ state.result.mermaid }}</pre>
          <button type="button" class="btn btn--small" style="margin-top:8px" @click="copyMermaid">复制 Mermaid</button>
        </div>
      </div>
    </div>

    <!-- 运行记录 -->
    <div class="panel records-panel">
      <div class="records-panel__head">
        <h3 class="panel__title">运行记录</h3>
        <button type="button" class="btn btn--small" :disabled="runRecords.length === 0" @click="clearRecords">清空</button>
      </div>
      <p v-if="runRecords.length === 0" class="empty-hint">尚无记录，执行行为后会按时间倒序列出</p>
      <div v-else class="records-table-wrap">
        <table class="records-table">
          <thead><tr><th>#</th><th>时间</th><th>类型</th><th>备注</th><th>对比</th></tr></thead>
          <tbody>
            <tr v-for="row in runRecords" :key="row.seq">
              <td class="mono">{{ row.seq }}</td>
              <td class="mono records-table__time">{{ formatTime(row.at) }}</td>
              <td class="mono">{{ row.input.type }}</td>
              <td>{{ row.note || '—' }}</td>
              <td>
                <button type="button" class="btn btn--mini" @click="setCompareBefore(row.seq)">A</button>
                <button type="button" class="btn btn--mini" @click="setCompareAfter(row.seq)">B</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 链路对比 -->
    <div class="panel chain-diff-panel">
      <h3 class="panel__title">链路对比（ChainDiffer）</h3>
      <p class="mono diff-subtitle">{{ diffSubtitle }}</p>

      <div class="diff-baseline-row">
        <button type="button" class="btn" @click="captureBaseline">设为基准</button>
        <button type="button" class="btn" :disabled="!baselineSnapshot" @click="clearBaseline">清除基准</button>
        <label v-if="compareBeforeSeq" class="diff-select-wrap">
          <span>变更前</span>
          <select v-model="compareBeforeSeq" class="diff-select">
            <option value="">—</option>
            <option v-for="r in runRecords" :key="'b-' + r.seq" :value="String(r.seq)">{{ recordLabel(r) }}</option>
          </select>
        </label>
        <label v-if="compareBeforeSeq" class="diff-select-wrap">
          <span>变更后</span>
          <select v-model="compareAfterSeq" class="diff-select">
            <option value="">—</option>
            <option v-for="r in runRecords" :key="'a-' + r.seq" :value="String(r.seq)">{{ recordLabel(r) }}</option>
          </select>
        </label>
      </div>

      <div class="diff-options">
        <label class="diff-check"><input v-model="differOptions.ignoreTiming" type="checkbox">忽略时间</label>
        <label class="diff-check"><input v-model="differOptions.ignoreOutput" type="checkbox">忽略 output</label>
        <label class="diff-check"><input v-model="differOptions.ignoreErrors" type="checkbox">忽略 error</label>
      </div>

      <p v-if="diffHint" class="diff-hint">{{ diffHint }}</p>

      <template v-if="displayDiff">
        <div class="diff-summary" :class="{ 'diff-summary--ok': !displayDiff.hasDiff }">
          <template v-if="displayDiff.hasDiff">
            有差异：新增 {{ displayDiff.summary.totalAdded }} · 移除 {{ displayDiff.summary.totalRemoved }} · 修改 {{ displayDiff.summary.totalModified }}
          </template>
          <template v-else>无差异</template>
        </div>
        <details v-if="displayDiff.hasDiff && displayDiff.nodeDiffs.length" class="diff-details">
          <summary>节点差异（{{ displayDiff.nodeDiffs.length }}）</summary>
          <ul>
            <li v-for="d in displayDiff.nodeDiffs" :key="d.id + d.type" :class="`diff-item--${d.type}`">
              <strong>{{ d.type }}</strong> <span class="mono">{{ d.id }}</span>
              <pre v-if="d.type === 'modified' && d.changedFields?.length" class="mono">{{ pretty(d.changedFields) }}</pre>
            </li>
          </ul>
        </details>
        <details v-if="displayDiff.hasDiff && displayDiff.edgeDiffs.length" class="diff-details">
          <summary>边差异（{{ displayDiff.edgeDiffs.length }}）</summary>
          <ul>
            <li v-for="(ed, i) in displayDiff.edgeDiffs" :key="i" :class="`diff-item--${ed.type}`">
              <strong>{{ ed.type }}</strong> <span class="mono">{{ edgeLabel(ed.edge) }}</span>
            </li>
          </ul>
        </details>
      </template>
    </div>

    <!-- 节点列表 & 详情 -->
    <div class="works-chain-demo__layout">
      <div class="panel">
        <h3 class="panel__title">节点列表</h3>
        <div class="node-list">
          <button v-for="item in mainAfterNodes" :key="item.node.id" type="button" class="node-card"
            :class="[`node-card--${item.node.status}`, `node-card--diff-${item.mark}`, { 'node-card--selected': selectedNodeId === item.node.id }]"
            @click="selectedNodeId = item.node.id">
            <div class="node-card__head">
              <strong>{{ item.node.name }}</strong>
              <span class="status-badge">{{ item.node.status }}</span>
            </div>
            <div class="mono node-card__meta">id: {{ item.node.id }}</div>
            <div class="node-card__meta">type: {{ item.node.type }}</div>
            <div class="node-card__meta">duration: {{ durationText(item.node) }}</div>
            <div class="node-card__meta">diff: <span class="mono">{{ item.mark }}</span></div>
          </button>
          <div v-if="mainAfterNodes.length === 0" class="empty">暂无节点</div>
        </div>
      </div>

      <div class="panel">
        <h3 class="panel__title">节点详情</h3>
        <template v-if="selectedNode">
          <div class="detail-line"><span class="label">ID</span><span class="mono">{{ selectedNode.id }}</span></div>
          <div class="detail-line"><span class="label">状态</span><span>{{ selectedNode.status }}</span></div>
          <div class="detail-line"><span class="label">耗时</span><span>{{ durationText(selectedNode) }}</span></div>
          <h4 class="sub-title">input</h4>
          <pre class="mono">{{ pretty(selectedNode.input) }}</pre>
          <h4 class="sub-title">output</h4>
          <pre class="mono">{{ pretty(selectedNode.output) }}</pre>
          <h4 class="sub-title">error</h4>
          <pre class="mono">{{ pretty(selectedNode.error) }}</pre>
        </template>
        <div v-else class="empty">暂无数据</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.works-chain-demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.works-chain-demo__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.works-chain-demo__desc {
  margin: 0;
  color: #666;
}

.works-chain-demo__layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.panel {
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  background: #fff;
  padding: 12px;
}

.panel__title {
  margin: 0 0 10px;
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

.btn--primary {
  background: #1677ff;
  border-color: #1677ff;
  color: #fff;
}

.btn--small { padding: 4px 8px; font-size: 12px; }
.btn--mini { padding: 2px 8px; font-size: 12px; margin-right: 4px; }
.btn:disabled { opacity: 0.55; cursor: not-allowed; }

.behavior-type-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.bt-tab {
  border: 1px solid #d9d9d9;
  background: #fff;
  color: #333;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
}

.bt-tab--active {
  background: #1677ff;
  border-color: #1677ff;
  color: #fff;
}

.behavior-input-area { margin-bottom: 10px; }

.behavior-textarea {
  width: 100%;
  min-height: 160px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 10px;
  resize: vertical;
  font-size: 13px;
  line-height: 1.5;
}

.run-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.run-row__note {
  flex: 1;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
}

.error { color: #cf1322; font-size: 13px; margin: 0; }

.behavior-preview { background: #fafafa; }

.preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

@media (max-width: 1024px) {
  .preview-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 720px) {
  .preview-grid { grid-template-columns: 1fr; }
}

.preview-col { background: #fff; border: 1px solid #f0f0f0; border-radius: 8px; padding: 10px; }

.preview-col__title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #555;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.summary-item {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-item__label { color: #888; font-size: 11px; }

.chain-summary { display: flex; flex-direction: column; gap: 6px; }

.table-wrap { overflow: auto; max-height: 200px; }

.result-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.result-table th, .result-table td { border-bottom: 1px solid #f0f0f0; padding: 6px 8px; text-align: left; }
.result-table th { background: #fafafa; font-weight: 600; }

.mermaid-preview {
  margin: 8px 0 0;
  font-size: 11px;
  background: #f5f5f5;
  border-radius: 6px;
  padding: 8px;
  max-height: 180px;
  overflow: auto;
  white-space: pre-wrap;
}

.records-panel__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }

.empty-hint { margin: 0; font-size: 13px; color: #999; }

.records-table-wrap { overflow: auto; max-height: 200px; border: 1px solid #f0f0f0; border-radius: 8px; }

.records-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.records-table th, .records-table td { border-bottom: 1px solid #f0f0f0; padding: 8px 10px; text-align: left; }
.records-table th { background: #fafafa; font-weight: 600; position: sticky; top: 0; }

.records-table__time { white-space: nowrap; font-size: 12px; }

.chain-diff-panel { background: #fcfcfc; }

.diff-subtitle { margin: 0 0 10px; font-size: 12px; color: #666; }

.diff-baseline-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 10px; }

.diff-select-wrap { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #666; }
.diff-select { border: 1px solid #d9d9d9; border-radius: 6px; padding: 4px 8px; font-size: 13px; background: #fff; }

.diff-options { display: flex; gap: 12px; margin-bottom: 10px; font-size: 13px; }
.diff-check { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }

.diff-hint { font-size: 13px; color: #666; padding: 8px 10px; border-radius: 8px; background: #f0f7ff; border: 1px solid #adc6ff; margin-bottom: 10px; }

.diff-summary { font-size: 13px; padding: 8px 10px; border-radius: 8px; background: #fff7e6; border: 1px solid #ffd591; margin-bottom: 8px; }
.diff-summary--ok { background: #f6ffed; border-color: #b7eb8f; }

.diff-details { margin-top: 8px; font-size: 13px; }
.diff-details summary { cursor: pointer; font-weight: 600; }

.diff-details ul { margin: 8px 0 0; padding-left: 18px; }
.diff-details li { margin-bottom: 6px; }
.diff-item--added { color: #237804; }
.diff-item--removed { color: #a8071a; }
.diff-item--modified { color: #ad6800; }

.node-list { display: flex; flex-direction: column; gap: 8px; max-height: 380px; overflow: auto; }

.node-card {
  text-align: left;
  border: 1px solid #d9d9d9;
  border-radius: 10px;
  padding: 10px;
  background: #fff;
  cursor: pointer;
  transition: box-shadow 0.18s, border-color 0.18s;
}

.node-card__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.node-card__meta { font-size: 12px; color: #555; }

.status-badge { border-radius: 999px; padding: 2px 8px; font-size: 12px; background: #f5f5f5; }

.node-card--running { border-color: #91caff; }
.node-card--succeeded { border-color: #b7eb8f; }
.node-card--failed { border-color: #ffccc7; }
.node-card--diff-added { box-shadow: inset 0 0 0 1px #95de64; }
.node-card--diff-removed { box-shadow: inset 0 0 0 1px #ff7875; }
.node-card--diff-modified { box-shadow: inset 0 0 0 1px #ffc069; }
.node-card--selected { border-color: #1677ff !important; background: #f0f7ff; box-shadow: inset 0 0 0 1px #1677ff, 0 0 0 2px rgb(22 119 255 / 18%); }

.detail-line { display: flex; gap: 8px; margin-bottom: 6px; font-size: 13px; }
.label { color: #666; min-width: 40px; }
.sub-title { margin: 8px 0 4px; font-size: 13px; }

.empty { color: #999; font-size: 13px; }

.mono { font-family: 'Consolas', 'Menlo', monospace; }
pre { margin: 0; white-space: pre-wrap; word-break: break-word; }

.tree-wrap { max-height: 300px; overflow: auto; }
.tree-root, .tree-root ul { margin: 0; padding-left: 18px; }
.tree-root li { margin: 3px 0; }
.tree-node-summary { cursor: pointer; display: flex; gap: 6px; align-items: center; }
.tree-node-label { font-weight: 600; font-size: 13px; }
.tree-node-value { color: #888; font-size: 12px; }
.tree-children { margin: 0; padding-left: 16px; }
.tree-leaf { font-size: 13px; display: flex; gap: 6px; }

@media (max-width: 860px) {
  .works-chain-demo__layout { grid-template-columns: 1fr; }
}
</style>
