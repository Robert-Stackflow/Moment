CREATE TABLE IF NOT EXISTS moment_session_details (
 token_hash TEXT PRIMARY KEY REFERENCES moment_sessions(token_hash) ON DELETE CASCADE,
 id TEXT NOT NULL UNIQUE,
 created_at INTEGER NOT NULL DEFAULT 0,
 last_seen_at INTEGER NOT NULL DEFAULT 0,
 ip TEXT NOT NULL DEFAULT '',
 user_agent TEXT NOT NULL DEFAULT '',
 method TEXT NOT NULL DEFAULT 'unknown' CHECK(method IN ('password','passkey','unknown'))
);
