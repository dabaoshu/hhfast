---
name: table-fixed-columns-design
description: HTable scroll.x and sticky fixed columns.
type: project
---

# HTable 固定列设计

## 目标

支持宽表横向滚动与左右固定列，对齐 Ant Design `scroll.x` + `column.fixed`。

## 决策

| 项 | 选择 |
|----|------|
| 实现 | CSS `position: sticky`（非双表拷贝） |
| `scroll.x` | `number \| string`，设为表格 `min-width` |
| `column.fixed` | `true \| 'left' \| 'right' \| 'start' \| 'end'`（`true`/`start`→左，`end`→右） |
| 偏移 | 按声明顺序累加 `column.width`（固定列需显式 width，缺省按 120） |
| 选择列 | 存在左固定列时，选择列 sticky `left: 0` |
| 阴影 | 左固定末列 / 右固定首列加边缘阴影 |

## 不做（本轮）

- 堆叠空隙（gapped fixed）
- 固定列与虚拟滚动
- 未声明 width 的运行时测量
