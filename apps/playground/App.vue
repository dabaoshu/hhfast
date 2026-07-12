<script setup lang="ts">
/**
 * @description Playground 主布局：左侧分组菜单 + 路由内容区
 */
import { RouterLink, RouterView } from 'vue-router'
import { HConfigProvider } from '@/components/config-provider'
import { demoGroups, demoRoutePath } from './router'
</script>

<template>
  <HConfigProvider>
    <div class="pg-layout">
      <aside class="pg-sidebar">
        <RouterLink class="pg-logo" to="/">Hhfast Playground</RouterLink>
        <nav class="pg-nav">
          <section
            v-for="group in demoGroups"
            :key="group.key"
            class="pg-nav-group"
          >
            <div class="pg-nav-group-title">{{ group.label }}</div>
            <RouterLink
              v-for="demo in group.demos"
              :key="demo.path"
              :to="demoRoutePath(group.basePath, demo.path)"
              class="pg-nav-item"
              active-class="pg-nav-item--active"
            >
              {{ demo.label }}
            </RouterLink>
          </section>
        </nav>
      </aside>

      <main class="pg-main">
        <RouterView v-slot="{ Component }">
          <KeepAlive>
            <component :is="Component" />
          </KeepAlive>
        </RouterView>
      </main>
    </div>
  </HConfigProvider>
</template>

<style>
@import './styles/common.css';
</style>

<style scoped>
.pg-layout {
  display: flex;
  min-height: 100vh;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: #1f1f1f;
}

/* ---- Sidebar ---- */
.pg-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 200px;
  height: 100vh;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.pg-logo {
  display: block;
  padding: 20px 20px 16px;
  font-size: 15px;
  font-weight: 700;
  color: #1677ff;
  letter-spacing: 0.3px;
  border-bottom: 1px solid #f0f0f0;
  text-decoration: none;
}

.pg-nav {
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 12px;
  overflow-y: auto;
  flex: 1;
}

.pg-nav-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pg-nav-group-title {
  padding: 4px 12px 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: #999;
}

.pg-nav-item {
  display: block;
  width: 100%;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #555;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
}

.pg-nav-item:hover {
  background: #f5f7fa;
  color: #1677ff;
}

.pg-nav-item--active {
  background: #e8f0fe;
  color: #1677ff;
  font-weight: 600;
}

/* ---- Main ---- */
.pg-main {
  margin-left: 200px;
  flex: 1;
  padding: 32px 36px 64px;
  max-width: 1200px;
}
</style>
