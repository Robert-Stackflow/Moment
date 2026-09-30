export function createPageLoadingGuard(router) {
  router.beforeEach(() => document.body.classList.add('is-preload'))
  router.afterEach(() => setTimeout(() => document.body.classList.remove('is-preload'), 200))
  router.onError(() => document.body.classList.remove('is-preload'))
}
