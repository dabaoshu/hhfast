import { createApp, h } from 'vue'
import HhfastUi from '@nnnb/hhfast-ui'
import '@nnnb/hhfast-ui/index.css'
import { publicApi } from './imports'

createApp({
  render: () => h('main', `hhfast exports: ${Object.keys(publicApi).length}`),
}).use(HhfastUi).mount('#app')
