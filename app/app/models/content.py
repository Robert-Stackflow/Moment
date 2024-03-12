
from tortoise import fields

from .base import BaseModel, TimestampMixin

class Blog(BaseModel, TimestampMixin):
    title = fields.CharField(max_length=50, description="标题")
    desc = fields.TextField(null=True,description="描述")
    image = fields.TextField(null=False, description="图片地址")
    location = fields.TextField(null=True,description="地点")
    time = fields.DatetimeField(null=True,description="时间")
    is_hidden = fields.BooleanField(null=False,default=False,description="隐藏图片")
    categories = fields.ManyToManyField("models.Category", related_name="blog_categories", description="分类")
    remark = fields.JSONField(null=True, description="保留字段")

    class Meta:
        table = "blog"

class Category(BaseModel, TimestampMixin):
    name = fields.CharField(max_length=30, unique=True,description="分类名称")
    alias = fields.CharField(max_length=50, unique=True,description="分类别名，用于生成路径")
    desc = fields.TextField(null=True,description="描述")
    order = fields.IntField(default=0, description="排序")
    parent_id = fields.IntField(default=0, max_length=10, description="父分类ID")
    remark = fields.JSONField(null=True, description="保留字段")

    class Meta:
        table = "category"