<script setup lang="ts">
/**
 * @description Splitter 分隔面板演示。
 */
import { ref } from 'vue'
import { Splitter, SplitterPanel } from '@/index'
</script>

<template>
  <section class="pg-section">
    <h2>Splitter 分隔面板</h2>
    <p class="pg-desc">
      可拖拽分割区域组件，支持水平/垂直方向、最小/最大约束、面板折叠。
    </p>

    <!-- 基础水平分割 -->
    <div class="pg-card">
      <h3>基础用法</h3>
      <p class="pg-card-desc">水平方向拖拽分割两个区域。</p>
      <div class="demo-container">
        <Splitter orientation="horizontal">
          <SplitterPanel :default-size="'50%'">
            <div class="demo-panel demo-panel--left">
              Panel 1
            </div>
          </SplitterPanel>
          <SplitterPanel :default-size="'50%'">
            <div class="demo-panel demo-panel--right">
              Panel 2
            </div>
          </SplitterPanel>
        </Splitter>
      </div>
    </div>

    <!-- 垂直分割 -->
    <div class="pg-card">
      <h3>垂直方向</h3>
      <p class="pg-card-desc"><code>orientation="vertical"</code> 上下分割。</p>
      <div class="demo-container demo-container--tall">
        <Splitter orientation="vertical">
          <SplitterPanel :default-size="'40%'">
            <div class="demo-panel demo-panel--top">
              Top Panel
            </div>
          </SplitterPanel>
          <SplitterPanel :default-size="'60%'">
            <div class="demo-panel demo-panel--bottom">
              Bottom Panel
            </div>
          </SplitterPanel>
        </Splitter>
      </div>
    </div>

    <!-- 最小/最大约束 -->
    <div class="pg-card">
      <h3>尺寸约束</h3>
      <p class="pg-card-desc">
        左面板 <code>min="20%"</code> <code>max="70%"</code>，右面板 <code>min="100px"</code>。
      </p>
      <div class="demo-container">
        <Splitter orientation="horizontal">
          <SplitterPanel :default-size="'50%'" min="20%" max="70%">
            <div class="demo-panel demo-panel--left">
              Panel 1 (min 20%, max 70%)
            </div>
          </SplitterPanel>
          <SplitterPanel min="100px">
            <div class="demo-panel demo-panel--right">
              Panel 2 (min 100px)
            </div>
          </SplitterPanel>
        </Splitter>
      </div>
    </div>

    <!-- 可折叠 -->
    <div class="pg-card">
      <h3>面板折叠</h3>
      <p class="pg-card-desc">
        悬浮分割条可见折叠箭头，点击折叠/展开面板。
      </p>
      <div class="demo-container">
        <Splitter orientation="horizontal">
          <SplitterPanel :default-size="'30%'" :collapsible="{ start: false, end: true }">
            <div class="demo-panel demo-panel--left">
              侧边栏（可折叠）
            </div>
          </SplitterPanel>
          <SplitterPanel :collapsible="{ start: true, end: false }">
            <div class="demo-panel demo-panel--right">
              主内容区
            </div>
          </SplitterPanel>
        </Splitter>
      </div>
    </div>

    <!-- 三面板 -->
    <div class="pg-card">
      <h3>多面板</h3>
      <p class="pg-card-desc">支持任意数量面板。</p>
      <div class="demo-container">
        <Splitter orientation="horizontal">
          <SplitterPanel :default-size="'25%'" :collapsible="true">
            <div class="demo-panel demo-panel--left">
              左侧
            </div>
          </SplitterPanel>
          <SplitterPanel :default-size="'50%'">
            <div class="demo-panel demo-panel--center">
              中间
            </div>
          </SplitterPanel>
          <SplitterPanel :default-size="'25%'" :collapsible="true">
            <div class="demo-panel demo-panel--right">
              右侧
            </div>
          </SplitterPanel>
        </Splitter>
      </div>
    </div>

    <!-- 嵌套 -->
    <div class="pg-card">
      <h3>嵌套布局</h3>
      <p class="pg-card-desc">Splitter 可以嵌套实现复杂布局。</p>
      <div class="demo-container demo-container--tall">
        <Splitter orientation="horizontal">
          <SplitterPanel :default-size="'30%'" :collapsible="{ end: true }">
            <div class="demo-panel demo-panel--left">
              侧边栏
            </div>
          </SplitterPanel>
          <SplitterPanel>
            <Splitter orientation="vertical">
              <SplitterPanel :default-size="'60%'">
                <div class="demo-panel demo-panel--top">
                  编辑器
                </div>
              </SplitterPanel>
              <SplitterPanel :collapsible="{ start: true }">
                <div class="demo-panel demo-panel--bottom">
                  终端
                </div>
              </SplitterPanel>
            </Splitter>
          </SplitterPanel>
        </Splitter>
      </div>
    </div>

    <!-- 不可拖拽 -->
    <div class="pg-card">
      <h3>禁用拖拽</h3>
      <p class="pg-card-desc"><code>:resizable="false"</code> 禁止拖拽调整。</p>
      <div class="demo-container">
        <Splitter orientation="horizontal">
          <SplitterPanel :default-size="'40%'" :resizable="false">
            <div class="demo-panel demo-panel--left">
              固定宽度
            </div>
          </SplitterPanel>
          <SplitterPanel :resizable="false">
            <div class="demo-panel demo-panel--right">
              固定宽度
            </div>
          </SplitterPanel>
        </Splitter>
      </div>
    </div>
  </section>
</template>

<style scoped>
.demo-container {
  height: 200px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
}

.demo-container--tall {
  height: 360px;
}

.demo-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 14px;
  font-weight: 500;
  color: #555;
}

.demo-panel--left {
  background: #f0f5ff;
}

.demo-panel--right {
  background: #f6ffed;
}

.demo-panel--center {
  background: #fff7e6;
}

.demo-panel--top {
  background: #f0f5ff;
}

.demo-panel--bottom {
  background: #fff1f0;
}
</style>
