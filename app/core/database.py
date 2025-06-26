import os
from tortoise import Tortoise
from app.utils import DB_CONNECTION, logger
import glob
import importlib


async def init_db():
    try:
        await Tortoise.init(**DB_CONNECTION)

        # 创建migrations表
        await Tortoise.get_connection("default").execute_script(
            """
            CREATE TABLE IF NOT EXISTS migrates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                migration_file VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        await execute_migrations()
    except Exception as e:
        logger.error(f"数据库初始化失败: {str(e)}")
        raise


async def execute_migrations():
    """执行数据库迁移"""
    try:
        # 收集迁移文件
        migration_files = []
        for root, dirs, _ in os.walk("."):
            if "migrations" in dirs:
                migration_path = os.path.join(root, "migrations")
                migration_files.extend(
                    glob.glob(os.path.join(migration_path, "migrations_*.py"))
                )

        migration_files.sort()

        for migration_file in migration_files:
            file_name = os.path.basename(migration_file)

            executed = await Tortoise.get_connection("default").execute_query(
                "SELECT id FROM migrates WHERE migration_file = ?", [file_name]
            )

            if not executed[1]:
                logger.info(f"执行迁移: {file_name} for {migration_file}")
                module_path = (
                    migration_file.replace("/", ".")
                    .replace(".\\", "")
                    .replace("\\", ".")
                    .replace(".py", "")
                )
                try:
                    migration_module = importlib.import_module(module_path)
                    if hasattr(migration_module, "migrate"):
                        await migration_module.migrate()
                        await Tortoise.get_connection("default").execute_query(
                            "INSERT INTO migrates (migration_file) VALUES (?)",
                            [file_name],
                        )
                        logger.info(f"迁移完成: {file_name}")
                except Exception as e:
                    logger.error(f"迁移 {file_name} 执行失败: {str(e)}")
                    raise

    except Exception as e:
        logger.error(f"迁移过程发生错误: {str(e)}")
        raise
