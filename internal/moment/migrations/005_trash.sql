-- Soft deletion is additive so legacy records, image IDs and metadata survive.
CREATE TABLE moment_trash_posts (
    post_id INTEGER PRIMARY KEY REFERENCES blog(id) ON DELETE CASCADE,
    deleted_at TEXT NOT NULL,
    deleted_by INTEGER REFERENCES user(id) ON DELETE SET NULL,
    content_revision INTEGER NOT NULL
);
CREATE INDEX moment_trash_deleted ON moment_trash_posts(deleted_at DESC,post_id DESC);
