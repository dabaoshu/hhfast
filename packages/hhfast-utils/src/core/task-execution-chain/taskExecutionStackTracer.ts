import { TaskExecutionChain } from './taskExecutionChain'
import type {
  TaskExecutionMermaidOptions,
  TaskExecutionRenderResult,
} from './taskExecutionChain.types'
import type {
  StackTraceExecuteOptions,
  StackTraceRunContext,
  TraceAllOptions,
  TraceCallOptions,
  TraceEnterOptions,
  TraceVarOptions,
  TracedVariable,
} from './taskExecutionStackTracer.types'

const TRACE_ENTER_RESULT = new WeakMap<object, TaskExecutionRenderResult>()
const ACTIVE_TRACER = new WeakMap<object, TaskExecutionStackTracer>()
const TRACE_VAR_STORE = new WeakMap<object, Map<string | symbol, unknown>>()

/**
 * @description 将任意文本转换为可作为节点 ID 的安全片段。
 * - 仅保留字母/数字，其余字符统一转为 `_`
 * - 压缩重复 `_`，并去除首尾 `_`
 * - 保底返回 `unnamed`
 * @param value 原始文本。
 */
function toSafeIdPart(value: string): string {
  const normalized = value
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized || 'unnamed'
}

/**
 * @description 生成稳定、可读的步骤节点 ID。
 * @param seq 自增序号（同一次 TraceEnter 内从 1 递增）。
 * @param type 节点类型。
 * @param name 节点名称。
 */
function createStableStepNodeId(seq: number, type: string, name: string): string {
  const typePart = toSafeIdPart(type || 'stack_step')
  const namePart = toSafeIdPart(name || 'step')
  return `step_${seq}_${typePart}_${namePart}`
}

/**
 * 创建调用栈追踪器。
 * @param chain 可选链路实例。
 */
export function createStackTracer(chain?: TaskExecutionChain): TaskExecutionStackTracer {
  return new TaskExecutionStackTracer(chain)
}

/**
 * 获取实例上一次 TraceEnter 执行结果。
 * @param instance 业务实例。
 */
export function getLastTraceResult(instance: object): TaskExecutionRenderResult | undefined {
  return TRACE_ENTER_RESULT.get(instance)
}

/**
 * 步骤装饰器：仅在 TraceEnter 上下文内自动记录该方法调用。
 * @param options 装饰器配置。
 */
export function TraceCall<TInput = unknown, TResult = unknown>(
  options: TraceCallOptions<TInput, TResult> = {},
): MethodDecorator {
  return (_target, propertyKey, descriptor): void => {
    if (!descriptor || typeof descriptor.value !== 'function') {
      throw new Error('TraceCall can only decorate class methods.')
    }
    const original = descriptor.value
    const methodName = String(propertyKey)
    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const self = this as object
      const tracer = ACTIVE_TRACER.get(self)
      if (!tracer) {
        return original.apply(self, args)
      }
      return tracer.trace(
        {
          name: options.name ?? methodName,
          type: options.type ?? 'call',
          input: options.input ? options.input(args) : args,
          mapOutput: options.output as ((result: unknown) => unknown) | undefined,
        },
        () => original.apply(self, args),
      )
    }
  }
}

/**
 * 类装饰器：默认追踪该类的所有方法与属性 get/set。
 * @param options 装饰器配置。
 */
export function TraceAll(options: TraceAllOptions = {}): ClassDecorator {
  return (target): void => {
    const proto = target.prototype as Record<string | symbol, unknown>
    const traceMethods = options.traceMethods ?? true
    const traceProperties = options.traceProperties ?? true
    const include = new Set(options.include ?? [])
    const exclude = new Set(options.exclude ?? [])
    const prefix = options.namePrefix ?? target.name

    for (const key of Reflect.ownKeys(proto)) {
      if (key === 'constructor') {
        continue
      }
      if (include.size > 0 && !include.has(key)) {
        continue
      }
      if (exclude.has(key)) {
        continue
      }
      const descriptor = Object.getOwnPropertyDescriptor(proto, key)
      if (!descriptor) {
        continue
      }
      if (traceMethods && typeof descriptor.value === 'function') {
        const original = descriptor.value
        descriptor.value = function (...args: unknown[]): unknown {
          const tracer = ACTIVE_TRACER.get(this as object)
          if (!tracer) {
            return original.apply(this, args)
          }
          return tracer.trace(
            {
              name: `${prefix}.${String(key)}`,
              type: 'class-method',
              input: args,
            },
            () => original.apply(this, args),
          )
        }
        Object.defineProperty(proto, key, descriptor)
        continue
      }
      if (traceProperties && (descriptor.get || descriptor.set)) {
        const originalGet = descriptor.get
        const originalSet = descriptor.set
        descriptor.get = function (): unknown {
          const value = originalGet ? originalGet.call(this) : undefined
          const tracer = ACTIVE_TRACER.get(this as object)
          if (tracer) {
            tracer.traceSync(
              {
                name: `${prefix}.${String(key)}#get`,
                type: 'class-property-get',
                input: undefined,
              },
              () => value,
            )
          }
          return value
        }
        descriptor.set = function (value: unknown): void {
          const tracer = ACTIVE_TRACER.get(this as object)
          if (tracer) {
            tracer.traceSync(
              {
                name: `${prefix}.${String(key)}#set`,
                type: 'class-property-set',
                input: value,
              },
              () => {
                originalSet?.call(this, value)
              },
            )
            return
          }
          originalSet?.call(this, value)
        }
        Object.defineProperty(proto, key, descriptor)
      }
    }
  }
}

/**
 * 字段装饰器：追踪属性读取和赋值。
 * @param options 装饰器配置。
 */
export function TraceVar(options: TraceVarOptions = {}): PropertyDecorator {
  return (target, propertyKey): void => {
    Object.defineProperty(target, propertyKey, {
      configurable: true,
      enumerable: true,
      get(this: object): unknown {
        const map = ensureTraceVarStore(this)
        const value = map.get(propertyKey)
        const tracer = ACTIVE_TRACER.get(this)
        if (!tracer) {
          return value
        }
        return tracer.traceSync(
          {
            name: options.name ?? `${String(propertyKey)}#get`,
            type: options.type ?? 'var-get',
          },
          () => value,
        )
      },
      set(this: object, value: unknown): void {
        const map = ensureTraceVarStore(this)
        const tracer = ACTIVE_TRACER.get(this)
        if (!tracer) {
          map.set(propertyKey, value)
          return
        }
        tracer.traceSync(
          {
            name: options.name ?? `${String(propertyKey)}#set`,
            type: options.type ?? 'var-set',
            input: value,
          },
          () => {
            map.set(propertyKey, value)
          },
        )
      },
    })
  }
}

/**
 * 独立变量追踪包装器。
 * @param owner 上下文对象，用于读取当前 tracer。
 * @param initial 初始值。
 * @param name 节点名称前缀。
 */
export function createTraceVariable<T>(owner: object, initial: T, name: string): TracedVariable<T> {
  let value = initial
  return {
    get: () => {
      const tracer = ACTIVE_TRACER.get(owner)
      if (!tracer) {
        return value
      }
      return tracer.traceSync(
        {
          name: `${name}#get`,
          type: 'var-get',
        },
        () => value,
      )
    },
    set: (nextValue: T) => {
      const tracer = ACTIVE_TRACER.get(owner)
      if (!tracer) {
        value = nextValue
        return
      }
      tracer.traceSync(
        {
          name: `${name}#set`,
          type: 'var-set',
          input: nextValue,
        },
        () => {
          value = nextValue
        },
      )
    },
  }
}

/**
 * 入口装饰器：收集入口方法内部所有 `this.xxx()` 调用链路。
 * @param options 装饰器配置。
 */
export function TraceEnter<TInput = unknown>(
  options: TraceEnterOptions<TInput> = {},
): MethodDecorator {
  return (_target, propertyKey, descriptor): void => {
    if (!descriptor || typeof descriptor.value !== 'function') {
      throw new Error('TraceEnter can only decorate class methods.')
    }
    const original = descriptor.value
    const methodName = String(propertyKey)

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const self = this as Record<string, unknown>
      const tracer = createStackTracer()
      const traceInstanceMethods = options.traceInstanceMethods ?? true
      const wrappedMethodCache = new Map<string, (...innerArgs: unknown[]) => unknown>()

      const proxyThis = traceInstanceMethods
        ? new Proxy(self, {
            get(target, prop, receiver) {
              const value = Reflect.get(target, prop, receiver)
              if (typeof prop !== 'string' || typeof value !== 'function') {
                return value
              }
              if (prop === methodName) {
                return value.bind(target)
              }
              const cached = wrappedMethodCache.get(prop)
              if (cached) {
                return cached
              }
              const wrapped = async (...innerArgs: unknown[]): Promise<unknown> =>
                tracer.trace(
                  {
                    name: prop,
                    type: 'method',
                    input: innerArgs,
                  },
                  () => (value as (...methodArgs: unknown[]) => unknown).apply(receiver, innerArgs),
                )
              wrappedMethodCache.set(prop, wrapped)
              return wrapped
            },
          })
        : self

      const entryName = options.name ?? methodName
      const entryType = options.type ?? 'entry'
      const entryInput = options.input ? options.input(args) : args

      ACTIVE_TRACER.set(self, tracer)
      if (proxyThis !== self) {
        ACTIVE_TRACER.set(proxyThis as object, tracer)
      }
      try {
        const result = await tracer.trace(
          {
            name: entryName,
            type: entryType,
            input: entryInput,
          },
          () => original.apply(proxyThis, args),
        )
        const renderResult = tracer.render()
        TRACE_ENTER_RESULT.set(self, renderResult)
        return result
      }
      finally {
        ACTIVE_TRACER.delete(self)
        if (proxyThis !== self) {
          ACTIVE_TRACER.delete(proxyThis as object)
        }
      }
    }
  }
}

/**
 * 调用栈驱动的任务链路追踪器。
 *
 * 特点：
 * - 自动按调用层级建边（parent -> child）；
 * - 自动记录步骤入参、出参、错误和状态；
 * - 风格接近 `console.trace()`，业务侵入极低。
 */
export class TaskExecutionStackTracer {
  private readonly chain: TaskExecutionChain
  private readonly stack: string[] = []
  /** 用于生成稳定可复现的节点 id（每次 TraceEnter 执行从 0 开始）。 */
  private seq = 0

  /**
   * @param chain 可选链路实例，不传则内部自动创建。
   */
  constructor(chain?: TaskExecutionChain) {
    this.chain = chain ?? new TaskExecutionChain()
  }

  /**
   * 获取底层链路实例。
   */
  getChain(): TaskExecutionChain {
    return this.chain
  }

  /**
   * 获取当前栈顶节点 ID。
   */
  getCurrentNodeId(): string | undefined {
    return this.stack[this.stack.length - 1]
  }

  /**
   * 获取当前调用栈快照。
   */
  getStackSnapshot(): string[] {
    return this.stack.slice()
  }

  /**
   * 清空链路与调用栈。
   */
  reset(): void {
    this.stack.length = 0
    this.chain.clear()
  }

  /**
   * 渲染当前链路结果。
   * @param options Mermaid 参数。
   */
  render(options: TaskExecutionMermaidOptions = {}): TaskExecutionRenderResult {
    return this.chain.render(options)
  }

  /**
   * 在追踪器中执行一个步骤，并自动维护调用栈关系。
   * @param options 步骤参数。
   * @param runner 执行函数。
   */
  async trace<TInput = unknown, TResult = unknown>(
    options: StackTraceExecuteOptions<TInput, TResult>,
    runner: (ctx: StackTraceRunContext) => Promise<TResult> | TResult,
  ): Promise<TResult> {
    const parentNodeId = options.parentId ?? this.getCurrentNodeId()
    const nextSeq = ++this.seq
    const id = createStableStepNodeId(nextSeq, options.type ?? 'stack-step', options.name)
    const nodeId = this.chain.addNode({
      id,
      name: options.name,
      type: options.type ?? 'stack-step',
      input: options.input,
      status: 'pending',
    })

    if (parentNodeId) {
      this.chain.connect({
        from: parentNodeId,
        to: nodeId,
      })
    }

    this.stack.push(nodeId)
    this.chain.startNode(nodeId)

    try {
      const result = await runner({
        tracer: this,
        nodeId,
        parentNodeId,
        stackDepth: this.stack.length,
      })
      this.chain.completeNode(nodeId, {
        output: options.mapOutput ? options.mapOutput(result) : result,
      })
      return result
    }
    catch (error) {
      this.chain.failNode(nodeId, {
        error: options.mapError ? options.mapError(error) : error,
      })
      throw error
    }
    finally {
      this.popStackNode(nodeId)
    }
  }

  /**
   * 同步步骤追踪，适用于属性 get/set 等同步路径。
   * @param options 步骤参数。
   * @param runner 执行函数。
   */
  traceSync<TInput = unknown, TResult = unknown>(
    options: StackTraceExecuteOptions<TInput, TResult>,
    runner: () => TResult,
  ): TResult {
    const parentNodeId = options.parentId ?? this.getCurrentNodeId()
    const nextSeq = ++this.seq
    const id = createStableStepNodeId(nextSeq, options.type ?? 'stack-step', options.name)
    const nodeId = this.chain.addNode({
      id,
      name: options.name,
      type: options.type ?? 'stack-step',
      input: options.input,
      status: 'pending',
    })
    if (parentNodeId) {
      this.chain.connect({
        from: parentNodeId,
        to: nodeId,
      })
    }
    this.stack.push(nodeId)
    this.chain.startNode(nodeId)
    try {
      const result = runner()
      this.chain.completeNode(nodeId, {
        output: options.mapOutput ? options.mapOutput(result) : result,
      })
      return result
    }
    catch (error) {
      this.chain.failNode(nodeId, {
        error: options.mapError ? options.mapError(error) : error,
      })
      throw error
    }
    finally {
      this.popStackNode(nodeId)
    }
  }

  /**
   * 弹出指定节点，保证异常路径下栈状态一致。
   * @param nodeId 节点 ID。
   */
  private popStackNode(nodeId: string): void {
    const top = this.stack[this.stack.length - 1]
    if (top === nodeId) {
      this.stack.pop()
      return
    }
    const index = this.stack.lastIndexOf(nodeId)
    if (index >= 0) {
      this.stack.splice(index, 1)
    }
  }
}

/**
 * 确保实例的字段存储容器可用。
 * @param instance 实例对象。
 */
function ensureTraceVarStore(instance: object): Map<string | symbol, unknown> {
  const existing = TRACE_VAR_STORE.get(instance)
  if (existing) {
    return existing
  }
  const created = new Map<string | symbol, unknown>()
  TRACE_VAR_STORE.set(instance, created)
  return created
}

export type {
  StackTraceExecuteOptions,
  StackTraceRunContext,
  StackTraceStepOptions,
  TraceAllOptions,
  TraceCallOptions,
  TraceEnterExecuteResult,
  TraceEnterOptions,
  TraceVarOptions,
  TracedVariable,
} from './taskExecutionStackTracer.types'
