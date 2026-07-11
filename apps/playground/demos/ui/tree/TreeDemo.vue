<script setup lang="ts">
/**
 * @description Tree 组件演示：同时支持 tree/list 两种输入结构。
 */
import { ref } from 'vue'
import { HTree } from '@/components/tree'
import type { TreeNode, TreeRawNode } from '@/components/tree'

const mode = ref<'tree' | 'list'>('tree')
const clickedInfo = ref('尚未点击节点')

const treeData = ref<TreeRawNode[]>([
  {
    id: 1,
    name: '研发中心',
    index: 1,
    children: [
      {
        id: 11,
        name: '前端组',
        index: 1,
        children: [
          { id: 111, name: 'Vue 小队', index: 1 },
          { id: 112, name: 'React 小队', index: 2 },
        ],
      },
      {
        id: 12,
        name: '后端组',
        index: 2,
        children: [{ id: 121, name: 'Java 小队' }],
      },
    ],
  },
  {
    id: 2,
    name: '产品中心',
    index: 2,
    children: [
      { id: 21, name: '产品设计' },
      { id: 22, name: '体验研究' },
    ],
  },
])

const listData = ref<TreeRawNode[]>([
  { id: 1, pid: 0, level: 0, name: '研发中心', index: 1 },
  { id: 2, pid: 0, level: 0, name: '产品中心', index: 2 },
  { id: 11, pid: 1, level: 1, name: '前端组', index: 1 },
  { id: 12, pid: 1, level: 1, name: '后端组', index: 2 },
  { id: 21, pid: 2, level: 1, name: '产品设计', index: 1 },
  { id: 22, pid: 2, level: 1, name: '体验研究', index: 2 },
  { id: 111, pid: 11, level: 2, name: 'Vue 小队', index: 1 },
  { id: 112, pid: 11, level: 2, name: 'React 小队', index: 2 },
  { id: 121, pid: 12, level: 2, name: 'Java 小队', index: 1 },
])

/**
 * @description 记录节点点击信息，便于观察统一事件载荷。
 */
function handleNodeClick(node: TreeNode) {
  clickedInfo.value = `id=${node.id}，name=${node.label}，level=${node.level}`
}
</script>

<template>
  <section class="pg-section">
    <h2>Tree 演示</h2>
    <p class="pg-desc">
      同一组件支持两种数据输入：
      <code>tree(id/children/name/index?)</code>
      与
      <code>list(id/pid/level/index?)</code>。
    </p>

    <div class="pg-card">
      <h3>数据模式切换</h3>
      <p class="pg-card-desc">切换后使用同一个 <code>HTree</code> 组件渲染</p>
      <div class="pg-actions">
        <button class="btn" :class="{ 'btn--blue': mode === 'tree' }" @click="mode = 'tree'">
          tree 模式
        </button>
        <button class="btn" :class="{ 'btn--blue': mode === 'list' }" @click="mode = 'list'">
          list 模式
        </button>
      </div>
    </div>

    <div class="pg-card">
      <h3>组件渲染</h3>
      <p class="pg-card-desc">点击节点可看到统一事件信息，并演示 leaf/nonLeaf 自定义插槽</p>
      <HTree
        :data="mode === 'tree' ? treeData : listData"
        :data-mode="mode"
        @node-click="handleNodeClick"
      >
        <template #nonLeaf="{ node, expanded }">
          <span class="tree-node tree-node--group">
            <span class="tree-node__icon">{{ expanded ? '📂' : '📁' }}</span>
            <span>{{ node.label }}</span>
            <span class="tree-node__meta">({{ node.children.length }})</span>
          </span>
        </template>
        <template #leaf="{ node }">
          <span class="tree-node tree-node--leaf">
            <span class="tree-node__icon">📄</span>
            <span>{{ node.label }}</span>
          </span>
        </template>
      </HTree>
    </div>

    <div class="pg-card">
      <h3>点击事件</h3>
      <p class="pg-card-desc">{{ clickedInfo }}</p>
    </div>
  </section>
</template>

<style scoped>
.tree-node {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tree-node--group {
  color: #1f2937;
  font-weight: 600;
}

.tree-node--leaf {
  color: #4b5563;
}

.tree-node__icon {
  font-size: 12px;
  line-height: 1;
}

.tree-node__meta {
  font-size: 12px;
  color: #9ca3af;
}
</style>
