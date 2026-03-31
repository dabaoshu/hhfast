<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  TaskExecutionChain,
  type TaskExecutionNode,
  type TaskExecutionRenderResult,
} from '@/index'

interface RenderState {
  result: TaskExecutionRenderResult
}

const chain = new TaskExecutionChain()
const selectedNodeId = ref<string>('')

/**
 * @description 页面渲染态。
 */
const state = reactive<RenderState>({
  result: chain.render({ direction: 'TD' }),
})

/**
 * @description 将对象安全格式化为展示字符串。
 * @param value 目标值。
 */
const prettyJson = (value: unknown): string => {
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
 * @description 刷新图数据并保持选中节点可用。
 */
const refreshRenderResult = (): void => {
  state.result = chain.render({ direction: 'TD' })
  const hasSelected = state.result.nodes.some(item => item.id === selectedNodeId.value)
  if (!hasSelected) {
    selectedNodeId.value = state.result.nodes[0]?.id ?? ''
  }
}

/**
 * @description 计算节点耗时文本。
 * @param node 节点信息。
 */
const getDurationText = (node: TaskExecutionNode): string => {
  if (typeof node.startedAt !== 'number' || typeof node.finishedAt !== 'number') {
    return '-'
  }
  return `${Math.max(0, node.finishedAt - node.startedAt)}ms`
}

/**
 * @description 构建一条示例执行链并模拟执行结果。
 */
const buildDemoChain = (): void => {
  chain.clear()

  const fetchUser = chain.addNode({
    id: 'fetch_user',
    name: '拉取用户信息',
    type: 'http',
    input: { userId: 1024 },
  })
  const fetchOrders = chain.addNode({
    id: 'fetch_orders',
    name: '拉取订单列表',
    type: 'http',
    input: { userId: 1024, pageSize: 20 },
  })
  const calcReport = chain.addNode({
    id: 'calc_report',
    name: '聚合报表计算',
    type: 'compute',
    input: { dimensions: ['amount', 'count'] },
  })
  const writeCache = chain.addNode({
    id: 'write_cache',
    name: '写入缓存',
    type: 'cache',
    input: { key: 'report:user:1024' },
  })
  const notify = chain.addNode({
    id: 'notify',
    name: '通知前端',
    type: 'message',
    input: { channel: 'report-ready' },
  })

  chain.connect({ from: fetchUser, to: calcReport, label: 'user' })
  chain.connect({ from: fetchOrders, to: calcReport, label: 'orders' })
  chain.connect({ from: calcReport, to: writeCache, label: 'report' })
  chain.connect({ from: writeCache, to: notify, label: 'cache-key' })

  const start = Date.now()
  chain.startNode(fetchUser, start)
  chain.completeNode(fetchUser, {
    output: { id: 1024, name: 'Alice', level: 'vip' },
    finishedAt: start + 120,
  })

  chain.startNode(fetchOrders, start + 30)
  chain.completeNode(fetchOrders, {
    output: [{ id: 'o1', amount: 99 }, { id: 'o2', amount: 188 }],
    finishedAt: start + 210,
  })

  chain.startNode(calcReport, start + 220)
  chain.completeNode(calcReport, {
    output: { count: 2, amount: 287, avg: 143.5 },
    finishedAt: start + 330,
  })

  chain.startNode(writeCache, start + 340)
  chain.completeNode(writeCache, {
    output: { ok: true, ttl: 300 },
    finishedAt: start + 360,
  })

  chain.startNode(notify, start + 361)
  chain.failNode(notify, {
    error: new Error('消息通道不可用'),
    finishedAt: start + 390,
  })

  refreshRenderResult()
}

buildDemoChain()

const selectedNode = computed(() =>
  state.result.nodes.find(item => item.id === selectedNodeId.value),
)
</script>

<template>
  <section class="chain-demo">
    <h2 class="chain-demo__title">Task Execution Chain Demo</h2>
    <p class="chain-demo__desc">
      可视化执行链：展示节点依赖、任务状态、入参/出参与耗时，底层数据来自 `TaskExecutionChain.render()`。
    </p>

    <div class="chain-demo__toolbar">
      <button type="button" class="btn btn--primary" @click="buildDemoChain">
        重新生成示例链路
      </button>
    </div>

    <div class="chain-demo__layout">
      <div class="panel">
        <h3 class="panel__title">链路节点</h3>
        <div class="node-list">
          <button
            v-for="node in state.result.nodes"
            :key="node.id"
            type="button"
            class="node-card"
            :class="`node-card--${node.status}`"
            @click="selectedNodeId = node.id"
          >
            <div class="node-card__head">
              <strong>{{ node.name }}</strong>
              <span class="node-card__status">{{ node.status }}</span>
            </div>
            <div class="node-card__meta mono">id: {{ node.id }}</div>
            <div class="node-card__meta">type: {{ node.type }}</div>
            <div class="node-card__meta">duration: {{ getDurationText(node) }}</div>
          </button>
        </div>
      </div>

      <div class="panel">
        <h3 class="panel__title">节点详情</h3>
        <template v-if="selectedNode">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-item__label">节点 ID</span>
              <span class="mono">{{ selectedNode.id }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">状态</span>
              <span>{{ selectedNode.status }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">耗时</span>
              <span>{{ getDurationText(selectedNode) }}</span>
            </div>
          </div>
          <div class="json-block">
            <h4 class="json-block__title">入参 input</h4>
            <pre class="mono">{{ prettyJson(selectedNode.input) }}</pre>
          </div>
          <div class="json-block">
            <h4 class="json-block__title">出参 output</h4>
            <pre class="mono">{{ prettyJson(selectedNode.output) }}</pre>
          </div>
          <div class="json-block">
            <h4 class="json-block__title">错误 error</h4>
            <pre class="mono">{{ prettyJson(selectedNode.error) }}</pre>
          </div>
        </template>
        <div v-else class="empty">暂无节点</div>
      </div>
    </div>

    <div class="panel">
      <h3 class="panel__title">Mermaid 源码</h3>
      <pre class="mono mermaid">{{ state.result.mermaid }}</pre>
    </div>
  </section>
</template>

<style scoped>
.chain-demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chain-demo__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.chain-demo__desc {
  margin: 0;
  color: #666;
}

.chain-demo__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chain-demo__layout {
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

.node-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 460px;
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
  gap: 8px;
}

.node-card__status {
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
  background: #f5f5f5;
}

.node-card__meta {
  font-size: 12px;
  color: #555;
}

.node-card--pending {
  border-color: #ffe58f;
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

.node-card--skipped {
  border-color: #d9d9d9;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.detail-item {
  background: #fafafa;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item__label {
  font-size: 12px;
  color: #666;
}

.json-block {
  margin-bottom: 10px;
}

.json-block__title {
  margin: 0 0 6px;
  font-size: 13px;
}

.empty {
  color: #999;
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
