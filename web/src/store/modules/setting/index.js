import { defineStore } from 'pinia'
import { resetRouter } from '@/router'
import { useTagsStore, usePermissionStore } from '@/store'
import { removeToken, toLogin } from '@/utils'
import api from '@/api'

export const useSettingStore = defineStore('setting', {
  state() {
    return {
      _generalSetting: {},
      _metaSetting: {},
      _contentSetting: {},
      _storageSetting: {},
    }
  },
  getters: {
    generalSetting() {
      return this._generalSetting
    },
    metaSetting() {
      return this._metaSetting
    },
    contentSetting() {
      return this._contentSetting
    },
    storageSetting() {
      return this._storageSetting
    },
    totalSetting() {
      return {
        general: this._generalSetting,
        meta: this._metaSetting,
        content: this._contentSetting,
        storage: this._storageSetting,
      }
    },
  },
  actions: {
    async getGeneralSetting() {
      try {
        const res = await api.getGeneralSetting()
        if (res.code === 401) {
          this.logout()
          return
        }
        const { custom_css, custom_js,workbench_desc,workbench_title } = res.data
        this._generalSetting = {custom_css, custom_js,workbench_desc,workbench_title}
        return res.data
      } catch (error) {
        return error
      }
    },
    setGeneralSetting(generalSetting = {}) {
      this._generalSetting = { ...this._generalSetting, ...generalSetting }
    },
    async getMetaSetting() {
      try {
        const res = await api.getMetaSetting()
        if (res.code === 401) {
          this.logout()
          return
        }
        const {
          site_name,
          site_url,
          site_keywords,
          site_desc,
          site_splitter,
          site_icon,
          site_apple_icon,
          bottom_icon,
          primary_color,
          bottom_desc,
          entries,
          icp,
        } = res.data
        this._metaSetting = {
          site_name,
          site_desc,
          site_url,
          site_keywords,
          site_splitter,
          site_icon,
          site_apple_icon,
          bottom_icon,
          bottom_desc,
          primary_color,
          entries,
          icp,
        }
        return res.data
      } catch (error) {
        return error
      }
    },
    setMetaSetting(metaSetting = {}) {
      this._metaSetting = { ...this._metaSetting, ...metaSetting }
    },
    async getContentSetting() {
      try {
        const res = await api.getContentSetting()
        if (res.code === 401) {
          this.logout()
          return
        }
        const {
          page_size,
          thumbnail_suffix,
          detail_suffix,
          copyright_suffix,
          order_option,
          thumbnail_show_location,
          thumbnail_show_time,
          thumbnail_time_format,
          detail_time_format,
          detail_show_location,
          detail_show_time,
        } = res.data
        this._contentSetting = {
          page_size,
          thumbnail_suffix,
          detail_suffix,
          copyright_suffix,
          order_option,
          thumbnail_show_location,
          thumbnail_show_time,
          detail_show_location,
          thumbnail_time_format,
          detail_time_format,
          detail_show_time,
        }
        return res.data
      } catch (error) {
        return error
      }
    },
    setContentSetting(contentSetting = {}) {
      this._contentSetting = { ...this._contentSetting, ...contentSetting }
    },
    async getStorageSetting() {
      try {
        const res = await api.getStorageSetting()
        if (res.code === 401) {
          this.logout()
          return
        }
        const { endpoint, region,enable_storage, access_id, secret_key, bucket, path, prefix} =
          res.data
        this._storageSetting = {
          endpoint,
          enable_storage,
          region,
          access_id,
          secret_key,
          bucket,
          path,
          prefix,
        }
        return res.data
      } catch (error) {
        return error
      }
    },
    setStorageSetting(storageSetting = {}) {
      this._storageSetting = { ...this._storageSetting, ...storageSetting }
    },
  },
})
