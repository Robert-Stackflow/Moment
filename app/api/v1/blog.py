import logging

from fastapi import APIRouter, Query
from tortoise.expressions import Q
from app.controllers.blog import blog_controller
from app.controllers.blog_image import blog_image_controller
from app.controllers.category import category_controller
from app.core.dependency import DependPermisson
from app.models.content import Category
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
    results = await blog_controller.model.all().prefetch_related("images")
    locations = {}
    for blog in results:
        blog_locations = []
        if blog.location:
            blog_locations.append(blog.location)
        for image in blog.images:
            if image.location:
                blog_locations.append(image.location)
        for location in blog_locations:
            if locations.get(location, None) == None:
                locations[location] = 1
            else:
                locations[location] = locations[location] + 1
    locations = sorted(locations.items(), key=lambda d: d[1], reverse=True)
    return Success(data=locations)


@blog_router.post("/create", summary="创建图片", dependencies=[DependPermisson])
async def create_blog(
    blog_in: BlogCreate,
):
    # 补全父分类ID，避免遍历时修改原列表导致问题
    category_ids = set(blog_in.category_ids or [])
    for category_id in list(category_ids):
        category = await category_controller.model.filter(id=category_id).first()
        if (
            category
            and category.parent_id != 0
            and category.parent_id not in category_ids
        ):
            category_ids.add(category.parent_id)
    blog_in.category_ids = list(category_ids)

    new_blog = await blog_controller.create(obj_in=blog_in.create_dict())
    if not new_blog:
        return Fail(msg="博客创建失败")

    if blog_in.category_ids:
        categories = await Category.filter(id__in=blog_in.category_ids).all()
        await new_blog.categories.add(*categories)

    if blog_in.images is None:
        return Fail(msg="图片列表不能为空")
    if not isinstance(blog_in.images, list):
        return Fail(msg="图片列表必须是一个列表")
    if len(blog_in.images) == 0:
        return Fail(msg="图片列表不能为空")
    await blog_image_controller.create_for_blog(
        blog_id=new_blog.id, images=blog_in.images
    )
    return Success(msg="Created Success")


@blog_router.post("/update", summary="更新图片", dependencies=[DependPermisson])
async def update_blog(
    blog_in: BlogUpdate,
):
    # 先补全父分类id，避免遍历时修改原列表导致问题
    category_ids = set(blog_in.category_ids or [])
    for category_id in list(category_ids):
        category = await category_controller.model.filter(id=category_id).first()
        if (
            category
            and category.parent_id != 0
            and category.parent_id not in category_ids
        ):
            category_ids.add(category.parent_id)
    blog_in.category_ids = list(category_ids)

    blog = await blog_controller.update(id=blog_in.id, obj_in=blog_in.update_dict())
    if not blog:
        return Fail(msg="博客不存在或更新失败")

    if blog_in.category_ids is not None:
        await blog.categories.clear()
        if len(blog_in.category_ids) > 0:
            categories = await Category.filter(id__in=blog_in.category_ids).all()
            await blog.categories.add(*categories)

    if blog_in.images is not None:
        if not isinstance(blog_in.images, list):
            return Fail(msg="图片列表必须是一个列表")
        if len(blog_in.images) == 0:
            return Fail(msg="图片列表不能为空")
        await blog_image_controller.update_for_blog(
            blog_id=blog.id, images=blog_in.images
        )
    return Success(msg="Updated Success")


@blog_router.delete("/delete", summary="删除图片", dependencies=[DependPermisson])
async def delete_blog(
    id: int = Query(..., description="图片id"),
):
    await blog_image_controller.update_for_blog(blog_id=id, images=[])
    await blog_controller.remove(id=id)
    return Success(msg="Deleted Success")
