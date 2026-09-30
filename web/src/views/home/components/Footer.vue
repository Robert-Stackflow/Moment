<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { useSettingStore } from '@/store'
import { createStyle } from '@/utils'
import TheIcon from '@/components/icon/TheIcon.vue'
import GalleryButton from './GalleryButton.vue'
const props = defineProps({ open: Boolean })
const emit = defineEmits(['close'])
const meta = useSettingStore().metaSetting
const siteName = meta?.site_name || import.meta.env.VITE_TITLE
const description = meta?.site_desc || import.meta.env.VITE_DESC
const icon = meta?.bottom_icon || import.meta.env.VITE_ICON
const entries = meta?.entries || []
const panel = ref(null)
let focused,
  overflow,
  padding,
  locked = false,
  background = []
function unlock() {
  if (!locked) return
  locked = false
  document.body.style.overflow = overflow
  document.body.style.paddingRight = padding
  for (const [element, inert] of background) element.inert = inert
  if (focused?.isConnected) focused.focus({ preventScroll: true })
}
watch(
  () => props.open,
  async (open) => {
    if (!open) {
      unlock()
      return
    }
    focused = document.activeElement
    overflow = document.body.style.overflow
    padding = document.body.style.paddingRight
    const scrollbar = innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbar) document.body.style.paddingRight = scrollbar + 'px'
    background = [...document.querySelectorAll('#blog-main,#header,.gallery-sentinel')].map(
      (element) => [element, element.inert],
    )
    for (const [element] of background) element.inert = true
    locked = true
    await nextTick()
    requestAnimationFrame(() => requestAnimationFrame(focusPanel))
  },
)
function focusPanel() {
  if (props.open && !panel.value?.contains(document.activeElement)) {
    panel.value?.focus({ preventScroll: true })
  }
}
function keydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  }
  if (event.key !== 'Tab') return
  const controls = [...panel.value.querySelectorAll('a[href],button')].filter(
    (node) => node.getClientRects().length,
  )
  const first = controls[0],
    last = controls[controls.length - 1]
  if (
    event.shiftKey &&
    (document.activeElement === first || document.activeElement === panel.value)
  ) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}
onBeforeUnmount(unlock)
createStyle(
  'custom_primary_color',
  ':root {--moment-theme:' +
    (meta?.primary_color || import.meta.env.VITE_PRIMARY_COLOR) +
    ' !important;}',
)
</script>
<template>
  <footer
    id="footer"
    ref="panel"
    class="about-panel panel"
    :class="{ active: open }"
    :inert="!open"
    :aria-hidden="!open"
    role="dialog"
    aria-modal="true"
    aria-labelledby="about-title"
    tabindex="-1"
    @keydown="keydown"
    @transitionend.self="focusPanel"
  >
    <GalleryButton class="about-close" icon="close" label="关闭关于 · Esc" @click="emit('close')" />
    <div class="about-content">
      <section class="about-story">
        <img class="about-logo" :src="icon" alt="" />
        <h2 id="about-title">关于{{ siteName }}</h2>
        <p>{{ description }}</p>
      </section>
      <nav v-if="entries.length" class="about-links" aria-label="联系与更多">
        <h3>联系与更多</h3>
        <div class="about-link-list">
          <a
            v-for="entry in entries"
            :key="entry.name + entry.url"
            :href="entry.url"
            target="_blank"
            rel="noopener nofollow"
          >
            <TheIcon :icon="entry.icon" :size="19" /><span>{{ entry.name }}</span>
            <svg
              class="about-link-arrow"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              width="14"
              height="14"
              aria-hidden="true"
            >
              <path d="M4 12 12 4M4 4h8v8" />
            </svg>
          </a>
        </div>
      </nav>
    </div>
    <div v-if="meta?.icp" class="about-legal">
      <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener nofollow">{{
        meta.icp
      }}</a>
    </div>
  </footer>
</template>
<style>
#footer.about-panel {
  position: fixed;
  z-index: 10001;
  bottom: 96px;
  left: 50%;
  width: min(860px, calc(100% - 40px));
  max-height: calc(100dvh - 136px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 38px;
  border: 1px solid #ffffff1c;
  border-radius: 20px;
  background: #202226f5;
  box-shadow: 0 24px 80px #0005;
  backdrop-filter: blur(24px);
  transform: translate(-50%, 18px);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  outline: none;
  transition:
    transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.18s,
    visibility 0.22s;
}
#footer.about-panel.active {
  transform: translate(-50%, 0);
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
.about-content {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 42px;
  align-items: start;
}
.about-logo {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: contain;
  margin-bottom: 20px;
}
#footer .about-story h2 {
  margin: 0 0 12px;
  font-size: 23px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.015em;
  color: #f1f2f4;
}
.about-story p {
  margin: 0;
  color: #b2b6be;
  font-size: 13px;
  line-height: 1.85;
  white-space: pre-line;
  overflow-wrap: anywhere;
}
#footer .about-links h3 {
  color: #979da8;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.5;
  margin: 7px 0 14px;
}
.about-links {
  padding-top: 4px;
  margin-right: 10px;
}
.about-link-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.about-link-list a {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px;
  border: 1px solid #ffffff12;
  border-radius: 10px;
  background: #ffffff04;
  color: #d4d7dd;
  min-height: 46px;
  transition:
    background 0.16s,
    border-color 0.16s;
  font-size: 12px;
}
.about-link-list a span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.about-link-list svg {
  flex-shrink: 0;
}
.about-link-list .about-link-arrow {
  margin-left: auto;
  color: #767d89;
}
.about-link-list a:hover {
  background: #ffffff0e;
  border-color: #ffffff2b;
  color: #fff;
}
#footer .about-close {
  position: absolute;
  right: 14px;
  top: 14px;
  width: 34px;
  height: 34px;
  background: transparent;
  border-color: transparent;
  color: #aeb3bc;
}
#footer .about-close:hover {
  background: #ffffff12;
  color: white;
}
.about-legal {
  margin-top: 28px;
  padding-top: 16px;
  border-top: 1px solid #ffffff0e;
  font-size: 11px;
  line-height: 1.5;
  color: #848b96;
}
.about-legal a {
  color: inherit;
}
.about-legal a:hover {
  color: #ccc;
}
.about-panel a:focus-visible {
  outline: 2px solid #ddd;
  outline-offset: 3px;
}
@media (max-width: 736px) {
  #footer.about-panel {
    top: 76px;
    bottom: auto;
    width: calc(100% - 24px);
    max-height: calc(100dvh - 96px);
    border-radius: 16px;
    padding: 28px 24px 22px;
    transform: translate(-50%, -10px);
  }
  .about-content {
    grid-template-columns: 1fr;
    gap: 28px;
  }
  #footer .about-story h2 {
    font-size: 21px;
  }
  .about-logo {
    width: 36px;
    height: 36px;
    margin-bottom: 16px;
  }
  .about-links {
    margin-right: 0;
    padding-top: 0;
  }
  #footer .about-links h3 {
    margin-top: 0;
  }
  #footer .about-close {
    width: 42px;
    height: 42px;
    top: 8px;
    right: 8px;
  }
  .about-legal {
    margin-top: 24px;
  }
  .about-link-list a {
    padding: 12px 10px;
  }
}
@media (prefers-reduced-motion: reduce) {
  #footer.about-panel,
  .about-link-list a {
    transition: none;
  }
}
</style>
