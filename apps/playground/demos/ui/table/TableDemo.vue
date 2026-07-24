<script setup lang="ts">
/**
 * @description Table 多场景演示：排序筛选分页、选择、树、可展开、固定列、summary 等。
 */
import { computed, h, ref } from 'vue'
import { HTable } from '@/components/table'
import type { TableChangeEvent, TableColumn, TableRowKey } from '@/components/table'

interface DemoUser extends Record<string, unknown> {
  id: number
  name: string
  age: number
  score: number
  city: string
  tags: string[]
  createdAt: string
  status: 'online' | 'offline'
  email: string
  dept: string
}

interface DemoDept extends Record<string, unknown> {
  id: string
  name: string
  city: string
  headcount: number
  budget: number
  children?: DemoDept[]
}

interface ExpandPerson extends Record<string, unknown> {
  id: number
  name: string
  age: number
  city: string
  phone: string
  remark: string
}

const sourceData: DemoUser[] = Array.from({ length: 32 }, (_, i) => {
  const id = i + 1
  const city = ['杭州', '上海', '北京', '深圳'][id % 4]
  return {
    id,
    name: `用户-${id}`,
    age: 18 + (id % 15),
    score: 60 + (id % 40),
    city,
    tags: id % 2 === 0 ? ['稳定', 'VIP'] : ['新客'],
    createdAt: `2026-03-${String((id % 28) + 1).padStart(2, '0')} 10:30:00`,
    status: id % 3 === 0 ? 'offline' : 'online',
    email: `user${id}@example.com`,
    dept: ['研发', '产品', '设计', '运营'][id % 4],
  }
})

const showData = ref(true)
const selectedRowKeys = ref<TableRowKey[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const changeLog = ref('暂无变更')
const rowClickLog = ref('点击行可观察 onRow')

const uiSize = ref<'small' | 'middle' | 'large'>('middle')
const bordered = ref(true)
const fillContainer = ref(false)
const enablePagination = ref(true)
const enableSelection = ref(true)
const selectionType = ref<'checkbox' | 'radio'>('checkbox')
const enableStickyHeader = ref(false)
const stickyHeight = ref(360)
const tableLoading = ref(false)
const enableMainExpandable = ref(true)
const expandRowByClick = ref(false)
const mainCheckStrictly = ref(false)

/** 模拟远程加载 */
function simulateLoading(): void {
  tableLoading.value = true
  window.setTimeout(() => {
    tableLoading.value = false
  }, 1200)
}

const columns: TableColumn<DemoUser>[] = [
  {
    key: 'name',
    title: '姓名',
    dataIndex: 'name',
    sorter: true,
    width: 140,
    ellipsis: true,
    render: (value, record) =>
      h('span', { style: { fontWeight: 600 } }, [
        String(value),
        ' ',
        h('small', { style: { color: '#8c8c8c' } }, `#${record.id}`),
      ]),
  },
  {
    key: 'dept',
    title: '部门',
    dataIndex: 'dept',
    width: 100,
    filters: [
      { text: '研发', value: '研发' },
      { text: '产品', value: '产品' },
      { text: '设计', value: '设计' },
      { text: '运营', value: '运营' },
    ],
    filterSearch: true,
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
    title: '评分',
    dataIndex: 'score',
    sorter: (a, b) => a.score - b.score,
    width: 110,
    align: 'center',
    render: (value) => {
      const score = Number(value)
      const color = score >= 85 ? '#52c41a' : score >= 70 ? '#faad14' : '#ff4d4f'
      return h('span', { style: { fontWeight: 700, color } }, `${score} 分`)
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
    width: 100,
  },
  {
    key: 'tags',
    title: '标签',
    dataIndex: 'tags',
    valueType: 'tag',
    width: 160,
  },
  {
    key: 'email',
    title: '邮箱',
    dataIndex: 'email',
    width: 180,
    ellipsis: true,
  },
  {
    key: 'createdAt',
    title: '创建时间',
    dataIndex: 'createdAt',
    valueType: 'datetime',
    sorter: true,
    width: 180,
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
    width: 120,
  },
  {
    key: 'action',
    title: '操作',
    width: 100,
    fixed: 'right',
    render: (_value, record) =>
      h(
        'button',
        {
          class: 'pg-mini-btn',
          'data-hh-table-no-row-expand': '',
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
    checkStrictly: mainCheckStrictly.value,
    getCheckboxProps: (record: DemoUser) => ({
      disabled: record.status === 'offline',
    }),
    onChange: (keys: TableRowKey[]) => {
      selectedRowKeys.value = keys
    },
  }
})

const mainExpandable = computed(() => {
  if (!enableMainExpandable.value) {
    return undefined
  }
  return {
    expandRowByClick: expandRowByClick.value,
    rowExpandable: (record: DemoUser) => record.status === 'online',
    expandedRowRender: (record: DemoUser) =>
      h('div', { class: 'pg-expand-panel' }, [
        h('div', { class: 'pg-expand-title' }, `${record.name} 的详情`),
        h('div', { class: 'pg-expand-grid' }, [
          h('span', `邮箱：${record.email}`),
          h('span', `部门：${record.dept}`),
          h('span', `城市：${record.city}`),
          h('span', `评分：${record.score}`),
        ]),
      ]),
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
    hideOnSinglePage: false,
    showTotal: (total: number, range: [number, number]) =>
      `第 ${range[0]}-${range[1]} 条 / 共 ${total} 条`,
  }
})

const previewScroll = computed(() => {
  if (!enableStickyHeader.value) {
    return undefined
  }
  return { y: stickyHeight.value }
})

function handleTableChange(event: TableChangeEvent<DemoUser>): void {
  currentPage.value = event.pagination.current
  pageSize.value = event.pagination.pageSize
  changeLog.value = `action=${event.extra.action}, page=${event.pagination.current}, size=${event.pagination.pageSize}, total=${event.pagination.total}`
}

// ---- 树形演示 ----

const treeData: DemoDept[] = [
  {
    id: 'tech',
    name: '技术部',
    city: '杭州',
    headcount: 12,
    budget: 320,
    children: [
      {
        id: 'fe',
        name: '前端组',
        city: '杭州',
        headcount: 5,
        budget: 120,
        children: [
          { id: 'u1', name: '张三', city: '杭州', headcount: 1, budget: 24 },
          { id: 'u2', name: '李四', city: '上海', headcount: 1, budget: 26 },
        ],
      },
      {
        id: 'be',
        name: '后端组',
        city: '杭州',
        headcount: 4,
        budget: 110,
        children: [
          { id: 'u3', name: '王五', city: '深圳', headcount: 1, budget: 28 },
          { id: 'u4', name: '赵六', city: '北京', headcount: 1, budget: 30 },
        ],
      },
      {
        id: 'qa',
        name: '测试组',
        city: '杭州',
        headcount: 3,
        budget: 90,
        children: [{ id: 'u5', name: '钱七', city: '杭州', headcount: 1, budget: 22 }],
      },
    ],
  },
  {
    id: 'product',
    name: '产品部',
    city: '上海',
    headcount: 6,
    budget: 180,
    children: [
      { id: 'pm1', name: '孙八', city: '上海', headcount: 1, budget: 30 },
      { id: 'pm2', name: '周九', city: '北京', headcount: 1, budget: 32 },
    ],
  },
]

const treeSelectedKeys = ref<TableRowKey[]>([])
const treeExpandedKeys = ref<TableRowKey[]>(['tech', 'fe', 'be'])
const treeCheckStrictly = ref(false)
const treeExpandRowByClick = ref(false)

const treeColumns: TableColumn<DemoDept>[] = [
  { key: 'name', title: '名称', dataIndex: 'name', width: 200, sorter: true },
  { key: 'city', title: '城市', dataIndex: 'city', width: 100, filters: [
    { text: '杭州', value: '杭州' },
    { text: '上海', value: '上海' },
    { text: '深圳', value: '深圳' },
    { text: '北京', value: '北京' },
  ], filterSearch: true },
  { key: 'headcount', title: '人数', dataIndex: 'headcount', width: 90, align: 'right', sorter: true },
  { key: 'budget', title: '预算(万)', dataIndex: 'budget', width: 110, align: 'right', sorter: true },
]

function expandAllTree(): void {
  treeExpandedKeys.value = ['tech', 'fe', 'be', 'qa', 'product']
}

function collapseAllTree(): void {
  treeExpandedKeys.value = []
}

// ---- 可展开行演示 ----

const expandPeople: ExpandPerson[] = [
  {
    id: 1,
    name: 'John Brown',
    age: 32,
    city: 'New York No. 1 Lake Park',
    phone: '188-0000-0001',
    remark: 'Prefer morning meetings.',
  },
  {
    id: 2,
    name: 'Jim Green',
    age: 42,
    city: 'London No. 1 Lake Park',
    phone: '188-0000-0002',
    remark: 'Working on Q3 roadmap.',
  },
  {
    id: 3,
    name: 'Not Expandable',
    age: 29,
    city: 'Jiangsu No. 1 Lake Park',
    phone: '188-0000-0003',
    remark: 'This row disables expand.',
  },
  {
    id: 4,
    name: 'Joe Black',
    age: 32,
    city: 'Sydney No. 1 Lake Park',
    phone: '188-0000-0004',
    remark: 'On vacation next week.',
  },
]

const expandSelectedKeys = ref<TableRowKey[]>([])
const expandDemoRowByClick = ref(false)
const expandDetailKeys = ref<TableRowKey[]>([2])

const expandColumns: TableColumn<ExpandPerson>[] = [
  { key: 'name', title: 'Name', dataIndex: 'name', width: 160 },
  { key: 'age', title: 'Age', dataIndex: 'age', width: 80, align: 'center' },
  { key: 'city', title: 'Address', dataIndex: 'city', width: 240, ellipsis: true },
  {
    key: 'action',
    title: 'Action',
    width: 100,
    render: (_v, record) =>
      h(
        'a',
        {
          href: '#',
          'data-hh-table-no-row-expand': '',
          onClick: (e: MouseEvent) => {
            e.preventDefault()
            window.alert(`Delete ${record.name}`)
          },
        },
        'Delete'
      ),
  },
]

// ---- 固定列 + 选择 ----

const fixedSelectedKeys = ref<TableRowKey[]>([])

const fixedColumns: TableColumn<DemoUser>[] = [
  { key: 'name', title: '姓名', dataIndex: 'name', width: 140, fixed: 'left' },
  { key: 'dept', title: '部门', dataIndex: 'dept', width: 100 },
  { key: 'age', title: '年龄', dataIndex: 'age', width: 90 },
  { key: 'score', title: '评分', dataIndex: 'score', width: 100 },
  { key: 'city', title: '城市', dataIndex: 'city', width: 120 },
  { key: 'status', title: '状态', dataIndex: 'status', width: 100, valueType: 'tag' },
  { key: 'email', title: '邮箱', dataIndex: 'email', width: 200, ellipsis: true },
  { key: 'createdAt', title: '创建时间', dataIndex: 'createdAt', width: 200 },
  { key: 'tags', title: '标签', dataIndex: 'tags', width: 180, valueType: 'tag' },
  {
    key: 'action',
    title: '操作',
    width: 100,
    fixed: 'right',
    render: () => h('a', { href: '#' }, '查看'),
  },
]

// ---- summary 分页 ----

const summaryPage = ref(1)
const summaryPageSize = ref(5)

const sections = [
  { id: 'pg-table-main', label: '综合预览' },
  { id: 'pg-table-tree', label: '树形表格' },
  { id: 'pg-table-expand', label: '可展开行' },
  { id: 'pg-table-fixed', label: '固定列' },
  { id: 'pg-table-summary', label: 'Summary' },
  { id: 'pg-table-misc', label: '其它' },
]
</script>

<template>
  <section class="pg-section">
    <h2>Table 演示</h2>
    <p class="pg-desc">
      覆盖排序 / 筛选（含 filterSearch）/ 分页（showTotal、跳页）/ 行选择（禁选、联动）/
      树形 / 可展开（+/− 与勾选同列）/ 固定列 / loading / summary / onRow 等。
    </p>

    <nav class="pg-toc">
      <a
        v-for="item in sections"
        :key="item.id"
        class="pg-toc-item"
        :href="`#${item.id}`"
      >
        {{ item.label }}
      </a>
    </nav>

    <div id="pg-table-main" class="pg-card">
      <h3>Props 实时预览</h3>
      <p class="pg-card-desc">
        勾选与 +/− 在同一控制列；离线行禁选且不可展开。
        选中：<code>{{ selectedRowKeys.join(', ') || '无' }}</code>
        · {{ rowClickLog }}
      </p>
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
          <span>checkStrictly</span>
          <input v-model="mainCheckStrictly" type="checkbox" :disabled="!enableSelection" />
        </label>
        <label class="pg-prop-item">
          <span>expandable</span>
          <input v-model="enableMainExpandable" type="checkbox" />
        </label>
        <label class="pg-prop-item">
          <span>expandRowByClick</span>
          <input v-model="expandRowByClick" type="checkbox" :disabled="!enableMainExpandable" />
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
        <div class="pg-prop-item pg-prop-item--action">
          <button type="button" class="pg-mini-btn" @click="simulateLoading">
            模拟加载 1.2s
          </button>
        </div>
      </div>
    </div>

    <div class="pg-card" :style="fillContainer ? 'height: 560px;' : undefined">
      <h3>综合能力（可交互）</h3>
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
        :expandable="mainExpandable"
        :row-class-name="(record) => (record.status === 'offline' ? 'is-offline' : '')"
        :on-row="(record) => ({
          onClick: () => {
            rowClickLog = `onRow → ${record.name} (#${record.id})`
          },
        })"
        title="用户综合表"
        :footer="() => `已选 ${selectedRowKeys.length} 项 · ${changeLog}`"
        row-key="id"
        @change="handleTableChange"
        @update:selected-row-keys="selectedRowKeys = $event"
      />
    </div>

    <div id="pg-table-tree" class="pg-card">
      <h3>树形 + 可展开详情 + 勾选联动</h3>
      <p class="pg-card-desc">
        ▶ 在「名称」列控制树；+/− 与勾选同列；后端组不可展开详情。
        选中：<code>{{ treeSelectedKeys.join(', ') || '无' }}</code>
      </p>
      <div class="pg-toolbar">
        <label class="pg-inline">
          <input v-model="treeCheckStrictly" type="checkbox" />
          checkStrictly（关闭父子联动）
        </label>
        <label class="pg-inline">
          <input v-model="treeExpandRowByClick" type="checkbox" />
          expandRowByClick
        </label>
        <button type="button" class="pg-mini-btn" @click="expandAllTree">展开全部树</button>
        <button type="button" class="pg-mini-btn" @click="collapseAllTree">收起全部树</button>
      </div>
      <HTable
        bordered
        :columns="treeColumns"
        :data-source="treeData"
        row-key="id"
        expand-column-key="name"
        :expanded-row-keys="treeExpandedKeys"
        :on-expanded-rows-change="(keys) => (treeExpandedKeys = keys)"
        :indent-size="18"
        :pagination="false"
        :row-selection="{
          selectedRowKeys: treeSelectedKeys,
          checkStrictly: treeCheckStrictly,
          onChange: (keys) => (treeSelectedKeys = keys),
        }"
        :expandable="{
          expandRowByClick: treeExpandRowByClick,
          expandedRowRender: (record) =>
            h('div', { class: 'pg-expand-panel' }, [
              h('div', `${record.name} · ${record.city}`),
              h('div', `编制 ${record.headcount} 人 · 预算 ${record.budget} 万`),
            ]),
          rowExpandable: (record) => record.id !== 'be',
        }"
      />
    </div>

    <div id="pg-table-expand" class="pg-card">
      <h3>可展开行（+/− 与选择同列）</h3>
      <p class="pg-card-desc">
        对齐 Ant Design：控制列内同时有展开钮与勾选；Not Expandable 行无展开钮。
      </p>
      <div class="pg-toolbar">
        <label class="pg-inline">
          <input v-model="expandDemoRowByClick" type="checkbox" />
          expandRowByClick（点行展开）
        </label>
        <span class="pg-muted">已展开 keys：{{ expandDetailKeys.join(', ') || '无' }}</span>
      </div>
      <HTable
        bordered
        :columns="expandColumns"
        :data-source="expandPeople"
        row-key="id"
        :pagination="false"
        :row-selection="{
          selectedRowKeys: expandSelectedKeys,
          onChange: (keys) => (expandSelectedKeys = keys),
        }"
        :expandable="{
          expandRowByClick: expandDemoRowByClick,
          expandedRowKeys: expandDetailKeys,
          onExpandedRowsChange: (keys) => (expandDetailKeys = keys),
          expandedRowRender: (record) =>
            h('div', { class: 'pg-expand-panel' }, [
              h(
                'div',
                `My name is ${record.name}, I am ${record.age} years old, living in ${record.city}.`,
              ),
              h('div', `Phone: ${record.phone}`),
              h('div', `Remark: ${record.remark}`),
            ]),
          rowExpandable: (record) => record.name !== 'Not Expandable',
        }"
      />
    </div>

    <div id="pg-table-fixed" class="pg-card">
      <h3>固定列 + 横向滚动 + 选择</h3>
      <p class="pg-card-desc">
        姓名左固定、操作右固定；控制列随左固定；选中
        <code>{{ fixedSelectedKeys.join(', ') || '无' }}</code>
      </p>
      <HTable
        bordered
        :columns="fixedColumns"
        :data-source="sourceData.slice(0, 12)"
        :scroll="{ x: 1400, y: 300 }"
        :pagination="false"
        row-key="id"
        :row-selection="{
          selectedRowKeys: fixedSelectedKeys,
          onChange: (keys) => (fixedSelectedKeys = keys),
        }"
        :expandable="{
          expandedRowRender: (record) =>
            h('div', { class: 'pg-expand-panel' }, `固定列场景详情：${record.name} / ${record.email}`),
        }"
      />
    </div>

    <div id="pg-table-summary" class="pg-card">
      <h3>title / summary / footer（随分页变化）</h3>
      <HTable
        bordered
        title="本页评分合计"
        :footer="() => `当前第 ${summaryPage} 页`"
        :columns="[
          { key: 'name', title: '姓名', dataIndex: 'name', width: 140 },
          { key: 'dept', title: '部门', dataIndex: 'dept', width: 100 },
          { key: 'score', title: '评分', dataIndex: 'score', width: 100, align: 'right', sorter: true },
        ]"
        :data-source="sourceData"
        row-key="id"
        :pagination="{
          current: summaryPage,
          pageSize: summaryPageSize,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
        }"
        :summary="(pageData) =>
          h('tr', [
            h('td', { colSpan: 2 }, '本页合计'),
            h(
              'td',
              { style: { textAlign: 'right' } },
              String(pageData.reduce((sum, row) => sum + Number(row.score ?? 0), 0)),
            ),
          ])
        "
        @change="(e) => {
          summaryPage = e.pagination.current
          summaryPageSize = e.pagination.pageSize
        }"
      />
    </div>

    <div id="pg-table-misc" class="pg-card">
      <h3>省略 / 空状态 / 只读</h3>
      <div class="pg-split">
        <div>
          <p class="pg-card-desc">ellipsis 长文本</p>
          <HTable
            bordered
            :columns="[
              { key: 'name', title: '姓名', dataIndex: 'name', width: 100 },
              {
                key: 'city',
                title: '长地址',
                dataIndex: 'city',
                width: 160,
                ellipsis: true,
                render: (_v, record) =>
                  `${record.city} · ${record.email} · ${record.dept} · 这是一段很长的补充说明用于验证省略`,
              },
            ]"
            :data-source="sourceData.slice(0, 4)"
            :pagination="false"
            row-key="id"
          />
        </div>
        <div>
          <p class="pg-card-desc">空状态</p>
          <HTable
            bordered
            :columns="columns.slice(0, 3)"
            :data-source="[]"
            :pagination="false"
            empty-text="暂无数据（自定义文案）"
            row-key="id"
          />
        </div>
      </div>
      <p class="pg-card-desc" style="margin-top: 16px">只读（无选择、无展开）</p>
      <HTable
        :columns="columns.filter((c) => c.key !== 'action')"
        :data-source="sourceData.slice(0, 5)"
        :pagination="false"
        size="small"
        row-key="id"
      />
    </div>
  </section>
</template>

<style scoped>
.pg-toc {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.pg-toc-item {
  padding: 4px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 999px;
  color: #1677ff;
  text-decoration: none;
  font-size: 12px;
  background: #fff;
}

.pg-toc-item:hover {
  border-color: #1677ff;
  background: #e6f4ff;
}

.pg-props-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
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

.pg-prop-item--action {
  justify-content: center;
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

.pg-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.pg-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.pg-muted {
  font-size: 12px;
  color: #8c8c8c;
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

.pg-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 900px) {
  .pg-split {
    grid-template-columns: 1fr;
  }
}

:deep(.pg-expand-panel) {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #595959;
}

:deep(.pg-expand-title) {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

:deep(.pg-expand-grid) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 4px 12px;
}

:deep(.is-offline td) {
  color: #8c8c8c;
}
</style>
