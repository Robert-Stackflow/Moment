import axios from 'axios'

const request = axios.create({
  baseURL: import.meta.env.VITE_BASE_API || '/api/v1',
  timeout: 12000,
})
request.interceptors.response.use(
  (response) => {
    if (response.data?.code !== 200) throw new Error(response.data?.msg || '加载失败')
    return response.data
  },
  (error) => Promise.reject(new Error(error.response?.data?.msg || error.message || '连接失败')),
)

export default {
  getGeneralSetting: () => request.get('/visitor/settings/general'),
  getMetaSetting: () => request.get('/visitor/settings/meta'),
  getContentSetting: () => request.get('/visitor/settings/content'),
  getOrderOptionVisitor: () => request.get('/visitor/order/list'),
  getBlogsVisitor: (params = {}) => request.get('/visitor/blog/list', { params }),
  getBlogVisitor: (id) => request.get('/visitor/blog/' + id),
  getCategoriesVisitor: () => request.get('/visitor/category/list'),
  getCategoryByAliasVisitor: (params) => request.get('/visitor/category/get/alias', { params }),
}

export async function exploreRequest(path, params = {}, signal) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  const response = await fetch(`/api/v1/visitor/explore/${path}?${query}`, { signal })
  const result = await response.json()
  if (!response.ok) throw new Error(result.msg || '暂时无法加载，请重试')
  return result.data
}
