/** Drawer 类型 */
export type {
  DrawerConfirmPayload,
  DrawerContentInput,
  DrawerGlobalDefaults,
  DrawerOpenPayload,
  DrawerPlacement,
  DrawerProps,
  DrawerRecord,
  DrawerShowOptions,
  HDrawerEmits,
} from './types'

/** 单例栈与命令式基础方法 */
export {
  closeAllDrawers,
  closeDrawer,
  drawerList,
  DRAWER_DEFAULTS,
  normalizeDrawerContent,
  openDrawer,
  useDrawer,
} from './drawerState'
export type { UseDrawerReturn } from './drawerState'

/** 渲染层交互 */
export { useDrawerLayer } from './useDrawerLayer'
export type { UseDrawerLayerReturn } from './useDrawerLayer'

/** 命令式 API */
export { createDrawer, drawer } from './createDrawer'
export type { DrawerApi } from './createDrawer'

/** 组件 */
export { default as HDrawer } from './HDrawer.vue'
export { default as HDrawerLayer } from './HDrawerLayer.vue'
