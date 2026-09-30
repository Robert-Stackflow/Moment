-- Keep unpublished edits separate from legacy business records.
CREATE TABLE moment_post_revisions (
    post_id INTEGER PRIMARY KEY REFERENCES blog(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE moment_drafts (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES blog(id) ON DELETE CASCADE,
    base_revision INTEGER NOT NULL DEFAULT 0,
    revision INTEGER NOT NULL,
    mutation_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    published_at TEXT,
    published_post_id INTEGER REFERENCES blog(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX moment_draft_post ON moment_drafts(user_id,post_id) WHERE published_at IS NULL;
CREATE INDEX moment_draft_updated ON moment_drafts(user_id,updated_at DESC);
