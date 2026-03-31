import type { App, Plugin } from 'vue'
import { HTable } from './components/table'
import './styles/tailwind.css'

export {
  toast,
  createToast,
  useToast,
} from './components/toast'

export {
  modal,
  createModal,
  useModal,
  useModalLayer,
  openModal,
  closeModal,
  closeAllModals,
  modalList,
  MODAL_DEFAULTS,
  normalizeModalContent,
} from './components/modal'

export {
  HTable,
  useTableState,
  normalizeTagList,
} from './components/table'

export {
  BackgroundTaskManager,
} from './core/background-task-manager'

export {
  TaskExecutionChain,
} from './core/task-execution-chain'

export type {
  ToastApi,
  ToastType,
  ToastPlacement,
  ToastRecord,
  ToastShowOptions,
  ToastGlobalDefaults,
  UseToastReturn,
  PushToastPayload,
} from './components/toast'

export type {
  ModalApi,
  ModalRecord,
  ModalShowOptions,
  ModalOpenPayload,
  ModalConfirmPayload,
  ModalContentInput,
  ModalType,
  ModalGlobalDefaults,
  UseModalReturn,
  UseModalLayerReturn,
} from './components/modal'

export type {
  TableAlign,
  TableCellRenderContext,
  TableChangeEvent,
  TableChangeExtra,
  TableColumn,
  TableDataIndex,
  TableFilterItem,
  TableFilterState,
  TablePaginationConfig,
  TableProps,
  TableRowKey,
  TableRowSelection,
  TableScrollConfig,
  TableSortOrder,
  TableSorterResult,
  TableValueType,
} from './components/table'

export type {
  BackgroundTask,
  BackgroundTaskManagerPlugin,
  BackgroundTaskManagerEventName,
  BackgroundTaskManagerListener,
  BackgroundTaskManagerOptions,
  BackgroundTaskStatus,
  EnqueueTaskOptions,
  TaskExecuteContext,
  TaskExecutor,
} from './core/background-task-manager'

export type {
  AddTaskExecutionNodeOptions,
  CompleteTaskExecutionNodeOptions,
  ConnectTaskExecutionNodeOptions,
  FailTaskExecutionNodeOptions,
  TaskExecutionEdge,
  TaskExecutionMermaidOptions,
  TaskExecutionNode,
  TaskExecutionNodeStatus,
  TaskExecutionRenderResult,
} from './core/task-execution-chain'

/**
 * 全量注册：目前提供可注册组件 `HTable`。
 */
export const HhfastUi: Plugin = {
  install(app: App) {
    app.component('HTable', HTable)
  },
}

export default HhfastUi
