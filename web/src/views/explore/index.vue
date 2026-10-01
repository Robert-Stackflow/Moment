<script setup>
import { computed, defineAsyncComponent, ref, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettingStore } from '@/store'
import api from '@/api'
import GalleryLightbox from '../home/components/GalleryLightbox.vue'
import { imageURL, focusPosition } from '../home/components/gallery'
import { exploreRequest } from './request'
const PhotoMap = defineAsyncComponent(() => import('./PhotoMap.vue'))
const route = useRoute(),
  router = useRouter(),
  settings = useSettingStore()
const mode = route.path === '/map' ? 'map' : 'timeline'
const enabled = settings.contentSetting?.[mode + '_enabled'] !== false
const photos = ref([]),
  years = ref([]),
  loading = ref(false),
  error = ref(''),
  total = ref(0),
  bounds = ref(''),
  chosen = ref(false),
  map = ref(null)
const selected = ref(null),
  detailError = ref(''),
  detailLoading = ref(false)
let page = 0,
  generation = 0,
  controller,
  detailGeneration = 0,
  disposed = false
const year = computed(() => String(route.query.year || ''))
const groups = computed(() => {
  const items = []
  for (const photo of photos.value) {
    const label =
      mode === 'map'
        ? '当前区域'
        : photo.time
        ? photo.time.slice(0, 7).replace('-', ' 年 ') + ' 月'
        : '日期未记录'
    let group = items[items.length - 1]
    if (!group || group.label !== label) {
      group = { label, photos: [] }
      items.push(group)
    }
    group.photos.push(photo)
  }
  return items
})
const index = computed(() =>
  Math.max(
    0,
    selected.value?.images.findIndex((p) => String(p.id) === String(route.query.photo)) ?? 0
  )
)
const position = computed(() =>
  photos.value.findIndex((p) => String(p.photo_id) === String(route.query.photo))
)
const postStub = (p) => (p ? { id: p.post_id, title: p.title, images: [{ id: p.photo_id }] } : null)
const previous = computed(() =>
  postStub(
    photos.value
      .slice(0, position.value)
      .reverse()
      .find((p) => p.post_id !== selected.value?.id)
  )
)
const following = computed(() =>
  postStub(photos.value.slice(position.value + 1).find((p) => p.post_id !== selected.value?.id))
)
async function load(reset = false) {
  if (!enabled) return
  if (reset) {
    controller?.abort()
    generation++
    page = 0
    photos.value = []
    total.value = 0
    loading.value = false
  }
  if (loading.value) return
  controller = new AbortController()
  const current = generation
  loading.value = true
  error.value = ''
  try {
    const data = await exploreRequest(
      'photos',
      { view: mode, year: year.value, bounds: bounds.value, page: page + 1, page_size: 48 },
      controller.signal
    )
    if (current !== generation || disposed) return
    photos.value.push(...data.photos)
    total.value = data.total
    page++
  } catch (e) {
    if (e.name !== 'AbortError' && current === generation) error.value = e.message
  } finally {
    if (current === generation) loading.value = false
  }
}
async function loadYears() {
  try {
    years.value = await exploreRequest('years', { view: mode })
  } catch {
    if (!disposed) error.value = '年份暂时无法加载，请重试'
  }
}
function retry() {
  void load(true)
  void loadYears()
}
function filterYear(next) {
  router.replace({
    path: route.path,
    query: { ...route.query, year: next || undefined, post: undefined, photo: undefined },
  })
}
function areaChanged(area) {
  bounds.value = area.bounds
  chosen.value = false
  void load(true)
  router.replace({
    path: route.path,
    query: { ...route.query, lat: area.lat, lng: area.lng, z: area.z },
  })
}
function selectArea(area) {
  bounds.value = area
  chosen.value = true
  void load(true)
}
function pathFor(post, photo = post.images[0]) {
  const query = new URLSearchParams({
    ...route.query,
    post: String(post.id),
    photo: String(photo.id),
  })
  return `${route.path}?${query}`
}
function open(photo) {
  router.push({
    path: route.path,
    query: { ...route.query, post: photo.post_id, photo: photo.photo_id },
    state: { discoveryOverlay: true },
  })
}
function choose(i) {
  if (selected.value?.images[i]) router.replace(pathFor(selected.value, selected.value.images[i]))
}
function choosePost(post) {
  if (post) router.replace(pathFor(post))
}
function close() {
  if (window.history.state.discoveryOverlay) router.back()
  else
    router.replace({
      path: route.path,
      query: { ...route.query, post: undefined, photo: undefined },
    })
}
async function detail() {
  const current = ++detailGeneration
  detailError.value = ''
  if (!route.query.post) {
    selected.value = null
    detailLoading.value = false
    return
  }
  if (selected.value?.id === Number(route.query.post)) return
  selected.value = null
  detailLoading.value = true
  try {
    const result = await api.getBlogVisitor(route.query.post)
    if (!disposed && current === detailGeneration) selected.value = result.data
  } catch {
    if (current === detailGeneration) detailError.value = '照片暂时无法打开，可能已隐藏或删除。'
  } finally {
    if (current === detailGeneration) detailLoading.value = false
  }
}
function fallback(event, photo) {
  if (!event.target.dataset.fallback) {
    event.target.dataset.fallback = '1'
    event.target.src = photo.image_url
  } else event.target.classList.add('failed')
}
watch(year, () => {
  chosen.value = false
  if (mode === 'timeline') void load(true)
})
watch(() => [route.query.post, route.query.photo], detail, { immediate: true })
if (enabled) {
  void loadYears()
  void load(true)
}
onBeforeUnmount(() => {
  disposed = true
  generation++
  detailGeneration++
  controller?.abort()
})
</script>
<template>
  <main id="blog-main" class="explore-page" :class="'explore-' + mode">
    <div class="explore-heading">
      <div>
        <h1>{{ mode === 'map' ? '地图' : '拍摄时间线' }}</h1>
        <span>{{ total }} 张照片{{ chosen ? ' · 所选位置' : '' }}</span>
      </div>
      <router-link
        :to="{ path: mode === 'map' ? '/timeline' : '/map', query: { year: year || undefined } }"
        v-if="
          settings.contentSetting?.[(mode === 'map' ? 'timeline' : 'map') + '_enabled'] !== false
        "
        >{{ mode === 'map' ? '按时间浏览' : '在地图上看' }}
        <span aria-hidden="true">↗</span></router-link
      >
    </div>
    <div v-if="!enabled" class="explore-status">
      此浏览入口已关闭。<router-link to="/">返回照片墙</router-link>
    </div>
    <template v-else>
      <nav class="explore-years" aria-label="按拍摄年份筛选">
        <button :aria-pressed="!year" @click="filterYear('')">全部年份</button
        ><button
          v-for="item in years"
          :key="item.year"
          :aria-pressed="year === item.year"
          :aria-label="`${item.year === 'unknown' ? '日期未记录' : item.year + ' 年'}，${
            item.count
          } 张照片`"
          @click="filterYear(item.year)"
        >
          {{ item.year === 'unknown' ? '日期未记录' : item.year }}<small>{{ item.count }}</small>
        </button>
      </nav>
      <div class="explore-content">
        <PhotoMap
          v-if="mode === 'map'"
          ref="map"
          :year="year"
          :initial="route.query"
          @bounds="areaChanged"
          @select="selectArea"
        />
        <div class="explore-feed" :aria-busy="loading">
          <button v-if="chosen" class="explore-reset" @click="map.reset()">取消位置筛选</button>
          <section v-for="group in groups" :key="group.label" class="explore-group">
            <h2>{{ group.label }}</h2>
            <div class="explore-photos">
              <a
                v-for="photo in group.photos"
                :key="photo.photo_id"
                :href="pathFor(postStub(photo))"
                class="explore-photo"
                @click="
                  (e) => {
                    if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                      e.preventDefault()
                      open(photo)
                    }
                  }
                "
                ><img
                  :src="imageURL(photo, settings.contentSetting, 'thumbnail', 640)"
                  :style="{ objectPosition: focusPosition(photo) }"
                  alt=""
                  loading="lazy"
                  @error="fallback($event, photo)"
                />
                <div>
                  <strong>{{ photo.title }}</strong
                  ><span v-if="settings.contentSetting?.thumbnail_show_location !== false">{{
                    photo.location
                  }}</span
                  ><time
                    v-if="photo.time && settings.contentSetting?.thumbnail_show_time !== false"
                    :datetime="photo.time.replace(' ', 'T')"
                    >{{ photo.time.slice(0, 10) }}</time
                  >
                </div></a
              >
            </div>
          </section>
          <div v-if="!photos.length && !loading && !error" class="explore-status">
            {{
              mode === 'map'
                ? '这里还没有公开位置的照片。试试其他区域或年份。'
                : '这个年份还没有照片。'
            }}<button v-if="mode === 'map'" @click="map.reset()">查看全部位置</button>
          </div>
          <div v-if="error" class="explore-status" role="alert">
            {{ error }}<button @click="retry">重试</button>
          </div>
          <div class="explore-more">
            <span v-if="loading" role="status">正在加载照片…</span
            ><button v-else-if="photos.length < total && !error" @click="load()">加载更多</button>
          </div>
        </div>
      </div>
    </template>
  </main>
  <Teleport to="body"
    ><Transition name="viewer-fade"
      ><GalleryLightbox
        v-if="selected"
        :post="selected"
        :index="index"
        :previous="previous"
        :following="following"
        :path-for="pathFor"
        @choose="choose"
        @post="choosePost"
        @close="close"
      />
      <div v-else-if="detailLoading || detailError" class="explore-detail-status" role="status">
        <p>{{ detailError || '正在打开照片…' }}</p>
        <button v-if="detailError" @click="detail">重试</button
        ><button @click="close">返回浏览</button>
      </div></Transition
    ></Teleport
  >
</template>
<style>
#blog-main.explore-page {
  display: block;
  background: #202428;
  min-height: calc(100dvh - 80px);
  color: #c3c8ce;
}
.explore-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 34px 40px 22px;
}
.explore-heading > div {
  display: flex;
  gap: 16px;
  align-items: baseline;
}
.explore-heading h1 {
  font-size: 26px;
  line-height: 1.3;
  letter-spacing: 0.01em;
  font-weight: 500;
  margin: 0;
}
.explore-heading span {
  font-size: 12px;
  line-height: 1.5;
  color: #97a0ab;
}
.explore-heading > a {
  font-size: 13px;
  border: 0;
}
.explore-years {
  padding: 0 40px 22px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  scroll-padding-inline: 20px;
}
.explore-years::-webkit-scrollbar { display: none; }
.explore-years button:focus-visible { outline: 2px solid #dbeaff; outline-offset: -3px; }
.explore-years button {
  flex-shrink: 0;
  border: 1px solid #ffffff0d;
  border-radius: 24px;
  background: transparent;
  color: #a4aeb8;
  font: inherit;
  font-size: 12px;
  padding: 7px 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 160ms, color 160ms;
}
.explore-years button[aria-pressed='true'] {
  background: #d0d8e2;
  color: #25323e;
  border-color: transparent;
}
.explore-years small {
  font-size: 10px;
  margin-left: 7px;
  opacity: 0.65;
}
.explore-content {
  min-width: 0;
}
.explore-timeline .explore-feed {
  padding: 0 40px 20px;
  max-width: 1800px;
  margin: auto;
}
.explore-group h2 {
  font-size: 15px;
  letter-spacing: 0.04em;
  margin: 24px 0 18px;
  color: #b5c1ca;
  font-weight: 400;
}
.explore-photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 18px;
}
.explore-photo {
  position: relative;
  display: block;
  border: 0;
  overflow: hidden;
  border-radius: 8px;
  aspect-ratio: 1.15;
  background: #293138;
}
.explore-photo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 260ms ease;
}
.explore-photo:hover img {
  transform: scale(1.025);
}
.explore-photo:focus-visible {
  outline: 2px solid #dbeaff;
  outline-offset: 4px;
}
.explore-photo > div {
  position: absolute;
  inset: 30% 0 0;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background: linear-gradient(transparent, #101720d9);
  pointer-events: none;
}
.explore-photo strong {
  color: #f2f4f5;
  font-size: 15px;
  font-weight: 500;
  text-shadow: 0 1px 3px #0004;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.explore-photo span,
.explore-photo time {
  font-size: 11px;
  color: #bac3cc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.explore-photo img.failed {
  opacity: 0;
}
.explore-more,
.explore-status {
  padding: 30px 20px;
  text-align: center;
  font-size: 13px;
  color: #94a0ae;
}
.explore-status button,
.explore-status a {
  display: block;
  margin: 16px auto;
}
.explore-more button,
.explore-status button,
.explore-reset {
  background: #ffffff0c;
  border: 1px solid #ffffff18;
  color: #d0d8e2;
  border-radius: 8px;
  padding: 9px 15px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.explore-reset {
  margin: 15px 0 0;
}
.explore-map .explore-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  height: calc(100dvh - 234px);
  min-height: 430px;
}
.explore-map .explore-feed {
  overflow-y: auto;
  padding: 0 18px 20px;
}
.explore-map .explore-group h2 {
  margin-top: 18px;
}
.explore-map .explore-photos {
  grid-template-columns: 1fr;
  gap: 14px;
}
.explore-map .explore-photo {
  aspect-ratio: 1.45;
}
.explore-detail-status {
  position: fixed;
  inset: 0;
  z-index: 30000;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background: #171c22ed;
  color: #d1d8e0;
  font-size: 14px;
}
.explore-detail-status button {
  border: 0;
  background: none;
  color: white;
  font: inherit;
  cursor: pointer;
}
@media (max-width: 1000px) {
  .explore-map .explore-content {
    grid-template-columns: minmax(0, 1fr) 260px;
  }
  .explore-heading {
    padding-inline: 24px;
  }
  .explore-years {
    padding-inline: 24px;
  }
  .explore-timeline .explore-feed {
    padding-inline: 24px;
  }
}
@media (max-width: 736px) {
  #blog-main.explore-page {
    min-height: calc(100dvh - 60px);
  }
  .explore-heading {
    padding: 24px 16px 18px;
    gap: 12px;
  }
  .explore-heading > div {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 7px;
  }
  .explore-heading h1 {
    font-size: 22px;
    margin-bottom: 0;
  }
  .explore-heading > a {
    font-size: 12px;
  }
  .explore-years {
    padding: 0 16px 16px;
  }
  .explore-map .explore-content {
    display: block;
    height: auto;
    min-height: 0;
  }
  .explore-map .explore-map-wrap {
    height: 48dvh;
    min-height: 320px;
  }
  .explore-map .explore-feed {
    overflow: visible;
    padding: 0 16px 30px;
  }
  .explore-map .explore-photos {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .explore-map .explore-photo {
    aspect-ratio: 0.85;
  }
  .explore-timeline .explore-feed {
    padding: 0 16px 25px;
  }
  .explore-photos {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .explore-photo {
    aspect-ratio: 0.85;
  }
  .explore-photo > div {
    padding: 12px;
  }
  .explore-photo strong {
    font-size: 13px;
  }
  .explore-map-tools {
    right: 12px;
    top: 12px;
  }
  .explore-detail-status {
    flex-direction: column;
  }
}
@media (prefers-reduced-motion: reduce) {
  .explore-photo img,
  .explore-years button {
    transition: none;
  }
}
</style>
