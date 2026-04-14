---
name: hhfast-dev
description: |
  hhfast-ui Vue3 组件库开发助手。当用户提到以下场景时触发：
  - 创建新组件（Table、Toast、Modal 等模式的新组件）
  - 添加组件功能、修改现有组件
  - 遵循项目代码规范（导出、类型、文件组织）
  - 构建组件 demo 或 playground 示例
  - 任务执行链（TaskExecutionChain）和后台任务管理（BackgroundTaskManager）的开发
  - 任何关于 @nnnb/hhfast-ui 组件库的开发工作
---

# hhfast-dev Skill

本 skill 辅助 hhfast-ui Vue3 组件库的开发工作。

## 项目结构

```
src/
├── components/           # UI 组件
│   ├── table/
│   ├── toast/
│   ├── modal/
│   └── icon/
├── core/                  # 核心模块
│   ├── background-task-manager/   # 后台任务管理
│   └── task-execution-chain/     # 任务执行链可视化
├── utils/                 # 工具函数
└── index.ts              # 主入口
```

## 组件开发规范

### 1. 新组件模板

每个组件应包含以下文件：

```
components/<name>/
├── index.ts              # 导出组件和类型
├── <name>.vue            # 组件实现
├── <name>State.ts        # 响应式状态（可选）
├── <name>Types.ts        # TypeScript 类型定义
├── create<Name>.ts       # 组合式函数创建逻辑（可选）
└── use<Name>.ts          # 组合式函数 hooks（可选）
```

### 2. 组件结构示例

**index.ts 必须导出：**
```ts
// 组件
export { <Name> } from './<name>'

// 组合式函数
export { use<Name> } from './use<Name>'
```

**组件文件模板 (ComponentName.vue):**
```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ComponentNameProps, ComponentNameEmits } from './types'

defineOptions({
  name: 'H<Name>',
  inheritAttrs: false,
})

const props = defineProps<ComponentNameProps>()
const emit = defineEmits<ComponentNameEmits>()

// 组件逻辑
</script>

<template>
  <div class="h-<name>">
    <!-- 组件内容 -->
  </div>
</template>
```

### 3. 类型定义规范

```ts
// Props 类型
export interface <Name>Props {
  // 使用 TypeScript 精确类型，避免使用 any
}

// Emits 类型
export interface <Name>Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', value: unknown): void
}

// 组合式函数返回类型
export interface Use<Name>Return {
  // 清晰定义每个返回字段的类型
}
```

### 4. 导出规范

**src/components/index.ts** 汇总导出：
```ts
export { HTable } from './table'
export { toast, createToast, useToast } from './toast'
// ...其他组件
```

**src/index.ts** 主入口：
- 从 components/ 导出组件
- 从 core/ 导出核心模块
- 从 utils/ 导出工具函数
- 统一使用 `export type` 导出类型

```ts
// 组件
export { HTable } from './components/table'

// Core 模块
export { BackgroundTaskManager } from './core/background-task-manager'
export { TaskExecutionChain } from './core/task-execution-chain'

// 类型导出
export type { TableProps } from './components/table'
export type { BackgroundTask } from './core/background-task-manager'
```

## Core 模块开发规范

### Task Execution Chain

位置：`src/core/task-execution-chain/`

**文件组织：**
- `taskExecutionChain.ts` - 主实现
- `taskExecutionChain.types.ts` - 链节点、边、渲染结果类型
- `taskExecutionChain.flow-types.ts` - TraceStep 和 runTracedFlow 类型
- `taskExecutionStackTracer.ts` - 栈追踪器实现
- `taskExecutionStackTracer.types.ts` - 栈追踪器类型
- `chainDiffer.ts` - 链路比较器
- `index.ts` - 统一导出

### Background Task Manager

位置：`src/core/background-task-manager/`

**文件组织：**
- `backgroundTaskManager.ts` - 主管理器
- `taskScheduler.ts` - 任务调度器
- `storage/` - 存储适配器
  - `taskHistoryStore.ts` - 历史记录存储
  - `taskSnapshotStore.ts` - 快照存储
  - `jsonKeyValueStorage.ts` - JSON 键值存储
  - `persistencePlugin.ts` - 持久化插件

## 代码风格规范

### TypeScript

1. **类型定义**：
   - 使用 `interface` 定义对象类型
   - 使用 `type` 定义联合类型、交叉类型
   - 避免使用 `any`，使用 `unknown` 代替

2. **导出**：
   - 组件和函数：`export { name }`
   - 类型：`export type { TypeName }`

3. **空值处理**：
   - 使用 `undefined` 而非 `null`
   - 使用可选链 `?.` 和空值合并 `??`

### Vue 3

1. **组合式 API**：
   - 使用 `<script setup lang="ts">`
   - 使用 `defineProps` 和 `defineEmits`

2. **响应式**：
   - 优先使用 `ref` 和 `reactive`
   - 使用 `computed` 处理派生状态

3. **指令**：
   - 避免不必要的 `v-if`
   - 使用 `v-for` 时添加 `key`

## 常用命令

```bash
# 开发
npm run dev          # 启动 playground

# 构建
npm run build        # 构建发布版本
```

## 开发检查清单

新增组件时确保：
- [ ] 组件文件放在正确目录
- [ ] Props 和 Emits 类型定义完整
- [ ] 在 `components/index.ts` 中导出
- [ ] 在 `src/index.ts` 中导出（组件 + 类型）
- [ ] 如有工具函数，在 `utils/index.ts` 导出
- [ ] 添加 playground demo（可选）

新增 Core 模块时确保：
- [ ] 模块放在 `src/core/` 目录
- [ ] 类型定义在单独文件或文件顶部
- [ ] 在 `core/index.ts` 中导出
- [ ] 在 `src/index.ts` 中导出（实现 + 类型）
- [ ] 编写完整 README 文档
