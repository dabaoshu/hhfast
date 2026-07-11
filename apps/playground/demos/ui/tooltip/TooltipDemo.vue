<script setup lang="ts">
/**
 * @description Tooltip 组件演示。
 */
import { ref } from 'vue'
import { HTooltip, vTooltip } from '@/index'

const manualVisible = ref(false)
</script>

<template>
  <section class="pg-section">
    <h2>Tooltip 组件</h2>
    <p class="pg-desc">
      支持 <code>&lt;HTooltip&gt;</code> 组件和 <code>v-tooltip</code> 指令两种用法。
    </p>

    <!-- 基础用法 -->
    <div class="pg-card">
      <h3>基础用法</h3>
      <p class="pg-card-desc">鼠标悬浮显示提示。</p>
      <div class="pg-actions">
        <HTooltip content="这是一个提示">
          <button class="btn">悬浮显示</button>
        </HTooltip>
      </div>
    </div>

    <!-- 四个方位 -->
    <div class="pg-card">
      <h3>方位 placement</h3>
      <p class="pg-card-desc">支持 12 个方位：<code>top</code> <code>bottom</code> <code>left</code> <code>right</code> 及其 <code>-start</code> <code>-end</code> 变体。</p>
      <div class="tooltip-placement-grid">
        <div class="tooltip-placement-row">
          <HTooltip content="top-start" placement="top-start">
            <button class="btn">top-start</button>
          </HTooltip>
          <HTooltip content="top" placement="top">
            <button class="btn">top</button>
          </HTooltip>
          <HTooltip content="top-end" placement="top-end">
            <button class="btn">top-end</button>
          </HTooltip>
        </div>
        <div class="tooltip-placement-sides">
          <div class="tooltip-placement-col">
            <HTooltip content="left-start" placement="left-start">
              <button class="btn">left-start</button>
            </HTooltip>
            <HTooltip content="left" placement="left">
              <button class="btn">left</button>
            </HTooltip>
            <HTooltip content="left-end" placement="left-end">
              <button class="btn">left-end</button>
            </HTooltip>
          </div>
          <div class="tooltip-placement-col">
            <HTooltip content="right-start" placement="right-start">
              <button class="btn">right-start</button>
            </HTooltip>
            <HTooltip content="right" placement="right">
              <button class="btn">right</button>
            </HTooltip>
            <HTooltip content="right-end" placement="right-end">
              <button class="btn">right-end</button>
            </HTooltip>
          </div>
        </div>
        <div class="tooltip-placement-row">
          <HTooltip content="bottom-start" placement="bottom-start">
            <button class="btn">bottom-start</button>
          </HTooltip>
          <HTooltip content="bottom" placement="bottom">
            <button class="btn">bottom</button>
          </HTooltip>
          <HTooltip content="bottom-end" placement="bottom-end">
            <button class="btn">bottom-end</button>
          </HTooltip>
        </div>
      </div>
    </div>

    <!-- 触发方式 -->
    <div class="pg-card">
      <h3>触发方式 trigger</h3>
      <p class="pg-card-desc">支持 <code>hover</code>、<code>focus</code>、<code>click</code>、<code>manual</code> 四种方式。</p>
      <div class="pg-actions">
        <HTooltip content="hover 触发" trigger="hover">
          <button class="btn">hover</button>
        </HTooltip>
        <HTooltip content="focus 触发（Tab 键聚焦）" trigger="focus">
          <input class="demo-input" placeholder="focus 触发" />
        </HTooltip>
        <HTooltip content="click 触发" trigger="click">
          <button class="btn">click</button>
        </HTooltip>
        <HTooltip content="manual 手动控制" trigger="manual" :visible="manualVisible">
          <button class="btn" @click="manualVisible = !manualVisible">
            manual ({{ manualVisible ? '显示中' : '已隐藏' }})
          </button>
        </HTooltip>
      </div>
    </div>

    <!-- 自定义内容 -->
    <div class="pg-card">
      <h3>自定义内容 slot</h3>
      <p class="pg-card-desc">通过 <code>#content</code> 插槽自定义提示内容。</p>
      <div class="pg-actions">
        <HTooltip>
          <button class="btn">自定义内容</button>
          <template #content>
            <div style="text-align: center;">
              <strong>标题</strong>
              <p style="margin: 4px 0 0; opacity: 0.85;">这里可以放任意 HTML 内容</p>
            </div>
          </template>
        </HTooltip>
        <HTooltip content="最大宽度 150px" :max-width="150">
          <button class="btn">限制宽度</button>
        </HTooltip>
      </div>
    </div>

    <!-- 禁用 -->
    <div class="pg-card">
      <h3>禁用 disabled</h3>
      <div class="pg-actions">
        <HTooltip content="你看不到我" :disabled="true">
          <button class="btn">disabled</button>
        </HTooltip>
      </div>
    </div>

    <!-- v-tooltip 指令 -->
    <div class="pg-card">
      <h3>v-tooltip 指令</h3>
      <p class="pg-card-desc">轻量指令用法，不增加 DOM 层级。</p>
      <div class="pg-actions">
        <button v-tooltip="'默认顶部提示'" class="btn">
          基础
        </button>
        <button v-tooltip.bottom="'底部提示'" class="btn">
          .bottom
        </button>
        <button v-tooltip.left="'左侧提示'" class="btn">
          .left
        </button>
        <button v-tooltip.right="'右侧提示'" class="btn">
          .right
        </button>
        <button v-tooltip.click="'点击触发'" class="btn">
          .click
        </button>
        <button
          v-tooltip="{ content: '完整配置', placement: 'bottom', maxWidth: 120 }"
          class="btn"
        >
          对象配置
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tooltip-placement-grid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
}

.tooltip-placement-row {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.tooltip-placement-sides {
  display: flex;
  justify-content: space-between;
  width: 400px;
}

.tooltip-placement-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tooltip-placement-col .btn,
.tooltip-placement-row .btn {
  width: 110px;
  text-align: center;
}

.demo-input {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
  outline: none;
}

.demo-input:focus {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.15);
}
</style>
