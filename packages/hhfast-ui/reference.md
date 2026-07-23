# hhfast-ui 组件复用参考

包内复合组件应优先复用已有基础浮层 / 反馈组件，避免再造一套定位、遮罩、点外关闭与阴影样式。

## 原则

1. **能复用就不重写**：浮层定位、箭头、Teleport、点外关闭等交给 `HPopover` / `HTooltip` / `HModal`。
2. **组合优于分叉**：业务面板只写内容与局部 class；壳层样式跟基础组件走。
3. **Teleport 注意样式作用域**：挂到 `body` 的节点不要依赖「必须在 `.hh-table` 内部」的嵌套选择器；用独立 BEM（如 `.hh-table__filter-popover`）写在对应 scss 文件根级。
4. **受控显隐用 `manual`**：表格筛选等需要「完成」按钮关闭时，用 `trigger="manual"` + `visible` / `update:visible`，不要再手写一套 document click。

## 现成能力对照

| 需求 | 优先复用 | 说明 |
|------|----------|------|
| 点击触发的轻量面板（筛选、操作菜单） | `HPopover` | `placement` / `arrow` / `overlayClassName` |
| 悬停说明 | `HTooltip` / `v-tooltip` | 短文案提示 |
| 对话框 / 确认 | `HModal` / `modal.confirm` | 声明式或命令式栈 |
| 侧滑面板 / 命令式抽屉 | `HDrawer` / `drawer.open` / `HDrawerLayer` | 与 Modal 栈分离，`zIndexBase` 1100 |

## 示例：HTable 列筛选

表头筛选不再自绘绝对定位下拉，而是：

```tsx
<HPopover
  trigger="manual"
  placement="bottom-start"
  arrow={false}
  visible={open}
  overlayClassName="hh-table__filter-popover"
  onUpdate:visible={(v) => !v && close()}
>
  {{
    default: () => <button type="button">筛选</button>,
    content: () => <div class="hh-table__filter-panel">…选项与操作…</div>,
  }}
</HPopover>
```

- 浮层壳、阴影、定位、点外关闭 → `HPopover`
- 选项列表 / 清空 / 完成 → Table 自己的内容与 `.hh-table__filter-*` 样式

## 新增复合 UI 时的检查清单

- [ ] 是否已有 Popover / Tooltip / Modal / Drawer 能覆盖壳层？
- [ ] 自定义样式是否只作用在内容区，而不是复制一份 shadow/z-index？
- [ ] Teleport 到 body 的 class 是否在 scss 根级可命中？
- [ ] 是否在本文件或 `readme.md` 中注明复用了哪个组件？
