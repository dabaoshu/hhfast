import type { TableColumn, TableRowKey, TableSortOrder } from './types';

/**
 * 读取节点子列表；非数组时返回空数组。
 *
 * @param record - 行数据
 * @param childrenColumnName - 子节点字段名
 */
export function getChildren<T extends Record<string, unknown>>(
  record: T,
  childrenColumnName: string
): T[] {
  const raw = record[childrenColumnName];
  return Array.isArray(raw) ? (raw as T[]) : [];
}

/**
 * 深度优先遍历树。
 *
 * @param nodes - 节点列表
 * @param childrenColumnName - 子节点字段名
 * @param visitor - 访问回调
 * @param parent - 父节点
 */
export function forEachTreeNode<T extends Record<string, unknown>>(
  nodes: T[],
  childrenColumnName: string,
  visitor: (node: T, parent: T | null) => void,
  parent: T | null = null
): void {
  for (const node of nodes) {
    visitor(node, parent);
    forEachTreeNode(getChildren(node, childrenColumnName), childrenColumnName, visitor, node);
  }
}

/**
 * 收集全部子孙 key（不含自身）。
 *
 * @param record - 行数据
 * @param childrenColumnName - 子节点字段名
 * @param getKey - 取主键
 */
export function collectDescendantKeys<T extends Record<string, unknown>>(
  record: T,
  childrenColumnName: string,
  getKey: (record: T) => TableRowKey
): TableRowKey[] {
  const keys: TableRowKey[] = [];
  forEachTreeNode(getChildren(record, childrenColumnName), childrenColumnName, (node) => {
    keys.push(getKey(node));
  });
  return keys;
}

/**
 * 在树中按 key 查找节点。
 *
 * @param nodes - 节点列表
 * @param key - 目标 key
 * @param childrenColumnName - 子节点字段名
 * @param getKey - 取主键
 */
export function findRecordByKey<T extends Record<string, unknown>>(
  nodes: T[],
  key: TableRowKey,
  childrenColumnName: string,
  getKey: (record: T) => TableRowKey
): T | undefined {
  for (const node of nodes) {
    if (String(getKey(node)) === String(key)) {
      return node;
    }
    const found = findRecordByKey(
      getChildren(node, childrenColumnName),
      key,
      childrenColumnName,
      getKey
    );
    if (found) {
      return found;
    }
  }
  return undefined;
}

/** 内部排序状态（仅维护列 key 与方向）。 */
export interface TableSorterState {
  columnKey?: string;
  order: TableSortOrder;
}

/**
 * 通过 `dataIndex` 安全读取值，支持 `a.b.c` 与数组路径。
 *
 * @param record - 行数据
 * @param dataIndex - 列路径
 */
export function getByDataIndex(
  record: Record<string, unknown>,
  dataIndex?: string | number | Array<string | number>
): unknown {
  if (dataIndex == null) {
    return undefined;
  }
  const path = Array.isArray(dataIndex)
    ? dataIndex
    : String(dataIndex)
        .split('.')
        .filter(Boolean);
  let current: unknown = record;
  for (const key of path) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[String(key)];
  }
  return current;
}

/**
 * 默认值格式化（时间、数组、标签等）。
 *
 * @param value - 原始值
 * @param valueType - 列值类型
 */
export function formatByValueType(
  value: unknown,
  valueType?: TableColumn<any>['valueType']
): unknown {
  if (value == null || valueType == null || valueType === 'text') {
    return value;
  }
  if (valueType === 'date') {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  }
  if (valueType === 'datetime') {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }
  if (valueType === 'array' && Array.isArray(value)) {
    return value.join('、');
  }
  return value;
}

/**
 * 将任意值转换为可比较值，供默认排序使用。
 *
 * @param value - 任意值
 */
export function toComparableValue(value: unknown): string | number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  return String(value ?? '');
}

/**
 * 将标签值标准化为字符串数组，供 `valueType: 'tag'` 使用。
 *
 * @param value - 原始标签值
 */
export function normalizeTagList(value: unknown): string[] {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  return String(value)
    .split(/[,\s/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
