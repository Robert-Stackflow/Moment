<template>
    <article class="thumb img-area">
        <a class="thumb-a my-photo" :data-src="data.detail">
            <img class="thumb-image my-photo" onerror="this.src=`/images/loading.gif`;this.onerror=null"
                :src="data.thumbnail" lazy>
        </a>
        <h2 class="thumb-title">{{ data.title }}</h2>
        <p class="thumb-desc">{{ data.desc }}</p>
        <ul class="tags">
            <li class="tag-meta">
                <router-link class="tag-location tag-thumbnail-location" v-if="thumbnail_show_location && data.location"
                    :to="'/location/' + data.location">{{
            data.location }}</router-link>
                <router-link class="tag-location tag-detail-location" v-if="detail_show_location && data.location"
                    :to="'/location/' + data.location">{{ data.location }}</router-link>
                <a class="tag-time tag-thumbnail-time" v-if="thumbnail_show_time && data.time">{{ thumbnail_time
                    }}</a>
                <a class="tag-time tag-detail-time" v-if="detail_show_time && data.time">{{ detail_time }}</a>
            </li>
            <li class="tag-categories">
                <router-link v-for="category in data.formatted_categories" :key="category.alias"
                    :to="'/category/' + category.alias">{{ category.name }}</router-link>
            </li>
        </ul>
    </article>
</template>

<script setup>
import { useSettingStore } from '@/store'
import { parseDateTime, formatDateTime } from '@/utils'
const props = defineProps({
    data: {
        type: Object,
        required: true
    }
})
var thumbnail_time = ref()
var detail_time = ref()
const settingStore = useSettingStore()
var thumbnail_suffix = settingStore.contentSetting?.thumbnail_suffix ?? ""
var detail_suffix = settingStore.contentSetting?.detail_suffix ?? ""
var thumbnail_show_location = settingStore.contentSetting.thumbnail_show_location ?? true
var detail_show_location = settingStore.contentSetting.detail_show_location ?? true
var thumbnail_show_time = settingStore.contentSetting.thumbnail_show_time ?? false
var thumbnail_time_format = settingStore.contentSetting.thumbnail_time_format && settingStore.contentSetting.thumbnail_time_format != "" ? settingStore.contentSetting.thumbnail_time_format : "YYYY年M月D日"
var detail_show_time = settingStore.contentSetting.detail_show_time ?? true
var detail_time_format = settingStore.contentSetting.detail_time_format && settingStore.contentSetting.detail_time_format != "" ? settingStore.contentSetting.detail_time_format : "YYYY-MM-DD HH:mm"
watch(() => props.data, (value) => {
    props.data.thumbnail = props.data.image + thumbnail_suffix
    props.data.detail = props.data.image + detail_suffix
    var time = parseDateTime(props.data.time)
    thumbnail_time.value = formatDateTime(time, thumbnail_time_format)
    detail_time.value = formatDateTime(time, detail_time_format)
}, { immediate: true, deep: true })
</script>
<style>
.thumb .tags .tag-detail-time,
.thumb .tags .tag-detail-location {
    display: none;
}
.thumb .thumb-desc{
    display: none;
}
.poptrox-overlay .caption .thumb-desc{
    padding-top: 5px;
    display: block;
}
.poptrox-overlay .tags .tag-thumbnail-time,
.poptrox-overlay .tags .tag-thumbnail-location {
    display: none;
}

.poptrox-overlay .caption ul.tags {
    margin-bottom: 1.6em;
}

.thumb-image {
    border: 0;
    height: 100%;
    left: 0;
    position: absolute;
    top: 0;
    width: 100%;
    object-fit: cover;
    cursor: pointer;
    outline: 0px;
}

@media (max-width:768px) {
    .thumb-image {
        background-image: url(/images/20200212-6dafa53ecf4e3.gif);
        background-size: 100% 100%;
    }
}

@media only screen and (device-width:375px) and (device-height:812px) and (-webkit-device-pixel-ratio:3) {
    .thumb-image {
        background-image: url(/images/20200212-38ce26bb0bd0d.gif);
        background-size: 100% 100%;
    }
}

@media only screen and (device-width:375px) and (device-height:667px) {
    .thumb-image {
        background-image: url(/images/20200212-e056a5f2914d6.gif);
        background-size: 100% 100%;
    }
}

#blog-main .thumb:after {
    background-image: linear-gradient(to top, rgba(10, 17, 25, 0.35) 5%, rgba(10, 17, 25, 0) 35%);
    pointer-events: none;
    background-size: cover;
    content: '';
    display: block;
    height: 100%;
    left: 0;
    position: absolute;
    top: 0;
    width: 100%;
}

#blog-main .thumb .thumb-title {
    pointer-events: none;
    bottom: 1.875em;
    font-size: 0.8em;
    left: 16px;
    margin: 0;
    position: absolute;
    z-index: 1;
}

#blog-main .thumb {
    transition: opacity 1.25s ease-in-out;
    opacity: 1;
    pointer-events: auto;
    overflow: hidden;
    position: relative;
}

body.is-preload #blog-main .thumb {
    pointer-events: none;
    opacity: 0;
}

#blog-main .thumb {
    transition-delay: 2.525s;
    height: calc(40vh - 2em);
    min-height: 20em;
    width: 25%;
}

#blog-main .thumb:nth-child(1) {
    transition-delay: 0.65s;
}

#blog-main .thumb:nth-child(2) {
    transition-delay: 0.8s;
}

#blog-main .thumb:nth-child(3) {
    transition-delay: 0.95s;
}

#blog-main .thumb:nth-child(4) {
    transition-delay: 1.1s;
}

#blog-main .thumb:nth-child(5) {
    transition-delay: 1.25s;
}

#blog-main .thumb:nth-child(6) {
    transition-delay: 1.4s;
}

#blog-main .thumb:nth-child(7) {
    transition-delay: 1.55s;
}

#blog-main .thumb:nth-child(8) {
    transition-delay: 1.7s;
}

#blog-main .thumb:nth-child(9) {
    transition-delay: 1.85s;
}

#blog-main .thumb:nth-child(10) {
    transition-delay: 2s;
}

#blog-main .thumb:nth-child(11) {
    transition-delay: 2.15s;
}

#blog-main .thumb:nth-child(12) {
    transition-delay: 2.3s;
}

@media screen and (max-width: 1680px) {
    #blog-main .thumb {
        transition-delay: 2.075s;
        height: calc(40vh - 2em);
        min-height: 20em;
        width: 33.33333%;
    }

    #blog-main .thumb:nth-child(1) {
        transition-delay: 0.65s;
    }

    #blog-main .thumb:nth-child(2) {
        transition-delay: 0.8s;
    }

    #blog-main .thumb:nth-child(3) {
        transition-delay: 0.95s;
    }

    #blog-main .thumb:nth-child(4) {
        transition-delay: 1.1s;
    }

    #blog-main .thumb:nth-child(5) {
        transition-delay: 1.25s;
    }

    #blog-main .thumb:nth-child(6) {
        transition-delay: 1.4s;
    }

    #blog-main .thumb:nth-child(7) {
        transition-delay: 1.55s;
    }

    #blog-main .thumb:nth-child(8) {
        transition-delay: 1.7s;
    }

    #blog-main .thumb:nth-child(9) {
        transition-delay: 1.85s;
    }
}

@media screen and (max-width: 1280px) {
    #blog-main .thumb {
        transition-delay: 1.625s;
        height: calc(40vh - 2em);
        min-height: 20em;
        width: 50%;
    }

    #blog-main .thumb:nth-child(1) {
        transition-delay: 0.65s;
    }

    #blog-main .thumb:nth-child(2) {
        transition-delay: 0.8s;
    }

    #blog-main .thumb:nth-child(3) {
        transition-delay: 0.95s;
    }

    #blog-main .thumb:nth-child(4) {
        transition-delay: 1.1s;
    }

    #blog-main .thumb:nth-child(5) {
        transition-delay: 1.25s;
    }

    #blog-main .thumb:nth-child(6) {
        transition-delay: 1.4s;
    }
}

@media screen and (max-width: 980px) {
    #blog-main .thumb {
        transition-delay: 2.075s;
        height: calc(28.57143vh - 1.33333em);
        min-height: 18em;
        width: 50%;
    }

    #blog-main .thumb:nth-child(1) {
        transition-delay: 0.65s;
    }

    #blog-main .thumb:nth-child(2) {
        transition-delay: 0.8s;
    }

    #blog-main .thumb:nth-child(3) {
        transition-delay: 0.95s;
    }

    #blog-main .thumb:nth-child(4) {
        transition-delay: 1.1s;
    }

    #blog-main .thumb:nth-child(5) {
        transition-delay: 1.25s;
    }

    #blog-main .thumb:nth-child(6) {
        transition-delay: 1.4s;
    }

    #blog-main .thumb:nth-child(7) {
        transition-delay: 1.55s;
    }

    #blog-main .thumb:nth-child(8) {
        transition-delay: 1.7s;
    }

    #blog-main .thumb:nth-child(9) {
        transition-delay: 1.85s;
    }
}

@media screen and (max-width: 480px) {
    #blog-main .thumb {
        transition-delay: 1.175s;
        height: calc(40vh - 2em);
        min-height: 18em;
        width: 100%;
    }

    #blog-main .thumb:nth-child(1) {
        transition-delay: 0.65s;
    }

    #blog-main .thumb:nth-child(2) {
        transition-delay: 0.8s;
    }

    #blog-main .thumb:nth-child(3) {
        transition-delay: 0.95s;
    }
}
</style>