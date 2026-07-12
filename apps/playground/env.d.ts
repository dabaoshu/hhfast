/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 断点续传 demo 的上传 API 根地址（Render 等） */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
