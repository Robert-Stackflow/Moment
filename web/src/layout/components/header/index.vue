<template>
  <div flex items-center>
    <MenuCollapse />
    <BreadCrumb ml-15 hidden sm:block />
  </div>
  <div ml-auto flex items-center>
    <Preview />
    <Github />
    <Wiki />
    <!-- <Languages /> -->
    <ThemeMode />
    <UserAvatar />
  </div>
</template>

<script setup>
import BreadCrumb from './components/BreadCrumb.vue'
import MenuCollapse from './components/MenuCollapse.vue'
import Preview from './components/Preview.vue'
import UserAvatar from './components/UserAvatar.vue'
import ThemeMode from './components/ThemeMode.vue'
import Github from './components/Github.vue'
import Wiki from './components/Wiki.vue'
</script>
