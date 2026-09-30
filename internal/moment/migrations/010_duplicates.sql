CREATE TABLE moment_duplicate_scans (
 id TEXT PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
 remote INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'scanning' CHECK(status IN ('scanning','ready','cancelled')),
 total INTEGER NOT NULL DEFAULT 0,
 done INTEGER NOT NULL DEFAULT 0,
 message TEXT NOT NULL DEFAULT '',
 lease_token TEXT NOT NULL DEFAULT '',
 lease_until INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX moment_duplicate_scan_owner ON moment_duplicate_scans(user_id);
CREATE TABLE moment_duplicate_items (
 scan_id TEXT NOT NULL REFERENCES moment_duplicate_scans(id) ON DELETE CASCADE,
 image_id INTEGER NOT NULL,
 post_id INTEGER NOT NULL,
 image_url TEXT NOT NULL,
 post_title TEXT NOT NULL,
 done INTEGER NOT NULL DEFAULT 0,
 fingerprint TEXT NOT NULL DEFAULT '{}',
 PRIMARY KEY(scan_id,image_id)
);
CREATE INDEX moment_duplicate_pending ON moment_duplicate_items(scan_id,done,image_id);
CREATE INDEX moment_duplicate_source ON moment_duplicate_items(scan_id,image_url,done);
CREATE TABLE moment_duplicate_groups (
 scan_id TEXT NOT NULL REFERENCES moment_duplicate_scans(id) ON DELETE CASCADE,
 id INTEGER NOT NULL,
 anchor_id INTEGER NOT NULL,
 kind TEXT NOT NULL,
 signature TEXT NOT NULL,
 PRIMARY KEY(scan_id,id)
);
CREATE TABLE moment_duplicate_members (
 scan_id TEXT NOT NULL,
 group_id INTEGER NOT NULL,
 image_id INTEGER NOT NULL,
 distance INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(scan_id,group_id,image_id),
 FOREIGN KEY(scan_id,group_id) REFERENCES moment_duplicate_groups(scan_id,id) ON DELETE CASCADE,
 FOREIGN KEY(scan_id,image_id) REFERENCES moment_duplicate_items(scan_id,image_id) ON DELETE CASCADE
);
CREATE TABLE moment_duplicate_ignored (
 user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
 signature TEXT NOT NULL,
 created_at TEXT NOT NULL,
 PRIMARY KEY(user_id,signature)
);
CREATE TABLE moment_photo_analysis_cache (
 source_key TEXT PRIMARY KEY,
 fingerprint TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE moment_photo_actions (
 id TEXT PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
 kind TEXT NOT NULL,
 digest TEXT NOT NULL,
 payload TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'applied' CHECK(status IN ('applied','undone')),
 created_at TEXT NOT NULL,
 undone_at TEXT
);
CREATE INDEX moment_photo_action_owner ON moment_photo_actions(user_id);
