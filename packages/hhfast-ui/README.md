# @nnnb/hhfast-ui

[中文](#中文) | [English](#english)
在线地址：[https://dabaoshu.github.io/hhfast/](https://dabaoshu.github.io/hhfast/)
## 中文

`@nnnb/hhfast-ui` 是 hhfast 的 Vue 3 UI 组件包，包含 Table、Toast、Modal、Drawer、Tree、Tooltip、Popover、Splitter、ConfigProvider，以及 Toast/Modal 的 Vue 与 headless 状态入口。

任务执行链、后台任务管理、断点续传、JSON 树转换、cURL 解析等核心工具已经拆分到 `@nnnb/hhfast-utils`。

### 安装

```bash
pnpm add @nnnb/hhfast-ui @nnnb/hhfast-utils vue
# 或
npm install @nnnb/hhfast-ui @nnnb/hhfast-utils vue
```

`vue` 是 peer dependency。`react` 是可选 peer，目前 `@nnnb/hhfast-ui/react` 仅预留给后续适配器。

### 快速开始

```ts
import { createApp } from 'vue'
import HhfastUi from '@nnnb/hhfast-ui'
import '@nnnb/hhfast-ui/index.css'

const app = createApp(App)
app.use(HhfastUi)
app.mount('#app')
```

插件会全局注册 `HTable`、`HTooltip`、`HPopover`、`HSplitter`、`HSplitterPanel`、`HConfigProvider`、`HDrawer`、`HTree` 和 `v-tooltip` 指令。

也可以按需引入：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { HDrawer, HPopover, Splitter, SplitterPanel } from '@nnnb/hhfast-ui'

const open = ref(false)
</script>

<template>
  <button @click="open = true">打开抽屉</button>
  <HDrawer v-model:open="open" title="设置">
    抽屉内容
  </HDrawer>

  <HPopover content="Popover 内容">
    <button>悬停查看</button>
  </HPopover>

  <Splitter style="height: 240px">
    <SplitterPanel>左侧</SplitterPanel>
    <SplitterPanel>右侧</SplitterPanel>
  </Splitter>
</template>
```

### 组件

| API | 说明 |
| --- | --- |
| `HTable` | 支持排序、选择、分页、自定义渲染的数据表格。 |
| `toast`、`createToast`、`useToast`、`HToastLayer` | Toast 命令式 API 与 Vue 渲染层。 |
| `modal`、`createModal`、`useModal`、`useModalLayer`、`HModalLayer` | Modal 命令式 API 与 Vue 渲染层。 |
| `HDrawer` | 带焦点管理和键盘关闭能力的可访问抽屉。 |
| `HTree` | 树形数据展示组件。 |
| `HTooltip`、`vTooltip` | Tooltip 组件与指令。 |
| `HPopover` | 带触发状态和 ARIA 关联的气泡卡片。 |
| `Splitter`、`SplitterPanel` | 可键盘调整尺寸的分隔面板。 |
| `HConfigProvider`、`useHhConfig` | 全局组件配置。 |

### 子路径入口

```ts
// Vue 组件包与插件
import HhfastUi, { HTable, HDrawer, toast, modal } from '@nnnb/hhfast-ui'

// Toast/Modal 的 headless 状态，不依赖 Vue 运行时
import { pushToast, toastList, openModal, modalList } from '@nnnb/hhfast-ui/headless'

// Vue 主包别名
import { useToast, useModalLayer } from '@nnnb/hhfast-ui/vue'

// React 适配器预留入口，目前无运行时 API
import '@nnnb/hhfast-ui/react'

// 样式
import '@nnnb/hhfast-ui/index.css'
```

### 可访问性说明

`HModalLayer` 和 `HDrawer` 提供 dialog 语义、Esc 关闭、焦点进入、焦点陷阱与焦点恢复。`Splitter` 暴露 separator 角色并支持键盘调整。`HPopover` 会关联触发器和浮层状态的 ARIA 属性。

### Playground

交互示例位于 `apps/playground`，GitHub Pages 目标地址：

https://nnnb.github.io/hhfast/

本地开发：

```bash
pnpm dev
pnpm test:playground
```

### 开发与发布前检查

```bash
pnpm build:ui
pnpm typecheck:ui
pnpm test:ui
```

发布前在仓库根目录运行完整检查：

```bash
pnpm release:check
```

## English

`@nnnb/hhfast-ui` is the Vue 3 UI package for hhfast. It includes Table, Toast, Modal, Drawer, Tree, Tooltip, Popover, Splitter, ConfigProvider, and Vue/headless entry points for Toast and Modal state.

Core utilities such as task execution chains, background task management, resumable transfer, JSON tree conversion and cURL parsing live in `@nnnb/hhfast-utils`.

### Install

```bash
pnpm add @nnnb/hhfast-ui @nnnb/hhfast-utils vue
# or
npm install @nnnb/hhfast-ui @nnnb/hhfast-utils vue
```

`vue` is a peer dependency. `react` is optional and `@nnnb/hhfast-ui/react` is currently reserved for future adapters.

### Usage

```ts
import { createApp } from 'vue'
import HhfastUi from '@nnnb/hhfast-ui'
import '@nnnb/hhfast-ui/index.css'

const app = createApp(App)
app.use(HhfastUi)
app.mount('#app')
```

The plugin globally registers `HTable`, `HTooltip`, `HPopover`, `HSplitter`, `HSplitterPanel`, `HConfigProvider`, `HDrawer`, `HTree`, and the `v-tooltip` directive.

You can also import components on demand:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { HDrawer, HPopover, Splitter, SplitterPanel } from '@nnnb/hhfast-ui'

const open = ref(false)
</script>

<template>
  <button @click="open = true">Open drawer</button>
  <HDrawer v-model:open="open" title="Settings">
    Drawer content
  </HDrawer>

  <HPopover content="Popover content">
    <button>Hover me</button>
  </HPopover>

  <Splitter style="height: 240px">
    <SplitterPanel>Left</SplitterPanel>
    <SplitterPanel>Right</SplitterPanel>
  </Splitter>
</template>
```

### Components

| API | Description |
| --- | --- |
| `HTable` | Data table with sorting, selection, pagination and custom rendering. |
| `toast`, `createToast`, `useToast`, `HToastLayer` | Command API and Vue layer for toast messages. |
| `modal`, `createModal`, `useModal`, `useModalLayer`, `HModalLayer` | Command API and Vue layer for modal dialogs. |
| `HDrawer` | Accessible drawer with focus management and keyboard close support. |
| `HTree` | Tree component for nested data. |
| `HTooltip`, `vTooltip` | Tooltip component and directive. |
| `HPopover` | Popover card with trigger state and ARIA attributes. |
| `Splitter`, `SplitterPanel` | Resizable panel layout with keyboard resizing. |
| `HConfigProvider`, `useHhConfig` | Global component configuration. |

### Entry Points

```ts
// Vue package and plugin
import HhfastUi, { HTable, HDrawer, toast, modal } from '@nnnb/hhfast-ui'

// Headless toast/modal stores, no Vue runtime needed
import { pushToast, toastList, openModal, modalList } from '@nnnb/hhfast-ui/headless'

// Vue alias for the main package
import { useToast, useModalLayer } from '@nnnb/hhfast-ui/vue'

// Reserved for future React adapters; currently exports no runtime API
import '@nnnb/hhfast-ui/react'

// Styles
import '@nnnb/hhfast-ui/index.css'
```

### Accessibility Notes

`HModalLayer` and `HDrawer` expose dialog semantics, Escape closing, focus entry, focus trap and focus restoration. `Splitter` exposes separator roles and keyboard resizing. `HPopover` connects trigger and panel state with ARIA attributes.

### Playground

The interactive Playground is built from `apps/playground` and is intended for GitHub Pages at:

https://nnnb.github.io/hhfast/

Local development:

```bash
pnpm dev
pnpm test:playground
```

### Development And Release Check

```bash
pnpm build:ui
pnpm typecheck:ui
pnpm test:ui
```

Before publishing, run the workspace release gate from the repository root:

```bash
pnpm release:check
```

## License

MIT
