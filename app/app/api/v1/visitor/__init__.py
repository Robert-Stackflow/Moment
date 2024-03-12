from fastapi import APIRouter

from .visitor import router

visitor_router = APIRouter()
visitor_router.include_router(router, tags=["游客模块"])

__all__ = ["visitor_router"]
