import { describe, expect, it } from 'vitest'

import { BackgroundTaskManager } from '@nnnb/hhfast-utils/background-task-manager'
import type {
  BackgroundTask,
  BackgroundTaskStatus,
} from '@nnnb/hhfast-utils/background-task-manager'

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

const waitForTaskStatus = (
  manager: BackgroundTaskManager,
  id: string,
  status: BackgroundTaskStatus,
): Promise<BackgroundTask> => {
  const current = manager.getTask(id)
  if (current?.status === status) {
    return Promise.resolve(current)
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      unsubscribe()
      reject(
        new Error(
          `Timed out waiting for task "${id}" to reach "${status}". Current task: ${JSON.stringify(manager.getTask(id))}`,
        ),
      )
    }, 1_000)
    const unsubscribe = manager.on('task-updated', (task) => {
      if (task?.id !== id || task.status !== status) {
        return
      }
      clearTimeout(timeoutId)
      unsubscribe()
      resolve(task)
    })
  })
}

const waitForIdle = (manager: BackgroundTaskManager): Promise<void> => {
  if (manager.isIdle()) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      unsubscribe()
      reject(
        new Error(
          `Timed out waiting for manager to become idle. Tasks: ${JSON.stringify(manager.getTasks())}`,
        ),
      )
    }, 1_000)
    const unsubscribe = manager.on('idle', () => {
      clearTimeout(timeoutId)
      unsubscribe()
      resolve()
    })
  })
}

describe('BackgroundTaskManager', () => {
  it('executes an enqueued task and stores its result', async () => {
    const manager = new BackgroundTaskManager()
    manager.register<{ value: number }, number>(
      'double',
      async ({ payload }) => payload.value * 2,
    )

    const completed = new Promise<void>((resolve) => {
      manager.on('idle', () => resolve())
    })
    const id = manager.enqueue({
      id: 'success-task',
      type: 'double',
      payload: { value: 21 },
    })
    await completed

    expect(manager.getTask(id)).toMatchObject({
      status: 'succeeded',
      result: 42,
      attempts: 1,
      progress: 1,
    })
  })

  it('publishes progress and its message through task updates', async () => {
    const manager = new BackgroundTaskManager()
    const updates: BackgroundTask[] = []
    manager.on('task-updated', (task) => {
      if (task) {
        updates.push(task)
      }
    })
    manager.register('upload', async ({ setProgress }) => {
      setProgress(0.4, 'uploading')
      return 'uploaded'
    })

    const id = manager.enqueue({
      id: 'progress-task',
      type: 'upload',
      payload: undefined,
    })
    await waitForTaskStatus(manager, id, 'succeeded')

    expect(updates).toContainEqual(
      expect.objectContaining({
        id,
        status: 'running',
        progress: 0.4,
        progressMessage: 'uploading',
      }),
    )
  })

  it('retries failures up to maxRetries and keeps the successful result', async () => {
    const manager = new BackgroundTaskManager({
      retryDelay: () => 0,
    })
    let executions = 0
    manager.register('flaky', async () => {
      executions += 1
      if (executions < 3) {
        throw new Error(`failure ${executions}`)
      }
      return 'recovered'
    })

    const id = manager.enqueue({
      id: 'retry-task',
      type: 'flaky',
      payload: undefined,
      maxRetries: 2,
    })
    const task = await waitForTaskStatus(manager, id, 'succeeded')

    expect(executions).toBe(3)
    expect(task).toMatchObject({
      attempts: 3,
      result: 'recovered',
      status: 'succeeded',
    })
  })

  it('never runs more tasks than the configured concurrency', async () => {
    const manager = new BackgroundTaskManager({ concurrency: 2 })
    const gates = new Map<string, Deferred<void>>()
    let running = 0
    let peakRunning = 0
    manager.register<string, string>('blocked', async ({ id }) => {
      running += 1
      peakRunning = Math.max(peakRunning, running)
      const gate = deferred<void>()
      gates.set(id, gate)
      await gate.promise
      running -= 1
      return id
    })

    const ids = ['concurrency-1', 'concurrency-2', 'concurrency-3']
    for (const id of ids) {
      manager.enqueue({ id, type: 'blocked', payload: id })
    }

    expect(gates.size).toBe(2)
    expect(peakRunning).toBe(2)

    gates.get('concurrency-1')?.resolve(undefined)
    await waitForTaskStatus(manager, 'concurrency-3', 'running')
    gates.get('concurrency-2')?.resolve(undefined)
    gates.get('concurrency-3')?.resolve(undefined)
    await waitForIdle(manager)

    expect(peakRunning).toBe(2)
    expect(manager.getTasks().map((task) => task.status)).toEqual([
      'succeeded',
      'succeeded',
      'succeeded',
    ])
  })

  it('cancels a running task through its AbortSignal', async () => {
    const manager = new BackgroundTaskManager()
    const started = deferred<void>()
    let signalWasAborted = false
    manager.register('cancellable', async ({ signal }) => {
      started.resolve(undefined)
      return new Promise<string>((resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => {
            signalWasAborted = signal.aborted
            reject(new Error('aborted'))
          },
          { once: true },
        )
      })
    })

    const id = manager.enqueue({
      id: 'cancel-task',
      type: 'cancellable',
      payload: undefined,
    })
    await started.promise

    expect(manager.cancel(id)).toBe(true)
    const task = await waitForTaskStatus(manager, id, 'cancelled')

    expect(signalWasAborted).toBe(true)
    expect(task).toMatchObject({
      status: 'cancelled',
      error: undefined,
      result: undefined,
    })
  })
})
