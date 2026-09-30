CREATE TABLE moment_schedules (
    draft_id TEXT PRIMARY KEY REFERENCES moment_drafts(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL,
    draft_revision INTEGER NOT NULL,
    publish_at INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending','published','failed','cancelled')),
    title TEXT NOT NULL,
    error TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
);
CREATE INDEX moment_schedules_due ON moment_schedules(publish_at) WHERE status='pending';
