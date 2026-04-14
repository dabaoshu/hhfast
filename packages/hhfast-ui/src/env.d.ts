/// <reference types="vite/client" />
/// <reference types="vue/jsx" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module '*.scss' {}

/** Vite 默认：`import url from './x.svg'` 为资源 URL 字符串 */
declare module '*.svg' {
  const src: string;
  export default src;
}
