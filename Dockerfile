FROM node:18.8.0-alpine3.16 as web

WORKDIR /opt/moment
COPY /web ./web
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories \
    && cd /opt/moment/web && npm i -g pnpm --registry=https://registry.npmmirror.com \
    && pnpm i && pnpm run build


FROM python:3.11-slim

WORKDIR /opt/moment
ADD . .
COPY /deploy/entrypoint.sh .

RUN sed -i s@/deb.debian.org/@/mirrors.aliyun.com/@g /etc/apt/sources.list.d/debian.sources \
    && sed -i s@/security.debian.org/@/mirrors.aliyun.com/@g /etc/apt/sources.list.d/debian.sources

RUN apt-get update
RUN apt-get install -y --no-install-recommends python3-dev nginx\
    && ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime

RUN pip install -r requirements.txt

COPY --from=web /opt/moment/web/dist /opt/moment/web/dist
ADD /deploy/web.conf /etc/nginx/sites-available/web.conf
RUN rm -f /etc/nginx/sites-enabled/default \ 
    && ln -s /etc/nginx/sites-available/web.conf /etc/nginx/sites-enabled/ 

ENV LANG=zh_CN.UTF-8
EXPOSE 80

ENTRYPOINT [ "sh", "entrypoint.sh" ]