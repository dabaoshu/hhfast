<script setup lang="ts">
/**
 * @description Playground 首页：包概览与安装入口，支持中英切换
 */
import { computed, ref } from 'vue'
import { demoGroups, demoRoutePath } from '../router'

type Locale = 'zh' | 'en'

const locale = ref<Locale>(
  typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')
    ? 'zh'
    : 'en',
)

const messages = {
  zh: {
    kicker: 'hhfast 包',
    title: 'Vue 3 UI 原语与框架无关工具库。',
    summary:
      'Playground 汇总了 @nnnb/hhfast-ui 与 @nnnb/hhfast-utils 的交互校验，覆盖包行为、构建产物、demo 路由与移动端导航，便于发版前确认。',
    viewUi: '查看 UI 示例',
    viewUtils: '查看 Utils 示例',
    packageOverview: '包概览',
    uiDesc: 'Vue 3 组件、命令式弹层、表格、抽屉、弹出层与分割面板。',
    utilsDesc: '任务链、后台任务、可断点续传、JSON 树、cURL 解析与通用工具。',
    demos: (count: number) => `${count} 个示例`,
    installLabel: '安装',
    installTitle: '已发布包入口',
    installDesc: '两个包可分别安装。UI 包依赖 Vue，并复用核心工具能力。',
    langSwitch: 'EN',
    langAria: '切换到英文',
  },
  en: {
    kicker: 'hhfast packages',
    title: 'Vue 3 UI primitives and framework-agnostic utilities.',
    summary:
      'The Playground collects interactive checks for @nnnb/hhfast-ui and @nnnb/hhfast-utils, covering package behavior, build output, demo routing and mobile navigation before release.',
    viewUi: 'View UI demos',
    viewUtils: 'View Utils demos',
    packageOverview: 'Package overview',
    uiDesc: 'Vue 3 components, command layers, tables, drawers, popovers and splitters.',
    utilsDesc:
      'Task chains, background tasks, resumable transfer, JSON trees, cURL parsing and shared utilities.',
    demos: (count: number) => `${count} demos`,
    installLabel: 'Install',
    installTitle: 'Published package entry points',
    installDesc: 'The packages can be installed separately. The UI package depends on Vue and reuses core utilities.',
    langSwitch: '中文',
    langAria: 'Switch to Chinese',
  },
} as const

const t = computed(() => messages[locale.value])

const packageCards = computed(() =>
  demoGroups.map(group => ({
    ...group,
    demoCount: group.demos.length,
    firstDemoPath: demoRoutePath(group.basePath, group.demos[0]?.path ?? ''),
    description: group.key === 'ui' ? t.value.uiDesc : t.value.utilsDesc,
  })),
)

/**
 * 在中英文之间切换页面文案
 */
function toggleLocale() {
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
}
</script>

<template>
  <section class="home-demo">
    <div class="home-hero">
      <div class="home-hero-top">
        <p class="home-kicker">{{ t.kicker }}</p>
        <button
          type="button"
          class="home-lang"
          :aria-label="t.langAria"
          @click="toggleLocale"
        >
          {{ t.langSwitch }}
        </button>
      </div>
      <h1>{{ t.title }}</h1>
      <p class="home-summary">
        {{ t.summary }}
      </p>
      <div class="home-actions">
        <RouterLink class="home-action home-action--primary" to="/ui/table">{{ t.viewUi }}</RouterLink>
        <RouterLink class="home-action" to="/utils/works-chain">{{ t.viewUtils }}</RouterLink>
      </div>
    </div>

    <div class="home-grid" :aria-label="t.packageOverview">
      <article v-for="card in packageCards" :key="card.key" class="home-card">
        <div>
          <p class="home-card-label">{{ card.label }}</p>
          <h2>{{ card.key === 'ui' ? '@nnnb/hhfast-ui' : '@nnnb/hhfast-utils' }}</h2>
          <p>{{ card.description }}</p>
        </div>
        <RouterLink class="home-card-link" :to="card.firstDemoPath">
          {{ t.demos(card.demoCount) }}
        </RouterLink>
      </article>
    </div>

    <section class="home-install" aria-labelledby="install-title">
      <div>
        <p class="home-card-label">{{ t.installLabel }}</p>
        <h2 id="install-title">{{ t.installTitle }}</h2>
        <p>{{ t.installDesc }}</p>
      </div>
      <pre><code>pnpm add @nnnb/hhfast-ui @nnnb/hhfast-utils vue
pnpm add @nnnb/hhfast-utils</code></pre>
    </section>
  </section>
</template>

<style scoped>
.home-demo {
  display: grid;
  gap: 24px;
}

.home-hero {
  display: grid;
  gap: 16px;
  padding: 40px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(239, 246, 255, 0.96), rgba(248, 250, 252, 0.98)),
    repeating-linear-gradient(90deg, rgba(22, 119, 255, 0.08) 0 1px, transparent 1px 32px);
}

.home-hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.home-kicker,
.home-card-label {
  margin: 0;
  color: #1677ff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.home-lang {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid #93c5fd;
  border-radius: 8px;
  color: #1677ff;
  font-size: 13px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.85);
  cursor: pointer;
}

.home-hero h1 {
  max-width: 760px;
  margin: 0;
  color: #0f172a;
  font-size: clamp(32px, 6vw, 56px);
  line-height: 1;
}

.home-summary {
  max-width: 720px;
  margin: 0;
  color: #475569;
  font-size: 16px;
  line-height: 1.8;
}

.home-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.home-action,
.home-card-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  color: #0f172a;
  font-weight: 700;
  text-decoration: none;
  background: #fff;
}

.home-action--primary {
  border-color: #1677ff;
  color: #fff;
  background: #1677ff;
}

.home-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.home-card,
.home-install {
  display: grid;
  gap: 18px;
  padding: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}

.home-card h2,
.home-install h2 {
  margin: 8px 0;
  color: #0f172a;
  font-size: 22px;
}

.home-card p,
.home-install p {
  margin: 0;
  color: #64748b;
  line-height: 1.7;
}

.home-install {
  grid-template-columns: minmax(0, 0.9fr) minmax(280px, 1.1fr);
  align-items: center;
}

.home-install pre {
  margin: 0;
  overflow: auto;
  padding: 18px;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 13px;
  line-height: 1.7;
}

@media (max-width: 767px) {
  .home-hero,
  .home-card,
  .home-install {
    padding: 20px;
  }

  .home-grid,
  .home-install {
    grid-template-columns: 1fr;
  }

  .home-actions {
    display: grid;
  }
}
</style>
