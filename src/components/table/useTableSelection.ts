import { computed, watch } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import type { TableProps, TableRowKey } from './types';

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
  setSelectedRowKeys: (keys: TableRowKey[]) => TableSelectionPayload<T>;
  toggleRowSelection: (record: T, index: number, checked: boolean) => TableSelectionPayload<T>;
  toggleAllCurrentPage: (checked: boolean) => TableSelectionPayload<T> | undefined;
}

/**
 * 行选择状态管理：受控/非受控、全选、中间态计算。
 */
export function useTableSelection<T extends Record<string, unknown>>(
  options: UseTableSelectionOptions<T>
): UseTableSelectionReturn<T> {
  const { props, selectedRowKeys, current, pageSize, currentPageData, getRecordKey } = options;

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

  const selectedRows = computed<T[]>(() => {
    return (props.dataSource ?? []).filter((record, index) =>
      selectedKeySet.value.has(String(getRecordKey(record, index)))
    );
  });

  const isRowChecked = (record: T, index: number): boolean => {
    const key = getRecordKey(record, index);
    return selectedKeySet.value.has(String(key));
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

  const buildPayload = (next: TableRowKey[]): TableSelectionPayload<T> => {
    const keySet = new Set(next.map((item) => String(item)));
    const rows = (props.dataSource ?? []).filter((record, index) =>
      keySet.has(String(getRecordKey(record, index)))
    );
    return { keys: next, rows };
  };

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

  const toggleRowSelection = (record: T, index: number, checked: boolean): TableSelectionPayload<T> => {
    const key = getRecordKey(record, index);
    const rowSelection = props.rowSelection;
    const currentKeys = (rowSelection?.selectedRowKeys ?? selectedRowKeys.value).slice();
    if (rowSelection?.type === 'radio') {
      return setSelectedRowKeys(checked ? [key] : []);
    }
    const keyStr = String(key);
    const next = currentKeys.filter((item) => String(item) !== keyStr);
    if (checked) {
      next.push(key);
    }
    return setSelectedRowKeys(next);
  };

  const toggleAllCurrentPage = (checked: boolean): TableSelectionPayload<T> | undefined => {
    const rowSelection = props.rowSelection;
    if (!rowSelection || rowSelection.type === 'radio') {
      return undefined;
    }
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
  };

  return {
    selectedRows,
    allCurrentPageSelected,
    isCurrentPageIndeterminate,
    isRowChecked,
    setSelectedRowKeys,
    toggleRowSelection,
    toggleAllCurrentPage,
  };
}
