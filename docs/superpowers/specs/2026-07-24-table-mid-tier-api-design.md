---
name: table-mid-tier-api-design
description: HTable loading, row/selection APIs, pagination extras, filterSearch.
type: project
---

# HTable 中阶 API 补齐（loading / 行与选择 / 分页 / filterSearch）

## 范围

1. `loading`
2. `getCheckboxProps` + `rowClassName` + `onRow`
3. 分页 `showTotal` + `showQuickJumper`
4. 列 `filterSearch`

不做：`scroll.x` / 固定列（下一轮）。

## 决策

| 项 | 选择 |
|----|------|
| loading | `boolean`；表体遮罩 + CSS spinner；不默认禁交互 |
| getCheckboxProps | 返回 `{ disabled?: boolean }`；全选跳过 disabled |
| rowClassName | `string \| (record, index) => string` |
| onRow | `(record, index) =>` 行 DOM 属性；与详情行点击共存（先内部 toggle，再调用户 onClick） |
| showTotal | `(total, [start, end]) => string`；默认「共 N 条」 |
| showQuickJumper | `boolean`；输入页码回车/失焦跳转并钳制 |
| filterSearch | `boolean \| (input, item) => boolean`；面板顶搜索框 |

## 文件

- `types.ts`、`TableView.tsx`、`table.scss`、`useTableSelection.ts`
- `readme.md`、`TableDemo.vue`、`tests/table-api.test.ts`
