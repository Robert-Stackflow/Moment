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
      requireAuth:false,
    },
  },
  {
    name: 'HomeCategory',
    path: '/category/:category',
    isHidden: true,
    component: () => import('@/views/home/index.vue'),
    meta: {
      requireAuth:false,
    },
  },
  {
    name: 'HomeLocation',
    path: '/location/:location',
    isHidden: true,
    component: () => import('@/views/home/index.vue'),
    meta: {
      requireAuth:false,
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
