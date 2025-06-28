<script setup>
import { ref } from 'vue'
import { NButton, NForm, NFormItem, NInput, NTabPane, NTabs, NImage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import CommonPage from '@/components/page/CommonPage.vue'
import { useUserStore, useSettingStore } from '@/store'
import api from '@/api'
import { is } from '~/src/utils'
const settingStore = useSettingStore()

const { t } = useI18n()
const userStore = useUserStore()
const isLoading = ref(false)

// 用户信息的表单
const infoFormRef = ref(null)
const infoForm = ref({
  avatar: userStore.avatar,
  username: userStore.name,
  email: userStore.email,
})
async function updateProfile() {
  isLoading.value = true
  infoFormRef.value?.validate(async (err) => {
    if (err) return
    await api
      .updateUser({ ...infoForm.value, id: userStore.userId })
      .then(() => {
        userStore.setUserInfo(infoForm.value)
        isLoading.value = false
        $message.success(t('common.text.save_success'))
      })
      .catch(() => {
        isLoading.value = false
      })
  })
}
const infoFormRules = {
  username: [
    {
      required: true,
      message: t('views.profile.message_username_required'),
      trigger: ['input', 'blur', 'change'],
    },
  ],
}

// 修改密码的表单
const passwordFormRef = ref(null)
const passwordForm = ref({
  old_password: '',
  new_password: '',
  confirm_password: '',
})

async function updatePassword() {
  isLoading.value = true
  passwordFormRef.value?.validate(async (err) => {
    if (!err) {
      const data = { ...passwordForm.value, id: userStore.userId }
      await api
        .updatePassword(data)
        .then((res) => {
          $message.success(res.msg)
          passwordForm.value = {
            old_password: '',
            new_password: '',
            confirm_password: '',
          }
          isLoading.value = false
        })
        .catch(() => {
          isLoading.value = false
        })
    }
  })
}
const passwordFormRules = {
  old_password: [
    {
      required: true,
      message: t('views.profile.message_old_password_required'),
      trigger: ['input', 'blur', 'change'],
    },
  ],
  new_password: [
    {
      required: true,
      message: t('views.profile.message_new_password_required'),
      trigger: ['input', 'blur', 'change'],
    },
  ],
  confirm_password: [
    {
      required: true,
      message: t('views.profile.message_password_confirmation_required'),
      trigger: ['input', 'blur'],
    },
    {
      validator: validatePasswordStartWith,
      message: t('views.profile.message_password_confirmation_diff'),
      trigger: 'input',
    },
    {
      validator: validatePasswordSame,
      message: t('views.profile.message_password_confirmation_diff'),
      trigger: ['blur', 'password-input'],
    },
  ],
}
function validatePasswordStartWith(rule, value) {
  return (
    !!passwordForm.value.new_password &&
    passwordForm.value.new_password.startsWith(value) &&
    passwordForm.value.new_password.length >= value.length
  )
}
function validatePasswordSame(rule, value) {
  return value === passwordForm.value.new_password
}

async function beforeUploadImage(data) {
  var types = ['image/avif', 'image/vnd.microsoft.icon', 'image/jpeg', 'image/tiff', 'image/bmp', 'image/svg+xml', 'image/webp', 'image/png']
  if (types.indexOf(data.file.file?.type) == -1) {
    $message.error('只能上传图片文件，请重新上传')
    return false
  }
  return true
}

const customRequest = ({
  file,
  data,
  headers,
  withCredentials,
  action,
  onFinish,
  onError,
  onProgress
}) => {
  const formData = new FormData();
  if (data) {
    Object.keys(data).forEach((key) => {
      formData.append(
        key,
        data[key]
      );
    });
  }
  formData.append("file", file.file);
  api.uploadImage(formData, headers, (progressEvent) => {
    var percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
    onProgress({ percent: Math.ceil(percent) });
    $message.loading(t('views.content.label_uploading') + ` ${Math.ceil(percent)}%`);
  }
  ).then((response) => {
    $message.success(response.msg);
    infoForm.value.avatar = response.data
    onFinish();
  }).catch((error) => {
    onError();
  });
};

</script>

<template>
  <CommonPage :show-header="false">
    <NTabs type="line" animated>
      <NTabPane name="website" :tab="$t('views.profile.label_modify_information')">
        <div class="m-30 flex items-center">
          <NForm ref="infoFormRef" label-placement="top" label-align="left" label-width="100" :model="infoForm"
            :rules="infoFormRules" class="w-500">
            <NFormItem :label="$t('views.profile.label_avatar')" path="avatar">
              <NInput v-model:value="infoForm.avatar" type="text"
                :placeholder="$t('views.profile.placeholder_avatar')" />
            </NFormItem>
            <n-upload :action="api.uploadApi" :custom-request="customRequest" class="upload-button"
              v-if="settingStore.storageSetting.enable_storage" @before-upload="beforeUploadImage"
              accept=".tif,.jpg,.jpeg,.ico,.tiff,.gif,.svg,.jfif,.webp,.png,.bmp,.jpeg,.avif" :show-file-list="false">
              <n-button>上传图片</n-button>
            </n-upload>
            <NImage width="100" :src="infoForm.avatar" v-if="infoForm.avatar != undefined && infoForm.avatar != ''"
              id="preview-avatar"></NImage>
            <NFormItem :label="$t('views.profile.label_username')" path="username">
              <NInput v-model:value="infoForm.username" type="text"
                :placeholder="$t('views.profile.placeholder_username')" />
            </NFormItem>
            <NFormItem :label="$t('views.profile.label_email')" path="email">
              <NInput v-model:value="infoForm.email" type="text" :placeholder="$t('views.profile.placeholder_email')" />
            </NFormItem>
            <NButton type="primary" :loading="isLoading" @click="updateProfile">
              {{ $t('common.buttons.save') }}
            </NButton>
          </NForm>
        </div>
      </NTabPane>
      <NTabPane name="contact" :tab="$t('views.profile.label_change_password')">
        <NForm ref="passwordFormRef" label-placement="top" label-align="left" :model="passwordForm" label-width="200"
          :rules="passwordFormRules" class="m-30 w-500">
          <NFormItem :label="$t('views.profile.label_old_password')" path="old_password">
            <NInput v-model:value="passwordForm.old_password" type="password" show-password-on="mousedown"
              :placeholder="$t('views.profile.placeholder_old_password')" />
          </NFormItem>
          <NFormItem :label="$t('views.profile.label_new_password')" path="new_password">
            <NInput v-model:value="passwordForm.new_password" :disabled="!passwordForm.old_password" type="password"
              show-password-on="mousedown" :placeholder="$t('views.profile.placeholder_new_password')" />
          </NFormItem>
          <NFormItem :label="$t('views.profile.label_confirm_password')" path="confirm_password">
            <NInput v-model:value="passwordForm.confirm_password" :disabled="!passwordForm.new_password" type="password"
              show-password-on="mousedown" :placeholder="$t('views.profile.placeholder_confirm_password')" />
          </NFormItem>
          <NButton type="primary" :loading="isLoading" @click="updatePassword">
            {{ $t('common.buttons.save') }}
          </NButton>
        </NForm>
      </NTabPane>
    </NTabs>
  </CommonPage>
</template>
<style scoped>
#preview-avatar {
  border-radius: 8px;
  margin-bottom: 25px;
}

.upload-button {
  margin-bottom: 24px;
}
</style>