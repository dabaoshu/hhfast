import { computed, watch } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import type { TableProps, TableRowKey } from './types';
import {
  collectDescendantKeys,
  forEachTreeNode,
  getChildren,
} from './tableUtils';

interface UseTableSelectionOptions<T extends Record<string, unknown>> {
  props: TableProps<T>;
  selectedRowKeys: Ref<TableRowKey[]>;
  current: Ref<number>;
  pageSize: Ref<number>;
  currentPageData: ComputedRef<T[]>;
  getRecordKey: (record: T, index: number) => TableRowKey;
}

/** 行选择变更载荷。 */
export interface TableSelectionPayload<T extends Record<string, unknown>> {
  keys: TableRowKey[];
  rows: T[];
}

/** 行选择分层输出。 */
export interface UseTableSelectionReturn<T extends Record<string, unknown>> {
  selectedRows: ComputedRef<T[]>;
  allCurrentPageSelected: ComputedRef<boolean>;
  isCurrentPageIndeterminate: ComputedRef<boolean>;
  isRowChecked: (record: T, index: number) => boolean;
  isRowIndeterminate: (record: T, index: number) => boolean;
  setSelectedRowKeys: (keys: TableRowKey[]) => TableSelectionPayload<T>;
  toggleRowSelection: (record: T, index: number, checked: boolean) => TableSelectionPayload<T>;
  toggleAllCurrentPage: (checked: boolean) => TableSelectionPayload<T> | undefined;
}

/**
 * 行选择状态管理：受控/非受控、全选、树父子联动与半选。
 */
export function useTableSelection<T extends Record<string, unknown>>(
  options: UseTableSelectionOptions<T>
): UseTableSelectionReturn<T> {
  const { props, selectedRowKeys, current, pageSize, currentPageData, getRecordKey } = options;

  const childrenColumnName = (): string => props.childrenColumnName ?? 'children';
  const isRadio = (): boolean => props.rowSelection?.type === 'radio';
  /** 默认联动；显式 `true` 时关闭。 */
  const checkStrictly = (): boolean => props.rowSelection?.checkStrictly === true;
  const recordKeyOf = (record: T): TableRowKey => getRecordKey(record, 0);

  watch(
    () => props.rowSelection?.selectedRowKeys,
    (value) => {
      if (value != null) {
        selectedRowKeys.value = value.slice();
      }
    }
  );

  const selectedKeySet = computed<Set<string>>(() => {
    const keys = props.rowSelection?.selectedRowKeys ?? selectedRowKeys.value;
    return new Set(keys.map((item) => String(item)));
  });

  /**
   * 构建 key → 父节点映射。
   */
  const parentMap = computed(() => {
    const map = new Map<string, T | null>();
    forEachTreeNode(props.dataSource ?? [], childrenColumnName(), (node, parent) => {
      map.set(String(recordKeyOf(node)), parent);
    });
    return map;
  });

  /**
   * 按 keys 递归收集行。
   */
  const collectRowsByKeys = (keys: TableRowKey[]): T[] => {
    const keySet = new Set(keys.map((item) => String(item)));
    const rows: T[] = [];
    forEachTreeNode(props.dataSource ?? [], childrenColumnName(), (node) => {
      if (keySet.has(String(recordKeyOf(node)))) {
        rows.push(node);
      }
    });
    return rows;
  };

  const selectedRows = computed<T[]>(() =>
    collectRowsByKeys(props.rowSelection?.selectedRowKeys ?? selectedRowKeys.value)
  );

  const isRowChecked = (record: T, _index: number): boolean => {
    return selectedKeySet.value.has(String(recordKeyOf(record)));
  };

  const isRowIndeterminate = (record: T, _index: number): boolean => {
    if (checkStrictly() || isRadio()) {
      return false;
    }
    const descendants = collectDescendantKeys(record, childrenColumnName(), recordKeyOf);
    if (descendants.length === 0) {
      return false;
    }
    const selectedCount = descendants.filter((key) =>
      selectedKeySet.value.has(String(key))
    ).length;
    return selectedCount > 0 && selectedCount < descendants.length;
  };

  const allCurrentPageSelected = computed<boolean>(() => {
    if (!props.rowSelection || currentPageData.value.length === 0) {
      return false;
    }
    return currentPageData.value.every((record, index) =>
      isRowChecked(record, (current.value - 1) * pageSize.value + index)
    );
  });

  const isCurrentPageIndeterminate = computed<boolean>(() => {
    if (!props.rowSelection || currentPageData.value.length === 0) {
      return false;
    }
    const selectedCount = currentPageData.value.reduce((count, record, index) => {
      return count + (isRowChecked(record, (current.value - 1) * pageSize.value + index) ? 1 : 0);
    }, 0);
    return selectedCount > 0 && selectedCount < currentPageData.value.length;
  });

  const buildPayload = (next: TableRowKey[]): TableSelectionPayload<T> => ({
    keys: next,
    rows: collectRowsByKeys(next),
  });

  const setSelectedRowKeys = (keys: TableRowKey[]): TableSelectionPayload<T> => {
    const rowSelection = props.rowSelection;
    const isControlled = rowSelection?.selectedRowKeys != null;
    const next =
      rowSelection?.type === 'radio' && keys.length > 1 ? [keys[keys.length - 1]] : keys.slice();
    if (!isControlled) {
      selectedRowKeys.value = next;
    }
    return buildPayload(next);
  };

  /**
   * 自底向上：全选子节点则选中父；否则移出父 key（半选仅 UI）。
   */
  const reconcileAncestors = (keys: TableRowKey[], start: T): TableRowKey[] => {
    const keyMap = new Map(keys.map((key) => [String(key), key]));
    let parent = parentMap.value.get(String(recordKeyOf(start))) ?? null;
    while (parent) {
      const parentKey = recordKeyOf(parent);
      const parentKeyStr = String(parentKey);
      const children = getChildren(parent, childrenColumnName());
      const allSelected =
        children.length > 0 &&
        children.every((child) => keyMap.has(String(recordKeyOf(child))));
      if (allSelected) {
        keyMap.set(parentKeyStr, parentKey);
      } else {
        keyMap.delete(parentKeyStr);
      }
      parent = parentMap.value.get(parentKeyStr) ?? null;
    }
    return Array.from(keyMap.values());
  };

  const toggleRowSelection = (
    record: T,
    index: number,
    checked: boolean
  ): TableSelectionPayload<T> => {
    const key = getRecordKey(record, index);
    const rowSelection = props.rowSelection;
    const currentKeys = (rowSelection?.selectedRowKeys ?? selectedRowKeys.value).slice();

    if (isRadio()) {
      return setSelectedRowKeys(checked ? [key] : []);
    }

    if (checkStrictly()) {
      const keyStr = String(key);
      const next = currentKeys.filter((item) => String(item) !== keyStr);
      if (checked) {
        next.push(key);
      }
      return setSelectedRowKeys(next);
    }

    const affected = [key, ...collectDescendantKeys(record, childrenColumnName(), recordKeyOf)];
    const affectedSet = new Set(affected.map((item) => String(item)));
    let next = currentKeys.filter((item) => !affectedSet.has(String(item)));
    if (checked) {
      next = [...next, ...affected];
    }
    next = reconcileAncestors(next, record);
    return setSelectedRowKeys(next);
  };

  const toggleAllCurrentPage = (checked: boolean): TableSelectionPayload<T> | undefined => {
    const rowSelection = props.rowSelection;
    if (!rowSelection || rowSelection.type === 'radio') {
      return undefined;
    }

    if (checkStrictly()) {
      const currentKeys = (rowSelection.selectedRowKeys ?? selectedRowKeys.value).slice();
      const pageKeys = currentPageData.value.map((record, index) =>
        getRecordKey(record, (current.value - 1) * pageSize.value + index)
      );
      const pageSet = new Set(pageKeys.map((item) => String(item)));
      const next = checked
        ? Array.from(
            new Map([...currentKeys, ...pageKeys].map((key) => [String(key), key])).values()
          )
        : currentKeys.filter((item) => !pageSet.has(String(item)));
      return setSelectedRowKeys(next);
    }

    let keys = (rowSelection.selectedRowKeys ?? selectedRowKeys.value).slice();
    for (const record of currentPageData.value) {
      const affected = [
        recordKeyOf(record),
        ...collectDescendantKeys(record, childrenColumnName(), recordKeyOf),
      ];
      const affectedSet = new Set(affected.map((item) => String(item)));
      keys = keys.filter((item) => !affectedSet.has(String(item)));
      if (checked) {
        keys = [...keys, ...affected];
      }
      keys = reconcileAncestors(keys, record);
    }
    return setSelectedRowKeys(keys);
  };

  return {
    selectedRows,
    allCurrentPageSelected,
    isCurrentPageIndeterminate,
    isRowChecked,
    isRowIndeterminate,
    setSelectedRowKeys,
    toggleRowSelection,
    toggleAllCurrentPage,
  };
}
