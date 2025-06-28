<script setup>
import { ref } from 'vue'
import { NButton, NForm, NFormItem, NInput, NTabPane, NTabs, NImage, NGrid, NInputNumber } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import CommonPage from '@/components/page/CommonPage.vue'
import { useSettingStore } from '@/store'
import api from '@/api'
import { is } from '~/src/utils'

const { t } = useI18n()
const settingStore = useSettingStore()
const isLoading = ref(false)
const options = ref([])
// 用户信息的表单
const infoFormRef = ref(null)
const infoForm = ref({
  page_size: settingStore.contentSetting.page_size,
  thumbnail_suffix: settingStore.contentSetting.thumbnail_suffix,
  detail_suffix: settingStore.contentSetting.detail_suffix,
  order_option: settingStore.contentSetting.order_option,
  thumbnail_show_location: settingStore.contentSetting.thumbnail_show_location,
  detail_show_location: settingStore.contentSetting.detail_show_location,
  thumbnail_show_time: settingStore.contentSetting.thumbnail_show_time,
  thumbnail_time_format: settingStore.contentSetting.thumbnail_time_format,
  detail_show_time: settingStore.contentSetting.detail_show_time,
  detail_time_format: settingStore.contentSetting.detail_time_format,
})
async function updateSetting() {
  isLoading.value = true
  infoFormRef.value?.validate(async (err) => {
    if (err) return
    var setting = settingStore.totalSetting
    setting['content'] = infoForm.value
    await api
      .updateSetting(setting)
      .then(() => {
        settingStore.setContentSetting(infoForm.value)
        isLoading.value = false
        $message.success(t('common.text.save_success'))
      })
      .catch(() => {
        isLoading.value = false
      })
  })
}
const infoFormRules = {

}
api.getOrderOptionVisitor().then((res) => {
  if (res.code == 200) {
    options.value = res.data.map((e) => JSON.parse(e))
  }
})
</script>

<template>
  <CommonPage :title="$t('views.setting.label_content_setting')">
    <div class="m-30 flex items-center">
      <NForm ref="infoFormRef" label-placement="top" label-align="left" label-width="100" :model="infoForm"
        :rules="infoFormRules" class="w-500">
        <NFormItem :label="$t('views.setting.label_page_size')" path="page_size">
          <NInputNumber clearable :precision="0" :placeholder="$t('views.setting.placeholder_page_size')"
            v-model:value="infoForm.page_size" />
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_thumbnail_suffix')" path="thumbnail_suffix">
          <NInput v-model:value="infoForm.thumbnail_suffix" type="text"
            :placeholder="$t('views.setting.placeholder_thumbnail_suffix')" clearable />
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_detail_suffix')" path="detail_suffix">
          <NInput v-model:value="infoForm.detail_suffix" type="text"
            :placeholder="$t('views.setting.placeholder_detail_suffix')" clearable />
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_order_option')" path="order_option">
          <n-select v-model:value="infoForm.order_option" :options="options" />
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_thumbnail_show_location')" path="thumbnail_show_location">
          <NSwitch v-model:value="infoForm.thumbnail_show_location" />
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_detail_show_location')" path="detail_show_location">
          <NSwitch v-model:value="infoForm.detail_show_location" />
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_thumbnail_show_time')" path="thumbnail_show_time">
          <NSwitch v-model:value="infoForm.thumbnail_show_time" />
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_thumbnail_time_format')" path="thumbnail_time_format">
          <NInput v-model:value="infoForm.thumbnail_time_format" type="text" :disabled="!infoForm.thumbnail_show_time"
            :placeholder="$t('views.setting.placeholder_thumbnail_time_format')" clearable />
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_detail_show_time')" path="detail_show_time">
          <NSwitch v-model:value="infoForm.detail_show_time" />
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_detail_time_format')" path="detail_time_format">
          <NInput v-model:value="infoForm.detail_time_format" type="text" :disabled="!infoForm.detail_show_time"
            :placeholder="$t('views.setting.placeholder_detail_time_format')" clearable />
        </NFormItem>
        <NButton type="primary" :loading="isLoading" @click="updateSetting">
          {{ $t('common.buttons.save') }}
        </NButton>
      </NForm>
    </div>
  </CommonPage>
</template>