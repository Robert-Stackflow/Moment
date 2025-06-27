<template>
    <div id="blog-main" ref="listRef">
        <Image v-for="blog in blogs" :key="blog.id" :data="blog" @click="showImage(blog)" />
        <VueFinalModal v-model="show" content-class="lightbox" :overlay-transition="'vfm-fade'"
            :content-transition="'vfm-fade'" @before-close="close" @click-outside="close">
            <div style="display:inline-block;height:100%;vertical-align:middle;"></div>
            <div class="lightbox-content" :style="{
                width: currentSize.width + 'px',
                height: currentSize.height + 'px',
                transition: 'width 1s ease-in-out, height 1s ease-in-out',
                overflow: 'hidden',
                transformOrigin: 'center center',
            }" @transitionend="onTransitionEnd">
                <div class="loader" v-if="!imageVisible"></div>
                <transition name="fade" mode="out-in">
                    <div class="pic" style="display: block; text-indent: 0px;">
                        <img :src="imageSrc" :key="imageSrc" alt="" :style="['vertical-align: bottom;',
                            imageVisible ? '' : 'display: none;',
                        ]" @load="onImageLoad" class="img" />
                    </div>
                </transition>
                <div class="caption" style="display: flex;" v-if="imageVisible">
                    <h2 class="thumb-title">{{ currentBlog.current_title }}</h2>
                    <p class="thumb-desc">{{ currentBlog.current_desc }}</p>
                    <ul class="tag-meta">
                        <router-link class="tag-location detail-tag"
                            v-if="detail_show_location && isValueNotEmpty(currentBlog.current_location)"
                            :to="'/location/' + currentBlog.current_location">
                            <i class="iconfont icon-map-pin-2-line"></i>
                            {{ currentBlog.current_full_location }}
                        </router-link>
                        <a class="tag-time detail-tag"
                            v-if="detail_show_time && isValueNotEmpty(currentBlog.current_metadata)">{{
                                currentBlog.current_metadata }}</a>
                        <a class="tag-time detail-tag"
                            v-if="detail_show_time && isValueNotEmpty(currentBlog.current_detail_time)">{{
                                currentBlog.current_detail_time }}</a>
                    </ul>
                    <ul class="tags">
                        <li class="tag-categories">
                            <router-link v-for="category in currentBlog.categories" :key="category.alias"
                                :to="'/category/' + category.alias">{{ category.name }}</router-link>
                        </li>
                    </ul>
                    <div class="breadcrumb-nav" v-if="currentBlog.images.length > 1">
                        <span v-for="(item, index) in currentBlog.images" :key="index" class="nav-dot"
                            @mouseenter="(e) => handleSwipe(currentBlog, e)"
                            :class="{ 'active': currentBlog.currentIndex === index }" :data-index="index"></span>
                    </div>
                </div>
                <span class="closer" style="cursor: pointer; display: block;" @click="close"></span>
                <div class="nav-previous" style="display: block;" @click.stop="prev"></div>
                <div class="nav-next" style="display: block;" @click.stop="next"></div>
            </div>
        </VueFinalModal>
    </div>
</template>

<script setup>
import { throttle } from 'lodash'
import Image from './Image.vue'
import { useSettingStore } from '@/store'
import api from '@/api'
import { isValueNotEmpty, isValueEmpty, scrollToload, parseDateTime, formatDateTime } from '@/utils'
import { useRouter } from 'vue-router'
import { VueFinalModal } from 'vue-final-modal'
const router = useRouter()
var current_category = router.currentRoute.value.params.category
var current_location = router.currentRoute.value.params.location
const blogs = ref([])
const listRef = ref(null)
const currentBlog = ref(null)
const currentSize = ref({ width: Math.min(400, window.innerWidth - 40), height: Math.min(300, window.innerHeight - 40) })

const show = ref(false)
const imageVisible = ref(false)
const imageSrc = ref('')
const imageTransitioning = ref(false)
const nextImageUrl = ref('')

var page = 1
var total = 0
const settingStore = useSettingStore()
const baseTitle = isValueNotEmpty(settingStore.metaSetting?.site_name) ? settingStore.metaSetting?.site_name : import.meta.env.VITE_TITLE
const splitter = isValueNotEmpty(settingStore.metaSetting?.site_splitter) ? settingStore.metaSetting?.site_splitter : import.meta.env.VITE_TITLE_SPLITTER
const page_size = isValueNotEmpty(settingStore.contentSetting?.page_size) ? settingStore.contentSetting?.page_size : import.meta.env.VITE_PAGE_SIZE
var thumbnail_suffix = isValueNotEmpty(settingStore.contentSetting?.thumbnail_suffix) ? settingStore.contentSetting?.thumbnail_suffix : ""
var detail_suffix = isValueNotEmpty(settingStore.contentSetting?.detail_suffix) ? settingStore.contentSetting?.detail_suffix : ""
var detail_show_location = isValueNotEmpty(settingStore.contentSetting.detail_show_location) ? settingStore.contentSetting.detail_show_location : true
var thumbnail_time_format = settingStore.contentSetting.thumbnail_time_format && settingStore.contentSetting.thumbnail_time_format != "" ? settingStore.contentSetting.thumbnail_time_format : "YYYY年M月D日"
var detail_show_time = isValueNotEmpty(settingStore.contentSetting.detail_show_time) ? settingStore.contentSetting.detail_show_time : true
var detail_time_format = settingStore.contentSetting.detail_time_format && settingStore.contentSetting.detail_time_format != "" ? settingStore.contentSetting.detail_time_format : "YYYY-MM-DD HH:mm"

function updateAttr(blog) {
    blog.current_thumbnail = blog.images[0].thumbnail
    blog.current_detail = blog.images[blog.currentIndex].detail
    blog.current_desc = blog.images[blog.currentIndex].desc || blog.desc
    blog.current_title = blog.images[blog.currentIndex].title || blog.title
    blog.current_detail_time = blog.images[blog.currentIndex].detail_time || blog.detail_time
    blog.current_location = blog.images[blog.currentIndex].location || blog.location
    blog.current_metadata = blog.images[blog.currentIndex].metadata
    if (isValueNotEmpty(blog.location)) {
        if (isValueNotEmpty(blog.images[blog.currentIndex].location)) {
            blog.current_full_location = `${blog.location} - ${blog.images[blog.currentIndex].location}`;
        } else {
            blog.current_full_location = blog.location
        }
    } else {
        if (isValueNotEmpty(blog.images[blog.currentIndex].location)) {
            blog.current_full_location = blog.images[blog.currentIndex].location;
        } else {
            blog.current_full_location = null
        }
    }
}

function handleResize() {
    throttle(() => {
        showImage(currentBlog.value)
    }, 300)()
}

onMounted(() => {
    window.addEventListener('resize', handleResize)
})

function handleSwipe(blog, event) {
    const index = Number(event.target.dataset.index)
    if (!isNaN(index)) {
        blog.currentIndex = index
        updateAttr(blog)
        showImage(blog)
    }
}
function close() {
    show.value = false
    imageVisible.value = false
    imageTransitioning.value = false
    currentBlog.value = null
    currentSize.value = { width: Math.min(400, window.innerWidth - 40), height: Math.min(300, window.innerHeight - 40) }
    imageSrc.value = ''
    nextImageUrl.value = ''
}
function prev() {
    const index = blogs.value.findIndex(b => b.id === currentBlog.value.id)
    if (index > 0) {
        showImage(blogs.value[index - 1])
    }
}
function next() {
    const index = blogs.value.findIndex(b => b.id === currentBlog.value.id)
    if (index < blogs.value.length - 1) {
        showImage(blogs.value[index + 1])
    }
}
function showImage(blog) {
    currentBlog.value = blog
    imageVisible.value = false
    imageTransitioning.value = true
    setTimeout(() => {
        imageSrc.value = nextImageUrl.value
        imageTransitioning.value = false
        imageVisible.value = true
    }, 1200)
    const img = new window.Image()
    if (blog) {
        img.src = blog.current_detail
    }
    // console.log("Loading image:", img.src)
    img.onload = () => {
        const maxW = Math.min(1150, window.innerWidth - 40)
        const maxH = Math.min(890, window.innerHeight - 40)
        const ratio = Math.min(maxW / img.width, maxH / img.height, 1)
        currentSize.value = {
            width: img.width * ratio,
            height: img.height * ratio,
        }
        nextImageUrl.value = img.src
        // console.log("Image loaded:", img.src, "Size:", currentSize.value)
    }

    show.value = true
}
function onTransitionEnd(e) {
    // console.log("Transition ended for property:", e.propertyName);
    if ((e == null || e.propertyName === 'width' || e.propertyName === 'height') && imageTransitioning.value) {
        imageSrc.value = nextImageUrl.value
        imageTransitioning.value = false
    }
}
function onImageLoad() {
    imageVisible.value = true
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
            res.data.forEach(e => blogs.value.push(e))
            formatBlogs();
            page = res.page;
            total = res.total;
        }
    } catch (e) {
        console.log(e)
    }
}
function formatBlogs() {
    for (let i = 0; i < blogs.value.length; i++) {
        var blog = blogs.value[i]
        blog.currentIndex = 0
        blog.detail_image_urls = []
        for (var index in blog.images) {
            var image = blog.images[index]
            image.thumbnail = image.image_url + thumbnail_suffix
            image.detail = image.image_url + detail_suffix
            if (image.time) {
                image.detail_time = formatDateTime(parseDateTime(image.time), detail_time_format)
            }
            blog.detail_image_urls.push(image.detail)
        }
        var time = parseDateTime(blog.time)
        blog.thumbnail_time = formatDateTime(time, thumbnail_time_format)
        blog.detail_time = formatDateTime(time, detail_time_format)
        updateAttr(blog)
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
    close()
    blogs.value = []
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
.img {
    max-width: 100%;
    max-height: 100%;
}

.img {
    object-fit: contain;
    display: block;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.lightbox {
    backdrop-filter: saturate(180%) blur(10px);
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
    /* max-width: 1150px;
    max-height: 890px; */
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
    background-image: url(/assets/spinner.svg);
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
    background-image: url(/assets/arrow.svg);
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
    background-image: url(/assets/close.svg);
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

    /* .lightbox-content .closer,
    .lightbox-content .nav-previous,
    .lightbox-content .nav-next {
        display: none !important;
    } */

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
    background-image: url("/assets/spinner.svg");
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