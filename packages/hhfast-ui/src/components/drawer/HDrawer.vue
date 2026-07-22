<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { DrawerPlacement } from './types'

defineOptions({ name: 'HDrawer' })

const props = withDefaults(
  defineProps<{
    open: boolean
    placement?: DrawerPlacement
    title?: string
    closable?: boolean
    maskClosable?: boolean
    width?: string | number
    height?: string | number
  }>(),
  {
    placement: 'right',
    title: '',
    closable: true,
    maskClosable: true,
    width: 360,
    height: 360,
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const panelRef = ref<HTMLElement | null>(null)
const titleId = `hh-drawer-title-${Math.random().toString(36).slice(2)}`
let previouslyFocused: HTMLElement | null = null

const close = () => emit('update:open', false)

const onMaskClick = () => {
  if (props.maskClosable) close()
}

const drawerStyle = computed(() => {
  if (props.placement === 'left' || props.placement === 'right') {
    return {
      width: typeof props.width === 'number' ? `${props.width}px` : props.width,
      maxWidth: '100vw',
    }
  }
  return {
    height: typeof props.height === 'number' ? `${props.height}px` : props.height,
    maxHeight: '100vh',
  }
})

function getFocusable(): HTMLElement[] {
  if (!panelRef.value) return []
  return Array.from(panelRef.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ))
}

function onKeydown(event: KeyboardEvent): void {
  if (!props.open) return
  if (event.key === 'Escape' && props.closable) {
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab') return
  const focusable = getFocusable()
  const first = focusable[0] ?? panelRef.value
  const last = focusable[focusable.length - 1] ?? panelRef.value
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  }
  else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}

watch(() => props.open, async (open) => {
  if (open) {
    previouslyFocused = document.activeElement as HTMLElement | null
    document.addEventListener('keydown', onKeydown)
    await nextTick()
    ;(getFocusable()[0] ?? panelRef.value)?.focus()
  }
  else {
    document.removeEventListener('keydown', onKeydown)
    previouslyFocused?.focus()
    previouslyFocused = null
  }
})

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="hh-drawer-fade">
      <div v-if="open" class="hh-drawer-mask" @click.self="onMaskClick">
        <Transition :name="`hh-drawer-${placement}`">
          <aside
            v-if="open"
            ref="panelRef"
            class="hh-drawer-panel"
            :class="[`hh-drawer--${placement}`]"
            :style="drawerStyle"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="title || $slots.header ? titleId : undefined"
            tabindex="-1"
          >
            <header v-if="title || $slots.header || closable" class="hh-drawer-header">
              <slot name="header">
                <span :id="titleId" class="hh-drawer-title">{{ title }}</span>
              </slot>
              <button v-if="closable" type="button" class="hh-drawer-close" aria-label="关闭抽屉" @click="close">×</button>
            </header>

            <div class="hh-drawer-body">
              <slot />
            </div>

            <footer v-if="$slots.footer" class="hh-drawer-footer">
              <slot name="footer" />
            </footer>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.hh-drawer-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
}
.hh-drawer-panel {
  position: absolute;
  background: #fff;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.16);
  display: flex;
  flex-direction: column;
}
.hh-drawer--right, .hh-drawer--left { top: 0; bottom: 0; width: 360px; }
.hh-drawer--right { right: 0; }
.hh-drawer--left { left: 0; }
.hh-drawer--top, .hh-drawer--bottom { left: 0; right: 0; height: 360px; }
.hh-drawer--top { top: 0; }
.hh-drawer--bottom { bottom: 0; }
.hh-drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #f0f0f0; }
.hh-drawer-title { font-size: 16px; font-weight: 600; }
.hh-drawer-close { border: 0; background: transparent; font-size: 22px; cursor: pointer; color: #999; }
.hh-drawer-body { flex: 1; overflow: auto; padding: 16px 20px; }
.hh-drawer-footer { padding: 12px 20px 16px; border-top: 1px solid #f0f0f0; display: flex; justify-content: flex-end; gap: 8px; }
.hh-drawer-fade-enter-active, .hh-drawer-fade-leave-active { transition: opacity .18s ease; }
.hh-drawer-fade-enter-from, .hh-drawer-fade-leave-to { opacity: 0; }
.hh-drawer-right-enter-active, .hh-drawer-right-leave-active,
.hh-drawer-left-enter-active, .hh-drawer-left-leave-active,
.hh-drawer-top-enter-active, .hh-drawer-top-leave-active,
.hh-drawer-bottom-enter-active, .hh-drawer-bottom-leave-active { transition: transform .22s ease; }
.hh-drawer-right-enter-from, .hh-drawer-right-leave-to { transform: translateX(100%); }
.hh-drawer-left-enter-from, .hh-drawer-left-leave-to { transform: translateX(-100%); }
.hh-drawer-top-enter-from, .hh-drawer-top-leave-to { transform: translateY(-100%); }
.hh-drawer-bottom-enter-from, .hh-drawer-bottom-leave-to { transform: translateY(100%); }
</style>
