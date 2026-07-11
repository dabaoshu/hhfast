---
name: drawer-design
description: Design for adding a declaration-style Drawer component to hhfast-ui.
type: project
---

# Drawer 组件设计

## 目标
为 `@nnnb/hhfast-ui` 增加一个声明式 Drawer 组件 `HDrawer`，用于从侧边滑出承载表单、详情、设置面板等内容。

## 范围
- 新增 `HDrawer` 组件
- 支持 `v-model:open`
- 支持 `placement`（`left` / `right` / `top` / `bottom`）
- 支持 `title`、`closable`、`maskClosable`
- 支持 `width` / `height`
- 支持 `header` / `footer` 插槽
- 支持基础样式与关闭交互
- 在组件汇总导出和主入口导出中补齐
- 在 playground 补一个最小示例

## 不做
- 不做命令式 Drawer API
- 不做复杂表单逻辑
- 不做抽屉内状态管理

## 设计
### 1. 组件形态
`HDrawer` 采用 `<script setup lang="ts">` 的单文件组件形式，和现有 Vue 组件保持一致。组件由遮罩层、抽屉容器、头部、主体、底部四部分组成。

### 2. 交互
- `open=false` 时不渲染或通过 `Teleport` 统一挂载到 `body`
- 点击遮罩层时，若 `maskClosable=true` 则关闭
- 点击关闭按钮时触发 `update:open=false`
- 关闭逻辑只负责发出事件，不接管业务状态

### 3. 布局
- `placement=right/left` 时使用固定宽度，容器从左右滑入
- `placement=top/bottom` 时使用固定高度，容器从上下滑入
- `title` 为空时头部可隐藏或仅保留插槽内容
- `footer` 默认不显示，只有存在插槽内容时显示

### 4. 样式
沿用现有组件库的简洁直白风格，避免引入额外依赖。动画只做基础进入/退出过渡，不做过度复杂的动效。

### 5. 导出
需要同步更新：
- `packages/hhfast-ui/src/components/index.ts`
- `packages/hhfast-ui/src/index.ts`

### 6. Demo
在 playground 新增一个 Drawer 示例，展示：
- 右侧抽屉
- 标题与关闭按钮
- 主体内容
- footer 操作区
- 不同 placement 的最小对比（如需要再加）

## 验收标准
- `HDrawer` 可以正常被导入和使用
- 支持双向绑定开关
- 支持四个方向
- 支持遮罩关闭和手动关闭
- demo 可运行并直观展示基础能力
