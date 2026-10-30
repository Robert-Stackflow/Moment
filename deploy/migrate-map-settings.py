"""One-time import of legacy map credentials; never prints credential values."""

import argparse
import json
import sqlite3
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--data", type=Path, required=True)
parser.add_argument("--legacy-config", type=Path, action="append", default=[])
args = parser.parse_args()
database = args.data / "db.sqlite3"
if not database.is_file():
    raise SystemExit("Moment database is missing")
legacy = {}
for source in args.legacy_config:
    if source.is_file():
        for line in source.read_text(encoding="utf-8-sig").splitlines():
            key, sep, value = line.strip().partition("=")
            if sep and key in {"MOMENT_AMAP_KEY", "MOMENT_AMAP_SECURITY_CODE"}:
                legacy[key] = value.strip().strip("\"'")
with sqlite3.connect(database, timeout=15) as connection:
    row = connection.execute("SELECT id,maps FROM setting ORDER BY id LIMIT 1").fetchone()
    if row is None:
        raise SystemExit("Moment settings are missing")
    settings = json.loads(row[1])
    migrated = False
    if not settings.get("source") and not settings.get("key") and not settings.get("security_code"):
        key = legacy.get("MOMENT_AMAP_KEY", "")
        secret = legacy.get("MOMENT_AMAP_SECURITY_CODE", "")
        if key and secret:
            settings = {"source": "custom", "key": key, "security_code": secret}
            connection.execute("UPDATE setting SET maps=? WHERE id=?", (json.dumps(settings), row[0]))
            migrated = True
        elif key or secret:
            raise SystemExit("Legacy map credentials are incomplete")
    configured = bool(settings.get("key") and settings.get("security_code"))
print(json.dumps({"migrated": migrated, "configured": configured}))
