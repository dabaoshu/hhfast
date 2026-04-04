import { prefixedId } from '../../utils/uuid'
import type {
  AddTaskExecutionNodeOptions,
  CompleteTaskExecutionNodeOptions,
  ConnectTaskExecutionNodeOptions,
  FailTaskExecutionNodeOptions,
  TaskExecutionEdge,
  TaskExecutionMermaidOptions,
  TaskExecutionNode,
  TaskExecutionNodeStatus,
  TaskExecutionRenderResult,
} from './taskExecutionChain.types'
import type {
  RunTracedFlowOptions,
  TraceStepMetadata,
  TraceStepOptions,
  TracedFlowExecuteResult,
  TracedFlowRunContext,
} from './taskExecutionChain.flow-types'

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  try {
    return JSON.stringify(error)
  }
  catch {
    return String(error)
  }
}

const escapeMermaidText = (value: string): string =>
  value.replaceAll('"', '\\"').replaceAll('\n', '\\n')

const statusToEmoji = (status: TaskExecutionNodeStatus): string => {
  switch (status) {
    case 'succeeded':
      return '✅'
    case 'failed':
      return '❌'
    case 'running':
      return '🔄'
    case 'skipped':
      return '⏭️'
    case 'pending':
    default:
      return '⏳'
  }
}

const TRACE_STEP_META = Symbol('task.execution.trace.meta')

type TraceStepMetadataMap = Map<string, TraceStepMetadata>

/**
 * 可视化任务执行链。
 *
 * 该类用于记录任务节点及依赖关系，并输出：
 * - 结构化图数据（nodes / edges），可直接喂给图形组件；
 * - Mermaid 字符串，用于快速预览执行链。
 */
export class TaskExecutionChain {
  private readonly nodes = new Map<string, TaskExecutionNode>()
  private readonly edges: TaskExecutionEdge[] = []

  /**
   * 添加一个节点。
   * @param options 节点参数。
   * @returns 节点 ID。
   */
  addNode<TInput = unknown, TMeta extends Record<string, unknown> = Record<string, unknown>>(
    options: AddTaskExecutionNodeOptions<TInput, TMeta>,
  ): string {
    const id = options.id ?? prefixedId('node')
    if (this.nodes.has(id)) {
      throw new Error(`TaskExecution node with id "${id}" already exists.`)
    }
    this.nodes.set(id, {
      id,
      name: options.name,
      type: options.type ?? 'task',
      status: options.status ?? 'pending',
      input: options.input,
      startedAt: options.startedAt,
      metadata: options.metadata,
    })
    return id
  }

  /**
   * 更新节点为运行中。
   * @param id 节点 ID。
   * @param startedAt 开始时间戳。
   */
  startNode(id: string, startedAt: number = Date.now()): void {
    const node = this.mustGetNode(id)
    node.status = 'running'
    node.startedAt = startedAt
  }

  /**
   * 标记节点执行成功并写入出参。
   * @param id 节点 ID。
   * @param options 完成参数。
   */
  completeNode<TOutput = unknown>(
    id: string,
    options: CompleteTaskExecutionNodeOptions<TOutput> = {},
  ): void {
    const node = this.mustGetNode(id)
    node.status = 'succeeded'
    node.output = options.output
    node.finishedAt = options.finishedAt ?? Date.now()
  }

  /**
   * 标记节点执行失败并写入错误信息。
   * @param id 节点 ID。
   * @param options 失败参数。
   */
  failNode(id: string, options: FailTaskExecutionNodeOptions = {}): void {
    const node = this.mustGetNode(id)
    node.status = 'failed'
    node.error = options.error
    node.finishedAt = options.finishedAt ?? Date.now()
  }

  /**
   * 添加节点依赖连线。
   * @param options 连线参数。
   */
  connect(options: ConnectTaskExecutionNodeOptions): void {
    if (!this.nodes.has(options.from)) {
      throw new Error(`TaskExecution source node "${options.from}" does not exist.`)
    }
    if (!this.nodes.has(options.to)) {
      throw new Error(`TaskExecution target node "${options.to}" does not exist.`)
    }
    this.edges.push({
      from: options.from,
      to: options.to,
      label: options.label,
    })
  }

  /**
   * 获取可视化渲染结果。
   * @param options Mermaid 参数。
   */
  render(options: TaskExecutionMermaidOptions = {}): TaskExecutionRenderResult {
    const nodes = this.getNodes()
    const edges = this.getEdges()
    return {
      nodes,
      edges,
      mermaid: this.toMermaid({
        direction: options.direction ?? 'TD',
      }),
    }
  }

  /**
   * 获取节点列表（插入顺序）。
   */
  getNodes(): TaskExecutionNode[] {
    return [...this.nodes.values()].map((item) => ({ ...item }))
  }

  /**
   * 获取连线列表。
   */
  getEdges(): TaskExecutionEdge[] {
    return this.edges.map((item) => ({ ...item }))
  }

  /**
   * 清空执行链。
   */
  clear(): void {
    this.nodes.clear()
    this.edges.length = 0
  }

  /**
   * 导出 Mermaid 字符串。
   * @param options Mermaid 参数。
   */
  toMermaid(options: TaskExecutionMermaidOptions = {}): string {
    const direction = options.direction ?? 'TD'
    const nodeLines = this.getNodes().map((node) => {
      const title = `${statusToEmoji(node.status)} ${node.name}`
      const inputText = node.input === undefined ? '-' : this.safeStringify(node.input)
      const outputText = node.output === undefined ? '-' : this.safeStringify(node.output)
      const durationText = this.getDurationText(node)
      const detail = `in: ${inputText}\\nout: ${outputText}\\ntime: ${durationText}`
      const label = escapeMermaidText(`${title}\\n${detail}`)
      return `  ${node.id}["${label}"]`
    })
    const edgeLines = this.getEdges().map((edge) => {
      const label = edge.label ? `|${escapeMermaidText(edge.label)}|` : ''
      return `  ${edge.from} -->${label} ${edge.to}`
    })
    return [`flowchart ${direction}`, ...nodeLines, ...edgeLines].join('\n')
  }

  /**
   * 计算节点耗时文本。
   * @param node 节点信息。
   */
  private getDurationText(node: TaskExecutionNode): string {
    if (typeof node.startedAt !== 'number' || typeof node.finishedAt !== 'number') {
      return '-'
    }
    return `${Math.max(0, node.finishedAt - node.startedAt)}ms`
  }

  /**
   * 获取节点，不存在则抛错。
   * @param id 节点 ID。
   */
  private mustGetNode(id: string): TaskExecutionNode {
    const node = this.nodes.get(id)
    if (!node) {
      throw new Error(`TaskExecution node "${id}" does not exist.`)
    }
    return node
  }

  /**
   * 安全序列化对象用于图中展示。
   * @param value 任意值。
   */
  private safeStringify(value: unknown): string {
    try {
      const text = JSON.stringify(value)
      return text.length <= 120 ? text : `${text.slice(0, 117)}...`
    }
    catch {
      return toErrorMessage(value)
    }
  }
}

/**
 * 收集 class 方法元数据的装饰器。
 * @param options 步骤配置。
 */
export function TraceStep<TInput = unknown, TResult = unknown>(
  options: TraceStepOptions<TInput, TResult>,
): MethodDecorator {
  return (target, propertyKey, descriptor): void => {
    if (!descriptor || typeof descriptor.value !== 'function') {
      throw new Error('TraceStep can only decorate class methods.')
    }
    const methodKey = String(propertyKey)
    const holder = target as Record<PropertyKey, unknown>
    const existing = (holder[TRACE_STEP_META] as TraceStepMetadataMap | undefined)
      ?? new Map<string, TraceStepMetadata>()
    existing.set(methodKey, {
      key: methodKey,
      name: options.name,
      type: options.type ?? 'step',
      deps: options.deps?.slice() ?? [],
      order: options.order ?? Number.MAX_SAFE_INTEGER,
      input: options.input as TraceStepMetadata['input'],
      output: options.output as TraceStepMetadata['output'],
    })
    holder[TRACE_STEP_META] = existing
  }
}

/**
 * 获取对象上由 TraceStep 收集的步骤元数据。
 * @param target class 实例或原型对象。
 */
export function getTraceStepMetadata(target: object): TraceStepMetadata[] {
  const proto = Object.getPrototypeOf(target) as Record<PropertyKey, unknown> | null
  const holder = (proto ?? target) as Record<PropertyKey, unknown>
  const map = holder[TRACE_STEP_META] as TraceStepMetadataMap | undefined
  if (!map || map.size === 0) {
    return []
  }
  return [...map.values()].map(item => ({
    ...item,
    deps: item.deps?.slice() ?? [],
  }))
}

/**
 * 根据装饰器元数据执行流程并自动记录任务链。
 * @param instance 包含步骤方法的 class 实例。
 * @param options 运行配置。
 */
export async function runTracedFlow<TInput = unknown>(
  instance: object,
  options: RunTracedFlowOptions<TInput>,
): Promise<TracedFlowExecuteResult> {
  const steps = getTraceStepMetadata(instance)
  if (steps.length === 0) {
    throw new Error('No TraceStep metadata found on the instance.')
  }

  const stepMap = new Map<string, TraceStepMetadata>(steps.map(item => [item.key, item]))
  validateTraceStepDependencies(stepMap)
  const executionOrder = resolveTraceStepOrder(stepMap)
  const chain = options.chain ?? new TaskExecutionChain()
  const resultMap: Record<string, unknown> = {}
  const statusMap = new Map<string, TaskExecutionNodeStatus>()
  const stopOnError = options.stopOnError ?? true
  let firstError: unknown

  for (const key of executionOrder) {
    const step = stepMap.get(key)
    if (!step) {
      continue
    }
    const deps = step.deps ?? []
    const depFailed = deps.some(dep => statusMap.get(dep) !== 'succeeded')

    const ctxBase: TracedFlowRunContext<TInput> = {
      input: options.input,
      results: resultMap,
      stepKey: key,
      chain,
    }
    const nodeInput = step.input
      ? step.input(ctxBase)
      : {
          flowInput: options.input,
          deps: deps.reduce<Record<string, unknown>>((acc, dep) => {
            acc[dep] = resultMap[dep]
            return acc
          }, {}),
        }
    const nodeId = chain.addNode({
      id: key,
      name: step.name,
      type: step.type,
      status: depFailed ? 'skipped' : 'pending',
      input: nodeInput,
    })
    for (const dep of deps) {
      chain.connect({ from: dep, to: nodeId })
    }

    if (depFailed) {
      statusMap.set(key, 'skipped')
      continue
    }

    const startedAt = Date.now()
    chain.startNode(nodeId, startedAt)
    try {
      const fn = (instance as Record<string, unknown>)[key]
      if (typeof fn !== 'function') {
        throw new Error(`TraceStep method "${key}" is not a function.`)
      }
      const result = await (fn as (ctx: TracedFlowRunContext<TInput>) => unknown).call(instance, ctxBase)
      resultMap[key] = result
      statusMap.set(key, 'succeeded')
      chain.completeNode(nodeId, {
        output: step.output ? step.output(result, ctxBase) : result,
      })
    }
    catch (error) {
      statusMap.set(key, 'failed')
      chain.failNode(nodeId, { error })
      if (firstError === undefined) {
        firstError = error
      }
      if (stopOnError) {
        break
      }
    }
  }

  if (firstError !== undefined && stopOnError) {
    throw firstError
  }

  return {
    resultMap,
    chain,
    renderResult: chain.render({ direction: options.direction ?? 'TD' }),
  }
}

/**
 * 校验依赖步骤是否存在。
 * @param stepMap 步骤映射。
 */
function validateTraceStepDependencies(stepMap: Map<string, TraceStepMetadata>): void {
  for (const step of stepMap.values()) {
    const deps = step.deps ?? []
    for (const dep of deps) {
      if (!stepMap.has(dep)) {
        throw new Error(`TraceStep dependency "${dep}" referenced by "${step.key}" does not exist.`)
      }
    }
  }
}

/**
 * 按 deps 拓扑排序，并在同层使用 order + key 排序。
 * @param stepMap 步骤映射。
 */
function resolveTraceStepOrder(stepMap: Map<string, TraceStepMetadata>): string[] {
  const indegree = new Map<string, number>()
  const graph = new Map<string, string[]>()

  for (const step of stepMap.values()) {
    indegree.set(step.key, 0)
    graph.set(step.key, [])
  }
  for (const step of stepMap.values()) {
    for (const dep of step.deps ?? []) {
      graph.get(dep)?.push(step.key)
      indegree.set(step.key, (indegree.get(step.key) ?? 0) + 1)
    }
  }

  const queue: string[] = [...indegree.entries()]
    .filter(([, value]) => value === 0)
    .map(([key]) => key)
  sortStepKeys(queue, stepMap)

  const order: string[] = []
  while (queue.length > 0) {
    const key = queue.shift()
    if (!key) {
      break
    }
    order.push(key)
    for (const next of graph.get(key) ?? []) {
      const value = (indegree.get(next) ?? 0) - 1
      indegree.set(next, value)
      if (value === 0) {
        queue.push(next)
        sortStepKeys(queue, stepMap)
      }
    }
  }

  if (order.length !== stepMap.size) {
    throw new Error('TraceStep dependency graph contains cycle.')
  }
  return order
}

/**
 * 对步骤 key 做稳定排序（order -> key）。
 * @param keys 待排序 key。
 * @param stepMap 步骤映射。
 */
function sortStepKeys(keys: string[], stepMap: Map<string, TraceStepMetadata>): void {
  keys.sort((a, b) => {
    const stepA = stepMap.get(a)
    const stepB = stepMap.get(b)
    const orderA = stepA?.order ?? Number.MAX_SAFE_INTEGER
    const orderB = stepB?.order ?? Number.MAX_SAFE_INTEGER
    if (orderA !== orderB) {
      return orderA - orderB
    }
    return a.localeCompare(b)
  })
}

export type {
  AddTaskExecutionNodeOptions,
  CompleteTaskExecutionNodeOptions,
  ConnectTaskExecutionNodeOptions,
  FailTaskExecutionNodeOptions,
  TaskExecutionEdge,
  TaskExecutionMermaidOptions,
  TaskExecutionNode,
  TaskExecutionNodeStatus,
  TaskExecutionRenderResult,
} from './taskExecutionChain.types'

export type {
  RunTracedFlowOptions,
  TraceStepMetadata,
  TraceStepOptions,
  TracedFlowExecuteResult,
  TracedFlowRunContext,
} from './taskExecutionChain.flow-types'
