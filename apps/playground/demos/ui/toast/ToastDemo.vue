<script setup lang="ts">
/**
 * @description Toast 组件演示
 */
import { toast, createToast } from '@/components/toast'

const customToast = createToast({ placement: 'top-right', duration: 5000 })

function toastBasic(type: 'success' | 'info' | 'warning' | 'error') {
  const msgs: Record<string, string> = {
    success: '操作成功 ✓',
    info: '这是一条提示信息',
    warning: '请注意，操作有风险',
    error: '操作失败，请重试',
  }
  toast[type](msgs[type])
}

function toastCustomPlacement() {
  customToast.success('来自右上角的通知', { placement: 'top-right' })
}

function toastBottom() {
  toast.info('底部消息', { placement: 'bottom' })
}

function toastLongDuration() {
  toast.info('我会停留 10 秒', { duration: 10000 })
}

function toastNoDismiss() {
  toast.warning('不会自动关闭，请手动关闭', { duration: 0 })
}

function pushMany() {
  for (let i = 1; i <= 6; i++) toast.info(`第 ${i} 条消息`)
}
</script>

<template>
  <section class="pg-section">
    <h2>Toast 演示</h2>
    <p class="pg-desc">
      Toast 只提供逻辑（队列、定时器、暂停），UI 由业务自行渲染。<br />
      本页通过 <code>DemoToastLayer</code> 自绘最小视图层。
    </p>

    <div class="pg-card">
      <h3>基础类型</h3>
      <p class="pg-card-desc">
        <code>toast.success / info / warning / error</code>
      </p>
      <div class="pg-actions">
        <button class="btn btn--green" @click="toastBasic('success')">Success</button>
        <button class="btn btn--blue" @click="toastBasic('info')">Info</button>
        <button class="btn btn--orange" @click="toastBasic('warning')">Warning</button>
        <button class="btn btn--red" @click="toastBasic('error')">Error</button>
      </div>
    </div>

    <div class="pg-card">
      <h3>位置 / 时长</h3>
      <p class="pg-card-desc">
        <code>placement</code>、<code>duration</code>、<code>createToast</code> 工厂
      </p>
      <div class="pg-actions">
        <button class="btn" @click="toastCustomPlacement">右上角（工厂实例）</button>
        <button class="btn" @click="toastBottom">底部</button>
        <button class="btn" @click="toastLongDuration">停留 10 秒</button>
        <button class="btn" @click="toastNoDismiss">不自动关闭</button>
      </div>
    </div>

    <div class="pg-card">
      <h3>批量 / 清空</h3>
      <p class="pg-card-desc">
        <code>maxCount=5</code> 超出自动移除最旧，<code>toast.clear()</code> 全部清空
      </p>
      <div class="pg-actions">
        <button class="btn" @click="pushMany">快速推 6 条</button>
        <button class="btn btn--red" @click="toast.clear()">清空全部</button>
      </div>
    </div>
  </section>
</template>
