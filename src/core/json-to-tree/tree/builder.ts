import type {
  JsonLeafNodeMode,
  JsonToTreeOptions,
  JsonTreeNode,
  JsonTreeNodeBuildContext,
  JsonTreeValueType,
} from '../types'
import { buildValueLeaf } from '../nodes/valueLeaf'
import { buildTypeLeaf, buildTypeArrayChildren } from '../nodes/typeNode'
import { buildContainer } from '../nodes/container'
import { getValueType, isRecord } from '../utils'

export interface BuilderOptions {
  pathSeparator: string
  leafNodeMode: JsonLeafNodeMode
}

export interface BuildNodeParams {
  label: string
  path: string
  value: unknown
  options: BuilderOptions
  userOptions: JsonToTreeOptions
}

/**
 * 递归构建单个树节点。
 */
export function buildNode(params: BuildNodeParams): JsonTreeNode {
  const { label, path, value, options, userOptions } = params
  const valueType = getValueType(value)

  if (valueType === 'array') {
    return buildArrayNode(label, path, Array.isArray(value) ? value : [], options, userOptions)
  }
  if (valueType === 'object') {
    return buildObjectNode(label, path, isRecord(value) ? value : {}, options, userOptions)
  }

  return buildLeafNode(label, path, value, valueType, options, userOptions)
}

function buildArrayNode(
  label: string,
  path: string,
  value: unknown[],
  options: BuilderOptions,
  userOptions: JsonToTreeOptions,
): JsonTreeNode {
  const children =
    options.leafNodeMode === 'type'
      ? buildTypeArrayChildren({
          parentPath: path,
          items: value,
          options: userOptions,
          buildChildNode: makeChildBuilder(options, userOptions),
        })
      : value.map((item, index) =>
          buildNode({
            label: String(index),
            path: `${path}${options.pathSeparator}${index}`,
            value: item,
            options,
            userOptions,
          }),
        )

  return applyTransformer(
    buildContainer({
      path,
      label,
      value,
      valueType: 'array',
      leafNodeMode: options.leafNodeMode,
      children,
      options: userOptions,
    }),
    userOptions,
    makeContext(path, label, value, 'array', false, options.leafNodeMode),
  )
}

function buildObjectNode(
  label: string,
  path: string,
  value: Record<string, unknown>,
  options: BuilderOptions,
  userOptions: JsonToTreeOptions,
): JsonTreeNode {
  const children = Object.entries(value).map(([key, val]) =>
    buildNode({
      label: key,
      path: `${path}${options.pathSeparator}${key}`,
      value: val,
      options,
      userOptions,
    }),
  )

  return applyTransformer(
    buildContainer({
      path,
      label,
      value,
      valueType: 'object',
      leafNodeMode: options.leafNodeMode,
      children,
      options: userOptions,
    }),
    userOptions,
    makeContext(path, label, value, 'object', false, options.leafNodeMode),
  )
}

function buildLeafNode(
  label: string,
  path: string,
  value: unknown,
  valueType: JsonTreeValueType,
  options: BuilderOptions,
  userOptions: JsonToTreeOptions,
): JsonTreeNode {
  const node =
    options.leafNodeMode === 'type'
      ? buildTypeLeaf({
          label,
          path,
          value,
          valueType,
          typeExpressionBuilder: userOptions.typeExpressionBuilder,
        })
      : buildValueLeaf({ label, path, value, valueType })

  return applyTransformer(
    node,
    userOptions,
    makeContext(path, label, value, valueType, true, options.leafNodeMode),
  )
}

function makeChildBuilder(
  options: BuilderOptions,
  userOptions: JsonToTreeOptions,
): (params: { label: string; path: string; value: unknown }) => JsonTreeNode {
  return ({ label, path, value }) =>
    buildNode({ label, path, value, options, userOptions: { ...userOptions, leafNodeMode: 'type' } })
}

function makeContext(
  path: string,
  label: string,
  value: unknown,
  valueType: JsonTreeValueType,
  isLeaf: boolean,
  leafNodeMode: JsonLeafNodeMode,
): JsonTreeNodeBuildContext {
  return { path, label, value, valueType, isLeaf, leafNodeMode }
}

function applyTransformer(
  node: JsonTreeNode,
  options: JsonToTreeOptions,
  context: JsonTreeNodeBuildContext,
): JsonTreeNode {
  return options.nodeTransformer ? options.nodeTransformer(node, context) : node
}
