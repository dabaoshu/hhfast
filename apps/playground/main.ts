import { createApp } from 'vue'

import App from './App.vue'
import HhfastUi from '@/index'
import { router } from './router'

createApp(App).use(HhfastUi).use(router).mount('#app')
