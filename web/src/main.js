import '@/styles/reset.css'
import 'uno.css'
import '@/styles/global.scss'
import 'virtual:svg-icons-register'
import { createApp } from 'vue'
import { setupRouter } from '@/router'
import { setupStore } from '@/store'
import App from './App.vue'
import { useResize } from '@/utils'
import { createVfm } from 'vue-final-modal'
import 'vue-final-modal/style.css'

async function setupApp() {
  const app = createApp(App)
  const vfm = createVfm()

  setupStore(app)

  await setupRouter(app)
  app.use(useResize)
  app.use(vfm)
  app.mount('#app')
}

setupApp().catch(() => {
  const root = document.getElementById('app')
  root.replaceChildren()
  const message = document.createElement('p')
  message.textContent = '相册暂时无法加载，请稍后重试。'
  const retry = document.createElement('button')
  retry.textContent = '重新加载'
  retry.onclick = () => window.location.reload()
  root.append(message, retry)
})
