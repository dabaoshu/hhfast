---
name: hmodal-design
description: Design for declarative HModal shell shared with HModalLayer in hhfast-ui.
type: project
---

# HModal 通用弹层组件设计

## 目标

为 `@nnnb/hhfast-ui` 的 modal 子模块新增声明式通用组件 **`HModal`**，并让现有 **`HModalLayer`** 复用同一套 UI 壳，避免两套样式与交互分叉。

## 已确认决策

| 项 | 选择 |
|----|------|
| 能力范围 | 可复用壳 + 声明式 API；Layer 与声明式共用 UI |
| 与逻辑栈关系 | **完全独立**：`v-model` 不入 `modalList`，与 `modal.open` / `confirm` 互不干扰 |
| 内容与页脚 | **混合**：默认 title + 确认/取消；可用 `header` / `footer` slot 覆盖；body 用 `default` |
| 实现路径 | 抽 `HModal`，`HModalLayer` 薄包装复用 |

## 范围

- 新增 `HModal.vue`（声明式单层弹窗）
- 在 `types.ts` 增加 `HModalProps` / `HModalEmits`（或等价命名）
- 重构 `HModalLayer.vue`：对栈内每条 `ModalRecord` 渲染一个 `HModal`
- 将 mask / dialog / 默认 header·footer / 样式从 Layer 迁入 `HModal`
- 导出：`modal/index.ts`、`components/index.ts`、`src/index.ts`
- 更新 `modal/readme.md`：声明式用法 + Layer 复用关系
- playground：在现有 Modal demo 增加「声明式 HModal」示例

## 不做

- 声明式实例不入全局 `modalList`
- `HModal` 不内置 Promise / 异步 loading 状态机（仅受控 `confirmLoading`）
- 不改变 `modal.open` / `confirm` / `useModal` / `useModalLayer` 的栈语义（Layer 仍用现有 `handleConfirm` 等）
- 不做 Drawer 式 placement、全屏、拖拽等扩展

## 架构

```
┌─────────────────────────────────────────┐
│ 声明式业务页面                           │
│  <HModal v-model="open" @confirm="…" /> │  ← 独立显隐，不入栈
└─────────────────────────────────────────┘
                    │ 共用 UI
                    ▼
              ┌──────────┐
              │  HModal  │  Teleport + mask + dialog + ESC/焦点
              └──────────┘
                    ▲
                    │ 每层一条
┌─────────────────────────────────────────┐
│ HModalLayer                             │
│  useModalLayer → v-for ModalRecord      │
│  :confirm-loading="loadingMap[id]"      │
└─────────────────────────────────────────┘
                    ▲
                    │
         modalList / openModal / confirm
```

## 组件职责

### `HModal`

- `v-model`（`modelValue`）控制显隐；`false` 时不渲染弹层（或等价不展示）
- `Teleport to="body"`
- 默认 header（title + ×）、body（default slot）、footer（取消/确认）
- slots：`default`、`header`、`footer`（作用域 `{ confirm, cancel, loading }`）、可选 `title`
- ESC、蒙层关闭、焦点陷阱与还原

### `HModalLayer`

- 订阅栈；对每条 record 绑定 `HModal`（`:model-value="true"` + record 字段）
- `@confirm` / `@cancel` 仍走 `useModalLayer` 的 `handleConfirm` / `handleCancel`
- 不再自包含一套 dialog DOM/样式；ESC/焦点由内嵌 `HModal` 承担

### 逻辑栈

- 文件与 API 保持不变：`modalState` / `createModal` / `useModalLayer`

## Props / Emits / Slots

### Props

| Prop | 类型 | 默认 | 说明 |
|------|------|------|------|
| `modelValue` | `boolean` | — | 显隐 |
| `title` | `string` | `''` | 默认 header 标题 |
| `type` | `ModalType` | `'info'` | 语义样式 |
| `maskClosable` | `boolean` | `true` | 点蒙层关闭 |
| `closable` | `boolean` | `true` | 显示 × |
| `showConfirm` / `showCancel` | `boolean` | `true` | 默认 footer 按钮 |
| `confirmText` / `cancelText` | `string` | `'确定'` / `'取消'` | 文案 |
| `confirmLoading` | `boolean` | `false` | 确认按钮 loading（受控） |
| `zIndex` | `number` | `1000` | 蒙层层级 |
| `className` / `style` | 同 `ModalRecord` | — | 挂到 dialog |

### Emits

- `update:modelValue`
- `confirm`
- `cancel`
- `close`（任意关闭路径；与 cancel 一并在关闭时触发）

### Slots

- `default` — body
- `header` — 覆盖整块 header
- `footer` — 覆盖整块 footer；作用域 `{ confirm, cancel, loading }`
- `title` — 只换标题节点，保留 ×（若未使用 `header`）

## 交互细节

### ESC 与焦点

- 每个打开的 `HModal` 注册 `keydown`；**仅 zIndex 最大且已打开的实例**响应 ESC
- 打开时记录 `document.activeElement`，聚焦 dialog 内首个可聚焦元素（否则 dialog 自身）；关闭后还原
- Tab 在 dialog 内循环

### 关闭路径

| 动作 | 行为 |
|------|------|
| × / 蒙层（`maskClosable`）/ ESC / 取消按钮 | `emit('cancel')` → `emit('close')` → `update:modelValue=false` |
| 确认按钮 | 仅 `emit('confirm')`，**不自动关闭**；由父组件或 Layer 的 `handleConfirm` 决定何时关 |

### 异步 confirm

- `HModal`：只消费 `confirmLoading`
- Layer：继续用 `loadingMap` 绑定 `:confirm-loading`
- 声明式业务：自行用 `ref` 控制 loading

## 文件规划

```
packages/hhfast-ui/src/components/modal/
├── HModal.vue           # 新增
├── HModalLayer.vue      # 改为薄包装
├── types.ts             # 增加 HModalProps / HModalEmits
├── index.ts             # 导出 HModal
├── readme.md            # 补声明式文档
└── …                    # 栈逻辑不动
```

Playground：`apps/playground/demos/ui/modal/ModalDemo.vue`（或同目录新文件）增加声明式示例。

## 验收标准

- 可 `import { HModal } from '@nnnb/hhfast-ui'`（及包内路径）使用
- `v-model` 开关正常；确认不自动关；取消/蒙层/ESC/× 关闭并触发对应事件
- `header` / `footer` / `default` slot 可覆盖默认 UI
- `HModalLayer` 视觉与交互与重构前等价（含多层栈、异步 confirm loading）
- 声明式弹窗与命令式栈互不入栈、互不抢关（除页面上同时打开时 ESC 走最高 zIndex）
- playground 可演示声明式用法；readme 有简短说明
