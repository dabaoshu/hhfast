<script setup lang="ts">
/**
 * @description Table 组件演示（多场景 + props 实时预览）
 */
import { computed, h, ref } from 'vue'
import { HTable } from '@/components/table'
import type { TableChangeEvent, TableColumn, TableRowKey } from '@/components/table'

interface DemoUser {
  id: number
  name: string
  age: number
  score: number
  city: string
  tags: string[]
  createdAt: string
  status: 'online' | 'offline'
}

const sourceData: DemoUser[] = Array.from({ length: 32 }, (_, i) => {
  const id = i + 1
  return {
    id,
    name: `用户-${id}`,
    age: 18 + (id % 15),
    score: 60 + (id % 40),
    city: ['杭州', '上海', '北京', '深圳'][id % 4],
    tags: id % 2 === 0 ? ['稳定', 'VIP'] : ['新客'],
    createdAt: `2026-03-${String((id % 28) + 1).padStart(2, '0')} 10:30:00`,
    status: id % 3 === 0 ? 'offline' : 'online',
  }
})

const showData = ref(true)
const selectedRowKeys = ref<TableRowKey[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const changeLog = ref('暂无变更')

interface DemoDept extends Record<string, unknown> {
  id: string
  name: string
  city: string
  children?: DemoDept[]
}

/** 树形 + 详情 + 勾选联动演示数据 */
const treeData: DemoDept[] = [
  {
    id: 'tech',
    name: '技术部',
    city: '-',
    children: [
      {
        id: 'fe',
        name: '前端组',
        city: '-',
        children: [
          { id: 'u1', name: '张三', city: '杭州' },
          { id: 'u2', name: '李四', city: '上海' },
        ],
      },
      {
        id: 'be',
        name: '后端组',
        city: '-',
        children: [{ id: 'u3', name: '王五', city: '深圳' }],
      },
    ],
  },
]

const treeSelectedKeys = ref<TableRowKey[]>([])
const treeColumns: TableColumn<DemoDept>[] = [
  { key: 'name', title: '姓名', dataIndex: 'name', width: 220 },
  { key: 'city', title: '城市', dataIndex: 'city', width: 120 },
]

/** props 预览控制项 */
const uiSize = ref<'small' | 'middle' | 'large'>('middle')
const bordered = ref(true)
const fillContainer = ref(false)
const enablePagination = ref(true)
const enableSelection = ref(true)
const selectionType = ref<'checkbox' | 'radio'>('checkbox')
const enableStickyHeader = ref(false)
const stickyHeight = ref(360)
const tableLoading = ref(false)

const columns: TableColumn<DemoUser>[] = [
  {
    key: 'name',
    title: '姓名',
    dataIndex: 'name',
    sorter: true,
    width: 140,
    render: (value, record) =>
      h('span', { style: { fontWeight: 600 } }, [
        String(value),
        ' ',
        h('small', { style: { color: '#8c8c8c' } }, `#${record.id}`),
      ]),
  },
  {
    key: 'age',
    title: '年龄',
    dataIndex: 'age',
    sorter: (a, b) => a.age - b.age,
    width: 90,
    align: 'center',
  },
  {
    key: 'score',
    title: '评分(TSX)',
    dataIndex: 'score',
    sorter: (a, b) => a.score - b.score,
    width: 130,
    align: 'center',
    render: (value) => {
      const score = Number(value)
      const color = score >= 85 ? '#52c41a' : score >= 70 ? '#faad14' : '#ff4d4f'
      return h(
        'span',
        {
          style: {
            fontWeight: 700,
            color,
          },
        },
        `${score} 分`
      )
    },
  },
  {
    key: 'status',
    title: '状态',
    dataIndex: 'status',
    valueType: 'tag',
    filters: [
      { text: '在线', value: 'online' },
      { text: '离线', value: 'offline' },
    ],
    onFilter: (value, record) => String(record.status) === String(value),
    tagColorMap: {
      online: '#e6fffb',
      offline: '#fff1f0',
    },
    width: 120,
  },
  {
    key: 'tags',
    title: '标签',
    dataIndex: 'tags',
    valueType: 'tag',
    width: 180,
  },
  {
    key: 'createdAt',
    title: '创建时间',
    dataIndex: 'createdAt',
    valueType: 'datetime',
    sorter: true,
    width: 200,
  },
  {
    key: 'city',
    title: '城市',
    dataIndex: 'city',
    filters: [
      { text: '杭州', value: '杭州' },
      { text: '上海', value: '上海' },
      { text: '北京', value: '北京' },
      { text: '深圳', value: '深圳' },
    ],
    filterMultiple: true,
    filterSearch: true,
    width: 160,
  },
  {
    key: 'action',
    title: '操作',
    width: 120,
    render: (_value, record) =>
      h(
        'button',
        {
          class: 'pg-mini-btn',
          onClick: () => {
            window.alert(`查看详情：${record.name}`)
          },
        },
        '详情'
      ),
  },
]

const previewData = computed(() => (showData.value ? sourceData : []))

const rowSelection = computed(() => {
  if (!enableSelection.value) {
    return undefined
  }
  return {
    type: selectionType.value,
    selectedRowKeys: selectedRowKeys.value,
    getCheckboxProps: (record: DemoUser) => ({
      disabled: record.status === 'offline',
    }),
    onChange: (keys: TableRowKey[]) => {
      selectedRowKeys.value = keys
    },
  }
})

const pagination = computed(() => {
  if (!enablePagination.value) {
    return false as const
  }
  return {
    current: currentPage.value,
    pageSize: pageSize.value,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: [5, 10, 20, 50],
    hideOnSinglePage: true,
    showTotal: (total: number, range: [number, number]) =>
      `第 ${range[0]}-${range[1]} 条 / 共 ${total} 条`,
  }
})

const previewScroll = computed(() => {
  if (!enableStickyHeader.value) {
    return undefined
  }
  return {
    y: stickyHeight.value,
  }
})

/**
 * @description 统一记录表格变更，便于观察 onChange 协议。
 */
function handleTableChange(event: TableChangeEvent<DemoUser>) {
  currentPage.value = event.pagination.current
  pageSize.value = event.pagination.pageSize
  changeLog.value = `action=${event.extra.action}, page=${event.pagination.current}, size=${event.pagination.pageSize}, total=${event.pagination.total}`
}
</script>

<template>
  <section class="pg-section">
    <h2>Table 演示</h2>
    <p class="pg-desc">
      支持 <code>columns</code>、TSX <code>render</code>、排序、筛选、分页、行选择、
      树形数据与行点击详情；默认内置了时间/数组/tag 的 valueType 展示处理。
    </p>

    <div class="pg-card">
      <h3>Props 实时预览</h3>
      <p class="pg-card-desc">可直接切换常用 props，观察同一份表格的行为变化</p>
      <div class="pg-props-grid">
        <label class="pg-prop-item">
          <span>size</span>
          <select v-model="uiSize">
            <option value="small">small</option>
            <option value="middle">middle</option>
            <option value="large">large</option>
          </select>
        </label>
        <label class="pg-prop-item">
          <span>bordered</span>
          <input v-model="bordered" type="checkbox" />
        </label>
        <label class="pg-prop-item">
          <span>fillContainer</span>
          <input v-model="fillContainer" type="checkbox" />
        </label>
        <label class="pg-prop-item">
          <span>pagination</span>
          <input v-model="enablePagination" type="checkbox" />
        </label>
        <label class="pg-prop-item">
          <span>rowSelection</span>
          <input v-model="enableSelection" type="checkbox" />
        </label>
        <label class="pg-prop-item">
          <span>selectionType</span>
          <select v-model="selectionType" :disabled="!enableSelection">
            <option value="checkbox">checkbox</option>
            <option value="radio">radio</option>
          </select>
        </label>
        <label class="pg-prop-item">
          <span>showData</span>
          <input v-model="showData" type="checkbox" />
        </label>
        <label class="pg-prop-item">
          <span>loading</span>
          <input v-model="tableLoading" type="checkbox" />
        </label>
        <label class="pg-prop-item">
          <span>stickyHeader</span>
          <input v-model="enableStickyHeader" type="checkbox" />
        </label>
        <label class="pg-prop-item">
          <span>scroll.y(px)</span>
          <input
            v-model.number="stickyHeight"
            :disabled="!enableStickyHeader"
            type="number"
            min="200"
            step="20"
          />
        </label>
      </div>
    </div>

    <div class="pg-card" :style="fillContainer ? 'height: 520px;' : undefined">
      <h3>中阶能力示例（可交互）</h3>
      <p class="pg-card-desc">
        当前选中：<code>{{ selectedRowKeys.join(', ') || '无' }}</code>
      </p>

      <HTable
        :bordered="bordered"
        :size="uiSize"
        :fill-container="fillContainer"
        :loading="tableLoading"
        :columns="columns"
        :data-source="previewData"
        :scroll="previewScroll"
        :row-selection="rowSelection"
        :pagination="pagination"
        :row-class-name="(record) => (record.status === 'offline' ? 'is-offline' : '')"
        row-key="id"
        @change="handleTableChange"
        @update:selected-row-keys="selectedRowKeys = $event"
      />
    </div>

    <div class="pg-card">
      <h3>树形 + 行点击详情 + 勾选联动</h3>
      <p class="pg-card-desc">
        ▶ 控制树展开；点击行展开详情；勾选默认父子联动（半选）。当前选中：
        <code>{{ treeSelectedKeys.join(', ') || '无' }}</code>
      </p>
      <HTable
        bordered
        :columns="treeColumns"
        :data-source="treeData"
        row-key="id"
        expand-column-key="name"
        :default-expand-all="true"
        :pagination="false"
        :row-selection="{
          selectedRowKeys: treeSelectedKeys,
          checkStrictly: false,
          onChange: (keys) => (treeSelectedKeys = keys),
        }"
        :expandable="{
          expandedRowRender: (record) => h('div', `详情：${record.name} / ${record.city}`),
        }"
      />
    </div>

    <div class="pg-card">
      <h3>固定表头示例</h3>
      <p class="pg-card-desc">设置 <code>scroll.y</code> 后表体滚动，表头固定</p>
      <HTable
        bordered
        size="middle"
        :columns="columns"
        :data-source="sourceData"
        :scroll="{ y: 320 }"
        :pagination="false"
        row-key="id"
      />
    </div>

    <div class="pg-card">
      <h3>只读展示（无选择列）</h3>
      <p class="pg-card-desc">适合详情页列表：保留排序/筛选，关闭行选择与操作态</p>
      <HTable
        :columns="columns"
        :data-source="sourceData.slice(0, 6)"
        :pagination="false"
        row-key="id"
      />
    </div>

    <div class="pg-card">
      <h3>空状态示例</h3>
      <p class="pg-card-desc">用于验证空数据文案与表头布局</p>
      <HTable
        :columns="columns"
        :data-source="[]"
        :pagination="false"
        empty-text="暂无数据（自定义文案）"
        row-key="id"
      />
    </div>

    <div class="pg-card">
      <h3>onChange 回调日志</h3>
      <p class="pg-card-desc">{{ changeLog }}</p>
    </div>
  </section>
</template>

<style scoped>
.pg-props-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 10px 14px;
}

.pg-prop-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
}

.pg-prop-item select {
  min-width: 92px;
  height: 28px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 0 6px;
}

.pg-prop-item input[type='number'] {
  width: 92px;
  height: 28px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 0 6px;
}

.pg-mini-btn {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 2px 10px;
  height: 28px;
  background: #fff;
  cursor: pointer;
}

.pg-mini-btn:hover {
  border-color: #1677ff;
  color: #1677ff;
}
</style>
