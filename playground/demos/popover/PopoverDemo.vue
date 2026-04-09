<script setup lang="ts">
/**
 * @description HPopover 组件演示
 */
import { ref } from 'vue'
import { HPopover } from '@/index'

const manualVisible = ref(false)
const clickCount = ref(0)

const placements = [
  // top row
  { placement: 'top-start' as const, col: 2, row: 1 },
  { placement: 'top' as const, col: 3, row: 1 },
  { placement: 'top-end' as const, col: 4, row: 1 },
  // left col
  { placement: 'left-start' as const, col: 1, row: 2 },
  { placement: 'left' as const, col: 1, row: 3 },
  { placement: 'left-end' as const, col: 1, row: 4 },
  // right col
  { placement: 'right-start' as const, col: 5, row: 2 },
  { placement: 'right' as const, col: 5, row: 3 },
  { placement: 'right-end' as const, col: 5, row: 4 },
  // bottom row
  { placement: 'bottom-start' as const, col: 2, row: 5 },
  { placement: 'bottom' as const, col: 3, row: 5 },
  { placement: 'bottom-end' as const, col: 4, row: 5 },
]
</script>

<template>
  <div class="pg-section">
    <h1>Popover 气泡卡片</h1>
    <p class="pg-desc">点击或悬浮在元素上，弹出气泡式的卡片浮层。</p>

    <!-- 基础用法 -->
    <div class="pg-card">
      <h3>基础用法</h3>
      <p class="pg-desc">最简单的用法，鼠标悬浮触发。</p>
      <div class="pg-actions">
        <HPopover title="标题" content="这是一段弹出卡片的内容。">
          <button class="demo-btn">Hover me</button>
        </HPopover>
      </div>
    </div>

    <!-- 12 方位 -->
    <div class="pg-card">
      <h3>12 方位</h3>
      <p class="pg-desc">支持 12 种弹出方位。</p>
      <div class="placement-grid">
        <div
          v-for="item in placements"
          :key="item.placement"
          class="placement-cell"
          :style="{
            gridColumn: item.col,
            gridRow: item.row,
          }"
        >
          <HPopover
            :placement="item.placement"
            title="弹出标题"
            :content="`方位: ${item.placement}`"
          >
            <button class="demo-btn demo-btn--sm">{{ item.placement }}</button>
          </HPopover>
        </div>
      </div>
    </div>

    <!-- 三种触发方式 -->
    <div class="pg-card">
      <h3>三种触发方式</h3>
      <p class="pg-desc">支持 hover、click、focus 三种触发方式。</p>
      <div class="pg-actions">
        <HPopover trigger="hover" title="Hover 触发" content="鼠标悬浮触发的 Popover。">
          <button class="demo-btn">Hover</button>
        </HPopover>
        <HPopover trigger="click" title="Click 触发" content="点击触发的 Popover，点击外部区域关闭。">
          <button class="demo-btn">Click</button>
        </HPopover>
        <HPopover trigger="focus" title="Focus 触发" content="聚焦触发的 Popover。">
          <input class="demo-input" placeholder="Focus me" />
        </HPopover>
      </div>
    </div>

    <!-- 自定义内容 -->
    <div class="pg-card">
      <h3>自定义内容</h3>
      <p class="pg-desc">使用 title / content 插槽放入复杂内容。</p>
      <div class="pg-actions">
        <HPopover trigger="click" placement="bottom">
          <template #title>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="color: #1677ff; font-size: 16px;">&#9432;</span>
              <span>用户信息</span>
            </div>
          </template>
          <template #content>
            <div style="min-width: 200px;">
              <p style="margin: 0 0 8px 0;">姓名：张三</p>
              <p style="margin: 0 0 8px 0;">邮箱：zhangsan@example.com</p>
              <p style="margin: 0 0 12px 0;">角色：管理员</p>
              <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button class="demo-btn demo-btn--sm">编辑</button>
                <button class="demo-btn demo-btn--sm demo-btn--danger">删除</button>
              </div>
            </div>
          </template>
          <button class="demo-btn">查看用户</button>
        </HPopover>

        <HPopover trigger="click" placement="bottom">
          <template #title>操作确认</template>
          <template #content>
            <div>
              <p style="margin: 0 0 12px 0;">你确定要删除这条记录吗？此操作不可撤销。</p>
              <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button class="demo-btn demo-btn--sm" @click="clickCount++">
                  已点击 {{ clickCount }} 次
                </button>
                <button class="demo-btn demo-btn--sm demo-btn--danger">确认删除</button>
              </div>
            </div>
          </template>
          <button class="demo-btn demo-btn--danger">删除</button>
        </HPopover>
      </div>
    </div>

    <!-- 无标题 -->
    <div class="pg-card">
      <h3>无标题</h3>
      <p class="pg-desc">只提供 content，不显示标题区域。</p>
      <div class="pg-actions">
        <HPopover content="这是一个没有标题的 Popover 内容。">
          <button class="demo-btn">无标题</button>
        </HPopover>
      </div>
    </div>

    <!-- 无箭头 -->
    <div class="pg-card">
      <h3>无箭头</h3>
      <p class="pg-desc">设置 arrow=false 隐藏箭头。</p>
      <div class="pg-actions">
        <HPopover title="无箭头" content="这是一个没有箭头的 Popover。" :arrow="false">
          <button class="demo-btn">No Arrow</button>
        </HPopover>
      </div>
    </div>

    <!-- 手动控制 -->
    <div class="pg-card">
      <h3>手动控制</h3>
      <p class="pg-desc">通过 trigger="manual" 和 v-model:visible 手动控制显隐。</p>
      <div class="pg-actions">
        <button class="demo-btn" @click="manualVisible = !manualVisible">
          {{ manualVisible ? '关闭' : '打开' }} Popover
        </button>
        <HPopover
          trigger="manual"
          v-model:visible="manualVisible"
          title="手动控制"
          content="通过外部状态控制的 Popover。"
        >
          <span class="demo-badge">Target</span>
        </HPopover>
      </div>
    </div>
  </div>
</template>

<style scoped>
.placement-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(5, auto);
  gap: 8px;
  max-width: 640px;
  margin: 0 auto;
}

.placement-cell {
  display: flex;
  justify-content: center;
}

.demo-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  color: #1f1f1f;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.demo-btn:hover {
  color: #1677ff;
  border-color: #1677ff;
}

.demo-btn--sm {
  padding: 2px 10px;
  font-size: 12px;
}

.demo-btn--danger {
  color: #ff4d4f;
  border-color: #ff4d4f;
}

.demo-btn--danger:hover {
  color: #ff7875;
  border-color: #ff7875;
}

.demo-input {
  padding: 6px 12px;
  font-size: 14px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  outline: none;
  transition: border-color 0.2s;
}

.demo-input:focus {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
}

.demo-badge {
  display: inline-block;
  padding: 4px 12px;
  font-size: 13px;
  color: #1677ff;
  background: #e8f0fe;
  border-radius: 4px;
}
</style>
