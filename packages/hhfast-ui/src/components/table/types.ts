import type { CSSProperties, VNodeChild } from 'vue';

/** 表格行主键类型。 */
export type TableRowKey = string | number;

/** 单元格对齐方式。 */
export type TableAlign = 'left' | 'center' | 'right';

/** 排序方向。 */
export type TableSortOrder = 'ascend' | 'descend' | null;

/** 列值的默认展示类型。 */
export type TableValueType = 'text' | 'date' | 'datetime' | 'array' | 'tag';

/** 列过滤项。 */
export interface TableFilterItem {
  /** 展示文案。 */
  text: string;
  /** 过滤值。 */
  value: TableRowKey;
}

/** 列 dataIndex 支持 key、点路径、数组路径。 */
export type TableDataIndex<T extends Record<string, unknown>> =
  | keyof T
  | string
  | Array<string | number>;

/** 列配置（参考 Ant Design Table 设计）。 */
export interface TableColumn<T extends Record<string, unknown>> {
  /** 列唯一标识。 */
  key: string;
  /** 表头文案。 */
  title: string;
  /** 取值路径。 */
  dataIndex?: TableDataIndex<T>;
  /** 列宽。 */
  width?: number | string;
  /**
   * 固定列。
   * `true` / `'left'` / `'start'` 固定左侧；`'right'` / `'end'` 固定右侧。
   */
  fixed?: boolean | 'left' | 'right' | 'start' | 'end';
  /** 对齐方式。 */
  align?: TableAlign;
  /** 列 class。 */
  className?: string;
  /** 列 style。 */
  style?: CSSProperties;
  /** 是否省略展示。 */
  ellipsis?: boolean;
  /** 默认值类型格式化。 */
  valueType?: TableValueType;
  /** tag 色板，按值映射。 */
  tagColorMap?: Record<string, string>;
  /** 自定义值格式化。 */
  valueFormatter?: (value: unknown, record: T, index: number) => unknown;
  /** 自定义渲染，优先级高于默认格式化。 */
  render?: (value: unknown, record: T, index: number) => VNodeChild;
  /** 本地排序。 */
  sorter?: boolean | ((a: T, b: T) => number);
  /** 可切换排序方向，默认升序/降序。 */
  sortDirections?: Exclude<TableSortOrder, null>[];
  /** 过滤菜单项。 */
  filters?: TableFilterItem[];
  /** 自定义过滤函数。 */
  onFilter?: (value: TableRowKey, record: T) => boolean;
  /** 是否多选筛选。 */
  filterMultiple?: boolean;
  /**
   * 筛选菜单是否可搜索。
   * `true` 时按 `text` 包含匹配；也可传自定义匹配函数。
   */
  filterSearch?: boolean | ((input: string, item: TableFilterItem) => boolean);
}

/** 分页配置。 */
export interface TablePaginationConfig {
  /** 当前页（受控）。 */
  current?: number;
  /** 每页条数（受控）。 */
  pageSize?: number;
  /** 默认当前页（非受控）。 */
  defaultCurrent?: number;
  /** 默认每页条数（非受控）。 */
  defaultPageSize?: number;
  /** 是否单页隐藏分页器。 */
  hideOnSinglePage?: boolean;
  /** 是否显示 size 切换。 */
  showSizeChanger?: boolean;
  /** 可选 pageSize。 */
  pageSizeOptions?: number[];
  /**
   * 自定义总量文案。
   *
   * @param total - 总条数
   * @param range - 当前页起止（1-based），`[start, end]`
   */
  showTotal?: (total: number, range: [number, number]) => string;
  /** 是否显示页码快速跳转。 */
  showQuickJumper?: boolean;
}

/** 行选择框属性。 */
export interface TableCheckboxProps {
  /** 是否禁用。 */
  disabled?: boolean;
}

/** 行 DOM 属性（由 `onRow` 返回）。 */
export interface TableRowAttrs {
  class?: string | string[] | Record<string, boolean>;
  style?: CSSProperties | string;
  onClick?: (event: MouseEvent) => void;
  onDblclick?: (event: MouseEvent) => void;
  onContextmenu?: (event: MouseEvent) => void;
  onMouseenter?: (event: MouseEvent) => void;
  onMouseleave?: (event: MouseEvent) => void;
  [key: string]: unknown;
}

/** 滚动配置。 */
export interface TableScrollConfig {
  /**
   * 表体横向最小宽度；与固定列配合使用。
   * 支持数字（px）与任意合法 CSS 宽度值。
   */
  x?: number | string;
  /**
   * 表体可视高度，设置后启用固定表头 + 表体滚动。
   * 支持数字（px）与任意合法 CSS 高度值。
   */
  y?: number | string;
}

/** 行选择配置。 */
export interface TableRowSelection<T extends Record<string, unknown>> {
  /** 选择类型。 */
  type?: 'checkbox' | 'radio';
  /** 受控选中项。 */
  selectedRowKeys?: TableRowKey[];
  /** 非受控默认选中项。 */
  defaultSelectedRowKeys?: TableRowKey[];
  /** 列宽。 */
  columnWidth?: number | string;
  /** 选择列标题。 */
  columnTitle?: string;
  /**
   * 树数据下勾选是否严格独立。
   * `false`（默认）：父子联动 + 半选；`true`：各行独立。
   * 仅 `type !== 'radio'` 时生效。
   */
  checkStrictly?: boolean;
  /**
   * 选择框默认属性（如禁用）。
   *
   * @param record - 行数据
   */
  getCheckboxProps?: (record: T) => TableCheckboxProps;
  /**
   * 选择变化回调。
   *
   * @param selectedRowKeys - 当前选中 key
   * @param selectedRows - 当前选中行
   */
  onChange?: (selectedRowKeys: TableRowKey[], selectedRows: T[]) => void;
}

/** 拍平后的可见行元数据。 */
export interface TableFlatRow<T extends Record<string, unknown>> {
  /** 行数据。 */
  record: T;
  /** 树深度，根为 0。 */
  level: number;
  /** 是否存在子节点。 */
  hasChildren: boolean;
}

/** 可展开详情行配置（与树展开独立）。 */
export interface TableExpandableConfig<T extends Record<string, unknown>> {
  /** 详情内容渲染。 */
  expandedRowRender: (record: T, index: number) => VNodeChild;
  /** 受控详情展开 keys。 */
  expandedRowKeys?: TableRowKey[];
  /** 非受控默认详情展开 keys。 */
  defaultExpandedRowKeys?: TableRowKey[];
  /**
   * 单行详情展开变化。
   *
   * @param expanded - 是否展开
   * @param record - 行数据
   */
  onExpand?: (expanded: boolean, record: T) => void;
  /**
   * 详情展开 keys 变化。
   *
   * @param keys - 当前详情展开 keys
   */
  onExpandedRowsChange?: (keys: TableRowKey[]) => void;
  /** 是否允许该行显示展开按钮并展开详情，默认 true。 */
  rowExpandable?: (record: T) => boolean;
  /**
   * 点击行是否切换详情展开（Ant Design 同名行为）。
   * 默认 `false`；展开列上的 +/− 始终可用。
   */
  expandRowByClick?: boolean;
  /** 展开列宽度，默认 48。 */
  columnWidth?: number | string;
}

/** 排序结果。 */
export interface TableSorterResult<T extends Record<string, unknown>> {
  /** 当前排序列 key。 */
  columnKey?: string;
  /** 当前排序方向。 */
  order: TableSortOrder;
  /** 当前列。 */
  column?: TableColumn<T>;
}

/** 筛选状态。 */
export type TableFilterState = Record<string, TableRowKey[]>;

/** onChange 扩展信息。 */
export interface TableChangeExtra<T extends Record<string, unknown>> {
  /** 触发动作。 */
  action: 'paginate' | 'sort' | 'filter' | 'selection';
  /** 当前可见数据（筛选+排序后，未分页）。 */
  currentDataSource: T[];
}

/** onChange 事件载荷。 */
export interface TableChangeEvent<T extends Record<string, unknown>> {
  pagination: Required<Pick<TablePaginationConfig, 'current' | 'pageSize'>> & {
    total: number;
  };
  filters: TableFilterState;
  sorter: TableSorterResult<T>;
  extra: TableChangeExtra<T>;
}

/** Table 组件对外 props。 */
export interface TableProps<T extends Record<string, unknown>> {
  /** 列定义。 */
  columns: TableColumn<T>[];
  /** 数据源。 */
  dataSource: T[];
  /** 行主键字段或函数。 */
  rowKey?: keyof T | ((record: T) => TableRowKey);
  /** 分页配置，传 `false` 关闭。 */
  pagination?: false | TablePaginationConfig;
  /** 滚动配置，设置 `scroll.y` 后固定表头。 */
  scroll?: TableScrollConfig;
  /** 行选择配置。 */
  rowSelection?: TableRowSelection<T>;
  /** 子节点字段名，默认 `'children'`。 */
  childrenColumnName?: string;
  /** 每级缩进 px，默认 `15`。 */
  indentSize?: number;
  /** 树缩进与展开图标所在列 key；默认第一数据列。 */
  expandColumnKey?: string;
  /** 初始是否展开全部树节点。 */
  defaultExpandAll?: boolean;
  /** 受控树展开 keys。 */
  expandedRowKeys?: TableRowKey[];
  /** 非受控默认树展开 keys。 */
  defaultExpandedRowKeys?: TableRowKey[];
  /**
   * 树展开 keys 变化。
   *
   * @param keys - 当前树展开 keys
   */
  onExpandedRowsChange?: (keys: TableRowKey[]) => void;
  /**
   * 单行树展开变化。
   *
   * @param expanded - 是否展开
   * @param record - 行数据
   */
  onExpand?: (expanded: boolean, record: T) => void;
  /** 可展开详情行配置。 */
  expandable?: TableExpandableConfig<T>;
  /** 加载中遮罩。 */
  loading?: boolean;
  /**
   * 行 class。
   *
   * @param record - 行数据
   * @param index - 绝对行下标
   */
  rowClassName?: string | ((record: T, index: number) => string);
  /**
   * 设置行属性（事件 / class / style 等）。
   *
   * @param record - 行数据
   * @param index - 绝对行下标
   */
  onRow?: (record: T, index: number) => TableRowAttrs;
  /**
   * 总结栏，渲染在表体下方。
   *
   * @param currentData - 当前页数据（扁平行 record）
   */
  summary?: (currentData: T[]) => VNodeChild;
  /** 表格顶部标题。 */
  title?: VNodeChild | (() => VNodeChild);
  /** 表格底部。 */
  footer?: VNodeChild | (() => VNodeChild);
  /** 空状态文案。 */
  emptyText?: string;
  /** 是否边框模式。 */
  bordered?: boolean;
  /** 尺寸。 */
  size?: 'large' | 'middle' | 'small';
  /** 是否让外层容器按父级高度自适应填充。 */
  fillContainer?: boolean;
  /**
   * 表格总状态变化回调（分页、筛选、排序、选择）。
   *
   * @param event - 变化信息
   */
  onChange?: (event: TableChangeEvent<T>) => void;
}

/** 单元格渲染上下文。 */
export interface TableCellRenderContext<T extends Record<string, unknown>> {
  column: TableColumn<T>;
  record: T;
  index: number;
  value: unknown;
}
