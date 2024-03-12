<script setup>
import { h, onMounted, ref, resolveDirective, withDirectives } from 'vue'
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NPopconfirm,
  NSwitch,
  NTreeSelect,
} from 'naive-ui'

import CommonPage from '@/components/page/CommonPage.vue'
import CrudModal from '@/components/table/CrudModal.vue'
import CrudTable from '@/components/table/CrudTable.vue'
import TheIcon from '@/components/icon/TheIcon.vue'

import { formatDate, renderIcon } from '@/utils'
import { useCRUD } from '@/composables'
import api from '@/api'

defineOptions({ name: '分类管理' })

const $table = ref(null)
const queryItems = ref({})
const vPermission = resolveDirective('permission')
const categoryDisabled = ref(false)

const initForm = {
  order: 1,
}

const {
  modalVisible,
  modalTitle,
  modalLoading,
  handleAdd,
  handleDelete,
  handleEdit,
  handleSave,
  modalForm,
  modalFormRef,
} = useCRUD({
  name: '分类',
  initForm,
  doCreate: api.createCategory,
  doDelete: api.deleteCategory,
  doUpdate: api.updateCategory,
  refresh: () => $table.value?.handleSearch(),
})

onMounted(() => {
  $table.value?.handleSearch()
  getTreeSelect()
})

// 是否展示 "分类类型"
const showCategoryType = ref(false)
const categoryOptions = ref([])

const columns = [
  { title: 'ID', key: 'id', width: 50, ellipsis: { tooltip: true } },
  { title: '分类名称', key: 'name', width: 80, ellipsis: { tooltip: true } },
  { title: '分类别名', key: 'alias', width: 80, ellipsis: { tooltip: true } },
  { title: '分类描述', key: 'desc', width: 80, ellipsis: { tooltip: true } },
  { title: '排序', key: 'order', width: 30, ellipsis: { tooltip: true } },
  {
    title: '创建日期',
    key: 'created_at',
    width: 70,
    render(row) {
      return h('span', formatDate(row.created_at))
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 80,
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
              style: `display: ${row.children ? '' : 'none'};margin-left:5px;`,
              onClick: () => {
                initForm.parent_id = row.id
                handleAdd()
              },
            },
            { default: () => '子分类', icon: renderIcon('material-symbols:add', { size: 16 }) },
          ),
          [[vPermission, 'post/api/v1/category/create']],
        ),
        withDirectives(
          h(
            NButton,
            {
              size: 'tiny',
              type: 'info',
              style: "margin-left:5px;",
              onClick: () => {
                showCategoryType.value = false
                handleEdit(row)
              },
            },
            {
              default: () => '编辑',
              icon: renderIcon('material-symbols:edit-outline', { size: 16 }),
            },
          ),
          [[vPermission, 'post/api/v1/category/update']],
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
                    style: `display: ${row.children && row.children.length > 0 ? 'none' : ''};margin-left:5px;`, //有子分类不允许删除
                  },
                  {
                    default: () => '删除',
                    icon: renderIcon('material-symbols:delete-outline', { size: 16 }),
                  },
                ),
                [[vPermission, 'delete/api/v1/category/delete']],
              ),
            default: () => h('div', {}, '确定删除该分类吗?'),
          },
        ),
      ]
    },
  },
]

function handleClickAdd() {
  initForm.parent_id = 0
  initForm.order = 1
  handleAdd()
}

async function getTreeSelect() {
  const { data } = await api.getCategories()
  const category = { id: 0, name: '根目录', children: [] }
  category.children = data
  categoryOptions.value = [category]
}
</script>

<template>
  <!-- 业务页面 -->
  <CommonPage show-footer :title="$t('views.content.label_category_list')">
    <template #action>
      <NButton v-permission="'post/api/v1/category/create'" type="primary" @click="handleClickAdd">
        <TheIcon icon="material-symbols:add" :size="18" class="mr-5" />{{ $t('views.content.label_new_root_category') }}
      </NButton>
    </template>

    <!-- 表格 -->
    <CrudTable
      ref="$table"
      v-model:query-items="queryItems"
      :is-pagination="true"
      :columns="columns"
      :get-data="api.getCategories"
    >
    </CrudTable>

    <!-- 新增/编辑/查看 弹窗 -->
    <CrudModal
      v-model:visible="modalVisible"
      :title="modalTitle"
      :loading="modalLoading"
      @save="handleSave(getTreeSelect)"
    >
      <!-- 表单 -->
      <NForm
        ref="modalFormRef"
        label-placement="top"
        label-align="left"
        :label-width="80"
        :model="modalForm"
      >
        <NFormItem label="父级分类" path="parent_id">
          <NTreeSelect
            v-model:value="modalForm.parent_id"
            key-field="id"
            label-field="name"
            :options="categoryOptions"
            default-expand-all
            :disabled="categoryDisabled"
          />
        </NFormItem>
        <NFormItem
          label="分类名称"
          path="name"
          :rule="{
            required: true,
            message: '请输入分类名称',
            trigger: ['input', 'blur'],
          }"
        >
          <NInput v-model:value="modalForm.name" placeholder="请输入分类名称，不能与现有分类名称重复" maxlength="30" show-count clearable/>
        </NFormItem>
        <NFormItem
          label="分类别名"
          path="alias"
          :rule="{
            required: true,
            message: '请输入分类别名',
            trigger: ['input', 'blur'],
          }"
        >
          <NInput v-model:value="modalForm.alias" placeholder="请输入分类别名，用于生成分类URL，不能与现有分类别名重复" maxlength="50" show-count clearable/>
        </NFormItem>
        <NFormItem label="分类描述" path="desc">
          <NInput
            v-model:value="modalForm.desc"
            type="textarea"
            placeholder="请输入分类描述"
          />
        </NFormItem>
        <NFormItem label="显示排序" path="order">
          <NInputNumber v-model:value="modalForm.order" :min="1" />
        </NFormItem>
      </NForm>
    </CrudModal>
  </CommonPage>
</template>
