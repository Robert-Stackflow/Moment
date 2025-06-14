from fastapi import FastAPI
from fastapi.middleware import Middleware
from fastapi.middleware.cors import CORSMiddleware
from tortoise.contrib.fastapi import register_tortoise

from src.api import api_router
from src.controllers.user import UserCreate, user_controller
from src.controllers.setting import SettingCreate, setting_controller
from src.core.exceptions import (
    DoesNotExist,
    DoesNotExistHandle,
    HTTPException,
    HttpExcHandle,
    IntegrityError,
    IntegrityHandle,
    RequestValidationError,
    RequestValidationHandle,
    ResponseValidationError,
    ResponseValidationHandle,
)
from src.models.admin import Menu
from src.schemas.menus import MenuType
from src.settings.config import settings

from .middlewares import BackGroundTaskMiddleware


def make_middlewares():
    middleware = [
        Middleware(
            CORSMiddleware,
            allow_origins=settings.CORS_ORIGINS,
            allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
            allow_methods=settings.CORS_ALLOW_METHODS,
            allow_headers=settings.CORS_ALLOW_HEADERS,
        ),
        Middleware(BackGroundTaskMiddleware),
    ]
    return middleware


def register_db(app: FastAPI, db_url=None):
    register_tortoise(
        app,
        config=settings.TORTOISE_ORM,
        generate_schemas=True,
    )


def register_exceptions(app: FastAPI):
    app.add_exception_handler(DoesNotExist, DoesNotExistHandle)
    app.add_exception_handler(HTTPException, HttpExcHandle)
    app.add_exception_handler(IntegrityError, IntegrityHandle)
    app.add_exception_handler(RequestValidationError, RequestValidationHandle)
    app.add_exception_handler(ResponseValidationError, ResponseValidationHandle)


def register_routers(app: FastAPI, prefix: str = "/api"):
    app.include_router(api_router, prefix=prefix)

async def init_superuser():
    user = await user_controller.model.exists()
    if not user:
        await user_controller.create(
            UserCreate(
                username="admin",
                email="admin@admin.com",
                password="123456",
                avatar="https://avatars.githubusercontent.com/u/54677442?v=4"
            )
        )

async def init_setting():
    setting = await setting_controller.model.exists()
    if not setting:
        await setting_controller.create(
            SettingCreate(
                general={},
                content={},
                meta={},
                storage={}
            )
        )

async def init_menus():
    menus = await Menu.exists()
    if not menus:
        parent_menu = await Menu.create(
            menu_type=MenuType.CATALOG,
            name="内容管理",
            path="admin/content",
            order=1,
            parent_id=0,
            icon="mdi:book-open-outline",
            is_hidden=False,
            component="Layout",
            keepalive=True,
            redirect="/admin/content/blog",
        )
        children_menu = [
            Menu(
                menu_type=MenuType.MENU,
                name="图片列表",
                path="blog",
                order=1,
                parent_id=parent_menu.id,
                icon="mdi:folder-multiple-image",
                is_hidden=False,
                component="/content/blog",
                keepalive=True,
            ),
            Menu(
                menu_type=MenuType.MENU,
                name="分类列表",
                path="category",
                order=2,
                parent_id=parent_menu.id,
                icon="mdi:bookmark-multiple-outline",
                is_hidden=False,
                component="/content/category",
                keepalive=True,
            ),
        ]
        await Menu.bulk_create(children_menu)
        parent_menu = await Menu.create(
            menu_type=MenuType.CATALOG,
            name="系统管理",
            path="admin/system",
            order=1,
            parent_id=0,
            icon="mdi:application-cog-outline",
            is_hidden=False,
            component="Layout",
            keepalive=True,
            redirect="/system/user",
        )
        children_menu = [
            Menu(
                menu_type=MenuType.MENU,
                name="通用设置",
                path="general",
                order=2,
                parent_id=parent_menu.id,
                icon="mdi:cogs",
                is_hidden=False,
                component="/system/general",
                keepalive=True,
            ),
            Menu(
                menu_type=MenuType.MENU,
                name="网站设置",
                path="meta",
                order=3,
                parent_id=parent_menu.id,
                icon="mdi:wrench-cog-outline",
                is_hidden=False,
                component="/system/meta",
                keepalive=True,
            ),
            Menu(
                menu_type=MenuType.MENU,
                name="内容设置",
                path="content",
                order=4,
                parent_id=parent_menu.id,
                icon="mdi:archive-cog-outline",
                is_hidden=False,
                component="/system/content",
                keepalive=True,
            ),
            Menu(
                menu_type=MenuType.MENU,
                name="存储设置",
                path="storage",
                order=5,
                parent_id=parent_menu.id,
                icon="mdi:database-cog-outline",
                is_hidden=False,
                component="/system/storage",
                keepalive=True,
            ),
            Menu(
                menu_type=MenuType.MENU,
                name="菜单管理",
                path="menu",
                order=7,
                parent_id=parent_menu.id,
                icon="mdi:list-box-outline",
                is_hidden=False,
                component="/system/menu",
                keepalive=True,
            ),
        ]
        await Menu.bulk_create(children_menu)
