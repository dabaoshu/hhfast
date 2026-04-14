# Icon 子模块说明

本目录提供 **iconfont 解析**、**远程 SVG 文本加载** 与 **静态 SVG 资源组件工厂**，供业务侧封装完整图标组件（例如项目中的 `MyIcon`）或单独使用工具函数。

## 从入口导入

```ts
import {
  resolveIconFontComponent,
  svgLoader,
  createSvgIcon,
  type SvgAssetIconProps
} from '@/components/icon';
```

（路径按项目 `alias` 调整。）

---

## `resolveIconFontComponent(scriptUrl?)`

- **作用**：按 `scriptUrl` **缓存** `IconFont` 函数组件；相同配置在应用内只向页面插入一次 iconfont 脚本。
- **参数**：`scriptUrl` 为 iconfont 生成的 `.js` 地址，或字符串数组（多库）；不传或空表示不拉远程脚本（需页面已注入 symbol 或仅用本地 SVG）。
- **返回**：可用于 JSX/渲染函数的 Vue 函数组件，与内部 `IconFont.tsx` 行为一致。

---

## `svgLoader({ svgUrl })`

- **作用**：对给定 URL **发起 `fetch`**，将响应正文作为 SVG 字符串返回；带 **内存缓存** 与简单的并发去重（与 `svgFileLoader.tsx` 实现一致）。
- **参数**：`svgUrl: string`（完整可请求的地址，含 Vite 打包后的资源 URL）。
- **返回**：`Promise<string | undefined>`；无效或异常路径可能得到 `undefined`。
- **注意**：适合在 **客户端** `onMounted` 等时机调用；若需 SSR，请自行保证仅在浏览器环境执行。

---

## `createSvgIcon(svgUrl)`

- **作用**：用打包器得到的 **单个 SVG 资源 URL** 生成一个 **小型图标组件**，内部通过 `svgLoader` 拉取 SVG 并以 `v-html` 内联，样式类与业务 `MyIcon` 的 SVG 模式对齐。
- **参数**：`svgUrl` — 例如 Vite：`import iconUrl from './close.svg'` 的 `iconUrl`（默认导出为 URL 字符串）。
- **事件**：`emits: ['click']`；`disabled` 为 `true` 时不触发 `click`。
- **Props**：见类型 `SvgAssetIconProps`（`class`、`style`、`visable`、`disabled`、`spin`、`rotate` 等）。

### 示例

```ts
import closeUrl from './assets/close.svg';
import { createSvgIcon } from '@/components/icon';

export const CloseIcon = createSvgIcon(closeUrl);
```

```vue
<template>
  <CloseIcon class="my-icon" @click="onClose" />
</template>
```

---

## 目录内文件（实现参考）

| 文件 | 说明 |
|------|------|
| `resolveIconFont.ts` | `scriptUrl` → 缓存的 IconFont 组件 |
| `svgFileLoader.tsx` | `svgLoader` 实现 |
| `IconFont.tsx` | iconfont 脚本注入与 `<svg>` 渲染（底层） |
| `createSvgIcon.tsx` | `createSvgIcon` 工厂 |

---

## 与完整业务组件的关系

若项目中另有 **封装好的图标组件**（例如带 Tooltip、按钮态、`svgFile` / `svgUrl` / `createIcon` 等），通常放在业务目录（如 `view/myicon`）；本 readme 仅描述 **`@/components/icon` 当前导出的工具与 `createSvgIcon`**。使用完整 API 时请以对应组件源码为准。
