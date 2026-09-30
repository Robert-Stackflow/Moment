import { createRouter, createWebHistory } from 'vue-router'
import { useSettingStore } from '@/store'
import { createPageTitleGuard } from './guard/page-title-guard'
import { createPageLoadingGuard } from './guard/page-loading-guard'
const gallery = () => import('@/views/home/index.vue')
export const router = createRouter({
  history: createWebHistory('/'),
  routes: [
    { path: '/', component: gallery },
    { path: '/category/:category', component: gallery },
    { path: '/location/:location', component: gallery },
    { path: '/admin/:pathMatch(.*)*', beforeEnter: to => { window.location.assign(to.fullPath); return false } },
    { path: '/:pathMatch(.*)*', component: () => import('@/views/error-page/404.vue') },
  ],
  scrollBehavior: () => ({ left: 0, top: 0 }),
})
export async function setupRouter(app) {
  await useSettingStore().load()
  createPageTitleGuard(router)
  createPageLoadingGuard(router)
  app.use(router)
}
