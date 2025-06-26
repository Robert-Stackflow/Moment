import i18n from '~/i18n'
const { t } = i18n.global

const Layout = () => import('@/layout/index.vue')

export const basicRoutes = [
  {
    name: 'Home',
    path: '/',
    isHidden: true,
    component: () => import('@/views/home/index.vue'),
    meta: {
      requireAuth: false,
    },
  },
  {
    name: 'HomeCategory',
    path: '/category/:category',
    isHidden: true,
    component: () => import('@/views/home/index.vue'),
    meta: {
      requireAuth: false,
    },
  },
  {
    name: 'HomeLocation',
    path: '/location/:location',
    isHidden: true,
    component: () => import('@/views/home/index.vue'),
    meta: {
      requireAuth: false,
    },
  },
  {
    name: t('views.workbench.label_workbench'),
    path: '/admin/',
    component: Layout,
    redirect: '/admin/workbench',
    children: [
      {
        path: 'workbench',
        component: () => import('@/views/workbench/index.vue'),
        name: t('views.workbench.label_workbench'),
        meta: {
          title: t('views.workbench.label_workbench'),
          icon: 'icon-park-outline:workbench',
          affix: true,
        },
      },
    ],
    meta: { order: 0 },
  },
  {
    name: t('views.profile.label_profile'),
    path: '/admin/',
    component: Layout,
    isHidden: true,
    children: [
      {
        path: 'profile',
        component: () => import('@/views/profile/index.vue'),
        name: t('views.profile.label_profile'),
        meta: {
          title: t('views.profile.label_profile'),
          icon: 'user',
          affix: true,
        },
      },
    ],
    meta: { order: 99 },
  },
  {
    name: '403',
    path: '/403',
    component: () => import('@/views/error-page/403.vue'),
    isHidden: true,
  },
  {
    name: '404',
    path: '/404',
    component: () => import('@/views/error-page/404.vue'),
    isHidden: true,
  },
  {
    name: 'Login',
    path: '/admin/login',
    component: () => import('@/views/login/index.vue'),
    isHidden: true,
    meta: {
      title: '登录',
    },
  },
  {
    is_hidden: false,
    keepalive: true,
    path: '/admin/content',
    component: Layout,
    redirect: '/admin/content/blog',
    name: '内容管理',
    meta: {
      title: '内容管理',
      icon: 'mdi:book-open-outline',
    },
    children: [
      {
        is_hidden: false,
        keepalive: true,
        path: 'blog',
        component: () => import('@/views/content/blog/index.vue'),
        name: '图片列表',
        meta: {
          title: '图片列表',
          icon: 'mdi:folder-multiple-image',
        },
      },
      {
        is_hidden: false,
        keepalive: true,
        path: 'category',
        component: () => import('@/views/content/category/index.vue'),
        name: '分类列表',
        meta: {
          title: '分类列表',
          icon: 'mdi:bookmark-multiple-outline',
        },
      },
    ],
  },
  {
    redirect: '/admin/system/user',
    is_hidden: false,
    keepalive: true,
    path: '/admin/system',
    component: Layout,
    name: '系统管理',
    meta: {
      title: '系统管理',
      icon: 'mdi:application-cog-outline',
    },
    children: [
      {
        is_hidden: false,
        keepalive: true,
        path: 'general',
        component: () => import('@/views/system/general/index.vue'),
        name: '通用设置',
        meta: {
          title: '通用设置',
          icon: 'mdi:cogs',
        },
      },
      {
        is_hidden: false,
        keepalive: true,
        path: 'meta',
        component: () => import('@/views/system/meta/index.vue'),
        name: '网站设置',
        meta: {
          title: '网站设置',
          icon: 'mdi:wrench-cog-outline',
        },
      },
      {
        is_hidden: false,
        keepalive: true,
        path: 'content',
        component: () => import('@/views/system/content/index.vue'),
        name: '内容设置',
        meta: {
          title: '内容设置',
          icon: 'mdi:archive-cog-outline',
        },
      },
      {
        is_hidden: false,
        keepalive: true,
        path: 'storage',
        component: () => import('@/views/system/storage/index.vue'),
        name: '存储设置',
        meta: {
          title: '存储设置',
          icon: 'mdi:database-cog-outline',
        },
      },
    ],
  },
]

export const NOT_FOUND_ROUTE = {
  name: 'NotFound',
  path: '/:pathMatch(.*)*',
  redirect: '/404',
  component: null,
  isHidden: true,
}

export const EMPTY_ROUTE = {
  name: 'Empty',
  path: '/:pathMatch(.*)*',
  component: null,
}

const modules = import.meta.glob('@/views/**/route.js', { eager: true })
const asyncRoutes = []
Object.keys(modules).forEach((key) => {
  asyncRoutes.push(modules[key].default)
})

// 加载 views 下每个模块的 index.vue 文件
const vueModules = import.meta.glob('@/views/**/index.vue')

export { asyncRoutes, vueModules }
