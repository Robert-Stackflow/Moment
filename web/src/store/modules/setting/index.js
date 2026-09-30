import { defineStore } from 'pinia'
import api from '@/api'
export const useSettingStore = defineStore('setting', {
  state: () => ({ generalSetting: {}, metaSetting: {}, contentSetting: {} }),
  actions: {
    async load() {
      const [general, meta, content] = await Promise.all([api.getGeneralSetting(), api.getMetaSetting(), api.getContentSetting()])
      this.generalSetting = general.data
      this.metaSetting = meta.data
      this.contentSetting = content.data
    },
  },
})
