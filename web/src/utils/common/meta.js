import { useSettingStore } from '@/store'
import { isValueNotEmpty } from './common'
export function createLink(rel, href) {
  var link = document.querySelector(`link[rel*='${rel}']`) || document.createElement('link')
  link.type = 'image/x-icon'
  link.rel = `shortcut ${rel}`
  link.href = href
  document.getElementsByTagName('head')[0].appendChild(link)
}
export function createMeta(name, content) {
  var meta = document.querySelector(`meta[name*='${name}']`) || document.createElement('meta')
  meta.name = name
  meta.content = content
  document.getElementsByTagName('head')[0].appendChild(meta)
}
export function createStyle(id, content) {
  var style = document.createElement('style')
  style.id = id
  style.innerHTML = content
  document.getElementsByTagName('head')[0].appendChild(style)
}
export function createScript(id, content) {
  var script = document.createElement('script')
  script.id = id
  script.innerHTML = content
  document.getElementsByTagName('head')[0].appendChild(script)
}
export function loadJs(src) {
  return new Promise((resolve, reject) => {
    let script = document.createElement('script')
    script.src = src
    document.body.appendChild(script)

    script.onload = () => {
      resolve()
    }
    script.onerror = () => {
      reject()
    }
  })
}
export function updateMeta() {
  const settingStore = useSettingStore()
  const site_icon = isValueNotEmpty(settingStore.metaSetting?.site_icon)?settingStore.metaSetting?.site_icon:import.meta.env.VITE_ICON
  const site_name = isValueNotEmpty(settingStore.metaSetting?.site_name)?settingStore.metaSetting?.site_name:import.meta.env.VITE_TITLE
  const site_desc = isValueNotEmpty(settingStore.metaSetting?.site_desc)?settingStore.metaSetting?.site_desc:import.meta.env.VITE_DESC
  const apple_icon = isValueNotEmpty(settingStore.metaSetting?.site_apple_icon)?settingStore.metaSetting?.site_apple_icon:import.meta.env.VITE_ICON
  const custom_css = isValueNotEmpty(settingStore.generalSetting?.custom_css)?settingStore.generalSetting?.custom_css:import.meta.env.CUSTOM_CSS
  const custom_js = isValueNotEmpty(settingStore.generalSetting?.custom_js)?settingStore.generalSetting?.custom_js:import.meta.env.CUSTOM_JS
  const site_keywords = isValueNotEmpty(settingStore.metaSetting?.site_keywords)?settingStore.metaSetting?.site_keywords:import.meta.env.VITE_KEYWORDS
  createLink('icon', site_icon)
  createLink('apple-touch-icon', apple_icon)
  createLink('apple-touch-icon-precomposed', apple_icon)
  createMeta('keywords', site_keywords)
  createMeta('apple-mobile-web-app-title', site_name)
  createMeta('description', site_desc)
  createStyle('custom_css', custom_css)
  createScript('custom_js', custom_js)
}
