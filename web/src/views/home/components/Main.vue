<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettingStore } from '@/store'
import api from '@/api'
import Image from './Image.vue'
import GalleryLightbox from './GalleryLightbox.vue'
import { photoPath } from './gallery'
const route = useRoute(),
  router = useRouter(),
  settings = useSettingStore()
const blogs = ref([]),
  loading = ref(false),
  loadError = ref(false),
  total = ref(0),
  sentinel = ref(null)
const selected = ref(null),
  detailLoading = ref(false),
  detailError = ref(''),
  photoIndex = ref(0)
const pageSize = Math.min(100, Math.max(1, Number(settings.contentSetting?.page_size || 20)))
const baseTitle = settings.metaSetting?.site_name || import.meta.env.VITE_TITLE
const initialReturn = window.history.state.galleryReturn
let wallPath =
  typeof initialReturn === 'string' && /^\/(category\/|location\/|$)/.test(initialReturn)
    ? initialReturn
    : '/'
let page = 0,
  generation = 0,
  detailGeneration = 0,
  observer,
  mounted = false,
  disposed = false
let filters = {}
const more = computed(() => blogs.value.length < total.value)
const postIndex = computed(() => blogs.value.findIndex((post) => post.id === selected.value?.id))
const previous = computed(() => blogs.value[postIndex.value - 1])
const following = computed(() => (postIndex.value >= 0 ? blogs.value[postIndex.value + 1] : null))
async function loadMore() {
  if (loading.value || (page && !more.value)) return
  const token = generation
  loading.value = true
  loadError.value = false
  try {
    const result = await api.getBlogsVisitor({ page: page + 1, page_size: pageSize, ...filters })
    if (token !== generation || disposed) return
    blogs.value.push(...result.data)
    total.value = result.total
    page++
  } catch {
    if (token === generation) loadError.value = true
  } finally {
    if (token === generation) {
      loading.value = false
      // An observer does not re-fire while a short page leaves the sentinel in view.
      await nextTick()
      if (
        mounted &&
        !loadError.value &&
        more.value &&
        !selected.value &&
        sentinel.value?.getBoundingClientRect().top < innerHeight + 500
      )
        void loadMore()
    }
  }
}
function resetWall(path) {
  generation++
  page = 0
  total.value = 0
  blogs.value = []
  loading.value = false
  const params = router.resolve(path).params
  filters = {
    ...(params.category ? { category: params.category } : {}),
    ...(params.location ? { location: params.location } : {}),
  }
  void loadMore()
}
async function resolveDetail() {
  const token = ++detailGeneration
  if (!route.params.post) {
    selected.value = null
    detailLoading.value = false
    detailError.value = ''
    document.title = baseTitle
    if (route.params.location) document.title = route.params.location + ' · ' + baseTitle
    if (route.params.category) {
      api
        .getCategoryByAliasVisitor({ alias: route.params.category })
        .then((result) => {
          if (!disposed && token === detailGeneration)
            document.title = result.data.name + ' · ' + baseTitle
        })
        .catch(() => {})
    }
    if (wallPath !== route.path || (!page && !loading.value)) {
      wallPath = route.path
      resetWall(wallPath)
    }
    return
  }
  detailError.value = ''
  const id = Number(route.params.post)
  let post = selected.value?.id === id ? selected.value : blogs.value.find((item) => item.id === id)
  if (!post) {
    selected.value = null
    detailLoading.value = true
    try {
      post = (await api.getBlogVisitor(id)).data
    } catch {
      if (token === detailGeneration) detailError.value = '这篇帖子不存在、未公开，或暂时无法加载。'
    }
  }
  if (token !== detailGeneration || disposed) return
  detailLoading.value = false
  if (post) {
    selected.value = post
    photoIndex.value = Math.max(
      0,
      post.images.findIndex((photo) => String(photo.id) === String(route.query.photo)),
    )
    document.title = post.title + ' · ' + baseTitle
    if (postIndex.value === blogs.value.length - 1 && more.value) void loadMore()
  }
}
function open(post) {
  router.push({
    path: '/post/' + post.id,
    query: { photo: post.images[0].id },
    state: { galleryOverlay: true, galleryReturn: wallPath },
  })
}
function choosePhoto(index) {
  if (!selected.value || index < 0 || index >= selected.value.images.length) return
  router.replace(photoPath(selected.value, selected.value.images[index]))
}
function choosePost(post) {
  if (post) router.replace(photoPath(post))
}
function close() {
  if (window.history.state.galleryOverlay) router.back()
  else router.replace(wallPath)
}
resetWall(wallPath)
watch(() => route.fullPath, resolveDetail, { immediate: true })
onMounted(() => {
  mounted = true
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !loadError.value && !selected.value) void loadMore()
    },
    { rootMargin: '600px' },
  )
  if (sentinel.value) observer.observe(sentinel.value)
})
onBeforeUnmount(() => {
  disposed = true
  generation++
  detailGeneration++
  observer?.disconnect()
})
</script>
<template>
  <main id="blog-main" :aria-busy="loading">
    <Image v-for="(blog, index) in blogs" :key="blog.id" :data="blog" :index="index" @open="open" />
    <template v-if="loading && !blogs.length"
      ><div v-for="n in 6" :key="'skeleton' + n" class="thumb gallery-skeleton" aria-hidden="true"
    /></template>
    <div v-if="!loading && !loadError && !blogs.length" class="gallery-status">
      这里还没有公开的照片。<router-link v-if="route.path !== '/'" to="/">查看全部</router-link>
    </div>
    <div v-if="loadError" class="gallery-status" role="alert">
      相册暂时无法加载。<button @click="loadMore">重试</button>
    </div>
  </main>
  <div ref="sentinel" class="gallery-sentinel">
    <span v-if="loading" role="status">正在加载照片…</span>
    <button v-else-if="more && !loadError" @click="loadMore">加载更多</button>
  </div>
  <Teleport to="body"
    ><Transition name="viewer-fade">
      <GalleryLightbox
        v-if="selected"
        :post="selected"
        :index="photoIndex"
        :previous="previous"
        :following="following"
        @choose="choosePhoto"
        @post="choosePost"
        @close="close"
      />
      <div v-else-if="detailLoading || detailError" class="gallery-detail-status" role="status">
        <p>{{ detailLoading ? '正在打开照片…' : detailError }}</p>
        <button v-if="detailError" @click="resolveDetail">重试</button
        ><button @click="close">返回照片墙</button>
      </div>
    </Transition></Teleport
  >
</template>
<style>
#blog-main {
  display: flex;
  flex-wrap: wrap;
  min-height: 60vh;
}
body {
  padding-bottom: 80px;
}
#wrapper {
  position: relative;
}
body.content-active #blog-main {
  filter: brightness(0.6);
}
.gallery-sentinel {
  min-height: 1px;
  text-align: center;
  font-size: 12px;
  color: #aaa;
}
.gallery-sentinel span,
.gallery-sentinel button {
  display: inline-block;
  margin: 20px;
}
.gallery-status {
  padding: 70px 24px;
  width: 100%;
  text-align: center;
  font-size: 14px;
}
.gallery-status a,
.gallery-status button,
.gallery-sentinel button,
.gallery-detail-status button {
  color: #fff;
  background: #ffffff10;
  border: 1px solid #ffffff25;
  border-radius: 20px;
  padding: 6px 16px;
  margin-left: 10px;
  cursor: pointer;
}
.gallery-skeleton {
  animation: gallery-pulse 1.4s ease-in-out infinite alternate;
}
.gallery-detail-status {
  position: fixed;
  inset: 0;
  z-index: 20000;
  background: #111318e8;
  backdrop-filter: blur(16px);
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  color: #ddd;
  padding: 24px;
}
.gallery-detail-status p {
  width: 100%;
  text-align: center;
  font-size: 14px;
}
.viewer-fade-enter-active,
.viewer-fade-leave-active {
  transition: opacity 0.18s ease;
}
.viewer-fade-enter-from,
.viewer-fade-leave-to {
  opacity: 0;
}
@keyframes gallery-pulse {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 1;
  }
}
@media (max-width: 736px) {
  body {
    padding: 60px 0 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .gallery-skeleton {
    animation: none;
  }
  .viewer-fade-enter-active,
  .viewer-fade-leave-active {
    transition: none;
  }
}
</style>
