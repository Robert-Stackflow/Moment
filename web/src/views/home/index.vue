<template>
  <Header />
  <div id="wrapper">
    <Main />
    <Footer />
  </div>
</template>

<script setup>
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import Main from './components/Main.vue'
</script>
<style>
::selection {
  background: var(--moment-fontcolor);
  color: var(--moment-background);
}

::-webkit-scrollbar {
  width: 5px;
}

::-webkit-scrollbar-thumb {
  background-color: #ececec;
}

::-webkit-scrollbar-track {
  -webkit-box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
  background: #1f2224;
}

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