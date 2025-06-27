from typing import List, Optional, Dict, Any, Union

from app.core.crud import CRUDBase
from app.models.content import BlogImage
from app.schemas.blog import BlogImageCreate, BlogImageUpdate


class BlogImageController(CRUDBase[BlogImage, BlogImageCreate, BlogImageUpdate]):
    def __init__(self):
        super().__init__(model=BlogImage)

    async def create_for_blog(
        self, blog_id: int, images: List[Union[BlogImageCreate, Dict[str, Any]]]
    ):
        """为博客创建多张图片"""
        result = []
        for image in images:
            if isinstance(image, dict):
                image_data = image
            else:
                image_data = image.model_dump()

            image_data["blog_id"] = blog_id
            new_image = await self.create(obj_in=image_data)
            result.append(new_image)
        return result

    async def update_for_blog(
        self, blog_id: int, images: List[Union[BlogImageUpdate, Dict[str, Any]]]
    ):
        """更新博客的图片"""
        current_images = await self.model.filter(blog_id=blog_id)
        current_ids = {img.id: img for img in current_images}

        update_ids = []
        result = []

        for image in images:
            if isinstance(image, dict):
                image_data = image
                image_id = image_data.get("id")
            else:
                image_data = image.model_dump()
                image_id = image_data.get("id")

            if image_id and image_id in current_ids:
                # 更新现有图片
                update_ids.append(image_id)
                await self.update(
                    id=image_id,
                    obj_in={k: v for k, v in image_data.items() if k != "id"},
                )
                result.append(await self.get(id=image_id))
            else:
                # 创建新图片
                image_data["blog_id"] = blog_id
                if "id" in image_data:
                    del image_data["id"]
                new_image = await self.create(obj_in=image_data)
                result.append(new_image)

        # 删除不再需要的图片
        delete_ids = [
            img_id for img_id in current_ids.keys() if img_id not in update_ids
        ]
        if delete_ids:
            await self.model.filter(id__in=delete_ids).delete()

        return result


blog_image_controller = BlogImageController()
