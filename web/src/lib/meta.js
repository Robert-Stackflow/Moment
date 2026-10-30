import { versionedBrandIcon } from './brand'

export function createStyle(id, content) {
  const style = document.getElementById(id) || document.createElement('style')
  style.id = id
  style.textContent = content || ''
  document.head.appendChild(style)
}
export function updateMeta({ general, meta }) {
  const value = (input, fallback) => (input == null || input === '' ? fallback : input)
  const icons = [
    ['icon', value(meta.site_icon, import.meta.env.VITE_ICON)],
    ['apple-touch-icon', value(meta.site_apple_icon, '/assets/moment-mark.png')],
    ['apple-touch-icon-precomposed', value(meta.site_apple_icon, '/assets/moment-mark.png')],
  ]
  for (const [rel, href] of icons) {
    const link = document.querySelector(`link[rel~='${rel}']`) || document.createElement('link'),
      icon = versionedBrandIcon(href)
    const extension = new URL(icon, window.location.href).pathname.split('.').pop()?.toLowerCase(),
      type = { svg: 'image/svg+xml', png: 'image/png', ico: 'image/x-icon' }[extension]
    if (type) link.type = type
    else link.removeAttribute('type')
    link.rel = rel
    link.href = icon
    document.head.appendChild(link)
  }
  for (const [name, content] of [
    ['keywords', value(meta.site_keywords, import.meta.env.VITE_KEYWORDS)],
    ['apple-mobile-web-app-title', value(meta.site_name, import.meta.env.VITE_TITLE)],
    ['description', value(meta.site_desc, import.meta.env.VITE_DESC)],
  ]) {
    const element =
      document.querySelector(`meta[name*='${name}']`) || document.createElement('meta')
    element.name = name
    element.content = content || ''
    document.head.appendChild(element)
  }
  createStyle('custom_css', value(general.custom_css, import.meta.env.CUSTOM_CSS))
  const script = document.createElement('script')
  script.id = 'custom_js'
  script.textContent = value(general.custom_js, import.meta.env.CUSTOM_JS) || ''
  document.head.appendChild(script)
}
