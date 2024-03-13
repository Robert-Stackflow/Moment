<template>
    <n-icon mr-20 size="18" style="cursor: pointer" @click="handleLinkClick" :title="$t('header.label_github')">
      <icon-mdi:github />
    </n-icon>
  </template>
  
  <script setup>
  function handleLinkClick() {
    window.open('https://github.com/Robert-Stackflow/Moment')
  }
  </script>
  