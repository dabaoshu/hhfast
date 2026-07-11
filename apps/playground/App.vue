<script setup lang="ts">
/**
 * @description Playground 主入口：左侧分组菜单 + 右侧内容 + 全局 Layer
 */
import { ref } from 'vue'
import { HConfigProvider } from '@/components/config-provider'
import ToastDemo from './demos/ui/toast/ToastDemo.vue'
import ModalDemo from './demos/ui/modal/ModalDemo.vue'
import IconDemo from './demos/ui/icon/IconDemo.vue'
import TableDemo from './demos/ui/table/TableDemo.vue'
import TooltipDemo from './demos/ui/tooltip/TooltipDemo.vue'
import SplitterDemo from './demos/ui/splitter/SplitterDemo.vue'
import PopoverDemo from './demos/ui/popover/PopoverDemo.vue'
import TreeDemo from './demos/ui/tree/TreeDemo.vue'
import DrawerDemo from './demos/ui/drawer/DrawerDemo.vue'
import BackgroundTaskManagerDemo from './demos/utils/background-task-manager/BackgroundTaskManagerDemo.vue'
import TaskExecutionChainDemo from './demos/utils/task-execution-chain/TaskExecutionChainDemo.vue'
import ResumableTransferDemo from './demos/utils/resumable-transfer/ResumableTransferDemo.vue'
import JsonToTreeDemo from './demos/utils/json-to-tree/JsonToTreeDemo.vue'
import CurlParserDemo from './demos/utils/curl-parser/CurlParserDemo.vue'
import WorksChainDemo from './demos/utils/worksChain/WorksChainDemo.vue'

const demoGroups = [
  {
    key: 'ui',
    label: 'hhfast-ui',
    tabs: [
      { key: 'toast', label: 'Toast', comp: ToastDemo },
      { key: 'modal', label: 'Modal', comp: ModalDemo },
      { key: 'icon', label: 'Icon', comp: IconDemo },
      { key: 'table', label: 'Table', comp: TableDemo },
      { key: 'tooltip', label: 'Tooltip', comp: TooltipDemo },
      { key: 'popover', label: 'Popover', comp: PopoverDemo },
      { key: 'splitter', label: 'Splitter', comp: SplitterDemo },
      { key: 'tree', label: 'Tree', comp: TreeDemo },
      { key: 'drawer', label: 'Drawer', comp: DrawerDemo },
    ],
  },
  {
    key: 'utils',
    label: 'hhfast-utils',
    tabs: [
      { key: 'backgroundTaskManager', label: 'TaskManager', comp: BackgroundTaskManagerDemo },
      { key: 'taskExecutionChain', label: 'TaskChain', comp: TaskExecutionChainDemo },
      { key: 'resumableTransfer', label: 'Transfer', comp: ResumableTransferDemo },
      { key: 'jsonToTree', label: 'JsonTree', comp: JsonToTreeDemo },
      { key: 'curlParser', label: 'CurlParser', comp: CurlParserDemo },
      { key: 'worksChain', label: 'WorksChain', comp: WorksChainDemo },
    ],
  },
] as const

type DemoTabKey = (typeof demoGroups)[number]['tabs'][number]['key']

const activeTab = ref<DemoTabKey>('worksChain')

const allTabs = demoGroups.flatMap((group) => group.tabs)

const activeDemo = () => allTabs.find((tab) => tab.key === activeTab.value)?.comp
</script>

<template>
  <HConfigProvider>
    <div class="pg-layout">
      <aside class="pg-sidebar">
        <div class="pg-logo">Hhfast Playground</div>
        <nav class="pg-nav">
          <section
            v-for="group in demoGroups"
            :key="group.key"
            class="pg-nav-group"
          >
            <div class="pg-nav-group-title">{{ group.label }}</div>
            <button
              v-for="tab in group.tabs"
              :key="tab.key"
              type="button"
              class="pg-nav-item"
              :class="{ 'pg-nav-item--active': activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </section>
        </nav>
      </aside>

      <main class="pg-main">
        <KeepAlive>
          <component :is="activeDemo()" />
        </KeepAlive>
      </main>
    </div>
  </HConfigProvider>
</template>

<style>
@import './styles/common.css';
</style>

<style scoped>
.pg-layout {
  display: flex;
  min-height: 100vh;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: #1f1f1f;
}

/* ---- Sidebar ---- */
.pg-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 200px;
  height: 100vh;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.pg-logo {
  padding: 20px 20px 16px;
  font-size: 15px;
  font-weight: 700;
  color: #1677ff;
  letter-spacing: 0.3px;
  border-bottom: 1px solid #f0f0f0;
}

.pg-nav {
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 12px;
  overflow-y: auto;
  flex: 1;
}

.pg-nav-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pg-nav-group-title {
  padding: 4px 12px 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: #999;
}

.pg-nav-item {
  display: block;
  width: 100%;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #555;
  cursor: pointer;
  transition: all 0.15s;
}

.pg-nav-item:hover {
  background: #f5f7fa;
  color: #1677ff;
}

.pg-nav-item--active {
  background: #e8f0fe;
  color: #1677ff;
  font-weight: 600;
}

/* ---- Main ---- */
.pg-main {
  margin-left: 200px;
  flex: 1;
  padding: 32px 36px 64px;
  max-width: 1200px;
}
</style>
