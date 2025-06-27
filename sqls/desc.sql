
-- 2. 创建临时表（包含新结构，不包含description）
CREATE TEMPORARY TABLE blog_image_temp AS
SELECT 
    id, 
    created_at, 
    updated_at, 
    image_url, 
    title,
    location,
    is_hidden,
    metadata,
	description,
    "order",
    blog_id
FROM blog_image;

-- 3. 删除原表
DROP TABLE blog_image;

-- 4. 创建新表（使用desc替代description，并添加time字段）
CREATE TABLE "blog_image" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "image_url" TEXT NOT NULL,  /* 图片地址 */
    "title" VARCHAR(50),        /* 图片标题，留空则使用博客标题 */
    "desc" TEXT,                /* 图片描述，留空则使用博客描述 */
    "location" TEXT,            /* 图片的具体位置 */
    "is_hidden" INT NOT NULL DEFAULT 0, /* 是否隐藏此图片 */
    "metadata" TEXT,            /* 拍摄参数，EXIF信息等 */
    "order" INT NOT NULL DEFAULT 0, /* 排序 */
    "time" TIMESTAMP,           /* 图片时间，留空则使用博客时间 */
    "blog_id" BIGINT NOT NULL REFERENCES "blog" ("id") ON DELETE CASCADE /* 所属博客 */
);

-- 5. 从临时表恢复数据（desc字段会被置为NULL，需手动迁移）
INSERT INTO blog_image (
    id, created_at, updated_at, image_url, title, 
    location, is_hidden, metadata, "order", blog_id
)
SELECT 
    id, created_at, updated_at, image_url, title, 
    location, is_hidden, metadata, "order", blog_id
FROM blog_image_temp;

-- 6. 迁移description数据到desc字段（可选）
UPDATE blog_image
SET "desc" = (
    SELECT description 
    FROM blog_image_temp 
    WHERE blog_image_temp.id = blog_image.id
);

-- 7. 删除临时表
DROP TABLE blog_image_temp;
