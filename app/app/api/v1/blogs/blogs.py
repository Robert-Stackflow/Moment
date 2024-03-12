import logging

from fastapi import APIRouter, Query
from tortoise.expressions import Q
from app.controllers.blog import blog_controller
from app.controllers.category import category_controller
from app.core.dependency import DependPermisson
from app.schemas.base import Fail, Success, SuccessExtra
from app.schemas.blogs import *

logger = logging.getLogger(__name__)

router = APIRouter()

order_options=[{'label': "图片时间-降序",'value': 'meta_time_desc','order':'-time'},{'label': "图片时间-升序",'value': 'meta_time_asc','order':'time'}, {'label': "图片创建时间-降序",'value': 'created_at_desc','order':'-created_at'}, {'label': "图片创建时间-升序",'value': 'created_at_asc','order':'created_at'}, {'label': "图片更新时间-降序",'value': 'updated_at_desc','order':'-updated_at'},  {'label': "图片更新时间-升序",'value': 'updated_at_asc','order':'updated_at'}]

@router.get("/list", summary="查看图片列表")
async def list_blog(
    page: int = Query(1, description="页码"),
    page_size: int = Query(10, description="每页数量"),
    title: str = Query("", description="标题，用于搜索"),
    desc: str = Query("", description="标题，用于搜索"),
    location: str = Query("", description="地点，用于搜索"),
    category: str = Query("",description="分类alias，用于获取某一分类的图片"),
    order_option: str= Query("",description="排序规则")
):
    got_category_id=-1
    other_category_ids=[]
    if category:
        got_category = await category_controller.model.filter(alias=category)
        other_category = await category_controller.model.filter(alias__not=category)
        if len(got_category)==0 :
            return Fail(msg="分类不存在")
        else:
            got_category_id=got_category[0].id
            other_category_ids=[category.id for category in other_category]
    q = Q()
    if title:
        q &= Q(title__contains=title)
    if desc:
        q &= Q(desc__contains=desc)
    if location:
        q &= Q(location__contains=location)
    if got_category_id!=-1:
        q &= Q(categories__not_in=other_category_ids)
    order=None
    for t in order_options:
        if t['value']==order_option:
            order=[t['order']]
            break
    if order:
        total, blog_objs = await blog_controller.list(page=page, page_size=page_size, search=q,order=order)
    else:
        total, blog_objs = await blog_controller.list(page=page, page_size=page_size, search=q)
    data = [await obj.to_dict(m2m=True) for obj in blog_objs]
    for blog in data:
        blog['formatted_categories']=blog['categories']
        blog['categories']=[item['id'] for item in blog['formatted_categories']]
    return SuccessExtra(data=data, total=total, page=page, page_size=page_size)

@router.get("/get", summary="查看图片")
async def get_blog(
    blog_id: int = Query(..., description="图片id"),
):
    result = await blog_controller.get(id=blog_id)
    return Success(data=result)

@router.get("/count", summary="图片和分类数")
async def get_count():
    blog_count = len(await blog_controller.model.all())
    category_count = len(await category_controller.model.all())
    return Success(data={"blog":blog_count,"category":category_count})

@router.get("/locations", summary="查看地点列表")
async def get_locations():
    results = await blog_controller.model.all()
    locations = {}
    for blog in results:
        if blog.location :
            if locations.get(blog.location,None)==None:
                locations[blog.location]=1
            else:
                locations[blog.location]=locations[blog.location]+1
    locations=sorted(locations.items(),  key=lambda d: d[1], reverse=True)
    return Success(data=locations)

@router.post("/create", summary="创建图片", dependencies=[DependPermisson])
async def create_blog(
    blog_in: BlogCreate,
):
    for category_id in blog_in.categories:
        category = await category_controller.model.filter(id=category_id)
        if len(category)>0 and category[0].parent_id!=0 and category[0].parent_id not in blog_in.categories:
            blog_in.categories.append(category[0].parent_id)
    new_blog = await blog_controller.create(obj_in=blog_in.create_dict())
    await blog_controller.update_categories(new_blog, blog_in.categories)
    return Success(msg="Created Success")


@router.post("/update", summary="更新图片", dependencies=[DependPermisson])
async def update_blog(
    blog_in: BlogUpdate,
):
    for category_id in blog_in.categories:
        category = await category_controller.model.filter(id=category_id)
        if len(category)>0 and category[0].parent_id!=0 and category[0].parent_id not in blog_in.categories:
            blog_in.categories.append(category[0].parent_id)
    blog = await blog_controller.update(id=blog_in.id, obj_in=blog_in.update_dict())
    await blog_controller.update_categories(blog, blog_in.categories)
    return Success(msg="Updated Success")


@router.delete("/delete", summary="删除图片", dependencies=[DependPermisson])
async def delete_blog(
    id: int = Query(..., description="图片id"),
):
    await blog_controller.remove(id=id)
    return Success(msg="Deleted Success")
