<template>
    <div id="blog-main" ref="listRef">
        <Image v-for="blog in blogData" :key="blog.id" :data="blog" />
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
var page = 1
var total = 0
const settingStore = useSettingStore()
const baseTitle = settingStore.metaSetting?.site_name ?? import.meta.env.VITE_TITLE
const splitter = settingStore.metaSetting?.site_splitter ?? "|"
const page_size = settingStore.contentSetting?.page_size ?? import.meta.env.VITE_PAGE_SIZE
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
async function getBlogsAndPoptrox() {
    getBlogs().then(() => {
        try {
            $('#blog-main').poptrox({
                baseZIndex: 20000,
                caption: function ($a) {

                    var s = '';
                    $a.nextAll().each(function () {
                        s += this.outerHTML;
                    });
                    return s;

                },
                fadeSpeed: 300,
                onPopupClose: function () { $("body").removeClass('modal-active'); },
                onPopupOpen: function () { $("body").addClass('modal-active'); },
                overlayOpacity: 0,
                selector: ".thumb > .thumb-a",
                popupCloserText: '',
                popupHeight: 150,
                popupLoaderText: '',
                popupSpeed: 300,
                popupWidth: 150,
                usePopupCaption: true,
                usePopupCloser: true,
                usePopupDefaultStyling: false,
                usePopupForceClose: true,
                usePopupLoader: true,
                usePopupNav: true,
                windowMargin: 50
            });
        } catch (e) {
        }
    })
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
    console.log("触底")
    if (page * page_size < total) {
        page++;
        getBlogsAndPoptrox()
    }
}
watch(() => router.currentRoute.value, (value) => {
    current_category = value.params.category
    current_location = value.params.location
    blogData.value = []
    getBlogsAndPoptrox()
    getCategory()
    if (isValueNotEmpty(current_location)) {
        document.title = `${current_location} ${splitter} ${baseTitle}`
    }
}, { immediate: true, deep: true })
scrollToload(listRef, loadMore)
scrollToload(null, loadMore)
</script>
<style>
#blog-main {
    transition: filter 0.5s ease;
    display: flex;
    flex-wrap: wrap;
    /* position: fixed; */
    /* top: 0; */
    /* left: 0; */
    /* right: 0; */
    /* bottom: 80px; */
    overflow: auto
}

body {
    padding-bottom: 80px;
}

@media screen and (max-width: 736px) {
    /* #blog-main {
        position: fixed;
        top: 60px;
        left: 0;
        right: 0;
        bottom: 0;
    } */

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

.poptrox-overlay {
    backdrop-filter: saturate(180%) blur(20px);
    background: var(--moment-maskbgdeep);
}

.poptrox-popup {
    background: rgba(31, 34, 36, 0.925);
    box-shadow: 0 1em 3em 0.5em rgba(0, 0, 0, 0.25);
    cursor: default;
    border-radius: 12px;
    overflow: hidden;
}

.poptrox-popup:before {
    transition: opacity 0.2s ease-in-out;
    content: '';
    display: block;
    height: 100%;
    left: 0;
    position: absolute;
    top: 0;
    width: 100%;
    z-index: 1;
    opacity: 1;
}

.poptrox-popup .closer {
    transition: opacity 0.2s ease-in-out;
    background-image: url("/images/close.svg");
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

.poptrox-popup .nav-previous,
.poptrox-popup .nav-next {
    transition: opacity 0.2s ease-in-out;
    background-image: url("/images/arrow.svg");
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

.poptrox-popup .nav-previous {
    transform: scaleX(-1);
    left: 0;
}

.poptrox-popup .nav-next {
    right: 0;
}

.poptrox-popup .caption {
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

.poptrox-popup .caption h2,
.poptrox-popup .caption h3,
.poptrox-popup .caption h4,
.poptrox-popup .caption h5,
.poptrox-popup .caption h6 {
    margin: 0;
    font-weight: bold;
}

.poptrox-popup .caption .thumb-desc {
    color: #ffffff;
    font-size: 15px;
    margin: 4px 0;
}

.poptrox-popup .loader {
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

.poptrox-popup:hover .closer,
.poptrox-popup:hover .nav-previous,
.poptrox-popup:hover .nav-next {
    opacity: 0.5;
}

.poptrox-popup:hover .closer:hover,
.poptrox-popup:hover .nav-previous:hover,
.poptrox-popup:hover .nav-next:hover {
    opacity: 1.0;
}

.poptrox-popup.loading:before {
    opacity: 0;
}

body.touch .poptrox-popup .closer,
body.touch .poptrox-popup .nav-previous,
body.touch .poptrox-popup .nav-next {
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

#blog-main .tag-meta a[data-show-abbreviation=""] {
    display: none;
}

.poptrox-popup .tag-meta a[data-show-detail=""] {
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

.poptrox-popup .tag-categories a {
    background: var(--moment-black-op);
}

.poptrox-popup .tag-categories a:hover {
    background: var(--moment-theme);
}

@media screen and (max-width: 980px) {
    .poptrox-popup .closer {
        background-size: 3em;
    }

    .poptrox-popup .nav-previous,
    .poptrox-popup .nav-next {
        background-size: 4em;
    }
}

@media screen and (max-width: 736px) {

    .poptrox-popup:before {
        display: none;
    }

    .poptrox-popup .caption .thumb-desc {
        margin: 10px 0px 0px 0px
    }

    .poptrox-popup .caption {
        bottom: 10px;
        position: fixed;
    }

    .poptrox-popup .closer,
    .poptrox-popup .nav-previous,
    .poptrox-popup .nav-next {
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
</style>