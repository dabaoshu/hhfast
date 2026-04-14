/**
 * @description 解析后的请求体结构类型。
 */
export type CurlBodyType = 'json' | 'form-urlencoded' | 'raw' | 'empty'

/**
 * @description curl 未识别参数记录。
 */
export interface CurlExtraArg {
  /** 参数名（如 `--compressed`）。 */
  flag: string
  /** 参数值（若存在）。 */
  value?: string
}

/**
 * @description 请求头键值项。
 */
export interface CurlHeaderItem {
  /** header 名。 */
  key: string
  /** header 值。 */
  value: string
  /** 原始表达式。 */
  raw: string
}

/**
 * @description query 参数键值项。
 */
export interface CurlQueryItem {
  /** query 参数名。 */
  key: string
  /** query 参数值。 */
  value: string
}

/**
 * @description body 结构化结果。
 */
export interface ParsedCurlBody {
  /** 原始 body 文本。 */
  raw: string
  /** body 类型。 */
  type: CurlBodyType
  /** JSON 或键值对象。 */
  structured?: unknown
}

/**
 * @description 结构化 curl 请求。
 */
export interface ParsedCurlRequest {
  /** HTTP 方法。 */
  method: string
  /** 原始 URL。 */
  url: string
  /** URL 路径。 */
  path: string
  /** query 参数列表。 */
  query: CurlQueryItem[]
  /** header 列表。 */
  headers: CurlHeaderItem[]
  /** body 信息。 */
  body: ParsedCurlBody
  /** form-data 参数。 */
  forms: CurlQueryItem[]
  /** 未识别参数。 */
  extras: CurlExtraArg[]
  /** 原始 tokens。 */
  tokens: string[]
}

/**
 * @description 表格行类型。
 */
export type CurlTableValueType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array' | 'empty'

/**
 * @description 可视化表格行定义。
 */
export interface CurlTableRow {
  /** 分区名。 */
  section: 'requestLine' | 'query' | 'headers' | 'body' | 'form' | 'extras'
  /** 字段名。 */
  key: string
  /** 字段值。 */
  value: string
  /** 值类型。 */
  valueType: CurlTableValueType
  /** 来源（如 -H、-d、url）。 */
  source: string
  /** 是否变量引用。 */
  isVariableRef: boolean
}

/**
 * @description 分区表结构。
 */
export interface CurlSectionTables {
  /** 请求行分区。 */
  requestLine: CurlTableRow[]
  /** query 分区。 */
  query: CurlTableRow[]
  /** headers 分区。 */
  headers: CurlTableRow[]
  /** body 分区。 */
  body: CurlTableRow[]
  /** form 分区。 */
  form: CurlTableRow[]
  /** extras 分区。 */
  extras: CurlTableRow[]
}

/**
 * @description 解析选项。
 */
export interface ParseCurlCommandOptions {
  /** 是否容忍非 curl 前缀，默认 true。 */
  allowNonCurlPrefix?: boolean
}
