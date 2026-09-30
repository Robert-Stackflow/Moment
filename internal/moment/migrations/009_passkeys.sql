CREATE TABLE moment_passkey_config (
 id INTEGER PRIMARY KEY CHECK(id=1),
 enabled INTEGER NOT NULL DEFAULT 0,
 origin TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 0
);
INSERT INTO moment_passkey_config(id) VALUES(1);
CREATE TABLE moment_passkey_users (
 user_id INTEGER PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
 handle TEXT NOT NULL UNIQUE
);
CREATE TABLE moment_passkeys (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
 credential_id TEXT NOT NULL UNIQUE,
 rp_id TEXT NOT NULL,
 name TEXT NOT NULL,
 credential TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,
 last_used_at TEXT
);
CREATE INDEX moment_passkey_owner ON moment_passkeys(user_id,rp_id);
CREATE TABLE moment_passkey_challenges (
 token_hash TEXT PRIMARY KEY,
 kind TEXT NOT NULL CHECK(kind IN ('register','login')),
 user_id INTEGER REFERENCES user(id) ON DELETE CASCADE,
 auth_session TEXT NOT NULL DEFAULT '',
 name TEXT NOT NULL DEFAULT '',
 config_revision INTEGER NOT NULL,
 session TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX moment_passkey_challenge_expiry ON moment_passkey_challenges(expires_at);
