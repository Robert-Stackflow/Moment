# Moment

## 简介

- 移植自[TimePlus](https://github.com/zhheo/TimePlus)和[time](https://github.com/wclk/time)的相册博客主题
- 脱离Typecho和Mysql，基于[vue-fastapi-admin](https://github.com/mizhexiaoxiao/vue-fastapi-admin)使用Vue+FastAPI开发
- 随意发布你的图片、分类、地点
- 高程度自定义你的网站，自由管理网站Meta、内容设置、菜单设置
- 快捷发布所见所闻，支持将图片上传至符合S3标准的存储桶中
- 预览在线效果：[时刻](https://moment.cloudchewie.com/)

## 部署

- 使用Docker-compose部署

  ```yaml
  services:
    moment:
      image: ruida/moment:1.0
      container_name: moment
      volumes:
        - ${PWD}/.moment/:/opt/moment/app/data
      ports:
        - 9999:80
  ```

## 使用指南

- 使用`<服务器IP地址>:9999`或`域名`访问相册
- 使用`<服务器IP地址>:9999/admin`或`<域名>/admin`访问后台管理
- 其他指南见[Wiki](https://github.com/Robert-Stackflow/Moment/wiki)

## 演示

![web](./img/web.png)

![admin-workbench](./img/admin-workbench.png)

![admin-blogs](./img/admin-blogs.png)

![admin-categories](./img/admin-categories.png)

![admin-general-setting](./img/admin-general-setting.png)

![admin-meta-setting](./img/admin-meta-setting.png)

![admin-content-setting](./img/admin-content-setting.png)

![admin-storage-setting](./img/admin-storage-setting.png)

![admin-menu-setting](./img/admin-menu-setting.png)
