export function createPageLoadingGuard(router) {
  router.beforeEach((to, from) => { if (!to.params.post && !from.params.post) document.body.classList.add('is-preload') })
  router.afterEach(() => document.body.classList.remove('is-preload'))
  router.onError(() => document.body.classList.remove('is-preload'))
}
