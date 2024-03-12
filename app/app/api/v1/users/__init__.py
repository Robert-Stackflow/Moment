from fastapi import APIRouter

from .users import router

users_router = APIRouter()
users_router.include_router(router, tags=["管理后台用户模块"])

__all__ = ["users_router"]
