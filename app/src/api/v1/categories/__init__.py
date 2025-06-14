from fastapi import APIRouter

from .categories import router

categories_router = APIRouter()
categories_router.include_router(router, tags=["管理后台分类模块"])

__all__ = ["categories_router"]
