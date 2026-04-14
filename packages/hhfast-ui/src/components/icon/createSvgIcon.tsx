import {
  defineComponent,
  PropType,
  ref,
  onMounted,
  watch,
  CSSProperties
} from 'vue';
import { svgLoader } from './svgFileLoader';
import { resolveIconFontComponent } from './resolveIconFont';

/**
 * `createSvgIcon` 生成的组件可用的 props（与 {@link MyIcon} 的 svg 模式常用项对齐）。
 */
export type SvgAssetIconProps = {
  class?: string;
  style?: string | CSSProperties;
  visable?: boolean;
  disabled?: boolean;
  spin?: boolean;
  rotate?: number;
};

const svgAssetProps = {
  class: {
    type: String,
    default: '',
    required: false as const
  },
  style: {
    type: [Object, String] as PropType<string | CSSProperties>,
    default: () => ({}),
    required: false as const
  },
  visable: {
    type: Boolean,
    default: true,
    required: false as const
  },
  disabled: {
    type: Boolean,
    default: false,
    required: false as const
  },
  spin: {
    type: Boolean,
    default: false,
    required: false as const
  },
  rotate: {
    type: Number,
    default: 0,
    required: false as const
  }
};

/**
 * 从打包器解析后的 SVG 资源 URL 推导 DevTools 中可用的组件名片段（仅字母数字与下划线）。
 */
function safeComponentNamePart(svgUrl: string): string {
  const base = svgUrl.split(/[/\\]/).pop() ?? 'svg';
  const stem = base.replace(/\.svg$/i, '');
  const safe = stem.replace(/[^a-zA-Z0-9_]/g, '_');
  return safe.length ? safe : 'Svg';
}

/**
 * 使用 `import svgUrl from './icon.svg'`（Vite 默认得到 URL 字符串）创建与 {@link MyIcon} `svgFile` 行为一致的图标组件。
 *
 * @param svgUrl - 静态资源地址，例如 Vite：`import url from './a.svg'` 的 `url`
 * @returns 可在模板中像普通组件一样使用的 Vue 组件
 *
 * @example
 * ```ts
 * import closeUrl from './close.svg';
 * export const CloseIcon = createSvgIcon(closeUrl);
 * ```
 */
export function createSvgIcon(svgUrl: string) {
  const displayStem = safeComponentNamePart(svgUrl);

  return defineComponent({
    name: `HhSvgAssetIcon_${displayStem}`,
    props: svgAssetProps,
    emits: ['click'],
    setup(props, { emit }) {
      const demo = ref<string>('');

      const handleClick = (e: MouseEvent) => {
        if (props.disabled) {
          return;
        }
        emit('click', e);
      };

      const loadSvg = async () => {
        if (!svgUrl) {
          return;
        }
        const text = await svgLoader({ svgUrl });
        demo.value = (text as string) ?? '';
      };

      onMounted(() => {
        void loadSvg();
      });

      watch(
        () => svgUrl,
        () => {
          void loadSvg();
        }
      );

      return () => {
        if (!props.visable) {
          return null;
        }

        const IconComp = resolveIconFontComponent(undefined);
        const { class: iconClass, visable: _v, ...iconPropsRest } = props;

        return (
          <IconComp
            {...iconPropsRest}
            type=''
            onClick={handleClick}
            class={['svgfile', `icon-${displayStem}`, iconClass].filter(
              Boolean
            )}
            v-html={demo.value}
          />
        );
      };
    }
  });
}
