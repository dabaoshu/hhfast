# Drawer Command Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add Modal-aligned command drawer stack (`drawer.open` / `confirm` / `HDrawerLayer`) and enhance declarative `HDrawer` for Layer reuse.

**Architecture:** Mirror modal files (`drawerState`, `createDrawer`, `useDrawerLayer`, `hDrawerRegistry`, `HDrawerLayer`). Enhance `HDrawer` with optional confirm footer and `afterLeave`. Declarative instances stay off-stack. `zIndexBase=1100`.

**Tech Stack:** Vue 3, TypeScript, Vitest, existing hhfast-ui patterns.

## Global Constraints

- Declarative `HDrawer` does not join `drawerList`.
- Stack `showConfirm`/`showCancel` default true; declarative HDrawer defaults those to **false**.
- Separate registry from Modal; `zIndexBase: 1100`.
- Confirm does not auto-close; cancel → close → `update:open=false`.
- Keep `v-model:open` (not modelValue).

---

### Task 1: Types, registry, drawerState, createDrawer, useDrawerLayer

**Files:** Create `types` extensions + `hDrawerRegistry.ts` + `drawerState.ts` + `createDrawer.ts` + `useDrawerLayer.ts`

- [ ] Mirror modal modules with drawer naming; include `placement`/`width`/`height` on records
- [ ] Unit-test registry + `openDrawer`/`closeDrawer` smoke in `tests/drawer.test.ts`
- [ ] Commit

### Task 2: Enhance HDrawer + HDrawerLayer

**Files:** `HDrawer.vue`, `HDrawerLayer.vue`

- [ ] Add confirm footer props/events/registry/afterLeave focus restore
- [ ] Layer thin wrapper like HModalLayer
- [ ] Keep existing a11y test green (wait leave if needed)
- [ ] Commit

### Task 3: Exports, ConfigProvider, docs, playground

**Files:** `index.ts`, `src/index.ts`, config-provider, `readme.md`, `DrawerDemo.vue`, `reference.md` one line

- [ ] Wire exports + ConfigProvider `drawer` prop
- [ ] Demo command API; readme
- [ ] Commit
