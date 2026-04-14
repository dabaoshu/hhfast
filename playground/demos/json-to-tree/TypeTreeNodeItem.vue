<script setup lang="ts">
import { computed } from 'vue'
import type { JsonTreeNode } from '@/index'

defineOptions({
  name: 'TypeTreeNodeItem',
})

interface TypeTreeNodeItemProps {
  node: JsonTreeNode
  level?: number
  defaultExpandLevel?: number
}

const props = withDefaults(defineProps<TypeTreeNodeItemProps>(), {
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
</script>

<template>
  <li :style="nodeIndentStyle">
    <details v-if="hasChildren" :open="isOpenByDefault">
      <summary>
        <strong>{{ node.label }}</strong>
        <span class="tag">{{ node.valueType }}</span>
        <span class="mono">({{ node.path }})</span>
        <span v-if="node.value !== undefined" class="value">= {{ String(node.value) }}</span>
      </summary>
      <ul>
        <TypeTreeNodeItem
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
      <span class="value">= {{ String(node.value) }}</span>
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
  background: #fff7e6;
  color: #ad6800;
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
  color: #531dab;
  font-size: 12px;
  font-family: 'Consolas', 'Menlo', monospace;
}
</style>
