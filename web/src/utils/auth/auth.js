import { router } from '@/router'

export function toLogin() {
  const currentRoute = unref(router.currentRoute)
  const needRedirect =
    !currentRoute.meta.requireAuth && !['/404', '/admin/login'].includes(router.currentRoute.value.path)
  router.replace({
    path: '/admin/login',
    query: needRedirect ? { ...currentRoute.query, redirect: currentRoute.path } : {},
  })
}

export function toFourZeroFour() {
  router.replace({
    path: '/404',
  })
}
