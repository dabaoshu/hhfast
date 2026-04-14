import { computed, watch } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import type { TableColumn, TableFilterState, TableProps, TableRowKey, TableSortOrder } from './types';
import { getByDataIndex, toComparableValue } from './tableUtils';
import type { TableSorterState } from './tableUtils';

interface UseTableDataOptions<T extends Record<string, unknown>> {
  props: TableProps<T>;
  filters: TableFilterState;
  sorter: Ref<TableSorterState>;
  current: Ref<number>;
  pageSize: Ref<number>;
}

/** 表格数据分层处理输出。 */
export interface UseTableDataReturn<T extends Record<string, unknown>> {
  paginationEnabled: ComputedRef<boolean>;
  mergedColumns: ComputedRef<TableColumn<T>[]>;
  total: ComputedRef<number>;
  pageCount: ComputedRef<number>;
  currentPageData: ComputedRef<T[]>;
  sortedData: ComputedRef<T[]>;
  getRecordKey: (record: T, index: number) => TableRowKey;
  getColumnValue: (record: T, column: TableColumn<T>) => unknown;
  setPage: (nextPage: number) => void;
  setPageSize: (nextPageSize: number) => void;
  toggleSort: (column: TableColumn<T>) => void;
  setColumnFilters: (columnKey: string, values: TableRowKey[]) => void;
}

/**
 * 数据流水线：筛选 -> 排序 -> 分页。
 */
export function useTableData<T extends Record<string, unknown>>(
  options: UseTableDataOptions<T>
): UseTableDataReturn<T> {
  const { props, filters, sorter, current, pageSize } = options;

  const paginationEnabled = computed(() => props.pagination !== false);
  const mergedColumns = computed(() => props.columns ?? []);

  const getRecordKey = (record: T, index: number): TableRowKey => {
    const rowKey = props.rowKey;
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
  };

  const getColumnValue = (record: T, column: TableColumn<T>): unknown => {
    if (column.dataIndex == null) {
      return undefined;
    }
    return getByDataIndex(record, column.dataIndex as string | number | Array<string | number>);
  };

  const filteredData = computed<T[]>(() => {
    const source = props.dataSource ?? [];
    if (Object.keys(filters).length === 0) {
      return source.slice();
    }
    return source.filter((record) => {
      return mergedColumns.value.every((column) => {
        const activeValues = filters[column.key] ?? [];
        if (activeValues.length === 0) {
          return true;
        }
        if (column.onFilter) {
          return activeValues.some((v) => column.onFilter?.(v, record));
        }
        const value = getColumnValue(record, column);
        return activeValues.some((v) => String(v) === String(value));
      });
    });
  });

  const sortedData = computed<T[]>(() => {
    const order = sorter.value.order;
    const columnKey = sorter.value.columnKey;
    if (order == null || !columnKey) {
      return filteredData.value.slice();
    }
    const column = mergedColumns.value.find((item) => item.key === columnKey);
    if (!column || !column.sorter) {
      return filteredData.value.slice();
    }
    const compareFn =
      typeof column.sorter === 'function'
        ? column.sorter
        : (a: T, b: T): number => {
            const av = toComparableValue(getColumnValue(a, column));
            const bv = toComparableValue(getColumnValue(b, column));
            if (av === bv) {
              return 0;
            }
            return av > bv ? 1 : -1;
          };
    const result = filteredData.value.slice().sort(compareFn);
    return order === 'descend' ? result.reverse() : result;
  });

  const total = computed(() => sortedData.value.length);
  const pageCount = computed(() => {
    if (!paginationEnabled.value) {
      return 1;
    }
    return Math.max(1, Math.ceil(total.value / pageSize.value));
  });

  watch(
    [total, pageSize],
    () => {
      if (!paginationEnabled.value) {
        current.value = 1;
        return;
      }
      if (current.value > pageCount.value) {
        current.value = pageCount.value;
      }
      if (current.value < 1) {
        current.value = 1;
      }
    },
    { immediate: true }
  );

  const currentPageData = computed<T[]>(() => {
    if (!paginationEnabled.value) {
      return sortedData.value;
    }
    const start = (current.value - 1) * pageSize.value;
    return sortedData.value.slice(start, start + pageSize.value);
  });

  const setPage = (nextPage: number): void => {
    if (!paginationEnabled.value) {
      return;
    }
    current.value = Math.max(1, Math.min(pageCount.value, nextPage));
  };

  const setPageSize = (nextPageSize: number): void => {
    if (!paginationEnabled.value || nextPageSize <= 0) {
      return;
    }
    pageSize.value = nextPageSize;
    current.value = 1;
  };

  const toggleSort = (column: TableColumn<T>): void => {
    if (!column.sorter) {
      return;
    }
    const directions = column.sortDirections ?? ['ascend', 'descend'];
    const currentOrder = sorter.value.columnKey === column.key ? sorter.value.order : null;
    const currentIndex = currentOrder == null ? -1 : directions.indexOf(currentOrder);
    const nextOrder: TableSortOrder =
      currentIndex === -1 || currentIndex === directions.length - 1
        ? directions[0] ?? null
        : directions[currentIndex + 1] ?? null;
    sorter.value = {
      columnKey: column.key,
      order: nextOrder,
    };
  };

  const setColumnFilters = (columnKey: string, values: TableRowKey[]): void => {
    if (values.length === 0) {
      delete filters[columnKey];
    } else {
      filters[columnKey] = values;
    }
    current.value = 1;
  };

  return {
    paginationEnabled,
    mergedColumns,
    total,
    pageCount,
    currentPageData,
    sortedData,
    getRecordKey,
    getColumnValue,
    setPage,
    setPageSize,
    toggleSort,
    setColumnFilters,
  };
}
