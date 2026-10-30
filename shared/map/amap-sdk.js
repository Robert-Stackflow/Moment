let pending
export function loadAMap(config) {
  if (window.AMap?.Map) return Promise.resolve(window.AMap)
  if (pending) return pending
  window._AMapSecurityConfig = { serviceHost: new URL(config.serviceHost, location.origin).href }
  pending = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const timer = setTimeout(() => failed(), 15000)
    function failed() {
      clearTimeout(timer)
      script.remove()
      pending = null
      reject(new Error('高德地图暂时无法加载，请重试。'))
    }
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(config.key)}`
    script.async = true
    script.onerror = failed
    script.onload = () => {
      clearTimeout(timer)
      if (!window.AMap?.Map) return failed()
      resolve(window.AMap)
    }
    document.head.appendChild(script)
  })
  return pending
}
