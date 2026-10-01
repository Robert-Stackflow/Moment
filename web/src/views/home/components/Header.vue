<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useSettingStore } from '@/store'
import GalleryButton from './GalleryButton.vue'
import api from '@/api'
import { versionedBrandIcon } from '@/utils/common/brand'
defineProps({ aboutOpen: Boolean })
const emit = defineEmits(['about'])
const route = useRoute(),
  settings = useSettingStore()
const categories = ref([]),
  categoriesOpen = ref(false),
  categoryNav = ref(null),
  fullscreen = ref(false),
  categoryError = ref(false)
const siteName = settings.metaSetting?.site_name || import.meta.env.VITE_TITLE
const icon = versionedBrandIcon(settings.metaSetting?.bottom_icon || import.meta.env.VITE_ICON)
const description = settings.metaSetting?.bottom_desc || import.meta.env.VITE_DESC
async function loadCategories() {
  categoryError.value = false
  try {
    categories.value = (await api.getCategoriesVisitor()).data
  } catch {
    categoryError.value = true
  }
}
async function toggleFullScreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  } catch {
    /* Fullscreen may be disallowed by an embedding browser. */
  }
}
function fullScreenChange() {
  fullscreen.value = !!document.fullscreenElement
}
function outside(event) {
  if (!categoryNav.value?.contains(event.target)) categoriesOpen.value = false
}
function escape(event) {
  if (event.key === 'Escape' && categoriesOpen.value) {
    categoriesOpen.value = false
    categoryNav.value?.querySelector('button')?.focus()
  }
}
watch(
  () => route.fullPath,
  () => {
    categoriesOpen.value = false
  },
)
onMounted(() => {
  loadCategories()
  document.addEventListener('pointerdown', outside)
  document.addEventListener('keydown', escape)
  document.addEventListener('fullscreenchange', fullScreenChange)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outside)
  document.removeEventListener('keydown', escape)
  document.removeEventListener('fullscreenchange', fullScreenChange)
})
</script>
<template>
  <header id="header">
    <router-link to="/" class="gallery-brand"
      ><img class="site-logo" :src="icon" alt="" /><strong>{{ siteName }}</strong></router-link
    >
    <span class="description">{{ description }}</span>
    <nav aria-label="相册导航">
      <GalleryButton
        class="gallery-fullscreen"
        icon="expand"
        :label="fullscreen ? '退出全屏' : '全屏浏览'"
        :pressed="fullscreen"
        @click="toggleFullScreen"
      />
      <div ref="categoryNav" class="gallery-category-nav">
        <GalleryButton
          icon="categories"
          label="分类"
          class="gallery-explore-link"
          :pressed="categoriesOpen || route.path.startsWith('/category/')"
          aria-controls="gallery-categories"
          :aria-expanded="categoriesOpen"
          @click="categoriesOpen = !categoriesOpen"
        />
        <Transition name="category-pop">
          <div v-if="categoriesOpen" id="gallery-categories" class="gallery-category-menu">
            <router-link class="gallery-all" to="/" @click="categoriesOpen = false"
              >全部照片</router-link
            >
            <div v-for="category in categories" :key="category.id" class="gallery-category-group">
              <router-link
                :to="'/category/' + encodeURIComponent(category.alias)"
                @click="categoriesOpen = false"
                >{{ category.name }}</router-link
              >
              <div v-if="category.children.length" class="gallery-category-children">
                <router-link
                  v-for="child in category.children"
                  :key="child.id"
                  :to="'/category/' + encodeURIComponent(child.alias)"
                  @click="categoriesOpen = false"
                  >{{ child.name }}</router-link
                >
              </div>
            </div>
            <button v-if="categoryError" class="gallery-nav-link" @click="loadCategories">
              加载失败，重试
            </button>
          </div>
        </Transition>
      </div>
      <GalleryButton v-if="settings.contentSetting?.map_enabled !== false" icon="map" label="地图" href="/map" class="gallery-explore-link" :pressed="route.path === '/map'" />
      <GalleryButton v-if="settings.contentSetting?.timeline_enabled !== false" icon="timeline" label="拍摄时间线" href="/timeline" class="gallery-explore-link" :pressed="route.path === '/timeline'" />
      <button
        id="header-about"
        type="button"
        class="gallery-nav-link"
        :class="{ active: aboutOpen }"
        :aria-expanded="aboutOpen"
        aria-controls="footer"
        @click="emit('about')"
      >
        关于
      </button>
    </nav>
  </header>
</template>
<style>
#header .gallery-explore-link { width:36px; height:36px; }
@media(max-width:380px) { #header .gallery-brand strong { display:none; } }
#header {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 80px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 24px;
  z-index: 10002;
  background: #121212d4;
  backdrop-filter: saturate(140%) blur(20px);
  border-top: 1px solid #ffffff0b;
  transition: transform 0.2s ease;
  line-height: 1;
}
#header .gallery-brand {
  display: flex;
  gap: 12px;
  align-items: center;
  border: 0;
  color: white;
  flex-shrink: 0;
}
#header .gallery-brand strong {
  font-weight: 500;
  font-size: 16px;
  letter-spacing: 0.04em;
}
#header .site-logo {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  object-fit: contain;
}
#header .description {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
#header nav {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}
#header .gallery-nav-link {
  border: 0;
  background: none;
  color: #ddd;
  padding: 11px 14px;
  border-radius: 8px;
  font: inherit;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.16s,
    color 0.16s;
}
#header .gallery-nav-link:hover,
#header .gallery-nav-link.active {
  background: #ffffff13;
  color: white;
}
#header button:focus-visible,
#header a:focus-visible {
  outline: 2px solid #dedede;
  outline-offset: 3px;
}
.gallery-category-nav {
  position: relative;
}
.gallery-category-menu {
  position: absolute;
  bottom: calc(100% + 20px);
  right: -42px;
  width: 278px;
  max-width: calc(100vw - 24px);
  max-height: min(65dvh, 560px);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  padding: 10px;
  border: 1px solid #ffffff1c;
  border-radius: 14px;
  background: #202227f5;
  backdrop-filter: blur(20px);
  box-shadow: 0 12px 48px #0005;
}
#header .gallery-category-menu a {
  display: block;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.4;
  color: #d2d5da;
  border-radius: 7px;
}
#header .gallery-category-menu a:hover,
#header .gallery-category-menu a.router-link-exact-active {
  color: #fff;
  background: #ffffff14;
}
#header .gallery-all {
  margin-bottom: 5px;
}
.gallery-category-group {
  margin-top: 4px;
}
.gallery-category-children {
  margin: 2px 0 8px 22px;
  border-left: 1px solid #ffffff20;
  padding-left: 8px;
}
.gallery-nav-link svg {
  transition: transform 0.16s;
}
.gallery-nav-link svg.expanded {
  transform: rotate(180deg);
}
.category-pop-enter-active,
.category-pop-leave-active {
  transition:
    opacity 0.16s,
    transform 0.16s;
}
.category-pop-enter-from,
.category-pop-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
body.viewer-open #header {
  transform: translateY(100%);
}
@media (max-width: 736px) {
  #header {
    top: 0;
    bottom: auto;
    height: 60px;
    padding: 0 14px;
    gap: 8px;
    border-top: 0;
    border-bottom: 1px solid #ffffff0d;
  }
  #header .description {
    display: none;
  }
  #header nav {
    gap: 3px;
  }
  #header .gallery-brand {
    gap: 8px;
  }
  #header .gallery-nav-link {
    padding: 10px;
    font-size: 12px;
  }
  #header .gallery-fullscreen {
    display: none;
  }
  .gallery-category-menu {
    position: fixed;
    bottom: auto;
    top: 68px;
    right: 14px;
    width: min(278px, calc(100vw - 28px));
    max-height: calc(100dvh - 85px);
  }
  .category-pop-enter-from,
  .category-pop-leave-to {
    transform: translateY(-4px);
  }
  body.viewer-open #header {
    transform: translateY(-100%);
  }
}
@media (prefers-reduced-motion: reduce) {
  #header,
  .gallery-nav-link svg,
  .category-pop-enter-active,
  .category-pop-leave-active {
    transition: none;
  }
}
</style>
