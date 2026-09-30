export const reqResolve = config => config
export const reqReject = error => Promise.reject(error)
export function resResolve(response) {
  if (response.data?.code !== 200) return Promise.reject(new Error(response.data?.msg || '加载失败'))
  return response.data
}
export const resReject = error => Promise.reject(new Error(error.response?.data?.msg || error.message || '连接失败'))
