export function createPageLoadingGuard(router) {
  router.beforeEach(() => {
    if(window.location.href.indexOf("admin")!=-1)
      window.$loadingBar?.start()
    document.querySelector("body").classList.add("is-preload")
  })

  router.afterEach(() => {
    setTimeout(() => {
      window.$loadingBar?.finish()
      document.querySelector("body").classList.remove("is-preload")
    }, 200)
  })

  router.onError(() => {
    window.$loadingBar?.error()
  })
}
