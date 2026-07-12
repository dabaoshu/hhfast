import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

/** 侧边栏 demo 分组配置 */
export const demoGroups = [
  {
    key: 'ui',
    label: 'hhfast-ui',
    basePath: '/ui',
    demos: [
      {
        path: 'toast',
        name: 'ui-toast',
        label: 'Toast',
        component: () => import('../demos/ui/toast/ToastDemo.vue'),
      },
      {
        path: 'modal',
        name: 'ui-modal',
        label: 'Modal',
        component: () => import('../demos/ui/modal/ModalDemo.vue'),
      },
      {
        path: 'icon',
        name: 'ui-icon',
        label: 'Icon',
        component: () => import('../demos/ui/icon/IconDemo.vue'),
      },
      {
        path: 'table',
        name: 'ui-table',
        label: 'Table',
        component: () => import('../demos/ui/table/TableDemo.vue'),
      },
      {
        path: 'tooltip',
        name: 'ui-tooltip',
        label: 'Tooltip',
        component: () => import('../demos/ui/tooltip/TooltipDemo.vue'),
      },
      {
        path: 'popover',
        name: 'ui-popover',
        label: 'Popover',
        component: () => import('../demos/ui/popover/PopoverDemo.vue'),
      },
      {
        path: 'splitter',
        name: 'ui-splitter',
        label: 'Splitter',
        component: () => import('../demos/ui/splitter/SplitterDemo.vue'),
      },
      {
        path: 'tree',
        name: 'ui-tree',
        label: 'Tree',
        component: () => import('../demos/ui/tree/TreeDemo.vue'),
      },
      {
        path: 'drawer',
        name: 'ui-drawer',
        label: 'Drawer',
        component: () => import('../demos/ui/drawer/DrawerDemo.vue'),
      },
    ],
  },
  {
    key: 'utils',
    label: 'hhfast-utils',
    basePath: '/utils',
    demos: [
      {
        path: 'background-task-manager',
        name: 'utils-background-task-manager',
        label: 'TaskManager',
        component: () => import('../demos/utils/background-task-manager/BackgroundTaskManagerDemo.vue'),
      },
      {
        path: 'task-execution-chain',
        name: 'utils-task-execution-chain',
        label: 'TaskChain',
        component: () => import('../demos/utils/task-execution-chain/TaskExecutionChainDemo.vue'),
      },
      {
        path: 'resumable-transfer',
        name: 'utils-resumable-transfer',
        label: 'Transfer',
        component: () => import('../demos/utils/resumable-transfer/ResumableTransferDemo.vue'),
      },
      {
        path: 'json-to-tree',
        name: 'utils-json-to-tree',
        label: 'JsonTree',
        component: () => import('../demos/utils/json-to-tree/JsonToTreeDemo.vue'),
      },
      {
        path: 'curl-parser',
        name: 'utils-curl-parser',
        label: 'CurlParser',
        component: () => import('../demos/utils/curl-parser/CurlParserDemo.vue'),
      },
      {
        path: 'works-chain',
        name: 'utils-works-chain',
        label: 'WorksChain',
        component: () => import('../demos/utils/worksChain/WorksChainDemo.vue'),
      },
    ],
  },
] as const

const demoRoutes: RouteRecordRaw[] = demoGroups.flatMap((group) =>
  group.demos.map((demo) => ({
    path: `${group.basePath}/${demo.path}`,
    name: demo.name,
    component: demo.component,
  })),
)

/** Playground 路由表 */
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/utils/works-chain' },
    ...demoRoutes,
    { path: '/:pathMatch(.*)*', redirect: '/utils/works-chain' },
  ],
})

/**
 * 生成分组内 demo 的完整路由路径。
 */
export function demoRoutePath(basePath: string, demoPath: string): string {
  return `${basePath}/${demoPath}`
}
