<script setup lang="ts">
/**
 * @description Playground 主入口：左侧菜单 + 右侧内容 + 全局 Layer
 */
import { ref } from 'vue'
import { HConfigProvider } from '@/components/config-provider'
import ToastDemo from './demos/toast/ToastDemo.vue'
import ModalDemo from './demos/modal/ModalDemo.vue'
import IconDemo from './demos/icon/IconDemo.vue'
import TableDemo from './demos/table/TableDemo.vue'
import BackgroundTaskManagerDemo from './demos/background-task-manager/BackgroundTaskManagerDemo.vue'
import TaskExecutionChainDemo from './demos/task-execution-chain/TaskExecutionChainDemo.vue'
import TooltipDemo from './demos/tooltip/TooltipDemo.vue'
import SplitterDemo from './demos/splitter/SplitterDemo.vue'
import PopoverDemo from './demos/popover/PopoverDemo.vue'
import ResumableTransferDemo from './demos/resumable-transfer/ResumableTransferDemo.vue'
import JsonToTreeDemo from './demos/json-to-tree/JsonToTreeDemo.vue'
import CurlParserDemo from './demos/curl-parser/CurlParserDemo.vue'
import WorksChainDemo from './demos/worksChain/WorksChainDemo.vue'
import TreeDemo from './demos/tree/TreeDemo.vue'
import DrawerDemo from './demos/drawer/DrawerDemo.vue'

const activeTab = ref<'toast' | 'modal' | 'icon' | 'table' | 'backgroundTaskManager' | 'taskExecutionChain' | 'tooltip' | 'popover' | 'splitter' | 'resumableTransfer' | 'jsonToTree' | 'curlParser' | 'worksChain' | 'tree' | 'drawer'>('worksChain')

const tabs = [
  { key: 'toast', label: 'Toast', comp: ToastDemo },
  { key: 'modal', label: 'Modal', comp: ModalDemo },
  { key: 'icon', label: 'Icon', comp: IconDemo },
  { key: 'table', label: 'Table', comp: TableDemo },
  { key: 'tooltip', label: 'Tooltip', comp: TooltipDemo },
  { key: 'popover', label: 'Popover', comp: PopoverDemo },
  { key: 'splitter', label: 'Splitter', comp: SplitterDemo },
  { key: 'backgroundTaskManager', label: 'TaskManager', comp: BackgroundTaskManagerDemo },
  { key: 'taskExecutionChain', label: 'TaskChain', comp: TaskExecutionChainDemo },
  { key: 'resumableTransfer', label: 'Transfer', comp: ResumableTransferDemo },
  { key: 'jsonToTree', label: 'JsonTree', comp: JsonToTreeDemo },
  { key: 'curlParser', label: 'CurlParser', comp: CurlParserDemo },
  { key: 'worksChain', label: 'WorksChain', comp: WorksChainDemo },
  { key: 'tree', label: 'Tree', comp: TreeDemo },
  { key: 'drawer', label: 'Drawer', comp: DrawerDemo },
] as const
</script>

<template>
  <HConfigProvider>
    <div class="pg-layout">
    <aside class="pg-sidebar">
      <div class="pg-logo">Hhfast UI</div>
      <nav class="pg-nav">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="pg-nav-item"
          :class="{ 'pg-nav-item--active': activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>
    </aside>

    <main class="pg-main">
      <KeepAlive>
        <component :is="tabs.find((t) => t.key === activeTab)?.comp" />
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
  font-size: 16px;
  font-weight: 700;
  color: #1677ff;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #f0f0f0;
}

.pg-nav {
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 2px;
  overflow-y: auto;
  flex: 1;
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
