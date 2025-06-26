import logging

from fastapi import APIRouter, Query
from tortoise.expressions import Q
from app.controllers.blog import blog_controller
from app.controllers.category import category_controller
from app.core.dependency import DependPermisson
from app.schemas.base import Fail, Success, SuccessExtra
from app.schemas.blog import *

from app.utils.logger import logger

blog_router = APIRouter()

order_options = [
    {"label": "图片时间-降序", "value": "meta_time_desc", "order": "-time"},
    {"label": "图片时间-升序", "value": "meta_time_asc", "order": "time"},
    {"label": "图片创建时间-降序", "value": "created_at_desc", "order": "-created_at"},
    {"label": "图片创建时间-升序", "value": "created_at_asc", "order": "created_at"},
    {"label": "图片更新时间-降序", "value": "updated_at_desc", "order": "-updated_at"},
    {"label": "图片更新时间-升序", "value": "updated_at_asc", "order": "updated_at"},
]


@blog_router.post("/list", summary="查看图片列表")
async def list_blog(query: BlogQuery):
    q = Q()
    if query.title:
        q &= Q(title__contains=query.title)
    if query.desc:
        q &= Q(desc__contains=query.desc)
    if query.location:
        q &= Q(location__contains=query.location)
    if len(query.categories) > 0:
        q &= Q(categories__in=query.categories)
    order = []
    for t in order_options:
        if t["value"] == query.order_option:
            order = [t["order"]]
            break
    total, blog_objs = await blog_controller.list(
        page=query.page,
        page_size=query.page_size,
        search=q,
        order=order,
        prefetch_fields=["images"],
    )
    data = [await obj.to_dict_with_images(m2m=True) for obj in blog_objs]
    for blog in data:
        blog["category_ids"] = [item["id"] for item in blog["categories"]]
    return SuccessExtra(
        data=data, total=total, page=query.page, page_size=query.page_size
    )


@blog_router.get("/get", summary="查看图片")
async def get_blog(
    blog_id: int = Query(..., description="图片id"),
):
    result = await blog_controller.get(
        id=blog_id,
        prefetch_fields=["images"],
    )
    result = await result.to_dict_with_images(m2m=True)
    result["category_ids"] = [item["id"] for item in result["categories"]]
    return Success(data=result)


@blog_router.get("/count", summary="图片和分类数")
async def get_count():
    blog_count = len(await blog_controller.model.all())
    blogs = await blog_controller.model.all().prefetch_related("images")
    image_count = sum(len(blog.images) for blog in blogs)
    category_count = len(await category_controller.model.all())
    return Success(
        data={"blog": blog_count, "image": image_count, "category": category_count}
    )


@blog_router.get("/locations", summary="查看地点列表")
async def get_locations():
    results = await blog_controller.model.all()
    locations = {}
    for blog in results:
        if blog.location:
            if locations.get(blog.location, None) == None:
                locations[blog.location] = 1
            else:
                locations[blog.location] = locations[blog.location] + 1
    locations = sorted(locations.items(), key=lambda d: d[1], reverse=True)
    return Success(data=locations)


@blog_router.post("/create", summary="创建图片", dependencies=[DependPermisson])
async def create_blog(
    blog_in: BlogCreate,
):
    for category_id in blog_in.categories:
        category = await category_controller.model.filter(id=category_id)
        if (
            len(category) > 0
            and category[0].parent_id != 0
            and category[0].parent_id not in blog_in.categories
        ):
            blog_in.categories.append(category[0].parent_id)
    new_blog = await blog_controller.create(obj_in=blog_in.create_dict())
    await blog_controller.update_categories(new_blog, blog_in.categories)
    return Success(msg="Created Success")


@blog_router.post("/update", summary="更新图片", dependencies=[DependPermisson])
async def update_blog(
    blog_in: BlogUpdate,
):
    for category_id in blog_in.categories:
        category = await category_controller.model.filter(id=category_id)
        if (
            len(category) > 0
            and category[0].parent_id != 0
            and category[0].parent_id not in blog_in.categories
        ):
            blog_in.categories.append(category[0].parent_id)
    blog = await blog_controller.update(id=blog_in.id, obj_in=blog_in.update_dict())
    await blog_controller.update_categories(blog, blog_in.categories)
    return Success(msg="Updated Success")


@blog_router.delete("/delete", summary="删除图片", dependencies=[DependPermisson])
async def delete_blog(
    id: int = Query(..., description="图片id"),
):
    await blog_controller.remove(id=id)
    return Success(msg="Deleted Success")
