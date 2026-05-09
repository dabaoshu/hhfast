/// <reference types="vue/jsx" />
import { computed, defineComponent, ref, watch, type PropType, type VNode } from 'vue'
import type { TreeDataMode, TreeNode, TreeRawNode } from './types'
import './tree.scss'

interface InternalNode extends TreeNode {
  order: number
}

/**
 * 读取对象字段值并转为可展示文本。
 */
function getTextValue(record: TreeRawNode, key: string, fallback: string): string {
  const value = record[key]
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  return String(value)
}

/**
 * 解析排序字段。
 */
function getIndexValue(record: TreeRawNode, key: string): number | undefined {
  const value = record[key]
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

/**
 * 以 indexKey 优先、原始顺序兜底进行排序。
 */
function sortByIndex(nodes: InternalNode[]): InternalNode[] {
  return nodes
    .slice()
    .sort((a, b) => {
      const aIndex = a.index
      const bIndex = b.index
      if (aIndex !== undefined && bIndex !== undefined) {
        return aIndex - bIndex
      }
      if (aIndex !== undefined) {
        return -1
      }
      if (bIndex !== undefined) {
        return 1
      }
      return a.order - b.order
    })
}

/**
 * tree 结构转统一节点。
 */
function normalizeTreeNodes(
  list: TreeRawNode[],
  options: {
    idKey: string
    labelKey: string
    childrenKey: string
    indexKey: string
  },
  level = 0,
  path = 'node',
): InternalNode[] {
  const nodes = list.map((item, idx) => {
    const rawId = item[options.idKey]
    const id = (rawId ?? `${path}-${idx}`) as string | number
    const label = getTextValue(item, options.labelKey, String(id))
    const index = getIndexValue(item, options.indexKey)
    const childrenRaw = item[options.childrenKey]
    const childrenList = Array.isArray(childrenRaw) ? (childrenRaw as TreeRawNode[]) : []
    const children = normalizeTreeNodes(
      childrenList,
      options,
      level + 1,
      `${path}-${idx}`,
    )
    return {
      id,
      label,
      level,
      index,
      raw: item,
      children,
      order: idx,
    } satisfies InternalNode
  })

  const sorted = sortByIndex(nodes)
  sorted.forEach((node) => {
    node.children = sortByIndex(node.children as InternalNode[])
  })
  return sorted
}

/**
 * list 结构转统一树节点。
 */
function normalizeListNodes(
  list: TreeRawNode[],
  options: {
    idKey: string
    labelKey: string
    pidKey: string
    levelKey: string
    indexKey: string
  },
): InternalNode[] {
  const nodeMap = new Map<string | number, InternalNode>()
  const parentMap = new Map<string | number, string | number | undefined>()

  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    const rawId = item[options.idKey]
    const id = (rawId ?? `node-${i}`) as string | number
    const label = getTextValue(item, options.labelKey, String(id))
    const index = getIndexValue(item, options.indexKey)
    const levelValue = getIndexValue(item, options.levelKey) ?? 0

    nodeMap.set(id, {
      id,
      label,
      level: Math.max(0, levelValue),
      index,
      raw: item,
      children: [],
      order: i,
    })

    const pidRaw = item[options.pidKey]
    parentMap.set(id, pidRaw as string | number | undefined)
  }

  const roots: InternalNode[] = []
  nodeMap.forEach((node) => {
    const parentId = parentMap.get(node.id)
    const parent = parentId !== undefined && parentId !== null ? nodeMap.get(parentId) : undefined
    if (!parent || parent.id === node.id) {
      roots.push(node)
      return
    }
    node.level = parent.level + 1
    parent.children.push(node)
  })

  const walkSort = (nodes: InternalNode[]): InternalNode[] => {
    const sorted = sortByIndex(nodes)
    for (const node of sorted) {
      node.children = walkSort(node.children as InternalNode[])
    }
    return sorted
  }

  return walkSort(roots)
}

/**
 * 扁平化节点（用于快速初始化展开状态）。
 */
function flattenNodes(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = []
  const walk = (items: TreeNode[]) => {
    for (const item of items) {
      result.push(item)
      if (item.children.length > 0) {
        walk(item.children)
      }
    }
  }
  walk(nodes)
  return result
}

const HTree = defineComponent({
  name: 'HTree',
  props: {
    data: {
      type: Array as PropType<TreeRawNode[]>,
      default: () => [],
    },
    dataMode: {
      type: String as PropType<TreeDataMode>,
      default: 'auto',
    },
    idKey: {
      type: String,
      default: 'id',
    },
    labelKey: {
      type: String,
      default: 'name',
    },
    childrenKey: {
      type: String,
      default: 'children',
    },
    pidKey: {
      type: String,
      default: 'pid',
    },
    levelKey: {
      type: String,
      default: 'level',
    },
    indexKey: {
      type: String,
      default: 'index',
    },
    indent: {
      type: Number,
      default: 18,
    },
    defaultExpandAll: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['nodeClick'],
  setup(props, { emit, slots }) {
    const expandedKeys = ref<Set<string | number>>(new Set())
    const activeNodeKey = ref<string | number | undefined>(undefined)

    const actualMode = computed<TreeDataMode>(() => {
      if (props.dataMode !== 'auto') {
        return props.dataMode
      }
      const first = props.data[0]
      if (!first) {
        return 'tree'
      }
      if (Array.isArray(first[props.childrenKey])) {
        return 'tree'
      }
      if (first[props.pidKey] !== undefined) {
        return 'list'
      }
      return 'tree'
    })

    const treeData = computed<TreeNode[]>(() => {
      if (!Array.isArray(props.data) || props.data.length === 0) {
        return []
      }
      if (actualMode.value === 'list') {
        return normalizeListNodes(props.data, {
          idKey: props.idKey,
          labelKey: props.labelKey,
          pidKey: props.pidKey,
          levelKey: props.levelKey,
          indexKey: props.indexKey,
        })
      }
      return normalizeTreeNodes(props.data, {
        idKey: props.idKey,
        labelKey: props.labelKey,
        childrenKey: props.childrenKey,
        indexKey: props.indexKey,
      })
    })

    watch(
      treeData,
      (nodes) => {
        if (!props.defaultExpandAll) {
          expandedKeys.value = new Set()
          return
        }
        const keySet = new Set<string | number>()
        flattenNodes(nodes).forEach((node) => {
          if (node.children.length > 0) {
            keySet.add(node.id)
          }
        })
        expandedKeys.value = keySet
      },
      { immediate: true },
    )

    /**
     * 切换节点展开/收起状态。
     */
    function toggleNode(node: TreeNode): void {
      const next = new Set(expandedKeys.value)
      if (next.has(node.id)) {
        next.delete(node.id)
      }
      else {
        next.add(node.id)
      }
      expandedKeys.value = next
    }

    /**
     * 节点点击回调。
     */
    function handleNodeClick(node: TreeNode): void {
      activeNodeKey.value = node.id
      emit('nodeClick', node)
    }

    /**
     * 递归渲染单个节点。
     */
    function renderNode(node: TreeNode): VNode {
      const hasChildren = node.children.length > 0
      const expanded = expandedKeys.value.has(node.id)
      const isActive = activeNodeKey.value === node.id
      const renderLabel = hasChildren
        ? slots.nonLeaf?.({
            node,
            expanded,
            toggle: () => toggleNode(node),
          }) ?? <span class="hh-tree__label">{node.label}</span>
        : slots.leaf?.({ node }) ?? <span class="hh-tree__label">{node.label}</span>
      return (
        <li class="hh-tree__item" key={String(node.id)}>
          <div
            class={['hh-tree__node', isActive && 'hh-tree__node--active']}
            style={{ paddingLeft: `${node.level * props.indent}px` }}
            onClick={() => handleNodeClick(node)}
          >
            {hasChildren
              ? (
                <button
                  class="hh-tree__toggle"
                  type="button"
                  onClick={(event: MouseEvent) => {
                    event.stopPropagation()
                    toggleNode(node)
                  }}
                >
                  {expanded ? '\u25BE' : '\u25B8'}
                </button>
                )
              : <span class="hh-tree__toggle hh-tree__toggle--empty" />}
            {renderLabel}
          </div>
          {hasChildren && expanded && (
            <ul class="hh-tree__children">
              {node.children.map((child) => renderNode(child))}
            </ul>
          )}
        </li>
      )
    }

    return () => (
      <div class={['hh-tree', actualMode.value === 'list' ? 'hh-tree--list' : 'hh-tree--tree']}>
        {treeData.value.length === 0
          ? <div class="hh-tree__empty">暂无节点</div>
          : <ul class="hh-tree__root">{treeData.value.map((node) => renderNode(node))}</ul>}
      </div>
    )
  },
})

export { HTree }
