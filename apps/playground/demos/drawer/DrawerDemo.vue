<script setup lang="ts">
import { ref } from 'vue'
import { HDrawer } from '@/components/drawer'

const open = ref(false)
const placement = ref<'left' | 'right' | 'top' | 'bottom'>('right')
</script>

<template>
  <section class="pg-section">
    <h2>Drawer 演示</h2>
    <p class="pg-desc">声明式侧边抽屉，支持四个方向、遮罩关闭、标题和 footer 插槽。</p>

    <div class="pg-card">
      <h3>基础用法</h3>
      <div class="pg-actions">
        <button class="btn btn--blue" @click="open = true">打开抽屉</button>
      </div>
      <div class="pg-actions" style="margin-top: 12px;">
        <button class="btn" :class="{ 'btn--blue': placement === 'left' }" @click="placement = 'left'">left</button>
        <button class="btn" :class="{ 'btn--blue': placement === 'right' }" @click="placement = 'right'">right</button>
        <button class="btn" :class="{ 'btn--blue': placement === 'top' }" @click="placement = 'top'">top</button>
        <button class="btn" :class="{ 'btn--blue': placement === 'bottom' }" @click="placement = 'bottom'">bottom</button>
      </div>
    </div>

    <HDrawer v-model:open="open" :placement="placement" title="Drawer 标题">
      <p>这里放抽屉主体内容。</p>
      <p style="color: #999; margin-top: 8px;">支持表单、详情页、设置面板等内容。</p>
      <template #footer>
        <button class="btn" @click="open = false">取消</button>
        <button class="btn btn--blue" @click="open = false">确定</button>
      </template>
    </HDrawer>
  </section>
</template>
