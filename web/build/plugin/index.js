import react from '@vitejs/plugin-react'

/**
 * * unocss插件，原子css
 * https://github.com/antfu/unocss
 */
import Unocss from 'unocss/vite'

// rollup打包分析插件
import { visualizer } from 'rollup-plugin-visualizer'
// 压缩
import viteCompression from 'vite-plugin-compression'

import { configHtmlPlugin } from './html'


export function createVitePlugins(viteEnv, isBuild) {
  const plugins = [react(), configHtmlPlugin(viteEnv, isBuild), Unocss()]

  if (viteEnv.VITE_USE_COMPRESS) {
    plugins.push(viteCompression({ algorithm: viteEnv.VITE_COMPRESS_TYPE || 'gzip' }))
  }

  if (isBuild) {
    plugins.push(
      visualizer({
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    )
  }

  return plugins
}
