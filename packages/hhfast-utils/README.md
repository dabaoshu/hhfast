# @nnnb/hhfast-utils

hhfast 的无框架工具与核心模块集合，可在 Vue、React 或 Node 环境中独立使用。

## 安装

```bash
pnpm add @nnnb/hhfast-utils
# 或
npm install @nnnb/hhfast-utils
```

## 模块

| 子路径 | 说明 |
|--------|------|
| `@nnnb/hhfast-utils` | 通用工具函数 |
| `@nnnb/hhfast-utils/background-task-manager` | 后台任务管理 |
| `@nnnb/hhfast-utils/task-execution-chain` | 任务执行链追踪 |
| `@nnnb/hhfast-utils/resumable-transfer` | 断点续传 |
| `@nnnb/hhfast-utils/json-to-tree` | JSON 转树结构 |
| `@nnnb/hhfast-utils/curl-to-request` | cURL 命令解析 |

## 示例

```ts
import { jsonToTree } from '@nnnb/hhfast-utils/json-to-tree'
import { parseCurlCommand } from '@nnnb/hhfast-utils/curl-to-request'

const tree = jsonToTree({ name: 'hhfast', version: 1 })
const request = parseCurlCommand("curl -X GET https://api.example.com")
```

## 开发

```bash
pnpm run build:utils
pnpm run typecheck:utils
```

## License

MIT
