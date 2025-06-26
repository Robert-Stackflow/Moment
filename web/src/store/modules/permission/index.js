import { defineStore } from 'pinia'
import { basicRoutes, vueModules } from '@/router/routes'
import Layout from '@/layout/index.vue'
import api from '@/api'

function buildRoutes(routes = []) {
  return routes.map((e) => ({
    name: e.name,
    path: e.component !== 'Layout' ? '/' : '/' + e.path, // 处理目录是一级菜单的情况
    component: shallowRef(Layout), // ? 不使用 shallowRef 控制台会有 warning
    isHidden: e.is_hidden,
    redirect: e.redirect,
    meta: {
      title: e.name,
      icon: e.icon,
      order: e.order,
      keepAlive: e.keepalive,
    },
    children: e.children.map((e_child) => ({
      name: e_child.name,
      path: e_child.path, // 父路径 + 当前菜单路径
      component: vueModules[`/src/views${e_child.component}/index.vue`],
      isHidden: e_child.is_hidden,
      meta: {
        title: e_child.name,
        icon: e_child.icon,
        order: e_child.order,
        keepAlive: e_child.keepalive,
      },
    })),
  }))
}

export const usePermissionStore = defineStore('permission', {
  state() {
    return {
      accessRoutes: [],
    }
  },
  getters: {
    routes() {
      return basicRoutes.concat(this.accessRoutes)
    },
    menus() {
      return this.routes.filter((route) => route.name && !route.isHidden)
    },
  },
  actions: {
    async generateRoutes() {
      // const res = await api.getUserMenu() // 调用接口获取后端传来的菜单路由
      // this.accessRoutes = buildRoutes(res.data) // 处理成前端路由格式
      // return this.accessRoutes
      return []
    },
    resetPermission() {
      this.$reset()
    },
  },
})
