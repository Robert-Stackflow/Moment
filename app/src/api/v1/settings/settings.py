import logging

from fastapi import APIRouter, Query

from src.controllers.setting import setting_controller
from src.schemas.base import Fail, Success, SuccessExtra
from src.schemas.settings import *
from src.core.dependency import DependPermisson

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/get/general", summary="查看通用设置")
async def get_general(
):
    result = await setting_controller.get(id=1)
    return Success(data=result.general)

@router.get("/get/meta", summary="查看网站设置")
async def get_meta(
):
    result = await setting_controller.get(id=1)
    return Success(data=result.meta)

@router.get("/get/content", summary="查看内容设置")
async def get_content(
):
    result = await setting_controller.get(id=1)
    return Success(data=result.content)

@router.get("/get/storage", summary="查看存储设置")
async def get_storage(
):
    result = await setting_controller.get(id=1)
    return Success(data=result.storage)

@router.post("/update", summary="更新设置",dependencies=[DependPermisson])
async def update(
    setting_in: SettingUpdate,
):
    await setting_controller.update(id=1,obj_in=setting_in)
    return Success(msg="Updated Success")