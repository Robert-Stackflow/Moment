import { useSettingStore } from '@/store'
import { isValueNotEmpty } from '@/utils'
export function createPageTitleGuard(router) {
  router.afterEach((to) => {
    const settingStore = useSettingStore()
    const baseTitle = isValueNotEmpty(settingStore.metaSetting?.site_name )?settingStore.metaSetting?.site_name : import.meta.env.VITE_TITLE
    const splitter = isValueNotEmpty(settingStore.metaSetting?.site_splitter )?settingStore.metaSetting?.site_splitter : import.meta.env.VITE_TITLE_SPLITTER
    const pageTitle = to.meta?.title
    if (pageTitle) {
      document.title = `${pageTitle} ${splitter} ${baseTitle}`
    } else {
      document.title = baseTitle
    }
  })
}
