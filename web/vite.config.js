import { defineConfig, loadEnv } from 'vite'

import { convertEnv, getSrcPath, getRootPath } from './build/utils'
import { viteDefine } from './build/config'
import { createVitePlugins } from './build/plugin'
import { OUTPUT_DIR, PROXY_CONFIG } from './build/constant'

export default defineConfig(({ command, mode }) => {
  const srcPath = getSrcPath()
  const rootPath = getRootPath()
  const isBuild = command === 'build'

  const env = loadEnv(mode, process.cwd())
  const viteEnv = convertEnv(env)
  const { VITE_PORT, VITE_PUBLIC_PATH, VITE_USE_PROXY } = viteEnv

  return {
    base: VITE_PUBLIC_PATH || '/',
    resolve: {
      alias: {
        '~': rootPath,
        '@': srcPath,
      },
    },
    define: viteDefine,
    plugins: createVitePlugins(viteEnv, isBuild),
    server: {
      host: '0.0.0.0',
      port: VITE_PORT,
      open: false,
      proxy: VITE_USE_PROXY ? PROXY_CONFIG : undefined,
    },
    build: {
      target: 'es2015',
      outDir: OUTPUT_DIR || 'dist',
      reportCompressedSize: false, // 启用/禁用 gzip 压缩大小报告
      chunkSizeWarningLimit: 1024, // chunk 大小警告的限制（单位kb）
    },
  }
})
