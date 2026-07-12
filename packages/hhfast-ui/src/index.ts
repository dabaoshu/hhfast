import type { App, Plugin } from "vue";
import { HTable } from "./components/table";
export * from "./components/popover";
import { HTooltip, vTooltip } from "./components/tooltip";
import { Splitter, SplitterPanel } from "./components/splitter";
import { HConfigProvider } from "./components/config-provider";
import { HDrawer } from "./components/drawer";
import { HTree } from "./components/tree";
import "./styles/tailwind.css";

export { toast, createToast, useToast, HToastLayer } from "./components/toast";

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
  HModalLayer,
} from "./components/modal";

export { HTable, useTableState, normalizeTagList } from "./components/table";

export { HTooltip, vTooltip } from "./components/tooltip";

export { Splitter, SplitterPanel } from "./components/splitter";

export { HDrawer } from "./components/drawer";

export {
  HConfigProvider,
  useHhConfig,
  HH_CONFIG_KEY,
} from "./components/config-provider";

export { HTree } from "./components/tree";

export type {
  ToastApi,
  ToastType,
  ToastPlacement,
  ToastRecord,
  ToastShowOptions,
  ToastGlobalDefaults,
  UseToastReturn,
  PushToastPayload,
} from "./components/toast";

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
} from "./components/modal";

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
} from "./components/table";

export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipProps,
  TooltipDirectiveValue,
  TooltipDirectiveOptions,
} from "./components/tooltip";

export type {
  SplitterOrientation,
  SplitterSize,
  SplitterCollapsible,
  SplitterProps,
  SplitterEmits,
  SplitterPanelProps,
} from "./components/splitter";

export type { DrawerPlacement, DrawerProps } from "./components/drawer";

export type {
  HConfigProviderProps,
  HhConfig,
} from "./components/config-provider";

export type {
  TreeDataMode,
  TreeEmits,
  TreeLeafSlotProps,
  TreeNode,
  TreeNonLeafSlotProps,
  TreeProps,
  TreeRawNode,
  TreeSlots,
} from "./components/tree";

/**
 * 全量注册：提供可注册组件与指令。
 */
export const HhfastUi: Plugin = {
  install(app: App) {
    app.component("HTable", HTable);
    app.component("HTooltip", HTooltip);
    app.component("HSplitter", Splitter);
    app.component("HSplitterPanel", SplitterPanel);
    app.component("HConfigProvider", HConfigProvider);
    app.component("HTree", HTree);
    app.directive("tooltip", vTooltip);
  },
};

export default HhfastUi;
