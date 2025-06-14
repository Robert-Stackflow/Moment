from fastapi import APIRouter

from src.core.dependency import DependPermisson

from .base import base_router
from .menus import menus_router
from .users import users_router
from .settings import settings_router
from .categories import categories_router
from .blogs import blogs_router
from .visitor import visitor_router

v1_router = APIRouter()

v1_router.include_router(base_router, prefix="/admin/base")
v1_router.include_router(users_router, prefix="/admin/user", dependencies=[DependPermisson])
v1_router.include_router(menus_router, prefix="/admin/menu", dependencies=[DependPermisson])
v1_router.include_router(categories_router, prefix="/admin/category", dependencies=[DependPermisson])
v1_router.include_router(blogs_router, prefix="/admin/blog", dependencies=[DependPermisson])
v1_router.include_router(settings_router, prefix="/admin/setting")
v1_router.include_router(visitor_router, prefix="/visitor")