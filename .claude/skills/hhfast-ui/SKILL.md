---
name: hhfast-ui
description: |
  在 Vue 3 业务项目中集成 @nnnb/hhfast-ui：安装与插件注册、按需引入、Toast/Modal 渲染层、Tailwind 与样式、HTable/Tooltip/Splitter/Popover 用法。
  触发场景：Vue3 工程引入 hhfast-ui、@nnnb/hhfast-ui、全局注册 HhfastUi、toast/modal 命令式弹层、useToast/useModalLayer、TaskExecutionChain、BackgroundTaskManager、ResumableTransfer。
---

# hhfast-ui 集成 Skill

本 skill 面向**使用方**在 Vue 3 项目中接入 [@nnnb/hhfast-ui](https://www.npmjs.com/package/@nnnb/hhfast-ui)（或本地路径包）。库内开发与目录规范请使用 **hhfast-dev** skill。

## 安装

```bash
pnpm add @nnnb/hhfast-ui vue@^3.4
```

对等依赖仅 **Vue ^3.4**；库源码不依赖 Element Plus。

## 全量注册（插件）

```ts
import { createApp } from 'vue'
import HhfastUi from '@nnnb/hhfast-ui'
import App from './App.vue'

createApp(App).use(HhfastUi).mount('#app')
```

插件注册全局名：`HTable`、`HTooltip`、`HSplitter`、`HSplitterPanel`、`HPopover`，指令 `v-tooltip`。

## 按需导出（与仓库 `src/index.ts` 对齐）

集成时从 `@nnnb/hhfast-ui` 按名导入即可；以下为公开面摘要（类型用 `export type` 从同包导入）。

**Toast：** 主包 `toast`、`createToast`、`useToast`；Headless 子路径 `@nnnb/hhfast-ui/headless`；React `@nnnb/hhfast-ui/react` 的 `useToastListSnapshot`。源码：`toastStore.ts`、`toast.vueState.ts`、`toast.vueUse.ts`。类型如 `ToastApi`、`UseToastReturn` 等。

**Modal：** 主包 `modal`、`createModal`、`useModal`、`useModalLayer`、`openModal`、`modalList` 等；Headless 子路径栈 API；React `useModalStackSnapshot`。源码：`modalStore.ts`、`modal.vueState.ts`、`modal.vueUse.ts`。

**Table：** `HTable`、`useTableState`、`normalizeTagList`；类型如 `TableProps`、`TableColumn` 等。

**Tooltip：** `HTooltip`、`vTooltip`；类型如 `TooltipProps`、`TooltipDirectiveValue` 等。

**Splitter：** `Splitter`、`SplitterPanel`；类型如 `SplitterProps`、`SplitterPanelProps` 等。

**Popover：** `HPopover`；类型如 `PopoverProps` 等。

**Background task：** `BackgroundTaskManager`、`TaskScheduler`、`TaskHistoryStore`、`TaskHistoryManager`、`createTaskSnapshotStore`、`createTaskPersistenceAdapter`、`createTaskHistoryStore`、`createTaskStorage`、`createTaskPersistencePlugin`、`restorePendingFromPersistence`、`restorePendingFromSnapshots`、`IndexedDBAdapter`、`readJson`、`writeJson`、`getWebStorage` 及对应 `export type`。

**Task execution chain：** `ChainDiffer`、`TraceAll`、`TaskExecutionChain`、`TaskExecutionStackTracer`、`TraceCall`、`TraceEnter`、`TraceStep`、`TraceVar`、`createTraceVariable`、`createStackTracer`、`getLastTraceResult`、`getTraceStepMetadata`、`runTracedFlow` 及对应 `export type`。

**Resumable transfer：** `ResumableTransfer`、`LocalStorageTransferStore`、`createLocalStorageTransferStore` 及对应 `export type`。

**默认导出：** `HhfastUi` 插件；`export default HhfastUi`。

**未从主包导出：** `icon`、`utils` 等不在公开 API 内，集成不要依赖。

## Toast / Modal：必须挂载渲染层

`toast` / `modal` 只管理状态与队列，**不提供**固定 UI。在根组件（如 `App.vue`）用 `Teleport` 挂载一层：

- Toast：`useToast()` → `toastList`、`closeToast`，自绘列表（参考仓库 `playground/demos/toast/DemoToastLayer.tsx`）。
- Modal：`useModalLayer()` → `modalList`、`handleConfirm`、`handleCancel` 等（参考 `playground/demos/modal/DemoModalLayer.vue`）。

## 典型片段

**插件 + 表格：**

```vue
<script setup lang="ts">
// 已 app.use(HhfastUi) 时模板中可直接写 <HTable ... />
</script>
```

**命令式 Toast（需已挂载 Toast Layer）：**

```ts
import { toast } from '@nnnb/hhfast-ui'
toast.show({ message: '已保存', type: 'success' })
```

**命令式 Modal（需已挂载 Modal Layer）：**

```ts
import { openModal } from '@nnnb/hhfast-ui'
openModal({ title: '确认', content: '是否删除？' })
```

## 样式与 Tailwind

包入口会侧载库内 `tailwind.css`（含 `@import "tailwindcss"` 与库内工具类）。业务侧若大量使用 Tailwind 类名，请配置 `@tailwindcss/vite` 并扫描业务源码；详见仓库 `docs/integration.md`。

## 完整 API 与类型

- 克隆 hhfast 仓库后执行 `pnpm run docs:api`，查看 **`docs/api/index.html`**（TypeDoc）与 **`docs/api.json`**（机器可读）。
- 人类可读集成说明：**`docs/integration.md`**、**`docs/modules-overview.md`**。

生成文档与 `src/index.ts` 不一致时，以 **`src/index.ts`** 与 **`dist/index.d.ts`** 为准。
