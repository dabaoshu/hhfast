<script setup lang="ts">
import { computed } from 'vue'
import type { JsonTreeNode } from '@/index'

defineOptions({
  name: 'TreeNodeItem',
})

interface TreeNodeItemProps {
  node: JsonTreeNode
  level?: number
  defaultExpandLevel?: number
}

const props = withDefaults(defineProps<TreeNodeItemProps>(), {
  level: 0,
  defaultExpandLevel: 2,
})

/**
 * @description 判断节点是否包含子节点。
 */
const hasChildren = computed(() => {
  return Array.isArray(props.node.children) && props.node.children.length > 0
})

/**
 * @description 判断当前层级是否默认展开。
 */
const isOpenByDefault = computed(() => {
  return props.level < props.defaultExpandLevel
})

/**
 * @description 按层级计算左侧缩进。
 */
const nodeIndentStyle = computed(() => {
  return {
    paddingLeft: `${props.level * 16}px`,
  }
})

/**
 * @description 将值格式化成可读文本。
 * @param value 节点值。
 */
const formatNodeValue = (value: unknown): string => {
  if (value === undefined) {
    return 'undefined'
  }
  if (typeof value === 'string') {
    return `"${value}"`
  }
  try {
    return JSON.stringify(value)
  }
  catch {
    return String(value)
  }
}
</script>

<template>
  <li :style="nodeIndentStyle">
    <details v-if="hasChildren" :open="isOpenByDefault">
      <summary>
        <strong>{{ node.label }}</strong>
        <span class="tag">{{ node.valueType }}</span>
        <span class="mono">({{ node.path }})</span>
      </summary>
      <ul>
        <TreeNodeItem
          v-for="child in node.children"
          :key="child.key"
          :node="child"
          :level="level + 1"
          :default-expand-level="defaultExpandLevel"
        />
      </ul>
    </details>
    <span v-else>
      <strong>{{ node.label }}</strong>
      <span class="tag">{{ node.valueType }}</span>
      <span class="mono">({{ node.path }})</span>
      <span class="value">= {{ formatNodeValue(node.value) }}</span>
    </span>
  </li>
</template>

<style scoped>
li {
  margin: 4px 0;
}

summary {
  cursor: pointer;
}

.tag {
  margin-left: 8px;
  border-radius: 999px;
  padding: 0 8px;
  background: #f0f5ff;
  color: #1d39c4;
  font-size: 12px;
}

.mono {
  margin-left: 8px;
  color: #666;
  font-family: 'Consolas', 'Menlo', monospace;
  font-size: 12px;
}

.value {
  margin-left: 8px;
  color: #237804;
  font-size: 12px;
}
</style>
