/** Table 组件与类型导出。 */
export { HTable, tableProps } from './TableView';

/** 核心状态管理 hook。 */
export { normalizeTagList, useTableState } from './useTableState';

/** Table 类型定义。 */
export type {
  TableAlign,
  TableCellRenderContext,
  TableChangeEvent,
  TableChangeExtra,
  TableColumn,
  TableDataIndex,
  TableFilterItem,
  TableFilterState,
  TablePaginationConfig,
  TableProps,
  TableRowKey,
  TableRowSelection,
  TableScrollConfig,
  TableSortOrder,
  TableSorterResult,
  TableValueType,
} from './types';
