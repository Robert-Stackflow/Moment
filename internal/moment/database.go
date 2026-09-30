package moment

import (
	"context"
	"database/sql"
	"embed"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	_ "modernc.org/sqlite"
)

//go:embed migrations/*.sql
var migrations embed.FS

type App struct {
	db           *sql.DB
	data, dist   string
	secure       bool
	limiter      *loginLimiter
	shareLimiter *loginLimiter
	stateMu      sync.RWMutex // Protect database replacement and static-file readers.
	writeMu      sync.RWMutex // Capture the database and local files at one write boundary.
	backupMu     sync.Mutex
	thumbnails   *thumbnailCache
}
type Object = map[string]any

var zone, _ = time.LoadLocation("Asia/Shanghai")

func now() string { return time.Now().In(zone).Format("2006-01-02 15:04:05") }

func Open(data, dist string, secure bool) (*App, error) {
	if err := os.MkdirAll(data, 0700); err != nil {
		return nil, err
	}
	if err := recoverRestore(data); err != nil {
		return nil, fmt.Errorf("recover interrupted restore: %w", err)
	}
	path, err := filepath.Abs(filepath.Join(data, "db.sqlite3"))
	if err != nil {
		return nil, err
	}
	db, err := sql.Open("sqlite", filepath.ToSlash(path)+"?_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)")
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	a := &App{db: db, data: data, dist: dist, secure: secure, limiter: newLoginLimiter(), shareLimiter: newLoginLimiter(), thumbnails: newThumbnailCache()}
	if err = a.initialize(); err != nil {
		db.Close()
		return nil, err
	}
	_ = os.Chmod(path, 0600)
	return a, nil
}
func (a *App) Close() error { return a.db.Close() }

func (a *App) initialize() error {
	var check string
	if err := a.db.QueryRow("PRAGMA quick_check").Scan(&check); err != nil || check != "ok" {
		return fmt.Errorf("database integrity check failed")
	}
	var managed, existing int
	_ = a.db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='moment_schema_migrations'").Scan(&managed)
	_ = a.db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='blog'").Scan(&existing)
	// SQLite creates a consistent snapshot, including committed WAL records. Never copy a live .db file alone.
	if existing > 0 && managed == 0 {
		backupDir := filepath.Join(a.data, "backups")
		if err := os.MkdirAll(backupDir, 0700); err != nil {
			return err
		}
		backup := filepath.Join(backupDir, "before-go-"+time.Now().Format("20060102-150405.000000000")+".sqlite3")
		if _, err := a.db.Exec("VACUUM INTO ?", filepath.ToSlash(backup)); err != nil {
			return fmt.Errorf("pre-migration backup failed: %w", err)
		}
		_ = os.Chmod(backup, 0600)
	}
	for _, pragma := range []string{"PRAGMA busy_timeout=5000", "PRAGMA foreign_keys=ON", "PRAGMA journal_mode=WAL"} {
		if _, err := a.db.Exec(pragma); err != nil {
			return err
		}
	}
	if _, err := a.db.Exec("CREATE TABLE IF NOT EXISTS moment_schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)"); err != nil {
		return err
	}
	entries, _ := migrations.ReadDir("migrations")
	for _, entry := range entries {
		var count int
		if err := a.db.QueryRow("SELECT COUNT(*) FROM moment_schema_migrations WHERE version=?", entry.Name()).Scan(&count); err != nil {
			return err
		}
		if count != 0 {
			continue
		}
		content, _ := migrations.ReadFile("migrations/" + entry.Name())
		tx, err := a.db.Begin()
		if err != nil {
			return err
		}
		if _, err = tx.Exec(string(content)); err == nil {
			_, err = tx.Exec("INSERT INTO moment_schema_migrations VALUES (?,?)", entry.Name(), now())
		}
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("migration %s: %w", entry.Name(), err)
		}
		if err = tx.Commit(); err != nil {
			return err
		}
	}
	// Legacy v1 databases retain their original image column and all backup tables.
	columns, err := query(a.db, "PRAGMA table_info(blog)")
	if err != nil {
		return err
	}
	for _, column := range columns {
		if column["name"] == "image" {
			_, err = a.db.Exec(`INSERT INTO blog_image (blog_id,image_url,created_at,updated_at,"order") SELECT b.id,b.image,b.created_at,b.updated_at,0 FROM blog b WHERE b.image IS NOT NULL AND b.image!='' AND NOT EXISTS (SELECT 1 FROM blog_image i WHERE i.blog_id=b.id)`)
			if err != nil {
				return err
			}
		}
	}
	_, err = a.db.Exec(`INSERT INTO setting (general,meta,content,storage) SELECT '{}','{}','{"page_size":20,"order_option":"meta_time_desc"}','{"enable_storage":true,"max_size":32,"provider":"local"}' WHERE NOT EXISTS (SELECT 1 FROM setting)`)
	return err
}

type querier interface {
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
}

func query(q querier, statement string, args ...any) ([]Object, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	rows, err := q.QueryContext(ctx, statement, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}
	result := make([]Object, 0)
	for rows.Next() {
		values := make([]any, len(columns))
		targets := make([]any, len(columns))
		for i := range values {
			targets[i] = &values[i]
		}
		if err := rows.Scan(targets...); err != nil {
			return nil, err
		}
		item := Object{}
		for i, key := range columns {
			value := values[i]
			if t, ok := value.(time.Time); ok {
				value = t.Format("2006-01-02 15:04:05")
			}
			if b, ok := value.([]byte); ok {
				value = string(b)
			}
			if key == "is_hidden" || key == "revoked" || key == "password_required" {
				value = integer(value) != 0
			}
			if key == "remark" || key == "general" || key == "meta" || key == "content" || key == "storage" {
				if text, ok := value.(string); ok {
					var decoded any
					if json.Unmarshal([]byte(text), &decoded) == nil {
						value = decoded
					}
				}
			}
			item[key] = value
		}
		result = append(result, item)
	}
	return result, rows.Err()
}
func integer(value any) int64 {
	switch v := value.(type) {
	case int64:
		return v
	case int:
		return int64(v)
	case float64:
		return int64(v)
	case json.Number:
		n, _ := v.Int64()
		return n
	}
	return 0
}
func text(value any) string {
	if v, ok := value.(string); ok {
		return v
	}
	return ""
}
func object(value any) Object {
	if v, ok := value.(map[string]any); ok {
		return v
	}
	return Object{}
}
func placeholders(size int) string { return strings.TrimSuffix(strings.Repeat("?,", size), ",") }
