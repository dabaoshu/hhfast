import {
  defineComponent,
  CSSProperties,
  PropType,
  onMounted,
  onUnmounted,
  VNodeTypes,
  ref,
  watch,
  computed,
} from "vue";
import type { SetupContext } from "vue";
import { ElTooltipProps, ElTooltip } from "element-plus";
import "./icon.scss";
import { svgLoader } from "../../components/icon/svgFileLoader";
import { resolveIconFontComponent } from "../../components/icon/resolveIconFont";

/**
 * 从打包器解析后的 SVG 资源 URL 推导 `icon-xxx` 类名片段。
 *
 * @param svgUrl - 例如 Vite `import u from './a.svg'` 的 `u`
 */
function svgStemFromSvgUrl(svgUrl: string): string {
  const base = svgUrl.split(/[/\\]/).pop() ?? "svg";
  const stem = base.replace(/\.svg$/i, "");
  const safe = stem.replace(/[^a-zA-Z0-9_]/g, "_");
  return safe.length ? safe : "Svg";
}

/** props 约束 */
const props = {
  /** iconfont symbol 名，或 `svgFile` 模式下的文件名（不含扩展名） */
  type: {
    type: String,
    default: "",
    required: false,
  },
  /** 走 svg 加载器 */
  svgFile: {
    type: Boolean,
    default: false,
    required: false,
  },
  /**
   * 打包器 `import url from '*.svg'` 得到的资源 URL；由 {@link svgLoader} 拉取并内联。
   * 与 `svgFile` + `svgAssetsBase` + `type` 可同时存在：加载顺序优先按 `type` 拼接路径，不满足再回退本字段。
   */
  svgUrl: {
    type: String,
    required: false,
    default: undefined,
  },
  /**
   * iconfont 脚本 URL；不传则不注入远程脚本（需自行在页面注入 symbol 或仅用 svgFile / `svgUrl`）。
   */
  scriptUrl: {
    type: [String, Array] as PropType<string | string[] | undefined>,
    required: false,
    default: undefined,
  },
  /**
   * `svgFile` 为 true 时的 SVG 基础路径（不含文件名）。
   */
  svgAssetsBase: {
    type: String,
    required: false,
    default: undefined,
  },
  class: {
    type: String,
    default: "",
    required: false,
  },
  style: {
    type: [Object, String] as PropType<string | CSSProperties>,
    default: () => ({}),
    required: false,
  },
  visable: {
    type: Boolean,
    default: true,
    required: false,
  },
  disabled: {
    type: Boolean,
    default: false,
    required: false,
  },
  spin: {
    type: Boolean,
    default: false,
    required: false,
  },
  rotate: {
    type: Number,
    default: 0,
    required: false,
  },
  tooltip: {
    type: [Object as unknown as PropType<(typeof ElTooltip)["props"]>, String],
    required: false,
    default: () => "",
  },
  button: {
    type: Boolean,
    default: false,
    required: false,
  },
  WarpClass: {
    type: String,
    required: false,
  },
  active: {
    type: Boolean,
    default: false,
    required: false,
  },
  hover: {
    type: Boolean,
    default: true,
    required: false,
  },
};

/**
 * Icon 组件对外 props 类型（与运行时 props 定义一致）。
 */
export type Iprops = {
  type: string;
  class: string;
  WarpClass?: string;
  visable: boolean;
  svgFile: boolean;
  /** 与 `svgFile` 二选一：静态 import 得到的 `.svg` 资源 URL */
  svgUrl?: string;
  svgAssetsBase?: string;
  button: boolean;
  disabled: boolean;
  spin: boolean;
  style: string | CSSProperties;
  tooltip: string | (typeof ElTooltip)["props"];
  rotate: number;
  active: boolean;
  hover: boolean;
};

/**
 * {@link createIcon} 的入参：预置 iconfont 脚本与 SVG 资源根路径。
 */
export interface CreateHhIconOptions {
  /**
   * iconfont 生成的 `.js` 脚本地址（或自托管 URL）；多库时可传数组。
   */
  scriptUrl?: string | string[];
  /**
   * `svgFile` 为 true 时请求 SVG 的基础路径，实际为 `{svgAssetsBase}/{type}.svg`。
   */
  svgAssetsBase?: string;
}

const WarpDiv: VNodeTypes = ({ onClick }, { attrs, slots }) => {
  return (
    <div {...attrs} onClick={onClick}>
      {slots && slots.default && slots.default()}
    </div>
  );
};

/**
 * 创建已绑定默认 `scriptUrl` 与 `svgAssetsBase` 的 Icon 组件；实例 props 仍可覆盖。
 *
 * @param defaults - 默认脚本与资源根路径
 * @returns 与默认 {@link Icon} 等价的组件
 *
 * @example
 * ```ts
 * const AppIcon = createIcon({
 *   scriptUrl: '//at.alicdn.com/t/font_xxx.js',
 *   svgAssetsBase: 'https://cdn.example.com/icons/svg'
 * });
 * ```
 */
export function createIcon(defaults: CreateHhIconOptions) {
  const IconFontComponent = resolveIconFontComponent(defaults?.scriptUrl ?? []);

  return defineComponent({
    name: "hh-Icon",
    props,
    emits: ["click"],
    setup(props: Iprops, ctx: SetupContext) {
      const demo = ref<string | undefined>();

      const handleClick = (e: MouseEvent) => {
        if (props.disabled) {
          return;
        }
        ctx.emit("click", e);
      };

      const resolvedSvgBase = computed(
        () => props.svgAssetsBase ?? defaults?.svgAssetsBase,
      );
      /** 避免卸载后异步 `svgLoader` 仍写入 `demo`（Vue 3 常见竞态） */
      let loadSeq = 0;
      const loadSvg = async () => {
        const seq = ++loadSeq;
        if (props.svgFile) {
          const base = resolvedSvgBase.value;
          if (base && props.type) {
            const value = await svgLoader({
              svgUrl: `${String(base).replace(/\/$/, "")}/${props.type}.svg`,
            });
            if (seq === loadSeq) {
              demo.value = value;
            }
            return;
          }
        }
        const direct = props.svgUrl?.trim();
        if (direct) {
          const value = await svgLoader({ svgUrl: direct });
          if (seq === loadSeq) {
            demo.value = value;
          }
        }
      };

      onMounted(() => {
        void loadSvg();
      });

      onUnmounted(() => {
        loadSeq += 1;
      });

      watch(
        () =>
          [
            props.type,
            props.svgFile,
            props.svgUrl,
            resolvedSvgBase.value,
          ] as const,
        () => {
          void loadSvg();
        },
      );

      return () => {
        const {
          tooltip,
          visable,
          button,
          svgFile,
          svgUrl,
          active,
          WarpClass: _WarpClass,
          svgAssetsBase: _svgAssetsBase,
          ...rest
        } = props;
        if (!visable) {
          return null;
        }
        let tooltipProps = {} as ElTooltipProps;
        if (typeof tooltip === "string") {
          tooltipProps.content = tooltip;
        } else {
          tooltipProps = tooltip;
        }

        const iconProps =
          button || tooltip ? rest : { ...rest, onClick: handleClick };

        const IconComp = IconFontComponent;
        let vNode = <IconComp {...iconProps} />;
        const useInlineSvg = !!svgUrl?.trim() || !!svgFile;
        if (useInlineSvg) {
          const { class: iconClass, ...iconPropsRest } = iconProps as {
            class?: string;
            [key: string]: unknown;
          };
          const stem =
            svgFile && resolvedSvgBase.value && props.type
              ? props.type
              : svgUrl?.trim()
                ? svgStemFromSvgUrl(svgUrl)
                : props.type;
          vNode = (
            <IconComp
              {...iconPropsRest}
              type={props.type ?? ""}
              class={["svgfile", `icon-${stem}`, iconClass].filter(Boolean)}
              v-html={demo.value}
            ></IconComp>
          );
        }
        const WarpClass = ["hh-icon__wrap"];

        if (button) {
          WarpClass.push("hh-icon-btn");
          if (active) {
            WarpClass.push("hh-icon-btn--active");
          }
        }
        if (tooltip) {
          WarpClass.push("hh-icon-tooltip");
          vNode = <ElTooltip {...tooltipProps}>{vNode}</ElTooltip>;
        }

        if (button || tooltip) {
          if (_WarpClass) {
            WarpClass.push(_WarpClass);
          }
          return (
            <WarpDiv class={WarpClass} onClick={handleClick}>
              {vNode}
            </WarpDiv>
          );
        }

        return vNode;
      };
    },
  });
}

export default createIcon;
