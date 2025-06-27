from tortoise import fields

from .base import BaseModel, TimestampMixin


class Blog(BaseModel, TimestampMixin):
    title = fields.CharField(max_length=50, description="博客标题")
    desc = fields.TextField(null=True, description="博客描述")
    location = fields.TextField(null=True, description="博客位置，如黄山等")
    time = fields.DatetimeField(null=True, description="博客时间")
    is_hidden = fields.BooleanField(
        null=False, default=False, description="是否隐藏此博客"
    )
    remark = fields.JSONField(null=True, description="保留字段")
    categories = fields.ManyToManyField(
        "models.Category",
        related_name="blog_categories",
        description="分类",
        through="blog_category",
    )

    class Meta:
        table = "blog"

    async def to_dict_with_images(self, m2m=False):
        blog_dict = await self.to_dict(m2m)
        blog_dict["images"] = [await image.to_dict() for image in self.images]
        images = blog_dict.get("images", [])
        images.sort(key=lambda x: x["order"])
        blog_dict["images"] = images
        return blog_dict


class BlogImage(BaseModel, TimestampMixin):
    blog = fields.ForeignKeyField(
        "models.Blog", related_name="images", description="所属博客"
    )
    image_url = fields.TextField(null=False, description="图片地址")
    title = fields.CharField(
        max_length=50, null=True, description="图片标题，留空则使用博客标题"
    )
    desc = fields.TextField(null=True, description="图片描述，留空则使用博客描述")
    location = fields.TextField(
        null=True,
        description="图片的具体位置，如莲花峰、天都峰等，如果和博客位置相同则留空",
    )
    time = fields.DatetimeField(null=True, description="图片时间，留空则使用博客时间")
    is_hidden = fields.BooleanField(default=False, description="是否隐藏此图片")
    metadata = fields.TextField(null=True, description="拍摄参数，EXIF信息等")
    order = fields.IntField(default=0, description="排序")

    class Meta:
        table = "blog_image"


class Category(BaseModel, TimestampMixin):
    name = fields.CharField(max_length=30, unique=True, description="分类名称")
    alias = fields.CharField(
        max_length=50, unique=True, description="分类别名，用于生成路径"
    )
    desc = fields.TextField(null=True, description="描述")
    order = fields.IntField(default=0, description="排序")
    parent_id = fields.IntField(default=0, max_length=10, description="父分类ID")
    remark = fields.JSONField(null=True, description="保留字段")

    class Meta:
        table = "category"
