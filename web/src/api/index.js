import { request } from '@/utils'
export default {
  getGeneralSetting: () => request.get('/visitor/settings/general'),
  getMetaSetting: () => request.get('/visitor/settings/meta'),
  getContentSetting: () => request.get('/visitor/settings/content'),
  getOrderOptionVisitor: () => request.get('/visitor/order/list'),
  getBlogsVisitor: (params = {}) => request.get('/visitor/blog/list', { params }),
  getCategoriesVisitor: () => request.get('/visitor/category/list'),
  getCategoryByAliasVisitor: (params = {}) => request.get('/visitor/category/get/alias', { params }),
}
