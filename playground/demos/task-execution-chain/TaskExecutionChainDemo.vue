<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  TraceAll,
  TraceCall,
  TraceEnter,
  TraceVar,
  createTraceVariable,
  getLastTraceResult,
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
const selectedNodeId = ref<string>('')
const state = reactive<ViewState>({
  result: {
    nodes: [],
    edges: [],
    mermaid: 'flowchart TD',
  },
  lastError: '',
})

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
 * @description 执行订单流程并刷新视图。
 */
const runDemo = async (): Promise<void> => {
  state.lastError = ''
  try {
    await service.createOrder({
      userId: 1001,
      skuId: 777,
    })
  }
  catch (error) {
    state.lastError = error instanceof Error ? error.message : String(error)
  }

  const result = getLastTraceResult(service)
  if (!result) {
    return
  }
  state.result = result
  selectedNodeId.value = result.nodes[0]?.id ?? ''
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
    </p>

    <div class="trace-enter-demo__toolbar">
      <button type="button" class="btn btn--primary" @click="runDemo">
        执行成功链路
      </button>
      <span v-if="state.lastError" class="trace-enter-demo__error">错误: {{ state.lastError }}</span>
    </div>

    <div class="trace-enter-demo__layout">
      <div class="panel">
        <h3 class="panel__title">节点列表</h3>
        <div class="node-list">
          <button v-for="node in state.result.nodes" :key="node.id" type="button" class="node-card"
            :class="`node-card--${node.status}`" @click="selectedNodeId = node.id">
            <div class="node-card__head">
              <strong>{{ node.name }}</strong>
              <span class="status">{{ node.status }}</span>
            </div>
            <div class="mono node-card__meta">id: {{ node.id }}</div>
            <div class="node-card__meta">type: {{ node.type }}</div>
            <div class="node-card__meta">duration: {{ durationText(node) }}</div>
          </button>
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
      <h3 class="panel__title">Mermaid</h3>
      <pre class="mono mermaid">{{ state.result.mermaid }}</pre>
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

.node-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 360px;
  overflow: auto;
}

.node-card {
  text-align: left;
  border: 1px solid #d9d9d9;
  border-radius: 10px;
  padding: 10px;
  background: #fff;
  cursor: pointer;
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
</style>
