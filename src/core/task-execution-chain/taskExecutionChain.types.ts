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
