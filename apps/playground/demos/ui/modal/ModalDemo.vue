<script setup lang="ts">
/**
 * @description Modal 组件演示（命令式栈 + 声明式 HModal）
 */
import { h, ref } from 'vue'
import { toast } from '@/components/toast'
import { HModal, modal, createModal } from '@/components/modal'

const dangerModal = createModal({ type: 'danger' })
const declarativeOpen = ref(false)
const declarativeLoading = ref(false)

function modalBasicOpen() {
  modal.open({
    title: '基础弹层',
    content: () =>
      h('div', [
        h('p', '这是一个通过 modal.open 打开的弹层。'),
        h('p', { style: 'color: #999; font-size: 13px;' }, '点击蒙层或 × 关闭。'),
      ]),
    showConfirm: false,
    showCancel: false,
  })
}

async function modalConfirmDemo() {
  try {
    await modal.confirm({
      title: '确认操作',
      type: 'warning',
      content: () => h('p', '确定要执行此操作吗？此操作不可撤销。'),
    })
    toast.success('用户点击了确认')
  } catch {
    toast.info('用户取消了操作')
  }
}

async function modalAsyncConfirm() {
  try {
    await modal.confirm({
      title: '异步确认',
      content: () => h('p', '确认后将模拟 2 秒异步请求…'),
      onConfirm: () => new Promise((resolve) => setTimeout(resolve, 2000)),
    })
    toast.success('异步操作完成')
  } catch {
    toast.info('已取消')
  }
}

async function modalDangerConfirm() {
  try {
    await dangerModal.confirm({
      title: '危险操作',
      content: () =>
        h('div', [
          h('p', { style: 'color: #ff4d4f;' }, '⚠ 此操作将永久删除数据。'),
          h('p', '删除后无法恢复，请谨慎操作。'),
        ]),
      confirmText: '确认删除',
    })
    toast.success('已删除')
  } catch {
    toast.info('已取消删除')
  }
}

function modalStack() {
  modal.open({
    title: '第一层',
    content: () => h('p', '这是第一层弹层，可以继续打开更多层。'),
    showConfirm: false,
  })
  setTimeout(() => {
    modal.open({
      title: '第二层',
      content: () => h('p', '这是第二层弹层，叠加在第一层之上。'),
      showConfirm: false,
    })
  }, 300)
}

function modalCustomContent() {
  modal.open({
    title: '自定义内容',
    content: () =>
      h('div', { style: 'text-align: center; padding: 12px 0;' }, [
        h('div', { style: 'font-size: 48px; margin-bottom: 12px;' }, '🎉'),
        h('p', { style: 'font-size: 16px; font-weight: 600;' }, '恭喜完成！'),
        h('p', { style: 'color: #999;' }, '你已成功完成所有步骤。'),
      ]),
    showCancel: false,
    confirmText: '太棒了',
  })
}

function modalOnlyTitle() {
  modal
    .confirm({ title: '确认退出当前页面？', type: 'info' })
    .then(() => toast.success('确认退出'))
    .catch(() => toast.info('取消退出'))
}

/**
 * 声明式确认：自行控制 loading 与关闭。
 */
async function onDeclarativeConfirm() {
  declarativeLoading.value = true
  await new Promise((r) => setTimeout(r, 800))
  declarativeLoading.value = false
  declarativeOpen.value = false
  toast.success('声明式确认完成')
}
</script>

<template>
  <section class="pg-section">
    <h2>Modal 演示</h2>
    <p class="pg-desc">
      声明式用 <code>HModal</code>（v-model，不入栈）；命令式用
      <code>modal.open</code> / <code>confirm</code>，由
      <code>HModalLayer</code> / Demo 渲染层展示。<br />
      <code>modal.confirm()</code> 返回 Promise：确认 → resolve，取消 → reject。
    </p>

    <div class="pg-card">
      <h3>HModal — 声明式</h3>
      <p class="pg-card-desc">v-model 控制，不入全局栈；确认需自行关闭</p>
      <div class="pg-actions">
        <button class="btn" @click="declarativeOpen = true">打开声明式 Modal</button>
      </div>
      <HModal
        v-model="declarativeOpen"
        title="声明式弹层"
        :confirm-loading="declarativeLoading"
        @confirm="onDeclarativeConfirm"
      >
        <p>这是 HModal 声明式用法，与 modal.open 栈互不影响。</p>
      </HModal>
    </div>

    <div class="pg-card">
      <h3>modal.open — 基础弹层</h3>
      <p class="pg-card-desc">入栈展示，点蒙层/× 关闭</p>
      <div class="pg-actions">
        <button class="btn" @click="modalBasicOpen">打开基础弹层</button>
        <button class="btn" @click="modalCustomContent">自定义内容（🎉）</button>
        <button class="btn" @click="modalStack">多层叠加</button>
        <button class="btn btn--red" @click="modal.closeAll()">关闭全部</button>
      </div>
    </div>

    <div class="pg-card">
      <h3>modal.confirm — Promise 确认/取消</h3>
      <p class="pg-card-desc">
        确认 → <code>resolve(values)</code>，取消/关闭 → <code>reject</code>
      </p>
      <div class="pg-actions">
        <button class="btn btn--orange" @click="modalConfirmDemo">
          确认操作（warning）
        </button>
        <button class="btn btn--blue" @click="modalAsyncConfirm">
          异步确认（2s 延迟）
        </button>
        <button class="btn btn--red" @click="modalDangerConfirm">
          危险确认（danger 工厂）
        </button>
        <button class="btn" @click="modalOnlyTitle">
          纯标题确认（无 content）
        </button>
      </div>
    </div>
  </section>
</template>
