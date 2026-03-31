/**
 * 可视化节点状态。
 */
export type TaskExecutionNodeStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'skipped'

/**
 * 执行链节点。
 */
export interface TaskExecutionNode<
  TInput = unknown,
  TOutput = unknown,
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> {
  /** 节点 ID。 */
  id: string
  /** 节点名称（用于展示）。 */
  name: string
  /** 节点类型（用于分组/筛选）。 */
  type: string
  /** 节点状态。 */
  status: TaskExecutionNodeStatus
  /** 入参快照。 */
  input?: TInput
  /** 出参快照。 */
  output?: TOutput
  /** 错误信息。 */
  error?: unknown
  /** 开始时间戳。 */
  startedAt?: number
  /** 结束时间戳。 */
  finishedAt?: number
  /** 扩展元数据。 */
  metadata?: TMeta
}

/**
 * 执行链连线。
 */
export interface TaskExecutionEdge {
  /** 起点节点 ID。 */
  from: string
  /** 终点节点 ID。 */
  to: string
  /** 连线标签。 */
  label?: string
}

/**
 * 执行链渲染结果。
 */
export interface TaskExecutionRenderResult {
  /** 渲染节点。 */
  nodes: TaskExecutionNode[]
  /** 渲染连线。 */
  edges: TaskExecutionEdge[]
  /** Mermaid 流程图源码。 */
  mermaid: string
}

/**
 * 添加节点参数。
 */
export interface AddTaskExecutionNodeOptions<
  TInput = unknown,
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> {
  /** 节点 ID，不传则自动生成。 */
  id?: string
  /** 节点名称。 */
  name: string
  /** 节点类型。 */
  type?: string
  /** 初始状态。 */
  status?: TaskExecutionNodeStatus
  /** 入参。 */
  input?: TInput
  /** 开始时间戳。 */
  startedAt?: number
  /** 额外元信息。 */
  metadata?: TMeta
}

/**
 * 完成节点参数。
 */
export interface CompleteTaskExecutionNodeOptions<TOutput = unknown> {
  /** 出参。 */
  output?: TOutput
  /** 结束时间戳，不传则取当前时间。 */
  finishedAt?: number
}

/**
 * 失败节点参数。
 */
export interface FailTaskExecutionNodeOptions {
  /** 错误对象。 */
  error?: unknown
  /** 结束时间戳，不传则取当前时间。 */
  finishedAt?: number
}

/**
 * 连线参数。
 */
export interface ConnectTaskExecutionNodeOptions {
  /** 起点节点 ID。 */
  from: string
  /** 终点节点 ID。 */
  to: string
  /** 连线标签。 */
  label?: string
}

/**
 * Mermaid 渲染配置。
 */
export interface TaskExecutionMermaidOptions {
  /** 方向，默认 TD。 */
  direction?: 'TD' | 'LR' | 'BT' | 'RL'
}

const createNodeId = (): string => {
  const random = Math.random().toString(36).slice(2, 8)
  return `node_${Date.now()}_${random}`
}

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
    const id = options.id ?? createNodeId()
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
