<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, getCurrentInstance, watch } from 'vue'
import GalleryIcon from './GalleryIcon.vue'
defineOptions({ inheritAttrs: false })
const props = defineProps({
  label: String,
  icon: String,
  href: String,
  disabled: Boolean,
  pressed: { default: undefined },
})
const button = ref(null),
  tooltip = ref(null),
  visible = ref(false),
  position = ref({ left: '-1000px', top: '-1000px' })
const id = `gallery-tip-${getCurrentInstance().uid}`
let timer
function hide() {
  clearTimeout(timer)
  visible.value = false
}
function show(event) {
  if (props.disabled || event.pointerType === 'touch') return
  if (event.type === 'focus' && !button.value?.matches(':focus-visible')) return
  clearTimeout(timer)
  timer = setTimeout(async () => {
    visible.value = true
    await nextTick()
    if (!tooltip.value || !button.value) return
    const rect = button.value.getBoundingClientRect(),
      box = tooltip.value.getBoundingClientRect()
    position.value = {
      left: `${Math.max(8, Math.min(innerWidth - box.width - 8, rect.left + (rect.width - box.width) / 2))}px`,
      top: `${rect.top > box.height + 16 ? rect.top - box.height - 8 : rect.bottom + 8}px`,
    }
  }, 280)
}
watch(() => props.label, hide)
onMounted(() => {
  window.addEventListener('resize', hide)
  window.addEventListener('scroll', hide, true)
})
onBeforeUnmount(() => {
  hide()
  window.removeEventListener('resize', hide)
  window.removeEventListener('scroll', hide, true)
})
</script>
<template>
  <component
    :is="href ? 'a' : 'button'"
    ref="button"
    :href="href"
    :type="href ? undefined : 'button'"
    class="gallery-button"
    :aria-label="label"
    :aria-pressed="pressed"
    :disabled="href ? undefined : disabled"
    :aria-describedby="visible ? id : undefined"
    v-bind="$attrs"
    @pointerenter="show"
    @pointerleave="hide"
    @focus="show"
    @blur="hide"
    @pointerdown="hide"
    @click="hide"
    @keydown.esc="hide"
  >
    <GalleryIcon v-if="icon" :name="icon" /><slot />
  </component>
  <Teleport to="body"
    ><Transition name="gallery-tip">
      <span
        v-if="visible"
        :id="id"
        ref="tooltip"
        role="tooltip"
        class="gallery-tooltip"
        :style="position"
        >{{ label }}</span
      >
    </Transition></Teleport
  >
</template>
<style>
.gallery-button {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  gap: 6px;
  width: 42px;
  height: 42px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  background: rgba(32, 34, 38, 0.7);
  color: #f5f5f5;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  line-height: 1;
  transition:
    background 0.16s,
    border-color 0.16s,
    opacity 0.16s;
  -webkit-tap-highlight-color: transparent;
}
.gallery-button:hover:not(:disabled),
.gallery-button[aria-pressed='true'] {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.35);
}
.gallery-button:disabled {
  opacity: 0.25;
  cursor: default;
}
.gallery-button:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 3px;
}
.gallery-tooltip {
  position: fixed;
  z-index: 30010;
  padding: 7px 10px;
  border-radius: 7px;
  background: #f4f4f5;
  color: #23252a;
  font:
    12px/1.5 system-ui,
    sans-serif;
  font-weight: 500;
  letter-spacing: 0;
  max-width: calc(100vw - 16px);
  box-shadow: 0 4px 18px #0003;
  pointer-events: none;
}
.gallery-tip-enter-active,
.gallery-tip-leave-active {
  transition: opacity 0.12s ease;
}
.gallery-tip-enter-from,
.gallery-tip-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .gallery-button,
  .gallery-tip-enter-active,
  .gallery-tip-leave-active {
    transition: none;
  }
}
</style>
