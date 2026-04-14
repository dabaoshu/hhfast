import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "node:path";

/**
 * Utils 包构建配置，输出纯 TypeScript 工具与核心模块。
 */
export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ["src/**/*.ts"],
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: ["vue", "react"],
    },
    sourcemap: true,
  },
});
