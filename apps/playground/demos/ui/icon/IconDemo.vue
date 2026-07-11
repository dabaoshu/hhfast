<script setup lang="ts">
/**
 * @description Icon 组件演示
 */
import { ref } from 'vue'
import create from '@/components/icon/IconFont'

const MyIcon = create({
  scriptUrl: '//at.alicdn.com/t/font_8d5l8fzk5b87iudi.js',
})

const iconTypes = ref([
  'icon-tuichu',
  'icon-fanhui',
  'icon-qianwang',
  'icon-fenxiang',
  'icon-shezhi',
  'icon-caidan',
])
</script>

<template>
  <section class="pg-section">
    <h2>Icon 演示</h2>
    <p class="pg-desc">
      通过 <code>create({ scriptUrl })</code> 工厂生成 IconFont 函数组件，传入
      <code>type</code> 渲染对应图标。
    </p>

    <div class="pg-card">
      <h3>IconFont 图标</h3>
      <p class="pg-card-desc">
        scriptUrl: <code>//at.alicdn.com/t/font_8d5l8fzk5b87iudi.js</code>
      </p>
      <div class="pg-icon-grid">
        <div v-for="type in iconTypes" :key="type" class="pg-icon-item">
          <MyIcon :type="type" style="font-size: 28px" />
          <span class="pg-icon-label">{{ type }}</span>
        </div>
      </div>
    </div>

    <div class="pg-card">
      <h3>旋转 / 禁用</h3>
      <p class="pg-card-desc">
        <code>spin</code>、<code>rotate</code>、<code>disabled</code> 属性
      </p>
      <div class="pg-icon-grid">
        <div class="pg-icon-item">
          <MyIcon type="icon-shezhi" :spin="true" style="font-size: 28px" />
          <span class="pg-icon-label">spin</span>
        </div>
        <div class="pg-icon-item">
          <MyIcon type="icon-shezhi" :rotate="45" style="font-size: 28px" />
          <span class="pg-icon-label">rotate 45°</span>
        </div>
        <div class="pg-icon-item">
          <MyIcon type="icon-shezhi" :rotate="90" style="font-size: 28px" />
          <span class="pg-icon-label">rotate 90°</span>
        </div>
        <div class="pg-icon-item">
          <MyIcon type="icon-shezhi" :disabled="true" style="font-size: 28px" />
          <span class="pg-icon-label">disabled</span>
        </div>
      </div>
    </div>

    <div class="pg-card">
      <h3>API 概览</h3>
      <table class="pg-table">
        <thead>
          <tr>
            <th>方法</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>create({ scriptUrl })</code></td>
            <td>工厂：注入 iconfont 脚本，返回函数组件</td>
          </tr>
          <tr>
            <td><code>resolveIconFontComponent(url)</code></td>
            <td>缓存版工厂，同一 url 只注入一次</td>
          </tr>
          <tr>
            <td><code>createSvgIcon(svgUrl)</code></td>
            <td>从静态 SVG URL 创建图标组件</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
