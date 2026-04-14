import type { JsonTreeValueType } from './types'

/**
 * 获取 JSON 值类型。
 */
export function getValueType(value: unknown): JsonTreeValueType {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  switch (typeof value) {
    case 'string': return 'string'
    case 'number': return 'number'
    case 'boolean': return 'boolean'
    case 'undefined': return 'undefined'
    default: return 'object'
  }
}

/**
 * 判断值是否为可枚举对象（排除 null、Array）。
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
