import '@/styles/reset.css'
import 'uno.css'
import '@/styles/global.scss'
import 'virtual:svg-icons-register'
import { createApp } from 'vue'
import { setupRouter } from '@/router'
import { setupStore } from '@/store'
import App from './App.vue'
import { setupDirectives } from './directives'
import { useResize } from '@/utils'
import i18n from '~/i18n'
import { createVfm } from 'vue-final-modal'
import 'vue-final-modal/style.css'

async function setupApp() {
  const app = createApp(App)
  const vfm = createVfm()

  setupStore(app)

  await setupRouter(app)
  setupDirectives(app)
  app.use(useResize)
  app.use(i18n)
  app.use(vfm)
  app.mount('#app')
}

setupApp()
