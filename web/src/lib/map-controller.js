import L from 'leaflet'
import land from '../../../shared/map/land.json'
import { exploreRequest } from './api'
export function createPhotoMap(host, getProps, emit, update) {
  let map,
    markers,
    tiles,
    resize,
    controller,
    disposed = false,
    fitPoints = [],
    generation = 0
  function boundsString() {
    const b = map.getBounds(),
      w = Math.max(-180, b.getWest()),
      e = Math.min(180, b.getEast())
    return [
      w,
      b.getSouth() < -84 ? -90 : Math.max(-90, b.getSouth()),
      e,
      b.getNorth() > 84 ? 90 : Math.min(90, b.getNorth()),
    ].join(',')
  }
  function changed() {
    const p = map.getCenter()
    emit('bounds', {
      bounds: boundsString(),
      lat: p.lat.toFixed(5),
      lng: p.lng.toFixed(5),
      z: map.getZoom(),
    })
    void load()
  }
  async function load(global = false) {
    const current = ++generation
    controller?.abort()
    controller = new AbortController()
    update({
      busy: true,
    })
    update({
      error: '',
    })
    try {
      const data = await exploreRequest(
        'points',
        {
          year: getProps().year,
          zoom: global ? 2 : Math.round(map.getZoom()),
          bounds: global ? '' : boundsString(),
        },
        controller.signal,
      )
      if (disposed || current !== generation) return
      if (global) {
        fitPoints = data.points.flatMap((p) => [
          [p.south, p.west],
          [p.north, p.east],
        ])
        if (fitPoints.length) {
          map.fitBounds(fitPoints, {
            padding: [45, 45],
            maxZoom: 7,
            animate: false,
          })
          changed()
          return
        }
      }
      markers.clearLayers()
      for (const point of data.points) {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'explore-map-marker'
        button.textContent = String(point.count)
        button.setAttribute('aria-label', `${point.count} 张照片，查看此处`)
        L.marker([Math.max(-85, Math.min(85, point.latitude)), point.longitude], {
          icon: L.divIcon({
            html: button,
            className: 'explore-marker-host',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          }),
          keyboard: false,
        }).addTo(markers)
        L.DomEvent.disableClickPropagation(button)
        button.addEventListener('click', () => {
          if (
            point.count > 1 &&
            (point.north - point.south > 0.0001 || point.east - point.west > 0.0001)
          )
            map.fitBounds(
              [
                [point.south, point.west],
                [point.north, point.east],
              ],
              {
                padding: [70, 70],
                maxZoom: Math.min(18, map.getZoom() + 3),
                animate: !matchMedia('(prefers-reduced-motion: reduce)').matches,
              },
            )
          else emit('select', [point.west, point.south, point.east, point.north].join(','))
        })
      }
      if (data.truncated)
        update({
          error: '当前位置点较多，请缩小范围后查看。',
        })
    } catch (e) {
      if (e.name !== 'AbortError' && current === generation) {
        markers?.clearLayers()
        update({
          error: e.message,
        })
      }
    } finally {
      if (current === generation)
        update({
          busy: false,
        })
    }
  }
  function reset() {
    void load(true)
  }
  function toggleDetailed() {
    if (tiles) {
      map.removeLayer(tiles)
      tiles = null
      update({
        detailed: false,
      })
      update({
        tileError: false,
      })
      return
    }
    update({
      consent: true,
    })
  }
  function accept() {
    update({
      consent: false,
    })
    update({
      detailed: true,
    })
    update({
      tileError: false,
    })
    tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      noWrap: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(map)
    tiles.on('tileerror', () => {
      update({
        tileError: true,
      })
    })
  }
  function mount() {
    map = L.map(host, {
      zoomControl: false,
      minZoom: 1,
      maxZoom: 18,
      maxBounds: [
        [-85, -180],
        [85, 180],
      ],
      maxBoundsViscosity: 1,
      zoomAnimation: !matchMedia('(prefers-reduced-motion: reduce)').matches,
    }).setView([20, 100], 2)
    L.geoJSON(land, {
      interactive: false,
      style: {
        color: '#4b616e',
        weight: 0.8,
        fillColor: '#536871',
        fillOpacity: 0.3,
      },
    }).addTo(map)
    map.attributionControl.setPrefix(false)
    map.attributionControl.addAttribution(
      '<a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a>',
    )
    markers = L.layerGroup().addTo(map)
    map.on('moveend', changed)
    resize = new ResizeObserver(() => map.invalidateSize())
    resize.observe(host)
    const { lat, lng, z } = getProps().initial || {}
    if (
      lat != null &&
      lng != null &&
      z != null &&
      Number.isFinite(+lat) &&
      Number.isFinite(+lng) &&
      Math.abs(+lat) <= 85 &&
      Math.abs(+lng) <= 180 &&
      +z >= 1 &&
      +z <= 18
    ) {
      map.setView([+lat, +lng], +z, {
        animate: false,
      })
      changed()
    } else void load(true)
  }
  return {
    mount,
    reset,
    changed,
    load,
    toggleDetailed,
    accept,
    zoomIn: () => map.zoomIn(),
    zoomOut: () => map.zoomOut(),
    dispose() {
      disposed = true
      generation++
      controller?.abort()
      resize?.disconnect()
      map?.remove()
    },
  }
}
