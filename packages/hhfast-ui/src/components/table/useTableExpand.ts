import { ref, watch } from 'vue';
import type { Ref } from 'vue';
import type { TableProps, TableRowKey } from './types';
import { forEachTreeNode, getChildren } from './tableUtils';

/** useTableExpand 入参。 */
export interface UseTableExpandOptions<T extends Record<string, unknown>> {
  props: TableProps<T>;
  getRecordKey: (record: T, index: number) => TableRowKey;
}

/** useTableExpand 出参。 */
export interface UseTableExpandReturn<T extends Record<string, unknown>> {
  treeExpandedKeys: Ref<TableRowKey[]>;
  detailExpandedKeys: Ref<TableRowKey[]>;
  isTreeExpanded: (key: TableRowKey) => boolean;
  isDetailExpanded: (key: TableRowKey) => boolean;
  isRowDetailExpandable: (record: T) => boolean;
  toggleTreeExpand: (record: T, index: number) => void;
  toggleDetailExpand: (record: T, index: number) => void;
}

/**
 * 收集所有拥有子节点的 key（用于 defaultExpandAll）。
 */
function collectExpandableParentKeys<T extends Record<string, unknown>>(
  nodes: T[],
  childrenColumnName: string,
  getRecordKey: (record: T, index: number) => TableRowKey
): TableRowKey[] {
  const keys: TableRowKey[] = [];
  forEachTreeNode(nodes, childrenColumnName, (node) => {
    if (getChildren(node, childrenColumnName).length > 0) {
      keys.push(getRecordKey(node, 0));
    }
  });
  return keys;
}

/**
 * 树展开 keys 与详情展开 keys（两套独立，受控/非受控）。
 */
export function useTableExpand<T extends Record<string, unknown>>(
  options: UseTableExpandOptions<T>
): UseTableExpandReturn<T> {
  const { props, getRecordKey } = options;
  const childrenColumnName = (): string => props.childrenColumnName ?? 'children';

  const initialTreeKeys = (): TableRowKey[] => {
    if (props.expandedRowKeys != null) {
      return props.expandedRowKeys.slice();
    }
    if (props.defaultExpandAll) {
      return collectExpandableParentKeys(props.dataSource ?? [], childrenColumnName(), getRecordKey);
    }
    return props.defaultExpandedRowKeys?.slice() ?? [];
  };

  const treeExpandedKeys = ref<TableRowKey[]>(initialTreeKeys());
  const detailExpandedKeys = ref<TableRowKey[]>(
    props.expandable?.expandedRowKeys?.slice() ??
      props.expandable?.defaultExpandedRowKeys?.slice() ??
      []
  );

  watch(
    () => props.expandedRowKeys,
    (value) => {
      if (value != null) {
        treeExpandedKeys.value = value.slice();
      }
    }
  );

  watch(
    () => props.expandable?.expandedRowKeys,
    (value) => {
      if (value != null) {
        detailExpandedKeys.value = value.slice();
      }
    }
  );

  const isTreeExpanded = (key: TableRowKey): boolean =>
    treeExpandedKeys.value.some((item) => String(item) === String(key));

  const isDetailExpanded = (key: TableRowKey): boolean =>
    detailExpandedKeys.value.some((item) => String(item) === String(key));

  const isRowDetailExpandable = (record: T): boolean =>
    props.expandable?.rowExpandable?.(record) ?? true;

  const setTreeKeys = (keys: TableRowKey[], record: T, expanded: boolean): void => {
    if (props.expandedRowKeys == null) {
      treeExpandedKeys.value = keys;
    }
    props.onExpandedRowsChange?.(keys);
    props.onExpand?.(expanded, record);
  };

  const setDetailKeys = (keys: TableRowKey[], record: T, expanded: boolean): void => {
    if (props.expandable?.expandedRowKeys == null) {
      detailExpandedKeys.value = keys;
    }
    props.expandable?.onExpandedRowsChange?.(keys);
    props.expandable?.onExpand?.(expanded, record);
  };

  const toggleTreeExpand = (record: T, index: number): void => {
    const key = getRecordKey(record, index);
    const open = isTreeExpanded(key);
    const next = open
      ? treeExpandedKeys.value.filter((item) => String(item) !== String(key))
      : [...treeExpandedKeys.value, key];
    setTreeKeys(next, record, !open);
  };

  const toggleDetailExpand = (record: T, index: number): void => {
    if (!props.expandable || !isRowDetailExpandable(record)) {
      return;
    }
    const key = getRecordKey(record, index);
    const open = isDetailExpanded(key);
    const next = open
      ? detailExpandedKeys.value.filter((item) => String(item) !== String(key))
      : [...detailExpandedKeys.value, key];
    setDetailKeys(next, record, !open);
  };

  return {
    treeExpandedKeys,
    detailExpandedKeys,
    isTreeExpanded,
    isDetailExpanded,
    isRowDetailExpandable,
    toggleTreeExpand,
    toggleDetailExpand,
  };
}
