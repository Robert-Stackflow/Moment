from tortoise import Tortoise, connections
from tortoise.exceptions import OperationalError

from app.models import *
from app.utils import DB_CONNECTION


async def migrate():
    print("开始数据库迁移...")

    # 1. 连接到数据库
    await Tortoise.init(**DB_CONNECTION)

    # 2. 检查BlogImage表是否存在
    try:
        conn = connections.get("default")

        # 检查BlogImage表是否存在
        result = await conn.execute_query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='blog_image'"
        )
        blog_image_exists = len(result[1]) > 0

        if not blog_image_exists:
            print("BlogImage表不存在，开始创建...")
            # 3. 创建新表
            await Tortoise.generate_schemas(safe=True)
            print("表结构创建完成")
            # 4. 检查Blog表是否有image字段
            try:
                result = await conn.execute_query("SELECT image FROM blog LIMIT 1")
                has_image_field = True
            except OperationalError:
                has_image_field = False
                print("Blog表没有image字段，无需迁移数据")

            # 5. 如果有image字段，迁移数据
            if has_image_field:
                print("开始迁移Blog.image数据到BlogImage表...")
                blogs = await Blog.all()
                for blog in blogs:
                    # 使用反射方式获取image字段
                    try:
                        image_url = await conn.execute_query(
                            f"SELECT image FROM blog WHERE id={blog.id}"
                        )
                        if (
                            image_url
                            and image_url[1]
                            and image_url[1][0]
                            and image_url[1][0][0]
                        ):
                            await BlogImage.create(
                                blog=blog,
                                image_url=image_url[1][0][0],
                                title=None,
                                description=None,
                                location=None,
                                is_hidden=blog.is_hidden,
                                order=0,
                            )
                            print(
                                f"已为博客 '{blog.title}' (ID: {blog.id}) 创建图片记录"
                            )
                    except Exception as e:
                        print(f"迁移博客ID {blog.id} 失败: {str(e)}")

                print("检查是否需要删除原image字段...")
                # 从Blog表中删除image字段
                await conn.execute_query("ALTER TABLE blog DROP COLUMN image")
        else:
            print("BlogImage表已存在，检查是否需要迁移数据...")
            # 检查是否已经迁移过数据
            blog_count = await Blog.all().count()
            image_count = await BlogImage.all().count()

            if blog_count > 0 and image_count == 0:
                print("检测到有博客但没有图片记录，尝试从旧结构迁移...")
                # 检查Blog表是否有image字段
                try:
                    result = await conn.execute_query("SELECT image FROM blog LIMIT 1")
                    has_image_field = True
                except OperationalError:
                    has_image_field = False
                    print("Blog表没有image字段，无需迁移数据")

                if has_image_field:
                    blogs = await Blog.all()
                    for blog in blogs:
                        try:
                            image_url = await conn.execute_query(
                                f"SELECT image FROM blog WHERE id={blog.id}"
                            )
                            if (
                                image_url
                                and image_url[1]
                                and image_url[1][0]
                                and image_url[1][0][0]
                            ):
                                await BlogImage.create(
                                    blog=blog,
                                    image_url=image_url[1][0][0],
                                    title=None,
                                    description=None,
                                    location=None,
                                    is_hidden=blog.is_hidden,
                                    order=0,
                                )
                                print(
                                    f"已为博客 '{blog.title}' (ID: {blog.id}) 创建图片记录"
                                )
                        except Exception as e:
                            print(f"迁移博客ID {blog.id} 失败: {str(e)}")
            else:
                print(f"已存在图片记录 ({image_count}张)，无需迁移")

    except Exception as e:
        print(f"迁移过程中发生错误: {str(e)}")
        import traceback

        traceback.print_exc()

    # 6. 关闭连接
    await Tortoise.close_connections()
    print("迁移完成")
