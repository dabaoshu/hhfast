---
name: hhfast-demo-sync
description: |
  hhfast 项目中“功能新增后自动补 demo”的执行技能。只要用户提到 packages/hhfast-ui 或 packages/hhfast-utils 新增功能、新建文件夹、补 playground 示例、同步 playground-backend 接口、维护 demo 导航，就应立即使用本技能。尤其在新增 components/*、core/*、utils/* 目录后，必须自动检查并更新 apps/playground 或 apps/playground-backend 的对应演示。
---

# hhfast demo 同步 Skill

用于在 `hhfast` 仓库中保证“新增功能 = 可演示”。  
核心原则：`packages/hhfast-ui` / `packages/hhfast-utils` 出现新功能目录后，必须在 `apps/playground` 或 `apps/playground-backend` 中至少提供一个可运行 demo（必要时前后端都更新）。

## 何时触发

遇到以下请求时，直接触发：

- 新增了 `packages/hhfast-ui/src/components/*` 目录
- 新增了 `packages/hhfast-ui/src/core/*` 目录
- 新增了 `packages/hhfast-utils/src/core/*` 或 `packages/hhfast-utils/src/utils/*` 目录
- 用户说“补 demo / 补示例 / 在 playground 里加入口 / 联调 playground-backend”
- 用户没有明确提 demo，但任务是“新增功能”或“新模块落地”

## 执行目标

1. 自动识别新增功能目录。  
2. 自动选择 demo 目标位置（`playground`、`playground-backend` 或两者）。  
3. 自动补齐 demo 文件与导航接入。  
4. 自动做最小可运行验证（至少能编译、能在菜单看到入口、能触发核心功能）。

## 目录映射规则

### 1) UI 组件类（优先 `apps/playground`）

来源：

- `packages/hhfast-ui/src/components/<feature>/`

目标：

- 新建 `apps/playground/demos/<feature-kebab>/`
- 主演示文件命名：`<FeaturePascal>Demo.vue`（如 `TableDemo.vue`）
- 若有渲染层（如 toast/modal），可新增辅助文件（`.vue` 或 `.tsx`）

同时必须更新：

- `apps/playground/App.vue`：导入 demo、注册 `tabs`、补齐 `activeTab` 联合类型

### 2) 工具/算法/状态管理类（优先 `apps/playground`）

来源：

- `packages/hhfast-utils/src/core/<feature>/`
- `packages/hhfast-utils/src/utils/<feature-or-file>`

目标：

- 默认在 `apps/playground/demos/<feature-kebab>/` 提供可视化 demo
- 如果需要 Node 环境、文件系统、服务端上下文，改为走 `playground-backend` 并在前端用 demo 页面调用接口

### 3) 仅后端可运行能力（优先 `apps/playground-backend`）

来源特征：

- 依赖 Node 原生能力（文件、路径、进程、服务端持久化）
- 不能在浏览器直接运行

目标：

- 更新 `apps/playground-backend/server.mjs` 增加对应接口
- 在 `apps/playground/demos/<feature-kebab>/` 增加前端演示页面，请求 backend 并展示结果
- 如无前端展示价值，至少补一个最小调用页，能触发接口并展示返回

## 标准落地步骤

1. 扫描本次改动，定位“新增功能目录”。  
2. 依据映射规则决定 demo 去向。  
3. 创建 demo 目录与主文件（遵循当前仓库命名风格）。  
4. 接入 `apps/playground/App.vue`（import + tab + 默认激活项策略）。  
5. 如涉及后端，补 `apps/playground-backend/server.mjs` 接口。  
6. 确保导出链路完整（包内 `index.ts`、主入口 `src/index.ts`）。  
7. 运行最小验证并修复明显问题。

## Demo 最小验收标准

- 菜单里能看到新 demo 入口
- 点击后组件/功能能实际运行，不是空壳页面
- 至少覆盖 1 个核心成功路径（必要时再加 1 个异常路径展示）
- 若依赖 backend，请求成功并有可读结果输出
- 页面文案说明“这个 demo 在验证什么”

## 输出要求

完成任务后，按以下结构汇报：

1. 识别到的新增功能目录列表  
2. 每个目录映射到的 demo 位置（playground / backend / both）  
3. 实际新增或修改的文件路径  
4. 运行验证结果（命令 + 关键结论）  
5. 若未能自动补 demo，说明阻塞原因与下一步

## 约束

- 不要只创建空 demo；必须有可交互逻辑或最小执行链路
- 不要遗漏 `App.vue` 的 demo 注册
- 优先复用现有 demo 结构与样式，不引入无关框架
- 包管理默认使用 `pnpm`

