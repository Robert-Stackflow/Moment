from tortoise import Tortoise, connections
from tortoise.exceptions import OperationalError
from tortoise.transactions import in_transaction
from app.models import *
from app.utils import DB_CONNECTION


async def migrate():
    print("开始数据库迁移...")

    try:
        # 1. 连接到数据库
        await Tortoise.init(**DB_CONNECTION)
        conn = connections.get("default")

        # 2. 检查BlogImage表是否存在
        blog_image_exists = await _check_table_exists(conn, "blog_image")

        if not blog_image_exists:
            print("BlogImage表不存在，开始创建...")
            # 3. 创建新表
            await Tortoise.generate_schemas(safe=True)
            print("表结构创建完成")
        else:
            print("BlogImage表已存在")

        # 4. 检查Blog表是否有image字段
        has_image_field = await _check_column_exists(conn, "blog", "image")

        if not has_image_field:
            print("Blog表没有image字段，无需迁移数据")
            return

        # 5. 检查是否需要迁移数据
        blog_count = await Blog.all().count()
        image_count = await BlogImage.all().count()

        if blog_count > 0 and image_count == 0:
            print(f"检测到 {blog_count} 篇博客但没有图片记录，开始迁移...")
            await _migrate_blog_images()
        else:
            print(f"已存在图片记录 ({image_count}张)，无需迁移")

        # 6. 从Blog表中删除image字段
        print("开始删除Blog表中的image字段...")
        await _remove_image_column(conn)
        print("image字段已删除")

    except Exception as e:
        print(f"迁移过程中发生错误: {str(e)}")
        import traceback

        traceback.print_exc()

    finally:
        # 7. 关闭连接
        await Tortoise.close_connections()
        print("迁移完成")


async def _check_table_exists(connection, table_name):
    result = await connection.execute_query(
        f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'"
    )
    return len(result[1]) > 0


async def _check_column_exists(connection, table_name, column_name):
    try:
        await connection.execute_query(
            f"SELECT {column_name} FROM {table_name} LIMIT 1"
        )
        return True
    except OperationalError:
        return False


async def _migrate_blog_images():
    async with in_transaction() as conn:
        rows = await conn.execute_query_dict(
            "SELECT id, title, image FROM blog WHERE image IS NOT NULL"
        )

        for row in rows:
            blog_id = row["id"]
            title = row["title"]
            image_url = row["image"]

            try:
                blog = await Blog.get_or_none(id=blog_id)
                if not blog:
                    print(f"[跳过] blog_id={blog_id} 不存在于新 blog 表中")
                    continue
                await BlogImage.create(
                    blog=blog,
                    image_url=image_url,
                    title=None,
                    desc=None,
                    location=None,
                    is_hidden=False,
                    order=0,
                )
                print(f"✅ 已为博客 '{title}' (ID: {blog_id}) 创建图片记录")

            except Exception as e:
                print(f"❌ 迁移博客ID {blog_id} 失败: {str(e)}")


async def _remove_image_column(connection):
    """使用SQLite临时表方案安全移除image列（保留外键关联）"""
    await connection.execute_query("BEGIN TRANSACTION")
    try:
        # ✅ 0. 备份原始表
        await connection.execute_query(
            """
            CREATE TABLE blog_backup_v1 AS SELECT * FROM blog;
        """
        )
        await connection.execute_query(
            """
            CREATE TABLE blog_image_backup_v1 AS SELECT * FROM blog_image;
        """
        )
        await connection.execute_query(
            """
            CREATE TABLE blog_category_backup_v1 AS SELECT * FROM blog_category;
        """
        )

        # ✅ 1. 创建新的 blog 表结构（不含 image 列）
        await connection.execute_query(
            """
            CREATE TABLE "blog_new" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "title" VARCHAR(50) NOT NULL,
                "desc" TEXT,
                "location" TEXT,
                "time" TIMESTAMP,
                "is_hidden" INT NOT NULL DEFAULT 0,
                "remark" JSON
            )
        """
        )

        # ✅ 2. 从原表复制数据到新表
        await connection.execute_query(
            """
            INSERT INTO blog_new (id, created_at, updated_at, title, "desc", location, "time", is_hidden, remark)
            SELECT id, created_at, updated_at, title, "desc", location, "time", is_hidden, remark
            FROM blog
        """
        )

        # ✅ 3. 创建临时 blog_image 表用于迁移
        await connection.execute_query(
            """
            CREATE TEMPORARY TABLE blog_image_temp AS
            SELECT 
                bi.id, 
                bi.created_at, 
                bi.updated_at, 
                bi.image_url, 
                bi.title,
                bi."desc",
                bi.location,
                bi.is_hidden,
                bi.metadata,
                bi.time,
                bi."order",
                bi.blog_id,
                nb.id AS new_blog_id
            FROM blog_image bi
            JOIN blog_new nb ON bi.blog_id = nb.id
        """
        )

        # ✅ 4. 删除原 blog_image 表
        await connection.execute_query("DROP TABLE blog_image")

        # ✅ 5. 重建 blog_image 表
        await connection.execute_query(
            """
            CREATE TABLE "blog_image" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "image_url" TEXT NOT NULL,
                "title" VARCHAR(50),
                "desc" TEXT,
                "location" TEXT,
                "is_hidden" INT NOT NULL DEFAULT 0,
                "metadata" TEXT,
                "time" TIMESTAMP,
                "order" INT NOT NULL DEFAULT 0,
                "blog_id" BIGINT NOT NULL REFERENCES "blog_new" ("id") ON DELETE CASCADE
            )
        """
        )

        # ✅ 6. 恢复 blog_image 数据
        await connection.execute_query(
            """
            INSERT INTO blog_image (
                id, created_at, updated_at, image_url, title, 
                "desc", location, is_hidden, metadata, time, "order", blog_id
            )
            SELECT 
                id, created_at, updated_at, image_url, title, 
                "desc", location, is_hidden, metadata, time, "order", new_blog_id
            FROM blog_image_temp
        """
        )

        # ✅ 7. 删除原 blog 表
        await connection.execute_query("DROP TABLE blog")

        # ✅ 8. 重命名新表为 blog
        await connection.execute_query("ALTER TABLE blog_new RENAME TO blog")

        # ✅ 9. 删除临时表
        await connection.execute_query("DROP TABLE blog_image_temp")

        # ✅ 10. 重建 blog_category 表
        await connection.execute_query(
            """
            DROP TABLE blog_category;
        """
        )
        await connection.execute_query(
            """
            CREATE TABLE "blog_category" (
                "blog_id" BIGINT NOT NULL REFERENCES "blog" ("id") ON DELETE CASCADE,
                "category_id" BIGINT NOT NULL REFERENCES "category" ("id") ON DELETE CASCADE
            );
        """
        )
        await connection.execute_query(
            """
            INSERT INTO blog_category (blog_id, category_id)
            SELECT blog_id, category_id FROM blog_category_backup_v1;
        """
        )
        await connection.execute_query("DROP TABLE IF EXISTS menu;")
        await connection.execute_query("COMMIT")
    except Exception as e:
        await connection.execute_query("ROLLBACK")
        raise RuntimeError(f"表结构修改失败: {str(e)}") from e
