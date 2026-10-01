<script setup>
defineProps({ name: String })
const paths = {
  categories: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  map: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15',
  timeline: 'M8 4h13M8 12h13M8 20h13M3 4h.01M3 12h.01M3 20h.01M3 4v16',
  close: 'M6 6l12 12M6 18L18 6',
  left: 'm14 6-6 6 6 6',
  right: 'm10 6 6 6-6 6',
  expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  zoom: 'M21 21l-5-5M10 7v6m-3-3h6',
  reset: 'M21 21l-5-5M7 10h6',
  info: 'M12 11v6m0-10h.01',
  share: 'M12 16V3m-4 4 4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
  check: 'm5 12 4 4L19 6',
  lock: 'M6 10h12v11H6zM8 10V6a4 4 0 0 1 8 0v4M12 14v3',
}
</script>
<template>
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle v-if="name === 'zoom' || name === 'reset'" cx="10" cy="10" r="7" />
    <circle v-if="name === 'info'" cx="12" cy="12" r="9" />
    <path :d="paths[name] || paths.grid" />
  </svg>
</template>
