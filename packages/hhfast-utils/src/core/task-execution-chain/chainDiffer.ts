import type {
  TaskExecutionChain,
  TaskExecutionEdge,
  TaskExecutionNode,
} from './taskExecutionChain'
import type {
  TaskExecutionRenderResult,
} from './taskExecutionChain.types'

/**
 * 节点比较结果。
 */
export interface NodeDiff {
  /** 节点 ID。 */
  id: string
  /** 差异类型。 */
  type: 'added' | 'removed' | 'modified'
  /** 变更前的值（added 时为 undefined）。 */
  before?: TaskExecutionNode
  /** 变更后的值（removed 时为 undefined）。 */
  after?: TaskExecutionNode
  /** 变化的字段列表。 */
  changedFields?: Array<{
    field: keyof TaskExecutionNode
    before: unknown
    after: unknown
  }>
}

/**
 * 边比较结果。
 */
export interface EdgeDiff {
  /** 边。 */
  edge: TaskExecutionEdge
  /** 差异类型。 */
  type: 'added' | 'removed'
}

/**
 * 链路比较结果。
 */
export interface ChainDiffResult {
  /** 新增节点。 */
  addedNodes: TaskExecutionNode[]
  /** 移除节点。 */
  removedNodes: TaskExecutionNode[]
  /** 修改节点。 */
  modifiedNodes: Array<{ before: TaskExecutionNode; after: TaskExecutionNode; changes: NodeDiff['changedFields'] }>
  /** 新增边。 */
  addedEdges: TaskExecutionEdge[]
  /** 移除边。 */
  removedEdges: TaskExecutionEdge[]
  /** 所有节点差异。 */
  nodeDiffs: NodeDiff[]
  /** 所有边差异。 */
  edgeDiffs: EdgeDiff[]
  /** 是否有差异。 */
  hasDiff: boolean
  /** 统计摘要。 */
  summary: {
    totalAdded: number
    totalRemoved: number
    totalModified: number
    unchanged: number
  }
}

/**
 * 节点字段比较白名单（排除运行时产生的字段）。 */
const COMPARABLE_NODE_FIELDS: Array<keyof TaskExecutionNode> = [
  'id',
  'name',
  'type',
  'status',
  'input',
  'metadata',
]

/**
 * 判断两个节点是否相等（仅比较核心字段）。 */
function areNodesEqual(a: TaskExecutionNode, b: TaskExecutionNode): boolean {
  for (const field of COMPARABLE_NODE_FIELDS) {
    if (!isEqual(a[field], b[field])) {
      return false
    }
  }
  return true
}

/**
 * 获取节点差异（仅核心字段）。 */
function getNodeChanges(before: TaskExecutionNode, after: TaskExecutionNode): NodeDiff['changedFields'] {
  const changes: NodeDiff['changedFields'] = []
  for (const field of COMPARABLE_NODE_FIELDS) {
    if (!isEqual(before[field], after[field])) {
      changes.push({ field, before: before[field], after: after[field] })
    }
  }
  return changes.length > 0 ? changes : undefined
}

/**
 * 深度相等判断。 */
function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true
  }
  if (a == null || b == null) {
    return a === b
  }
  if (typeof a !== typeof b) {
    return false
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false
    }
    return a.every((item, i) => isEqual(item, b[i]))
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>
    const bObj = b as Record<string, unknown>
    const aKeys = Object.keys(aObj)
    const bKeys = Object.keys(bObj)
    if (aKeys.length !== bKeys.length) {
      return false
    }
    return aKeys.every((key) => isEqual(aObj[key], bObj[key]))
  }
  return false
}

/**
 * 从链路实例、节点数组或渲染结果中提取节点 Map（id -> node）。
 */
function extractNodeMap(
  source: TaskExecutionChain | TaskExecutionNode[] | TaskExecutionRenderResult,
): Map<string, TaskExecutionNode> {
  if (Array.isArray(source)) {
    return new Map(source.map((n) => [n.id, { ...n }]))
  }
  if (typeof (source as TaskExecutionChain).getNodes === 'function') {
    const nodes = (source as TaskExecutionChain).getNodes()
    return new Map(nodes.map((n) => [n.id, { ...n }]))
  }
  const render = source as TaskExecutionRenderResult
  if (Array.isArray(render.nodes)) {
    return new Map(render.nodes.map((n) => [n.id, { ...n }]))
  }
  throw new TypeError('extractNodeMap: 需要 TaskExecutionChain、TaskExecutionNode[] 或 TaskExecutionRenderResult')
}

/**
 * 从链路或渲染结果提取边数组。 */
function extractEdges(source: TaskExecutionChain | TaskExecutionRenderResult | TaskExecutionEdge[]): TaskExecutionEdge[] {
  if (Array.isArray(source)) {
    return source.map((e) => ({ ...e }))
  }
  if ('edges' in source) {
    return source.edges.map((e) => ({ ...e }))
  }
  return source.getEdges().map((e) => ({ ...e }))
}

/**
 * 链路比较器。
 *
 * 用于比较两条执行链路的差异，常用于：
 * - 调试：对比两次执行的差异
 * - 回归测试：验证任务执行是否符合预期
 * - 性能分析：对比不同输入的执行路径差异
 *
 * @example
 * ```ts
 * // 静态方法比较
 * const result = ChainDiffer.diff(chainA, chainB)
 * console.log(result.hasDiff)  // true/false
 * console.log(result.summary)  // 统计摘要
 *
 * // 实例方法比较（可复用配置）
 * const differ = new ChainDiffer({ ignoreTiming: true })
 * const result = differ.compare(chainA, chainB)
 * ```
 */
export class ChainDiffer {
  /**
   * @param options 比较配置。
   * @param options.ignoreTiming 是否忽略时间字段（startedAt、finishedAt）的差异。
   * @param options.ignoreErrors 是否忽略 error 字段的差异。
   * @param options.ignoreOutput 是否忽略 output 字段的差异。
   */
  constructor(
    private readonly options: ChainDifferOptions = {},
  ) {}

  /**
   * 比较两条链路。
   * @param before 变更前的链路。
   * @param after 变更后的链路。
   */
  compare(
    before: TaskExecutionChain | TaskExecutionNode[] | TaskExecutionRenderResult,
    after: TaskExecutionChain | TaskExecutionNode[] | TaskExecutionRenderResult,
  ): ChainDiffResult {
    const beforeNodes = extractNodeMap(before)
    const afterNodes = extractNodeMap(after)
    const beforeEdges = extractEdges(before)
    const afterEdges = extractEdges(after)

    const nodeDiffs = this.computeNodeDiffs(beforeNodes, afterNodes)
    const edgeDiffs = this.computeEdgeDiffs(beforeEdges, afterEdges)

    const addedNodes = nodeDiffs.filter((d) => d.type === 'added').map((d) => d.after!)
    const removedNodes = nodeDiffs.filter((d) => d.type === 'removed').map((d) => d.before!)
    const modifiedNodes = nodeDiffs
      .filter((d) => d.type === 'modified')
      .map((d) => ({
        before: d.before!,
        after: d.after!,
        changes: d.changedFields,
      }))

    const addedEdges = edgeDiffs.filter((d) => d.type === 'added').map((d) => d.edge)
    const removedEdges = edgeDiffs.filter((d) => d.type === 'removed').map((d) => d.edge)

    const totalAdded = addedNodes.length + addedEdges.length
    const totalRemoved = removedNodes.length + removedEdges.length
    const totalModified = modifiedNodes.length

    return {
      addedNodes,
      removedNodes,
      modifiedNodes,
      addedEdges,
      removedEdges,
      nodeDiffs,
      edgeDiffs,
      hasDiff: nodeDiffs.length > 0 || edgeDiffs.length > 0,
      summary: {
        totalAdded,
        totalRemoved,
        totalModified,
        unchanged: afterNodes.size - modifiedNodes.length,
      },
    }
  }

  /**
   * 静态方法比较（使用默认配置）。
   */
  static diff(
    before: TaskExecutionChain | TaskExecutionNode[] | TaskExecutionRenderResult,
    after: TaskExecutionChain | TaskExecutionNode[] | TaskExecutionRenderResult,
  ): ChainDiffResult {
    return new ChainDiffer().compare(before, after)
  }

  /**
   * 计算节点差异。
   */
  private computeNodeDiffs(
    beforeNodes: Map<string, TaskExecutionNode>,
    afterNodes: Map<string, TaskExecutionNode>,
  ): NodeDiff[] {
    const diffs: NodeDiff[] = []

    // 遍历 afterNodes，检测新增和修改
    for (const [id, afterNode] of afterNodes) {
      const beforeNode = beforeNodes.get(id)
      if (!beforeNode) {
        // 新增节点
        diffs.push({ id, type: 'added', after: afterNode })
      }
      else {
        // 比较是否有变化
        const changes = this.getNodeChanges(beforeNode, afterNode)
        if (changes.length > 0) {
          diffs.push({ id, type: 'modified', before: beforeNode, after: afterNode, changedFields: changes })
        }
      }
    }

    // 遍历 beforeNodes，检测移除
    for (const [id, beforeNode] of beforeNodes) {
      if (!afterNodes.has(id)) {
        diffs.push({ id, type: 'removed', before: beforeNode })
      }
    }

    return diffs
  }

  /**
   * 计算边差异。
   */
  private computeEdgeDiffs(
    beforeEdges: TaskExecutionEdge[],
    afterEdges: TaskExecutionEdge[],
  ): EdgeDiff[] {
    const diffs: EdgeDiff[] = []
    const beforeEdgeSet = new Set(beforeEdges.map((e) => edgeKey(e)))
    const afterEdgeSet = new Set(afterEdges.map((e) => edgeKey(e)))

    // 新增的边
    for (const edge of afterEdges) {
      if (!beforeEdgeSet.has(edgeKey(edge))) {
        diffs.push({ edge, type: 'added' })
      }
    }

    // 移除的边
    for (const edge of beforeEdges) {
      if (!afterEdgeSet.has(edgeKey(edge))) {
        diffs.push({ edge, type: 'removed' })
      }
    }

    return diffs
  }

  /**
   * 获取节点变化字段（考虑配置）。 */
  private getNodeChanges(before: TaskExecutionNode, after: TaskExecutionNode): NodeDiff['changedFields'] {
    const fields: Array<keyof TaskExecutionNode> = ['id', 'name', 'type', 'status', 'input', 'metadata']
    if (!this.options.ignoreOutput) {
      fields.push('output')
    }
    if (!this.options.ignoreErrors) {
      fields.push('error')
    }
    if (!this.options.ignoreTiming) {
      fields.push('startedAt', 'finishedAt')
    }

    const changes: NodeDiff['changedFields'] = []
    for (const field of fields) {
      if (!isEqual(before[field], after[field])) {
        changes.push({ field, before: before[field], after: after[field] })
      }
    }
    return changes
  }
}

/**
 * 边的唯一键。 */
function edgeKey(edge: TaskExecutionEdge): string {
  return `${edge.from}|${edge.to}|${edge.label ?? ''}`
}

/**
 * 比较配置。 */
export interface ChainDifferOptions {
  /** 是否忽略时间字段差异。 */
  ignoreTiming?: boolean
  /** 是否忽略 error 字段差异。 */
  ignoreErrors?: boolean
  /** 是否忽略 output 字段差异。 */
  ignoreOutput?: boolean
}
