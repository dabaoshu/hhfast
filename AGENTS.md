# hhfast-ui 开发规范

@nnnb/hhfast-ui 是一个 Vue 3 组件库，包含 UI 组件和核心功能模块。

## 技术栈

- **框架**: Vue 3.4+ (Composition API, `<script setup>`)
- **语言**: TypeScript 5
- **样式**: Tailwind CSS 4
- **构建**: Vite 6
- **组件库**: Element Plus 2

## 项目结构

```
src/
├── components/           # UI 组件
│   ├── table/           # HTable
│   ├── toast/           # Toast 提示
│   ├── modal/           # Modal 对话框
│   └── icon/            # 图标
├── core/                 # 核心模块
│   ├── background-task-manager/   # 后台任务管理
│   └── task-execution-chain/     # 任务执行链可视化
├── utils/                # 工具函数
└── index.ts             # 主入口（Vue 主包）；另有 headless.ts、react.ts 构建入口
```

含 headless 状态的组件目录（Toast/Modal 已示范）：

- **`*Store.ts`**：无框架运行时（队列/栈、订阅）。
- **`*.vueState.ts`**：Vue 响应式桥接（`shallowRef` + subscribe）及仅 Vue 需要的命令（如 `openModal` + `normalizeModalContent`）。
- **`*.vueUse.ts`**：Vue 组合式 API（`useToast`、`useModal`、`useModalLayer`）。
- **`*.reactUse.ts`**：React `useSyncExternalStore` 等适配。
- **`*.vue`**：Vue 单文件组件。

## 代码规范

### 组件开发

1. **文件命名**: 组件目录和文件使用小写字母加驼峰
   - 目录: `components/table/`
   - 文件: `TableView.tsx`, `useTableState.ts`

2. **组件命名**: 使用 `H` 前缀
   - `HTable`, `HToast`, `HModal`

3. **类型定义**: 放在组件目录的 `types.ts` 中或组件文件顶部

4. **导出规范**:
   - 组件: `export { HTable }`
   - Hooks: `export { useTableState }`
   - 类型: `export type { TableProps }`

### TypeScript

- 使用 `interface` 定义对象类型
- 使用 `type` 定义联合/交叉类型
- 避免使用 `any`，用 `unknown` 代替
- 使用可选链 `?.` 和空值合并 `??`

### Vue 3

- 使用 `<script setup lang="ts">`
- Props 使用 `defineProps<T>()` 泛式定义
- Emits 使用 `defineEmits<T>()` 泛式定义
- `defineOptions({ name: 'Hxxx' })` 定义组件名

## 模块规范

### Core 模块

- 放置在 `src/core/` 目录
- 每个模块有独立子目录
- 模块入口文件统一在 `core/index.ts` 导出
- 包含完整类型定义和 README

### 工具函数

- 放置在 `src/utils/` 目录
- 在 `utils/index.ts` 统一导出
- 纯函数，无副作用

### Headless 与多框架文件

- 单例状态放在组件目录的 **`*Store.ts`**（无 Vue/React 运行时）。
- **`*.vueState.ts` / `*.vueUse.ts` / `*.reactUse.ts`** 按框架拆分；`index.ts` 分组导出 headless 与各适配层。
- 发布子路径：`@nnnb/hhfast-ui/headless`、`@nnnb/hhfast-ui/react`（见 `package.json` `exports`）。

## 构建命令

```bash
npm run dev    # 启动 playground 开发
npm run build  # 构建发布版本
```

## 导出检查

修改组件或模块后，确保在以下文件中正确导出：

1. `src/components/index.ts` - 组件汇总导出
2. `src/core/index.ts` - 核心模块汇总导出
3. `src/index.ts` - 主入口（从以上文件再次导出）

类型导出使用 `export type { ... }`

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
