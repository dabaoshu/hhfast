---
name: table-tree-expandable-design
description: Design for HTable tree data (nested children) and independent expandable detail rows.
type: project
---

# HTable 树形数据 + 可展开行设计

## 目标

为 `@nnnb/hhfast-ui` 的 `HTable` 增加两类能力：

1. **树形表格**：`dataSource` 嵌套 `children`，行可展开/收起，指定列缩进 + 展开图标。
2. **可展开详情行**：`expandable.expandedRowRender`，与树展开相互独立；**Ant Design 风格独立 +/− 列**。

## 已确认决策

| 项 | 选择 |
|----|------|
| 能力范围 | 树形 children + expandable 详情行（两套独立） |
| 数据形态 | 仅嵌套 `children`；字段名可配 `childrenColumnName`（默认 `'children'`） |
| 树展开列 | **A2**：`expandColumnKey` 指定缩进 + ▶ 所在列；默认第一数据列 |
| 详情展开 UI | **Ant Design 风格**：独立 +/− 列；可选 `expandRowByClick` |
| 树/详情并存 | 独立 keys；同一行可同时树展开 + 详情展开 |
| 实现路径 | 在现有 HTable 数据管道上拍平可见行（方案 1） |
| 选择 | **D**：父子勾选联动 + 半选；`checkStrictly` 可关闭联动 |
| 分页 | 作用在拍平后的 `visibleRows` |

## 范围

- 扩展 `TableProps` / `TableRowSelection` / 新增 `TableExpandableConfig`、可见行元数据类型
- `useTableData`：同级排序、递归筛选、按树展开 keys 拍平
- 新建 `useTableExpand.ts`：树展开 keys + 详情展开 keys（受控/非受控）
- `useTableSelection.ts`：树数据下父子联动、行半选、`selectedRows` 递归收集
- `TableView.tsx`：树控件列、详情展开列（+/−）、详情内容行、半选 checkbox
- `table.scss`、`readme.md`、playground demo、导出类型
- 最小 Vitest（拍平 / 展开 / 勾选联动）

## 不做（首版）

- 扁平 `parentKey` / `pid` 组树
- 虚拟滚动、懒加载异步 children
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
         ├─ 详情列：+/−
         ├─ expandColumnKey 列：indent + ▶/▼
         └─ 若 detailExpanded → 插入 colspan 详情行
```

## Props

### 树形

| Prop | 类型 | 默认 | 说明 |
|------|------|------|------|
| `childrenColumnName` | `string` | `'children'` | 子节点字段名 |
| `indentSize` | `number` | `15` | 每级缩进 px |
| `expandColumnKey` | `string` | 第一数据列 `key`/`dataIndex` | 树缩进与 ▶/▼ 所在列 |
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
  /** 是否允许该行详情展开（含行点击），默认 true */
  rowExpandable?: (record: T) => boolean
}
```

`TableProps.expandable?: TableExpandableConfig<T>`

### 行选择扩展（`TableRowSelection`）

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `checkStrictly` | `boolean` | `false` | `false`：父子联动；`true`：各行独立（现状） |

仅 `type !== 'radio'`（checkbox）时启用联动；`radio` 仍为单选、不级联。

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

### 选择（D）

- `getRecordKey` 不变；在整棵树上解析 key → record。
- `selectedRows`：按当前 keys **递归**从 `dataSource` 收集，不只扫顶层。
- **`checkStrictly === false`（默认）**：
  - 勾选节点 → 选中其全部子孙；取消 → 取消全部子孙。
  - 子节点变化后，自底向上更新祖先：全选 / 半选 / 未选。
  - 半选：祖先 key **不在** `selectedRowKeys` 中，UI 用 `indeterminate`；`onChange` 只回传明确选中的 keys。
  - 表头「全选当前页」：对当前页可见行执行联动后的勾选/取消（与现有页范围一致）。
- **`checkStrictly === true`**：行为与现网一致，无父子联动、无行级半选（仅表头全选保留中间态）。

## UI

| 控件 | 位置 | 行为 |
|------|------|------|
| 树 ▶/▼ | `expandColumnKey` 对应列内容左侧；无配置时取第一数据列 | 切换树展开；点击 **stopPropagation**；无 children 渲染等宽占位 |
| 详情 +/− | 选择列之后、数据列之前的独立列；仅配置了 `expandable` 时出现 | 切换详情；`rowExpandable===false` 时占位；可选 `expandRowByClick` |
| 详情内容行 | 数据行正下方 | `<tr class="hh-table__expand-row"><td :colspan>` 渲染 `expandedRowRender` |
| 行 checkbox 半选 | 选择列 | 联动模式下祖先部分子孙选中时显示 `indeterminate` |

缩进：`padding-left: level * indentSize`（加在树控件容器上）。

`expandRowByClick`（默认 false）：为 true 时点击数据行也可切换详情；交互控件需排除。

## 文件规划

```
packages/hhfast-ui/src/components/table/
├── types.ts              # 扩展
├── useTableData.ts       # 树筛/排/拍平
├── useTableExpand.ts     # 新建：两套 expand keys
├── useTableSelection.ts  # 父子联动 / 半选 / 树内收集
├── useTableState.ts      # 接线
├── TableView.tsx         # UI
├── table.scss
├── tableUtils.ts         # getChildren / flatten / collectDescendants 等
├── readme.md
└── index.ts
```

Playground：`apps/playground/demos/ui/table/TableDemo.vue` 增加树表 + 行点击详情 + 勾选联动示例。

## 验收标准

- 嵌套 `children` 可展开/收起；`expandColumnKey` / `defaultExpandAll` / 受控 `expandedRowKeys` 可用
- 配置 `expandable` 后出现 +/− 列展开详情；`rowExpandable` 可隐藏按钮；与树展开互不冲突
- 同级排序、简化筛选、分页作用在可见扁平行
- checkbox + 树数据下默认父子联动与半选；`checkStrictly: true` 可关闭；`radio` 不级联
- 现有非树表示例行为不变（无 children / 无 expandable 时）
- readme + playground 可演示；类型从包入口导出

## 与 HTree 的关系

- **不**把 `HTree` 嵌进表格；树表是表格语义（多列、排序筛选分页）。
- `HTree` 仍负责纯树导航场景。
