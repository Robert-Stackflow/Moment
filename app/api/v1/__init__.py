from fastapi import APIRouter

from app.core.dependency import DependPermisson

from .base import base_router
from .setting import setting_router
from .category import category_router
from .blog import blog_router
from .visitor import visitor_router

v1_router = APIRouter()

v1_router.include_router(base_router, prefix="/admin/base")
v1_router.include_router(
    category_router, prefix="/admin/category", dependencies=[DependPermisson]
)
v1_router.include_router(
    blog_router, prefix="/admin/blog", dependencies=[DependPermisson]
)
v1_router.include_router(setting_router, prefix="/admin/setting")
v1_router.include_router(visitor_router, prefix="/visitor")
