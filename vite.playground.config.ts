import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

/**
 * 本地开发与组件演示：应用模式（非 lib），根目录为 `playground/`。
 * `@` 与库源码一致，指向 `src/`，便于直接调试包内模块。
 */
export default defineConfig({
  root: resolve(__dirname, 'playground'),
  plugins: [tailwindcss(), vue(), vueJsx()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  /** 避免与库模式 `vite build` 的 `dist/` 冲突 */
  build: {
    outDir: resolve(__dirname, 'dist-playground'),
    emptyOutDir: true,
  },
})
