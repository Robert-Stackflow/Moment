import json
import logging

from fastapi import APIRouter, Query
from tortoise.expressions import Q
from src.controllers.blog import blog_controller
from src.controllers.category import category_controller
from src.controllers.setting import setting_controller
from src.schemas.base import Fail, Success, SuccessExtra
from src.schemas.blogs import *

logger = logging.getLogger(__name__)

router = APIRouter()

order_options=[{'label': "图片时间-降序",'value': 'meta_time_desc','order':'-time'},{'label': "图片时间-升序",'value': 'meta_time_asc','order':'time'}, {'label': "图片创建时间-降序",'value': 'created_at_desc','order':'-created_at'}, {'label': "图片创建时间-升序",'value': 'created_at_asc','order':'created_at'}, {'label': "图片更新时间-降序",'value': 'updated_at_desc','order':'-updated_at'},  {'label': "图片更新时间-升序",'value': 'updated_at_asc','order':'updated_at'}]

@router.get("/order/list", summary="查看排序选项")
async def list_order():
    orders=[json.dumps(order) for order in order_options]
    return Success(data=orders)

@router.get("/blog/list", summary="查看图片列表")
async def list_blog(
    page: int = Query(1, description="页码"),
    page_size: int = Query(10, description="每页数量"),
    category: str = Query("",description="分类alias，用于获取某一分类的图片")
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
    if got_category_id!=-1:
        q &= Q(categories__not_in=other_category_ids)
    q &= Q(is_hidden=False)
    result = await setting_controller.get(id=1)
    content=result.content
    custom_option=content.get('order_option','meta_time_desc')
    order=None
    for t in order_options:
        if t['value']==custom_option:
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

@router.get("/category/get/alias", summary="查看分类")
async def get_category(
    alias: str = Query("", description="分类别名"),
):
    result = await category_controller.model.filter(alias=alias)
    if len(result)>0:
        result = await result[0].to_dict()
        return Success(data=result)
    else:
        return Fail(msg=f"找不到别名为{alias}的分类")
    
@router.get("/category/list", summary="查看分类列表")
async def list_category(
    page: int = Query(1, description="页码"),
    page_size: int = Query(10, description="每页数量"),
):
    parent_categories = await category_controller.model.filter(parent_id=0).order_by("order")
    res_category = []
    for category in parent_categories:
        child_category = await category_controller.model.filter(parent_id=category.id).order_by("order")
        category_dict = await category.to_dict()
        category_dict["children"] = [await obj.to_dict() for obj in child_category]
        res_category.append(category_dict)
    return SuccessExtra(data=res_category, total=len(res_category), page=page, page_size=page_size)