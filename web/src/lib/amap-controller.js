import { exploreRequest } from './api'
import { loadAMap } from './amap-sdk'
import { toAMap, fromAMap } from './coordinates'
import { createPhotoMarker } from './map-markers'

export function createAMap(host, getProps, emit, update, config) {
  let map,
    AMap,
    observer,
    controller,
    timer,
    generation = 0,
    disposed = false,
    markers = [],
    mounting
  const readBounds = () => {
    const bounds = map.getBounds(),
      sw = bounds.getSouthWest(),
      ne = bounds.getNorthEast()
    const [west, south] = fromAMap([sw.lng, sw.lat]),
      [east, north] = fromAMap([ne.lng, ne.lat])
    return [
      Math.max(-180, west),
      Math.max(-90, south),
      Math.min(180, east),
      Math.min(90, north),
    ].join(',')
  }
  function clearMarkers() {
    for (const marker of markers) marker.setMap(null)
    markers = []
  }
  function fit(points, maximum = 7) {
    if (!points.length) return
    const west = Math.min(...points.map((p) => p.west)),
      east = Math.max(...points.map((p) => p.east))
    const south = Math.min(...points.map((p) => p.south)),
      north = Math.max(...points.map((p) => p.north))
    map.setBounds(
      new AMap.Bounds(toAMap([west, south]), toAMap([east, north])),
      true,
      [80, 80, 80, 80],
    )
    if (map.getZoom() > maximum) map.setZoom(maximum, true)
  }
  async function load(global = false) {
    if (!map) return mount()
    const token = ++generation
    controller?.abort()
    controller = new AbortController()
    update({ busy: true, error: '' })
    try {
      const data = await exploreRequest(
        'points',
        {
          year: getProps().year,
          zoom: global ? 2 : Math.round(map.getZoom()),
          bounds: global ? '' : readBounds(),
        },
        controller.signal,
      )
      if (disposed || token !== generation) return
      clearMarkers()
      for (const point of data.points) {
        const button = createPhotoMarker(point, getProps, emit)
        const marker = new AMap.Marker({
          position: toAMap([point.longitude, point.latitude]),
          content: button,
          anchor: 'bottom-center',
          offset: new AMap.Pixel(0, -6),
        })
        marker.setMap(map)
        markers.push(marker)
      }
      if (global && data.points.length) {
        fit(data.points)
        changed()
        return
      }
      if (data.truncated) update({ error: '当前位置点较多，请缩小范围后查看。' })
    } catch (error) {
      if (!disposed && token === generation && error.name !== 'AbortError') {
        clearMarkers()
        update({ error: error.message })
      }
    } finally {
      if (!disposed && token === generation) update({ busy: false })
    }
  }
  function changed() {
    if (disposed || !map) return
    const center = map.getCenter(),
      [lng, lat] = fromAMap([center.lng, center.lat])
    emit('bounds', {
      bounds: readBounds(),
      lng: lng.toFixed(5),
      lat: lat.toFixed(5),
      z: Math.round(map.getZoom()),
    })
    clearTimeout(timer)
    timer = setTimeout(() => void load(), 120)
  }
  function mount() {
    if (mounting) return mounting
    update({ busy: true, error: '' })
    mounting = (async () => {
      try {
        AMap = await loadAMap(config)
        if (disposed) return
        const { lat, lng, z } = getProps().initial || {}
        const saved =
          [lat, lng, z].every((value) => value != null && Number.isFinite(+value)) &&
          Math.abs(+lat) <= 85 &&
          Math.abs(+lng) <= 180 &&
          +z >= 1 &&
          +z <= 18
        map = new AMap.Map(host, {
          viewMode: '2D',
          mapStyle: config.style,
          features: ['bg', 'road', 'point'],
          center: saved ? toAMap([+lng, +lat]) : [104, 35],
          zoom: saved ? +z : 3,
          zooms: [2, 18],
          pitchEnable: false,
          rotateEnable: false,
          showIndoorMap: false,
          animateEnable: !matchMedia('(prefers-reduced-motion: reduce)').matches,
          keyboardEnable: true,
        })
        map.on('moveend', changed)
        map.on('zoomend', changed)
        observer = new ResizeObserver(() => map?.resize())
        observer.observe(host)
        if (saved) changed()
        else void load(true)
      } catch {
        if (!disposed) update({ error: '高德地图暂时无法加载，请重试。', busy: false })
      } finally {
        mounting = null
      }
    })()
    return mounting
  }
  return {
    mount,
    load,
    changed,
    reset: () => load(true),
    zoomIn: () => map?.zoomIn(),
    zoomOut: () => map?.zoomOut(),
    focus: (point) => fit([point], Math.min(18, map.getZoom() + 3)),
    dispose() {
      disposed = true
      generation++
      controller?.abort()
      clearTimeout(timer)
      observer?.disconnect()
      clearMarkers()
      map?.destroy()
      map = null
    },
  }
}
