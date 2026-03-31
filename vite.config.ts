import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import tailwindcss from '@tailwindcss/vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'node:path'

/**
 * Vite 库模式：产出 ESM + 类型声明，Vue 由使用方提供（external）。
 * `vueJsx`：支持 `.tsx` 与 Vue JSX（与现有 `icon` 等 TSX 模块一致）。
 */
export default defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
    vueJsx(),
    dts({
      insertTypesEntry: true,
      include: ['src/index.ts', 'src/**/*.ts', 'src/**/*.tsx', 'src/**/*.vue'],
      exclude: ['src/env.d.ts'],
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'HhfastUi',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue',
        },
      },
    },
    sourcemap: true,
  },
})
