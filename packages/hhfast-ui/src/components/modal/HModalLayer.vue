<script setup lang="ts">
/**
 * @description Modal 逻辑栈的内置渲染层组件。
 *
 * 直接在根组件挂载即可获得开箱即用的弹层 UI：
 * ```vue
 * <template>
 *   <HModalLayer />
 *   <RouterView />
 * </template>
 * ```
 */
import { useModalLayer } from './useModalLayer'

defineOptions({ name: 'HModalLayer' })

const { modalList, loadingMap, handleConfirm, handleCancel, handleMaskClick } = useModalLayer()
</script>

<template>
  <Teleport to="body">
    <div
      v-for="item in modalList"
      :key="item.id"
      class="hh-modal-mask"
      :style="{ zIndex: item.zIndex }"
      @click.self="handleMaskClick(item)"
    >
      <div class="hh-modal-dialog" :class="[`hh-modal--${item.type}`]">
        <div class="hh-modal-header">
          <span class="hh-modal-title">{{ item.title || '弹层' }}</span>
          <button
            type="button"
            class="hh-modal-close-btn"
            @click="handleCancel(item)"
          >
            ×
          </button>
        </div>
        <div class="hh-modal-body">
          <component :is="() => item.content" />
        </div>
        <div
          v-if="item.showConfirm || item.showCancel"
          class="hh-modal-footer"
        >
          <button
            v-if="item.showCancel"
            type="button"
            class="hh-modal-btn hh-modal-btn--cancel"
            @click="handleCancel(item)"
          >
            {{ item.cancelText }}
          </button>
          <button
            v-if="item.showConfirm"
            type="button"
            class="hh-modal-btn hh-modal-btn--confirm"
            :class="{ 'hh-modal-btn--danger': item.type === 'danger' }"
            :disabled="loadingMap[item.id]"
            @click="handleConfirm(item)"
          >
            {{ loadingMap[item.id] ? '处理中…' : item.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.hh-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hh-modal-dialog {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  min-width: 380px;
  max-width: min(520px, calc(100vw - 48px));
  overflow: hidden;
  animation: hh-modal-in 0.2s ease-out;
}

@keyframes hh-modal-in {
  from {
    opacity: 0;
    transform: translateY(-12px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.hh-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.hh-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f1f1f;
}

.hh-modal-close-btn {
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  color: #999;
  padding: 0 4px;
  line-height: 1;
}

.hh-modal-close-btn:hover {
  color: #333;
}

.hh-modal-body {
  padding: 16px 24px;
  font-size: 14px;
  color: #555;
  line-height: 1.6;
  min-height: 48px;
}

.hh-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}

.hh-modal-btn {
  padding: 6px 18px;
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #d9d9d9;
  background: #fff;
  color: #333;
  transition: all 0.15s;
}

.hh-modal-btn:hover {
  border-color: #4096ff;
  color: #4096ff;
}

.hh-modal-btn--confirm {
  background: #1677ff;
  border-color: #1677ff;
  color: #fff;
}

.hh-modal-btn--confirm:hover {
  background: #4096ff;
  border-color: #4096ff;
}

.hh-modal-btn--confirm:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.hh-modal-btn--danger {
  background: #ff4d4f;
  border-color: #ff4d4f;
}

.hh-modal-btn--danger:hover {
  background: #ff7875;
  border-color: #ff7875;
}

.hh-modal--warning .hh-modal-title {
  color: #fa8c16;
}

.hh-modal--danger .hh-modal-title {
  color: #ff4d4f;
}

.hh-modal--success .hh-modal-title {
  color: #52c41a;
}
</style>
