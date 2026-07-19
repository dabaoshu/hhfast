# BackgroundTaskManager Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Vitest test harness for `@nnnb/hhfast-utils` and characterize five critical public behaviors of `BackgroundTaskManager` without changing its production API.

**Architecture:** Keep tests outside `src/` in `packages/hhfast-utils/tests/` so the existing TypeScript and declaration builds remain unchanged. Tests import the public module entry, use real manager instances, controlled promises, and event subscriptions instead of private state or arbitrary sleeps.

**Tech Stack:** pnpm 10, TypeScript 5, Vite 6, Vitest 3, Node test environment.

## Global Constraints

- Do not modify `BackgroundTaskManager` public API or production behavior.
- Do not include test files in `packages/hhfast-utils/dist`.
- Do not modify unrelated existing changes in `packages/hhfast-ui`.
- Use real `BackgroundTaskManager` instances; do not inspect private fields.
- Use deterministic event/promise synchronization rather than arbitrary delays.

---

### Task 1: Add the Utils test harness

**Files:**
- Modify: `package.json`
- Modify: `packages/hhfast-utils/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `packages/hhfast-utils/vitest.config.ts`
- Create: `packages/hhfast-utils/tests/backgroundTaskManager.test.ts`

**Interfaces:**
- Consumes: `pnpm --filter @nnnb/hhfast-utils` workspace selection.
- Produces: `pnpm test:utils`, package-level `test` and `test:watch` commands.

- [ ] **Step 1: Create the first test before installing Vitest**

```ts
import { describe, expect, it } from 'vitest'
import { BackgroundTaskManager } from '../src/core/background-task-manager'

describe('BackgroundTaskManager', () => {
  it('executes an enqueued task and stores its result', async () => {
    const manager = new BackgroundTaskManager()
    manager.register<{ value: number }, number>('double', async ({ payload }) => payload.value * 2)

    const completed = new Promise<void>((resolve) => {
      manager.on('idle', () => resolve())
    })
    const id = manager.enqueue({ id: 'success-task', type: 'double', payload: { value: 21 } })
    await completed

    expect(manager.getTask(id)).toMatchObject({
      status: 'succeeded',
      result: 42,
      attempts: 1,
      progress: 1,
    })
  })
})
```

- [ ] **Step 2: Verify the harness is absent**

Run: `pnpm --filter @nnnb/hhfast-utils test`

Expected: FAIL because the package has no `test` script and Vitest is not installed.

- [ ] **Step 3: Install the compatible runner and add scripts**

Run: `pnpm add -D vitest@^3.2.4 --filter @nnnb/hhfast-utils`

Add to `packages/hhfast-utils/package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Add to root `package.json` scripts:

```json
"test": "pnpm -r --filter ./packages/** --if-present test",
"test:utils": "pnpm --filter @nnnb/hhfast-utils test"
```

Create `packages/hhfast-utils/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Verify the first characterization test passes**

Run: `pnpm test:utils`

Expected: one test passes.

### Task 2: Cover progress, concurrency, retry, and cancellation

**Files:**
- Modify: `packages/hhfast-utils/tests/backgroundTaskManager.test.ts`

**Interfaces:**
- Consumes: `BackgroundTaskManager.register()`, `enqueue()`, `cancel()`, `getTask()`, and `on()`.
- Produces: five independent regression tests for documented public behavior.

- [ ] **Step 1: Add a deterministic deferred helper**

```ts
interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: Deferred<T>['resolve']
  let reject!: Deferred<T>['reject']
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}
```

- [ ] **Step 2: Add progress and retry tests**

Add tests that assert `setProgress(0.4, 'uploading')` appears in a `task-updated` snapshot, and that an executor failing twice then succeeding has `attempts: 3`, `status: 'succeeded'`, and the final result when configured with `maxRetries: 2` and `retryDelay: () => 0`.

- [ ] **Step 3: Run the focused tests**

Run: `pnpm test:utils`

Expected: the success, progress, and retry tests pass.

- [ ] **Step 4: Add concurrency and cancellation tests**

For concurrency, enqueue three tasks against a manager with `concurrency: 2`, block each executor on a per-task deferred promise, assert peak execution is exactly two, then release all tasks and await `idle`.

For cancellation, block a running executor until its `AbortSignal` fires, call `cancel(id)`, reject from the abort handler, await `idle`, then assert `cancelled`, `error: undefined`, and `result: undefined`.

- [ ] **Step 5: Verify all five tests**

Run: `pnpm test:utils`

Expected: five tests pass with no warnings or unhandled rejections.

### Task 3: Verify build boundaries and graph freshness

**Files:**
- Update: `graphify-out/graph.json` and generated Graphify reports through the existing Graphify update workflow.

**Interfaces:**
- Consumes: root workspace scripts and Graphify project instructions.
- Produces: verified tests, types, build output, and a current knowledge graph.

- [ ] **Step 1: Run the complete verification suite**

Run:

```powershell
pnpm test:utils
pnpm typecheck:utils
pnpm build:utils
```

Expected: all three commands exit with code 0.

- [ ] **Step 2: Confirm tests are not published**

Run: `rg --files packages/hhfast-utils/dist | rg 'test|spec'`

Expected: no matches.

- [ ] **Step 3: Update Graphify**

Run: `graphify update .`

Expected: Graphify updates the project graph without API usage.

- [ ] **Step 4: Review the scoped diff**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors; only the test infrastructure, tests, plan, lockfile, and generated Graphify changes belong to this task. Existing UI changes remain untouched.
