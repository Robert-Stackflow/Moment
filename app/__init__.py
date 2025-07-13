from fastapi import FastAPI
from fastapi.middleware import Middleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from tortoise import Tortoise
from tortoise.contrib.fastapi import register_tortoise

from app.core.database import init_db
from app.core.exceptions import (
    DoesNotExist,
    DoesNotExistHandle,
    HTTPException,
    HttpExcHandle,
    IntegrityError,
    IntegrityHandle,
    RequestValidationError,
    RequestValidationHandle,
    ResponseValidationError,
    ResponseValidationHandle,
)
from app.core.middlewares import BackGroundTaskMiddleware
from app.utils.logger import logger
from app.utils.config import settings
from app.api import api_router
from app.controllers.user import UserCreate, user_controller
from app.controllers.setting import SettingCreate, setting_controller


def register_db(app: FastAPI, db_url=None):
    register_tortoise(
        app,
        config=settings.TORTOISE_ORM,
        generate_schemas=True,
    )


def register_exceptions(app: FastAPI):
    app.add_exception_handler(DoesNotExist, DoesNotExistHandle)
    app.add_exception_handler(HTTPException, HttpExcHandle)
    app.add_exception_handler(IntegrityError, IntegrityHandle)
    app.add_exception_handler(RequestValidationError, RequestValidationHandle)
    app.add_exception_handler(ResponseValidationError, ResponseValidationHandle)


def register_routers(app: FastAPI, prefix: str = "/api"):
    app.include_router(api_router, prefix=prefix)


async def init_superuser():
    user = await user_controller.model.exists()
    if not user:
        await user_controller.create(
            UserCreate(
                username="admin",
                email="admin@admin.com",
                password="123456",
                avatar="https://avatars.githubusercontent.com/u/72618337?v=4",
            )
        )


async def init_setting():
    setting = await setting_controller.model.exists()
    if not setting:
        await setting_controller.create(
            SettingCreate(general={}, content={}, meta={}, storage={})
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("正在初始化应用...")
    await init_db()
    await init_superuser()
    await init_setting()

    app.mount(
        "/assets",
        StaticFiles(directory=f"./dist/assets"),
        name="assets",
    )

    logger.info("应用初始化完成")

    try:
        yield
    finally:
        logger.info("正在关闭应用...")
        await Tortoise.close_connections()
        logger.info("应用已关闭")


app = FastAPI(
    lifespan=lifespan,
    title=settings.APP_TITLE,
    description=settings.APP_DESCRIPTION,
    version=settings.VERSION,
    openapi_url="/openapi.json",
    middleware=[
        Middleware(
            CORSMiddleware,
            allow_origins=settings.CORS_ORIGINS,
            allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
            allow_methods=settings.CORS_ALLOW_METHODS,
            allow_headers=settings.CORS_ALLOW_HEADERS,
        ),
        Middleware(BackGroundTaskMiddleware),
    ],
)

register_db(app)
register_exceptions(app)
register_routers(app, prefix="/api")


@app.exception_handler(404)
@app.get("/")
async def index(request=None, exc=None):
    return HTMLResponse(
        content=open(f"./dist/index.html", "r", encoding="utf-8").read(),
        media_type="text/html",
        headers={"Cache-Control": "no-cache"},
    )
