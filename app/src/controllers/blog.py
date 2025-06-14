from typing import List, Optional, Dict, Any, Union

from src.core.crud import CRUDBase
from src.models.content import Blog
from src.schemas.blogs import BlogCreate, BlogUpdate

from .category import category_controller
from .blog_image import blog_image_controller

class BlogController(CRUDBase[Blog, BlogCreate, BlogUpdate]):
    def __init__(self):
        super().__init__(model=Blog)

    async def get_blog_with_images(self, id: int):
        """获取博客及其图片"""
        blog = await self.model.get(id=id).prefetch_related('images', 'categories')
        return blog

    async def update_categories(self, blog: Blog, categories: List[int]) -> None:
        """更新博客分类"""
        await blog.categories.clear()
        for category_id in categories:
            category_obj = await category_controller.get(id=category_id)
            await blog.categories.add(category_obj)
    
    async def create_with_images(self, obj_in: Union[BlogCreate, Dict[str, Any]]) -> Blog:
        """创建博客并添加图片"""
        # 提取数据
        if isinstance(obj_in, dict):
            blog_data = obj_in.copy()
            categories = blog_data.pop("categories", [])
            images = blog_data.pop("images", [])
        else:
            blog_data = obj_in.create_dict()
            categories = obj_in.categories
            images = obj_in.images
        
        # 创建博客
        blog = await self.create(obj_in=blog_data)
        
        # 添加分类
        if categories:
            await self.update_categories(blog, categories)
        
        # 添加图片
        if images:
            await blog_image_controller.create_for_blog(blog.id, images)
            
        return blog
    
    async def update_with_images(self, id: int, obj_in: Union[BlogUpdate, Dict[str, Any]]) -> Blog:
        """更新博客和图片"""
        # 提取数据
        if isinstance(obj_in, dict):
            blog_data = obj_in.copy()
            categories = blog_data.pop("categories", None)
            images = blog_data.pop("images", None)
        else:
            blog_data = obj_in.update_dict()
            categories = obj_in.categories
            images = obj_in.images
        
        # 更新博客
        blog = await self.update(id=id, obj_in=blog_data)
        
        # 更新分类
        if categories is not None:
            await self.update_categories(blog, categories)
        
        # 更新图片
        if images is not None:
            await blog_image_controller.update_for_blog(id, images)
            
        return blog

blog_controller = BlogController()