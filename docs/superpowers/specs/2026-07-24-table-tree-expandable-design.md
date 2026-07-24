---
name: table-tree-expandable-design
description: Design for HTable tree data (nested children) and independent expandable detail rows.
type: project
---

# HTable 树形数据 + 可展开行设计

## 目标

为 `@nnnb/hhfast-ui` 的 `HTable` 增加两类能力：

1. **树形表格**：`dataSource` 嵌套 `children`，行可展开/收起，首列缩进 + 展开图标。
2. **可展开详情行**：`expandable.expandedRowRender`，与树展开相互独立。

## 已确认决策

| 项 | 选择 |
|----|------|
| 能力范围 | 树形 children + expandable 详情行（两套独立） |
| 数据形态 | 仅嵌套 `children`；字段名可配 `childrenColumnName`（默认 `'children'`） |
| 树/详情并存 | 独立 keys、独立控件；同一行可同时树展开 + 详情展开 |
| 实现路径 | 在现有 HTable 数据管道上拍平可见行（方案 1） |
| 选择 | 按行 key，不做父子联动/半选 |
| 分页 | 作用在拍平后的 `visibleRows` |

## 范围

- 扩展 `TableProps` / 新增 `TableExpandableConfig`、可见行元数据类型
- `useTableData`：同级排序、递归筛选、按树展开 keys 拍平
- 新建 `useTableExpand.ts`：树展开 keys + 详情展开 keys（受控/非受控）
- `TableView.tsx`：首列树控件、详情展开列、展开内容行
- `table.scss`、`readme.md`、playground demo、导出类型
- 最小 Vitest（拍平/展开）

## 不做（首版）

- 扁平 `parentKey` / `pid` 组树
- 虚拟滚动、懒加载异步 children
- 树勾选父子联动 / `checkStrictly`
- 将 expand 并入 `change.extra.action`（用独立回调）
- 独立 `HTableTree` 组件

## 架构

```
dataSource (tree)
    │
    ├─ filter（节点不匹配则丢弃该枝）
    ├─ sort（仅 siblings，递归）
    ├─ flatten by treeExpandedKeys → visibleRows[{ record, level, hasChildren }]
    ├─ paginate(visibleRows)
    └─ render
         ├─ 首列：indent + ▶/▼
         ├─ 可选 expand 列：+/−
         └─ 若 detailExpanded → 插入 colspan 详情行
```

## Props

### 树形

| Prop | 类型 | 默认 | 说明 |
|------|------|------|------|
| `childrenColumnName` | `string` | `'children'` | 子节点字段名 |
| `indentSize` | `number` | `15` | 每级缩进 px |
| `defaultExpandAll` | `boolean` | `false` | 初始全展开 |
| `expandedRowKeys` | `TableRowKey[]` | — | 树展开 keys（受控） |
| `defaultExpandedRowKeys` | `TableRowKey[]` | `[]` | 非受控初始 |
| `onExpandedRowsChange` | `(keys) => void` | — | 树 keys 变化 |
| `onExpand` | `(expanded, record) => void` | — | 树节点展开变化 |

### expandable（详情）

```ts
interface TableExpandableConfig<T> {
  expandedRowRender: (record: T, index: number) => VNodeChild
  expandedRowKeys?: TableRowKey[]
  defaultExpandedRowKeys?: TableRowKey[]
  onExpand?: (expanded: boolean, record: T) => void
  onExpandedRowsChange?: (keys: TableRowKey[]) => void
  /** 是否允许该行详情展开，默认 true */
  rowExpandable?: (record: T) => boolean
}
```

`TableProps.expandable?: TableExpandableConfig<T>`

## 数据流细节

### 筛选

- 递归处理：节点自身字段不匹配 → 不保留该节点及其子孙。
- 不做「子匹配抬升祖先」的复杂保留（首版简化）。

### 排序

- 仅对同一父节点下的 siblings 排序，再递归子列表。

### 拍平

```ts
interface TableFlatRow<T> {
  record: T
  level: number
  hasChildren: boolean
}
```

仅将 `treeExpandedKeys` 中祖先链上已展开的子节点纳入 `visibleRows`。

### 分页

- `total` / `pageCount` / `currentPageData` 基于 `visibleRows`。
- 收起导致当前页越界时，沿用现有页码回退逻辑。

### 选择

- `getRecordKey` 不变；全选当前页 = 当前页可见扁平行。
- 不做半选。

## UI

| 控件 | 位置 | 行为 |
|------|------|------|
| 树 ▶/▼ | 第一数据列内容左侧（有 `rowSelection` 时在选择列之后的首数据列） | 切换树展开；无 children 渲染等宽占位 |
| 详情 +/− | 独立列（选择列之后、数据列之前），仅当配置了 `expandable` | 切换详情展开；`rowExpandable===false` 时占位或隐藏按钮 |
| 详情内容行 | 数据行正下方 | `<tr class="hh-table__expand-row"><td :colspan>` 渲染 `expandedRowRender` |

缩进：`padding-left: level * indentSize`（加在树控件容器上）。

## 文件规划

```
packages/hhfast-ui/src/components/table/
├── types.ts              # 扩展
├── useTableData.ts       # 树筛/排/拍平
├── useTableExpand.ts     # 新建：两套 expand keys
├── useTableState.ts      # 接线
├── TableView.tsx         # UI
├── table.scss
├── tableUtils.ts         # 可选：getChildren / flatten helpers
├── readme.md
└── index.ts
```

Playground：`apps/playground/demos/ui/table/TableDemo.vue` 增加树表示例 + expandable 示例。

## 验收标准

- 嵌套 `children` 可展开/收起，缩进正确；`defaultExpandAll` / 受控 `expandedRowKeys` 可用
- `expandable.expandedRowRender` 可独立展开详情行，与树展开互不冲突
- 同级排序、简化筛选、分页作用在可见扁平行
- 行选择按 key 工作；现有非树表示例行为不变
- readme + playground 可演示；类型从包入口导出

## 与 HTree 的关系

- **不**把 `HTree` 嵌进表格；树表是表格语义（多列、排序筛选分页）。
- `HTree` 仍负责纯树导航场景。
