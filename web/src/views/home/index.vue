<template>
  <Header :about-open="aboutOpen" @about="aboutOpen = !aboutOpen" />
  <div id="wrapper">
    <Explore v-if="route.path === '/map' || route.path === '/timeline'" :key="route.path" />
    <Main v-else />
    <button v-if="aboutOpen" class="gallery-panel-backdrop" aria-label="关闭关于面板" @click="aboutOpen = false" />
    <Footer :open="aboutOpen" @close="aboutOpen = false" />
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import Main from './components/Main.vue'
const Explore = defineAsyncComponent(() => import('../explore/index.vue'))
const aboutOpen = ref(false)
const route = useRoute()
watch(aboutOpen, (open) => document.body.classList.toggle('content-active', open))
watch(() => route.fullPath, () => { aboutOpen.value = false })
onBeforeUnmount(() => document.body.classList.remove('content-active'))
</script>
<style>
.gallery-panel-backdrop { position: fixed; inset: 0; z-index: 10000; border: 0; background: #10121660; backdrop-filter: blur(6px); cursor: default; }
::selection {
  background: var(--moment-fontcolor);
  color: var(--moment-background);
}

html { color-scheme: dark; scrollbar-color: #ffffff30 #202226; scrollbar-width: thin; }
.gallery-category-menu,.about-panel,.viewer-thumbnails,.viewer-caption { scrollbar-width: thin; scrollbar-color: #ffffff30 transparent; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; margin: 10px; }
::-webkit-scrollbar-thumb { background: #ffffff30; border-radius: 20px; }
::-webkit-scrollbar-thumb:hover { background: #ffffff50; }
::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
::-webkit-scrollbar-corner { background: transparent; }

@-ms-viewport {
  width: device-width;
}

@media screen and (max-width: 480px) {

  html,
  body {
    min-width: 320px;
  }
}

body {
  background: #242629;
  color: #a0a0a1;
  font-weight: 300;
  letter-spacing: 0.025em;
  line-height: 1.65;
  -ms-overflow-style: scrollbar;
  -webkit-text-size-adjust: none;
}

@media screen and (max-width: 1680px) {

  body {
    font-size: 11pt;
  }
}

a {
  transition: color 0.2s ease-in-out, border-bottom-color 0.2s ease-in-out;
  color: #b5b5b5;
  text-decoration: none;
}

strong,
b {
  color: #ffffff;
  font-weight: 300;
}

h1,
h2,
h3,
h4,
h5,
h6 {
  color: #ffffff;
  font-weight: bold;
  line-height: 0;
  margin: 0 0 16px 0;
}

h1 {
  font-size: 2em;
}

h2 {
  font-size: 2.25em;
  line-height: 1.2;
}

h3 {
  font-size: 1.1em;
}

h4 {
  font-size: 1em;
}

h5 {
  font-size: 0.9em;
}

h6 {
  font-size: 0.7em;
}

@media screen and (max-width: 736px) {
  h2 {
    font-size: 1em;
  }

  h3 {
    font-size: 0.9em;
  }

  h4 {
    font-size: 0.8em;
  }

  h5 {
    font-size: 0.7em;
  }

  h6 {
    font-size: 0.7em;
  }
}

body.is-preload #wrapper:before {
  transition: opacity 1s ease-out !important;
  transition-delay: 0.5s !important;
  opacity: 0.25;
  top: 50%;
  visibility: visible;
}
</style>
