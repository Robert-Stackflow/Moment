export const OUTPUT_DIR = '../dist'
const developmentAPI = process.env.MOMENT_DEV_API || 'http://127.0.0.1:9999'

export const PROXY_CONFIG = {
  '/api/v1': {
    target: developmentAPI,
    changeOrigin: true,
  },
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
