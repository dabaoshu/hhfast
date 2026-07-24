# hhfast-ui 0.1.2 Changelog 设计

## 目标

为 `@nnnb/hhfast-ui` 新增面向使用者的版本更新记录，仅记录当前 `0.1.2` 版本，不回溯整理旧版本。

## 文件与格式

- 新增 `packages/hhfast-ui/CHANGELOG.md`。
- 采用 Keep a Changelog 风格，以版本号和发布日期为版本标题。
- 按“新增”“优化”“修复”分类；仅保留实际有内容的分类。
- 根据 `0.1.2` 相关提交整理用户可感知的变化，不直接复制 Git 提交信息。

## 发布包集成

在 `packages/hhfast-ui/package.json` 的 `files` 中加入 `CHANGELOG.md`，确保 npm 包包含版本记录。保留用户已经完成的 `0.1.2` 版本号修改，不改动其他包版本。

## 范围

本次仅新增和接入 changelog，不修改组件逻辑、导出或 playground。由于没有新增运行时功能或功能目录，无需补充 demo。

## 验证

- 检查 changelog 的版本号与 `package.json` 一致。
- 检查 Markdown 结构和中文表述。
- 运行 UI 包的 pack 文件清单检查，确认发布产物包含 `CHANGELOG.md`；若现有发布脚本成本过高，则至少执行 `pnpm --filter @nnnb/hhfast-ui pack --dry-run` 或等价检查。
- 执行 `graphify update .` 更新知识图谱。
