from datetime import datetime, timedelta
import time
import boto3
from fastapi import APIRouter, File, UploadFile
import urllib

from app.controllers.user import UserController, user_controller
from app.core.ctx import CTX_USER_ID
from app.core.dependency import DependAuth
from app.core.storage import S3FileStorage
from app.models.admin import User
from app.schemas.base import Fail, Success
from app.schemas.login import *
from app.schemas.user import UpdatePassword, UserUpdate
from app.utils import settings
from app.utils.jwt import create_access_token
from app.utils.password import get_password_hash, verify_password
from app.controllers.setting import setting_controller

base_router = APIRouter()


@base_router.get("/user/info", summary="查看用户信息", dependencies=[DependAuth])
async def get_userinfo():
    user_id = CTX_USER_ID.get()
    user_obj = await user_controller.get(id=user_id)
    data = await user_obj.to_dict(exclude_fields=["password"])
    return Success(data=data)


@base_router.post(
    "/user/update_password", summary="更新用户密码", dependencies=[DependAuth]
)
async def update_user_password(req_in: UpdatePassword):
    user_controller = UserController()
    user = await user_controller.get(req_in.id)
    verified = verify_password(req_in.old_password, user.password)
    if not verified:
        return Fail(msg="旧密码验证错误！")
    user.password = get_password_hash(req_in.new_password)
    await user.save()
    return Success(msg="修改成功")


@base_router.post("/user/update", summary="更新用户")
async def update_user(
    user_in: UserUpdate,
):
    user_controller = UserController()
    await user_controller.update(obj_in=user_in)
    return Success(msg="Updated Successfully")


@base_router.post("/access_token", summary="获取token")
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


@base_router.post("/upload", summary="上传图片", dependencies=[DependAuth])
async def upload(file: UploadFile = File()):
    storage_setting = (await setting_controller.get(id=1)).storage
    enableStorage = storage_setting.get("enable_storage", True)
    max_size = storage_setting.get("max_size", 32) or 32

    if file.size > max_size * 1024 * 1024:
        return Fail(
            msg=f"图片大小：{file.size / 1024 / 1024:.2f}MB，超过大小限制：{max_size}MB"
        )

    if not enableStorage:
        return Fail(msg="已禁止上传图片")

    t = time.localtime()
    path_template = storage_setting.get("path", "")
    access_key = storage_setting.get("access_id", None)
    secret_key = storage_setting.get("secret_key", None)
    bucket_name = storage_setting.get("bucket", None)
    endpoint_url = storage_setting.get("endpoint", None)
    region = storage_setting.get("region", None)
    final_path = (
        path_template.replace("{year}", str(t.tm_year))
        .replace("{month}", str(t.tm_mon).zfill(2))
        .replace("{day}", str(t.tm_mday).zfill(2))
        .replace("{timestamp}", str(int(time.time())))
        .replace("{filename}", file.filename)
    )
    if not access_key or not secret_key or not bucket_name or not endpoint_url:
        return Fail(msg="请在存储设置中完善相关参数")
    try:
        storage = S3FileStorage(
            {
                "access_key_id": access_key,
                "secret_access_key": secret_key,
                "bucket_name": bucket_name,
                "endpoint_url": endpoint_url,
                "region_name": region,
            }
        )
        await storage.save_file(file, final_path)
    except Exception as e:
        return Fail(msg=f"上传失败：{str(e)}")

    prefix = storage_setting.get("prefix", "")
    file_url = prefix.rstrip("/") + "/" + final_path.lstrip("/")

    return Success(data=file_url, msg="Upload Success")


class PresignRequest(BaseModel):
    filename: str
    size: int
    type: str


@base_router.post(
    "/presign", summary="获取图片上传预签名URL", dependencies=[DependAuth]
)
async def get_presigned_url(payload: PresignRequest):
    storage_setting = (await setting_controller.get(id=1)).storage
    enableStorage = storage_setting.get("enable_storage", True)
    max_size = storage_setting.get("max_size", 32)
    max_size = max_size if max_size else 32

    if not enableStorage:
        return Fail(msg="已禁止上传图片")

    if payload.size > max_size * 1024 * 1024:
        return Fail(
            msg=f"图片大小：{payload.size / 1024 / 1024:.2f}MB，超过限制 {max_size}MB"
        )

    access_key = storage_setting.get("access_id")
    secret_key = storage_setting.get("secret_key")
    bucket_name = storage_setting.get("bucket")
    path_template = storage_setting.get("path", "")
    endpoint_url = storage_setting.get("endpoint")
    region = storage_setting.get("region", "us-east-1")

    if not all([access_key, secret_key, bucket_name, endpoint_url]):
        return Fail(msg="请在存储设置中完善相关参数")

    s3 = boto3.client(
        "s3",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        endpoint_url=endpoint_url,
        region_name=region,
    )

    t = time.localtime()
    final_key = (
        path_template.replace("{year}", str(t.tm_year))
        .replace("{month}", str(t.tm_mon).zfill(2))
        .replace("{day}", str(t.tm_mday).zfill(2))
        .replace("{timestamp}", str(int(time.time())))
        .replace("{filename}", payload.filename)
    )

    try:
        presigned_url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": bucket_name,
                "Key": final_key,
                "ContentType": payload.type,
            },
            ExpiresIn=600,
        )
    except Exception as e:
        return Fail(msg=f"生成预签名URL失败: {str(e)}")

    file_url = urllib.parse.urljoin(storage_setting.get("prefix", ""), final_key)

    return Success(
        data={
            "upload_url": presigned_url,
            "file_url": file_url,
            "key": final_key,
            "content_type": payload.type,
        },
        msg="预签名URL生成成功",
    )
