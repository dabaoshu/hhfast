/// <reference types="vue/jsx" />
import { FunctionalComponent, PropType, HTMLAttributes } from "vue";
import "./icon.scss";
const svgBaseProps = {
  width: "1em",
  height: "1em",
  fill: "currentColor",
  "aria-hidden": "true",
  focusable: "false",
} as const;
export interface IconFontProps extends HTMLAttributes {
  spin?: boolean;
  rotate?: number;
  type: string;
  disabled?: boolean;
}

const customCache = new Set<string>();

/** 与 {@link create} 工厂入参一致，供类型收窄与二次封装。 */
export interface CustomIconOptions {
  scriptUrl?: string | string[];
  extraCommonProps?: { [key: string]: any };
}

interface IconFontType extends FunctionalComponent<IconFontProps> {
  displayName: string;
}

function isValidCustomScriptUrl(scriptUrl: string): boolean {
  return (typeof scriptUrl === "string" &&
    scriptUrl.length &&
    !customCache.has(scriptUrl)) as boolean;
}

function createScriptUrlElements(
  scriptUrls: string[],
  index: number = 0,
): void {
  const currentScriptUrl = scriptUrls[index];
  if (isValidCustomScriptUrl(currentScriptUrl)) {
    const script = document.createElement("script");
    script.setAttribute("src", currentScriptUrl);
    script.setAttribute("data-namespace", currentScriptUrl);
    if (scriptUrls.length > index + 1) {
      script.onload = () => {
        createScriptUrlElements(scriptUrls, index + 1);
      };
      script.onerror = () => {
        createScriptUrlElements(scriptUrls, index + 1);
      };
    }
    customCache.add(currentScriptUrl);
    document.body.appendChild(script);
  }
}
const injectIconfont = (extraCommonProps: Record<string, unknown>) => {
  const Iconfont: IconFontType = (props, context) => {
    const { attrs, slots } = context;
    const {
      type,
      class: className,
      onClick,
      rotate,
      spin,
      viewBox,
      disabled,
      ...restProps
    } = { ...props, ...attrs } as any;
    const children = slots.default && slots.default();
    let content = null;
    if (type) {
      content = <use xlinkHref={`#${type}`} />;
    }
    if (children && children.length) {
      content = children;
    }
    const iconProps = {
      ...extraCommonProps,
      ...restProps,
    };

    const svgStyle = rotate
      ? {
          msTransform: `rotate(${rotate}deg)`,
          transform: `rotate(${rotate}deg)`,
        }
      : undefined;

    const svgClassString = {
      "hh-icon--spin": !!spin,
    };

    const iconClass = {
      "hh-icon": true,
      "hh-icon--disabled": !!disabled,
    };
    // console.log(svgClassString);

    const innerSvgProps = {
      ...svgBaseProps,
      viewBox,
      class: svgClassString,
      style: svgStyle,
    };
    return (
      <span
        role="img"
        {...iconProps}
        onClick={onClick}
        class={[iconClass, className]}
      >
        <svg {...innerSvgProps} viewBox={viewBox}>
          {content}
        </svg>
      </span>
    );
  };

  Iconfont.props = {
    spin: Boolean as PropType<boolean>,
    disabled: Boolean as PropType<boolean>,
    rotate: Number as PropType<number>,
    type: String as PropType<string>,
  };
  Iconfont.inheritAttrs = false;
  Iconfont.displayName = "Iconfont";
  return Iconfont;
};

export default function create(
  options: CustomIconOptions = {},
): FunctionalComponent<IconFontProps> {
  const { scriptUrl, extraCommonProps = {} } = options;
  if (
    typeof document !== "undefined" &&
    typeof window !== "undefined" &&
    typeof document.createElement === "function" &&
    scriptUrl
  ) {
    if (Array.isArray(scriptUrl)) {
      if (scriptUrl.length > 0) {
        // iconfont 会把 svg 插到前部，后加载覆盖同名 type；数组按倒序插入以保证覆盖顺序
        createScriptUrlElements([...scriptUrl].reverse());
      }
    } else if (typeof scriptUrl === "string" && scriptUrl.length > 0) {
      createScriptUrlElements([scriptUrl]);
    }
  }

  return injectIconfont(extraCommonProps);
}
