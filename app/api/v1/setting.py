import logging

from fastapi import APIRouter, Query

from app.controllers.setting import setting_controller
from app.schemas.base import Fail, Success, SuccessExtra
from app.schemas.setting import *
from app.core.dependency import DependPermisson

logger = logging.getLogger(__name__)

setting_router = APIRouter()


@setting_router.get("/get/general", summary="查看通用设置")
async def get_general():
    result = await setting_controller.get(id=1)
    return Success(data=result.general)


@setting_router.get("/get/meta", summary="查看网站设置")
async def get_meta():
    result = await setting_controller.get(id=1)
    return Success(data=result.meta)


@setting_router.get("/get/content", summary="查看内容设置")
async def get_content():
    result = await setting_controller.get(id=1)
    return Success(data=result.content)


@setting_router.get("/get/storage", summary="查看存储设置")
async def get_storage():
    result = await setting_controller.get(id=1)
    return Success(data=result.storage)


@setting_router.post("/update", summary="更新设置", dependencies=[DependPermisson])
async def update(
    setting_in: SettingUpdate,
):
    await setting_controller.update(id=1, obj_in=setting_in)
    return Success(msg="Updated Success")
