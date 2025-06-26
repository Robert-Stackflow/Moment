<template>
    <header id="header">
        <router-link :to="'/'"><img class="site-logo" :src="bottom_icon"></router-link>
        <router-link :to="'/'"><strong style="margin-left: 8px;">{{ site_name }}</strong></router-link>
        <span class="description">{{ bottom_desc }}</span>
        <nav>
            <ul>
                <li>
                    <a type="button" id="fullscreen" class="btn btn-default visible-lg visible-md" alt="切换全屏"
                        @click="toggleFullScreen">{{ fullScreenText }}</a>
                </li>
                <li class="nav-item">
                    <a class="icon solid fa-info-circle nav-item-name">分类</a>
                    <ul class="nav-item-child">
                        <ul>
                            <li v-for="category in categories" class="category-level-0 category-parent">
                                <router-link :to="'/category/' + category.alias">{{ category.name }}</router-link>
                                <ul>
                                    <li v-for="child in category.children"
                                        class="category-level-1 category-child category-level-odd"><router-link
                                            :to="'/category/' + child.alias">{{ child.name }}</router-link></li>
                                </ul>
                            </li>
                        </ul>
                        <li class="category-level-0 category-parent"><router-link :to="'/'">全部</router-link></li>
                    </ul>
                </li>
                <li><a style="cursor: pointer;" @click="togglePanel" id="header-about">关于</a></li>
            </ul>
        </nav>
    </header>
</template>
<script setup>
import { useSettingStore } from '@/store'
import api from '@/api'
import { isValueNotEmpty } from '@/utils'
const settingStore = useSettingStore()
var categories = ref([])
var fullScreenText = ref("全屏")
var a = 0;
const site_name = isValueNotEmpty(settingStore.metaSetting?.site_name) ? settingStore.metaSetting?.site_name : import.meta.env.VITE_TITLE
const bottom_icon = isValueNotEmpty(settingStore.metaSetting?.bottom_icon) ? settingStore.metaSetting?.bottom_icon : import.meta.env.VITE_ICON
const bottom_desc = isValueNotEmpty(settingStore.metaSetting?.bottom_desc) ? settingStore.metaSetting?.bottom_desc : import.meta.env.VITE_DESC
function togglePanel() {
    document.querySelector("#footer.panel").classList.toggle("active");
    document.querySelector("#header-about").classList.toggle("active");
    document.querySelector("body").classList.toggle('content-active');
}
function isFullScreen() {
    var isFull = document.fullScreen || document.fullscreenElement !== null;
    if (isFull === undefined) isFull = false;
    return isFull;
}
function toggleFullScreen() {
    if (isFullScreen()) {
        document.exitFullscreen();
        $("#fullscreen").removeClass("ctrlOn");
        fullScreenText.value = "全屏"
    } else {
        document.documentElement.requestFullscreen();
        $("#fullscreen").addClass("ctrlOn");
        fullScreenText.value = "退出全屏"
    }
}
api.getCategoriesVisitor().then((response) => {
    if (response.code == 200) {
        categories.value = response.data
    }
})
</script>
<style>
#header {
    background: #666;
    padding: 40px;
}

body.is-preload #header {
    transform: translateY(80px);
}

#header {
    transform: translateY(0);
    transition: transform 1s ease;
    background: rgba(18, 18, 18, 0.8);
    backdrop-filter: saturate(180%) blur(20px);
    top: calc(100vh - 80px);
    height: 80px;
    left: 0;
    line-height: 1;
    padding: 0 1.5em;
    position: fixed;
    user-select: none;
    width: 100%;
    z-index: 10002;
    display: flex;
    align-items: center;
}


@media screen and (max-width: 736px) {
    body.is-preload #header {
        transform: translateY(-80px);
    }
}

#header h1 {
    color: #a0a0a1;
    display: flex;
    font-size: 1em;
    line-height: 4.5em;
    height: 4em;
    margin: 0;
    vertical-align: middle;
    align-items: center;
}

#header h1 a {
    border: 0;
    color: inherit;
    line-height: 1;
}

#header h1 a:hover {
    color: inherit !important;
}

#header nav {
    margin-left: auto;
}

#header nav>ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
}

#header nav>ul>li {
    display: flex;
    padding: 0;
    position: relative;
    list-style-type: none;
    justify-content: center;
}

#header .description {
    margin-left: 8px;
}

.nav-item .nav-item-child {
    position: absolute;
    bottom: 30px;
    flex-direction: column;
    margin-bottom: 0;
    padding: 10px 12px;
    align-items: center;
    background: var(--moment-maskbg);
    border-radius: 8px;
    display: flex;
    height: fit-content;
    transition: 0.3s;
    opacity: 0;
    pointer-events: none;
    backdrop-filter: blur(10px);
}

.nav-item-child>ul {
    padding-left: 0;
}

li.category-level-0.category-parent {
    width: 100%;
    text-align: center;
}

.nav-item .category-parent {
    border-radius: 6px;
    transition: 0.3s;
    font-size: 14px;
}

.nav-item ul li {
    margin: 3px 0px;
}

.nav-item ul li:not(:has(ul)):hover {
    background: var(--moment-theme);
    border-radius: 8px;
}

.nav-item ul li:has(ul)>a {
    width: 100%;
}

.nav-item ul li:has(ul):hover>a {
    transition: scale 0.5s;
    scale: 1.1;
    background: var(--moment-theme);
    border-radius: 8px;
}

.nav-item ul {
    padding-left: 0px;
}

.nav-item:hover .nav-item-child {
    display: flex;
    opacity: 1;
    pointer-events: all;
}

#header nav>ul>li a {
    transition: all 0.5s ease;
    border: 0;
    color: #ffffff;
    display: inline-block;
    letter-spacing: 0.1em;
    padding: 0 1.65em;
    text-transform: uppercase;
    padding: 8px 16px;
    border-radius: 8px;
    white-space: nowrap;
}

#header nav>ul>li a.icon:before {
    color: #505051;
    float: right;
    margin-left: 0.75em;
}

#header nav>ul>li a:hover {
    color: #ffffff !important;
}

#header nav>ul>li a.active {
    background-color: var(--moment-secondbg);
}

.site-logo {
    width: 30px;
    height: 30px;
    border-radius: 20px;
    margin-right: 1rem;
}

@media screen and (max-width: 736px) {
    body {
        padding: 4em 0 0 0 !important;
    }

    #header {
        transform: translateY(0);
        bottom: auto;
        height: 60px;
        padding: 0 1em;
        top: 0;
    }

    #header h1 {
        font-size: 0.9em;
    }

    #header nav>ul>li a {
        font-size: 0.9em;
        padding: 8px 16px;
        border-radius: 8px;
    }

    #header .description {
        display: none;
    }
}

body:has(div.lightbox) #header {
    transform: translateY(80px);
}
</style>