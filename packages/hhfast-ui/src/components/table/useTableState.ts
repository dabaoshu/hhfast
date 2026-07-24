import { computed, reactive, ref, watch } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import type {
  TableCellRenderContext,
  TableChangeEvent,
  TableColumn,
  TableFilterState,
  TableFlatRow,
  TableProps,
  TableRowKey,
} from './types';
import { formatByValueType, normalizeTagList } from './tableUtils';
import type { TableSorterState } from './tableUtils';
import { useTableData } from './useTableData';
import { useTableExpand } from './useTableExpand';
import { useTableSelection } from './useTableSelection';

interface UseTableStateOptions<T extends Record<string, unknown>> {
  /** Table 入参。 */
  props: TableProps<T>;
  /** 透出 `change` 事件给组件层。 */
  emitChange?: (event: TableChangeEvent<T>) => void;
  /** 同步 `selectedRowKeys` 到组件事件。 */
  emitSelectedRowKeys?: (keys: TableRowKey[]) => void;
}

/** `useTableState` 返回值。 */
export interface UseTableStateReturn<T extends Record<string, unknown>> {
  filters: ComputedRef<TableFilterState>;
  sorter: Ref<TableSorterState>;
  current: Ref<number>;
  pageSize: Ref<number>;
  total: ComputedRef<number>;
  pageCount: ComputedRef<number>;
  currentPageData: ComputedRef<T[]>;
  currentPageFlatRows: ComputedRef<TableFlatRow<T>[]>;
  sortedData: ComputedRef<T[]>;
  mergedColumns: ComputedRef<TableColumn<T>[]>;
  paginationEnabled: ComputedRef<boolean>;
  selectedRowKeys: Ref<TableRowKey[]>;
  selectedRows: ComputedRef<T[]>;
  allCurrentPageSelected: ComputedRef<boolean>;
  isCurrentPageIndeterminate: ComputedRef<boolean>;
  treeExpandedKeys: Ref<TableRowKey[]>;
  detailExpandedKeys: Ref<TableRowKey[]>;
  getRecordKey: (record: T, index: number) => TableRowKey;
  getColumnValue: (record: T, column: TableColumn<T>) => unknown;
  getDisplayValue: (ctx: TableCellRenderContext<T>) => unknown;
  getRenderedCell: (ctx: TableCellRenderContext<T>) => unknown;
  setPage: (nextPage: number) => void;
  setPageSize: (nextPageSize: number) => void;
  toggleSort: (column: TableColumn<T>) => void;
  setColumnFilters: (columnKey: string, values: TableRowKey[]) => void;
  isRowChecked: (record: T, index: number) => boolean;
  isRowIndeterminate: (record: T, index: number) => boolean;
  isRowSelectionDisabled: (record: T) => boolean;
  isTreeExpanded: (key: TableRowKey) => boolean;
  isDetailExpanded: (key: TableRowKey) => boolean;
  isRowDetailExpandable: (record: T) => boolean;
  toggleTreeExpand: (record: T, index: number) => void;
  toggleDetailExpand: (record: T, index: number) => void;
  toggleRowSelection: (record: T, index: number, checked: boolean) => void;
  toggleAllCurrentPage: (checked: boolean) => void;
  setSelectedRowKeys: (
    keys: TableRowKey[],
    action?: 'selection' | 'paginate' | 'sort' | 'filter'
  ) => void;
  buildChangeEvent: (action: 'paginate' | 'sort' | 'filter' | 'selection') => TableChangeEvent<T>;
}

const EMPTY_FILTERS: TableFilterState = {};

/**
 * 解析行主键。
 */
function resolveRecordKey<T extends Record<string, unknown>>(
  record: T,
  index: number,
  rowKey: TableProps<T>['rowKey']
): TableRowKey {
  if (typeof rowKey === 'function') {
    return rowKey(record);
  }
  if (typeof rowKey === 'string' && rowKey in record) {
    return record[rowKey] as TableRowKey;
  }
  if ('key' in record) {
    return (record.key as TableRowKey) ?? index;
  }
  return index;
}

/**
 * Table 编排层：负责事件拼装与子状态联动。
 */
export function useTableState<T extends Record<string, unknown>>(
  options: UseTableStateOptions<T>
): UseTableStateReturn<T> {
  const { props, emitChange, emitSelectedRowKeys } = options;
  const paginationConfig = computed(() =>
    props.pagination === false ? undefined : props.pagination
  );

  const filters = reactive<TableFilterState>({});
  const sorter = ref<TableSorterState>({ order: null });
  const current = ref(
    paginationConfig.value?.current ?? paginationConfig.value?.defaultCurrent ?? 1
  );
  const pageSize = ref(
    paginationConfig.value?.pageSize ?? paginationConfig.value?.defaultPageSize ?? 10
  );
  const selectedRowKeys = ref<TableRowKey[]>(
    props.rowSelection?.selectedRowKeys?.slice() ??
      props.rowSelection?.defaultSelectedRowKeys?.slice() ??
      []
  );

  watch(
    () => paginationConfig.value?.current,
    (value) => {
      if (value != null) {
        current.value = value;
      }
    }
  );

  watch(
    () => paginationConfig.value?.pageSize,
    (value) => {
      if (value != null && value > 0) {
        pageSize.value = value;
      }
    }
  );

  const getRecordKey = (record: T, index: number): TableRowKey =>
    resolveRecordKey(record, index, props.rowKey);

  const expandState = useTableExpand<T>({
    props,
    getRecordKey,
  });

  const dataState = useTableData<T>({
    props,
    filters,
    sorter,
    current,
    pageSize,
    treeExpandedKeys: expandState.treeExpandedKeys,
  });

  const selectionState = useTableSelection<T>({
    props,
    selectedRowKeys,
    current,
    pageSize,
    currentPageData: dataState.currentPageData,
    getRecordKey,
  });

  const buildChangeEvent = (
    action: 'paginate' | 'sort' | 'filter' | 'selection'
  ): TableChangeEvent<T> => ({
    pagination: {
      current: current.value,
      pageSize: pageSize.value,
      total: dataState.total.value,
    },
    filters: { ...filters },
    sorter: {
      columnKey: sorter.value.columnKey,
      order: sorter.value.order,
      column: undefined,
    },
    extra: {
      action,
      currentDataSource: dataState.sortedData.value,
    },
  });

  const triggerChange = (action: 'paginate' | 'sort' | 'filter' | 'selection'): void => {
    const event = buildChangeEvent(action);
    props.onChange?.(event);
    emitChange?.(event);
  };

  const applySelectionPayload = (
    payload: { keys: TableRowKey[]; rows: T[] } | undefined,
    action: 'selection' | 'paginate' | 'sort' | 'filter'
  ): void => {
    if (!payload) {
      return;
    }
    props.rowSelection?.onChange?.(payload.keys, payload.rows);
    emitSelectedRowKeys?.(payload.keys);
    triggerChange(action);
  };

  const setPage = (nextPage: number): void => {
    dataState.setPage(nextPage);
    triggerChange('paginate');
  };

  const setPageSize = (nextPageSize: number): void => {
    dataState.setPageSize(nextPageSize);
    triggerChange('paginate');
  };

  const toggleSort = (column: TableColumn<T>): void => {
    dataState.toggleSort(column);
    triggerChange('sort');
  };

  const setColumnFilters = (columnKey: string, values: TableRowKey[]): void => {
    dataState.setColumnFilters(columnKey, values);
    triggerChange('filter');
  };

  const setSelectedRowKeysWithAction = (
    keys: TableRowKey[],
    action: 'selection' | 'paginate' | 'sort' | 'filter' = 'selection'
  ): void => {
    applySelectionPayload(selectionState.setSelectedRowKeys(keys), action);
  };

  const toggleRowSelection = (record: T, index: number, checked: boolean): void => {
    applySelectionPayload(selectionState.toggleRowSelection(record, index, checked), 'selection');
  };

  const toggleAllCurrentPage = (checked: boolean): void => {
    applySelectionPayload(selectionState.toggleAllCurrentPage(checked), 'selection');
  };

  const getDisplayValue = (ctx: TableCellRenderContext<T>): unknown => {
    const { column, record, index } = ctx;
    return column.valueFormatter
      ? column.valueFormatter(ctx.value, record, index)
      : formatByValueType(ctx.value, column.valueType);
  };

  const getRenderedCell = (ctx: TableCellRenderContext<T>): unknown =>
    ctx.column.render
      ? ctx.column.render(ctx.value, ctx.record, ctx.index)
      : getDisplayValue(ctx);

  return {
    filters: computed(() => (Object.keys(filters).length ? filters : EMPTY_FILTERS)),
    sorter,
    current,
    pageSize,
    total: dataState.total,
    pageCount: dataState.pageCount,
    currentPageData: dataState.currentPageData,
    currentPageFlatRows: dataState.currentPageFlatRows,
    sortedData: dataState.sortedData,
    mergedColumns: dataState.mergedColumns,
    paginationEnabled: dataState.paginationEnabled,
    selectedRowKeys,
    selectedRows: selectionState.selectedRows,
    allCurrentPageSelected: selectionState.allCurrentPageSelected,
    isCurrentPageIndeterminate: selectionState.isCurrentPageIndeterminate,
    treeExpandedKeys: expandState.treeExpandedKeys,
    detailExpandedKeys: expandState.detailExpandedKeys,
    getRecordKey,
    getColumnValue: dataState.getColumnValue,
    getDisplayValue,
    getRenderedCell,
    setPage,
    setPageSize,
    toggleSort,
    setColumnFilters,
    isRowChecked: selectionState.isRowChecked,
    isRowIndeterminate: selectionState.isRowIndeterminate,
    isRowSelectionDisabled: selectionState.isRowSelectionDisabled,
    isTreeExpanded: expandState.isTreeExpanded,
    isDetailExpanded: expandState.isDetailExpanded,
    isRowDetailExpandable: expandState.isRowDetailExpandable,
    toggleTreeExpand: expandState.toggleTreeExpand,
    toggleDetailExpand: expandState.toggleDetailExpand,
    toggleRowSelection,
    toggleAllCurrentPage,
    setSelectedRowKeys: setSelectedRowKeysWithAction,
    buildChangeEvent,
  };
}

export { normalizeTagList };
