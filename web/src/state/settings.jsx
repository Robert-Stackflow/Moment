import { createContext, useContext } from 'react'
import api from '../lib/api'

export const SettingsContext = createContext(null)
export const useSettings = () => useContext(SettingsContext)
export async function loadSettings() {
  const [general, meta, content] = await Promise.all([
    api.getGeneralSetting(),
    api.getMetaSetting(),
    api.getContentSetting(),
  ])
  return { general: general.data, meta: meta.data, content: content.data }
}
