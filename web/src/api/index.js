import { request } from '@/utils'

export default {
  uploadApi: import.meta.env.VITE_BASE_API + '/admin/base/upload',
  login: (data) => request.post('/admin/base/access_token', data, { noNeedToken: true }),
  getUserInfo: () => request.get('/admin/base/userinfo'),
  getUserMenu: () => request.get('/admin/base/usermenu'),
  uploadImage: (data, headers, onUploadProgress,timeout) =>
    request.post('/admin/base/upload', data, {
      headers: headers,
      onUploadProgress: onUploadProgress,
      timeout: timeout * 1000,
    }),
  // profile
  updatePassword: (data = {}) => request.post('/admin/base/update_password', data),
  // users
  updateUser: (data = {}) => request.post('/admin/user/update', data),
  // menus
  getMenus: (params = {}) => request.get('/admin/menu/list', { params }),
  createMenu: (data = {}) => request.post('/admin/menu/create', data),
  updateMenu: (data = {}) => request.post('/admin/menu/update', data),
  deleteMenu: (params = {}) => request.delete('/admin/menu/delete', { params }),
  // blogs
  getBlogs: (params = {}) => request.get('/admin/blog/list', { params }),
  getBlogAndCategoryCount: () => request.get('/admin/blog/count'),
  getBlogLocations: (params = {}) => request.get('/admin/blog/locations', { params }),
  createBlog: (data = {}) => request.post('/admin/blog/create', data),
  updateBlog: (data = {}) => request.post('/admin/blog/update', data),
  deleteBlog: (params = {}) => request.delete('/admin/blog/delete', { params }),
  // categories
  getCategories: (params = {}) => request.get('/admin/category/list', { params }),
  getCategoryById: (params = {}) => request.get('/admin/category/get/id', { params }),
  getCategoryByAlias: (params = {}) => request.get('/admin/category/get/alias', { params }),
  createCategory: (data = {}) => request.post('/admin/category/create', data),
  updateCategory: (data = {}) => request.post('/admin/category/update', data),
  deleteCategory: (params = {}) => request.delete('/admin/category/delete', { params }),
  // settings
  getGeneralSetting: () => request.get('/admin/setting/get/general'),
  getMetaSetting: () => request.get('/admin/setting/get/meta'),
  getContentSetting: () => request.get('/admin/setting/get/content'),
  getStorageSetting: () => request.get('/admin/setting/get/storage'),
  updateSetting: (data = {}) => request.post('/admin/setting/update', data),
  // visitor
  getOrderOptionVisitor: () => request.get('/visitor/order/list'),
  getBlogsVisitor: (params = {}) => request.get('/visitor/blog/list', { params }),
  getCategoriesVisitor: (params = {}) => request.get('/visitor/category/list', { params }),
  getCategoryByAliasVisitor: (params = {}) => request.get('/visitor/category/get/alias', { params }),
}
