<script setup lang="ts">
/**
 * @description Table 渲染层组件（中阶能力）
 */
import { computed, defineComponent, h, isVNode, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import type { PropType } from 'vue'
import type {
  TableChangeEvent,
  TableColumn,
  TablePaginationConfig,
  TableProps,
  TableRowKey,
  TableRowSelection,
  TableScrollConfig,
} from './types'
import { normalizeTagList, useTableState } from './useTableState'

type RowRecord = Record<string, unknown>

const props = defineProps({
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
    type: [String, Function] as PropType<TableProps<RowRecord>['rowKey']>,
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
    type: String,
    default: '暂无数据',
  },
  bordered: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String as PropType<'large' | 'middle' | 'small'>,
    default: 'middle',
  },
  fillContainer: {
    type: Boolean,
    default: false,
  },
  onChange: {
    type: Function as PropType<(event: TableChangeEvent<RowRecord>) => void>,
    default: undefined,
  },
})

const emit = defineEmits<{
  (e: 'change', event: TableChangeEvent<RowRecord>): void
  (e: 'update:selectedRowKeys', keys: TableRowKey[]): void
}>()

const state = useTableState<RowRecord>({
  props: props as TableProps<RowRecord>,
  emitChange: (event: TableChangeEvent<RowRecord>) => emit('change', event),
  emitSelectedRowKeys: (keys) => emit('update:selectedRowKeys', keys),
})

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
        return '-'
      }
      if (isVNode(innerProps.content)) {
        return innerProps.content
      }
      if (Array.isArray(innerProps.content)) {
        return innerProps.content as any
      }
      return h('span', String(innerProps.content))
    }
  },
})

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
  }
})

const isCheckboxSelection = computed(() => props.rowSelection?.type !== 'radio')
const pageSizeOptions = computed(() => paginationConfig.value.pageSizeOptions ?? [10, 20, 50, 100])
const headerCheckboxRef = ref<HTMLInputElement | null>(null)

const pageBaseIndex = computed(() => {
  if (!state.paginationEnabled.value || state.current.value <= 0) {
    return 0
  }
  return (state.current.value - 1) * state.pageSize.value
})

/**
 * @description 生成紧凑分页按钮。
 */
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
const activeFilterColumnKey = ref<string | null>(null)

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

function onFilterChange(column: TableColumn<RowRecord>, event: Event): void {
  if (!column.key) {
    return
  }
  const target = event.target as HTMLSelectElement
  if (column.filterMultiple === false) {
    const value = target.value
    state.setColumnFilters(column.key, value ? [value] : [])
    return
  }
  const values = Array.from(target.selectedOptions).map((option) => option.value as TableRowKey)
  state.setColumnFilters(column.key, values)
}

/**
 * @description 切换某一列筛选面板显隐。
 */
function toggleFilterPanel(columnKey: string): void {
  activeFilterColumnKey.value = activeFilterColumnKey.value === columnKey ? null : columnKey
}

function closeFilterPanel(): void {
  activeFilterColumnKey.value = null
}

function isFilterPanelOpen(columnKey: string): boolean {
  return activeFilterColumnKey.value === columnKey
}

/**
 * @description 处理文档点击，点击筛选区域外时关闭面板。
 */
function onDocumentClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null
  if (!target) {
    return
  }
  if (target.closest('.hh-table__filter-wrap')) {
    return
  }
  closeFilterPanel()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})

watchEffect(() => {
  if (headerCheckboxRef.value) {
    headerCheckboxRef.value.indeterminate = state.isCurrentPageIndeterminate.value
  }
})

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
</script>

<template>
  <div :class="tableClass">
    <div class="hh-table__content" :style="contentStyle">
      <table class="hh-table__table">
        <thead>
          <tr>
            <th
              v-if="rowSelection"
              class="hh-table__th hh-table__th--selection"
              :style="{ width: toStyleWidth(rowSelection.columnWidth ?? 56) }"
            >
              <input
                v-if="isCheckboxSelection"
                ref="headerCheckboxRef"
                type="checkbox"
                :checked="state.allCurrentPageSelected.value"
                @change="state.toggleAllCurrentPage(($event.target as HTMLInputElement).checked)"
              />
              <span v-else>{{ rowSelection.columnTitle ?? '选择' }}</span>
            </th>

            <th
              v-for="column in state.mergedColumns.value"
              :key="column.key"
              :class="['hh-table__th', column.className, { 'hh-table__th--sortable': !!column.sorter }]"
              :style="{ width: toStyleWidth(column.width), textAlign: column.align ?? 'left', ...column.style }"
            >
              <div class="hh-table__th-inner">
                <button
                  type="button"
                  :class="['hh-table__sort-btn', { 'is-disabled': !column.sorter }]"
                  @click="state.toggleSort(column)"
                >
                  <span>{{ column.title }}</span>
                  <span v-if="column.sorter" class="hh-table__sort-mark">{{ getSorterMark(column) }}</span>
                </button>

                <div v-if="(column.filters?.length ?? 0) > 0" class="hh-table__filter-wrap">
                  <button
                    type="button"
                    :class="[
                      'hh-table__filter-trigger',
                      { 'is-active': isFilterPanelOpen(column.key) || (state.filters.value[column.key]?.length ?? 0) > 0 },
                    ]"
                    title="筛选"
                    @click.stop="toggleFilterPanel(column.key)"
                  >
                    ⛃
                  </button>

                  <div
                    v-if="isFilterPanelOpen(column.key)"
                    class="hh-table__filter-panel"
                    @click.stop
                  >
                    <select
                      class="hh-table__filter"
                      :multiple="column.filterMultiple !== false"
                      :value="(state.filters.value[column.key] ?? []).map((v) => String(v))"
                      @change="onFilterChange(column, $event)"
                    >
                      <option v-for="item in column.filters" :key="String(item.value)" :value="String(item.value)">
                        {{ item.text }}
                      </option>
                    </select>

                    <div class="hh-table__filter-actions">
                      <button type="button" class="hh-table__filter-action" @click="state.setColumnFilters(column.key, [])">
                        清空
                      </button>
                      <button type="button" class="hh-table__filter-action hh-table__filter-action--primary" @click="closeFilterPanel">
                        完成
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="state.currentPageData.value.length === 0">
            <td class="hh-table__empty" :colspan="state.mergedColumns.value.length + (rowSelection ? 1 : 0)">
              {{ emptyText }}
            </td>
          </tr>

          <tr
            v-for="(record, index) in state.currentPageData.value"
            :key="String(state.getRecordKey(record, getAbsoluteIndex(index)))"
            class="hh-table__tr"
          >
            <td v-if="rowSelection" class="hh-table__td hh-table__td--selection">
              <input
                :type="isCheckboxSelection ? 'checkbox' : 'radio'"
                :name="isCheckboxSelection ? undefined : 'hh-table-radio'"
                :checked="state.isRowChecked(record, getAbsoluteIndex(index))"
                @change="
                  state.toggleRowSelection(
                    record,
                    getAbsoluteIndex(index),
                    ($event.target as HTMLInputElement).checked
                  )
                "
              />
            </td>

            <td
              v-for="column in state.mergedColumns.value"
              :key="`${String(state.getRecordKey(record, getAbsoluteIndex(index)))}-${column.key}`"
              :class="['hh-table__td', column.className, { 'hh-table__td--ellipsis': column.ellipsis }]"
              :style="{ textAlign: column.align ?? 'left', ...column.style }"
              :title="column.ellipsis ? String(state.getColumnValue(record, column) ?? '') : undefined"
            >
              <template v-if="column.render">
                <CellContent :content="getCellContent(column, record, getAbsoluteIndex(index)) as any" />
              </template>
              <template v-else-if="column.valueType === 'tag'">
                <div v-if="getTagList(column, record, getAbsoluteIndex(index)).length > 0" class="hh-table__tags">
                  <span
                    v-for="tag in getTagList(column, record, getAbsoluteIndex(index))"
                    :key="tag"
                    class="hh-table__tag"
                    :style="{
                      backgroundColor: column.tagColorMap?.[tag] ?? '#f0f5ff',
                      color: '#1d39c4',
                    }"
                  >
                    {{ tag }}
                  </span>
                </div>
                <span v-else>-</span>
              </template>
              <template v-else>
                <CellContent :content="getCellContent(column, record, getAbsoluteIndex(index)) as any" />
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="shouldShowPagination" class="hh-table__pagination">
      <div class="hh-table__pagination-left">共 {{ state.total.value }} 条</div>
      <div class="hh-table__pagination-right">
        <select
          v-if="paginationConfig.showSizeChanger ?? true"
          class="hh-table__page-size"
          :value="String(state.pageSize.value)"
          @change="state.setPageSize(Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="size in pageSizeOptions" :key="size" :value="size">
            {{ size }} 条/页
          </option>
        </select>

        <button
          type="button"
          class="hh-table__page-btn"
          :disabled="state.current.value <= 1"
          @click="state.setPage(state.current.value - 1)"
        >
          上一页
        </button>

        <button
          v-for="page in pageNumbers"
          :key="page"
          type="button"
          :class="['hh-table__page-btn', { 'is-active': page === state.current.value }]"
          @click="state.setPage(page)"
        >
          {{ page }}
        </button>

        <button
          type="button"
          class="hh-table__page-btn"
          :disabled="state.current.value >= state.pageCount.value"
          @click="state.setPage(state.current.value + 1)"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
$hh-primary: #1677ff;
$hh-primary-hover: #4096ff;
$hh-bg: #fff;
$hh-bg-header: #fafafa;
$hh-border: #f0f0f0;
$hh-border-light: #f5f5f5;
$hh-border-control: #d9d9d9;
$hh-text: rgba(0, 0, 0, 0.88);
$hh-text-secondary: #595959;
$hh-text-muted: #8c8c8c;
$hh-radius-sm: 6px;
$hh-radius-md: 8px;

.hh-table {
  width: 100%;
  border-radius: $hh-radius-md;
  background: $hh-bg;

  &--bordered {
    border: 1px solid $hh-border;
  }

  &--fill {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;

    .hh-table__content {
      flex: 1;
      min-height: 0;
    }
  }

  &--sticky-header {
    .hh-table__th {
      position: sticky;
      top: 0;
      z-index: 5;
      background: $hh-bg-header;
      box-shadow: inset 0 -1px 0 $hh-border;
    }
  }

  &--small {
    .hh-table__th,
    .hh-table__td {
      padding: 8px;
      font-size: 12px;
    }
  }

  &--middle {
    .hh-table__th,
    .hh-table__td {
      padding: 10px 12px;
      font-size: 13px;
    }
  }

  &--large {
    .hh-table__th,
    .hh-table__td {
      padding: 14px 16px;
      font-size: 14px;
    }
  }

  &__content {
    width: 100%;
    overflow: auto;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
  }

  &__th {
    border-bottom: 1px solid $hh-border;
    background: $hh-bg-header;
    vertical-align: top;
  }

  &__th-inner {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__sort-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    background: transparent;
    color: #1f1f1f;
    font-weight: 600;
    padding: 0;
    cursor: pointer;

    &.is-disabled {
      cursor: default;
    }
  }

  &__sort-mark {
    font-size: 12px;
    color: $hh-primary;
  }

  &__filter-wrap {
    position: relative;
    width: fit-content;
  }

  &__filter-trigger {
    width: 24px;
    height: 24px;
    border: 1px solid $hh-border-control;
    border-radius: $hh-radius-sm;
    background: $hh-bg;
    color: $hh-text-secondary;
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: $hh-primary-hover;
      color: $hh-primary;
    }

    &.is-active {
      border-color: $hh-primary;
      color: $hh-primary;
      background: #e6f4ff;
    }
  }

  &__filter-panel {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 20;
    width: 180px;
    padding: 8px;
    border: 1px solid $hh-border;
    border-radius: $hh-radius-md;
    background: $hh-bg;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }

  &__filter {
    width: 100%;
    min-height: 30px;
    padding: 4px 8px;
    border: 1px solid $hh-border-control;
    border-radius: $hh-radius-sm;
    font-size: 12px;
    line-height: 1.3;
    color: $hh-text;
    background: $hh-bg;
    transition: border-color 0.2s, box-shadow 0.2s;
    appearance: none;

    &:hover {
      border-color: $hh-primary-hover;
    }

    &:focus {
      outline: none;
      border-color: $hh-primary;
      box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.12);
    }

    &[multiple] {
      min-height: 64px;
      padding: 6px;
    }

    option {
      padding: 2px 4px;
      border-radius: 4px;
    }
  }

  &__filter-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }

  &__filter-action {
    height: 26px;
    padding: 0 10px;
    border: 1px solid $hh-border-control;
    border-radius: $hh-radius-sm;
    background: $hh-bg;
    font-size: 12px;
    color: $hh-text-secondary;
    cursor: pointer;

    &--primary {
      border-color: $hh-primary;
      color: $hh-primary;
    }
  }

  &__tr:hover &__td {
    background: $hh-bg-header;
  }

  &__td {
    border-bottom: 1px solid $hh-border-light;
    color: $hh-text;
    word-break: break-word;

    &--ellipsis {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 1px;
    }

    &--selection {
      text-align: center;
    }
  }

  &__th--selection {
    text-align: center;
  }

  &__empty {
    text-align: center;
    color: $hh-text-muted;
    padding: 28px 16px;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  &__tag {
    display: inline-flex;
    align-items: center;
    line-height: 1;
    padding: 4px 8px;
    border-radius: 999px;
    font-size: 12px;
  }

  &__pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
  }

  &__pagination-left {
    font-size: 13px;
    color: $hh-text-muted;
  }

  &__pagination-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__page-size {
    height: 30px;
    border-radius: $hh-radius-sm;
    border: 1px solid $hh-border-control;
    padding: 0 8px;
    font-size: 12px;
  }

  &__page-btn {
    height: 30px;
    min-width: 30px;
    border: 1px solid $hh-border-control;
    border-radius: $hh-radius-sm;
    background: $hh-bg;
    padding: 0 10px;
    font-size: 12px;
    color: #1f1f1f;
    cursor: pointer;

    &:hover {
      border-color: $hh-primary;
      color: $hh-primary;
    }

    &.is-active {
      border-color: $hh-primary;
      color: $hh-primary;
      font-weight: 600;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>
