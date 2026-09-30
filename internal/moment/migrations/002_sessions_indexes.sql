CREATE TABLE IF NOT EXISTS moment_sessions (
 token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS moment_sessions_expiry ON moment_sessions(expires_at);
CREATE INDEX IF NOT EXISTS moment_blog_visibility_time ON blog(is_hidden, time, id);
CREATE INDEX IF NOT EXISTS moment_image_blog_order ON blog_image(blog_id, "order", id);
CREATE INDEX IF NOT EXISTS moment_category_parent_order ON category(parent_id, "order", id);
CREATE INDEX IF NOT EXISTS moment_relation_category ON blog_category(category_id, blog_id);
CREATE INDEX IF NOT EXISTS moment_relation_blog ON blog_category(blog_id, category_id);
