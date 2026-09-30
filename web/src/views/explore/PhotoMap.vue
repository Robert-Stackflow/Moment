<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import land from '../../../../shared/map/land.json'
import GalleryButton from '../home/components/GalleryButton.vue'
import { exploreRequest } from './request'
const props = defineProps({ year: String, initial: Object })
const emit = defineEmits(['bounds', 'select'])
const consentCard = ref(null)
const host = ref(null),
  error = ref(''),
  detailed = ref(false),
  consent = ref(false),
  tileError = ref(false),
  busy = ref(false)
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
  busy.value = true
  error.value = ''
  try {
    const data = await exploreRequest(
      'points',
      {
        year: props.year,
        zoom: global ? 2 : Math.round(map.getZoom()),
        bounds: global ? '' : boundsString(),
      },
      controller.signal
    )
    if (disposed || current !== generation) return
    if (global) {
      fitPoints = data.points.flatMap((p) => [
        [p.south, p.west],
        [p.north, p.east],
      ])
      if (fitPoints.length) {
        map.fitBounds(fitPoints, { padding: [45, 45], maxZoom: 7, animate: false })
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
            }
          )
        else emit('select', [point.west, point.south, point.east, point.north].join(','))
      })
    }
    if (data.truncated) error.value = '当前位置点较多，请缩小范围后查看。'
  } catch (e) {
    if (e.name !== 'AbortError' && current === generation) {
      markers?.clearLayers()
      error.value = e.message
    }
  } finally {
    if (current === generation) busy.value = false
  }
}
function reset() {
  void load(true)
}
function toggleDetailed() {
  if (tiles) {
    map.removeLayer(tiles)
    tiles = null
    detailed.value = false
    tileError.value = false
    return
  }
  consent.value = true
}
function accept() {
  consent.value = false
  detailed.value = true
  tileError.value = false
  tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    noWrap: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
  }).addTo(map)
  tiles.on('tileerror', () => {
    tileError.value = true
  })
}
onMounted(() => {
  map = L.map(host.value, {
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
    style: { color: '#4b616e', weight: 0.8, fillColor: '#536871', fillOpacity: 0.3 },
  }).addTo(map)
  map.attributionControl.setPrefix(false)
  map.attributionControl.addAttribution(
    '<a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a>'
  )
  markers = L.layerGroup().addTo(map)
  map.on('moveend', changed)
  resize = new ResizeObserver(() => map.invalidateSize())
  resize.observe(host.value)
  const { lat, lng, z } = props.initial || {}
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
    map.setView([+lat, +lng], +z, { animate: false })
    changed()
  } else void load(true)
})
watch(
  () => props.year,
  () => {
    if (map) changed()
  }
)
watch(consent, async (open) => {
  if (open) {
    await nextTick()
    consentCard.value?.focus()
  }
})
onBeforeUnmount(() => {
  disposed = true
  generation++
  controller?.abort()
  resize?.disconnect()
  map?.remove()
})
defineExpose({ reset })
</script>
<template>
  <div class="explore-map-wrap" :aria-busy="busy">
    <div ref="host" class="photo-map-canvas" aria-label="照片地图，可用方向键移动，加减键缩放" />
    <div class="explore-map-tools">
      <GalleryButton icon="zoom" label="放大地图" @click="map.zoomIn()" /><GalleryButton
        icon="reset"
        label="缩小地图"
        @click="map.zoomOut()"
      /><GalleryButton icon="expand" label="查看全部位置" @click="reset" /><GalleryButton
        icon="map"
        :label="detailed ? '仅使用本地轮廓' : '加载详细地图'"
        :pressed="detailed"
        @click="toggleDetailed"
      />
    </div>
    <div v-if="busy" class="map-loading" role="status">正在加载位置…</div>
    <div v-if="error || tileError" class="map-message" role="status">
      {{ error || (tileError ? '详细地图暂时无法加载，可切回本地轮廓。' : '') }}
      <button v-if="error" @click="load()">重试</button>
    </div>
    <div
      v-if="consent"
      ref="consentCard"
      class="map-consent"
      role="dialog"
      tabindex="-1"
      aria-label="加载详细地图"
      @keydown.esc.stop="consent = false"
    >
      <strong>查看街道与地名</strong>
      <p>将向 OpenStreetMap 发送当前地图区域和网络地址。坐标不会用于搜索或地理编码。</p>
      <div>
        <button @click="consent = false">暂不加载</button
        ><button @click="accept">加载详细地图</button>
      </div>
    </div>
  </div>
</template>
<style>
.explore-map-wrap {
  position: relative;
  isolation: isolate;
  height: 100%;
  min-height: 300px;
  background: #1b242c;
}
.photo-map-canvas {
  height: 100%;
  min-height: 300px;
  background: radial-gradient(ellipse at 50% 40%, #283b44, #182229);
}
.explore-map .leaflet-control-attribution {
  font-size: 10px;
  background: #182229d9;
  color: #abb6bb;
  padding: 3px 6px;
}
.explore-map .leaflet-control-attribution a {
  color: #bccbd4;
}
.explore-map-tools {
  position: absolute;
  right: 18px;
  top: 18px;
  display: flex;
  gap: 7px;
  z-index: 600;
}
.explore-map-tools .gallery-button {
  background: #202c34ed;
  width: 36px;
  height: 36px;
}
.explore-map-marker {
  width: 40px;
  height: 40px;
  background: #d5dde3;
  color: #25333e;
  border: 3px solid #ffffff8c;
  border-radius: 50%;
  box-shadow: 0 3px 12px #0005;
  font: 600 13px system-ui;
  cursor: pointer;
  transition: background 150ms, box-shadow 150ms;
}
.explore-map-marker:hover {
  background: #fff;
  box-shadow: 0 0 0 6px #cadcf025;
}
.explore-map-marker:focus-visible {
  outline: 3px solid white;
  outline-offset: 4px;
}
.map-loading,
.map-message {
  position: absolute;
  left: 18px;
  bottom: 30px;
  z-index: 600;
  background: #192027eb;
  color: #ced6e0;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  max-width: calc(100% - 36px);
}
.map-message {
  bottom: 55px;
}
.map-message button {
  color: white;
  margin-left: 8px;
  background: none;
  border: 0;
  cursor: pointer;
}
.map-consent {
  position: absolute;
  z-index: 650;
  right: 18px;
  top: 65px;
  width: 300px;
  max-width: calc(100% - 36px);
  padding: 20px;
  background: #202a33;
  border: 1px solid #ffffff20;
  border-radius: 14px;
  box-shadow: 0 10px 30px #0005;
  color: #c9d0d8;
  font-size: 13px;
  line-height: 1.8;
}
.map-consent p {
  margin: 10px 0 18px;
}
.map-consent > div {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
.map-consent button {
  border: 1px solid #ffffff25;
  border-radius: 7px;
  background: #ffffff0c;
  color: white;
  padding: 6px 10px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}
@media (prefers-reduced-motion: reduce) {
  .explore-map-marker {
    transition: none;
  }
}
</style>
