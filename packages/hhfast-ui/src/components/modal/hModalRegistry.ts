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
