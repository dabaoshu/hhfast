/// <reference types="vue/jsx" />
import {
  defineComponent,
  ref,
  reactive,
  computed,
  watchEffect,
  isVNode,
  type PropType,
} from 'vue'
import type { CSSProperties } from 'vue'
import { HPopover } from '../popover'
import { useTableState, normalizeTagList } from './useTableState'
import {
  buildFixedColumnOffsets,
  normalizeColumnFixed,
  resolveColumnWidthPx,
} from './tableUtils'
import type {
  TableChangeEvent,
  TableColumn,
  TableExpandableConfig,
  TableFilterItem,
  TablePaginationConfig,
  TableRowAttrs,
  TableRowKey,
  TableRowSelection,
  TableScrollConfig,
} from './types'
import './table.scss'

type RowRecord = Record<string, unknown>

// ==================== Props ====================

const tableProps = {
  columns: {
    type: Array as PropType<TableColumn<RowRecord>[]>,
    required: true,
    default: () => [],
  },
  dataSource: {
    type: Array as PropType<RowRecord[]>,
    default: () => [],
  },
  rowKey: {
    type: [String, Function] as PropType<keyof RowRecord | ((record: RowRecord) => TableRowKey)>,
    default: undefined,
  },
  pagination: {
    type: [Boolean, Object] as PropType<false | TablePaginationConfig>,
    default: () => ({
      defaultCurrent: 1,
      defaultPageSize: 10,
    }),
  },
  rowSelection: {
    type: Object as PropType<TableRowSelection<RowRecord>>,
    default: undefined,
  },
  scroll: {
    type: Object as PropType<TableScrollConfig>,
    default: undefined,
  },
  childrenColumnName: {
    type: String as PropType<string>,
    default: 'children',
  },
  indentSize: {
    type: Number as PropType<number>,
    default: 15,
  },
  expandColumnKey: {
    type: String as PropType<string>,
    default: undefined,
  },
  defaultExpandAll: Boolean,
  expandedRowKeys: {
    type: Array as PropType<TableRowKey[]>,
    default: undefined,
  },
  defaultExpandedRowKeys: {
    type: Array as PropType<TableRowKey[]>,
    default: undefined,
  },
  onExpandedRowsChange: {
    type: Function as PropType<(keys: TableRowKey[]) => void>,
    default: undefined,
  },
  onExpand: {
    type: Function as PropType<(expanded: boolean, record: RowRecord) => void>,
    default: undefined,
  },
  expandable: {
    type: Object as PropType<TableExpandableConfig<RowRecord>>,
    default: undefined,
  },
  loading: Boolean,
  rowClassName: {
    type: [String, Function] as PropType<
      string | ((record: RowRecord, index: number) => string)
    >,
    default: undefined,
  },
  onRow: {
    type: Function as PropType<(record: RowRecord, index: number) => TableRowAttrs>,
    default: undefined,
  },
  emptyText: {
    type: String as PropType<string>,
    default: '暂无数据',
  },
  bordered: Boolean,
  size: {
    type: String as PropType<'large' | 'middle' | 'small'>,
    default: 'middle',
  },
  fillContainer: Boolean,
  onChange: {
    type: Function as PropType<(event: TableChangeEvent<RowRecord>) => void>,
    default: undefined,
  },
}

// ==================== CellContent ====================

const CellContent = defineComponent({
  name: 'HTableCellContent',
  props: {
    content: {
      type: [String, Number, Boolean, Object, Array] as PropType<unknown>,
      default: null,
    },
  },
  setup(innerProps) {
    return () => {
      if (innerProps.content == null || innerProps.content === '') {
        return <span>-</span>
      }
      if (isVNode(innerProps.content)) {
        return innerProps.content
      }
      if (Array.isArray(innerProps.content)) {
        return innerProps.content as unknown as JSX.Element
      }
      return <span>{String(innerProps.content)}</span>
    }
  },
})

// ==================== HTable ====================

const HTable = defineComponent({
  name: 'HTable',
  props: tableProps,
  emits: ['change', 'update:selectedRowKeys'],
  setup(props, { emit, slots }) {
    const state = useTableState<RowRecord>({
      props: props as any,
      emitChange: (event: TableChangeEvent<RowRecord>) => emit('change', event),
      emitSelectedRowKeys: (keys: TableRowKey[]) => emit('update:selectedRowKeys', keys),
    })

    const headerCheckboxRef = ref<HTMLInputElement | null>(null)
    const activeFilterColumnKey = ref<string | null>(null)
    const filterSearchText = reactive<Record<string, string>>({})
    const quickJumpPage = ref('')

    // ---- 计算属性 ----

    const paginationConfig = computed<TablePaginationConfig>(() => {
      if (props.pagination === false) {
        return {}
      }
      return props.pagination ?? {}
    })

    const shouldShowPagination = computed(() => {
      if (!state.paginationEnabled.value) {
        return false
      }
      if (paginationConfig.value.hideOnSinglePage && state.pageCount.value <= 1) {
        return false
      }
      return true
    })

    const stickyHeaderEnabled = computed(() => props.scroll?.y != null)

    const tableClass = computed(() =>
      [
        'hh-table',
        `hh-table--${props.size}`,
        props.bordered && 'hh-table--bordered',
        props.fillContainer && 'hh-table--fill',
        stickyHeaderEnabled.value && 'hh-table--sticky-header',
        props.loading && 'hh-table--loading',
      ].filter(Boolean)
    )

    const contentStyle = computed(() => {
      const style: CSSProperties = {}
      if (stickyHeaderEnabled.value) {
        const yValue = props.scroll?.y
        style.maxHeight = typeof yValue === 'number' ? `${yValue}px` : yValue
      }
      return Object.keys(style).length ? style : undefined
    })

    const tableMinWidth = computed(() => {
      const x = props.scroll?.x
      if (x == null) {
        return undefined
      }
      return typeof x === 'number' ? `${x}px` : x
    })

    const selectionColumnWidthPx = computed(() => {
      if (!props.rowSelection) {
        return 0
      }
      return resolveColumnWidthPx(props.rowSelection.columnWidth, 56)
    })

    const expandColumnWidthPx = computed(() => {
      if (!props.expandable) {
        return 0
      }
      return resolveColumnWidthPx(props.expandable.columnWidth, 48)
    })

    const fixedOffsets = computed(() =>
      buildFixedColumnOffsets(
        state.mergedColumns.value,
        selectionColumnWidthPx.value + expandColumnWidthPx.value,
      )
    )

    const hasLeftFixedColumns = computed(
      () => Object.keys(fixedOffsets.value.leftOffsets).length > 0
    )

    const isCheckboxSelection = computed(() => props.rowSelection?.type !== 'radio')
    const pageSizeOptions = computed(() => paginationConfig.value.pageSizeOptions ?? [10, 20, 50, 100])

    const pageBaseIndex = computed(() => {
      if (!state.paginationEnabled.value || state.current.value <= 0) {
        return 0
      }
      return (state.current.value - 1) * state.pageSize.value
    })

    const paginationRange = computed<[number, number]>(() => {
      const total = state.total.value
      if (total === 0) {
        return [0, 0]
      }
      const start = pageBaseIndex.value + 1
      const end = Math.min(pageBaseIndex.value + state.pageSize.value, total)
      return [start, end]
    })

    const paginationTotalText = computed(() => {
      const showTotal = paginationConfig.value.showTotal
      if (showTotal) {
        return showTotal(state.total.value, paginationRange.value)
      }
      return `共 ${state.total.value} 条`
    })

    // ---- 分页页码构建 ----

    function buildPageNumbers(current: number, pageCount: number): number[] {
      if (pageCount <= 7) {
        return Array.from({ length: pageCount }, (_, i) => i + 1)
      }
      const pageSet = new Set<number>([1, pageCount, current, current - 1, current + 1])
      return Array.from(pageSet)
        .filter((p) => p >= 1 && p <= pageCount)
        .sort((a, b) => a - b)
    }

    const pageNumbers = computed(() => buildPageNumbers(state.current.value, state.pageCount.value))

    // ---- 辅助函数 ----

    function toStyleWidth(width?: string | number): string | number | undefined {
      if (width == null) {
        return undefined
      }
      return typeof width === 'number' ? `${width}px` : width
    }

    function getSorterMark(column: TableColumn<RowRecord>): string {
      if (state.sorter.value.columnKey !== column.key || state.sorter.value.order == null) {
        return '↕'
      }
      return state.sorter.value.order === 'ascend' ? '↑' : '↓'
    }

    function getAbsoluteIndex(index: number): number {
      return pageBaseIndex.value + index
    }

    function getCellContent(column: TableColumn<RowRecord>, record: RowRecord, absoluteIndex: number): unknown {
      return state.getRenderedCell({
        column,
        record,
        index: absoluteIndex,
        value: state.getColumnValue(record, column),
      })
    }

    function getTagList(column: TableColumn<RowRecord>, record: RowRecord, absoluteIndex: number): string[] {
      const value = getCellContent(column, record, absoluteIndex)
      return normalizeTagList(value)
    }

    // ---- 筛选 ----

    /**
     * 判断筛值是否已选中。
     */
    function isFilterValueSelected(columnKey: string, value: TableRowKey): boolean {
      return (state.filters.value[columnKey] ?? []).some((item) => String(item) === String(value))
    }

    /**
     * 切换筛选项（复选 / 单选）。
     */
    function onFilterItemToggle(
      column: TableColumn<RowRecord>,
      value: TableRowKey,
      checked: boolean,
    ): void {
      if (!column.key) {
        return
      }
      if (column.filterMultiple === false) {
        state.setColumnFilters(column.key, checked ? [value] : [])
        return
      }
      const current = [...(state.filters.value[column.key] ?? [])]
      if (checked) {
        if (!current.some((item) => String(item) === String(value))) {
          current.push(value)
        }
        state.setColumnFilters(column.key, current)
        return
      }
      state.setColumnFilters(
        column.key,
        current.filter((item) => String(item) !== String(value)),
      )
    }

    function toggleFilterPanel(columnKey: string): void {
      activeFilterColumnKey.value = activeFilterColumnKey.value === columnKey ? null : columnKey
    }

    function closeFilterPanel(): void {
      if (activeFilterColumnKey.value) {
        filterSearchText[activeFilterColumnKey.value] = ''
      }
      activeFilterColumnKey.value = null
    }

    function isFilterPanelOpen(columnKey: string): boolean {
      return activeFilterColumnKey.value === columnKey
    }

    /**
     * 按 filterSearch 过滤筛选项。
     */
    function getVisibleFilterItems(column: TableColumn<RowRecord>): TableFilterItem[] {
      const items = column.filters ?? []
      const search = (filterSearchText[column.key] ?? '').trim()
      if (!search || !column.filterSearch) {
        return items
      }
      if (typeof column.filterSearch === 'function') {
        return items.filter((item) => column.filterSearch!(search, item) as boolean)
      }
      const lower = search.toLowerCase()
      return items.filter((item) => item.text.toLowerCase().includes(lower))
    }

    /**
     * 解析行 class。
     */
    function resolveRowClassName(record: RowRecord, absoluteIndex: number): string {
      if (typeof props.rowClassName === 'function') {
        return props.rowClassName(record, absoluteIndex) || ''
      }
      return props.rowClassName ?? ''
    }

    /**
     * 快速跳页。
     */
    function commitQuickJump(): void {
      const raw = Number(quickJumpPage.value)
      if (!Number.isFinite(raw)) {
        quickJumpPage.value = ''
        return
      }
      state.setPage(Math.trunc(raw))
      quickJumpPage.value = ''
    }

    /**
     * 固定列单元格 class / style。
     */
    function getFixedCellProps(column: TableColumn<RowRecord>): {
      className: string
      style: CSSProperties
    } {
      const side = normalizeColumnFixed(column.fixed)
      const style: CSSProperties = {}
      const classNames: string[] = []
      if (side === 'left') {
        classNames.push('hh-table__cell--fixed-left')
        style.left = `${fixedOffsets.value.leftOffsets[column.key] ?? 0}px`
        if (fixedOffsets.value.leftEdgeKey === column.key) {
          classNames.push('hh-table__cell--fixed-left-last')
        }
      } else if (side === 'right') {
        classNames.push('hh-table__cell--fixed-right')
        style.right = `${fixedOffsets.value.rightOffsets[column.key] ?? 0}px`
        if (fixedOffsets.value.rightEdgeKey === column.key) {
          classNames.push('hh-table__cell--fixed-right-first')
        }
      }
      return { className: classNames.join(' '), style }
    }

    watchEffect(() => {
      if (headerCheckboxRef.value) {
        headerCheckboxRef.value.indeterminate = state.isCurrentPageIndeterminate.value
      }
    })

    // ---- 渲染 ----

    const expandColumnKey = computed(() => {
      if (props.expandColumnKey) {
        return props.expandColumnKey
      }
      return state.mergedColumns.value[0]?.key
    })

    /**
     * 行点击是否应切换详情（仅 expandRowByClick 时）。
     */
    function shouldToggleDetailFromClick(target: EventTarget | null): boolean {
      if (!(target instanceof Element)) {
        return true
      }
      return !target.closest(
        'input,button,a,label,.hh-table__tree-toggle,.hh-table__expand-toggle,[data-hh-table-no-row-expand]',
      )
    }

    return () => {
      const { mergedColumns, currentPageFlatRows } = state
      const selectionColCount = props.rowSelection ? 1 : 0
      const expandColCount = props.expandable ? 1 : 0
      const totalColCount = mergedColumns.value.length + selectionColCount + expandColCount
      const indentSize = props.indentSize ?? 15
      const expandColWidth = toStyleWidth(props.expandable?.columnWidth ?? 48)
      const expandFixedLeft = hasLeftFixedColumns.value && Boolean(props.expandable)
      const expandFixedLeftStyle = expandFixedLeft
        ? { left: `${selectionColumnWidthPx.value}px` }
        : undefined

      // ---- 表头 ----
      const ths: JSX.Element[] = []

      if (props.rowSelection) {
        const selectionFixed = hasLeftFixedColumns.value
        ths.push(
          <th
            class={[
              'hh-table__th',
              'hh-table__th--selection',
              selectionFixed && 'hh-table__cell--fixed-left',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              width: toStyleWidth(props.rowSelection.columnWidth ?? 56),
              ...(selectionFixed ? { left: 0 } : null),
            }}
          >
            {isCheckboxSelection.value ? (
              <input
                ref={headerCheckboxRef}
                type="checkbox"
                checked={state.allCurrentPageSelected.value}
                onChange={(e) => state.toggleAllCurrentPage((e.target as HTMLInputElement).checked)}
              />
            ) : (
              <span>{props.rowSelection.columnTitle ?? '选择'}</span>
            )}
          </th>
        )
      }

      if (props.expandable) {
        ths.push(
          <th
            class={[
              'hh-table__th',
              'hh-table__th--expand',
              expandFixedLeft && 'hh-table__cell--fixed-left',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              width: expandColWidth,
              ...expandFixedLeftStyle,
            }}
          />,
        )
      }

      for (const column of mergedColumns.value) {
        const fixedProps = getFixedCellProps(column)
        const thClass = [
          'hh-table__th',
          column.className,
          !!column.sorter && 'hh-table__th--sortable',
          fixedProps.className,
        ].filter(Boolean)

        const thStyle = {
          width: toStyleWidth(column.width),
          textAlign: (column.align ?? 'left') as 'left' | 'center' | 'right',
          ...column.style,
          ...fixedProps.style,
        }

        const filterActive = isFilterPanelOpen(column.key)
          || (state.filters.value[column.key]?.length ?? 0) > 0

        const filterPanel = (column.filters?.length ?? 0) > 0 ? (
          <HPopover
            trigger="manual"
            placement="bottom-start"
            arrow={false}
            offset={8}
            maxWidth={220}
            zIndex={1050}
            visible={isFilterPanelOpen(column.key)}
            overlayClassName="hh-table__filter-popover"
            onUpdate:visible={(open: boolean) => {
              if (!open) closeFilterPanel()
            }}
          >
            {{
              default: () => (
                <button
                  type="button"
                  class={['hh-table__filter-trigger', filterActive ? 'is-active' : ''].filter(Boolean).join(' ')}
                  title="筛选"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFilterPanel(column.key)
                  }}
                >
                  ⛃
                </button>
              ),
              content: () => (
                <div class="hh-table__filter-panel">
                  {column.filterSearch
                    ? (
                        <input
                          class="hh-table__filter-search"
                          type="search"
                          placeholder="搜索筛选项"
                          value={filterSearchText[column.key] ?? ''}
                          onInput={(e) => {
                            filterSearchText[column.key] = (e.target as HTMLInputElement).value
                          }}
                        />
                      )
                    : null}
                  <div class="hh-table__filter-list" role="listbox">
                    {getVisibleFilterItems(column).map((item) => {
                      const selected = isFilterValueSelected(column.key, item.value)
                      const inputType = column.filterMultiple === false ? 'radio' : 'checkbox'
                      return (
                        <label
                          key={String(item.value)}
                          class={['hh-table__filter-item', selected ? 'is-selected' : ''].filter(Boolean).join(' ')}
                        >
                          <input
                            class="hh-table__filter-check"
                            type={inputType}
                            name={`hh-table-filter-${column.key}`}
                            checked={selected}
                            onChange={(e) => {
                              onFilterItemToggle(
                                column,
                                item.value,
                                (e.target as HTMLInputElement).checked,
                              )
                            }}
                          />
                          <span class="hh-table__filter-item-text">{item.text}</span>
                        </label>
                      )
                    })}
                    {getVisibleFilterItems(column).length === 0
                      ? <div class="hh-table__filter-empty">无匹配项</div>
                      : null}
                  </div>
                  <div class="hh-table__filter-actions">
                    <button
                      type="button"
                      class="hh-table__filter-action"
                      onClick={() => state.setColumnFilters(column.key, [])}
                    >
                      清空
                    </button>
                    <button
                      type="button"
                      class="hh-table__filter-action hh-table__filter-action--primary"
                      onClick={closeFilterPanel}
                    >
                      完成
                    </button>
                  </div>
                </div>
              ),
            }}
          </HPopover>
        ) : null

        ths.push(
          <th class={thClass} style={thStyle}>
            <div class="hh-table__th-inner">
              <button
                type="button"
                class={['hh-table__sort-btn', !column.sorter && 'is-disabled'].filter(Boolean).join(' ')}
                onClick={() => column.sorter && state.toggleSort(column)}
              >
                <span>{column.title}</span>
                {column.sorter && <span class="hh-table__sort-mark">{getSorterMark(column)}</span>}
              </button>
              {filterPanel}
            </div>
          </th>
        )
      }

      // ---- 表体 ----
      const tbodyRows: JSX.Element[] = []

      if (currentPageFlatRows.value.length === 0) {
        tbodyRows.push(
          <tr>
            <td class="hh-table__empty" colSpan={totalColCount}>
              {props.emptyText}
            </td>
          </tr>
        )
      }
      else {
        for (let index = 0; index < currentPageFlatRows.value.length; index++) {
          const flat = currentPageFlatRows.value[index]
          const { record, level, hasChildren } = flat
          const absoluteIndex = getAbsoluteIndex(index)
          const recordKeyValue = state.getRecordKey(record, absoluteIndex)
          const recordKey = String(recordKeyValue)
          const detailOpen = state.isDetailExpanded(recordKeyValue)
          const rowDetailExpandable = Boolean(props.expandable) && state.isRowDetailExpandable(record)
          const tds: JSX.Element[] = []

          if (props.rowSelection) {
            const selectionDisabled = state.isRowSelectionDisabled(record)
            const selectionFixed = hasLeftFixedColumns.value
            tds.push(
              <td
                class={[
                  'hh-table__td',
                  'hh-table__td--selection',
                  selectionFixed && 'hh-table__cell--fixed-left',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={selectionFixed ? { left: 0 } : undefined}
              >
                <input
                  type={isCheckboxSelection.value ? 'checkbox' : 'radio'}
                  name={isCheckboxSelection.value ? undefined : 'hh-table-radio'}
                  checked={state.isRowChecked(record, absoluteIndex)}
                  disabled={selectionDisabled}
                  ref={(el) => {
                    if (el && isCheckboxSelection.value) {
                      ;(el as HTMLInputElement).indeterminate = state.isRowIndeterminate(
                        record,
                        absoluteIndex,
                      )
                    }
                  }}
                  onClick={(e: MouseEvent) => e.stopPropagation()}
                  onChange={(e) =>
                    state.toggleRowSelection(
                      record,
                      absoluteIndex,
                      (e.target as HTMLInputElement).checked,
                    )
                  }
                />
              </td>,
            )
          }

          if (props.expandable) {
            tds.push(
              <td
                class={[
                  'hh-table__td',
                  'hh-table__td--expand',
                  expandFixedLeft && 'hh-table__cell--fixed-left',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={expandFixedLeftStyle}
              >
                {rowDetailExpandable
                  ? (
                      <button
                        type="button"
                        class={[
                          'hh-table__expand-toggle',
                          detailOpen && 'is-expanded',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        aria-label={detailOpen ? '收起' : '展开'}
                        aria-expanded={detailOpen}
                        onClick={(e: MouseEvent) => {
                          e.stopPropagation()
                          state.toggleDetailExpand(record, absoluteIndex)
                        }}
                      >
                        {detailOpen ? '−' : '+'}
                      </button>
                    )
                  : <span class="hh-table__expand-toggle-spacer" />}
              </td>,
            )
          }

          for (const column of mergedColumns.value) {
            const fixedProps = getFixedCellProps(column)
            const tdClass = [
              'hh-table__td',
              column.className,
              column.ellipsis && 'hh-table__td--ellipsis',
              fixedProps.className,
            ].filter(Boolean)

            const tdStyle = {
              textAlign: (column.align ?? 'left') as 'left' | 'center' | 'right',
              ...column.style,
              ...fixedProps.style,
            }

            const cellContent = getCellContent(column, record, absoluteIndex)

            let cellNode: JSX.Element | null = null

            if (column.render) {
              cellNode = <CellContent content={cellContent as any} />
            }
            else if (column.valueType === 'tag') {
              const tags = getTagList(column, record, absoluteIndex)
              if (tags.length > 0) {
                cellNode = (
                  <div class="hh-table__tags">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        class="hh-table__tag"
                        style={{
                          backgroundColor: column.tagColorMap?.[tag] ?? '#f0f5ff',
                          color: '#1d39c4',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )
              }
              else {
                cellNode = <span>-</span>
              }
            }
            else {
              cellNode = <CellContent content={cellContent as any} />
            }

            const isTreeColumn = column.key === expandColumnKey.value
            const wrappedCell = isTreeColumn
              ? (
                  <div
                    class="hh-table__tree-cell"
                    style={{ paddingLeft: `${level * indentSize}px` }}
                  >
                    {hasChildren
                      ? (
                          <button
                            type="button"
                            class="hh-table__tree-toggle"
                            aria-label={state.isTreeExpanded(recordKeyValue) ? '收起' : '展开'}
                            onClick={(e: MouseEvent) => {
                              e.stopPropagation()
                              state.toggleTreeExpand(record, absoluteIndex)
                            }}
                          >
                            {state.isTreeExpanded(recordKeyValue) ? '▼' : '▶'}
                          </button>
                        )
                      : <span class="hh-table__tree-toggle-spacer" />}
                    {cellNode}
                  </div>
                )
              : cellNode

            tds.push(
              <td
                key={`${recordKey}-${column.key}`}
                class={tdClass}
                style={tdStyle}
                title={column.ellipsis ? String(state.getColumnValue(record, column) ?? '') : undefined}
              >
                {wrappedCell}
              </td>,
            )
          }

          const userRowAttrs = props.onRow?.(record, absoluteIndex) ?? {}
          const {
            class: userRowClass,
            onClick: userOnClick,
            onDblclick: userOnDblclick,
            onContextmenu: userOnContextmenu,
            onMouseenter: userOnMouseenter,
            onMouseleave: userOnMouseleave,
            style: userRowStyle,
            ...restUserRowAttrs
          } = userRowAttrs

          const rowClass = [
            'hh-table__tr',
            detailOpen && 'hh-table__tr--expanded',
            rowDetailExpandable && props.expandable?.expandRowByClick && 'hh-table__tr--expandable',
            resolveRowClassName(record, absoluteIndex),
            userRowClass,
          ]
            .flat()
            .filter(Boolean)
            .join(' ')

          tbodyRows.push(
            <tr
              key={recordKey}
              class={rowClass}
              style={userRowStyle as CSSProperties | undefined}
              {...restUserRowAttrs}
              onClick={(e: MouseEvent) => {
                if (
                  props.expandable?.expandRowByClick
                  && rowDetailExpandable
                  && shouldToggleDetailFromClick(e.target)
                ) {
                  state.toggleDetailExpand(record, absoluteIndex)
                }
                userOnClick?.(e)
              }}
              onDblclick={userOnDblclick}
              onContextmenu={userOnContextmenu}
              onMouseenter={userOnMouseenter}
              onMouseleave={userOnMouseleave}
            >
              {tds}
            </tr>,
          )

          if (detailOpen && props.expandable) {
            tbodyRows.push(
              <tr key={`${recordKey}-expand`} class="hh-table__expand-row">
                <td class="hh-table__expand-td" colSpan={totalColCount}>
                  {props.expandable.expandedRowRender(record, absoluteIndex)}
                </td>
              </tr>,
            )
          }
        }
      }

      // ---- 分页器 ----
      const paginationBar = shouldShowPagination.value ? (
        <div class="hh-table__pagination">
          <div class="hh-table__pagination-left">
            {paginationTotalText.value}
          </div>
          <div class="hh-table__pagination-right">
            {(paginationConfig.value.showSizeChanger ?? true) && (
              <select
                class="hh-table__page-size"
                value={String(state.pageSize.value)}
                onChange={(e) => state.setPageSize(Number((e.target as HTMLSelectElement).value))}
              >
                {pageSizeOptions.value.map((size) => (
                  <option key={size} value={size}>
                    {size} 条/页
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              class="hh-table__page-btn"
              disabled={state.current.value <= 1}
              onClick={() => state.setPage(state.current.value - 1)}
            >
              上一页
            </button>
            {pageNumbers.value.map((page) => (
              <button
                key={page}
                type="button"
                class={['hh-table__page-btn', page === state.current.value && 'is-active']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => state.setPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              class="hh-table__page-btn"
              disabled={state.current.value >= state.pageCount.value}
              onClick={() => state.setPage(state.current.value + 1)}
            >
              下一页
            </button>
            {paginationConfig.value.showQuickJumper
              ? (
                  <span class="hh-table__quick-jumper">
                    跳至
                    <input
                      class="hh-table__quick-jumper-input"
                      type="number"
                      min={1}
                      max={state.pageCount.value}
                      value={quickJumpPage.value}
                      onInput={(e) => {
                        quickJumpPage.value = (e.target as HTMLInputElement).value
                      }}
                      onKeydown={(e: KeyboardEvent) => {
                        if (e.key === 'Enter') {
                          commitQuickJump()
                        }
                      }}
                      onBlur={commitQuickJump}
                    />
                    页
                  </span>
                )
              : null}
          </div>
        </div>
      ) : null

      return (
        <div class={tableClass.value.join(' ')}>
          <div class="hh-table__content" style={contentStyle.value}>
            <table
              class="hh-table__table"
              style={tableMinWidth.value ? { minWidth: tableMinWidth.value } : undefined}
            >
              <thead>
                <tr>{ths}</tr>
              </thead>
              <tbody>{tbodyRows}</tbody>
            </table>
            {props.loading
              ? (
                  <div class="hh-table__loading" aria-busy="true" aria-live="polite">
                    <span class="hh-table__loading-spinner" />
                    <span class="hh-table__loading-text">加载中</span>
                  </div>
                )
              : null}
          </div>
          {paginationBar}
        </div>
      )
    }
  },
})

export { HTable, tableProps }
