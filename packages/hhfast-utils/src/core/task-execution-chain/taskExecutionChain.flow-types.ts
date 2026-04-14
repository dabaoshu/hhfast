import type { TaskExecutionChain } from './taskExecutionChain'
import type {
  TaskExecutionMermaidOptions,
  TaskExecutionRenderResult,
} from './taskExecutionChain.types'

/**
 * 流程运行上下文。
 */
export interface TracedFlowRunContext<TInput = unknown> {
  /** 流程入口输入。 */
  input: TInput
  /** 当前已完成步骤结果映射。 */
  results: Readonly<Record<string, unknown>>
  /** 当前执行步骤 key。 */
  stepKey: string
  /** 链路实例。 */
  chain: TaskExecutionChain
}

/**
 * 装饰器步骤配置。
 */
export interface TraceStepOptions<TInput = unknown, TResult = unknown> {
  /** 展示名称。 */
  name: string
  /** 步骤类型。 */
  type?: string
  /** 依赖步骤 key 列表。 */
  deps?: string[]
  /** 同层排序权重，越小越先执行。 */
  order?: number
  /**
   * 自定义节点入参提取。
   * @param ctx 执行上下文。
   */
  input?: (ctx: TracedFlowRunContext<TInput>) => unknown
  /**
   * 自定义节点出参提取。
   * @param result 原始返回值。
   * @param ctx 执行上下文。
   */
  output?: (result: TResult, ctx: TracedFlowRunContext<TInput>) => unknown
}

/**
 * 装饰器元数据。
 */
export interface TraceStepMetadata<TInput = unknown, TResult = unknown>
  extends TraceStepOptions<TInput, TResult> {
  /** 方法 key。 */
  key: string
}

/**
 * 执行器配置。
 */
export interface RunTracedFlowOptions<TInput = unknown> {
  /** 流程入口输入。 */
  input: TInput
  /** 指定链路实例，不传则自动创建。 */
  chain?: TaskExecutionChain
  /** Mermaid 方向。 */
  direction?: TaskExecutionMermaidOptions['direction']
  /** 出错时是否立即中断，默认 true。 */
  stopOnError?: boolean
}

/**
 * 自动追踪执行结果。
 */
export interface TracedFlowExecuteResult {
  /** 步骤结果映射。 */
  resultMap: Record<string, unknown>
  /** 链路实例。 */
  chain: TaskExecutionChain
  /** 渲染结果。 */
  renderResult: TaskExecutionRenderResult
}
