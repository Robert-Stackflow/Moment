<script setup>
import { h, onMounted, ref, resolveDirective, withDirectives } from 'vue'
import {
  NButton,
  NDatePicker,
  NForm,
  NFormItem,
  NImage,
  NInput,
  NPopconfirm,
  NSwitch,
  NTag,
  NTreeSelect,
} from 'naive-ui'
import EXIF from 'exif-js'
import CommonPage from '@/components/page/CommonPage.vue'
import CrudModal from '@/components/table/CrudModal.vue'
import CrudTable from '@/components/table/CrudTable.vue'
import TheIcon from '@/components/icon/TheIcon.vue'
import { useI18n } from 'vue-i18n'
import { formatDate, renderIcon, isValueNotEmpty } from '@/utils'
import { useCRUD } from '@/composables'
import api from '@/api'
import { useSettingStore } from '@/store'
import { formatDateTime } from '@/utils'
const options = ref([])
const { t } = useI18n()
defineOptions({ name: '图片管理' })
const settingStore = useSettingStore()
var timeout_time = isValueNotEmpty(settingStore.storageSetting?.timeout_time) ? settingStore.storageSetting?.timeout_time : import.meta.env.VITE_TIMEOUT_TIME
const $table = ref(null)
const queryItems = ref({ order_option: "meta_time_desc", categories: [] })
const vPermission = resolveDirective('permission')
const blogDisabled = ref(false)
var locations = ref([])

const initForm = {
  order: 1,
  image: "",
  location: undefined,
}

function disablePreviousDate(ts) {
  return ts > Date.now();
}

const {
  modalVisible,
  modalTitle,
  modalLoading,
  handleAdd,
  handleDelete,
  handleEdit,
  handleView,
  handleSave,
  modalForm,
  modalFormRef,
} = useCRUD({
  name: "图片",
  initForm,
  doCreate: api.createBlog,
  doDelete: api.deleteBlog,
  doUpdate: api.updateBlog,
  refresh: () => $table.value?.handleSearch(),
})

onMounted(async () => {
  $table.value?.handleSearch()
  getTreeSelect()
  await getLocations()
})

const categoryTreeOptions = ref([])

var thumbnail_suffix = isValueNotEmpty(settingStore.contentSetting?.thumbnail_suffix) ? settingStore.contentSetting?.thumbnail_suffix : ""
var detail_suffix = isValueNotEmpty(settingStore.contentSetting?.detail_suffix) ? settingStore.contentSetting?.detail_suffix : ""

const columns = [
  { title: 'ID', key: 'id', width: 50, ellipsis: { tooltip: true } },
  { title: '标题', key: 'title', width: 120, ellipsis: { tooltip: true } },
  {
    title: '图片', key: 'image', width: 80, render(row) {
      return h(
        NImage,
        {
          width: 80,
          height: 60,
          class: "table-image",
          lazy: true,
          src: row.image + thumbnail_suffix,
          previewSrc: row.image + detail_suffix,
          "show-toolbar-tooltip": true,
          style: "border-radius:8px"
        },
      )
    },
  },
  { title: '地点', key: 'location', width: 80, ellipsis: { tooltip: true } },
  { title: '时间', key: 'time', width: 100, ellipsis: { tooltip: true } },
  {
    title: '分类',
    key: 'formatted_categories',
    width: 120,
    ellipsis: { tooltip: true },
    render(row) {
      return row.formatted_categories.map(e => h(NButton, {
        type: 'info',
        strong: true,
        secondary: true,
        round: true,
        style: "margin-left:5px;",
        onClick: (_) => appendCategories(e.id)
      }, () => e.name))
    },
  },
  {
    title: '隐藏',
    key: 'is_hidden',
    width: 40,
    render(row) {
      return h(NSwitch, {
        size: 'small',
        rubberBand: false,
        value: row.is_hidden,
        onUpdateValue: () => handleUpdateHidden(row),
      })
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    align: 'center',
    fixed: 'right',
    render(row) {
      return [
        withDirectives(
          h(
            NButton,
            {
              size: 'tiny',
              type: 'primary',
              style: "margin-left:5px;",
              onClick: () => {
                handleEdit(row)
              },
            },
            {
              default: () => '编辑',
              icon: renderIcon('material-symbols:edit-outline', { size: 16 }),
            },
          ),
          [[vPermission, 'post/api/v1/blog/update']],
        ),
        h(
          NPopconfirm,
          {
            onPositiveClick: () => handleDelete({ id: row.id }, false),
          },
          {
            trigger: () =>
              withDirectives(
                h(
                  NButton,
                  {
                    size: 'tiny',
                    type: 'error',
                    style: "margin-left:5px;",
                  },
                  {
                    default: () => '删除',
                    icon: renderIcon('material-symbols:delete-outline', { size: 16 }),
                  },
                ),
                [[vPermission, 'delete/api/v1/blog/delete']],
              ),
            default: () => h('div', {}, '确定删除该图片吗?'),
          },
        ),
      ]
    },
  },
]

function handleClickAdd() {
  initForm.time = formatDateTime(Date.now())
  handleAdd()
}

function appendCategories(id) {
  if (!queryItems.value.categories.includes(id)) {
    queryItems.value.categories.push(id)
    $table.value?.handleSearch()
  }
}

async function getLocations() {
  const res = await api.getBlogLocations()
  if (res.code === 200) {
    var sorted_locations = res.data
    locations.value = sorted_locations.map((e) => { return { 'label': e[0], 'value': e[0] } })
  }
}

async function handleUpdateHidden(row) {
  if (!row.id) return
  row.publishing = true
  row.is_hidden = row.is_hidden === false ? true : false
  await api.updateBlog(row)
  row.publishing = false
  $message?.success(row.is_hidden ? '已开启' : '已关闭')
}

function handleGetPictureTime() {
  $message.loading(t('views.content.label_parsing'))
  EXIF.getData(document.getElementById('preview-image'), function () {
    if (EXIF.imageHasData(this)) {
      var time = EXIF.getTag(this, 'SubsecTime')
      $message.success(t('views.content.label_get_exif_success'))
    } else {
      $message.error(t('views.content.label_no_exif'))
    }
  })
}

async function getTreeSelect() {
  const { data } = await api.getCategories()
  categoryTreeOptions.value = data
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
  }, timeout_time
  ).then((response) => {
    $message.success(response.msg);
    modalForm.value.image = response.data
    onFinish();
  }).catch((error) => {
    onError();
  });
};
api.getOrderOptionVisitor().then((res) => {
  if (res.code == 200) {
    options.value = res.data.map((e) => JSON.parse(e))
  }
})
</script>

<template>
  <!-- 业务页面 -->
  <CommonPage show-footer :title="$t('views.content.label_blog_list')">
    <template #action>
      <NButton v-permission="'post/api/v1/blog/create'" type="primary" @click="handleClickAdd">
        <TheIcon icon="material-symbols:add" :size="18" class="mr-5" />{{ $t('views.content.label_new_blog') }}
      </NButton>
    </template>

    <!-- 表格 -->
    <CrudTable ref="$table" v-model:query-items="queryItems" :is-pagination="true" :columns="columns"
      :get-data="api.getBlogs">
      <template #queryBar>
        <QueryBarItem label="标题" :label-width="40">
          <NInput v-model:value="queryItems.title" clearable type="text" placeholder="请输入图片标题"
            @keypress.enter="$table?.handleSearch()" />
        </QueryBarItem>
        <QueryBarItem label="描述" :label-width="40">
          <NInput v-model:value="queryItems.desc" clearable type="text" placeholder="请输入图片描述"
            @keypress.enter="$table?.handleSearch()" />
        </QueryBarItem>
        <QueryBarItem label="地点" :label-width="40">
          <NInput v-model:value="queryItems.location" clearable type="text" placeholder="请输入图片地点"
            @keypress.enter="$table?.handleSearch()" />
        </QueryBarItem>
        <QueryBarItem label="排序" :label-width="40" style="width: 264px;">
          <n-select v-model:value="queryItems.order_option" :options="options" @keypress.enter="$table?.handleSearch()"
            @update:value="$table?.handleSearch()" style="width: 224px;" />
        </QueryBarItem>
        <QueryBarItem label="分类" :label-width="40" style="width: 264px;">
          <NTreeSelect v-model:value="queryItems.categories" multiple checkable key-field="id" label-field="name"
            :options="categoryTreeOptions" default-expand-all @click="getTreeSelect"
            @update:value="$table?.handleSearch()" style="width: 224px;" />
        </QueryBarItem>
      </template>
    </CrudTable>

    <!-- 新增/编辑/查看 弹窗 -->
    <CrudModal v-model:visible="modalVisible" :title="modalTitle" :loading="modalLoading"
      @save="handleSave(getTreeSelect, getLocations)" @onSave="null">
      <!-- 表单 -->
      <NForm ref="modalFormRef" label-placement="top" label-align="left" :label-width="80" :model="modalForm">
        <NFormItem label="标题" path="title" :rule="{
          required: true,
          message: '请输入标题',
          trigger: ['input', 'blur'],
        }">
          <NInput v-model:value="modalForm.title" placeholder="请输入标题" maxlength="50" show-count clearable />
        </NFormItem>
        <NFormItem label="图片地址" path="image" :rule="{
          required: true,
          message: '请输入图片地址',
          trigger: ['input', 'blur'],
        }">
          <NInput v-model:value="modalForm.image" type="text" placeholder="请输入图片地址" clearable />
        </NFormItem>
        <n-upload :action="api.uploadApi" :custom-request="customRequest" class="upload-button"
          v-if="settingStore.storageSetting.enable_storage" @before-upload="beforeUploadImage"
          accept=".tif,.jpg,.jpeg,.ico,.tiff,.gif,.svg,.jfif,.webp,.png,.bmp,.jpeg,.avif" :show-file-list="false">
          <n-button>上传图片</n-button>
        </n-upload>
        <NImage width="300" :src="modalForm.image + thumbnail_suffix"
          v-if="modalForm.image != undefined && modalForm.image != ''" id="preview-image" show-toolbar-tooltip></NImage>
        <NFormItem label="时间" path="time">
          <NDatePicker type="datetime" v-model:formatted-value="modalForm.time" placeholder="请输入时间"
            value-format="yyyy-MM-dd HH:mm:ss" :is-date-disabled="disablePreviousDate" />
          <!-- <NButton type="primary" @click="handleGetPictureTime" style="margin-left: 20px;"
            :disabled="modalForm.image == undefined || modalForm.image == ''">
            <TheIcon icon="material-symbols:auto-timer-outline" :size="18" class="mr-5" />{{
    $t('views.content.label_get_picture_time') }}
          </NButton> -->
        </NFormItem>
        <NFormItem label="地点" path="location">
          <NSelect v-model:value="modalForm.location" :options="locations" placeholder="请输入地点" clearable
            @search="getLocations" />
        </NFormItem>
        <NFormItem label="分类" path="categories">
          <NTreeSelect v-model:value="modalForm.categories" multiple checkable key-field="id" label-field="name"
            :options="categoryTreeOptions" default-expand-all :disabled="blogDisabled" @click="getTreeSelect" />
        </NFormItem>
        <NFormItem label="描述" path="desc">
          <NInput v-model:value="modalForm.desc" type="textarea" placeholder="请输入描述（将会展示在图片详情页面）" />
        </NFormItem>
        <NFormItem label="隐藏图片" path="is_hidden">
          <NSwitch v-model:value="modalForm.is_hidden" />
        </NFormItem>
      </NForm>
    </CrudModal>
  </CommonPage>
</template>
<style>
#preview-image {
  border-radius: 8px;
  margin-bottom: 25px;
}

.upload-button {
  margin-bottom: 24px;
}

.n-tag.n-tag--round {
  margin-top: 3px;
  margin-bottom: 3px;
}

.table-image img {
  object-fit: cover !important;
}
</style>