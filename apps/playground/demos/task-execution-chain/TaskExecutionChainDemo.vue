<script setup lang="ts">
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
  type ChainDifferOptions,
  type TaskExecutionEdge,
  type TaskExecutionNode,
  type TaskExecutionRenderResult,
} from '@/index'

interface CreateOrderInput {
  userId: number
  skuId: number
}

interface UserInfo {
  id: number
  name: string
}

interface StockInfo {
  skuId: number
  available: number
}

interface OrderResult {
  ok: true
  orderId: string
}

interface ViewState {
  result: TaskExecutionRenderResult
  lastError: string
}

/**
 * 单次执行的本地记录（便于对照不同入参下的链路）。
 */
interface OrderRunRecord {
  /** 自增序号。 */
  seq: number
  /** ISO 时间。 */
  at: string
  /** 创建订单入参。 */
  input: CreateOrderInput
  /** 表单备注。 */
  note: string
  /** 该次执行结束时的链路渲染结果（供记录间 ChainDiffer 对比）。 */
  snapshot: TaskExecutionRenderResult
}

const sleep = async (ms: number): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, ms))
}
class OrderServiceDemo {
  retryCount!: number
  private statusValue = 'idle'

  constructor() {
    this.retryCount = 0
  }

  /**
   * @description 可追踪属性 get。
   */
  get status(): string {
    return this.statusValue
  }

  /**
   * @description 可追踪属性 set。
   * @param value 状态值。
   */
  set status(value: string) {
    this.statusValue = value
  }

  /**
   * @description 入口：创建订单流程。
   * @param input 订单入参。
   */
  async createOrder(input: CreateOrderInput): Promise<OrderResult> {
    this.retryCount = this.retryCount + 1
    this.status = 'running'
    const localCounter = createTraceVariable(this, 0, 'localCounter')
    localCounter.set(localCounter.get() + 1)
    const user = await this.loadUser(input.userId)
    const picture = await this.loadPicture(input.userId).catch(() => '')
    console.log('picture', picture)
    const age = await this.fetchUserAge(input.userId)
    const stock = await this.checkStock(input.skuId)
    const discount = await this.calcDiscount(age)
    const currentStatus = this.status
    console.log(`status=${currentStatus}, discount=${discount}`)
    this.status = 'done'
    localCounter.get()
    localCounter.get()
    localCounter.get()
    return this.submitOrder(user, stock)
  }

  async loadPicture(userId: number): Promise<string> {
    await sleep(10)
    throw new Error('load picture failed')
    return `picture-${userId}`
  }



  /**
   * @description 外部函数调用封装为可追踪步骤。
   * @param userId 用户 ID。
   */
  async fetchUserAge(userId: number): Promise<number> {
    await sleep(10)
    return 18
  }

  /**
   * @description 自动方法追踪示例（由 TraceAll 接管）。
   * @param age 年龄。
   */
  async calcDiscount(age: number): Promise<number> {
    await sleep(5)
    return age > 17 ? 9 : 10
  }

  /**
   * @description 查询用户信息。
   * @param userId 用户 ID。
   */
  async loadUser(userId: number): Promise<UserInfo> {
    await sleep(40)
    return { id: userId, name: `user-${userId}` }
  }

  /**
   * @description 校验库存。
   * @param skuId 商品 ID。
   */
  async checkStock(skuId: number): Promise<StockInfo> {
    await sleep(35)
    return { skuId, available: 99 }
  }

  /**
   * @description 提交订单。
   * @param user 用户信息。
   * @param stock 库存信息。
   */
  async submitOrder(user: UserInfo, stock: StockInfo): Promise<OrderResult> {
    await sleep(25)
    return {
      ok: true,
      orderId: `${user.id}-${stock.skuId}-${Date.now()}`,
    }
  }


}

TraceVar({
  name: 'retryCount',
})(OrderServiceDemo.prototype, 'retryCount')

TraceAll({
  namePrefix: 'OrderServiceDemo',
  exclude: ['createOrder', 'logPicture', 'fetchUserAge'],
})(OrderServiceDemo)

const createOrderDescriptor = Object.getOwnPropertyDescriptor(OrderServiceDemo.prototype, 'createOrder')
if (!createOrderDescriptor) {
  throw new Error('createOrder descriptor not found.')
}

TraceEnter<CreateOrderInput>({
  name: '创建订单流程',
  type: 'entry',
  input: (args) => (args[0] as CreateOrderInput),
})(OrderServiceDemo.prototype, 'createOrder', createOrderDescriptor)
Object.defineProperty(OrderServiceDemo.prototype, 'createOrder', createOrderDescriptor)


const fetchUserAgeDescriptor = Object.getOwnPropertyDescriptor(OrderServiceDemo.prototype, 'fetchUserAge')
if (!fetchUserAgeDescriptor) {
  throw new Error('fetchUserAge descriptor not found.')
}
TraceCall({
  name: 'external.getUserAge',
  type: 'external',
})(OrderServiceDemo.prototype, 'fetchUserAge', fetchUserAgeDescriptor)
Object.defineProperty(OrderServiceDemo.prototype, 'fetchUserAge', fetchUserAgeDescriptor)

const service = new OrderServiceDemo()
/** 表单：执行入参与备注。 */
const orderParams = reactive({
  userId: 1001,
  skuId: 777,
  note: '',
})
/** 最近一次成功执行实际使用的入参。 */
const lastAppliedInput = ref<CreateOrderInput | null>(null)
/** 运行记录（新记录在前）。 */
const orderRunRecords = ref<OrderRunRecord[]>([])
let orderRunSeq = 0
const isOrderRunning = ref(false)
const selectedNodeId = ref<string>('')
/** 用于 ChainDiffer 对比的基准快照（执行链 nodes/edges）。 */
const baselineSnapshot = ref<TaskExecutionRenderResult | null>(null)
/** ChainDiffer 选项（忽略时间/输出/错误等）。 */
const differOptions = reactive<ChainDifferOptions>({
  ignoreTiming: true,
  ignoreOutput: false,
  ignoreErrors: false,
})
/** 对比模式：基准与当前画布，或两条运行记录。 */
const diffDisplayMode = ref<'baseline-current' | 'record-record'>('baseline-current')
/** 记录间对比：变更前（左侧）记录序号，空字符串表示未选。 */
const compareBeforeSeqStr = ref('')
/** 记录间对比：变更后（右侧）记录序号。 */
const compareAfterSeqStr = ref('')
const state = reactive<ViewState>({
  result: {
    nodes: [],
    edges: [],
    mermaid: 'flowchart TD',
  },
  lastError: '',
})

/**
 * @description 深拷贝渲染结果，供基准快照使用。
 * @param result 链路渲染结果。
 */
const cloneRenderResult = (result: TaskExecutionRenderResult): TaskExecutionRenderResult => {
  return structuredClone(result)
}

/**
 * @description 将当前链路保存为对比基准。
 */
const captureBaseline = (): void => {
  if (state.result.nodes.length === 0) {
    state.lastError = '请先执行一次成功链路后再设为基准。'
    return
  }
  state.lastError = ''
  baselineSnapshot.value = cloneRenderResult(state.result)
}

/**
 * @description 清除基准快照。
 */
const clearBaseline = (): void => {
  baselineSnapshot.value = null
}

/**
 * @description 基准快照与当前画布上的链路差异（无基准时为 null）。
 */
const baselineChainDiff = computed<ChainDiffResult | null>(() => {
  const base = baselineSnapshot.value
  if (!base) {
    return null
  }
  return new ChainDiffer(differOptions).compare(base, state.result)
})

/**
 * @description 两条运行记录快照之间的差异。
 */
const recordsChainDiff = computed<ChainDiffResult | null>(() => {
  const left = compareBeforeSeqStr.value
  const right = compareAfterSeqStr.value
  if (!left || !right) {
    return null
  }
  const l = Number(left)
  const r = Number(right)
  if (!Number.isInteger(l) || !Number.isInteger(r) || l === r) {
    return null
  }
  const beforeRec = orderRunRecords.value.find(row => row.seq === l)
  const afterRec = orderRunRecords.value.find(row => row.seq === r)
  if (!beforeRec?.snapshot || !afterRec?.snapshot) {
    return null
  }
  return new ChainDiffer(differOptions).compare(beforeRec.snapshot, afterRec.snapshot)
})

/**
 * @description 当前模式下用于展示的对比结果。
 */
const displayChainDiff = computed<ChainDiffResult | null>(() =>
  diffDisplayMode.value === 'baseline-current' ? baselineChainDiff.value : recordsChainDiff.value,
)

/**
 * @description 当前对比维度的说明文案。
 */
const displayDiffSubtitle = computed(() => {
  if (diffDisplayMode.value === 'baseline-current') {
    return '基准快照 → 当前画布'
  }
  const l = compareBeforeSeqStr.value
  const r = compareAfterSeqStr.value
  if (!l || !r || l === r) {
    return '运行记录 A → 运行记录 B'
  }
  return `记录 #${l} → 记录 #${r}`
})

/**
 * @description 当前对比模式下左侧（变更前）节点列表。
 */
const diffBeforeNodes = computed<TaskExecutionNode[]>(() => {
  if (diffDisplayMode.value === 'baseline-current') {
    return baselineSnapshot.value?.nodes ?? []
  }
  const left = Number(compareBeforeSeqStr.value)
  if (!Number.isInteger(left)) {
    return []
  }
  const record = orderRunRecords.value.find(row => row.seq === left)
  return record?.snapshot.nodes ?? []
})

/**
 * @description 当前对比模式下右侧（变更后）节点列表。
 */
const diffAfterNodes = computed<TaskExecutionNode[]>(() => {
  if (diffDisplayMode.value === 'baseline-current') {
    return state.result.nodes
  }
  const right = Number(compareAfterSeqStr.value)
  if (!Number.isInteger(right)) {
    return []
  }
  const record = orderRunRecords.value.find(row => row.seq === right)
  return record?.snapshot.nodes ?? []
})

/**
 * @description 对比节点面板左侧标题。
 */
const diffBeforeTitle = computed(() => {
  if (diffDisplayMode.value === 'baseline-current') {
    return '变更前（基准快照）'
  }
  return compareBeforeSeqStr.value ? `变更前（记录 #${compareBeforeSeqStr.value}）` : '变更前（未选择）'
})

/**
 * @description 对比节点面板右侧标题。
 */
const diffAfterTitle = computed(() => {
  if (diffDisplayMode.value === 'baseline-current') {
    return '变更后（当前画布）'
  }
  return compareAfterSeqStr.value ? `变更后（记录 #${compareAfterSeqStr.value}）` : '变更后（未选择）'
})

type NodeDiffMark = 'added' | 'removed' | 'modified' | 'unchanged'

interface DiffNodeViewItem {
  node: TaskExecutionNode
  mark: NodeDiffMark
}

/**
 * @description 将 ChainDiffer 节点差异转成按 id 查询的映射。
 */
const diffNodeMarkMap = computed<Record<string, Exclude<NodeDiffMark, 'unchanged'>>>(() => {
  const diff = displayChainDiff.value
  if (!diff?.nodeDiffs?.length) {
    return {}
  }
  return diff.nodeDiffs.reduce<Record<string, Exclude<NodeDiffMark, 'unchanged'>>>((acc, item) => {
    acc[item.id] = item.type
    return acc
  }, {})
})

/**
 * @description 对比主视图左侧节点（变更前）及差异标记。
 */
const mainBeforeNodeList = computed<DiffNodeViewItem[]>(() =>
  diffBeforeNodes.value.map(node => ({
    node,
    mark: diffNodeMarkMap.value[node.id] ?? 'unchanged',
  })),
)

/**
 * @description 对比主视图右侧节点（变更后）及差异标记。
 */
const mainAfterNodeList = computed<DiffNodeViewItem[]>(() =>
  diffAfterNodes.value.map(node => ({
    node,
    mark: diffNodeMarkMap.value[node.id] ?? 'unchanged',
  })),
)

/**
 * @description 无对比结果时的提示（引导操作）。
 */
const diffCompareHint = computed(() => {
  if (diffDisplayMode.value === 'baseline-current') {
    if (!baselineSnapshot.value) {
      return '请先执行链路，再点击「将当前链路设为基准」，然后再次执行或修改忽略项即可查看与当前画布的差异。'
    }
    return null
  }
  if (orderRunRecords.value.length < 2) {
    return '至少需要两条运行记录。请用不同参数多次执行成功链路。'
  }
  if (!compareBeforeSeqStr.value || !compareAfterSeqStr.value) {
    return '请在下方选择「变更前」「变更后」两条记录。表格中可点击「对比 A / 对比 B」快速填入。'
  }
  if (compareBeforeSeqStr.value === compareAfterSeqStr.value) {
    return '请选择两条不同的记录。'
  }
  return null
})

/**
 * @description 边的可读展示。
 * @param edge 边。
 */
const edgeLabelText = (edge: TaskExecutionEdge): string => {
  const label = edge.label ? ` [${edge.label}]` : ''
  return `${edge.from} → ${edge.to}${label}`
}

/**
 * @description 安全格式化对象为 JSON。
 * @param value 目标值。
 */
const pretty = (value: unknown): string => {
  if (value === undefined) {
    return '-'
  }
  try {
    return JSON.stringify(value, null, 2)
  }
  catch {
    return String(value)
  }
}

/**
 * @description 计算节点耗时。
 * @param node 任务节点。
 */
const durationText = (node: TaskExecutionNode): string => {
  if (typeof node.startedAt !== 'number' || typeof node.finishedAt !== 'number') {
    return '-'
  }
  return `${Math.max(0, node.finishedAt - node.startedAt)}ms`
}

/**
 * @description 校验并解析表单中的数字字段。
 * @returns 合法入参或 null。
 */
const parseOrderFormInput = (): CreateOrderInput | null => {
  const userId = Number(orderParams.userId)
  const skuId = Number(orderParams.skuId)
  if (!Number.isFinite(userId) || !Number.isInteger(userId)) {
    state.lastError = '用户 ID 须为整数。'
    return null
  }
  if (!Number.isFinite(skuId) || !Number.isInteger(skuId)) {
    state.lastError = 'SKU ID 须为整数。'
    return null
  }
  return { userId, skuId }
}

/**
 * @description 清空运行记录列表。
 */
const clearOrderRunRecords = (): void => {
  orderRunRecords.value = []
  compareBeforeSeqStr.value = ''
  compareAfterSeqStr.value = ''
}

/**
 * @description 将某条记录设为记录间对比的「变更前」侧。
 * @param seq 记录序号。
 */
const setCompareBefore = (seq: number): void => {
  compareBeforeSeqStr.value = String(seq)
  diffDisplayMode.value = 'record-record'
}

/**
 * @description 将某条记录设为记录间对比的「变更后」侧。
 * @param seq 记录序号。
 */
const setCompareAfter = (seq: number): void => {
  compareAfterSeqStr.value = String(seq)
  diffDisplayMode.value = 'record-record'
}

/**
 * @description 运行记录下拉框展示文案。
 * @param row 单条记录。
 */
const recordOptionLabel = (row: OrderRunRecord): string => {
  const tail = row.note ? ` · ${row.note}` : ''
  return `#${row.seq} · user ${row.input.userId} · sku ${row.input.skuId}${tail}`
}

/**
 * @description 将 ISO 时间格式化为本地可读字符串。
 * @param iso ISO 8601 字符串。
 */
const formatRecordTime = (iso: string): string => {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) {
    return iso
  }
  return new Date(t).toLocaleString('zh-CN', { hour12: false })
}

/**
 * @description 执行订单流程并刷新视图（使用表单入参并写入记录）。
 */
const runDemo = async (): Promise<void> => {
  const input = parseOrderFormInput()
  if (!input) {
    return
  }
  state.lastError = ''
  isOrderRunning.value = true
  try {
    await service.createOrder(input)
  }
  catch (error) {
    state.lastError = error instanceof Error ? error.message : String(error)
  }
  finally {
    isOrderRunning.value = false
  }

  const result = getLastTraceResult(service)
  if (!result) {
    return
  }
  state.result = result
  selectedNodeId.value = result.nodes[0]?.id ?? ''
  if (state.lastError) {
    return
  }
  lastAppliedInput.value = { ...input }
  const note = orderParams.note.trim()
  orderRunRecords.value = [
    {
      seq: ++orderRunSeq,
      at: new Date().toISOString(),
      input: { ...input },
      note,
      snapshot: cloneRenderResult(result),
    },
    ...orderRunRecords.value,
  ].slice(0, 80)
}

const selectedNode = computed(() =>
  state.result.nodes.find(node => node.id === selectedNodeId.value),
)

/**
 * @description 生成可直接粘贴到 Markdown 的 Mermaid 代码块。
 */
const markdownMermaid = computed(() =>
  ['```mermaid', state.result.mermaid, '```'].join('\n'),
)

/**
 * @description 复制 Markdown Mermaid 文本。
 */
const copyMarkdownMermaid = async (): Promise<void> => {
  state.lastError = ''
  try {
    await navigator.clipboard.writeText(markdownMermaid.value)
  }
  catch (error) {
    state.lastError = error instanceof Error ? error.message : String(error)
  }
}

</script>

<template>
  <section class="trace-enter-demo">
    <h2 class="trace-enter-demo__title">TraceEnter Demo</h2>
    <p class="trace-enter-demo__desc">
      入口方法使用 `TraceEnter` 后，内部 `this.xxx()` 调用将自动形成调用链，无需为每个步骤单独埋点。
      <code>ChainDiffer</code> 支持「基准 → 当前画布」或「两条运行记录快照」两种对比方式；运行记录表格中 <strong>A</strong> / <strong>B</strong> 可快速填入变更前、后。
      表单可切换 <code>userId</code> / <code>skuId</code> 并带备注写入记录，每次成功执行都会保存链路快照供对比。
    </p>

    <div class="panel param-panel">
      <h3 class="panel__title">执行参数</h3>
      <form class="param-form" @submit.prevent="runDemo">
        <div class="param-form__row">
          <label class="param-form__field">
            <span class="param-form__label">用户 ID</span>
            <input v-model.number="orderParams.userId" class="param-form__input" type="number" step="1" required>
          </label>
          <label class="param-form__field">
            <span class="param-form__label">SKU ID</span>
            <input v-model.number="orderParams.skuId" class="param-form__input" type="number" step="1" required>
          </label>
          <label class="param-form__field param-form__field--grow">
            <span class="param-form__label">备注（写入记录）</span>
            <input v-model="orderParams.note" class="param-form__input" type="text" maxlength="120"
              placeholder="例如：基准场景 / 换用户对照">
          </label>
        </div>
        <div class="param-form__actions">
          <button type="submit" class="btn btn--primary" :disabled="isOrderRunning">
            {{ isOrderRunning ? '执行中…' : '执行成功链路' }}
          </button>
        </div>
      </form>
      <div v-if="lastAppliedInput" class="param-form__hint mono">
        最近一次入参：{{ pretty(lastAppliedInput) }}
      </div>
    </div>

    <div class="panel records-panel">
      <div class="records-panel__head">
        <h3 class="panel__title records-panel__title">运行记录</h3>
        <button type="button" class="btn btn--small" :disabled="orderRunRecords.length === 0" @click="clearOrderRunRecords">
          清空记录
        </button>
      </div>
      <p v-if="orderRunRecords.length === 0" class="records-panel__empty">尚无记录，执行一次后会按时间倒序列出；每条记录会保存链路快照，可在下方「运行记录之间」做对比。</p>
      <div v-else class="records-table-wrap">
        <table class="records-table">
          <thead>
            <tr>
              <th>#</th>
              <th>时间</th>
              <th>userId</th>
              <th>skuId</th>
              <th>备注</th>
              <th class="records-table__actions">对比</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in orderRunRecords" :key="row.seq">
              <td class="mono">{{ row.seq }}</td>
              <td class="mono records-table__time">{{ formatRecordTime(row.at) }}</td>
              <td class="mono">{{ row.input.userId }}</td>
              <td class="mono">{{ row.input.skuId }}</td>
              <td>{{ row.note || '—' }}</td>
              <td class="records-table__actions">
                <button type="button" class="btn btn--mini" title="设为记录对比的变更前（before）"
                  @click="setCompareBefore(row.seq)">
                  A
                </button>
                <button type="button" class="btn btn--mini" title="设为记录对比的变更后（after）"
                  @click="setCompareAfter(row.seq)">
                  B
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel chain-diff-panel">
      <h3 class="panel__title">链路对比（ChainDiffer）</h3>
      <p class="chain-diff__subtitle mono">{{ displayDiffSubtitle }}</p>
      <div v-if="state.lastError" class="trace-enter-demo__error chain-diff__error">
        错误: {{ state.lastError }}
      </div>

      <div class="chain-diff__mode">
        <span class="chain-diff__mode-label">对比方式</span>
        <label class="chain-diff__radio">
          <input v-model="diffDisplayMode" type="radio" value="baseline-current">
          基准快照 → 当前画布
        </label>
        <label class="chain-diff__radio">
          <input v-model="diffDisplayMode" type="radio" value="record-record">
          运行记录之间（两条历史快照）
        </label>
      </div>

      <div v-if="diffDisplayMode === 'baseline-current'" class="chain-diff__baseline-actions">
        <button type="button" class="btn" @click="captureBaseline">
          将当前链路设为基准
        </button>
        <button type="button" class="btn" :disabled="!baselineSnapshot" @click="clearBaseline">
          清除基准
        </button>
      </div>

      <div v-else class="chain-diff__record-pick">
        <label class="chain-diff__select-wrap">
          <span class="chain-diff__select-label">变更前（before）</span>
          <select v-model="compareBeforeSeqStr" class="chain-diff__select">
            <option value="">— 选择记录 —</option>
            <option v-for="row in orderRunRecords" :key="'b-' + row.seq" :value="String(row.seq)">
              {{ recordOptionLabel(row) }}
            </option>
          </select>
        </label>
        <label class="chain-diff__select-wrap">
          <span class="chain-diff__select-label">变更后（after）</span>
          <select v-model="compareAfterSeqStr" class="chain-diff__select">
            <option value="">— 选择记录 —</option>
            <option v-for="row in orderRunRecords" :key="'a-' + row.seq" :value="String(row.seq)">
              {{ recordOptionLabel(row) }}
            </option>
          </select>
        </label>
      </div>

      <p class="chain-diff__api-hint mono">
        等价调用：<code>new ChainDiffer(options).compare(before, after)</code>；默认配置可用静态方法
        <code>ChainDiffer.diff(before, after)</code>。
      </p>

      <div class="chain-diff__options">
        <label class="chain-diff__check">
          <input v-model="differOptions.ignoreTiming" type="checkbox">
          忽略时间字段（startedAt / finishedAt）
        </label>
        <label class="chain-diff__check">
          <input v-model="differOptions.ignoreOutput" type="checkbox">
          忽略 output
        </label>
        <label class="chain-diff__check">
          <input v-model="differOptions.ignoreErrors" type="checkbox">
          忽略 error
        </label>
      </div>

      <div v-if="diffCompareHint" class="chain-diff__hint">
        {{ diffCompareHint }}
      </div>

      <template v-if="displayChainDiff">
        <div class="chain-diff__summary" :class="{ 'chain-diff__summary--ok': !displayChainDiff.hasDiff }">
          <template v-if="displayChainDiff.hasDiff">
            有差异：新增 {{ displayChainDiff.summary.totalAdded }} · 移除 {{ displayChainDiff.summary.totalRemoved }} ·
            修改节点 {{ displayChainDiff.summary.totalModified }} · 未改节点约 {{ displayChainDiff.summary.unchanged }}
          </template>
          <template v-else>
            无差异（在当前选项下节点与边一致）。
          </template>
        </div>
        <details v-if="displayChainDiff.hasDiff" class="chain-diff__details">
          <summary>节点差异（{{ displayChainDiff.nodeDiffs.length }}）</summary>
          <ul class="chain-diff__list">
            <li v-for="d in displayChainDiff.nodeDiffs" :key="d.id + d.type" class="chain-diff__item"
              :class="`chain-diff__item--${d.type}`">
              <strong>{{ d.type }}</strong>
              <span class="mono">{{ d.id }}</span>
              <template v-if="d.type === 'modified' && d.changedFields?.length">
                <pre class="mono chain-diff__pre">{{ pretty(d.changedFields) }}</pre>
              </template>
            </li>
          </ul>
        </details>
        <details v-if="displayChainDiff.hasDiff && displayChainDiff.edgeDiffs.length" class="chain-diff__details">
          <summary>边差异（{{ displayChainDiff.edgeDiffs.length }}）</summary>
          <ul class="chain-diff__list">
            <li v-for="(ed, i) in displayChainDiff.edgeDiffs" :key="i" class="chain-diff__item"
              :class="`chain-diff__item--${ed.type}`">
              <strong>{{ ed.type }}</strong>
              <span class="mono">{{ edgeLabelText(ed.edge) }}</span>
            </li>
          </ul>
        </details>
        <div class="chain-diff-nodes">
          <div class="chain-diff-nodes__col">
            <h4 class="chain-diff-nodes__title">{{ diffBeforeTitle }}</h4>
            <ul class="chain-diff-nodes__list">
              <li v-for="node in diffBeforeNodes" :key="'before-' + node.id" class="chain-diff-nodes__item">
                <span class="mono chain-diff-nodes__id">{{ node.id }}</span>
                <span class="chain-diff-nodes__name">{{ node.name }}</span>
                <span class="mono chain-diff-nodes__status">{{ node.status }}</span>
              </li>
              <li v-if="diffBeforeNodes.length === 0" class="chain-diff-nodes__empty">
                暂无节点
              </li>
            </ul>
          </div>
          <div class="chain-diff-nodes__col">
            <h4 class="chain-diff-nodes__title">{{ diffAfterTitle }}</h4>
            <ul class="chain-diff-nodes__list">
              <li v-for="node in diffAfterNodes" :key="'after-' + node.id" class="chain-diff-nodes__item">
                <span class="mono chain-diff-nodes__id">{{ node.id }}</span>
                <span class="chain-diff-nodes__name">{{ node.name }}</span>
                <span class="mono chain-diff-nodes__status">{{ node.status }}</span>
              </li>
              <li v-if="diffAfterNodes.length === 0" class="chain-diff-nodes__empty">
                暂无节点
              </li>
            </ul>
          </div>
        </div>
      </template>
    </div>

    <div class="trace-enter-demo__layout">
      <div class="panel">
        <h3 class="panel__title">节点列表（差异对比）</h3>
        <div class="node-compare-list">
          <div class="node-compare-list__col">
            <h4 class="node-compare-list__title">{{ diffBeforeTitle }}</h4>
            <div class="node-list">
              <button v-for="item in mainBeforeNodeList" :key="'main-before-' + item.node.id" type="button" class="node-card"
                :class="[
                  `node-card--${item.node.status}`,
                  `node-card--diff-${item.mark}`,
                  { 'node-card--selected': selectedNodeId === item.node.id },
                ]" @click="selectedNodeId = item.node.id">
                <div class="node-card__head">
                  <strong>{{ item.node.name }}</strong>
                  <span class="status">{{ item.node.status }}</span>
                </div>
                <div class="mono node-card__meta">id: {{ item.node.id }}</div>
                <div class="node-card__meta">type: {{ item.node.type }}</div>
                <div class="node-card__meta">duration: {{ durationText(item.node) }}</div>
                <div class="node-card__meta node-card__diff">
                  diff: <span class="mono">{{ item.mark }}</span>
                </div>
              </button>
              <div v-if="mainBeforeNodeList.length === 0" class="empty">暂无数据</div>
            </div>
          </div>
          <div class="node-compare-list__col">
            <h4 class="node-compare-list__title">{{ diffAfterTitle }}</h4>
            <div class="node-list">
              <button v-for="item in mainAfterNodeList" :key="'main-after-' + item.node.id" type="button" class="node-card"
                :class="[
                  `node-card--${item.node.status}`,
                  `node-card--diff-${item.mark}`,
                  { 'node-card--selected': selectedNodeId === item.node.id },
                ]" @click="selectedNodeId = item.node.id">
                <div class="node-card__head">
                  <strong>{{ item.node.name }}</strong>
                  <span class="status">{{ item.node.status }}</span>
                </div>
                <div class="mono node-card__meta">id: {{ item.node.id }}</div>
                <div class="node-card__meta">type: {{ item.node.type }}</div>
                <div class="node-card__meta">duration: {{ durationText(item.node) }}</div>
                <div class="node-card__meta node-card__diff">
                  diff: <span class="mono">{{ item.mark }}</span>
                </div>
              </button>
              <div v-if="mainAfterNodeList.length === 0" class="empty">暂无数据</div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <h3 class="panel__title">节点详情</h3>
        <template v-if="selectedNode">
          <div class="detail-line">
            <span class="label">ID</span>
            <span class="mono">{{ selectedNode.id }}</span>
          </div>
          <div class="detail-line">
            <span class="label">状态</span>
            <span>{{ selectedNode.status }}</span>
          </div>
          <div class="detail-line">
            <span class="label">耗时</span>
            <span>{{ durationText(selectedNode) }}</span>
          </div>
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

    <div class="panel">
      <h3 class="panel__title">Markdown Mermaid</h3>
      <button type="button" class="btn btn--primary" @click="copyMarkdownMermaid">
        复制可粘贴 Markdown
      </button>
      <pre class="mono mermaid" style="margin-top: 8px;">{{ markdownMermaid }}</pre>
    </div>
  </section>
</template>

<style scoped>
.trace-enter-demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trace-enter-demo__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.trace-enter-demo__desc {
  margin: 0;
  color: #666;
}

.trace-enter-demo__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.trace-enter-demo__error {
  color: #cf1322;
  font-size: 13px;
}

.trace-enter-demo__layout {
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

.btn--small {
  padding: 4px 8px;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.param-panel {
  margin: 0;
}

.param-form__row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: flex-end;
}

.param-form__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
}

.param-form__field--grow {
  flex: 1 1 200px;
  min-width: 180px;
}

.param-form__label {
  font-size: 12px;
  color: #666;
}

.param-form__input {
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
}

.param-form__actions {
  margin-top: 10px;
}

.param-form__hint {
  margin-top: 10px;
  font-size: 12px;
  color: #555;
}

.records-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.records-panel__title {
  margin: 0;
}

.records-panel__empty {
  margin: 0;
  font-size: 13px;
  color: #999;
}

.records-table-wrap {
  overflow: auto;
  max-height: 240px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.records-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.records-table th,
.records-table td {
  border-bottom: 1px solid #f0f0f0;
  padding: 8px 10px;
  text-align: left;
}

.records-table th {
  background: #fafafa;
  font-weight: 600;
  position: sticky;
  top: 0;
}

.records-table__time {
  white-space: nowrap;
  font-size: 12px;
}

.node-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 360px;
  overflow: auto;
}

.node-compare-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.node-compare-list__col {
  min-width: 0;
}

.node-compare-list__title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #555;
}

@media (max-width: 920px) {
  .node-compare-list {
    grid-template-columns: 1fr;
  }
}

.node-card {
  text-align: left;
  border: 1px solid #d9d9d9;
  border-radius: 10px;
  padding: 10px;
  background: #fff;
  cursor: pointer;
  transition: box-shadow 0.18s ease, border-color 0.18s ease, background-color 0.18s ease;
}

.node-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.node-card__meta {
  font-size: 12px;
  color: #555;
}

.node-card__diff {
  margin-top: 2px;
}

.status {
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
  background: #f5f5f5;
}

.node-card--running {
  border-color: #91caff;
}

.node-card--succeeded {
  border-color: #b7eb8f;
}

.node-card--failed {
  border-color: #ffccc7;
}

.node-card--diff-added {
  box-shadow: inset 0 0 0 1px #95de64;
}

.node-card--diff-removed {
  box-shadow: inset 0 0 0 1px #ff7875;
}

.node-card--diff-modified {
  box-shadow: inset 0 0 0 1px #ffc069;
}

.node-card--selected {
  border-color: #1677ff !important;
  background: #f0f7ff;
  box-shadow: inset 0 0 0 1px #1677ff, 0 0 0 2px rgb(22 119 255 / 18%);
}

.detail-line {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 13px;
}

.label {
  color: #666;
  min-width: 40px;
}

.sub-title {
  margin: 8px 0 4px;
  font-size: 13px;
}

.empty {
  color: #999;
}

.mono {
  font-family: 'Consolas', 'Menlo', monospace;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.mermaid {
  max-height: 320px;
  overflow: auto;
  background: #fafafa;
  padding: 10px;
  border-radius: 8px;
}

.chain-diff-panel {
  background: #fcfcfc;
}

.chain-diff__subtitle {
  margin: 0 0 10px;
  font-size: 12px;
  color: #666;
}

.chain-diff__error {
  margin-bottom: 8px;
}

.chain-diff__mode {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  margin-bottom: 12px;
  font-size: 13px;
}

.chain-diff__mode-label {
  font-weight: 600;
  color: #333;
}

.chain-diff__radio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.chain-diff__baseline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.chain-diff__record-pick {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

@media (max-width: 720px) {
  .chain-diff__record-pick {
    grid-template-columns: 1fr;
  }
}

.chain-diff__select-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chain-diff__select-label {
  font-size: 12px;
  color: #666;
}

.chain-diff__select {
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
  background: #fff;
}

.chain-diff__api-hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #888;
  line-height: 1.5;
}

.chain-diff__api-hint code {
  font-size: 11px;
  background: #f5f5f5;
  padding: 1px 4px;
  border-radius: 4px;
}

.chain-diff__hint {
  font-size: 13px;
  color: #666;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f0f5ff;
  border: 1px solid #adc6ff;
  margin-bottom: 10px;
}

.btn--mini {
  padding: 2px 8px;
  font-size: 12px;
  margin-right: 4px;
}

.records-table__actions {
  white-space: nowrap;
}

.chain-diff__options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  margin-bottom: 10px;
  font-size: 13px;
}

.chain-diff__check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.chain-diff__summary {
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  margin-bottom: 8px;
}

.chain-diff__summary--ok {
  background: #f6ffed;
  border-color: #b7eb8f;
}

.chain-diff__details {
  margin-top: 8px;
  font-size: 13px;
}

.chain-diff__details summary {
  cursor: pointer;
  font-weight: 600;
}

.chain-diff__list {
  margin: 8px 0 0;
  padding-left: 18px;
}

.chain-diff__item {
  margin-bottom: 6px;
}

.chain-diff__item--added {
  color: #237804;
}

.chain-diff__item--removed {
  color: #a8071a;
}

.chain-diff__item--modified {
  color: #ad6800;
}

.chain-diff__pre {
  margin: 6px 0 0;
  font-size: 12px;
  max-height: 160px;
  overflow: auto;
}

.chain-diff-nodes {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 860px) {
  .chain-diff-nodes {
    grid-template-columns: 1fr;
  }
}

.chain-diff-nodes__col {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fff;
  min-height: 120px;
}

.chain-diff-nodes__title {
  margin: 0;
  padding: 8px 10px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
  font-weight: 600;
}

.chain-diff-nodes__list {
  list-style: none;
  margin: 0;
  padding: 6px 10px;
  max-height: 220px;
  overflow: auto;
}

.chain-diff-nodes__item {
  display: grid;
  grid-template-columns: minmax(120px, 1.2fr) minmax(120px, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px dashed #f5f5f5;
  font-size: 12px;
  > span{
    word-wrap: break-word;
  }
}

.chain-diff-nodes__item:last-child {
  border-bottom: none;
}

.chain-diff-nodes__id,
.chain-diff-nodes__status {
  color: #666;
}

.chain-diff-nodes__name {
  color: #333;
  word-break: break-word;
}

.chain-diff-nodes__empty {
  font-size: 12px;
  color: #999;
  padding: 6px 0;
}
</style>
