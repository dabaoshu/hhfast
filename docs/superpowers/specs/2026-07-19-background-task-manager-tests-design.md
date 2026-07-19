# BackgroundTaskManager 首批测试设计

## 背景

`@nnnb/hhfast-utils` 当前提供构建与类型检查脚本，但没有自动化测试基础设施。Graphify 分析显示 `BackgroundTaskManager` 是仓库中连接度最高的核心抽象，因此先为它建立回归测试，可以为后续拆分调度、持久化和生命周期职责提供安全网。

## 目标

- 在 `packages/hhfast-utils` 中建立可独立运行的 Vitest 测试环境。
- 为 `BackgroundTaskManager` 的关键公开行为建立首批回归测试。
- 在根工作区提供统一的 Utils 测试命令。
- 保持现有生产 API、构建入口和发布产物不变。

## 非目标

- 本轮不覆盖 `TaskExecutionChain`、`ResumableTransfer` 或 UI 组件。
- 本轮不重构 `BackgroundTaskManager` 的内部实现。
- 本轮不测试私有方法或为了测试增加生产代码入口。
- 本轮不引入浏览器或 DOM 测试环境。

## 方案

### 测试位置

测试统一放在 `packages/hhfast-utils/tests/`，与 `src/` 分离。测试直接导入 `src/core/background-task-manager` 的公开入口。

这种布局不会让测试文件进入当前 `tsconfig.json` 的 `src/**/*.ts` 编译范围，也不会被 Vite 的声明文件插件写入发布产物。

### 测试运行器

在 `@nnnb/hhfast-utils` 的开发依赖中加入 Vitest，并增加：

- `test`：单次运行全部测试，适合 CI。
- `test:watch`：监听测试，适合本地开发。

根 `package.json` 增加：

- `test`：递归执行 packages 下的测试脚本。
- `test:utils`：只运行 `@nnnb/hhfast-utils` 测试。

测试环境使用 Node，不引入 jsdom。

## 首批行为覆盖

### 成功执行

注册真实异步执行器，使用固定任务 ID 入队。等待管理器进入空闲状态后，断言任务状态为 `succeeded`、结果被保存、尝试次数正确。

### 进度更新

执行器通过 `setProgress()` 报告进度和消息。断言公开任务快照反映最终进度，并验证任务更新事件可观察到相应变化。

### 并发限制

配置 `concurrency`，让多个执行器通过受控 Promise 暂停。记录同时运行数量，断言峰值不超过配置值，并在逐个释放后确认全部完成。

### 自动重试

执行器前若干次抛出错误，最后一次成功；配置零延迟重试策略。断言调用次数、任务尝试次数和最终成功结果符合 `maxRetries` 语义。

### 取消运行中任务

执行器监听 `AbortSignal`。任务开始后调用 `cancel(id)`，断言信号被中止、任务最终状态为 `cancelled`，且取消不会被记录为成功。

## 异步测试策略

- 优先使用事件订阅和受控 Promise 等待明确状态，不使用任意时长的 `setTimeout`。
- 重试测试通过注入 `retryDelay: () => 0` 消除真实等待。
- 仅在确实验证计时器调度时使用 Vitest 假时钟；首批测试不依赖系统时间精度。
- 每个测试创建独立管理器，避免全局状态和测试间污染。

## 错误处理

- 测试辅助等待器必须带明确超时，超时时输出目标状态和当前任务快照。
- 如果测试暴露现有生产缺陷，保留能稳定复现的失败测试，不在同一步中扩大重构范围。
- 测试不得断言私有字段、内部队列形状或自动生成 ID 的具体格式。

## 验收标准

- 五类关键行为均由独立、可重复的测试覆盖。
- `pnpm test:utils` 成功。
- `pnpm typecheck:utils` 成功。
- `pnpm build:utils` 成功。
- `packages/hhfast-utils/dist` 不包含测试文件。
- 不修改 `BackgroundTaskManager` 的公共 API。

## 后续方向

首批测试稳定后，再分别设计 `TaskExecutionChain`、`ResumableTransfer` 的测试，并以测试结果为依据拆分 `BackgroundTaskManager` 的调度、事件和持久化职责。
