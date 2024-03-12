<template>
  <n-icon mr-20 size="18" style="cursor: pointer" @click="handleLinkClick" :title="$t('header.label_preview')">
    <icon-mdi:navigation-variant-outline />
  </n-icon>
</template>

<script setup>
function handleLinkClick() {
  window.open('/')
}
</script>
