import { useSettingStore } from '@/store'

export function createPageTitleGuard(router) {
  router.afterEach((to) => {
    const settingStore = useSettingStore()
    const baseTitle = settingStore.metaSetting?.site_name ?? import.meta.env.VITE_TITLE
    const splitter = settingStore.metaSetting?.site_splitter ?? "|"
    const pageTitle = to.meta?.title
    if (pageTitle) {
      document.title = `${pageTitle} ${splitter} ${baseTitle}`
    } else {
      document.title = baseTitle
    }
  })
}
