import { defineComponent, Teleport } from 'vue';
import { useToast } from '@/components/toast';
import type { ToastPlacement } from '@/components/toast';
import './toast-demo.scss';

const REGIONS: ToastPlacement[] = ['top', 'top-right', 'bottom'];

/**
 * Toast 逻辑栈的最小自绘渲染层（仅供演示）。
 */
export default defineComponent({
  name: 'DemoToastLayer',
  setup() {
    const { toastList, closeToast } = useToast();

    return () => (
      <Teleport to="body">
        <div class="demo-toast-overlay" aria-live="polite">
          {REGIONS.map((placement) => (
            <div
              key={placement}
              class={['demo-toast-region', `demo-toast-region--${placement}`]}
            >
              {toastList
                .filter((t) => t.placement === placement)
                .map((t) => (
                  <div
                    key={t.id}
                    class={['demo-toast-item', `demo-toast-item--${t.type}`]}
                  >
                    {t.icon ? (
                      <span class="demo-toast-icon">{t.icon}</span>
                    ) : null}
                    <span class="demo-toast-msg">{t.message}</span>
                    <button
                      type="button"
                      class="demo-toast-close"
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
