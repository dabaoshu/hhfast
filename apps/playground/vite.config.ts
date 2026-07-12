import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import tailwindcss from "@tailwindcss/vite";
import vitePluginBabel from "vite-plugin-babel";
import { resolve } from "node:path";

/** GitHub Pages 项目站 base，仓库名为 hhfast 时为 /hhfast/ */
const pagesBase = process.env.GITHUB_PAGES === "true" ? "/hhfast/" : "/";

/**
 * Playground 应用模式构建配置。
 */
export default defineConfig({
  base: pagesBase,
  plugins: [
    tailwindcss(),
    vue(),
    vueJsx(),
    vitePluginBabel(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "../../packages/hhfast-ui/src"),
      "@nnnb/hhfast-utils": resolve(
        __dirname,
        "../../packages/hhfast-utils/src/index.ts",
      ),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
});
