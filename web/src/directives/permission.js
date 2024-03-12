import { useUserStore, usePermissionStore } from '@/store'

function hasPermission(permission) {
  return true
}

export default function setupPermissionDirective(app) {
  function updateElVisible(el, permission) {
    if (!permission) {
      throw new Error(`need roles: like v-permission="get/api/v1/user/list"`)
    }
    if (!hasPermission(permission)) {
      el.parentElement?.removeChild(el)
    }
  }

  const permissionDirective = {
    mounted(el, binding) {
      updateElVisible(el, binding.value)
    },
    beforeUpdate(el, binding) {
      updateElVisible(el, binding.value)
    },
  }

  app.directive('permission', permissionDirective)
}
