<script setup>
import { ref } from 'vue'
import { NButton, NForm, NFormItem, NInput, NTabPane, NTabs, NImage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import CommonPage from '@/components/page/CommonPage.vue'
import { useSettingStore } from '@/store'
import api from '@/api'
import { is } from '~/src/utils'

const { t } = useI18n()
const settingStore = useSettingStore()
const isLoading = ref(false)

// 用户信息的表单
const infoFormRef = ref(null)
const infoForm = ref({
  workbench_title: settingStore.generalSetting.workbench_title,
  workbench_desc: settingStore.generalSetting.workbench_desc,
  custom_css: settingStore.generalSetting.custom_css,
  custom_js: settingStore.generalSetting.custom_js,
})
async function updateSetting() {
  isLoading.value = true
  infoFormRef.value?.validate(async (err) => {
    if (err) return
    var setting = settingStore.totalSetting
    setting['general']=infoForm.value
    await api
      .updateSetting(setting)
      .then(() => {
        settingStore.setGeneralSetting(infoForm.value)
        isLoading.value = false
        $message.success(t('common.text.update_success'))
      })
      .catch(() => {
        isLoading.value = false
      })
  })
}
const infoFormRules = {

}
</script>

<template>
  <CommonPage :title="$t('views.setting.label_general_setting')">
    <div class="m-30 flex items-center">
      <NForm ref="infoFormRef" label-placement="top" label-align="left" label-width="100" :model="infoForm"
        :rules="infoFormRules" class="w-500">
        <NFormItem :label="$t('views.setting.label_workbench_title')" path="workbench_title">
          <NInput v-model:value="infoForm.workbench_title" type="text"
            :placeholder="$t('views.setting.placeholder_workbench_title',{username:'{username}'})" />
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_workbench_desc')" path="workbench_desc">
          <NInput v-model:value="infoForm.workbench_desc" type="text"
            :placeholder="$t('views.setting.placeholder_workbench_desc',{username:'{username}'})" />
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_custom_css')" path="custom_css">
          <NInput v-model:value="infoForm.custom_css" type="textarea"
            :placeholder="$t('views.setting.placeholder_custom_css')" />
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_custom_js')" path="custom_js">
          <NInput v-model:value="infoForm.custom_js" type="textarea"
            :placeholder="$t('views.setting.placeholder_custom_js')" />
        </NFormItem>
        <NButton type="primary" :loading="isLoading" @click="updateSetting">
          {{ $t('common.buttons.update') }}
        </NButton>
      </NForm>
    </div>
  </CommonPage>
</template>