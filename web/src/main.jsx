import '@/styles/reset.css'
import 'uno.css'
import '@/styles/global.scss'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { SettingsContext, loadSettings } from './state/settings'
import { updateMeta } from './lib/meta'
import App from './App'

async function setupApp() {
  const settings = await loadSettings()
  updateMeta(settings)
  createRoot(document.getElementById('app')).render(
    <SettingsContext.Provider value={settings}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SettingsContext.Provider>,
  )
}
setupApp().catch(() => {
  createRoot(document.getElementById('app')).render(
    <>
      <p>相册暂时无法加载，请稍后重试。</p>
      <button onClick={() => window.location.reload()}>重新加载</button>
    </>,
  )
})
