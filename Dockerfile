FROM node:20-alpine AS web

WORKDIR /opt/moment
COPY /web ./web

RUN cd /opt/moment/web \
    && npm i -g pnpm --registry=https://registry.npmmirror.com \
    && pnpm i && pnpm run build

FROM python:3.12-slim

WORKDIR /opt/moment
COPY . .  
COPY /deploy/entrypoint.sh .  

RUN apt-get update && apt-get install -y --no-install-recommends nginx \
    && ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && pip install --no-cache-dir -r requirements.txt \
    && rm -rf /var/lib/apt/lists/*

COPY --from=web /opt/moment/web/dist /opt/moment/web/dist
COPY /deploy/web.conf /etc/nginx/sites-available/web.conf

RUN rm -f /etc/nginx/sites-enabled/default \
    && ln -s /etc/nginx/sites-available/web.conf /etc/nginx/sites-enabled/

ENV LANG=zh_CN.UTF-8
EXPOSE 80

ENTRYPOINT [ "sh", "entrypoint.sh" ]