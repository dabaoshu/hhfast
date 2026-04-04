/**
 * 按后端枚举解析 `window` 上的 `Storage` 实例。
 *
 * @param backend 后端类型。
 * @returns `Storage` 实例。
 */
export function getWebStorage(backend: 'localStorage' | 'sessionStorage'): Storage {
  return backend === 'localStorage' ? localStorage : sessionStorage
}

/**
 * 从 `Storage` 读取并解析 JSON。
 *
 * @param storage 存储对象。
 * @param key 键名。
 * @returns 解析结果；失败或空键时返回 `undefined`。
 */
export function readJson<T>(storage: Storage, key: string): T | undefined {
  try {
    const data = storage.getItem(key)
    if (!data) {
      return undefined
    }
    return JSON.parse(data) as T
  }
  catch (error) {
    // eslint-disable-next-line no-console
    console.error('[jsonKeyValueStorage] readJson failed:', error)
    return undefined
  }
}

/**
 * 将值序列化为 JSON 写入 `Storage`。
 *
 * @param storage 存储对象。
 * @param key 键名。
 * @param value 可序列化值。
 */
export function writeJson(storage: Storage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value))
  }
  catch (error) {
    // eslint-disable-next-line no-console
    console.error('[jsonKeyValueStorage] writeJson failed:', error)
  }
}
