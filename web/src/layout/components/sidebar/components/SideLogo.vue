<template>
  <router-link h-60 f-c-c to="/admin/">
    <NImage width="25.6" :src="site_icon" class="icon" style="border-radius: 30px;margin-right: 5px;"></NImage>
    <h1
      v-show="!appStore.collapsed"
      ml-2
      mr-8
      max-w-150
      flex-shrink-0
      text-16
      font-bold
    >
      {{ site_name }}
    </h1>
  </router-link>
</template>

<script setup>
import { useAppStore,useSettingStore } from '@/store'
import { isValueNotEmpty } from '@/utils'
const appStore = useAppStore()
const settingStore = useSettingStore()
const site_name = isValueNotEmpty(settingStore.metaSetting?.site_name)?settingStore.metaSetting?.site_name:import.meta.env.VITE_TITLE
const site_icon = isValueNotEmpty(settingStore.metaSetting?.bottom_icon)?settingStore.metaSetting?.bottom_icon:import.meta.env.VITE_ICON
</script>
