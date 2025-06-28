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
  enable_storage: settingStore.storageSetting.enable_storage,
  max_size: settingStore.storageSetting.max_size,
  timeout_time: settingStore.storageSetting.timeout_time,
  endpoint: settingStore.storageSetting.endpoint,
  region: settingStore.storageSetting.region,
  access_id: settingStore.storageSetting.access_id,
  secret_key: settingStore.storageSetting.secret_key,
  bucket: settingStore.storageSetting.bucket,
  path: settingStore.storageSetting.path,
  prefix: settingStore.storageSetting.prefix,
  suffix: settingStore.storageSetting.suffix,
})
async function updateSetting(verbose) {
  isLoading.value = true
  infoFormRef.value?.validate(async (err) => {
    if (err) return
    var setting = settingStore.totalSetting
    setting['storage'] = infoForm.value
    await api
      .updateSetting(setting)
      .then(() => {
        settingStore.setStorageSetting(infoForm.value)
        isLoading.value = false
        if (verbose)
          $message.success(t('common.text.save_success'))
      })
      .catch(() => {
        isLoading.value = false
      })
  })
}
const infoFormRules = {

}
function handleChange(value) {
  $message.success(value ? t('views.setting.label_enable_storage') : t('views.setting.label_disable_storage'))
  updateSetting(false)
}
</script>

<template>
  <CommonPage :title="$t('views.setting.label_storage_setting')">
    <div class="m-30 flex items-center">
      <NForm ref="infoFormRef" label-placement="top" label-align="left" label-width="100" :model="infoForm"
        :rules="infoFormRules" class="w-500">
        <NFormItem :label="$t('views.setting.label_enable_storage')" path="enable_storage">
          <NSwitch v-model:value="infoForm.enable_storage" clearable @update:value="handleChange" />
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_max_size')" path="max_size">
          <NInputNumber :precision="2" :disabled="!infoForm.enable_storage"
            :placeholder="$t('views.setting.placeholder_max_size')" v-model:value="infoForm.max_size" w-500>
            <template #suffix>
              MB
            </template>
          </NInputNumber>
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_timeout_time')" path="timeout_time">
          <NInputNumber :precision="0" :disabled="!infoForm.enable_storage"
            :placeholder="$t('views.setting.placeholder_timeout_time')" v-model:value="infoForm.timeout_time" w-500>
            <template #suffix>
              秒
            </template>
          </NInputNumber>
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_endpoint')" path="endpoint">
          <NInput v-model:value="infoForm.endpoint" type="text" :placeholder="$t('views.setting.placeholder_endpoint')"
            :disabled="!infoForm.enable_storage" clearable />
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_region')" path="region">
          <NInput v-model:value="infoForm.region" type="text" :placeholder="$t('views.setting.placeholder_region')"
            :disabled="!infoForm.enable_storage" clearable />
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_access_id')" path="access_id">
          <NInput v-model:value="infoForm.access_id" type="text"
            :placeholder="$t('views.setting.placeholder_access_id')" :disabled="!infoForm.enable_storage" clearable />
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_secret_key')" path="secret_key">
          <NInput v-model:value="infoForm.secret_key" type="text"
            :placeholder="$t('views.setting.placeholder_secret_key')" :disabled="!infoForm.enable_storage" clearable />
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_bucket')" path="bucket">
          <NInput v-model:value="infoForm.bucket" type="text" :placeholder="$t('views.setting.placeholder_bucket')"
            :disabled="!infoForm.enable_storage" clearable />
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_path')" path="path">
          <NInput v-model:value="infoForm.path" type="text"
            :placeholder="$t('views.setting.placeholder_path', { path: '/{year}/{month}/{timestamp}_{filename}' })"
            :disabled="!infoForm.enable_storage" clearable />
        </NFormItem>
        <NFormItem :label="$t('views.setting.label_prefix')" path="prefix">
          <NInput v-model:value="infoForm.prefix" type="text" :placeholder="$t('views.setting.placeholder_prefix')"
            :disabled="!infoForm.enable_storage" clearable />
        </NFormItem>
        <NButton type="primary" :loading="isLoading" @click="updateSetting(true)">
          {{ $t('common.buttons.save') }}
        </NButton>
      </NForm>
    </div>
  </CommonPage>
</template>