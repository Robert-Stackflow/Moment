<template>
    <div id="blog-main" ref="listRef">
        <Image v-for="blog in blogData" :key="blog.id" :data="blog" @click="handleClick(blog)" />
        <VueFinalModal v-model="show" content-class="lightbox" :overlay-transition="'vfm-fade'"
            :content-transition="'vfm-slide-down'">
            <div style="display:inline-block;height:100%;vertical-align:middle;"></div>
            <div class="lightbox-content">
                <div class="loader"></div>
                <div class="pic" style="display: block; text-indent: 0px;">
                    <img :src="currentBlog.images[0].image_url" alt=""
                        style="vertical-align: bottom; max-width: 1150px; max-height: 890px;" />
                </div>
                <div class="caption" style="display: flex;">
                    <h2 class="thumb-title">{{ currentBlog.title }}</h2>
                    <p class="thumb-desc"></p>
                    <ul class="tags">
                        <li class="tag-meta"><a href="/location/河南省长垣市"
                                class="tag-location tag-thumbnail-location">河南省长垣市</a><a href="/location/河南省长垣市"
                                class="tag-location tag-detail-location">河南省长垣市</a><!----><a
                                class="tag-time tag-detail-time">2024年1月30日 19时37分</a></li>
                        <li class="tag-categories"><a href="/category/hometown" class="">乡土</a><a href="/category/life"
                                class="">生活</a></li>
                    </ul>
                </div>
                <span class="closer" style="cursor: pointer; display: block;" @click="show = false"></span>
                <div class="nav-previous" style="display: block;" @click.stop="prev"></div>
                <div class="nav-next" style="display: block;" @click.stop="next"></div>
            </div>
        </VueFinalModal>
    </div>
</template>

<script setup>
import Image from './Image.vue'
import { useSettingStore } from '@/store'
import api from '@/api'
import { isValueNotEmpty, isValueEmpty, scrollToload } from '@/utils'
import { useRouter } from 'vue-router'
const router = useRouter()
var current_category = router.currentRoute.value.params.category
var current_location = router.currentRoute.value.params.location
var blogData = ref([])
const listRef = ref(null)
var currentBlog = ref(null)
var show = ref(false)
import { VueFinalModal } from 'vue-final-modal'
var page = 1
var total = 0
const settingStore = useSettingStore()
const baseTitle = isValueNotEmpty(settingStore.metaSetting?.site_name) ? settingStore.metaSetting?.site_name : import.meta.env.VITE_TITLE
const splitter = isValueNotEmpty(settingStore.metaSetting?.site_splitter) ? settingStore.metaSetting?.site_splitter : import.meta.env.VITE_TITLE_SPLITTER
const page_size = isValueNotEmpty(settingStore.contentSetting?.page_size) ? settingStore.contentSetting?.page_size : import.meta.env.VITE_PAGE_SIZE
function handleClick(blog) {
    console.log("demo")
    currentBlog.value = blog
    show.value = true
}
async function getBlogs() {
    try {
        var params = { page: page, page_size: page_size }
        if (isValueNotEmpty(current_category))
            params.category = current_category
        if (isValueNotEmpty(current_location))
            params.location = current_location
        const res = await api.getBlogsVisitor(params)
        if (res.code == 200) {
            res.data.forEach(e => blogData.value.push(e))
            page = res.page;
            total = res.total;
        }
    } catch (e) {
        console.log(e)
    }
}
async function getCategory() {
    if (isValueEmpty(current_category))
        return []
    try {
        var params = {}
        params.alias = current_category
        const res = await api.getCategoryByAliasVisitor(params)
        if (res.code == 200) {
            document.title = `${res.data.name} ${splitter} ${baseTitle}`
        }
    } catch (e) {
    }
    return []
}
function loadMore() {
    if (page * page_size < total) {
        page++;
        getBlogs()
    }
}
watch(() => router.currentRoute.value, (value) => {
    current_category = value.params.category
    current_location = value.params.location
    blogData.value = []
    getBlogs()
    getCategory()
    if (isValueNotEmpty(current_location)) {
        document.title = `${current_location} ${splitter} ${baseTitle}`
    }
}, { immediate: true, deep: true })
scrollToload(listRef, loadMore)
scrollToload(null, loadMore)
</script>
<style>
.lightbox {
    backdrop-filter: saturate(180%) blur(20px);
    background: var(--moment-maskbgdeep);
    position: fixed;
    left: 0px;
    top: 0px;
    z-index: 20000;
    width: 100%;
    height: 100%;
    text-align: center;
    cursor: pointer;
    display: block;
    opacity: 1;
}

.lightbox-content {
    background: rgba(31, 34, 36, .925);
    box-shadow: 0 1em 3em .5em #00000040;
    cursor: default;
    border-radius: 12px;
    overflow: hidden;
    display: inline-block;
    vertical-align: middle;
    position: relative;
    z-index: 1;
    cursor: pointer;
    min-width: 150px;
    min-height: 150px;
    width: auto;
    height: auto;
    overflow: hidden;
}

.lightbox-content:before {
    transition: opacity .2s ease-in-out;
    content: "";
    display: block;
    height: 100%;
    left: 0;
    position: absolute;
    top: 0;
    width: 100%;
    z-index: 1;
    opacity: 1;
}

.lightbox-content .loader {
    animation: spinner 1s infinite linear !important;
    background-image: url(/images/spinner.svg);
    background-position: center;
    background-repeat: no-repeat;
    background-size: contain;
    display: block;
    font-size: 2em;
    height: 2em;
    left: 50%;
    line-height: 2em;
    margin: -1em 0 0 -1em;
    opacity: .25;
    position: absolute;
    text-align: center;
    top: 50%;
    width: 2em;
}

.lightbox-content .nav-previous,
.lightbox-content .nav-next {
    transition: opacity .2s ease-in-out;
    background-image: url(/images/arrow.svg);
    background-position: center;
    background-repeat: no-repeat;
    background-size: 5em;
    cursor: pointer;
    height: 8em;
    margin-top: -4em;
    opacity: 0;
    position: absolute;
    top: 50%;
    width: 6em;
    z-index: 2;
}

.lightbox-content .nav-previous {
    transform: scaleX(-1);
    left: 0;
}

.lightbox-content .nav-next {
    right: 0;
}

.lightbox-content:hover .closer,
.lightbox-content:hover .nav-previous,
.lightbox-content:hover .nav-next {
    opacity: .5;
}

.lightbox-content:hover .closer:hover,
.lightbox-content:hover .nav-previous:hover,
.lightbox-content:hover .nav-next:hover {
    opacity: 1;
}

.lightbox-content .closer {
    transition: opacity .2s ease-in-out;
    background-image: url(/images/close.svg);
    background-position: center;
    background-repeat: no-repeat;
    background-size: 3em;
    height: 5em;
    opacity: 0;
    position: absolute;
    right: 0;
    top: 0;
    width: 5em;
    z-index: 2;
}

.lightbox-content .caption {
    padding: 2em 2em .1em;
    background-image: linear-gradient(to top, rgba(16, 16, 16, .45) 25%, rgba(16, 16, 16, 0) 100%);
    bottom: 0rem;
    cursor: default;
    left: 0;
    position: absolute;
    text-align: left;
    width: 100%;
    z-index: 2;
    padding-bottom: 2rem;
    display: flex;
    flex-direction: column;
}

#blog-main {
    transition: filter 0.5s ease;
    display: flex;
    flex-wrap: wrap;
    overflow: auto
}

body {
    padding-bottom: 80px;
}

@media screen and (max-width: 736px) {
    body {
        padding-top: 60px;
    }
}

#blog-main:after {
    pointer-events: none;
    transition: opacity 0.5s ease, visibility 0.5s;
    background: rgba(36, 38, 41, 0.25);
    content: '';
    display: block;
    height: 100%;
    left: 0;
    opacity: 0;
    position: absolute;
    top: 0;
    visibility: hidden;
    width: 100%;
    z-index: 1;
}

body.content-active #blog-main:after {
    pointer-events: auto;
    opacity: 1;
    visibility: visible;
    backdrop-filter: saturate(180%) blur(20px);
    background: var(--moment-maskbgdeep);
}

.lightbox-content .caption {
    padding: 2em 2em 0.1em 2em;
    background-image: linear-gradient(to top, rgba(16, 16, 16, 0.45) 25%, rgba(16, 16, 16, 0) 100%);
    bottom: 0rem;
    cursor: default;
    left: 0;
    position: absolute;
    text-align: left;
    width: 100%;
    z-index: 2;
    padding-bottom: 2rem;
    display: flex;
    flex-direction: column;
}

.lightbox-content .caption h2,
.lightbox-content .caption h3,
.lightbox-content .caption h4,
.lightbox-content .caption h5,
.lightbox-content .caption h6 {
    margin: 0;
    font-weight: bold;
}

.lightbox-content .caption .thumb-desc {
    color: #ffffff;
    font-size: 15px;
    margin: 4px 0;
}

.lightbox-content .loader {
    animation: spinner 1s infinite linear !important;
    background-image: url("/images/spinner.svg");
    background-position: center;
    background-repeat: no-repeat;
    background-size: contain;
    display: block;
    font-size: 2em;
    height: 2em;
    left: 50%;
    line-height: 2em;
    margin: -1em 0 0 -1em;
    opacity: 0.25;
    position: absolute;
    text-align: center;
    top: 50%;
    width: 2em;
}

.lightbox-content:hover .closer,
.lightbox-content:hover .nav-previous,
.lightbox-content:hover .nav-next {
    opacity: 0.5;
}

.lightbox-content:hover .closer:hover,
.lightbox-content:hover .nav-previous:hover,
.lightbox-content:hover .nav-next:hover {
    opacity: 1.0;
}

.lightbox-content.loading:before {
    opacity: 0;
}

body.touch .lightbox-content .closer,
body.touch .lightbox-content .nav-previous,
body.touch .lightbox-content .nav-next {
    opacity: 1.0 !important;
}

ul.tags {
    display: flex;
    padding-left: 0px;
    flex-wrap: wrap;
}

#blog-main ul.tags {
    padding-left: 12px;
}

.tag-categories,
.tag-meta {
    display: flex;
    flex-wrap: wrap;
}

.tag-meta a[data-content=""] {
    display: none;
}

#blog-main .tag-meta {
    display: none;
}

.lightbox-content .tag-meta a[data-show-detail=""] {
    display: none;
}

.tag-categories a,
.tag-meta a {
    padding: 4px 6px;
    border-radius: 8px;
    background: var(--moment-black-op);
    font-size: 12px;
    color: var(--moment-fontcolor);
    transition: 0.3s;
    z-index: 1;
    margin: 12px 12px 0 0px;
    backdrop-filter: saturate(180%) blur(20px);
}

.tag-categories a:hover,
.tag-location:hover {
    background: var(--moment-theme);
    color: var(--moment-white);
}

.lightbox-content .tag-categories a {
    background: var(--moment-black-op);
}

.lightbox-content .tag-categories a:hover {
    background: var(--moment-theme);
}

@media screen and (max-width: 980px) {
    .lightbox-content .closer {
        background-size: 3em;
    }

    .lightbox-content .nav-previous,
    .lightbox-content .nav-next {
        background-size: 4em;
    }
}

@media screen and (max-width: 736px) {

    .lightbox-content:before {
        display: none;
    }

    .lightbox-content .caption .thumb-desc {
        margin: 10px 0px 0px 0px
    }

    .lightbox-content .caption {
        bottom: 10px;
        position: fixed;
    }

    .lightbox-content .closer,
    .lightbox-content .nav-previous,
    .lightbox-content .nav-next {
        display: none !important;
    }

    .nav-item .nav-item-child {
        top: 30px;
    }
}

/* Wrapper */
#wrapper {
    transition: filter 0.5s ease;
    position: relative;
}

#wrapper:after {
    pointer-events: none;
    transition: opacity 0.5s ease, visibility 0.5s;
    background: rgba(36, 38, 41, 0.5);
    content: '';
    display: block;
    height: 100%;
    left: 0;
    opacity: 0;
    position: absolute;
    top: 0;
    visibility: hidden;
    width: 100%;
    z-index: 1;
}

body.ie #wrapper:after {
    background: rgba(36, 38, 41, 0.8);
}

body.modal-active #wrapper:after {
    pointer-events: auto;
    opacity: 0;
    visibility: visible;
    z-index: 10003;
}

@-moz-keyframes spinner {
    0% {
        -moz-transform: rotate(0deg);
        -webkit-transform: rotate(0deg);
        -ms-transform: rotate(0deg);
        transform: rotate(0deg);
    }

    100% {
        -moz-transform: rotate(359deg);
        -webkit-transform: rotate(359deg);
        -ms-transform: rotate(359deg);
        transform: rotate(359deg);
    }
}

@-webkit-keyframes spinner {
    0% {
        -moz-transform: rotate(0deg);
        -webkit-transform: rotate(0deg);
        -ms-transform: rotate(0deg);
        transform: rotate(0deg);
    }

    100% {
        -moz-transform: rotate(359deg);
        -webkit-transform: rotate(359deg);
        -ms-transform: rotate(359deg);
        transform: rotate(359deg);
    }
}

@-ms-keyframes spinner {
    0% {
        -moz-transform: rotate(0deg);
        -webkit-transform: rotate(0deg);
        -ms-transform: rotate(0deg);
        transform: rotate(0deg);
    }

    100% {
        -moz-transform: rotate(359deg);
        -webkit-transform: rotate(359deg);
        -ms-transform: rotate(359deg);
        transform: rotate(359deg);
    }
}

@keyframes spinner {
    0% {
        -moz-transform: rotate(0deg);
        -webkit-transform: rotate(0deg);
        -ms-transform: rotate(0deg);
        transform: rotate(0deg);
    }

    100% {
        -moz-transform: rotate(359deg);
        -webkit-transform: rotate(359deg);
        -ms-transform: rotate(359deg);
        transform: rotate(359deg);
    }
}

#wrapper:before {
    -moz-animation: spinner 1s infinite linear !important;
    -webkit-animation: spinner 1s infinite linear !important;
    -ms-animation: spinner 1s infinite linear !important;
    animation: spinner 1s infinite linear !important;
    pointer-events: none;
    -moz-transition: top 0.75s ease-in-out, opacity 0.35s ease-out, visibility 0.35s;
    -webkit-transition: top 0.75s ease-in-out, opacity 0.35s ease-out, visibility 0.35s;
    -ms-transition: top 0.75s ease-in-out, opacity 0.35s ease-out, visibility 0.35s;
    transition: top 0.75s ease-in-out, opacity 0.35s ease-out, visibility 0.35s;
    background-image: url("/images/spinner.svg");
    background-position: center;
    background-repeat: no-repeat;
    background-size: contain;
    content: '';
    display: block;
    font-size: 2em;
    height: 2em;
    left: 50%;
    line-height: 2em;
    margin: -1em 0 0 -1em;
    opacity: 0;
    position: fixed;
    text-align: center;
    top: 75%;
    visibility: hidden;
    width: 2em;
}

/* 面包屑导航样式 */
/* .breadcrumb-nav {
    display: none;
} */

/* 只在弹出层中显示面包屑，并调整位置到底部 */
.lightbox-content .breadcrumb-nav {
    display: flex;
    gap: 10px;
    justify-content: center;
    order: 999;
    /* 确保在caption内容的最后面 */
}

.nav-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    transition: all 0.3s ease;
    z-index: 999;
}

.nav-dot:hover {
    background-color: rgba(255, 255, 255, 0.8);
    transform: scale(1.2);
}

.nav-dot.active {
    background-color: #fff;
    transform: scale(1.2);
}
</style>