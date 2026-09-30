<template>
  <router-view v-slot="{ Component }">
    <component :is="Component" />
  </router-view>
</template>

<script setup>
import { updateMeta } from '@/utils'
updateMeta()
</script>
