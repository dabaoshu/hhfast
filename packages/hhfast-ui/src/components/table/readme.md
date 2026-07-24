# Table 子模块说明（UI + 逻辑）

`table` 与 `toast/modal` 不同：它提供了可直接使用的渲染组件 `HTable`，同时开放 `useTableState` 便于你在业务侧定制 UI。

首版能力参考 Ant Design Table 的中阶场景：

- `columns` 列配置
- TSX `render` 单元格渲染
- 本地排序（`sorter`）
- 本地筛选（`filters` + `onFilter`；筛选面板复用 `HPopover`，见包根目录 `reference.md`）
- 分页（`pagination`，含 `showTotal` / `showQuickJumper`）
- 行选择（`rowSelection`，含 `getCheckboxProps` / `checkStrictly`）
- `loading` / `rowClassName` / `onRow`
- 树形数据与行点击详情
---

## 从入口导入

```ts
import {
  HTable,
  useTableState,
  normalizeTagList,
  type TableColumn,
  type TableProps,
  type TableChangeEvent,
} from '@/components/table';
```

---

## 快速使用

```vue
<script setup lang="tsx">
import { ref } from 'vue';
import { HTable } from '@/components/table';
import type { TableColumn } from '@/components/table';

interface User {
  id: number;
  name: string;
  age: number;
}

const dataSource = ref<User[]>([
  { id: 1, name: 'Alice', age: 24 },
  { id: 2, name: 'Bob', age: 30 },
]);

const columns: TableColumn<User>[] = [
  { key: 'name', title: '姓名', dataIndex: 'name' },
  {
    key: 'age',
    title: '年龄',
    dataIndex: 'age',
    sorter: (a, b) => a.age - b.age,
  },
  {
    key: 'action',
    title: '操作',
    render: (_v, record) => <a href={`#/users/${record.id}`}>查看</a>,
  },
];
</script>

<template>
  <HTable
    bordered
    :columns="columns"
    :data-source="dataSource"
    row-key="id"
  />
</template>
```

---

## `TableColumn` 常用字段

| 字段 | 说明 |
|---|---|
| `key` | 列唯一标识 |
| `title` | 列标题 |
| `dataIndex` | 取值路径，支持 `a.b.c` 或数组路径 |
| `width` | 列宽；固定列建议显式设置 |
| `fixed` | 固定列：`true` / `left` / `start` 或 `right` / `end` |
| `render` | TSX 自定义渲染，签名 `(value, record, index) => VNodeChild` |
| `sorter` | `true` 使用默认比较，或传比较函数 |
| `filters` | 过滤菜单项 `{ text, value }[]`；有值时表头显示筛选按钮 |
| `onFilter` | 自定义过滤逻辑 `(value, record) => boolean`；不传则按 `dataIndex` 等值匹配 |
| `filterMultiple` | 是否多选，默认 `true`；`false` 时为单选 |
| `filterSearch` | `true` 或自定义函数，开启筛选项搜索 |
| `valueType` | 默认展示类型：`text/date/datetime/array/tag` |
| `tagColorMap` | `valueType='tag'` 时的值到颜色映射 |

## 列筛选（复用 HPopover）

表头筛选面板基于 **`HPopover`**（`trigger="manual"`），不再自绘绝对定位下拉：

- 浮层定位 / 阴影 / Teleport / 点外关闭 → `HPopover`
- 选项列表（checkbox / radio）与「清空 / 完成」→ Table 内容区样式 `.hh-table__filter-*`
- 包级复用约定见 [`reference.md`](../../reference.md)

```ts
const columns: TableColumn<User>[] = [
  {
    key: 'city',
    title: '城市',
    dataIndex: 'city',
    filters: [
      { text: '杭州', value: '杭州' },
      { text: '上海', value: '上海' },
    ],
    // filterMultiple: false, // 单选
    onFilter: (value, record) => record.city === value,
  },
];
```

筛选变化会通过 `change` 事件的 `extra.action === 'filter'` 与 `filters` 字段抛出。

## `HTable` 常用 Props

| 字段 | 说明 |
|---|---|
| `fillContainer` | 让组件外层高度自适应填充父容器（`height: 100%` + 内容区自滚动） |
| `scroll.y` | 设置表体高度并启用固定表头（如 `320` 或 `'50vh'`） |

---

## `onChange` 事件

`HTable` 触发 `change` 事件，同时支持 `onChange` prop，事件载荷为：

```ts
interface TableChangeEvent<T> {
  pagination: { current: number; pageSize: number; total: number };
  filters: Record<string, Array<string | number>>;
  sorter: { columnKey?: string; order: 'ascend' | 'descend' | null };
  extra: { action: 'paginate' | 'sort' | 'filter' | 'selection'; currentDataSource: T[] };
}
```

---

## 固定表头

通过 `scroll.y` 开启固定表头：表头保持在顶部，表体在限定高度内滚动。

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { HTable } from '@/components/table';
import type { TableColumn } from '@/components/table';

interface UserRow {
  id: number;
  name: string;
  score: number;
}

const list = ref<UserRow[]>(Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  name: `用户-${i + 1}`,
  score: 60 + (i % 40),
})));

const columns: TableColumn<UserRow>[] = [
  { key: 'name', title: '姓名', dataIndex: 'name' },
  { key: 'score', title: '评分', dataIndex: 'score', sorter: true },
];
</script>

<template>
  <HTable
    :columns="columns"
    :data-source="list"
    :scroll="{ y: 320 }"
    :pagination="false"
    row-key="id"
  />
</template>
```

---

## TSX render 示例

下面示例展示组合渲染、条件样式与交互列写法：

```ts
import { h } from 'vue';
import type { TableColumn } from '@/components/table';

interface UserRow {
  id: number;
  name: string;
  score: number;
}

export const columns: TableColumn<UserRow>[] = [
  {
    key: 'name',
    title: '姓名(TSX)',
    dataIndex: 'name',
    render: (value, record) =>
      h('span', { style: { fontWeight: 600 } }, [
        String(value),
        ' ',
        h('small', { style: { color: '#8c8c8c' } }, `#${record.id}`),
      ]),
  },
  {
    key: 'score',
    title: '评分(TSX)',
    dataIndex: 'score',
    render: (value) => {
      const score = Number(value);
      const color = score >= 85 ? '#52c41a' : score >= 70 ? '#faad14' : '#ff4d4f';
      return h('span', { style: { color, fontWeight: 700 } }, `${score} 分`);
    },
  },
  {
    key: 'action',
    title: '操作(TSX)',
    render: (_value, record) =>
      h(
        'button',
        {
          onClick: () => window.alert(`查看：${record.name}`),
        },
        '详情'
      ),
  },
];
```

---

## 行选择（`rowSelection`）

- `type`: `checkbox` / `radio`
- `selectedRowKeys`: 受控选中
- `defaultSelectedRowKeys`: 非受控初始值
- `onChange`: 选中变化回调
- `checkStrictly`: 树数据下是否关闭父子联动（默认 `false` 表示联动 + 半选；`radio` 不级联）
- `getCheckboxProps`: `(record) => ({ disabled?: boolean })`，禁用行不可勾选，表头全选会跳过

组件同时支持事件 `update:selectedRowKeys`，便于 `v-model` 风格联动。

---

## loading / 行样式与事件

```ts
<HTable
  :loading="fetching"
  :row-class-name="(record) => record.vip ? 'is-vip' : ''"
  :on-row="(record) => ({
    onClick: () => console.log(record),
  })"
  ...
/>
```

- `loading`：表体半透明遮罩 + spinner
- `rowClassName`：字符串或函数
- `onRow`：返回行 DOM 属性；与详情行点击共存（先处理内部 expand，再调你的 `onClick`）

---

## 分页扩展

```ts
pagination: {
  showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条 / 共 ${total} 条`,
  showQuickJumper: true,
}
```

---

## 树形数据

- 数据使用嵌套 `children`（字段名可用 `childrenColumnName` 配置，默认 `'children'`）
- `expandColumnKey`：缩进与 ▶/▼ 所在列；默认第一数据列
- `indentSize`：每级缩进 px（默认 `15`）
- `defaultExpandAll` / `expandedRowKeys` / `defaultExpandedRowKeys`
- `onExpand` / `onExpandedRowsChange`：树展开变化（与详情展开独立）

分页作用在拍平后的可见行。

---

## 可展开详情行（`expandable`）

```ts
expandable: {
  expandedRowRender: (record, index) => h('div', `详情：${record.name}`),
  // expandedRowKeys / defaultExpandedRowKeys / onExpand / onExpandedRowsChange
  // rowExpandable: (record) => record.type !== 'group',
}
```

配置 `expandable` 后，**点击整行**切换详情（无独立 +/− 列）。以下区域点击不会触发行展开：

- 选择框、树 ▶/▼、`button` / `a` / `input`
- 带 `data-hh-table-no-row-expand` 的元素

树展开与详情展开使用两套独立 keys，可同时存在。

---

## `useTableState`

如果你需要深度自定义表格外观，可复用内部逻辑：

- 排序/筛选/分页状态管理
- 树拍平与两套 expand keys
- 行选择与 `selectedRowKeys` 协议（含父子联动）
- 默认值格式化与 `render` 回退逻辑

---

## 说明

- 当前版本为中阶能力，未包含虚拟滚动、异步懒加载 children。
- 固定列：`column.fixed` + `scroll.x`（sticky）；固定列建议声明 `width`。
- 推荐在 `playground/demos/ui/table/TableDemo.vue` 查看完整示例。
