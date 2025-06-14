from fastapi import APIRouter

from .blogs import router

blogs_router = APIRouter()
blogs_router.include_router(router, tags=["管理后台图片模块"])

__all__ = ["blogs_router"]
