CREATE TABLE moment_image_tags (
 image_id INTEGER NOT NULL REFERENCES blog_image(id) ON DELETE CASCADE,
 tag TEXT NOT NULL,
 PRIMARY KEY(image_id,tag)
);
CREATE INDEX moment_image_tag_lookup ON moment_image_tags(tag,image_id);
