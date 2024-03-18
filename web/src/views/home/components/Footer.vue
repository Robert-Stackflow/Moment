<template>
    <footer id="footer" class="panel">
        <div class="inner split">
            <div class="inner split">
                <div>
                    <section style="margin-bottom: 20px;">
                        <h2>关于{{ site_name }}</h2>
                        <p>{{ site_desc }}</p>
                    </section>
                    <section style="margin-bottom: 1.8rem;" v-if="entries.length > 0">
                        <h2>联系我</h2>
                        <ul class="footer-shortcuts">
                            <li v-for="entry in entries" class="footer-shortcut">
                                <a :href="entry.url" target="_blank" rel="noopener nofollow">
                                    <TheIcon :icon="entry.icon" :size="20" />
                                    <span class="footer-shortcut-label" style="display: none;">{{ entry.name }}</span>
                                </a>
                            </li>
                        </ul>
                    </section>
                    <span style="color: #b5b5b5; font-size: 0.8em;">
                        <p class="footer-icp" v-if="isValueNotEmpty(icp)">
                            ICP备案号:
                            <a href="http://beian.miit.gov.cn/" target="_blank" rel="noopener nofollow">{{ icp }}</a>
                        </p>
                    </span>
                </div>
            </div>
        </div>
        <div class="closer" @click="togglePanel">
            <TheIcon icon="ic:round-close" :size="30" />
        </div>
    </footer>
</template>
<script setup>
import { useSettingStore } from '@/store'
import { isValueNotEmpty, createStyle } from '@/utils'
import TheIcon from '@/components/icon/TheIcon.vue'
const settingStore = useSettingStore()
const site_name = isValueNotEmpty(settingStore.metaSetting?.site_name )?settingStore.metaSetting?.site_name : import.meta.env.VITE_TITLE
const site_desc = isValueNotEmpty(settingStore.metaSetting?.site_desc )?settingStore.metaSetting?.site_desc : import.meta.env.VITE_DESC
const primary_color = isValueNotEmpty(settingStore.metaSetting?.primary_color )?settingStore.metaSetting?.primary_color : import.meta.env.VITE_PRIMARY_COLOR
const entries = isValueNotEmpty(settingStore.metaSetting?.entries )?settingStore.metaSetting?.entries : []
const bottom_icon = isValueNotEmpty(settingStore.metaSetting?.bottom_icon )?settingStore.metaSetting?.bottom_icon : import.meta.env.VITE_ICON
const bottom_desc = isValueNotEmpty(settingStore.metaSetting?.bottom_desc )?settingStore.metaSetting?.bottom_desc : import.meta.env.VITE_DESC
const icp = isValueNotEmpty(settingStore.metaSetting?.icp )?settingStore.metaSetting?.icp : ""
function togglePanel() {
    document.querySelector("#footer.panel").classList.toggle("active");
    document.querySelector("#header-about").classList.toggle("active");
    document.querySelector("body").classList.toggle('content-active');
}
createStyle("custom_primary_color", `:root {--moment-theme:${primary_color} !important;}`)
</script>
<style>
ul.footer-shortcuts {
    cursor: default;
    list-style: none;
    padding-left: 0;
    display: flex;
}

ul.footer-shortcuts li.footer-shortcut {
    margin-right: 10px;
}

ul.footer-shortcuts li:last-child {
    padding-right: 0;
}

ul.footer-shortcuts li a:before {
    font-size: 28px;
    line-height: 1;
    height: 28px;
    margin: auto;
    display: contents;
}

ul.footer-shortcuts li a {
    color: var(--moment-card-bg);
    width: 40px;
    height: 40px;
    border-radius: 40px;
    background: var(--moment-fontcolor);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: 0.3s;
}

ul.footer-shortcuts li:hover a {
    color: var(--moment-fontcolor);
    background: var(--moment-theme);
}

.panel {
    padding: 4em 4em 2em 4em;
    transform: translateY(100vh);
    transition: transform 0.5s ease;
    background: rgba(36, 38, 41, 0.975);
    bottom: 80px;
    left: 0;
    max-height: calc(80vh - 4em);
    overflow-y: auto;
    position: fixed;
    width: 100%;
    z-index: 10001;
}

.panel.active {
    transform: translateY(1px);
}

.panel>.inner {
    margin: 0 auto;
    max-width: 100%;
    width: 75em;
}

.panel>.inner.split {
    display: -moz-flex;
    display: -webkit-flex;
    display: -ms-flex;
    display: flex;
}

.panel>.inner.split>div {
    margin-left: 4em;
    width: 50%;
}

.panel>.inner.split> :first-child {
    margin-left: 0;
}

.panel>.closer {
    transition: opacity 0.2s ease-in-out;
    background-position: center;
    background-repeat: no-repeat;
    background-size: 3em;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 5em;
    opacity: 0.25;
    position: absolute;
    right: 0;
    top: 0;
    width: 5em;
    z-index: 2;
}

.panel>.closer:hover {
    opacity: 1.0;
}

@media screen and (max-width: 1280px) {

    .panel>.inner.split>div {
        margin-left: 3em;
    }

    .panel>.closer {
        background-size: 2.5em;
        background-position: 75% 25%;
    }
}

@media screen and (max-width: 980px) {
    .panel>.inner.split {
        flex-direction: column;
    }

    .panel>.inner.split>div {
        margin-left: 0;
        width: 100%;
    }
}

@media screen and (max-width: 736px) {
    .panel {
        transform: translateY(-100vh);
        padding: 4em 2em 2em 2em;
        bottom: auto;
        top: calc(4em - 1px);
    }

    .panel.active {
        transform: translateY(0);
    }
}

#footer .footer-icp {
    color: #b5b5b5;
    font-size: 15px;
    margin-top: 15px;
}
</style>