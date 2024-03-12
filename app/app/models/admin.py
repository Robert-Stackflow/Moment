from tortoise import fields

from app.schemas.menus import MenuType

from .base import BaseModel, TimestampMixin

class User(BaseModel, TimestampMixin):
    username = fields.CharField(max_length=20, unique=True, description="用户名")
    alias = fields.CharField(max_length=30, null=True, description="昵称")
    email = fields.CharField(max_length=255, unique=True, description="邮箱")
    avatar = fields.CharField(max_length=255, unique=True, description="头像地址")
    password = fields.CharField(max_length=128, null=True, description="密码")
    last_login = fields.DatetimeField(null=True, description="最后登录时间")
    remark = fields.JSONField(null=True, description="保留字段")

    class Meta:
        table = "user"

    class PydanticMeta:
        # todo
        # computed = ["full_name"]
        ...

class Setting(BaseModel, TimestampMixin):
    general = fields.JSONField(description="通用设置")
    meta = fields.JSONField(description="网站设置")
    content = fields.JSONField(description="内容设置")
    storage = fields.JSONField(description="存储设置")

    class Meta:
        table = "setting"

class Menu(BaseModel, TimestampMixin):
    name = fields.CharField(max_length=20, description="菜单名称")
    remark = fields.JSONField(null=True, description="保留字段", blank=True)
    menu_type = fields.CharEnumField(MenuType, null=True, blank=True, description="菜单类型")
    icon = fields.CharField(max_length=100, null=True, blank=True, description="菜单图标")
    path = fields.CharField(max_length=100, description="菜单路径")
    order = fields.IntField(default=0, description="排序")
    parent_id = fields.IntField(default=0, max_length=10, description="父菜单ID")
    is_hidden = fields.BooleanField(default=False, description="是否隐藏")
    component = fields.CharField(max_length=100, description="组件")
    keepalive = fields.BooleanField(default=True, description="存活")
    redirect = fields.CharField(max_length=100, null=True, blank=True, description="重定向")

    class Meta:
        table = "menu"