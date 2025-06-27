import json
import logging

from fastapi import APIRouter, Query
from tortoise.expressions import Q
from app.controllers.blog import blog_controller
from app.controllers.category import category_controller
from app.controllers.setting import setting_controller
from app.schemas.base import Fail, Success, SuccessExtra
from app.schemas.blog import *

from app.utils.logger import logger
from .blog import order_options

visitor_router = APIRouter()


@visitor_router.get("/order/list", summary="查看排序选项")
async def list_order():
    orders = [json.dumps(order) for order in order_options]
    return Success(data=orders)


@visitor_router.get("/blog/list", summary="查看图片列表")
async def list_blog(
    page: int = Query(1, description="页码"),
    page_size: int = Query(10, description="每页数量"),
    category: str = Query("", description="分类alias，用于获取某一分类的图片"),
    location: str = Query("", description="位置，用于获取某一位置的图片"),
):
    got_category_id = -1
    other_category_ids = []
    logger.info(f"Category: {category}")
    if category:
        got_category = await category_controller.model.filter(alias=category)
        other_category = await category_controller.model.filter(alias__not=category)
        if len(got_category) == 0:
            return Fail(msg="分类不存在")
        else:
            got_category_id = got_category[0].id
            other_category_ids = [category.id for category in other_category]

    base_q = Q()
    if got_category_id != -1:
        base_q &= Q(categories__id__in=[got_category_id])
    base_q &= Q(is_hidden=False)

    if location:
        # 方案1: 博客或其关联图片包含该location
        base_q &= Q(location__contains=location) | Q(
            images__location__contains=location
        )
        # 或者方案2: 只要求关联图片包含该location
        # base_q &= Q(images__location__contains=location)

    settings = await setting_controller.get(id=1)
    custom_option = settings.content.get("order_option", "meta_time_desc")
    order = []
    for t in order_options:
        if t["value"] == custom_option:
            order = [t["order"]]
            break

    total, blog_objs = await blog_controller.list(
        page=page,
        page_size=page_size,
        search=base_q,
        order=order,
        prefetch_fields=["images"],
    )

    data = [await obj.to_dict_with_images(m2m=True) for obj in blog_objs]
    valid_blogs = []

    for item in data:
        item["category_ids"] = [category["id"] for category in item["categories"]]
        visible_images = [img for img in item["images"] if not img["is_hidden"]]
        item["images"] = visible_images
        if visible_images:
            valid_blogs.append(item)

    return SuccessExtra(data=valid_blogs, total=total, page=page, page_size=page_size)


@visitor_router.get("/category/get/alias", summary="查看分类")
async def get_category(
    alias: str = Query("", description="分类别名"),
):
    result = await category_controller.model.filter(alias=alias)
    if len(result) > 0:
        result = await result[0].to_dict()
        return Success(data=result)
    else:
        return Fail(msg=f"找不到别名为{alias}的分类")


@visitor_router.get("/category/list", summary="查看分类列表")
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
