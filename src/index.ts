import type { App, Plugin } from 'vue'
import { HTable } from './components/table'
import { HTooltip, vTooltip } from './components/tooltip'
import { Splitter, SplitterPanel } from './components/splitter'
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
  HTooltip,
  vTooltip,
} from './components/tooltip'

export {
  Splitter,
  SplitterPanel,
} from './components/splitter'

export {
  BackgroundTaskManager,
  TaskScheduler,
  TaskHistoryStore,
  TaskHistoryManager,
  createTaskSnapshotStore,
  createTaskPersistenceAdapter,
  createTaskHistoryStore,
  createTaskStorage,
  createTaskPersistencePlugin,
  restorePendingFromPersistence,
  restorePendingFromSnapshots,
  IndexedDBAdapter,
  readJson,
  writeJson,
  getWebStorage,
} from './core/background-task-manager'

export {
  ChainDiffer,
  TraceAll,
  TaskExecutionChain,
  TaskExecutionStackTracer,
  TraceCall,
  TraceEnter,
  TraceStep,
  TraceVar,
  createTraceVariable,
  createStackTracer,
  getLastTraceResult,
  getTraceStepMetadata,
  runTracedFlow,
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
  TooltipPlacement,
  TooltipTrigger,
  TooltipProps,
  TooltipDirectiveValue,
  TooltipDirectiveOptions,
} from './components/tooltip'

export type {
  SplitterOrientation,
  SplitterSize,
  SplitterCollapsible,
  SplitterProps,
  SplitterEmits,
  SplitterPanelProps,
} from './components/splitter'

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
  TaskStorageBackend,
  TaskSnapshotStoreOptions,
  TaskHistoryStoreOptions,
  TaskStorageBundleOptions,
  TaskSnapshotStore,
  TaskHistoryEntry,
  TaskHistoryStats,
  TaskHistoryQuery,
  TaskPersistenceAdapter,
  TaskPersistenceOptions,
  StorageBackend,
  TaskHistoryOptions,
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
  RunTracedFlowOptions,
  TraceStepMetadata,
  TraceStepOptions,
  TracedFlowExecuteResult,
  TracedFlowRunContext,
  StackTraceExecuteOptions,
  StackTraceRunContext,
  StackTraceStepOptions,
  TraceAllOptions,
  TraceCallOptions,
  TraceEnterExecuteResult,
  TraceEnterOptions,
  TraceVarOptions,
  TracedVariable,
  ChainDiffResult,
  ChainDifferOptions,
  EdgeDiff,
  NodeDiff,
} from './core/task-execution-chain'

/**
 * 全量注册：目前提供可注册组件 `HTable`。
 */
export const HhfastUi: Plugin = {
  install(app: App) {
    app.component('HTable', HTable)
    app.component('HTooltip', HTooltip)
    app.component('HSplitter', Splitter)
    app.component('HSplitterPanel', SplitterPanel)
    app.directive('tooltip', vTooltip)
  },
}

export default HhfastUi
