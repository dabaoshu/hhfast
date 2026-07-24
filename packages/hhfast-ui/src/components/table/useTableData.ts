import { computed, watch } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import type {
  TableColumn,
  TableFilterState,
  TableFlatRow,
  TableProps,
  TableRowKey,
  TableSortOrder,
} from './types';
import { getByDataIndex, getChildren, toComparableValue } from './tableUtils';
import type { TableSorterState } from './tableUtils';

interface UseTableDataOptions<T extends Record<string, unknown>> {
  props: TableProps<T>;
  filters: TableFilterState;
  sorter: Ref<TableSorterState>;
  current: Ref<number>;
  pageSize: Ref<number>;
  /** 树展开 keys；未传时按空集合拍平（仅根层）。 */
  treeExpandedKeys?: Ref<TableRowKey[]>;
}

/** 表格数据分层处理输出。 */
export interface UseTableDataReturn<T extends Record<string, unknown>> {
  paginationEnabled: ComputedRef<boolean>;
  mergedColumns: ComputedRef<TableColumn<T>[]>;
  childrenColumnName: ComputedRef<string>;
  total: ComputedRef<number>;
  pageCount: ComputedRef<number>;
  /** 拍平后的全部可见行（筛选+排序+树展开，未分页）。 */
  visibleRows: ComputedRef<TableFlatRow<T>[]>;
  /** 当前页拍平行。 */
  currentPageFlatRows: ComputedRef<TableFlatRow<T>[]>;
  currentPageData: ComputedRef<T[]>;
  /** 可见扁平行的 record 列表（未分页）。 */
  sortedData: ComputedRef<T[]>;
  getRecordKey: (record: T, index: number) => TableRowKey;
  getColumnValue: (record: T, column: TableColumn<T>) => unknown;
  setPage: (nextPage: number) => void;
  setPageSize: (nextPageSize: number) => void;
  toggleSort: (column: TableColumn<T>) => void;
  setColumnFilters: (columnKey: string, values: TableRowKey[]) => void;
}

/**
 * 数据流水线：筛选 -> 排序 -> 树拍平 -> 分页。
 */
export function useTableData<T extends Record<string, unknown>>(
  options: UseTableDataOptions<T>
): UseTableDataReturn<T> {
  const { props, filters, sorter, current, pageSize, treeExpandedKeys } = options;

  const paginationEnabled = computed(() => props.pagination !== false);
  const mergedColumns = computed(() => props.columns ?? []);
  const childrenColumnName = computed(() => props.childrenColumnName ?? 'children');

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

  const matchFilters = (record: T): boolean => {
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
  };

  /**
   * 递归筛选：节点自身不匹配则丢弃整枝（不抬升子孙）。
   */
  const filterTree = (nodes: T[]): T[] => {
    const result: T[] = [];
    for (const node of nodes) {
      if (!matchFilters(node)) {
        continue;
      }
      const kids = getChildren(node, childrenColumnName.value);
      result.push({
        ...node,
        [childrenColumnName.value]: filterTree(kids),
      });
    }
    return result;
  };

  const filteredData = computed<T[]>(() => {
    const source = props.dataSource ?? [];
    if (Object.keys(filters).length === 0) {
      return source.slice();
    }
    return filterTree(source);
  });

  const buildCompareFn = (): ((a: T, b: T) => number) | null => {
    const order = sorter.value.order;
    const columnKey = sorter.value.columnKey;
    if (order == null || !columnKey) {
      return null;
    }
    const column = mergedColumns.value.find((item) => item.key === columnKey);
    if (!column || !column.sorter) {
      return null;
    }
    const baseCompare =
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
    return order === 'descend' ? (a, b) => -baseCompare(a, b) : baseCompare;
  };

  /**
   * 仅对同级 siblings 排序，再递归子列表。
   */
  const sortTree = (nodes: T[], compareFn: ((a: T, b: T) => number) | null): T[] => {
    const sorted = compareFn ? nodes.slice().sort(compareFn) : nodes.slice();
    return sorted.map((node) => ({
      ...node,
      [childrenColumnName.value]: sortTree(getChildren(node, childrenColumnName.value), compareFn),
    }));
  };

  const processedTree = computed<T[]>(() => {
    return sortTree(filteredData.value, buildCompareFn());
  });

  /**
   * 按树展开 keys 拍平可见行。
   */
  const flattenVisible = (nodes: T[], level: number, expanded: Set<string>): TableFlatRow<T>[] => {
    const rows: TableFlatRow<T>[] = [];
    for (const record of nodes) {
      const kids = getChildren(record, childrenColumnName.value);
      const hasChildren = kids.length > 0;
      rows.push({ record, level, hasChildren });
      if (hasChildren && expanded.has(String(getRecordKey(record, 0)))) {
        rows.push(...flattenVisible(kids, level + 1, expanded));
      }
    }
    return rows;
  };

  const visibleRows = computed<TableFlatRow<T>[]>(() => {
    const expanded = new Set((treeExpandedKeys?.value ?? []).map((key) => String(key)));
    return flattenVisible(processedTree.value, 0, expanded);
  });

  const sortedData = computed<T[]>(() => visibleRows.value.map((row) => row.record));

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

  const currentPageFlatRows = computed<TableFlatRow<T>[]>(() => {
    if (!paginationEnabled.value) {
      return visibleRows.value;
    }
    const start = (current.value - 1) * pageSize.value;
    return visibleRows.value.slice(start, start + pageSize.value);
  });

  const currentPageData = computed<T[]>(() => currentPageFlatRows.value.map((row) => row.record));

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
    childrenColumnName,
    total,
    pageCount,
    visibleRows,
    currentPageFlatRows,
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
