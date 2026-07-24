import type { TableColumn, TableRowKey, TableSortOrder } from './types';

/** 固定列方向。 */
export type TableFixedSide = 'left' | 'right' | null;

/**
 * 规范化列固定方向。
 *
 * @param fixed - 列 fixed 配置
 */
export function normalizeColumnFixed(
  fixed?: boolean | 'left' | 'right' | 'start' | 'end'
): TableFixedSide {
  if (fixed === true || fixed === 'left' || fixed === 'start') {
    return 'left';
  }
  if (fixed === 'right' || fixed === 'end') {
    return 'right';
  }
  return null;
}

/**
 * 将列宽解析为 px 数字（用于 sticky 偏移）。
 *
 * @param width - 列宽
 * @param fallback - 缺省宽度
 */
export function resolveColumnWidthPx(
  width: number | string | undefined,
  fallback = 120
): number {
  if (typeof width === 'number' && Number.isFinite(width)) {
    return width;
  }
  if (typeof width === 'string') {
    const matched = width.trim().match(/^(\d+(?:\.\d+)?)px$/i);
    if (matched) {
      return Number(matched[1]);
    }
    const asNumber = Number(width);
    if (Number.isFinite(asNumber)) {
      return asNumber;
    }
  }
  return fallback;
}

/**
 * 计算左/右固定列的 sticky 偏移（不含选择列）。
 *
 * @param columns - 列定义
 * @param selectionWidth - 选择列宽度（无选择列传 0）
 */
export function buildFixedColumnOffsets<T extends Record<string, unknown>>(
  columns: TableColumn<T>[],
  selectionWidth = 0
): {
  leftOffsets: Record<string, number>;
  rightOffsets: Record<string, number>;
  leftEdgeKey: string | null;
  rightEdgeKey: string | null;
} {
  const leftOffsets: Record<string, number> = {};
  const rightOffsets: Record<string, number> = {};
  let leftCursor = selectionWidth;
  let leftEdgeKey: string | null = null;

  for (const column of columns) {
    if (normalizeColumnFixed(column.fixed) !== 'left') {
      continue;
    }
    leftOffsets[column.key] = leftCursor;
    leftCursor += resolveColumnWidthPx(column.width);
    leftEdgeKey = column.key;
  }

  let rightCursor = 0;
  let rightEdgeKey: string | null = null;
  for (let i = columns.length - 1; i >= 0; i -= 1) {
    const column = columns[i];
    if (normalizeColumnFixed(column.fixed) !== 'right') {
      continue;
    }
    rightOffsets[column.key] = rightCursor;
    rightCursor += resolveColumnWidthPx(column.width);
    rightEdgeKey = column.key;
  }

  return { leftOffsets, rightOffsets, leftEdgeKey, rightEdgeKey };
}

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
