# Toast 子模块

本目录提供 **全局队列、定时器、命令式 API**、**`useToast`** 以及内置渲染层 **`HToastLayer`**。

- **开箱即用**：在根组件挂载 `<HToastLayer />` 即可获得默认 Toast UI。
- **自定义 UI**：也可不使用 `HToastLayer`，通过 `useToast()` 订阅队列后自行渲染。

## 从入口导入

```ts
import {
  toast,
  createToast,
  useToast,
  type ToastApi,
  type ToastShowOptions,
  type UseToastReturn,
} from '@/components/toast';
```

（路径按项目 `alias` 调整；从包根导入时使用 `@nnnb/hhfast-ui` 等实际包名。）

---

## 业务侧如何接 UI（推荐流程）

1. 在根或布局组件中调用 **`useToast()`**，取得只读 **`toastList`** 与 **`closeToast`** 等。
2. 使用 **`Teleport to="body"`**（或业务指定容器），按 `toastList` 渲染列表；可按 `item.placement` 分区域布局（`top` / `top-right` / `bottom`）。
3. 任意位置继续通过 **`toast.success(...)`** 等命令式弹出；与视图层共用同一队列。
4. 需要悬停暂停时：在自绘节点上监听 `mouseenter` / `mouseleave`，调用 **`pauseToastTimer(id)`** / **`resumeToastTimer(id, item.duration)`**（与 `pauseOnHover` 选项配合）。

---

## `useToast()`（组合式 API）

- **返回**：`toastList`（只读）、`defaults`（`TOAST_DEFAULTS`）、`pushToast`、`closeToast`、`clearToasts`、`pauseToastTimer`、`resumeToastTimer`。
- **用途**：订阅队列以渲染 UI；与 `toast` / `createToast` 操作的是 **同一单例状态**。

```vue
<script setup lang="ts">
import { useToast } from '@/components/toast';

const { toastList, closeToast } = useToast();
</script>

<template>
  <Teleport to="body">
    <div v-for="t in toastList" :key="t.id" @click="closeToast(t.id)">
      {{ t.message }}
    </div>
  </Teleport>
</template>
```

---

## `toast`（默认单例）

- **方法**：`show(options)`（须含 `message`）、`success` / `info` / `warning` / `error`、`close(id)`、`clear()`。
- **选项**：`type`、`duration`、`placement`、`maxCount`、`pauseOnHover`、`icon`（`VNode`）、`className`、`style` 等（`className` / `style` 供业务根节点绑定样式用，库内不渲染 DOM）。
- **返回**：`string | undefined`（无 `document` 时如 SSR 为 `undefined` 且不入队）。

---

## `createToast(defaults?)`

与默认 `toast` **共享同一队列**，仅合并不同的默认 `defaults`。

---

## 默认值与行为摘要

| 项 | 默认 |
|----|------|
| `duration` | `3000`（ms）；`0` 表示不自动关闭 |
| `placement` | `'top'` |
| `maxCount` | `5`；超出时移除最旧再入队 |
| `pauseOnHover` | `false`；为 `true` 时需在自绘 UI 上自行调 `pauseToastTimer` / `resumeToastTimer`（或由业务封装） |

---

## 目录内文件

| 文件 | 说明 |
|------|------|
| `types.ts` | 类型定义 |
| `toastState.ts` | 单例队列、定时器、`pushToast` / `closeToast` / `clearToasts`、`useToast` |
| `createToast.ts` | `createToast` 与默认 `toast` |
| `HToastLayer.tsx` | 内置渲染层组件 |
| `toast-layer.scss` | 内置渲染层样式 |
| `index.ts` | 对外导出 |

---

## 与 icon 子模块

Toast **不依赖** `icon`；`icon` 字段为可选 `VNode`，由业务用 `h(MyIcon, …)` 等方式传入并在自绘层渲染。
