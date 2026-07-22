# UI、Playground 与 npm 发布就绪设计

## 目标

在保持 `@nnnb/hhfast-ui` 与 `@nnnb/hhfast-utils` 两个 npm 包及现有子路径兼容的前提下，完成首个正式 `0.1.0` 版本的 UI 可访问性、Playground 响应式体验、自动化测试和本地手动发布门禁。

## 范围与约束

- 不拆出更多 npm 包；保留 UI 的 `.`, `./headless`, `./vue`, `./react`, `./index.css` 与 Utils 的现有功能子路径。
- 两个包版本统一设为 `0.1.0`。
- 发布仍由维护者本地手动执行，不增加 GitHub Actions、Changesets 或自动 `npm publish`。
- 先发布 `@nnnb/hhfast-utils`，再发布依赖它的 `@nnnb/hhfast-ui`。
- 保留工作区内已有的用户改动，尤其不覆盖 `TableView.tsx`。

## UI 改进

### 插件注册

`HhfastUi.install()` 应注册所有适合模板全局使用的组件：现有组件之外补充 `HDrawer` 与 `HPopover`。命令式 Toast/Modal 渲染层保持显式挂载，避免插件安装产生 DOM 副作用。

### Modal 与 Drawer

- 容器使用 `role="dialog"`、`aria-modal="true"`，标题通过稳定 ID 与 `aria-labelledby` 关联。
- 关闭按钮提供可读的 `aria-label`。
- 打开后将焦点移入弹层；关闭后恢复至打开前元素。
- Esc 关闭当前弹层；Modal 仅关闭栈顶项，Drawer 遵循 `closable`。
- 在弹层内部处理 Tab/Shift+Tab 循环，避免键盘焦点落到遮罩后的页面。
- Drawer 的横向宽度与纵向高度受视口约束，窄屏不产生横向溢出。

### Splitter

- 可拖动分隔条增加 `role="separator"`、`tabindex="0"`、方向和当前值 ARIA。
- 水平分隔条响应 Left/Right，垂直分隔条响应 Up/Down；普通步长 1%，按 Shift 时为 10%。
- 键盘调整复用鼠标拖动的 min/max 约束，并发出一致的 resize 事件。

### Popover

- 弹层生成稳定 ID；触发区域暴露 `aria-controls` 与 `aria-expanded`。
- 弹层使用 `role="dialog"`，因为其内容可交互且语义比 tooltip 更丰富。
- 不改变 hover、focus、click、manual 的现有行为。

## Playground 体验

- 桌面端保留固定侧栏。
- 小于 768px 时显示顶部栏和菜单按钮，侧栏变为可开合抽屉；路由切换后自动关闭。
- 主内容区在移动端取消左边距、缩小 padding，并确保 `min-width: 0`。
- 390px 视口下 `document.documentElement.scrollWidth <= innerWidth`。
- 所有既有 demo 路由与导航标签保持不变。

## 测试分层

### UI 组件测试

使用 Vitest、Vue Test Utils 与 happy-dom，覆盖：

- 插件安装注册 `HDrawer`、`HPopover` 和既有组件/指令。
- Modal/Drawer 的对话框语义、Esc、焦点进入、Tab 循环与焦点恢复。
- Splitter 键盘调整及 ARIA。
- Popover 的展开状态和弹层关联。

测试断言行为与语义，不采用大面积 DOM 快照。

### Playground E2E

使用 Playwright Chromium：

- 从 `demoGroups` 推导所有路由并逐个冒烟，验证页面存在主内容且无控制台 error。
- 覆盖 Toast、Modal、Drawer 的一次关键交互。
- 以 390x844 视口验证移动菜单可开合、路由切换可用、页面无横向溢出。

### 包消费测试

发布门禁先构建并 `pnpm pack` 两个包，再在临时 fixture 中安装 tarball：

- 导入两个根入口和全部公开子路径。
- TypeScript 类型检查成功。
- Vite 生产构建成功，并能解析 UI CSS。
- 检查 tarball 文件清单，不包含源码缓存、测试或工作区私有文件。

## 发布流程

根脚本提供统一只读门禁，顺序为：组件/Utils 测试、类型检查、包构建、Playground 构建、Playground E2E、tarball 消费验证。发布脚本保留显式的 utils/UI 两步，不自动执行登录或发布。

正式发布前维护者手动运行：

1. `npm whoami`
2. `npm view @nnnb/hhfast-utils version` 与 `npm view @nnnb/hhfast-ui version`
3. 完整发布门禁
4. `pnpm publish:utils`
5. 确认 registry 可见后运行 `pnpm publish:ui`

## 完成标准

- UI 单测、Utils 单测、类型检查、两个包构建、Playground 构建和 Chromium E2E 全部通过。
- 390px 页面无横向溢出。
- 两个 tarball 可在干净 fixture 中安装、导入、类型检查和构建。
- package metadata 与文档明确 `0.1.0`、公开访问和手动发布顺序。
- 不执行真实 `npm publish`；最终 tarball 与命令交给维护者本地发布。
