import logging

from fastapi import APIRouter, Query
from fastapi.exceptions import HTTPException
from tortoise.expressions import Q

from app.controllers.user import UserController
from app.core.dependency import DependPermisson
from app.schemas.base import Success, SuccessExtra
from app.schemas.users import *

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/update", summary="更新用户")
async def update_user(
    user_in: UserUpdate,
):
    user_controller = UserController()
    await user_controller.update(obj_in=user_in)
    return Success(msg="Updated Successfully")