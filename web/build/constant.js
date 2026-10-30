export const OUTPUT_DIR = '../dist'
export const developmentTarget = (env = {}) =>
  process.env.MOMENT_DEV_API || env.MOMENT_DEV_API || 'http://127.0.0.1:9999'
export const developmentAdminTarget = (env = {}) =>
  process.env.MOMENT_DEV_ADMIN_API || env.MOMENT_DEV_ADMIN_API || 'http://127.0.0.1:9999'
export function createProxyConfig(env = {}) {
  const developmentAPI = developmentTarget(env)
  const mapAPI = process.env.MOMENT_DEV_MAP_API || env.MOMENT_DEV_MAP_API || developmentAPI

  return {
    '/api/admin': { target: developmentAdminTarget(env), changeOrigin: false },
    '/api/v1/visitor/maps': { target: mapAPI, changeOrigin: true },
    '/_AMapService': { target: mapAPI, changeOrigin: true },
    '/api/v1': {
      target: developmentAPI,
      changeOrigin: true,
    },
    '/api': { target: developmentAPI, changeOrigin: false },
    '/uploads': {
      target: developmentAPI,
      changeOrigin: true,
    },
    '/thumbnails': {
      target: developmentAPI,
      changeOrigin: true,
    },
    '/avatars': {
      target: developmentAPI,
      changeOrigin: true,
    },
  }
}
