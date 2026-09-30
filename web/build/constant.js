export const OUTPUT_DIR = '../dist'

export const PROXY_CONFIG = {
  '/api/v1': {
    target: 'http://127.0.0.1:9999',
    changeOrigin: true,
  },
  '/uploads': {
    target: 'http://127.0.0.1:9999',
  },
  '/thumbnails': {
    target: 'http://127.0.0.1:9999',
  },
  '/avatars': {
    target: 'http://127.0.0.1:9999',
  },
}
