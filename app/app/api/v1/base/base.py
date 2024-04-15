from datetime import datetime, timedelta
import time
import boto3
from fastapi import APIRouter, File, Query, UploadFile

from app.controllers.user import UserController, user_controller
from app.core.ctx import CTX_USER_ID
from app.core.dependency import DependAuth
from app.models.admin import  Menu, User
from app.schemas.base import Fail, Success
from app.schemas.login import *
from app.schemas.users import UpdatePassword
from app.settings import settings
from app.utils.jwt import create_access_token
from app.utils.password import get_password_hash, verify_password
from app.controllers.setting import setting_controller

router = APIRouter()


@router.post("/access_token", summary="获取token")
async def login_access_token(credentials: CredentialsSchema):
    user: User = await user_controller.authenticate(credentials)
    await user_controller.update_last_login(user.id)
    access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.utcnow() + access_token_expires

    data = JWTOut(
        access_token=create_access_token(
            data=JWTPayload(
                user_id=user.id,
                username=user.username,
                exp=expire,
            )
        ),
        username=user.username,
    )
    return Success(data=data.model_dump())


@router.get("/userinfo", summary="查看用户信息", dependencies=[DependAuth])
async def get_userinfo():
    user_id = CTX_USER_ID.get()
    user_obj = await user_controller.get(id=user_id)
    data = await user_obj.to_dict(exclude_fields=["password"])
    return Success(data=data)

@router.get("/usermenu", summary="查看用户菜单", dependencies=[DependAuth])
async def get_user_menu():
    user_id = CTX_USER_ID.get()
    user_obj = await User.filter(id=user_id).first()
    menus: list[Menu] = []
    menus = await Menu.all()
    parent_menus: list[Menu] = []
    for menu in menus:
        if menu.parent_id == 0:
            parent_menus.append(menu)
    res = []
    for parent_menu in parent_menus:
        parent_menu_dict = await parent_menu.to_dict()
        parent_menu_dict["children"] = []
        for menu in menus:
            if menu.parent_id == parent_menu.id:
                parent_menu_dict["children"].append(await menu.to_dict())
        res.append(parent_menu_dict)
    return Success(data=res)

@router.post("/update_password", summary="更新用户密码", dependencies=[DependAuth])
async def update_user_password(req_in: UpdatePassword):
    user_controller = UserController()
    user = await user_controller.get(req_in.id)
    verified = verify_password(req_in.old_password, user.password)
    if not verified:
        return Fail(msg="旧密码验证错误！")
    user.password = get_password_hash(req_in.new_password)
    await user.save()
    return Success(msg="修改成功")

@router.post("/upload", summary="上传图片", dependencies=[DependAuth])
async def upload(file: UploadFile=File()):
    storage_setting = (await setting_controller.get(id=1)).storage
    enableStorage = storage_setting.get('enable_storage',True)
    print(storage_setting)
    max_size = storage_setting.get('max_size',32)
    max_size = max_size if max_size else 32
    if file.size > max_size * 1024 * 1024 :
        return Fail(msg=f"图片大小：{file.size/1024/1024:.2f}MB，超过大小限制：{max_size}MB")
    if enableStorage:
        access_key = storage_setting.get('access_id',None)
        secret_key = storage_setting.get('secret_key',None)
        bucket_name = storage_setting.get('bucket',None)
        path = storage_setting.get('path','')
        endpoint_url = storage_setting.get('endpoint',None)
        if not access_key or not secret_key or not bucket_name or not endpoint_url:
            return Fail(msg="请在存储设置中完善相关参数")
        s3 = boto3.client(
            service_name='s3',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            endpoint_url=endpoint_url,
        )
        t = time.localtime()
        final_path="/"+path.replace("{year}",str(t.tm_year)).replace("{month}",str(t.tm_mon).zfill(2)).replace("{day}",str(t.tm_mday).zfill(2)).replace("{timestamp}",str(int(time.time()))).replace("{filename}",file.filename)
        s3.upload_fileobj(file.file, bucket_name, final_path)
        return Success(data=storage_setting.get('prefix','')+final_path,msg="Upload Success")
    else:
        return Fail(msg="已禁止上传图片")