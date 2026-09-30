<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useSettingStore } from '@/store'
import GalleryButton from './GalleryButton.vue'
import { imageURL, photoPath, photoDate, clamp, fitImage, boundedPan } from './gallery'
const props = defineProps({ post: Object, index: Number, previous: Object, following: Object })
const emit = defineEmits(['choose', 'post', 'close'])
const content = useSettingStore().contentSetting
const photo = computed(() => props.post.images[props.index])
const dialog = ref(null),
  stage = ref(null),
  thumbStrip = ref(null)
const loaded = ref(false),
  failed = ref(false),
  displayURL = ref(''),
  natural = ref({ width: 0, height: 0 })
const loadingShown = ref(false),
  caption = ref(null)
const area = ref({ width: innerWidth - 32, height: innerHeight - 210 })
const fit = computed(() =>
  natural.value.width
    ? fitImage(natural.value.width, natural.value.height, area.value.width, area.value.height)
    : { width: Math.min(area.value.width, 560), height: Math.min(area.value.height, 480) },
)
const scale = ref(1),
  pan = ref({ x: 0, y: 0 }),
  dragging = ref(false),
  swipe = ref(0)
const showInfo = ref(!matchMedia('(max-width: 736px)').matches),
  showThumbs = ref(true)
const notice = ref(''),
  shareURL = ref('')
const title = computed(() => photo.value.title || props.post.title)
const description = computed(() => photo.value.desc || props.post.desc)
const location = computed(() => photo.value.location || props.post.location)
const date = computed(() =>
  photoDate(photo.value.time || props.post.time, content.detail_time_format || 'YYYY-MM-DD HH:mm'),
)
const frameStyle = computed(() => ({
  width: fit.value.width + 'px',
  height: fit.value.height + 'px',
}))
const imageStyle = computed(() => ({
  width: fit.value.width + 'px',
  height: fit.value.height + 'px',
  transform:
    'translate(-50%,-50%) translate(' +
    (pan.value.x + swipe.value) +
    'px,' +
    pan.value.y +
    'px) scale(' +
    scale.value +
    ')',
}))
let generation = 0,
  pending,
  resizeObserver,
  notificationTimer,
  loadingTimer,
  focused,
  app,
  previousOverflow,
  previousPadding,
  previousInert
let start,
  pinch,
  hadPinch = false,
  lastTap,
  lastTouchAt = -Infinity
const pointers = new Map()
function resetZoom() {
  scale.value = 1
  pan.value = { x: 0, y: 0 }
  swipe.value = 0
}
function constrain(x, y, zoom = scale.value) {
  return boundedPan(x, y, zoom, fit.value, area.value)
}
function centerPoint(clientX, clientY) {
  const rect = stage.value.getBoundingClientRect()
  return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 }
}
function zoomTo(value, anchor = { x: 0, y: 0 }) {
  const next = clamp(value, 1, 4),
    ratio = next / scale.value
  pan.value = constrain(
    anchor.x - (anchor.x - pan.value.x) * ratio,
    anchor.y - (anchor.y - pan.value.y) * ratio,
    next,
  )
  scale.value = next
}
function toggleZoom(event) {
  if (!loaded.value) return
  zoomTo(
    scale.value > 1 ? 1 : 2,
    event?.clientX ? centerPoint(event.clientX, event.clientY) : undefined,
  )
}
function wheel(event) {
  if (!loaded.value) return
  zoomTo(scale.value * Math.exp(-event.deltaY * 0.002), centerPoint(event.clientX, event.clientY))
}
function pointerDown(event) {
  if (event.button !== 0) return
  if (event.pointerType === 'touch') lastTouchAt = performance.now()
  stage.value.setPointerCapture(event.pointerId)
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  dragging.value = true
  if (pointers.size === 1) {
    hadPinch = false
    start = { x: event.clientX, y: event.clientY, pan: { ...pan.value }, time: performance.now() }
  } else if (pointers.size === 2) {
    hadPinch = true
    const [a, b] = [...pointers.values()]
    pinch = {
      distance: Math.hypot(a.x - b.x, a.y - b.y),
      scale: scale.value,
      pan: { ...pan.value },
      anchor: centerPoint((a.x + b.x) / 2, (a.y + b.y) / 2),
    }
    swipe.value = 0
  }
}
function pointerMove(event) {
  if (!pointers.has(event.pointerId)) return
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (pointers.size === 2 && pinch && loaded.value) {
    const [a, b] = [...pointers.values()]
    const zoom = clamp(
      (pinch.scale * Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(1, pinch.distance),
      1,
      4,
    )
    const mid = centerPoint((a.x + b.x) / 2, (a.y + b.y) / 2)
    pan.value = constrain(
      mid.x - ((pinch.anchor.x - pinch.pan.x) * zoom) / pinch.scale,
      mid.y - ((pinch.anchor.y - pinch.pan.y) * zoom) / pinch.scale,
      zoom,
    )
    scale.value = zoom
  } else if (pointers.size === 1 && start) {
    if (scale.value > 1)
      pan.value = constrain(
        start.pan.x + event.clientX - start.x,
        start.pan.y + event.clientY - start.y,
      )
    else if (!hadPinch) swipe.value = clamp((event.clientX - start.x) * 0.35, -65, 65)
  }
}
function pointerUp(event) {
  if (!pointers.has(event.pointerId)) return
  const dx = event.clientX - start.x,
    dy = event.clientY - start.y
  pointers.delete(event.pointerId)
  if (!pointers.size) {
    dragging.value = false
    swipe.value = 0
    if (event.type !== 'pointercancel' && !hadPinch) {
      if (scale.value === 1 && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.25)
        choose(props.index + (dx < 0 ? 1 : -1))
      else if (
        event.pointerType === 'touch' &&
        Math.hypot(dx, dy) < 10 &&
        performance.now() - start.time < 260
      ) {
        if (
          lastTap &&
          performance.now() - lastTap.time < 300 &&
          Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 30
        ) {
          toggleZoom(event)
          lastTap = null
        } else lastTap = { time: performance.now(), x: event.clientX, y: event.clientY }
      }
    }
  } else {
    const point = [...pointers.values()][0]
    start = { ...point, pan: { ...pan.value }, time: performance.now() }
  }
}
function choose(index) {
  if (index < 0 || index >= props.post.images.length || index === props.index) return
  emit('choose', index)
}
function doubleClick(event) {
  // Touch browsers also synthesize dblclick after our pointer-based double tap.
  if (performance.now() - lastTouchAt > 500) toggleZoom(event)
}
function load() {
  const token = ++generation
  if (pending) {
    pending.onload = null
    pending.onerror = null
  }
  // Retain the previous rectangle while loading. Only a decoded image can
  // supply the next dimensions, so slow requests never cause a placeholder jump.
  loaded.value = false
  failed.value = false
  clearTimeout(loadingTimer)
  loadingShown.value = false
  loadingTimer = setTimeout(() => {
    loadingShown.value = true
  }, 180)
  resetZoom()
  pointers.clear()
  start = null
  pinch = null
  lastTap = null
  dragging.value = false
  const request = new window.Image()
  pending = request
  request.onload = async () => {
    try {
      await request.decode()
    } catch {
      /* Some formats can display even when decode() rejects. */
    }
    if (token !== generation) return
    clearTimeout(loadingTimer)
    loadingShown.value = false
    natural.value = { width: request.naturalWidth, height: request.naturalHeight }
    displayURL.value = request.src
    caption.value = {
      title: title.value,
      description: description.value,
      location: location.value,
      date: date.value,
      metadata: photo.value.metadata,
      categories: props.post.categories,
    }
    loaded.value = true
    if (!navigator.connection?.saveData) {
      for (const index of [props.index - 1, props.index + 1]) {
        const adjacent = props.post.images[index]
        if (adjacent) {
          const image = new window.Image()
          image.fetchPriority = 'low'
          image.src = imageURL(adjacent, content)
        }
      }
    }
  }
  request.onerror = () => {
    if (token === generation) {
      clearTimeout(loadingTimer)
      failed.value = true
      loadingShown.value = true
    }
  }
  request.src = imageURL(photo.value, content)
}
function notify(message) {
  clearTimeout(notificationTimer)
  notice.value = message
  notificationTimer = setTimeout(() => {
    notice.value = ''
  }, 2400)
}
async function share() {
  const url = new URL(photoPath(props.post, photo.value), window.location.origin).href
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ title: props.post.title, url })
      return
    } catch (error) {
      if (error.name === 'AbortError') return
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    notify('已复制当前照片的链接')
  } catch {
    shareURL.value = url
    await nextTick()
    dialog.value.querySelector('.viewer-share-input')?.select()
  }
}
function keydown(event) {
  if (event.key === 'Tab') {
    const controls = [
      ...dialog.value.querySelectorAll('button:not(:disabled),a[href],input'),
    ].filter((node) => node.getClientRects().length)
    const first = controls[0],
      last = controls[controls.length - 1]
    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === dialog.value)
    ) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
    return
  }
  if (event.target.matches('input,textarea')) {
    if (event.key === 'Escape') shareURL.value = ''
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    scale.value > 1 ? resetZoom() : emit('close')
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    if (scale.value > 1)
      pan.value = constrain(pan.value.x + (event.key === 'ArrowLeft' ? 80 : -80), pan.value.y)
    else choose(props.index + (event.key === 'ArrowRight' ? 1 : -1))
  }
  if (scale.value > 1 && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
    event.preventDefault()
    pan.value = constrain(pan.value.x, pan.value.y + (event.key === 'ArrowUp' ? 80 : -80))
  }
  if (event.key === '+' || event.key === '=') {
    event.preventDefault()
    zoomTo(scale.value + 0.5)
  }
  if (event.key === '-') {
    event.preventDefault()
    zoomTo(scale.value - 0.5)
  }
  if (event.key === '0') resetZoom()
  if (event.key === 'Home') {
    event.preventDefault()
    choose(0)
  }
  if (event.key === 'End') {
    event.preventDefault()
    choose(props.post.images.length - 1)
  }
}
watch(
  () => [props.post.id, photo.value.id, photo.value.image_url],
  () => {
    shareURL.value = ''
    notice.value = ''
    load()
    nextTick(() => {
      const item = thumbStrip.value?.querySelector('[aria-current="true"]')
      if (item && thumbStrip.value)
        thumbStrip.value.scrollTo({
          left: item.offsetLeft - thumbStrip.value.clientWidth / 2 + item.clientWidth / 2,
          behavior: 'auto',
        })
    })
  },
  { immediate: true },
)
onMounted(() => {
  focused = document.activeElement
  app = document.getElementById('app')
  previousInert = app.inert
  app.inert = true
  previousOverflow = document.body.style.overflow
  previousPadding = document.body.style.paddingRight
  const scrollbar = innerWidth - document.documentElement.clientWidth
  document.body.style.overflow = 'hidden'
  if (scrollbar) document.body.style.paddingRight = scrollbar + 'px'
  document.body.classList.add('viewer-open')
  dialog.value.focus({ preventScroll: true })
  resizeObserver = new ResizeObserver(() => {
    area.value = { width: stage.value.clientWidth, height: stage.value.clientHeight }
    pan.value = constrain(pan.value.x, pan.value.y)
  })
  resizeObserver.observe(stage.value)
  document.addEventListener('keydown', keydown)
})
onBeforeUnmount(() => {
  generation++
  if (pending) {
    pending.onload = null
    pending.onerror = null
  }
  resizeObserver?.disconnect()
  clearTimeout(notificationTimer)
  clearTimeout(loadingTimer)
  document.removeEventListener('keydown', keydown)
  document.body.style.overflow = previousOverflow
  document.body.style.paddingRight = previousPadding
  document.body.classList.remove('viewer-open')
  if (app) app.inert = previousInert
  if (focused?.isConnected) focused.focus({ preventScroll: true })
})
</script>
<template>
  <section
    ref="dialog"
    class="gallery-viewer lightbox"
    role="dialog"
    aria-modal="true"
    aria-label="照片浏览"
    tabindex="-1"
  >
    <div
      class="viewer-ambient"
      :style="{
        backgroundImage: 'url(' + JSON.stringify(imageURL(photo, content, 'thumbnail')) + ')',
      }"
      aria-hidden="true"
    />
    <header class="viewer-toolbar">
      <div class="viewer-heading">
        <span class="viewer-post-title">{{ post.title }}</span
        ><span class="viewer-counter" aria-live="polite"
          >{{ index + 1 }} <span>/ {{ post.images.length }}</span></span
        >
      </div>
      <div class="viewer-tools">
        <GalleryButton
          :icon="scale > 1 ? 'reset' : 'zoom'"
          :label="scale > 1 ? '还原大小 · 0' : '放大 · 双击照片'"
          :disabled="!loaded"
          :pressed="scale > 1"
          @click="toggleZoom()"
        />
        <GalleryButton
          icon="info"
          label="照片信息"
          :pressed="showInfo"
          @click="showInfo = !showInfo"
        />
        <GalleryButton
          v-if="post.images.length > 1"
          icon="grid"
          label="缩略图"
          :pressed="showThumbs"
          @click="showThumbs = !showThumbs"
        />
        <GalleryButton icon="share" label="分享当前照片" @click="share" />
        <GalleryButton icon="close" label="关闭 · Esc" @click="emit('close')" />
      </div>
    </header>
    <div class="viewer-canvas">
      <div
        ref="stage"
        class="viewer-stage"
        :class="{ 'is-zoomed': scale > 1, 'is-dragging': dragging }"
        @pointerdown="pointerDown"
        @pointermove="pointerMove"
        @pointerup="pointerUp"
        @pointercancel="pointerUp"
        @dblclick="doubleClick"
        @wheel.prevent="wheel"
        @contextmenu.prevent
      >
        <div class="viewer-frame" :style="frameStyle">
          <img
            v-if="!displayURL && !failed"
            class="viewer-placeholder"
            :src="imageURL(photo, content, 'thumbnail')"
            alt=""
            aria-hidden="true"
          />
          <Transition name="viewer-photo-swap">
            <img
              v-if="displayURL"
              :key="displayURL"
              class="viewer-photo"
              :class="{ 'is-pending': !loaded }"
              :src="displayURL"
              :alt="loaded ? title : ''"
              :aria-hidden="!loaded"
              :style="imageStyle"
              draggable="false"
            />
          </Transition>
          <div v-if="!loaded && loadingShown" class="viewer-loading" @pointerdown.stop>
            <template v-if="failed"
              ><span>图片暂时无法加载</span><button @click="load">重新加载</button></template
            >
            <span v-else class="viewer-spinner" role="status" aria-label="正在加载大图" />
          </div>
          <Transition name="viewer-info">
            <div
              v-if="showInfo && caption && scale === 1"
              :key="displayURL"
              class="viewer-caption"
              @pointerdown.stop
              @dblclick.stop
              @wheel.stop
            >
              <h2>{{ caption.title }}</h2>
              <p v-if="caption.description" class="viewer-description">{{ caption.description }}</p>
              <div class="viewer-meta">
                <router-link
                  v-if="content.detail_show_location !== false && caption.location"
                  :to="'/location/' + encodeURIComponent(caption.location)"
                  >{{ caption.location }}</router-link
                >
                <span v-if="content.detail_show_time !== false && caption.date">{{
                  caption.date
                }}</span>
                <span v-if="caption.metadata">{{ caption.metadata }}</span>
              </div>
              <div v-if="caption.categories.length" class="viewer-categories">
                <router-link
                  v-for="category in caption.categories"
                  :key="category.id"
                  :to="'/category/' + encodeURIComponent(category.alias)"
                  >{{ category.name }}</router-link
                >
              </div>
            </div>
          </Transition>
        </div>
      </div>
      <GalleryButton
        v-if="post.images.length > 1"
        class="viewer-arrow viewer-prev"
        icon="left"
        label="上一张 · ←"
        :disabled="index === 0"
        @click="choose(index - 1)"
      />
      <GalleryButton
        v-if="post.images.length > 1"
        class="viewer-arrow viewer-next"
        icon="right"
        label="下一张 · →"
        :disabled="index === post.images.length - 1"
        @click="choose(index + 1)"
      />
      <button v-if="scale > 1" class="viewer-scale" @click="resetZoom">
        {{ Math.round(scale * 100) }}% · 还原
      </button>
    </div>
    <footer class="viewer-footer">
      <div
        v-if="showThumbs"
        ref="thumbStrip"
        class="viewer-thumbnails"
        aria-label="本帖照片"
      >
        <button
          v-for="(item, i) in post.images.length > 1 ? post.images : []"
          :key="item.id"
          :aria-label="'查看第 ' + (i + 1) + ' 张照片'"
          :aria-current="index === i ? 'true' : undefined"
          @click="choose(i)"
        >
          <img :src="imageURL(item, content, 'thumbnail')" alt="" loading="lazy" /><span>{{
            i + 1
          }}</span>
        </button>
      </div>
      <div class="viewer-post-navigation">
        <button v-if="previous" @click="emit('post', previous)">
          <span>←</span> 上一篇<span class="viewer-nav-title">{{ previous.title }}</span>
        </button>
        <span v-else />
        <button class="viewer-back" @click="emit('close')">返回照片墙</button>
        <button v-if="following" @click="emit('post', following)">
          下一篇 <span class="viewer-nav-title">{{ following.title }}</span
          ><span>→</span>
        </button>
        <span v-else />
      </div>
    </footer>
    <Transition name="gallery-tip"
      ><div v-if="notice" class="viewer-notice" role="status">{{ notice }}</div></Transition
    >
    <div v-if="shareURL" class="viewer-share">
      <label for="viewer-share-url">复制照片链接</label
      ><input
        id="viewer-share-url"
        class="viewer-share-input"
        :value="shareURL"
        readonly
      /><GalleryButton icon="close" label="关闭链接" @click="shareURL = ''" />
    </div>
  </section>
</template>
<style>
.gallery-viewer {
  position: fixed;
  inset: 0;
  height: 100dvh;
  z-index: 20000;
  display: flex;
  flex-direction: column;
  background: rgba(13, 15, 18, 0.94);
  backdrop-filter: blur(18px);
  color: #f4f4f4;
  outline: none;
  overflow: hidden;
  font-family: inherit;
  letter-spacing: 0.01em;
}
.viewer-ambient {
  position: absolute;
  inset: -70px;
  background-size: cover;
  background-position: center;
  filter: blur(60px);
  opacity: 0.15;
  pointer-events: none;
}
.viewer-toolbar {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: max(14px, env(safe-area-inset-top)) 24px 14px;
  flex-shrink: 0;
  z-index: 2;
}
.viewer-heading {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}
.viewer-post-title {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.viewer-counter {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.viewer-counter span {
  color: #aaa;
}
.viewer-tools {
  display: flex;
  align-items: center;
  gap: 7px;
}
.viewer-canvas {
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  margin: 0 64px;
  contain: layout style;
}
.viewer-stage {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
  overflow: hidden;
  border-radius: 8px;
  cursor: zoom-in;
  user-select: none;
}
.viewer-stage.is-zoomed {
  cursor: grab;
}
.viewer-stage.is-zoomed.is-dragging {
  cursor: grabbing;
}
.viewer-frame {
  position: relative;
  isolation: isolate;
  flex-shrink: 0;
  background: #131519;
  border-radius: 8px;
  overflow: hidden;
  transform: translateZ(0);
  transition:
    width 0.46s cubic-bezier(0.4, 0, 0.2, 1),
    height 0.46s cubic-bezier(0.4, 0, 0.2, 1);
}
.viewer-stage.is-zoomed .viewer-frame {
  overflow: visible;
  background: transparent;
  transition: none;
}
.viewer-photo {
  position: absolute;
  left: 50%;
  top: 50%;
  display: block;
  max-width: none;
  object-fit: contain;
  transform-origin: center;
  will-change: transform, opacity;
  border-radius: 0;
  transition: opacity 0.36s ease;
}
.viewer-stage:not(.is-dragging) .viewer-photo {
  transition:
    transform 0.16s ease,
    opacity 0.2s ease;
}
.viewer-photo-swap-enter-active,
.viewer-photo-swap-leave-active {
  transition: opacity 0.36s ease 0.06s !important;
}
.viewer-photo-swap-enter-from,
.viewer-photo-swap-leave-to {
  opacity: 0;
}
.viewer-placeholder {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: blur(8px);
  opacity: 0.35;
}
.viewer-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: #ddd;
  font-size: 13px;
  cursor: default;
}
.viewer-loading button {
  color: #fff;
  background: #ffffff18;
  border: 1px solid #ffffff25;
  padding: 7px 14px;
  border-radius: 18px;
  cursor: pointer;
}
.viewer-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #fff3;
  border-top-color: #eee;
  border-radius: 50%;
  animation: viewer-spin 0.7s linear infinite;
}
.viewer-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 60%;
  overflow-y: auto;
  padding: 52px 24px 22px;
  background: linear-gradient(transparent, #080a0dbd);
  border-radius: 0;
  cursor: default;
  text-align: left;
}
.viewer-caption h2 {
  margin: 0;
  color: #fff;
  font-size: clamp(17px, 2vw, 24px);
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.015em;
  overflow-wrap: anywhere;
}
.viewer-description {
  margin: 7px 0 0;
  font-size: 13px;
  line-height: 1.65;
  color: #e2e3e5;
  white-space: pre-line;
  overflow-wrap: anywhere;
}
.viewer-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 12px;
  margin-top: 9px;
  font-size: 11px;
  line-height: 1.5;
  color: #cacdd2;
}
.viewer-meta a {
  color: inherit;
}
.viewer-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.viewer-categories a {
  color: #eee;
  font-size: 11px;
  line-height: 1.4;
  background: #ffffff14;
  border: 1px solid #ffffff1a;
  border-radius: 5px;
  padding: 3px 7px;
}
.viewer-arrow {
  position: absolute;
  top: calc(50% - 21px);
  z-index: 3;
}
.viewer-prev {
  left: -52px;
}
.viewer-next {
  right: -52px;
}
.viewer-scale {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  border: 1px solid #ffffff24;
  background: #181a20c9;
  border-radius: 20px;
  color: white;
  font-size: 11px;
  padding: 6px 12px;
  cursor: pointer;
}
.viewer-footer {
  position: relative;
  flex-shrink: 0;
  padding: 12px 24px max(10px, env(safe-area-inset-bottom));
  z-index: 1;
}
.viewer-thumbnails {
  min-height: 54px;
  position: relative;
  display: flex;
  gap: 8px;
  width: max-content;
  max-width: 100%;
  margin: 0 auto 8px;
  padding: 3px;
  overflow-x: auto;
  scrollbar-width: thin;
}
.viewer-thumbnails button {
  position: relative;
  width: 62px;
  height: 48px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 7px;
  overflow: hidden;
  opacity: 0.55;
  flex-shrink: 0;
  cursor: pointer;
  background: #222;
  transition:
    opacity 0.16s,
    border-color 0.16s;
}
.viewer-thumbnails button[aria-current='true'] {
  opacity: 1;
  border-color: #f4f4f4;
}
.viewer-thumbnails button:hover {
  opacity: 1;
}
.viewer-thumbnails img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.viewer-thumbnails span {
  position: absolute;
  right: 3px;
  bottom: 2px;
  font-size: 9px;
  color: white;
  text-shadow: 0 1px 4px #000;
}
.viewer-post-navigation {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 20px;
  max-width: 1000px;
  margin: auto;
}
.viewer-post-navigation button {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #d3d5d9;
  border: 0;
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  padding: 10px 0;
  min-width: 0;
}
.viewer-post-navigation button:last-child {
  justify-content: flex-end;
}
.viewer-post-navigation .viewer-back {
  color: #969ca6;
  font-size: 11px;
}
.viewer-nav-title {
  color: #858c97;
  max-width: 150px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.viewer-notice {
  position: absolute;
  top: 78px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 16px;
  border-radius: 8px;
  background: #f4f4f5;
  color: #222;
  font-size: 12px;
  white-space: nowrap;
  box-shadow: 0 4px 20px #0003;
  z-index: 5;
}
.viewer-share {
  position: absolute;
  top: 78px;
  right: 24px;
  max-width: calc(100% - 48px);
  padding: 14px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  background: #262932;
  border: 1px solid #ffffff20;
  border-radius: 12px;
  z-index: 5;
}
.viewer-share label {
  width: 100%;
  font-size: 12px;
}
.viewer-share input {
  width: 260px;
  max-width: calc(100% - 55px);
  background: #181b20;
  border: 1px solid #ffffff30;
  border-radius: 6px;
  color: #fff;
  padding: 8px;
  font-size: 12px;
}
.gallery-viewer button:focus-visible,
.gallery-viewer a:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
.viewer-info-enter-active,
.viewer-info-leave-active {
  transition: opacity 0.16s;
}
.viewer-info-enter-from,
.viewer-info-leave-to {
  opacity: 0;
}
@keyframes viewer-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 736px) {
  .viewer-toolbar {
    padding: max(10px, env(safe-area-inset-top)) 12px 10px;
    gap: 8px;
  }
  .viewer-post-title {
    display: none;
  }
  .viewer-heading {
    gap: 0;
  }
  .viewer-tools {
    gap: 5px;
  }
  .viewer-tools .gallery-button {
    width: 44px;
    height: 44px;
  }
  .viewer-canvas {
    margin: 0 8px;
  }
  .viewer-stage,
  .viewer-frame {
    border-radius: 4px;
  }
  .viewer-prev {
    left: 4px;
  }
  .viewer-next {
    right: 4px;
  }
  .viewer-arrow {
    width: 44px;
    height: 44px;
    background: #1b1e2580;
  }
  .viewer-caption {
    padding: 36px 18px 18px;
    max-height: 65%;
  }
  .viewer-caption h2 {
    font-size: 18px;
  }
  .viewer-description {
    font-size: 12px;
  }
  .viewer-footer {
    padding: 10px 12px max(6px, env(safe-area-inset-bottom));
  }
  .viewer-thumbnails button {
    width: 54px;
    height: 43px;
  }
  .viewer-thumbnails {
    min-height: 49px;
    gap: 6px;
  }
  .viewer-post-navigation {
    gap: 12px;
  }
  .viewer-nav-title {
    display: none;
  }
  .viewer-counter {
    font-size: 12px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .viewer-photo,
  .viewer-spinner {
    animation: none;
  }
  .viewer-frame,
  .viewer-stage .viewer-photo,
  .viewer-thumbnails button,
  .viewer-info-enter-active,
  .viewer-info-leave-active,
  .viewer-photo-swap-enter-active,
  .viewer-photo-swap-leave-active {
    transition: none !important;
  }
}
</style>
