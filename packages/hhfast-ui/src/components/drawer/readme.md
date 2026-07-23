# Drawer 子模块

维护 **声明式 `HDrawer`**、**全局抽屉栈**、**命令式 API**（`drawer` / `createDrawer`）以及内置渲染层 **`HDrawerLayer`**。

- **声明式**：`<HDrawer v-model:open="open" />`，不入全局栈。
- **命令式**：根上挂 `<HDrawerLayer />`（或使用 `HConfigProvider`），再调用 `drawer.open` / `drawer.confirm`。

## 声明式

```vue
<HDrawer v-model:open="open" placement="right" title="详情">
  <p>内容</p>
  <template #footer>
    <button @click="open = false">关闭</button>
  </template>
</HDrawer>
```

内置确认/取消按钮默认关闭（`showConfirm` / `showCancel` 默认 `false`）；需要时显式打开，或继续用 `#footer`。

## 命令式

```ts
import { drawer, createDrawer } from '@nnnb/hhfast-ui'

drawer.open({
  title: '侧栏',
  placement: 'left',
  content: () => h('p', 'Hello'),
  showConfirm: false,
})

await drawer.confirm({
  title: '确认提交？',
  placement: 'right',
})
```

每条记录可独立配置 `placement` / `width` / `height`。默认 `zIndexBase` 为 `1100`（与 Modal 错开）。

## 目录

| 文件 | 说明 |
|------|------|
| `HDrawer.vue` | 声明式壳 |
| `HDrawerLayer.vue` | 栈渲染层 |
| `drawerState.ts` | 栈与 `useDrawer` |
| `createDrawer.ts` | `drawer` / `createDrawer` |
| `useDrawerLayer.ts` | Layer 交互 |
| `hDrawerRegistry.ts` | 顶层 ESC |
