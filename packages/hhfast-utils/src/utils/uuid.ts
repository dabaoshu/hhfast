/**
 * ID 生成工具。
 *
 * 提供多种唯一 ID 生成算法。
 */

/**
 * 生成标准 UUID v4。
 * @returns UUID 字符串，如 "a1b2c3d4-e5f6-7890-abcd-ef1234567890"。
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // 回退方案
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * 生成短 ID。
 * @returns 短字符串，如 "a1b2c3d4"。
 */
export function shortId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/**
 * 生成带前缀的 ID。
 * @param prefix 前缀。
 * @returns 带前缀的 ID，如 "user_a1b2c3d4"。
 */
export function prefixedId(prefix: string): string {
  return `${prefix}_${shortId()}`
}

/**
 * 生成时间戳 ID。
 * @returns 基于时间戳的 ID，如 "20240101123456_abc123"。
 */
export function timestampId(): string {
  const now = new Date()
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('')
  return `${ts}_${shortId()}`
}

/**
 * 生成纳米时间戳 ID（更高精度）。
 * @returns 高精度时间戳 ID。
 */
export function nanoId(): string {
  const perf = typeof performance !== 'undefined' ? performance : Date
  const ns = Math.floor(perf.now() * 1_000_000)
  return `${ns}_${shortId()}`
}
