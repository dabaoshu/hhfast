import { defineComponent, Teleport } from 'vue';
import { useToast } from './toastState';
import type { ToastPlacement } from './types';
import './toast-layer.scss';

/** @internal 内置支持的布局区域 */
const REGIONS: ToastPlacement[] = ['top', 'top-right', 'bottom'];

/**
 * Toast 逻辑栈的内置渲染层组件。
 *
 * 直接在根组件挂载即可获得开箱即用的 Toast UI：
 * ```vue
 * <template>
 *   <HToastLayer />
 *   <RouterView />
 * </template>
 * ```
 */
export default defineComponent({
  name: 'HToastLayer',
  setup() {
    const { toastList, closeToast } = useToast();

    return () => (
      <Teleport to="body">
        <div class="hh-toast-overlay" aria-live="polite">
          {REGIONS.map((placement) => (
            <div
              key={placement}
              class={['hh-toast-region', `hh-toast-region--${placement}`]}
            >
              {toastList
                .filter((t) => t.placement === placement)
                .map((t) => (
                  <div
                    key={t.id}
                    class={['hh-toast-item', `hh-toast-item--${t.type}`]}
                  >
                    {t.icon ? (
                      <span class="hh-toast-icon">{t.icon}</span>
                    ) : null}
                    <span class="hh-toast-msg">{t.message}</span>
                    <button
                      type="button"
                      class="hh-toast-close"
                      aria-label="关闭"
                      onClick={() => closeToast(t.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </Teleport>
    );
  },
});
