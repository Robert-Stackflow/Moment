<script setup>
import { computed, ref } from 'vue'
import { useSettingStore } from '@/store'
import { imageURL, thumbnailSources, focusPosition, photoPath, photoDate } from './gallery'
const props = defineProps({ data: Object, index: Number })
const emit = defineEmits(['open'])
const content = useSettingStore().contentSetting
const cover = computed(() => props.data.images[0])
const loaded = ref(false),
  failed = ref(false),
  attempt = ref(0)
function open(event) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button) return
  event.preventDefault()
  emit('open', props.data)
}
function retry() {
  failed.value = false
  loaded.value = false
  attempt.value++
}
</script>
<template>
  <article class="thumb img-area" :class="{ 'is-loaded': loaded, 'is-failed': failed }">
    <a
      class="thumb-a my-photo"
      :href="photoPath(data)"
      :aria-label="`${data.title}，${data.images.length} 张照片`"
      @click="open"
    >
      <img
        v-if="!failed"
        :key="attempt"
        class="thumb-image my-photo"
        :src="imageURL(cover, content, 'thumbnail')"
        :srcset="thumbnailSources(cover, content)"
        :alt="cover.title || data.title"
        :loading="index < 3 ? 'eager' : 'lazy'"
        :fetchpriority="index === 0 ? 'high' : 'auto'"
        decoding="async"
        :style="{ objectPosition: focusPosition(cover) }"
        @load="loaded = true"
        @error="failed = true"
      />
      <h2 class="thumb-title">{{ data.title }}</h2>
      <span v-if="data.images.length > 1" class="thumb-count">{{ data.images.length }} 张</span>
    </a>
    <div v-if="failed" class="thumb-error">
      <span>照片暂时无法加载</span
      ><button
        type="button"
        @click="retry"
      >
        重试
      </button>
    </div>
    <ul class="tags">
      <li class="tag-categories">
        <router-link
          v-if="content.thumbnail_show_location !== false && data.location"
          :to="'/location/' + encodeURIComponent(data.location)"
          >{{ data.location }}</router-link
        >
        <span v-if="content.thumbnail_show_time && data.time">{{
          photoDate(data.time, content.thumbnail_time_format || 'YYYY年M月D日')
        }}</span>
        <router-link
          v-for="category in data.categories"
          :key="category.id"
          :to="'/category/' + encodeURIComponent(category.alias)"
          >{{ category.name }}</router-link
        >
      </li>
    </ul>
  </article>
</template>
<style>
#blog-main .thumb {
  position: relative;
  width: 25%;
  height: calc(40vh - 2em);
  min-height: 20em;
  overflow: hidden;
  background: #25282c;
}
#blog-main .thumb-a {
  position: absolute;
  inset: 0;
  display: block;
  border: 0;
}
.thumb-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition:
    opacity 0.24s ease,
    transform 0.35s ease;
}
.is-loaded .thumb-image {
  opacity: 1;
}
.thumb-a::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, #0003 0%, transparent 30%, transparent 55%, #0007 100%);
}
#blog-main .thumb-title {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 68px;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  margin: 0;
  z-index: 1;
  text-shadow: 0 1px 10px #0006;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.thumb-count {
  position: absolute;
  right: 18px;
  bottom: 23px;
  color: #fffd;
  font-size: 11px;
  z-index: 1;
}
#blog-main .tags {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 12px;
  margin: 0;
  padding: 0;
  pointer-events: none;
  list-style: none;
}
.tag-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0;
}
.tag-categories a,
.tag-categories span {
  padding: 4px 8px;
  border-radius: 6px;
  color: #f8f8f8;
  background: #181b205e;
  backdrop-filter: blur(12px);
  font-size: 11px;
  line-height: 1.5;
  border: 1px solid #ffffff14;
  pointer-events: auto;
  transition: background 0.16s;
}
.tag-categories a:hover {
  background: #181b20bd;
}
.thumb-a:focus-visible {
  outline: 2px solid white;
  outline-offset: -5px;
  z-index: 2;
}
.thumb-error {
  position: absolute;
  top: 42%;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.thumb-error button {
  background: #ffffff12;
  border: 1px solid #ffffff30;
  border-radius: 20px;
  padding: 5px 16px;
  cursor: pointer;
  color: #fff;
}
@media (hover: hover) {
  .thumb-a:hover .thumb-image {
    transform: scale(1.025);
  }
}
@media (max-width: 1680px) {
  #blog-main .thumb {
    width: 33.333333%;
  }
}
@media (max-width: 980px) {
  #blog-main .thumb {
    width: 50%;
    min-height: 18em;
    height: calc(28.57143vh - 1.33333em);
  }
}
@media (max-width: 480px) {
  #blog-main .thumb {
    width: 100%;
    min-height: 18em;
    height: calc(40vh - 2em);
  }
  #blog-main .thumb-title {
    left: 18px;
    font-size: 15px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .thumb-image {
    transition: none;
  }
  .thumb-a:hover .thumb-image {
    transform: none;
  }
}
</style>
