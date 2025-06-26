import logging

from fastapi import APIRouter, Query

from app.controllers.category import category_controller
from app.core.dependency import DependPermisson
from app.schemas.base import Fail, Success, SuccessExtra
from app.schemas.category import *

from app.utils.logger import logger

category_router = APIRouter()


@category_router.get("/list", summary="查看分类列表", dependencies=[DependPermisson])
async def list_category(
    page: int = Query(1, description="页码"),
    page_size: int = Query(10, description="每页数量"),
):
    parent_categories = await category_controller.model.filter(parent_id=0).order_by(
        "order"
    )
    res_category = []
    for category in parent_categories:
        child_category = await category_controller.model.filter(
            parent_id=category.id
        ).order_by("order")
        category_dict = await category.to_dict()
        category_dict["children"] = [await obj.to_dict() for obj in child_category]
        res_category.append(category_dict)
    return SuccessExtra(
        data=res_category, total=len(res_category), page=page, page_size=page_size
    )


@category_router.get("/get/id", summary="查看分类")
async def get_category(
    category_id: int = Query(..., description="分类id"),
):
    result = await category_controller.model.filter(id=category_id)
    if len(result) > 0:
        result = result[0].to_dict()
        return Success(data=result)
    else:
        return Fail(msg=f"找不到ID为{category_id}的分类")


@category_router.get("/get/alias", summary="查看分类")
async def get_category(
    alias: str = Query("", description="分类别名"),
):
    result = await category_controller.model.filter(alias=alias)
    if len(result) > 0:
        result = await result[0].to_dict()
        return Success(data=result)
    else:
        return Fail(msg=f"找不到别名为{alias}的分类")


@category_router.post("/create", summary="创建分类", dependencies=[DependPermisson])
async def create_category(
    category_in: CategoryCreate,
):
    await category_controller.create(obj_in=category_in)
    return Success(msg="Created Success")


@category_router.post("/update", summary="更新分类", dependencies=[DependPermisson])
async def update_category(
    category_in: CategoryUpdate,
):
    await category_controller.update(
        id=category_in.id, obj_in=category_in.update_dict()
    )
    return Success(msg="Updated Success")


@category_router.delete("/delete", summary="删除分类", dependencies=[DependPermisson])
async def delete_category(
    id: int = Query(..., description="分类id"),
):
    child_category_count = await category_controller.model.filter(parent_id=id).count()
    if child_category_count > 0:
        return Fail(msg="Cannot delete a category with child categories")
    await category_controller.remove(id=id)
    return Success(msg="Deleted Success")
