<script setup lang="ts">
/**
 * @description Drawer 演示（声明式 + 命令式栈）
 */
import { h, ref } from 'vue'
import { HDrawer, drawer, createDrawer } from '@/components/drawer'
import { toast } from '@/components/toast'

const open = ref(false)
const placement = ref<'left' | 'right' | 'top' | 'bottom'>('right')
const leftDrawer = createDrawer({ placement: 'left', showConfirm: false })

function openCommandDrawer() {
  drawer.open({
    title: '命令式抽屉',
    placement: placement.value,
    content: () =>
      h('div', [
        h('p', '通过 drawer.open 打开，由 HDrawerLayer 渲染。'),
        h('p', { style: 'color:#999;margin-top:8px;' }, `方向：${placement.value}`),
      ]),
    showConfirm: false,
    showCancel: false,
  })
}

async function confirmDrawer() {
  try {
    await drawer.confirm({
      title: '确认操作',
      placement: 'right',
      content: () => h('p', '确定要继续吗？'),
    })
    toast.success('已确认')
  }
  catch {
    toast.info('已取消')
  }
}

function openLeftFactory() {
  leftDrawer.open({
    title: '左侧工厂抽屉',
    content: () => h('p', 'createDrawer({ placement: "left" }) 固化默认方向。'),
  })
}
</script>

<template>
  <section class="pg-section">
    <h2>Drawer 演示</h2>
    <p class="pg-desc">
      声明式用 <code>HDrawer</code>（v-model:open）；命令式用
      <code>drawer.open</code> / <code>confirm</code>，需根上挂
      <code>HDrawerLayer</code>（playground 已由 ConfigProvider 挂载）。
    </p>

    <div class="pg-card">
      <h3>声明式</h3>
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

    <div class="pg-card">
      <h3>命令式栈</h3>
      <div class="pg-actions">
        <button class="btn" @click="openCommandDrawer">drawer.open</button>
        <button class="btn btn--orange" @click="confirmDrawer">drawer.confirm</button>
        <button class="btn" @click="openLeftFactory">左侧工厂 open</button>
        <button class="btn btn--red" @click="drawer.closeAll()">关闭全部</button>
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
