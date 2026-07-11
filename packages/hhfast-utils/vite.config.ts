import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "node:path";

const srcDir = resolve(__dirname, "src");

/** subpath 入口，与 package.json exports 对齐 */
const subpathEntries = {
  index: resolve(srcDir, "index.ts"),
  "core/background-task-manager/index": resolve(
    srcDir,
    "core/background-task-manager/index.ts",
  ),
  "core/task-execution-chain/index": resolve(
    srcDir,
    "core/task-execution-chain/index.ts",
  ),
  "core/resumable-transfer/index": resolve(
    srcDir,
    "core/resumable-transfer/index.ts",
  ),
  "core/json-to-tree/index": resolve(srcDir, "core/json-to-tree/index.ts"),
  "core/curl-to-request/index": resolve(
    srcDir,
    "core/curl-to-request/index.ts",
  ),
} as const;

/**
 * Utils 包构建配置：preserveModules 保留 src 目录结构，支持 subpath 按需导入。
 */
export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ["src/**/*.ts"],
      outDir: "dist",
      staticImport: true,
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: subpathEntries,
      formats: ["es"],
    },
    rollupOptions: {
      output: {
        preserveModules: true,
        preserveModulesRoot: srcDir,
        entryFileNames: "[name].js",
      },
    },
    sourcemap: true,
    target: "es2020",
  },
});
