# @nnnb/hhfast-ui

Vue 3 组件库，提供表格、Toast、Modal、Drawer、Tree、Tooltip、Splitter、Popover 等 UI 组件，以及 headless 弹层与任务链可视化能力。

核心工具模块已拆分到 [`@nnnb/hhfast-utils`](../hhfast-utils)，UI 包保留过渡期兼容导出。

## 安装

```bash
pnpm add @nnnb/hhfast-ui @nnnb/hhfast-utils vue
# 或
npm install @nnnb/hhfast-ui @nnnb/hhfast-utils vue
```

## 快速开始

```ts
import { createApp } from 'vue'
import HhfastUi from '@nnnb/hhfast-ui'
import '@nnnb/hhfast-ui/index.css'

const app = createApp(App)
app.use(HhfastUi)
app.mount('#app')
```

## 组件

| 组件 | 说明 |
|------|------|
| `HTable` | 数据表格 |
| `HToast` / `useToast` | 轻提示 |
| `HModal` / `useModal` | 对话框 |
| `HDrawer` | 声明式侧边抽屉 |
| `HTree` | 树形控件 |
| `HTooltip` / `vTooltip` | 文字提示 |
| `HPopover` | 气泡卡片 |
| `Splitter` | 面板分割 |
| `HConfigProvider` | 全局配置 |

## 子路径导出

```ts
import { /* headless APIs */ } from '@nnnb/hhfast-ui/headless'
import { /* Vue composables */ } from '@nnnb/hhfast-ui/vue'
import { /* React hooks */ } from '@nnnb/hhfast-ui/react'
```

## HDrawer 示例

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { HDrawer } from '@nnnb/hhfast-ui'

const open = ref(false)
</script>

<template>
  <button @click="open = true">打开抽屉</button>
  <HDrawer v-model:open="open" title="设置" placement="right">
    <p>抽屉内容</p>
    <template #footer>
      <button @click="open = false">关闭</button>
    </template>
  </HDrawer>
</template>
```

## 开发

```bash
pnpm run build:ui
pnpm run typecheck:ui
```

## License

MIT
