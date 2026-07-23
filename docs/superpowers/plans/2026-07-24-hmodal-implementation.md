# HModal Declarative Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add declarative `HModal` as the shared UI shell, refactor `HModalLayer` to render one `HModal` per stack record, and cover both with Vitest + playground demo.

**Architecture:** `HModal` owns Teleport, mask, dialog chrome, slots, ESC/focus (module-level open-instance registry keyed by zIndex). It never joins `modalList`. `HModalLayer` stays a thin subscriber over `useModalLayer`, binding each `ModalRecord` onto `HModal`. Stack APIs (`openModal` / `modal.confirm` / `useModalLayer`) stay unchanged.

**Tech Stack:** Vue 3.4+, TypeScript 5, Vite 6, Vitest 3 + `@vue/test-utils`, pnpm, existing hhfast-ui modal styles (`.hh-modal-*`).

## Global Constraints

- Declarative `HModal` must **not** call `openModal` / push `modalList`.
- Confirm must **not** auto-close; only emit `confirm`.
- Cancel / mask / ESC / × must emit `cancel` → `close` → `update:modelValue=false`.
- Keep class names `.hh-modal-mask`, `.hh-modal-dialog`, `.hh-modal-close-btn`, etc. so existing Layer a11y tests and CSS stay valid.
- Do not change `modal.open` / `confirm` / `useModal` / `useModalLayer` public semantics.
- Do not modify unrelated dirty files (`README.md`, `packages/hhfast-ui/package.json`, `scripts/verify-packed-packages.mjs`) unless required for this feature.
- User-facing copy stays Chinese where existing UI is Chinese.

---

## File map

| File | Responsibility |
|------|----------------|
| `packages/hhfast-ui/src/components/modal/types.ts` | Add `HModalProps` / `HModalEmits` |
| `packages/hhfast-ui/src/components/modal/hModalRegistry.ts` | Open-instance registry for top-zIndex ESC |
| `packages/hhfast-ui/src/components/modal/HModal.vue` | Declarative shell UI + a11y |
| `packages/hhfast-ui/src/components/modal/HModalLayer.vue` | Thin stack → `HModal` bridge |
| `packages/hhfast-ui/src/components/modal/index.ts` | Export `HModal` + types |
| `packages/hhfast-ui/src/index.ts` | Re-export `HModal` + `HModalProps` / `HModalEmits` |
| `packages/hhfast-ui/src/components/modal/readme.md` | Document declarative usage |
| `packages/hhfast-ui/tests/modal.test.ts` | Keep Layer a11y; add `HModal` declarative tests |
| `apps/playground/demos/ui/modal/ModalDemo.vue` | Add declarative demo section |

---

### Task 1: Types + top-zIndex registry

**Files:**
- Modify: `packages/hhfast-ui/src/components/modal/types.ts`
- Create: `packages/hhfast-ui/src/components/modal/hModalRegistry.ts`
- Test: `packages/hhfast-ui/tests/modal.test.ts` (registry unit assertions added in this task)

**Interfaces:**
- Consumes: existing `ModalType` from `types.ts`
- Produces:
  - `HModalProps`, `HModalEmits`
  - `registerHModalInstance` / `unregisterHModalInstance` / `isTopHModalInstance`

- [ ] **Step 1: Append types to `types.ts`**

```ts
/**
 * 声明式 HModal 的 props。
 */
export interface HModalProps {
  /** 显隐（`v-model`） */
  modelValue: boolean;
  title?: string;
  type?: ModalType;
  maskClosable?: boolean;
  closable?: boolean;
  showConfirm?: boolean;
  showCancel?: boolean;
  confirmText?: string;
  cancelText?: string;
  /** 确认按钮受控 loading */
  confirmLoading?: boolean;
  zIndex?: number;
  className?: string | string[];
  style?: string | CSSProperties;
}

/**
 * 声明式 HModal 的事件。
 */
export type HModalEmits = {
  'update:modelValue': [value: boolean];
  confirm: [];
  cancel: [];
  close: [];
};
```

- [ ] **Step 2: Create `hModalRegistry.ts`**

```ts
/**
 * 已打开的声明式 HModal 实例注册表，用于判定「当前谁响应 ESC」。
 * 仅比较 zIndex；同 zIndex 时后注册者优先。
 */
interface HModalInstanceEntry {
  id: symbol;
  zIndex: number;
}

const openInstances: HModalInstanceEntry[] = [];

/**
 * 注册一个已打开的 HModal 实例。
 * @returns 用于注销的 id
 */
export function registerHModalInstance(zIndex: number): symbol {
  const id = Symbol('h-modal');
  openInstances.push({ id, zIndex });
  return id;
}

/**
 * 注销 HModal 实例。
 */
export function unregisterHModalInstance(id: symbol): void {
  const i = openInstances.findIndex((entry) => entry.id === id);
  if (i >= 0) openInstances.splice(i, 1);
}

/**
 * 当前实例是否为应响应 ESC 的顶层（最大 zIndex；并列取最后注册）。
 */
export function isTopHModalInstance(id: symbol): boolean {
  if (openInstances.length === 0) return false;
  let top = openInstances[0];
  for (const entry of openInstances) {
    if (entry.zIndex >= top.zIndex) top = entry;
  }
  return top.id === id;
}
```

- [ ] **Step 3: Add registry unit tests at top of `tests/modal.test.ts`**

```ts
import {
  isTopHModalInstance,
  registerHModalInstance,
  unregisterHModalInstance,
} from '../src/components/modal/hModalRegistry'

describe('hModalRegistry', () => {
  it('treats the highest zIndex instance as top', () => {
    const low = registerHModalInstance(1000)
    const high = registerHModalInstance(1010)
    expect(isTopHModalInstance(high)).toBe(true)
    expect(isTopHModalInstance(low)).toBe(false)
    unregisterHModalInstance(high)
    expect(isTopHModalInstance(low)).toBe(true)
    unregisterHModalInstance(low)
  })

  it('prefers the later registration when zIndex ties', () => {
    const first = registerHModalInstance(1000)
    const second = registerHModalInstance(1000)
    expect(isTopHModalInstance(second)).toBe(true)
    unregisterHModalInstance(second)
    unregisterHModalInstance(first)
  })
})
```

Keep existing imports/`afterEach`/`HModalLayer accessibility` describe.

- [ ] **Step 4: Run registry tests**

Run: `pnpm --filter @nnnb/hhfast-ui test -- tests/modal.test.ts`

Expected: registry tests PASS; existing `HModalLayer accessibility` still PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/hhfast-ui/src/components/modal/types.ts packages/hhfast-ui/src/components/modal/hModalRegistry.ts packages/hhfast-ui/tests/modal.test.ts
git commit -m "feat(modal): add HModal props types and top-zIndex registry"
```

---

### Task 2: Implement `HModal.vue`

**Files:**
- Create: `packages/hhfast-ui/src/components/modal/HModal.vue`
- Modify: `packages/hhfast-ui/src/components/modal/index.ts`
- Modify: `packages/hhfast-ui/src/index.ts`
- Modify: `packages/hhfast-ui/tests/modal.test.ts`

**Interfaces:**
- Consumes: `HModalProps` fields; registry helpers from Task 1
- Produces: exported `HModal`; events `update:modelValue` / `confirm` / `cancel` / `close`

- [ ] **Step 1: Write failing declarative tests in `tests/modal.test.ts`**

```ts
import { ref } from 'vue'
import { vi } from 'vitest'
import { HModal } from '../src/components/modal'

describe('HModal declarative', () => {
  it('toggles with v-model and does not auto-close on confirm', async () => {
    const visible = ref(true)
    const onConfirm = vi.fn()
    const wrapper = mount(
      {
        components: { HModal },
        setup() {
          return { visible, onConfirm }
        },
        template: `
          <HModal v-model="visible" title="Edit" @confirm="onConfirm">
            <p>body</p>
          </HModal>
        `,
      },
      { attachTo: document.body },
    )
    await nextTick()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(document.querySelector('.hh-modal-title')?.textContent).toContain('Edit')

    await wrapper.find('.hh-modal-btn--confirm').trigger('click')
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(visible.value).toBe(true)
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()

    await wrapper.find('.hh-modal-btn--cancel').trigger('click')
    await nextTick()
    expect(visible.value).toBe(false)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    wrapper.unmount()
  })

  it('closes on Escape only for the top zIndex instance', async () => {
    const lowOpen = ref(true)
    const highOpen = ref(true)
    const wrapper = mount(
      {
        components: { HModal },
        setup() {
          return { lowOpen, highOpen }
        },
        template: `
          <HModal v-model="lowOpen" title="Low" :z-index="1000" :show-confirm="false" :show-cancel="false" />
          <HModal v-model="highOpen" title="High" :z-index="1100" :show-confirm="false" :show-cancel="false" />
        `,
      },
      { attachTo: document.body },
    )
    await nextTick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(highOpen.value).toBe(false)
    expect(lowOpen.value).toBe(true)
    wrapper.unmount()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @nnnb/hhfast-ui test -- tests/modal.test.ts`

Expected: FAIL — `HModal` is not exported / component missing.

- [ ] **Step 3: Implement `HModal.vue`**

Create `packages/hhfast-ui/src/components/modal/HModal.vue`:

- `defineOptions({ name: 'HModal' })`
- props/emits per `HModalProps` / `HModalEmits` with defaults matching the design (`type: 'info'`, `maskClosable: true`, `closable: true`, `showConfirm/showCancel: true`, texts `确定`/`取消`, `zIndex: 1000`)
- On open: register instance, add keydown, focus first focusable / dialog
- On close/unmount: unregister, remove keydown, restore focus
- ESC only if `isTopHModalInstance(registryId)`
- `requestClose`: emit `cancel` → `close` → `update:modelValue=false`
- Confirm: emit `confirm` only
- Slots: `default`, `header`, `footer` (`{ confirm, cancel, loading }`), `title`
- Keep classes: `.hh-modal-mask`, `.hh-modal-dialog`, `.hh-modal-close-btn`, `.hh-modal-btn--confirm`, etc.
- Copy `<style scoped>` verbatim from current `HModalLayer.vue`
- Prefer `useId()` for title id; if Vue version < 3.5, use `hh-modal-title-${Math.random().toString(36).slice(2)}` like `HDrawer`

- [ ] **Step 4: Export `HModal`**

`modal/index.ts`:

```ts
export type { HModalEmits, HModalProps } from './types';
export { default as HModal } from './HModal.vue';
```

`src/index.ts`: add `HModal` to value exports and `HModalProps` / `HModalEmits` to type exports.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @nnnb/hhfast-ui test -- tests/modal.test.ts`

Expected: all tests in this file PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/hhfast-ui/src/components/modal/HModal.vue packages/hhfast-ui/src/components/modal/index.ts packages/hhfast-ui/src/index.ts packages/hhfast-ui/tests/modal.test.ts
git commit -m "feat(modal): add declarative HModal shell component"
```

---

### Task 3: Refactor `HModalLayer` to reuse `HModal`

**Files:**
- Modify: `packages/hhfast-ui/src/components/modal/HModalLayer.vue`
- Test: existing Layer a11y case in `packages/hhfast-ui/tests/modal.test.ts`

**Interfaces:**
- Consumes: `HModal`; `useModalLayer()`
- Produces: same public `HModalLayer` behavior

- [ ] **Step 1: Replace `HModalLayer.vue` with thin wrapper**

```vue
<script setup lang="ts">
/**
 * @description Modal 逻辑栈的内置渲染层：每层复用 HModal。
 */
import HModal from './HModal.vue'
import { useModalLayer } from './useModalLayer'

defineOptions({ name: 'HModalLayer' })

const { modalList, loadingMap, handleConfirm, handleCancel } = useModalLayer()
</script>

<template>
  <HModal
    v-for="item in modalList"
    :key="item.id"
    :model-value="true"
    :title="item.title"
    :type="item.type"
    :mask-closable="item.maskClosable"
    :show-confirm="item.showConfirm"
    :show-cancel="item.showCancel"
    :confirm-text="item.confirmText"
    :cancel-text="item.cancelText"
    :confirm-loading="!!loadingMap[item.id]"
    :z-index="item.zIndex"
    :class-name="item.className"
    :style="item.style"
    @confirm="handleConfirm(item)"
    @cancel="handleCancel(item)"
  >
    <component :is="() => item.content" />
  </HModal>
</template>
```

Remove local ESC/focus/styles from Layer.

- [ ] **Step 2: Re-run modal tests**

Run: `pnpm --filter @nnnb/hhfast-ui test -- tests/modal.test.ts`

Expected: Layer a11y + declarative tests PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/hhfast-ui/src/components/modal/HModalLayer.vue
git commit -m "refactor(modal): render HModalLayer with shared HModal shell"
```

---

### Task 4: Docs + playground demo

**Files:**
- Modify: `packages/hhfast-ui/src/components/modal/readme.md`
- Modify: `apps/playground/demos/ui/modal/ModalDemo.vue`

**Interfaces:**
- Consumes: public `HModal` API
- Produces: documented + runnable declarative example

- [ ] **Step 1: Update `readme.md`**

- Intro: 声明式 `<HModal v-model>`（不入栈）+ 命令式栈 + `<HModalLayer />`（复用 `HModal`）
- Add section「声明式 HModal」with a minimal `v-model` + `:confirm-loading` example
- File table: add `HModal.vue` / `hModalRegistry.ts`; note Layer is thin wrapper

- [ ] **Step 2: Extend `ModalDemo.vue`**

Add declarative card:

```vue
<div class="pg-card">
  <h3>HModal — 声明式</h3>
  <p class="pg-card-desc">v-model 控制，不入全局栈；确认需自行关闭</p>
  <div class="pg-actions">
    <button class="btn" @click="declarativeOpen = true">打开声明式 Modal</button>
  </div>
  <HModal
    v-model="declarativeOpen"
    title="声明式弹层"
    :confirm-loading="declarativeLoading"
    @confirm="onDeclarativeConfirm"
  >
    <p>这是 HModal 声明式用法，与 modal.open 栈互不影响。</p>
  </HModal>
</div>
```

Wire `declarativeOpen` / `declarativeLoading` / `onDeclarativeConfirm` in script; import `HModal` from `@/components/modal`. Update page desc to mention `HModal`.

- [ ] **Step 3: Re-run tests**

Run: `pnpm --filter @nnnb/hhfast-ui test -- tests/modal.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/hhfast-ui/src/components/modal/readme.md apps/playground/demos/ui/modal/ModalDemo.vue
git commit -m "docs(modal): document HModal and add playground declarative demo"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Add `HModal.vue` | Task 2 |
| `HModalProps` / `HModalEmits` | Task 1 |
| Layer reuses `HModal` | Task 3 |
| Move mask/dialog/styles into `HModal` | Task 2–3 |
| Exports | Task 2 |
| readme + playground | Task 4 |
| Independent of `modalList` | Task 2 |
| Confirm does not auto-close | Task 2 |
| Top zIndex ESC | Task 1–2 |
| Controlled `confirmLoading` | Task 2 + 4 |
| Layer a11y parity | Task 3 |

## Self-review notes

- No TBD placeholders; paths and commands are concrete.
- `handleMaskClick` remains exported from `useModalLayer` for custom renderers even if Layer stops calling it.
- Check Vue version before using `useId()`; fall back to Drawer-style id if needed.
