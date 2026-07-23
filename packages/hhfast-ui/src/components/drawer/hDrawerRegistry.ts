/**
 * 已打开的 HDrawer 实例注册表，用于判定「当前谁响应 ESC」。
 * 与 Modal 注册表隔离；同 zIndex 时后注册者优先。
 */
interface HDrawerInstanceEntry {
  id: symbol
  zIndex: number
}

const openInstances: HDrawerInstanceEntry[] = []

/**
 * 注册一个已打开的 HDrawer 实例。
 * @returns 用于注销的 id
 */
export function registerHDrawerInstance(zIndex: number): symbol {
  const id = Symbol('h-drawer')
  openInstances.push({ id, zIndex })
  return id
}

/**
 * 注销 HDrawer 实例。
 */
export function unregisterHDrawerInstance(id: symbol): void {
  const i = openInstances.findIndex((entry) => entry.id === id)
  if (i >= 0) openInstances.splice(i, 1)
}

/**
 * 当前实例是否为应响应 ESC 的顶层。
 */
export function isTopHDrawerInstance(id: symbol): boolean {
  if (openInstances.length === 0) return false
  let top = openInstances[0]
  for (const entry of openInstances) {
    if (entry.zIndex >= top.zIndex) top = entry
  }
  return top.id === id
}
