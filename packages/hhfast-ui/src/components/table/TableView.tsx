/// <reference types="vue/jsx" />
import {
  defineComponent,
  ref,
  computed,
  watchEffect,
  isVNode,
  type PropType,
} from 'vue'
import type { CSSProperties } from 'vue'
import { HPopover } from '../popover'
import { useTableState, normalizeTagList } from './useTableState'
import type { TableChangeEvent, TableColumn, TablePaginationConfig, TableRowKey, TableRowSelection, TableScrollConfig } from './types'
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

    const tableClass = computed(() => [
      'hh-table',
      `hh-table--${props.size}`,
      {
        'hh-table--bordered': props.bordered,
        'hh-table--fill': props.fillContainer,
        'hh-table--sticky-header': stickyHeaderEnabled.value,
      },
    ])

    const contentStyle = computed(() => {
      if (!stickyHeaderEnabled.value) {
        return undefined
      }
      const yValue = props.scroll?.y
      return {
        maxHeight: typeof yValue === 'number' ? `${yValue}px` : yValue,
      } as CSSProperties
    })

    const isCheckboxSelection = computed(() => props.rowSelection?.type !== 'radio')
    const pageSizeOptions = computed(() => paginationConfig.value.pageSizeOptions ?? [10, 20, 50, 100])

    const pageBaseIndex = computed(() => {
      if (!state.paginationEnabled.value || state.current.value <= 0) {
        return 0
      }
      return (state.current.value - 1) * state.pageSize.value
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
      activeFilterColumnKey.value = null
    }

    function isFilterPanelOpen(columnKey: string): boolean {
      return activeFilterColumnKey.value === columnKey
    }

    watchEffect(() => {
      if (headerCheckboxRef.value) {
        headerCheckboxRef.value.indeterminate = state.isCurrentPageIndeterminate.value
      }
    })

    // ---- 渲染 ----

    return () => {
      const { mergedColumns, currentPageData } = state
      const selectionColCount = props.rowSelection ? 1 : 0
      const totalColCount = mergedColumns.value.length + selectionColCount

      // ---- 表头 ----
      const ths: JSX.Element[] = []

      if (props.rowSelection) {
        ths.push(
          <th
            class="hh-table__th hh-table__th--selection"
            style={{ width: toStyleWidth(props.rowSelection.columnWidth ?? 56) }}
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

      for (const column of mergedColumns.value) {
        const thClass = [
          'hh-table__th',
          column.className,
          !!column.sorter && 'hh-table__th--sortable',
        ].filter(Boolean)

        const thStyle = {
          width: toStyleWidth(column.width),
          textAlign: (column.align ?? 'left') as 'left' | 'center' | 'right',
          ...column.style,
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
                  <div class="hh-table__filter-list" role="listbox">
                    {column.filters?.map((item) => {
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

      if (currentPageData.value.length === 0) {
        tbodyRows.push(
          <tr>
            <td class="hh-table__empty" colSpan={totalColCount}>
              {props.emptyText}
            </td>
          </tr>
        )
      }
      else {
        for (let index = 0; index < currentPageData.value.length; index++) {
          const record = currentPageData.value[index]
          const absoluteIndex = getAbsoluteIndex(index)
          const recordKey = String(state.getRecordKey(record, absoluteIndex))
          const tds: JSX.Element[] = []

          if (props.rowSelection) {
            tds.push(
              <td class="hh-table__td hh-table__td--selection">
                <input
                  type={isCheckboxSelection.value ? 'checkbox' : 'radio'}
                  name={isCheckboxSelection.value ? undefined : 'hh-table-radio'}
                  checked={state.isRowChecked(record, absoluteIndex)}
                  onChange={(e) => state.toggleRowSelection(record, absoluteIndex, (e.target as HTMLInputElement).checked)}
                />
              </td>
            )
          }

          for (const column of mergedColumns.value) {
            const tdClass = [
              'hh-table__td',
              column.className,
              column.ellipsis && 'hh-table__td--ellipsis',
            ].filter(Boolean)

            const tdStyle = {
              textAlign: (column.align ?? 'left') as 'left' | 'center' | 'right',
              ...column.style,
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

            tds.push(
              <td
                key={`${recordKey}-${column.key}`}
                class={tdClass}
                style={tdStyle}
                title={column.ellipsis ? String(state.getColumnValue(record, column) ?? '') : undefined}
              >
                {cellNode}
              </td>
            )
          }

          tbodyRows.push(
            <tr key={recordKey} class="hh-table__tr">
              {tds}
            </tr>
          )
        }
      }

      // ---- 分页器 ----
      const paginationBar = shouldShowPagination.value ? (
        <div class="hh-table__pagination">
          <div class="hh-table__pagination-left">
            共 {state.total.value} 条
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
          </div>
        </div>
      ) : null

      return (
        <div class={tableClass.value.join(' ')}>
          <div class="hh-table__content" style={contentStyle.value}>
            <table class="hh-table__table">
              <thead>
                <tr>{ths}</tr>
              </thead>
              <tbody>{tbodyRows}</tbody>
            </table>
          </div>
          {paginationBar}
        </div>
      )
    }
  },
})

export { HTable, tableProps }
