import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

/**
 * Playground 应用模式构建配置。
 */
export default defineConfig({
  plugins: [tailwindcss(), vue(), vueJsx()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "../../packages/hhfast-ui/src"),
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
