import { defineConfig, loadEnv } from 'vite'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'

import { convertEnv, getSrcPath, getRootPath } from './build/utils'
import { viteDefine } from './build/config'
import { createVitePlugins } from './build/plugin'
import { OUTPUT_DIR, createProxyConfig, developmentAdminTarget } from './build/constant'

export default defineConfig(({ command, mode }) => {
  const srcPath = getSrcPath()
  const rootPath = getRootPath()
  const isBuild = command === 'build'

  const env = loadEnv(mode, process.cwd())
  const viteEnv = convertEnv(env)
  const { VITE_PORT, VITE_PUBLIC_PATH, VITE_USE_PROXY } = viteEnv
  const developmentEnv = loadEnv(mode, process.cwd(), 'MOMENT_DEV_')

  return {
    base: VITE_PUBLIC_PATH || '/',
    resolve: {
      alias: {
        '~': rootPath,
        '@': srcPath,
      },
    },
    define: viteDefine,
    plugins: [
      {
        name: 'moment-admin-boundary',
        enforce: 'pre',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use((request, response, next) => {
            const source = new URL(request.url, 'http://' + request.headers.host)
            if (source.pathname !== '/admin' && !source.pathname.startsWith('/admin/'))
              return next()
            const target = new URL(developmentAdminTarget(developmentEnv))
            if (target.origin === source.origin) {
              response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
              response.end('请将开发代理配置为 Go 服务地址。')
              return
            }
            target.pathname = source.pathname
            target.search = source.search
            const proxy = (target.protocol === 'https:' ? httpsRequest : httpRequest)(
              target,
              { method: request.method, headers: request.headers },
              (upstream) => {
                response.writeHead(upstream.statusCode || 502, upstream.headers)
                upstream.pipe(response)
              },
            )
            proxy.on('error', () => {
              if (!response.headersSent)
                response.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
              response.end('本地后台服务未启动，请启动 Go 开发服务。')
            })
            request.on('aborted', () => proxy.destroy())
            request.pipe(proxy)
          })
        },
      },
      ...createVitePlugins(viteEnv, isBuild),
    ],
    server: {
      host: '0.0.0.0',
      port: VITE_PORT,
      open: false,
      proxy: VITE_USE_PROXY ? createProxyConfig(developmentEnv) : undefined,
    },
    build: {
      target: 'es2015',
      outDir: OUTPUT_DIR || 'dist',
      reportCompressedSize: false, // 启用/禁用 gzip 压缩大小报告
      chunkSizeWarningLimit: 1024, // chunk 大小警告的限制（单位kb）
    },
  }
})
