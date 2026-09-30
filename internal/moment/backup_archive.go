package moment

import (
	"archive/zip"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type contextReader struct {
	ctx    context.Context
	reader io.Reader
}

func (r contextReader) Read(p []byte) (int, error) {
	if err := r.ctx.Err(); err != nil {
		return 0, err
	}
	return r.reader.Read(p)
}

func (a *App) exportBackup(ctx context.Context, source string) (info backupInfo, err error) {
	if err = os.MkdirAll(a.backupDir(), 0700); err != nil {
		return
	}
	id, err := randomBackupKey()
	if err != nil {
		return
	}
	stage, err := os.MkdirTemp(a.backupDir(), ".build-")
	if err != nil {
		return
	}
	defer os.RemoveAll(stage)
	dbPath := filepath.Join(stage, "db.sqlite3")
	if _, err = a.db.ExecContext(ctx, "VACUUM INTO ?", filepath.ToSlash(dbPath)); err != nil {
		return
	}
	// Never export reusable login sessions. Credentials and settings remain in the
	// private database so a disaster-recovery copy can restore the original account.
	snapshot, err := sql.Open("sqlite", filepath.ToSlash(dbPath))
	if err != nil {
		return
	}
	if _, err = snapshot.ExecContext(ctx, "DELETE FROM moment_sessions; DELETE FROM moment_share_sessions"); err == nil {
		info, err = backupCounts(ctx, snapshot)
	}
	closeErr := snapshot.Close()
	if err == nil {
		err = closeErr
	}
	if err != nil {
		return
	}
	manifest := backupManifest{Format: "moment-backup", Version: 1, CreatedAt: time.Now().UTC().Format(time.RFC3339Nano), Files: []backupFile{}}
	file, err := os.OpenFile(filepath.Join(stage, "archive.zip"), os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return
	}
	writer := zip.NewWriter(file)
	var total int64
	add := func(name, path string) error {
		if !validBackupName(name) {
			return errors.New("unsupported local file path")
		}
		stat, e := os.Lstat(path)
		if e != nil {
			return e
		}
		if !stat.Mode().IsRegular() {
			return errors.New("backup refuses symbolic links or special files")
		}
		total += stat.Size()
		if total > backupExpandedLimit || len(manifest.Files) >= backupFileLimit || stat.Size() > 1<<30 {
			return errors.New("backup exceeds archive limits")
		}
		input, e := os.Open(path)
		if e != nil {
			return e
		}
		defer input.Close()
		header := &zip.FileHeader{Name: name, Method: zip.Store}
		header.SetMode(0600)
		output, e := writer.CreateHeader(header)
		if e != nil {
			return e
		}
		hash := sha256.New()
		size, e := io.Copy(io.MultiWriter(output, hash), contextReader{ctx, input})
		if e != nil {
			return e
		}
		if size != stat.Size() {
			return errors.New("file changed during backup")
		}
		manifest.Files = append(manifest.Files, backupFile{Name: name, Size: size, SHA256: hex.EncodeToString(hash.Sum(nil))})
		return nil
	}
	err = add("db.sqlite3", dbPath)
	for _, name := range []string{"uploads", "avatars"} {
		if err != nil {
			break
		}
		root := filepath.Join(a.data, name)
		if _, e := os.Lstat(root); os.IsNotExist(e) {
			continue
		}
		err = filepath.WalkDir(root, func(path string, entry fs.DirEntry, walkErr error) error {
			if walkErr != nil {
				return walkErr
			}
			if entry.IsDir() {
				return nil
			}
			rel, e := filepath.Rel(a.data, path)
			if e != nil {
				return e
			}
			return add(filepath.ToSlash(rel), path)
		})
	}
	if err == nil {
		var output io.Writer
		output, err = writer.Create("manifest.json")
		if err == nil {
			err = json.NewEncoder(output).Encode(manifest)
		}
	}
	zipErr := writer.Close()
	syncErr := file.Sync()
	fileErr := file.Close()
	if err == nil {
		err = errors.Join(zipErr, syncErr, fileErr)
	}
	if err != nil {
		return
	}
	stat, e := os.Stat(filepath.Join(stage, "archive.zip"))
	if e != nil {
		err = e
		return
	}
	if stat.Size() > backupArchiveLimit {
		err = errors.New("backup exceeds 2 GB archive limit")
		return
	}
	err = os.Rename(filepath.Join(stage, "archive.zip"), a.backupPath(id))
	if err != nil {
		return
	}
	info, err = a.saveBackupInfo(id, source, manifest, info)
	if err != nil {
		_ = os.Remove(a.backupPath(id))
	}
	return
}

func backupCounts(ctx context.Context, db *sql.DB) (backupInfo, error) {
	var info backupInfo
	err := db.QueryRowContext(ctx, `SELECT (SELECT COUNT(*) FROM blog),(SELECT COUNT(*) FROM blog_image),(SELECT COUNT(*) FROM moment_drafts WHERE published_at IS NULL),(SELECT COUNT(*) FROM moment_trash_posts)`).Scan(&info.Posts, &info.Images, &info.Drafts, &info.Trash)
	return info, err
}
func validBackupName(name string) bool {
	if name == "db.sqlite3" {
		return true
	}
	if !strings.HasPrefix(name, "uploads/") && !strings.HasPrefix(name, "avatars/") {
		return false
	}
	if len(name) > 1024 || strings.ContainsAny(name, "\\:\x00") {
		return false
	}
	for _, part := range strings.Split(name, "/") {
		if part == "" || part == "." || part == ".." || strings.TrimRight(part, " .") != part || strings.ContainsAny(part, "<>\"|?*") {
			return false
		}
		base := strings.ToUpper(strings.SplitN(part, ".", 2)[0])
		if base == "CON" || base == "PRN" || base == "AUX" || base == "NUL" || (len(base) == 4 && (strings.HasPrefix(base, "COM") || strings.HasPrefix(base, "LPT")) && base[3] >= '0' && base[3] <= '9') {
			return false
		}
	}
	return true
}

// Verify every byte before a candidate can replace live data. The destination is
// always a fresh private directory, never the live uploads tree.
func unpackBackup(ctx context.Context, path, destination string) (manifest backupManifest, info backupInfo, err error) {
	archive, err := zip.OpenReader(path)
	if err != nil {
		return
	}
	defer archive.Close()
	if len(archive.File) < 2 || len(archive.File) > backupFileLimit+1 {
		err = errors.New("invalid file count")
		return
	}
	entries := map[string]*zip.File{}
	folded := map[string]bool{}
	var expanded uint64
	for _, file := range archive.File {
		if file.Name != "manifest.json" && !validBackupName(file.Name) {
			err = errors.New("unsafe archive path")
			return
		}
		key := strings.ToLower(file.Name)
		if folded[key] || !file.Mode().IsRegular() {
			err = errors.New("duplicate or special archive file")
			return
		}
		folded[key] = true
		entries[file.Name] = file
		if file.UncompressedSize64 > 1<<30 {
			err = errors.New("archive file too large")
			return
		}
		expanded += file.UncompressedSize64
		if expanded > uint64(backupExpandedLimit) {
			err = errors.New("archive expansion limit exceeded")
			return
		}
	}
	meta := entries["manifest.json"]
	if meta == nil || meta.UncompressedSize64 > 16<<20 {
		err = errors.New("missing or oversized manifest")
		return
	}
	stream, e := meta.Open()
	if e != nil {
		err = e
		return
	}
	data, e := io.ReadAll(io.LimitReader(stream, 16<<20+1))
	stream.Close()
	if e != nil {
		err = e
		return
	}
	err = json.Unmarshal(data, &manifest)
	if err != nil || manifest.Format != "moment-backup" || manifest.Version != 1 || len(manifest.Files) != len(entries)-1 {
		err = errors.New("unsupported backup manifest")
		return
	}
	if _, e = time.Parse(time.RFC3339Nano, manifest.CreatedAt); e != nil {
		err = errors.New("invalid backup timestamp")
		return
	}
	listed := map[string]bool{}
	for _, item := range manifest.Files {
		entry := entries[item.Name]
		if !validBackupName(item.Name) || listed[item.Name] || entry == nil || item.Size < 0 || uint64(item.Size) != entry.UncompressedSize64 || len(item.SHA256) != 64 {
			err = errors.New("manifest mismatch")
			return
		}
		listed[item.Name] = true
		if err = extractBackupFile(ctx, entry, filepath.Join(destination, filepath.FromSlash(item.Name)), item); err != nil {
			return
		}
	}
	if !listed["db.sqlite3"] {
		err = errors.New("missing database")
		return
	}
	info, err = validateBackupDB(ctx, filepath.Join(destination, "db.sqlite3"))
	return
}
func extractBackupFile(ctx context.Context, entry *zip.File, path string, item backupFile) error {
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return err
	}
	output, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}
	defer output.Close()
	input, err := entry.Open()
	if err != nil {
		return err
	}
	defer input.Close()
	hash := sha256.New()
	size, err := io.Copy(io.MultiWriter(output, hash), contextReader{ctx, io.LimitReader(input, item.Size+1)})
	if err != nil {
		return err
	}
	if size != item.Size || hex.EncodeToString(hash.Sum(nil)) != item.SHA256 {
		return errors.New("backup checksum mismatch")
	}
	return output.Sync()
}
func validateBackupDB(ctx context.Context, path string) (info backupInfo, err error) {
	db, err := sql.Open("sqlite", filepath.ToSlash(path)+"?mode=ro&_pragma=query_only(1)&_pragma=trusted_schema(0)")
	if err != nil {
		return
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	var result string
	if err = db.QueryRowContext(ctx, "PRAGMA integrity_check").Scan(&result); err != nil || result != "ok" {
		return info, errors.New("database integrity check failed")
	}
	var unsupported int
	if err = db.QueryRowContext(ctx, `SELECT COUNT(*) FROM sqlite_master WHERE type IN ('trigger','view') OR lower(sql) LIKE '%create virtual table%'`).Scan(&unsupported); err != nil || unsupported > 0 {
		return info, errors.New("unsupported database objects")
	}
	rows, e := db.QueryContext(ctx, "PRAGMA foreign_key_check")
	if e != nil {
		return info, e
	}
	bad := rows.Next()
	e = rows.Err()
	rows.Close()
	if e != nil || bad {
		return info, errors.New("invalid database relations")
	}
	versions, e := query(db, "SELECT version FROM moment_schema_migrations")
	if e != nil {
		return info, e
	}
	known, _ := migrations.ReadDir("migrations")
	if len(versions) == 0 || len(versions) > len(known) {
		return info, errors.New("backup schema version differs from this server")
	}
	// Older exports can be upgraded by Open after validation. Require a complete
	// prefix, not an arbitrary subset of migrations or a future schema.
	present := map[string]bool{}
	for _, v := range versions {
		present[text(v["version"])] = true
	}
	for _, k := range known[:len(versions)] {
		if !present[k.Name()] {
			return info, errors.New("unsupported backup version")
		}
	}
	// Validate all columns used by the app against an empty database from this build.
	template, e := sql.Open("sqlite", ":memory:")
	if e != nil {
		return info, e
	}
	defer template.Close()
	template.SetMaxOpenConns(1)
	for _, k := range known[:len(versions)] {
		content, _ := migrations.ReadFile("migrations/" + k.Name())
		if _, e = template.ExecContext(ctx, string(content)); e != nil {
			return info, e
		}
	}
	tables, e := query(template, "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
	if e != nil {
		return info, e
	}
	for _, table := range tables {
		name := text(table["name"])
		expected, e := query(template, `PRAGMA table_info("`+name+`")`)
		if e != nil {
			return info, e
		}
		actual, e := query(db, `PRAGMA table_info("`+name+`")`)
		if e != nil {
			return info, e
		}
		columns := map[string]bool{}
		for _, col := range actual {
			columns[text(col["name"])] = true
		}
		for _, col := range expected {
			if !columns[text(col["name"])] {
				return info, errors.New("incomplete backup schema")
			}
		}
	}
	var accounts int
	if err = db.QueryRowContext(ctx, "SELECT COUNT(*) FROM user WHERE password IS NOT NULL AND password!=''").Scan(&accounts); err != nil || accounts == 0 {
		return info, errors.New("backup has no login account")
	}
	return backupCounts(ctx, db)
}
