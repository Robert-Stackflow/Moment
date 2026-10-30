import '@/styles/reset.css'
import 'uno.css'
import '@/styles/global.scss'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { SettingsContext, loadSettings } from './state/settings'
import { updateMeta } from './lib/meta'
import App from './App'
import GalleryStatus from './components/gallery/GalleryStatus'

const root = createRoot(document.getElementById('app'))
root.render(<GalleryStatus loading />)

async function setupApp() {
  const settings = await loadSettings()
  updateMeta(settings)
  root.render(
    <SettingsContext.Provider value={settings}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SettingsContext.Provider>,
  )
}
setupApp().catch(() => {
  root.render(<GalleryStatus />)
})
