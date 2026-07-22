# UI Playground Release Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver accessible UI primitives, responsive Playground coverage, and verified `0.1.0` npm tarballs for the two-package workspace.

**Architecture:** Keep the existing package and export boundaries. Add focused component tests beside the UI package, browser-level route and responsive checks in Playground, and a repository release verifier that consumes packed artifacts in an isolated fixture.

**Tech Stack:** Vue 3.5, TypeScript 5.7, Vitest 3, Vue Test Utils, happy-dom, Playwright Chromium, Vite 6, pnpm 10.

## Global Constraints

- Preserve `@nnnb/hhfast-ui` and `@nnnb/hhfast-utils` as the only published packages.
- Preserve every existing public export subpath.
- Set both package versions to exactly `0.1.0`.
- Do not overwrite the user's existing `packages/hhfast-ui/src/components/table/TableView.tsx` changes.
- Do not execute a real `npm publish`; only produce verified tarballs and manual commands.
- All implementation work follows test-first red-green-refactor cycles.

---

### Task 1: Establish the UI component test harness and plugin contract

**Files:**
- Modify: `packages/hhfast-ui/package.json`
- Create: `packages/hhfast-ui/vitest.config.ts`
- Create: `packages/hhfast-ui/tests/setup.ts`
- Create: `packages/hhfast-ui/tests/plugin.test.ts`
- Modify: `packages/hhfast-ui/src/index.ts`

**Interfaces:**
- Consumes: exported Vue components and `HhfastUi.install(app)`.
- Produces: `pnpm --filter @nnnb/hhfast-ui test`, global registrations for `HDrawer` and `HPopover`.

- [ ] Write `plugin.test.ts` using a mocked Vue app and assert component names include `HDrawer`, `HPopover`, `HTable`, `HTooltip`, `HSplitter`, `HSplitterPanel`, `HConfigProvider`, and `HTree`, plus the `tooltip` directive.
- [ ] Run `pnpm --filter @nnnb/hhfast-ui test -- plugin.test.ts` and verify failure reports missing test script or missing registrations.
- [ ] Add Vitest, Vue Test Utils and happy-dom configuration; register `HDrawer` and `HPopover` in `HhfastUi.install()` without mounting Toast/Modal layers.
- [ ] Re-run the focused test and expect all assertions to pass.
- [ ] Run `pnpm --filter @nnnb/hhfast-ui typecheck` and expect exit code 0.

### Task 2: Make Modal and Drawer keyboard-accessible

**Files:**
- Create: `packages/hhfast-ui/tests/modal.test.ts`
- Create: `packages/hhfast-ui/tests/drawer.test.ts`
- Modify: `packages/hhfast-ui/src/components/modal/HModalLayer.vue`
- Modify: `packages/hhfast-ui/src/components/drawer/HDrawer.vue`

**Interfaces:**
- Consumes: `modal`, `openModal`, `closeAllModals`, `HModalLayer`, and `HDrawer`'s `update:open` event.
- Produces: dialog semantics, labelled title, Esc handling, focus trap and focus restoration.

- [ ] Add failing Modal tests that open a record, assert `role=dialog`, `aria-modal`, title linkage and close label, then verify initial focus, Tab wrap, Esc close and opener focus restoration.
- [ ] Add failing Drawer tests for the same semantics and focus behavior, plus a viewport-constrained panel style/class.
- [ ] Run both focused test files and confirm failures are limited to the missing accessibility behavior.
- [ ] Implement small reusable focus helpers local to each component, document-level key handling while open, stable title IDs, and viewport size constraints.
- [ ] Re-run the focused tests and expect pass; then run the entire UI suite.

### Task 3: Add accessible Splitter keyboard resizing

**Files:**
- Create: `packages/hhfast-ui/tests/splitter.test.ts`
- Modify: `packages/hhfast-ui/src/components/splitter/Splitter.tsx`
- Modify: `packages/hhfast-ui/src/components/splitter/splitter.scss`

**Interfaces:**
- Consumes: existing panel percentages, min/max constraints and `resize` emit.
- Produces: focusable `separator` elements supporting arrow keys at 1% or Shift+arrow at 10%.

- [ ] Write a failing test mounting two panels with deterministic `ResizeObserver` and geometry stubs; assert orientation/value ARIA and keyboard resizing.
- [ ] Run the focused test and verify the bar is not focusable and sizes do not change.
- [ ] Extract percentage delta application from drag handling, reuse it in `onKeydown`, and render separator ARIA attributes.
- [ ] Add visible `:focus-visible` styling to the separator.
- [ ] Re-run focused and full UI tests, expecting pass.

### Task 4: Expose Popover state to assistive technology

**Files:**
- Create: `packages/hhfast-ui/tests/popover.test.ts`
- Modify: `packages/hhfast-ui/src/components/popover/HPopover.tsx`

**Interfaces:**
- Consumes: click and manual trigger modes.
- Produces: stable popover ID, `aria-controls`, `aria-expanded`, and `role=dialog`.

- [ ] Write failing click-trigger and manual-trigger tests for the trigger/popup relationship and state changes.
- [ ] Run the focused test and verify the expected ARIA attributes are absent.
- [ ] Generate a component-instance-stable ID, bind it to the popover and reference wrapper, and change the popup role to `dialog`.
- [ ] Re-run focused and full UI tests, expecting pass.

### Task 5: Make Playground responsive and add browser coverage

**Files:**
- Modify: `apps/playground/App.vue`
- Modify: `apps/playground/package.json`
- Create: `apps/playground/playwright.config.ts`
- Create: `apps/playground/e2e/routes.spec.ts`
- Create: `apps/playground/e2e/interactions.spec.ts`
- Create: `apps/playground/e2e/responsive.spec.ts`

**Interfaces:**
- Consumes: `demoGroups`, `demoRoutePath`, current demo labels and routes.
- Produces: mobile navigation at `<768px` and `pnpm --filter @nnnb/hhfast-playground test:e2e`.

- [ ] Add a failing responsive test at 390x844 asserting no horizontal overflow, a visible menu button, navigation open/close, and successful route navigation.
- [ ] Add route smoke tests generated from `demoGroups`, failing on console errors or missing main content.
- [ ] Add focused Toast, Modal and Drawer interaction tests using accessible roles/names.
- [ ] Run the responsive test against the existing app and confirm overflow/menu failures.
- [ ] Implement the mobile top bar, overlay sidebar, route-change close behavior and responsive CSS in `App.vue`.
- [ ] Run all Chromium E2E tests and expect pass, then run Playground typecheck/build.

### Task 6: Add tarball consumer verification and release metadata

**Files:**
- Modify: `packages/hhfast-ui/package.json`
- Modify: `packages/hhfast-utils/package.json`
- Modify: `package.json`
- Create: `scripts/verify-packed-packages.mjs`
- Create: `tests/package-consumer/package.json`
- Create: `tests/package-consumer/tsconfig.json`
- Create: `tests/package-consumer/index.html`
- Create: `tests/package-consumer/src/main.ts`
- Create: `tests/package-consumer/src/imports.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: built `dist` folders and public export maps.
- Produces: `release:check`, two `0.1.0` tarballs, an isolated installed-consumer typecheck/build gate, and documented manual publish order.

- [ ] Set both versions to `0.1.0`; add `license`, `engines`, and `publishConfig.access=public` metadata while retaining exports and files lists.
- [ ] Create the consumer fixture importing both roots, every public subpath and `@nnnb/hhfast-ui/index.css`; its Vue entry mounts a minimal app with `HhfastUi`.
- [ ] Write the verifier to create a repository-scoped temporary directory, run `pnpm pack --pack-destination`, inspect tarball file lists, copy the fixture, install exact tarball paths with lockfile disabled, then run typecheck and Vite build.
- [ ] Run the verifier before wiring scripts and confirm any unresolved `workspace:*`, missing export or fixture dependency fails with a nonzero exit.
- [ ] Add root `test:ui`, `test:playground`, `verify:packages`, and `release:check` scripts; keep `publish:utils` and `publish:ui` explicit.
- [ ] Update README with the gate, registry preflight, utils-first order and the statement that publishing is manual.
- [ ] Run `pnpm release:check` and expect every stage to pass.

### Task 7: Final verification and release handoff

**Files:**
- Modify only files required by verification fixes; do not alter unrelated user changes.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: reproducible evidence and local tarball paths; no registry mutation.

- [ ] Run `pnpm test`, `pnpm typecheck`, `pnpm build`, and `pnpm --filter @nnnb/hhfast-playground build` independently and record exit code 0.
- [ ] Run `pnpm --filter @nnnb/hhfast-playground test:e2e` and record the Chromium pass count.
- [ ] Run `pnpm verify:packages` from a clean output directory and record both generated tarball names.
- [ ] Run `git diff --check` and inspect `git status --short`, confirming `TableView.tsx` user changes remain untouched.
- [ ] Report the exact commands for `npm whoami`, `npm view`, `pnpm publish:utils`, registry confirmation, and `pnpm publish:ui`; stop before any real publish command.
