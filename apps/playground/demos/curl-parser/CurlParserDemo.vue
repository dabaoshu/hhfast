<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  parseCurlCommand,
  toFlatTableRows,
  toSectionTables,
  type CurlSectionTables,
  type CurlTableRow,
  type ParsedCurlRequest,
} from '@nnnb/hhfast-utils'

type ViewMode = 'single' | 'section'

const input = ref(`curl 'https://api.example.com/v1/users?limit=20&keyword=$keyword' \
  -X POST \
  -H 'Authorization: Bearer $token' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice","age":18,"active":true}' \
  --compressed`)

const errorMessage = ref('')
const parsed = ref<ParsedCurlRequest | null>(null)
const flatRows = ref<CurlTableRow[]>([])
const sectionRows = ref<CurlSectionTables | null>(null)
const viewMode = ref<ViewMode>('single')

/**
 * @description 触发 curl 文本解析并刷新表格数据。
 */
const handleParse = (): void => {
  errorMessage.value = ''
  try {
    const request = parseCurlCommand(input.value)
    parsed.value = request
    flatRows.value = toFlatTableRows(request)
    sectionRows.value = toSectionTables(request)
  }
  catch (error) {
    parsed.value = null
    flatRows.value = []
    sectionRows.value = null
    errorMessage.value = error instanceof Error ? error.message : String(error)
  }
}

/**
 * @description 填充 form-data 示例。
 */
const fillFormDataExample = (): void => {
  input.value = `curl "https://upload.example.com/files?bucket=demo" \
  -H "Authorization: Bearer \${token}" \
  -F "file=@avatar.png" \
  -F "scene=profile" \
  --retry 2`
  handleParse()
}

/**
 * @description 填充 urlencoded 示例。
 */
const fillUrlEncodedExample = (): void => {
  input.value = `curl "https://api.example.com/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "username=alice&password=$password&remember=true"`
  handleParse()
}

/**
 * @description 计算 section 模式下可见分区列表。
 */
const sectionEntries = computed(() => {
  if (!sectionRows.value) {
    return []
  }
  return [
    { key: 'requestLine', label: 'Request Line', rows: sectionRows.value.requestLine },
    { key: 'query', label: 'Query', rows: sectionRows.value.query },
    { key: 'headers', label: 'Headers', rows: sectionRows.value.headers },
    { key: 'body', label: 'Body', rows: sectionRows.value.body },
    { key: 'form', label: 'Form Data', rows: sectionRows.value.form },
    { key: 'extras', label: 'Extras', rows: sectionRows.value.extras },
  ].filter(item => item.rows.length > 0)
})

handleParse()
</script>

<template>
  <section class="curl-parser-demo">
    <h2 class="curl-parser-demo__title">Curl Parser Demo</h2>
    <p class="curl-parser-demo__desc">
      输入 curl 命令后，解析成结构化请求并展示为可视化表格。支持单表模式（全字段混排）和分区模式（请求行、Query、Headers、Body、Form、Extras）。
    </p>

    <div class="curl-parser-demo__toolbar">
      <button type="button" class="btn btn--primary" @click="handleParse">
        解析命令
      </button>
      <button type="button" class="btn" @click="fillUrlEncodedExample">
        填充 urlencoded 示例
      </button>
      <button type="button" class="btn" @click="fillFormDataExample">
        填充 form-data 示例
      </button>
      <label class="mode-select">
        <span>视图模式</span>
        <select v-model="viewMode">
          <option value="single">单表</option>
          <option value="section">分区表</option>
        </select>
      </label>
    </div>

    <div class="panel">
      <h3 class="panel__title">Curl 输入</h3>
      <textarea
        v-model="input"
        class="curl-input mono"
        spellcheck="false"
        placeholder="请输入 curl 命令"
      />
      <p v-if="errorMessage" class="error">解析失败：{{ errorMessage }}</p>
    </div>

    <div class="panel">
      <h3 class="panel__title">解析摘要</h3>
      <div v-if="parsed" class="summary-grid">
        <div class="summary-item">
          <span class="summary-item__label">Method</span>
          <span class="mono">{{ parsed.method }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-item__label">URL</span>
          <span class="mono">{{ parsed.url || '-' }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-item__label">Path</span>
          <span class="mono">{{ parsed.path }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-item__label">Body Type</span>
          <span class="mono">{{ parsed.body.type }}</span>
        </div>
      </div>
      <div v-else class="empty">暂无结果</div>
    </div>

    <div v-if="viewMode === 'single'" class="panel">
      <h3 class="panel__title">单表视图</h3>
      <div class="table-wrap">
        <table class="result-table">
          <thead>
            <tr>
              <th>section</th>
              <th>key</th>
              <th>value</th>
              <th>type</th>
              <th>source</th>
              <th>isVariableRef</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in flatRows" :key="`${row.section}-${row.key}-${index}`">
              <td class="mono">{{ row.section }}</td>
              <td class="mono">{{ row.key }}</td>
              <td class="mono">{{ row.value || '-' }}</td>
              <td class="mono">{{ row.valueType }}</td>
              <td class="mono">{{ row.source }}</td>
              <td>{{ row.isVariableRef ? 'yes' : 'no' }}</td>
            </tr>
            <tr v-if="flatRows.length === 0">
              <td colspan="6" class="empty">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="section-grid">
      <div
        v-for="section in sectionEntries"
        :key="section.key"
        class="panel"
      >
        <h3 class="panel__title">{{ section.label }}</h3>
        <div class="table-wrap">
          <table class="result-table">
            <thead>
              <tr>
                <th>key</th>
                <th>value</th>
                <th>type</th>
                <th>source</th>
                <th>isVariableRef</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in section.rows" :key="`${section.key}-${row.key}-${index}`">
                <td class="mono">{{ row.key }}</td>
                <td class="mono">{{ row.value || '-' }}</td>
                <td class="mono">{{ row.valueType }}</td>
                <td class="mono">{{ row.source }}</td>
                <td>{{ row.isVariableRef ? 'yes' : 'no' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-if="sectionEntries.length === 0" class="panel">
        <div class="empty">暂无分区数据</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.curl-parser-demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.curl-parser-demo__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.curl-parser-demo__desc {
  margin: 0;
  color: #666;
}

.curl-parser-demo__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.panel {
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  background: #fff;
  padding: 12px;
}

.panel__title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 600;
}

.btn {
  border: 1px solid #d9d9d9;
  background: #fff;
  color: #333;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 13px;
  cursor: pointer;
}

.btn--primary {
  background: #1677ff;
  border-color: #1677ff;
  color: #fff;
}

.mode-select {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #555;
}

.mode-select select {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 13px;
  background: #fff;
}

.curl-input {
  width: 100%;
  min-height: 180px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 10px;
  resize: vertical;
  font-size: 13px;
  line-height: 1.5;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 10px;
}

@media (max-width: 820px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}

.summary-item {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-item__label {
  color: #888;
  font-size: 12px;
}

.table-wrap {
  width: 100%;
  overflow: auto;
}

.result-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.result-table th,
.result-table td {
  border-bottom: 1px solid #f0f0f0;
  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
}

.result-table th {
  background: #fafafa;
  font-weight: 600;
}

.section-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 960px) {
  .section-grid {
    grid-template-columns: 1fr;
  }
}

.error {
  margin: 8px 0 0;
  color: #cf1322;
  font-size: 13px;
}

.empty {
  color: #999;
  font-size: 13px;
}

.mono {
  font-family: 'Consolas', 'Menlo', monospace;
  word-break: break-word;
}
</style>
