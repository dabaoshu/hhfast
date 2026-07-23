---
name: drawer-stack-design
description: Design for command-style Drawer stack aligned with Modal (open/confirm/Layer).
type: project
---

# Drawer 命令式栈设计

## 目标

为 `@nnnb/hhfast-ui` 的 drawer 子模块补齐与 Modal 对齐的 **命令式栈 API** 与内置渲染层，并增强声明式 `HDrawer` 以便 `HDrawerLayer` 复用同一套壳。

## 已确认决策

| 项 | 选择 |
|----|------|
| 范围 | 命令式栈（镜像 Modal）：`open` / `confirm` / `createDrawer` / Layer |
| Placement | 每条 `DrawerRecord` 可配；默认 `right`；声明式仍支持四向 |
| 实现路径 | 镜像 Modal 文件结构；Layer 复用增强后的 `HDrawer` |
| 声明式与栈 | **互不入栈**；声明式仍 `v-model:open` |
| zIndex 基线 | `DRAWER_DEFAULTS.zIndexBase = 1100`（与 Modal `1000` 错开） |

## 范围

- 扩展 `types.ts`：`DrawerRecord`、`DrawerOpenPayload`、`DrawerConfirmPayload`、`DrawerContentInput`、`DrawerGlobalDefaults`、`HDrawerEmits` 等
- 新增 `drawerState.ts`、`createDrawer.ts`、`useDrawerLayer.ts`、`HDrawerLayer.vue`、`hDrawerRegistry.ts`（顶层 ESC）
- 增强 `HDrawer.vue`：可选确认 footer、`confirm`/`cancel`/`close`/`afterLeave`、`zIndex`、`confirmLoading` 等
- 导出：`drawer/index.ts`、`src/index.ts`
- `HConfigProvider`：可选 `drawer` 配置与 `<HDrawerLayer />`
- `readme.md`、playground 命令式 demo、Vitest 最小用例

## 不做

- 声明式实例不入 `drawerList`
- 不与 Modal 共用同一物理栈
- 不做拖拽改尺寸、全屏、嵌套路由级抽屉框架
- 不抽 Modal/Drawer 共享 Stack 内核（可后续再做）

## 架构

```
声明式 <HDrawer v-model:open />     ──不入栈──┐
                                              │ 共用 UI 壳
命令式 drawer.open / confirm ──► drawerList ──┤
                                              ▼
                                         HDrawer
                                              ▲
                         HDrawerLayer（每层一条）─┘
```

## 组件与模块职责

### `drawerState` / `createDrawer` / `drawer`

- 全局 `drawerList`（底 → 顶）
- `open(payload)` / `close(id)` / `closeAll()` / `normalizeDrawerContent`
- `createDrawer(defaults)` → `{ open, confirm, close, closeAll }`；默认单例 `drawer`
- `confirm`：Promise；确认 resolve（可等异步 `onConfirm`）；取消/关闭 reject
- `useDrawer()`：只读列表 + 命令式方法

### `DrawerRecord`

| 字段 | 说明 |
|------|------|
| `id` | 唯一 id |
| `content` | 规范化后的 `VNode` |
| `placement` | `left` \| `right` \| `top` \| `bottom`，默认 `right` |
| `width` / `height` | 左右用 width（默认 360），上下用 height（默认 360） |
| `maskClosable` / `closable` | 默认 `true` |
| `zIndex` | 默认 `zIndexBase + 索引 * 10` |
| `title` / `className` / `style` | 展示与样式 |
| `showConfirm` / `showCancel` / 文案 / 回调 | 同 Modal |

`content` 输入：`VNode` \| `Component` \| `() => VNode`（与 Modal 一致）。`confirm` 时 `content` 可选。

### `HDrawer`（增强）

- 保留：`open`、`placement`、`title`、`closable`、`maskClosable`、`width`、`height`、`header` / `default` / `footer` slots
- 新增 props：`showConfirm` / `showCancel`（默认 `false`，避免破坏现有仅 slot footer 的用法）、`confirmText` / `cancelText`、`confirmLoading`、`zIndex`、`className`
- 事件：`update:open`、`confirm`、`cancel`、`close`、`afterLeave`
- 关闭路径：× / 蒙层 / ESC / 取消 → `cancel` → `close` → `update:open=false`
- 确认：仅 `emit('confirm')`，不自动关
- Footer 显示条件：`showConfirm || showCancel || $slots.footer`；有默认按钮时可被 `#footer` 覆盖
- ESC / 焦点：组件内处理；多实例用 `hDrawerRegistry`（与 Modal 注册表隔离）；`afterLeave` 后再还原焦点

**关于 `showConfirm` 默认值**：声明式保持默认不显示内置按钮（现有 playground 用 `#footer`）；Layer 绑记录时显式传 `showConfirm` / `showCancel`（记录默认 `true`，与 Modal 栈一致）。

### `HDrawerLayer` / `useDrawerLayer`

- 订阅 `drawerList` + `loadingMap`
- 每条：`<HDrawer :open="!leaving" … @cancel="beginClose" @after-leave="finishClose" @confirm="handleConfirm" />`
- 离场结束后再 `handleCancel` / 出栈（对齐 `HModalLayer`）

### ConfigProvider

- `drawer?: Partial<DrawerGlobalDefaults> | false`
- `false`：不挂 Layer；对象：合并进 `DRAWER_DEFAULTS`
- 模板增加 `<HDrawerLayer v-if="showDrawer" />`

## 默认值摘要

| 项 | 默认 |
|----|------|
| `placement` | `'right'` |
| `width` / `height` | `360` |
| `maskClosable` / `closable` | `true` |
| `maxStack` | `20` |
| `zIndexBase` | `1100` |
| 栈内 `showConfirm` / `showCancel` | `true` |
| `confirmText` / `cancelText` | `'确定'` / `'取消'` |
| 声明式 `HDrawer` 的 `showConfirm`/`showCancel` | `false` |

## 文件规划

```
packages/hhfast-ui/src/components/drawer/
├── types.ts
├── drawerState.ts          # 新建
├── createDrawer.ts         # 新建
├── useDrawerLayer.ts       # 新建
├── hDrawerRegistry.ts      # 新建
├── HDrawer.vue             # 增强
├── HDrawerLayer.vue        # 新建
├── readme.md               # 新建
└── index.ts
```

同步：`src/index.ts`、`config-provider`、playground `DrawerDemo.vue`、`tests/drawer.test.ts`。

## 验收标准

- `drawer.open` / `drawer.confirm` / `createDrawer` 可用，且不入 modal 栈
- 根挂 `HDrawerLayer`（或 ConfigProvider）后命令式有 UI
- 每条可不同 `placement`；多层 zIndex 递增；ESC 只关顶层
- 声明式 `v-model:open` 与现有 demo 仍可用；内置确认按钮默认关闭
- `confirm` Promise 语义与 Modal 一致
- 导出、readme、playground、测试覆盖核心成功路径

## 与 Modal 的关系

- API 形状刻意对齐，便于心智统一
- 物理栈、注册表、zIndex 基线分离，避免互相抢 ESC / 层级
