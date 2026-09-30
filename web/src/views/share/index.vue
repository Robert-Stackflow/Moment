<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GalleryImage from '../home/components/Image.vue'
import GalleryLightbox from '../home/components/GalleryLightbox.vue'
import GalleryButton from '../home/components/GalleryButton.vue'
import GalleryIcon from '../home/components/GalleryIcon.vue'

const route = useRoute(),
  router = useRouter()
const album = ref(null),
  loading = ref(true),
  busy = ref(false),
  password = ref(''),
  visiblePassword = ref(false),
  error = ref(''),
  unavailable = ref(false)
let generation = 0,
  disposed = false,
  checking = false,
  interval,
  deadlineTimer
const posts = computed(() => album.value?.posts || [])
const selected = computed(() =>
  posts.value.find((post) => String(post.id) === String(route.query.post))
)
const postIndex = computed(() => posts.value.indexOf(selected.value))
const photoIndex = computed(() =>
  Math.max(
    0,
    selected.value?.images.findIndex((photo) => String(photo.id) === String(route.query.photo)) ?? 0
  )
)
const base = computed(() => '/share/' + route.params.token)
const endpoint = computed(() => '/api/shares/' + route.params.token)
const expiry = computed(() =>
  album.value?.expires_at
    ? new Date(album.value.expires_at * 1000).toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        hour12: false,
      })
    : ''
)
async function request(path = '', options = {}) {
  const response = await fetch(endpoint.value + path, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
  })
  const result = await response.json()
  if (!response.ok)
    throw Object.assign(new Error(result.msg || '相册暂时无法打开'), { status: response.status })
  return result.data
}
function forget() {
  album.value = null
  password.value = ''
  clearTimeout(deadlineTimer)
  document.title = '分享相册 · Moment'
}
function expire() {
  forget()
  unavailable.value = true
  error.value = '分享链接不存在或已失效'
}
function scheduleExpiry() {
  clearTimeout(deadlineTimer)
  if (!album.value?.expires_at) return
  const remaining = album.value.expires_at * 1000 - Date.now()
  if (remaining <= 0) expire()
  else deadlineTimer = setTimeout(scheduleExpiry, Math.min(remaining + 50, 2147483647))
}
async function load(silent = false) {
  if (checking || disposed) return
  checking = true
  const current = generation
  if (!silent) {
    loading.value = true
    error.value = ''
  }
  try {
    const data = await request()
    if (current !== generation || disposed) return
    album.value = data
    unavailable.value = false
    error.value = ''
    document.title = data.locked ? '解锁分享相册 · Moment' : data.title + ' · Moment'
    scheduleExpiry()
  } catch (reason) {
    if (current !== generation || disposed) return
    // A failed revalidation must not keep stale private content visible.
    forget()
    unavailable.value = reason.status === 404
    error.value = reason.message || '连接失败，请重试'
  } finally {
    checking = false
    if (current === generation) loading.value = false
  }
}
async function unlock() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await request('/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value }),
    })
    password.value = ''
    await load()
  } catch (reason) {
    error.value = reason.message
    if (reason.status === 404) expire()
  } finally {
    busy.value = false
  }
}
async function lock() {
  if (busy.value) return
  busy.value = true
  try {
    await request('/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    forget()
    await load()
  } catch (reason) {
    error.value = reason.message
  } finally {
    busy.value = false
  }
}
function pathFor(post, photo = post.images[0]) {
  return `${base.value}?post=${post.id}&photo=${photo.id}`
}
function open(post) {
  router.push(pathFor(post))
}
function choose(index) {
  router.replace(pathFor(selected.value, selected.value.images[index]))
}
function close() {
  router.replace(base.value)
}
function revalidate() {
  if (document.visibilityState === 'visible' && album.value && !album.value.locked) void load(true)
}
watch(
  () => route.params.token,
  () => {
    generation++
    checking = false
    forget()
    unavailable.value = false
    void load()
  },
  { immediate: true }
)
onMounted(() => {
  document.body.classList.add('shared-gallery')
  interval = setInterval(revalidate, 30000)
  document.addEventListener('visibilitychange', revalidate)
  window.addEventListener('focus', revalidate)
})
onBeforeUnmount(() => {
  disposed = true
  generation++
  clearInterval(interval)
  clearTimeout(deadlineTimer)
  document.body.classList.remove('shared-gallery')
  document.removeEventListener('visibilitychange', revalidate)
  window.removeEventListener('focus', revalidate)
})
</script>
<template>
  <div class="shared-page">
    <main v-if="!album || album.locked" id="blog-main" class="shared-gate">
      <form v-if="album?.locked && !unavailable" class="shared-gate-card" @submit.prevent="unlock">
        <span class="shared-lock-mark"><GalleryIcon name="lock" /></span>
        <h1>为你分享的相册</h1>
        <p>输入密码，查看这一组照片。</p>
        <label for="album-password">访问密码</label>
        <div class="shared-password">
          <input
            id="album-password"
            v-model="password"
            :type="visiblePassword ? 'text' : 'password'"
            autocomplete="current-password"
            required
            maxlength="128"
            :disabled="busy"
          /><button
            type="button"
            :aria-label="visiblePassword ? '隐藏密码' : '显示密码'"
            :aria-pressed="visiblePassword"
            @click="visiblePassword = !visiblePassword"
          >
            {{ visiblePassword ? '隐藏' : '显示' }}
          </button>
        </div>
        <p v-if="error" class="shared-error" role="alert">{{ error }}</p>
        <button class="shared-primary" type="submit" :disabled="busy">
          {{ busy ? '正在解锁…' : '打开相册' }}
        </button>
      </form>
      <div v-else class="shared-gate-card" role="status">
        <span class="shared-lock-mark"><GalleryIcon :name="unavailable ? 'lock' : 'grid'" /></span>
        <h1>{{ loading ? '正在打开相册' : unavailable ? '分享已失效' : '暂时无法连接' }}</h1>
        <p>{{ loading ? '请稍候…' : error || '相册已到期、已撤销，或链接不正确。' }}</p>
        <button v-if="!loading" class="shared-primary" @click="load()">重新检查</button>
      </div>
    </main>
    <template v-else>
      <section class="shared-heading">
        <div>
          <h1>{{ album.title }}</h1>
          <p v-if="album.description">{{ album.description }}</p>
        </div>
        <span>{{ posts.length }} 篇帖子</span>
      </section>
      <main id="blog-main" class="shared-wall">
        <GalleryImage
          v-for="(post, index) in posts"
          :key="post.id"
          :data="post"
          :index="index"
          :path-for="pathFor"
          contained
          @open="open"
        />
        <p v-if="!posts.length" class="shared-empty">相册中暂时没有可展示的照片。</p>
      </main>
      <nav class="shared-navigation" aria-label="分享相册导航">
        <div>
          <span>{{ album.title }}</span
          ><small>{{ expiry ? `有效期至 ${expiry}（北京时间）` : '分享相册' }}</small>
        </div>
        <GalleryButton
          v-if="album.password_required"
          icon="lock"
          label="锁定相册"
          :disabled="busy"
          @click="lock"
        />
      </nav>
      <p v-if="error" role="alert" class="shared-error">{{ error }}</p>
    </template>
    <Teleport to="body"
      ><Transition name="viewer-fade"
        ><GalleryLightbox
          v-if="selected"
          :post="selected"
          :index="photoIndex"
          :previous="posts[postIndex - 1]"
          :following="posts[postIndex + 1]"
          :path-for="pathFor"
          contained
          @choose="choose"
          @post="(post) => router.replace(pathFor(post))"
          @close="close" /></Transition
    ></Teleport>
  </div>
</template>
<style>
body.shared-gallery {
  margin: 0;
  padding: 0 0 82px;
  background: #202226;
  color: #d4d7dd;
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
  line-height: 1.6;
  color-scheme: dark;
}
.shared-page * {
  box-sizing: border-box;
}
.shared-page h1 {
  font-size: 25px;
  line-height: 1.4;
  margin: 0;
  color: #f3f4f6;
  font-weight: 600;
  letter-spacing: -0.4px;
}
.shared-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 32px;
}
.shared-heading > div {
  min-width: 0;
}
.shared-heading p {
  color: #9da2ac;
  font-size: 14px;
  margin: 8px 0 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.shared-heading h1 {
  overflow-wrap: anywhere;
}
.shared-heading > span {
  flex-shrink: 0;
  font-size: 12px;
  color: #9da2ac;
}
.shared-wall {
  display: flex;
  flex-wrap: wrap;
}
.shared-wall .tag-categories span {
  color: #c3c5ca;
  font-size: 12px;
  padding: 3px 7px;
  border-radius: 5px;
  background: #12141650;
}
.shared-navigation {
  position: fixed;
  bottom: 0;
  inset-inline: 0;
  min-height: 76px;
  padding: 16px 28px max(16px, env(safe-area-inset-bottom));
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: #151719ed;
  backdrop-filter: blur(20px);
  border-top: 1px solid #ffffff10;
  z-index: 10;
}
.shared-navigation > div {
  min-width: 0;
  display: grid;
}
.shared-navigation span {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #e4e7ed;
}
.shared-navigation small {
  color: #8e939e;
  font-size: 11px;
}
#blog-main.shared-gate {
  display: grid;
  place-items: center;
  padding: 28px;
  min-height: calc(100dvh - 82px);
  width: 100%;
  background: radial-gradient(ellipse at 50% 35%, #343c4a44, transparent 65%);
}
.shared-gate-card {
  width: min(100%, 380px);
  padding: 34px 28px;
  background: #ffffff04;
  border: 1px solid #ffffff12;
  border-radius: 22px;
  box-shadow: 0 20px 80px #0002;
}
.shared-lock-mark {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  border: 1px solid #ffffff15;
  border-radius: 16px;
  margin-bottom: 30px;
  background: #ffffff07;
  color: #ced6e8;
}
.shared-lock-mark svg {
  width: 23px;
  height: 23px;
}
.shared-gate-card h1 {
  font-size: 23px;
}
.shared-gate-card p {
  font-size: 13px;
  color: #969da9;
  margin: 12px 0 28px;
  line-height: 1.8;
}
.shared-gate-card label {
  display: block;
  font-size: 12px;
  color: #a9b0bc;
  margin: 20px 0 8px;
}
.shared-password {
  display: flex;
  gap: 8px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid #ffffff1a;
  background: #13171b;
}
.shared-password:focus-within {
  border-color: #8b9aba;
  box-shadow: 0 0 0 3px #8b9aba1a;
}
.shared-password input {
  min-width: 0;
  flex: 1;
  padding: 13px 0;
  border: 0;
  background: transparent;
  outline: 0;
  color: #edf0f6;
  font: inherit;
  font-size: 16px;
}
.shared-password button {
  border: 0;
  background: transparent;
  color: #a6adbb;
  cursor: pointer;
  font-size: 12px;
}
.shared-primary {
  width: 100%;
  padding: 13px 18px;
  margin-top: 20px;
  border: 1px solid #aab6d13a;
  border-radius: 10px;
  background: #c1cbe1;
  color: #1a2130;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 160ms, transform 160ms;
}
.shared-primary:hover {
  background: #dde4f4;
}
.shared-primary:active {
  transform: scale(0.985);
}
.shared-primary:disabled {
  opacity: 0.6;
  cursor: wait;
}
.shared-page button:focus-visible {
  outline: 2px solid #9daecc;
  outline-offset: 4px;
}
.shared-gate-card .shared-error {
  color: #f0a2a2;
  margin: 12px 0 0;
}
.shared-empty {
  padding: 60px 24px;
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
@media (max-width: 736px) {
  .shared-heading {
    padding: 22px 16px;
    align-items: start;
  }
  .shared-page h1 {
    font-size: 21px;
  }
  .shared-heading > span {
    padding-top: 5px;
  }
  .shared-navigation {
    padding-inline: 16px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .shared-primary,
  .viewer-fade-enter-active,
  .viewer-fade-leave-active {
    transition: none;
  }
}
</style>
