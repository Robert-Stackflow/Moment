-- ✅ 0. 备份原始表，确保可回滚
CREATE TABLE blog_backup_v1 AS SELECT * FROM blog;
CREATE TABLE blog_image_backup_v1 AS SELECT * FROM blog_image;
CREATE TABLE blog_category_backup_v1 AS SELECT * FROM blog_category;

-- ✅ 1. 开始事务，确保原子性
BEGIN TRANSACTION;

-- ✅ 2. 创建新的 blog 表结构（不含 image 列）
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
);

-- ✅ 3. 从原表复制数据到新表
INSERT INTO blog_new (id, created_at, updated_at, title, "desc", location, "time", is_hidden, remark)
SELECT id, created_at, updated_at, title, "desc", location, "time", is_hidden, remark
FROM blog;

-- ✅ 4. 创建临时 blog_image 表用于迁移（保留映射）
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
JOIN blog_new nb ON bi.blog_id = nb.id;

-- ✅ 5. 删除原 blog_image 表
DROP TABLE blog_image;

-- ✅ 6. 重建 blog_image 表，引用新的 blog 表
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
);

-- ✅ 7. 恢复 blog_image 数据
INSERT INTO blog_image (
    id, created_at, updated_at, image_url, title, 
    "desc", location, is_hidden, metadata, time, "order", blog_id
)
SELECT 
    id, created_at, updated_at, image_url, title, 
    "desc", location, is_hidden, metadata, time, "order", new_blog_id
FROM blog_image_temp;

-- ✅ 8. 删除原 blog 表
DROP TABLE blog;

-- ✅ 9. 将 blog_new 重命名为 blog
ALTER TABLE blog_new RENAME TO blog;

-- ✅ 10. 删除临时表
DROP TABLE blog_image_temp;

-- ✅ 11. 重新创建 blog_category 表（保持结构，引用新 blog 表）
-- （注意：这一步可能不必要，因为 blog.id 没变。但我们重建一下确保外键完整性）
DROP TABLE blog_category;

CREATE TABLE "blog_category" (
    "blog_id" BIGINT NOT NULL REFERENCES "blog" ("id") ON DELETE CASCADE,
    "category_id" BIGINT NOT NULL REFERENCES "category" ("id") ON DELETE CASCADE
);

-- ✅ 12. 恢复 blog_category 数据（ID 没变，无需映射）
INSERT INTO blog_category (blog_id, category_id)
SELECT blog_id, category_id FROM blog_category_backup_v1;

-- ✅ 13. 提交事务
COMMIT;
