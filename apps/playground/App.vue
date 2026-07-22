<script setup lang="ts">
/**
 * @description Playground 主布局：左侧分组菜单 + 路由内容区
 */
import { ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { HConfigProvider } from '@/components/config-provider'
import { demoGroups, demoRoutePath } from './router'

const route = useRoute()
const navigationOpen = ref(false)

watch(() => route.fullPath, () => {
  navigationOpen.value = false
})
</script>

<template>
  <HConfigProvider>
    <div class="pg-layout">
      <header class="pg-mobile-header">
        <RouterLink class="pg-logo pg-mobile-logo" to="/">Hhfast Playground</RouterLink>
        <button
          type="button"
          class="pg-menu-button"
          :aria-expanded="navigationOpen"
          aria-controls="playground-navigation"
          aria-label="打开示例导航"
          @click="navigationOpen = !navigationOpen"
        >
          ☰
        </button>
      </header>

      <button
        v-if="navigationOpen"
        type="button"
        class="pg-sidebar-backdrop"
        aria-label="关闭示例导航"
        @click="navigationOpen = false"
      />

      <aside
        id="playground-navigation"
        class="pg-sidebar"
        :class="{ 'pg-sidebar--open': navigationOpen }"
      >
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
              @click="navigationOpen = false"
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

.pg-mobile-header,
.pg-sidebar-backdrop {
  display: none;
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
  min-width: 0;
  padding: 32px 36px 64px;
  max-width: 1200px;
}

@media (max-width: 767px) {
  .pg-layout {
    display: block;
    padding-top: 56px;
  }

  .pg-mobile-header {
    position: fixed;
    inset: 0 0 auto;
    z-index: 120;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    background: #fff;
    border-bottom: 1px solid #e8e8e8;
  }

  .pg-mobile-logo {
    padding: 0;
    border: 0;
  }

  .pg-menu-button {
    border: 0;
    border-radius: 8px;
    background: #f1f5f9;
    color: #1f1f1f;
    width: 40px;
    height: 40px;
    font-size: 22px;
    cursor: pointer;
  }

  .pg-sidebar {
    width: min(280px, calc(100vw - 48px));
    z-index: 140;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
  }

  .pg-sidebar--open {
    transform: translateX(0);
  }

  .pg-sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 130;
    border: 0;
    background: rgba(15, 23, 42, 0.4);
  }

  .pg-main {
    margin-left: 0;
    width: 100%;
    max-width: none;
    padding: 20px 16px 48px;
    overflow-x: hidden;
  }
}
</style>
