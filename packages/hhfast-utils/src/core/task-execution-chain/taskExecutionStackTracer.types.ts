import type { TaskExecutionRenderResult } from './taskExecutionChain.types'
import type { TaskExecutionStackTracer } from './taskExecutionStackTracer'

/**
 * 调用栈追踪单步配置。
 */
export interface StackTraceStepOptions<TInput = unknown> {
  /** 节点名称。 */
  name: string
  /** 节点类型。 */
  type?: string
  /** 入参快照。 */
  input?: TInput
  /** 指定父节点 ID，不传则自动取当前调用栈顶部节点。 */
  parentId?: string
}

/**
 * 调用栈追踪执行上下文。
 */
export interface StackTraceRunContext {
  /** 当前追踪器实例。 */
  tracer: TaskExecutionStackTracer
  /** 当前节点 ID。 */
  nodeId: string
  /** 父节点 ID。 */
  parentNodeId?: string
  /** 当前调用栈深度。 */
  stackDepth: number
}

/**
 * 调用栈追踪执行参数。
 */
export interface StackTraceExecuteOptions<TInput = unknown, TResult = unknown>
  extends StackTraceStepOptions<TInput> {
  /**
   * 出参映射函数。
   * @param result 原始返回值。
   */
  mapOutput?: (result: TResult) => unknown
  /**
   * 异常映射函数。
   * @param error 原始异常。
   */
  mapError?: (error: unknown) => unknown
}

/**
 * TraceEnter 装饰器配置。
 */
export interface TraceEnterOptions<TInput = unknown> {
  /** 入口节点名称。 */
  name?: string
  /** 入口节点类型。 */
  type?: string
  /**
   * 入口入参映射。
   * @param args 方法参数。
   */
  input?: (args: unknown[]) => TInput
  /**
   * 是否追踪实例方法（默认 true）。
   */
  traceInstanceMethods?: boolean
}

/**
 * TraceCall 装饰器配置。
 */
export interface TraceCallOptions<TInput = unknown, TResult = unknown> {
  /** 节点名称。 */
  name?: string
  /** 节点类型。 */
  type?: string
  /**
   * 入参映射函数。
   * @param args 方法参数。
   */
  input?: (args: unknown[]) => TInput
  /**
   * 出参映射函数。
   * @param result 原始返回值。
   */
  output?: (result: TResult) => unknown
}

/**
 * 类装饰器配置：默认追踪方法与属性。
 */
export interface TraceAllOptions {
  /** 名称前缀。 */
  namePrefix?: string
  /** 是否追踪方法调用，默认 true。 */
  traceMethods?: boolean
  /** 是否追踪属性 get/set，默认 true。 */
  traceProperties?: boolean
  /** 仅追踪这些键，优先级高于 exclude。 */
  include?: Array<string | symbol>
  /** 排除这些键。 */
  exclude?: Array<string | symbol>
}

/**
 * 属性装饰器配置：追踪 get/set。
 */
export interface TraceVarOptions {
  /** 节点名称，不传则自动生成。 */
  name?: string
  /** 节点类型。 */
  type?: string
}

/**
 * 独立变量追踪句柄。
 */
export interface TracedVariable<T> {
  /** 获取值。 */
  get: () => T
  /** 设置值。 */
  set: (value: T) => void
}

/**
 * TraceEnter 执行结果。
 */
export interface TraceEnterExecuteResult<TResult = unknown> {
  /** 原始返回值。 */
  result: TResult
  /** 追踪器实例。 */
  tracer: TaskExecutionStackTracer
  /** 渲染结果。 */
  renderResult: TaskExecutionRenderResult
}
