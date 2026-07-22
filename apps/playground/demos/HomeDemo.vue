<script setup lang="ts">
import { computed } from 'vue'
import { demoGroups, demoRoutePath } from '../router'

const packageCards = computed(() =>
  demoGroups.map(group => ({
    ...group,
    demoCount: group.demos.length,
    firstDemoPath: demoRoutePath(group.basePath, group.demos[0]?.path ?? ''),
  })),
)
</script>

<template>
  <section class="home-demo">
    <div class="home-hero">
      <p class="home-kicker">hhfast packages</p>
      <h1>Vue 3 UI primitives and framework-agnostic utilities.</h1>
      <p class="home-summary">
        The Playground collects interactive checks for @nnnb/hhfast-ui and @nnnb/hhfast-utils,
        covering package behavior, build output, demo routing and mobile navigation before release.
      </p>
      <div class="home-actions">
        <RouterLink class="home-action home-action--primary" to="/ui/table">View UI demos</RouterLink>
        <RouterLink class="home-action" to="/utils/works-chain">View Utils demos</RouterLink>
      </div>
    </div>

    <div class="home-grid" aria-label="Package overview">
      <article v-for="card in packageCards" :key="card.key" class="home-card">
        <div>
          <p class="home-card-label">{{ card.label }}</p>
          <h2>{{ card.key === 'ui' ? '@nnnb/hhfast-ui' : '@nnnb/hhfast-utils' }}</h2>
          <p>
            {{ card.key === 'ui'
              ? 'Vue 3 components, command layers, tables, drawers, popovers and splitters.'
              : 'Task chains, background tasks, resumable transfer, JSON trees, cURL parsing and shared utilities.' }}
          </p>
        </div>
        <RouterLink class="home-card-link" :to="card.firstDemoPath">
          {{ card.demoCount }} demos
        </RouterLink>
      </article>
    </div>

    <section class="home-install" aria-labelledby="install-title">
      <div>
        <p class="home-card-label">Install</p>
        <h2 id="install-title">Published package entry points</h2>
        <p>The packages can be installed separately. The UI package depends on Vue and reuses core utilities.</p>
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

.home-kicker,
.home-card-label {
  margin: 0;
  color: #1677ff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
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
