CREATE TABLE moment_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL DEFAULT '',
    expires_at INTEGER,
    revoked INTEGER NOT NULL DEFAULT 0,
    revision INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE moment_share_posts (
    share_id INTEGER NOT NULL REFERENCES moment_shares(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES blog(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    PRIMARY KEY(share_id,post_id)
);
CREATE INDEX moment_share_post_lookup ON moment_share_posts(post_id);
CREATE TABLE moment_share_sessions (
    token_hash TEXT PRIMARY KEY,
    share_id INTEGER NOT NULL REFERENCES moment_shares(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);
CREATE INDEX moment_share_session_expiry ON moment_share_sessions(expires_at);
