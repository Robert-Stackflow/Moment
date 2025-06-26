<template>
  <AppPage :show-footer="false">
    <div flex-1>
      <n-card rounded-10>
        <div flex items-center justify-between>
          <div flex items-center>
            <img rounded-full width="60" :src="userStore.avatar" />
            <div ml-10>
              <p text-20 font-semibold>
                {{ workbench_title }}
              </p>
              <p mt-5 text-14 op-60>{{ workbench_desc }}</p>
            </div>
          </div>
          <n-space :size="12" :wrap="false">
            <n-statistic v-for="item in statisticData" :key="item.id" v-bind="item"
              style="text-align: center;margin-right: 8px;"></n-statistic>
          </n-space>
        </div>
      </n-card>

      <n-card :title="$t('views.workbench.label_latest')" size="small" :segmented="true" mt-15 rounded-10>
        <template #header-extra>
          <router-link to="/admin/content/blog"><n-button text type="primary">{{ $t('views.workbench.label_more')
          }}</n-button></router-link>
        </template>
        <div flex flex-wrap style="row-gap: 10px;column-gap: 10px;flex-direction: row">
          <n-image v-for="blog in blogData" :key="blog.id" :src="blog.image" :width="300" :height="150"
            class="gallery-image" style="border-radius: 8px;" show-toolbar-tooltip>
            <p op-60>{{ blog.image }}</p>
          </n-image>
        </div>
      </n-card>
    </div>
  </AppPage>
</template>

<script setup>
import { useUserStore, useSettingStore } from '@/store'
import api from '@/api'
import { useI18n } from 'vue-i18n'
import { isValueNotEmpty } from '@/utils'

const { t } = useI18n({ useScope: 'global' })

var statisticData = ref([])
var blogData = ref([])

async function getCount() {
  const res = await api.getBlogAndCategoryCount()
  if (res.code === 200) {
    statisticData.value = [
      {
        id: 0,
        label: t('views.workbench.label_number_of_blogs'),
        value: `${res.data.blog}`,
      },
      {
        id: 0,
        label: t('views.workbench.label_number_of_images'),
        value: `${res.data.image}`,
      },
      {
        id: 1,
        label: t('views.workbench.label_number_of_categories'),
        value: `${res.data.category}`,
      }
    ]
  }
}
async function getBlogs() {
  const res = await api.getBlogs({ page: 1, page_size: 20, order_option: "created_at_desc" })
  if (res.code == 200) {
    return res.data;
  }
  return []
}
const userStore = useUserStore()
const settingStore = useSettingStore()
var workbench_title = isValueNotEmpty(settingStore.generalSetting?.workbench_title) ? settingStore.generalSetting?.workbench_title : import.meta.env.VITE_WORKBENCH_TITLE
var workbench_desc = isValueNotEmpty(settingStore.generalSetting?.workbench_desc) ? settingStore.generalSetting?.workbench_desc : import.meta.env.VITE_WORKBENCH_DESC
var thumbnail_suffix = isValueNotEmpty(settingStore.contentSetting?.thumbnail_suffix) ? settingStore.contentSetting?.thumbnail_suffix : ""
workbench_title = workbench_title.replaceAll("{username}", userStore.name)
workbench_desc = workbench_desc.replaceAll("{username}", userStore.name)
getCount()
getBlogs().then((blogs) => {
  blogData.value = blogs.map((e) => {
    e.image = e.images[0].image_url + thumbnail_suffix;
    return e;
  })
})
</script>
<style>
.gallery-image img {
  object-fit: cover !important;
}
</style>