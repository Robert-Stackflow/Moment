# 现有服务器部署

服务位于 `43.156.71.44:/home/apps/moment`，域名为 `https://moment.cloudchewie.com`。公开相册、后台与 API 由同一个 Go 容器提供，现有反向代理连接 `127.0.0.1:3010`。

- `data/`：现有 SQLite 数据库、密钥及本地文件，更新时保留。
- `releases/<版本>/source/`：该次构建的源码和发布清单。
- `backups/<版本>/`：替换前的数据备份、原 Compose 和镜像信息。
- `docker-compose.yml`：由 `deploy/compose.server.yml` 安装，镜像由 `.env` 中的 `MOMENT_IMAGE` 指定。

识别模型沿用 `/home/models/moment/clip-vit-base-patch32-d15189d7028b` 的只读挂载，不打入镜像。

更新流程：完成源码检查与前后端构建，将不含数据、依赖缓存和本地配置的源码上传到独立版本目录，以根目录 Dockerfile 构建具有明确版本标签的镜像；备份数据与原配置，在数据副本上验证启动和迁移，再短暂停止旧容器，生成最终一致备份并切换镜像。切换后检查容器健康、HTTPS、公开数据、登录页及静态资源。镜像构建失败不影响运行中的服务。

使用已安装的配置启动：

```sh
cd /home/apps/moment
docker compose up -d --no-build --pull never
```

回退时先停止新容器，保留当前数据作为故障现场，再恢复对应备份中的原配置和一致数据快照，启动原镜像。若更新后已经产生新数据，应先判断是否只切回镜像，避免用旧快照覆盖新写入。

每次部署的源码摘要、镜像、备份位置和验证结果写入 `verification/`；服务器保留可回退版本与对应备份，不运行镜像或卷的批量清理。
