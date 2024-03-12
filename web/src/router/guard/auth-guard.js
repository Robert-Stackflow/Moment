import { getToken, isNullOrWhitespace } from '@/utils'

const WHITE_LIST = ['/', '/admin/login', '/404']
export function createAuthGuard(router) {
  router.beforeEach(async (to) => {
    const token = getToken()
    if (isNullOrWhitespace(token)) {
      if (WHITE_LIST.includes(to.path)) return true
      if (to.meta.requireAuth == false) return true
      return { path: '/admin/login', query: { ...to.query, redirect: to.path } }
    }

    if (to.path === '/admin/login') return { path: '/admin/' }
    return true
  })
}
