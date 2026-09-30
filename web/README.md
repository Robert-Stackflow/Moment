# Moment 公开相册

本目录只包含公开图库（Vue 3）。后台从零编写在 `../admin`（React + TypeScript + Mantine），两者共用 Go 服务。

开发：`npm ci && npm run dev`，公开接口通过同源代理连接 `127.0.0.1:9999`。
构建顺序：先构建本目录，再构建 admin；建议在仓库根目录执行 `npm run build`。
