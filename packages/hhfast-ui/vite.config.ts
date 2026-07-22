import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import tailwindcss from "@tailwindcss/vite";
import dts from "vite-plugin-dts";
import { resolve } from "node:path";

/**
 * UI 包构建配置，输出 Vue 入口与子路径入口的 ESM 产物。
 */
export default defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
    vueJsx(),
    dts({
      insertTypesEntry: true,
      include: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"],
      exclude: ["src/env.d.ts"],
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        vue: resolve(__dirname, "src/vue.ts"),
        headless: resolve(__dirname, "src/headless.ts"),
        react: resolve(__dirname, "src/react.ts"),
      },
      formats: ["es"],
      cssFileName: "index",
    },
    rollupOptions: {
      external: ["vue", "react", "@nnnb/hhfast-utils"],
    },
    sourcemap: true,
  },
});
