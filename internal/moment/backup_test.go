package moment

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func backupUpload(t *testing.T, h http.Handler, cookie *http.Cookie, data []byte) (*httptest.ResponseRecorder, Object) {
	t.Helper()
	var body bytes.Buffer
	form := multipart.NewWriter(&body)
	file, err := form.CreateFormFile("file", "backup.zip")
	if err != nil {
		t.Fatal(err)
	}
	file.Write(data)
	form.Close()
	r := httptest.NewRequest("POST", "/api/admin/backups/import", &body)
	r.Header.Set("Content-Type", form.FormDataContentType())
	if cookie != nil {
		r.AddCookie(cookie)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	var result Object
	if err = json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	return w, result
}
func putBackupFile(t *testing.T, data, name, content string) {
	t.Helper()
	path := filepath.Join(data, filepath.FromSlash(name))
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0600); err != nil {
		t.Fatal(err)
	}
}
func TestBackupRoundTripAndRestoreSafety(t *testing.T) {
	a, h, cookie := testApp(t)
	id, img := seedPost(t, a, "Preserved", false, false)
	deleted, _ := seedPost(t, a, "In trash", true, false)
	queries := []string{
		"CREATE TABLE legacy_backup_v1(id INTEGER, value TEXT)", "INSERT INTO legacy_backup_v1 VALUES(7,'old data')",
		"INSERT INTO category(name,alias) VALUES('Category','category')",
		fmt.Sprintf("INSERT INTO blog_category VALUES(%d,1)", id),
		fmt.Sprintf("UPDATE blog_image SET image_url='/uploads/2026/kept.jpg' WHERE id=%d", img),
		fmt.Sprintf("INSERT INTO moment_image_focus VALUES(%d,24,76)", img),
		"UPDATE user SET avatar='/avatars/kept.png'",
		`UPDATE setting SET storage='{"provider":"s3","secret_key":"round-trip-secret"}'`,
	}
	for _, q := range queries {
		if _, err := a.db.Exec(q); err != nil {
			t.Fatal(err)
		}
	}
	putBackupFile(t, a.data, "uploads/2026/kept.jpg", "photo bytes")
	putBackupFile(t, a.data, "avatars/kept.png", "avatar bytes")
	draft := Draft{PostID: &id, MutationID: draftMutation, Payload: PostInput{Title: "Unpublished", Images: []ImageInput{{ID: img, URL: "/uploads/2026/kept.jpg"}}}}
	w, _ := call(t, h, "PUT", "/api/admin/drafts/"+draftKey, draft, cookie)
	status(t, w, 200)
	w, _ = call(t, h, "DELETE", fmt.Sprintf("/api/admin/posts/%d", deleted), nil, cookie)
	status(t, w, 200)
	w, before := call(t, h, "GET", fmt.Sprintf("/api/admin/posts/%d", id), nil, cookie)
	status(t, w, 200)
	w, created := call(t, h, "POST", "/api/admin/backups", Object{}, cookie)
	status(t, w, 200)
	info := object(created["data"])
	key := text(info["id"])
	if integer(info["posts"]) != 2 || integer(info["images"]) != 2 || integer(info["drafts"]) != 1 || integer(info["trash"]) != 1 || integer(info["local_files"]) != 2 {
		t.Fatal("incorrect manifest counts", info)
	}
	archive, err := os.ReadFile(a.backupPath(key))
	if err != nil {
		t.Fatal(err)
	}
	r := httptest.NewRequest("GET", "/api/admin/backups/"+key+"/download", nil)
	r.AddCookie(cookie)
	download := httptest.NewRecorder()
	h.ServeHTTP(download, r)
	if download.Code != 200 || !bytes.Equal(archive, download.Body.Bytes()) || !strings.Contains(download.Header().Get("Content-Disposition"), "attachment") {
		t.Fatal("download differs from archive")
	}
	extracted := t.TempDir()
	_, _, err = unpackBackup(context.Background(), a.backupPath(key), extracted)
	if err != nil {
		t.Fatal(err)
	}
	copy, err := Open(extracted, t.TempDir(), false)
	if err != nil {
		t.Fatal(err)
	}
	var sessions int
	copy.db.QueryRow("SELECT COUNT(*) FROM moment_sessions").Scan(&sessions)
	copy.Close()
	if sessions != 0 {
		t.Fatal("sessions included in export")
	}
	w, imported := backupUpload(t, h, cookie, archive)
	status(t, w, 200)
	importID := text(object(imported["data"])["id"])
	if importID == key {
		t.Fatal("import overwrote backup")
	}
	// Deliberately change both database and media after the backup.
	if _, err = a.db.Exec("UPDATE blog SET title='Changed' WHERE id=?", id); err != nil {
		t.Fatal(err)
	}
	seedPost(t, a, "After backup", false, false)
	putBackupFile(t, a.data, "uploads/after.jpg", "new file")
	putBackupFile(t, a.data, "avatars/kept.png", "changed avatar")
	restorePath := "/api/admin/backups/" + importID + "/restore"
	w, _ = call(t, h, "POST", restorePath, Object{"confirm": "恢复备份", "password": "wrong"}, cookie)
	status(t, w, 400)
	w, _ = call(t, h, "POST", restorePath, Object{"password": testPassword}, cookie)
	status(t, w, 400)
	w, result := call(t, h, "POST", restorePath, Object{"confirm": "恢复备份", "password": testPassword}, cookie)
	status(t, w, 200)
	safetyID := text(object(result["data"])["safety_backup_id"])
	safety, err := a.readBackupInfo(safetyID)
	if err != nil || safety.Source != "before-restore" || safety.Posts != 3 {
		t.Fatal("safety backup missing", err)
	}
	w, _ = call(t, h, "GET", "/api/admin/me", nil, cookie)
	status(t, w, 401)
	w, _ = call(t, h, "POST", "/api/admin/login", Object{"username": "tester", "password": testPassword}, nil)
	status(t, w, 200)
	newCookie := w.Result().Cookies()[0]
	w, after := call(t, h, "GET", fmt.Sprintf("/api/admin/posts/%d", id), nil, newCookie)
	status(t, w, 200)
	if !reflect.DeepEqual(before["data"], after["data"]) {
		t.Fatal("post content changed across restore")
	}
	w, recovered := call(t, h, "GET", "/api/admin/drafts/"+draftKey, nil, newCookie)
	status(t, w, 200)
	if text(object(object(recovered["data"])["payload"])["title"]) != "Unpublished" {
		t.Fatal("draft lost")
	}
	w, trash := call(t, h, "GET", "/api/admin/trash", nil, newCookie)
	status(t, w, 200)
	if integer(trash["total"]) != 1 {
		t.Fatal("trash lost")
	}
	var legacy string
	if err = a.db.QueryRow("SELECT value FROM legacy_backup_v1 WHERE id=7").Scan(&legacy); err != nil || legacy != "old data" {
		t.Fatal("legacy table lost")
	}
	settings, err := a.readSettings()
	if err != nil || text(object(settings["storage"])["secret_key"]) != "round-trip-secret" {
		t.Fatal("storage credential lost")
	}
	avatar, err := os.ReadFile(filepath.Join(a.data, "avatars", "kept.png"))
	if err != nil || string(avatar) != "avatar bytes" {
		t.Fatal("avatar not restored")
	}
	if _, err = os.Stat(filepath.Join(a.data, "uploads", "after.jpg")); !os.IsNotExist(err) {
		t.Fatal("post-backup file not replaced")
	}
	if _, err = os.Stat(filepath.Join(a.data, ".restore-journal.json")); !os.IsNotExist(err) {
		t.Fatal("restore journal remains")
	}
	w, list := call(t, h, "GET", "/api/admin/backups", nil, newCookie)
	status(t, w, 200)
	if len(list["data"].([]any)) != 3 {
		t.Fatal("backups removed by restore")
	}
	w, _ = call(t, h, "DELETE", "/api/admin/backups/"+importID, nil, newCookie)
	status(t, w, 200)
	w, _ = call(t, h, "GET", "/api/admin/posts", nil, newCookie)
	status(t, w, 200)
}

func TestBackupAuthorizationAndCorruption(t *testing.T) {
	a, h, cookie := testApp(t)
	seedPost(t, a, "Keep", false, false)
	w, created := call(t, h, "POST", "/api/admin/backups", Object{}, cookie)
	status(t, w, 200)
	key := text(object(created["data"])["id"])
	for _, route := range []struct{ method, path string }{{"GET", "/api/admin/backups"}, {"GET", "/api/admin/backups/" + key + "/download"}, {"POST", "/api/admin/backups"}, {"POST", "/api/admin/backups/" + key + "/restore"}, {"DELETE", "/api/admin/backups/" + key}} {
		w, _ = call(t, h, route.method, route.path, Object{}, nil)
		status(t, w, 401)
	}
	w, _ = backupUpload(t, h, nil, []byte("bad"))
	status(t, w, 401)
	w, _ = backupUpload(t, h, cookie, []byte("bad"))
	status(t, w, 400)
	w, _ = call(t, h, "GET", "/api/admin/backups/invalid/download", nil, cookie)
	status(t, w, 404)
	r := httptest.NewRequest("POST", "/api/admin/backups", strings.NewReader("{}"))
	r.Header.Set("Origin", "https://attacker.invalid")
	r.AddCookie(cookie)
	w = httptest.NewRecorder()
	h.ServeHTTP(w, r)
	status(t, w, 403)
	if err := os.WriteFile(a.backupPath(key), []byte("corrupt archive"), 0600); err != nil {
		t.Fatal(err)
	}
	w, _ = call(t, h, "POST", "/api/admin/backups/"+key+"/restore", Object{"confirm": "恢复备份", "password": testPassword}, cookie)
	status(t, w, 400)
	w, list := call(t, h, "GET", "/api/admin/posts", nil, cookie)
	status(t, w, 200)
	if integer(list["total"]) != 1 {
		t.Fatal("bad restore touched live data")
	}
}

func TestBackupArchiveValidation(t *testing.T) {
	a, _, _ := testApp(t)
	seedPost(t, a, "Fixture", false, false)
	info, err := a.exportBackup(context.Background(), "manual")
	if err != nil {
		t.Fatal(err)
	}
	base, err := zip.OpenReader(a.backupPath(info.ID))
	if err != nil {
		t.Fatal(err)
	}
	defer base.Close()
	files := map[string][]byte{}
	for _, file := range base.File {
		r, _ := file.Open()
		files[file.Name], err = io.ReadAll(r)
		r.Close()
		if err != nil {
			t.Fatal(err)
		}
	}
	for _, test := range []string{"traversal", "windows", "duplicate", "symlink", "checksum", "missing", "unknown", "manifest-version", "foreign-key", "future-schema", "missing-column"} {
		t.Run(test, func(t *testing.T) {
			var data bytes.Buffer
			writer := zip.NewWriter(&data)
			for name, original := range files {
				content := append([]byte(nil), original...)
				if test == "missing" && name == "db.sqlite3" {
					continue
				}
				if test == "checksum" && name == "db.sqlite3" {
					content[100] ^= 1
				}
				if test == "manifest-version" && name == "manifest.json" {
					content = bytes.Replace(content, []byte(`"version":1`), []byte(`"version":99`), 1)
				}
				if test == "foreign-key" || test == "future-schema" || test == "missing-column" {
					// A valid ZIP and updated checksums must still fail database validation.
					dir := t.TempDir()
					os.WriteFile(filepath.Join(dir, "db.sqlite3"), files["db.sqlite3"], 0600)
					copy, e := Open(dir, t.TempDir(), false)
					if e != nil {
						t.Fatal(e)
					}
					statement := map[string]string{"foreign-key": "PRAGMA foreign_keys=OFF; INSERT INTO blog_category VALUES(999999,999999)", "future-schema": "INSERT INTO moment_schema_migrations VALUES('999_future.sql','now')", "missing-column": "ALTER TABLE blog DROP COLUMN title"}[test]
					if _, e = copy.db.Exec(statement); e != nil {
						t.Fatal(e)
					}
					copy.Close()
					dbBytes, _ := os.ReadFile(filepath.Join(dir, "db.sqlite3"))
					if name == "db.sqlite3" {
						content = dbBytes
					} else {
						var manifest backupManifest
						json.Unmarshal(content, &manifest)
						for i := range manifest.Files {
							if manifest.Files[i].Name == "db.sqlite3" {
								sum := sha256.Sum256(dbBytes)
								manifest.Files[i].Size = int64(len(dbBytes))
								manifest.Files[i].SHA256 = hex.EncodeToString(sum[:])
							}
						}
						content, _ = json.Marshal(manifest)
					}
				}
				entry, _ := writer.Create(name)
				entry.Write(content)
			}
			extra := map[string]string{"traversal": "uploads/../../outside", "windows": "uploads/C:/outside", "duplicate": "DB.SQLITE3", "symlink": "uploads/link", "unknown": "settings.json"}[test]
			if extra != "" {
				header := &zip.FileHeader{Name: extra}
				if test == "symlink" {
					header.SetMode(os.ModeSymlink | 0600)
				}
				entry, _ := writer.CreateHeader(header)
				entry.Write([]byte("oops"))
			}
			writer.Close()
			path := filepath.Join(t.TempDir(), "bad.zip")
			os.WriteFile(path, data.Bytes(), 0600)
			if _, _, err := unpackBackup(context.Background(), path, t.TempDir()); err == nil {
				t.Fatal("unsafe archive accepted")
			}
		})
	}
}

func TestRestoreRollbackAndStartupRecovery(t *testing.T) {
	for _, scenario := range []string{"failed-open", "interrupted", "committed"} {
		t.Run(scenario, func(t *testing.T) {
			a, _, _ := testApp(t)
			id, _ := seedPost(t, a, "Original", false, false)
			putBackupFile(t, a.data, "uploads/original.jpg", "original")
			stage, err := os.MkdirTemp(a.data, ".restore-stage-")
			if err != nil {
				t.Fatal(err)
			}
			putBackupFile(t, stage, "db.sqlite3", "invalid database")
			putBackupFile(t, stage, "uploads/new.jpg", "candidate")
			if scenario == "failed-open" {
				if err = a.installRestore(stage); err == nil {
					t.Fatal("bad database accepted")
				}
			} else {
				a.Close()
				old, err := os.MkdirTemp(a.data, ".restore-old-")
				if err != nil {
					t.Fatal(err)
				}
				j := restoreJournal{Old: filepath.Base(old), Stage: filepath.Base(stage), Existing: map[string]bool{"db.sqlite3": true, "uploads": true, "avatars": false}, Committed: scenario == "committed"}
				if scenario == "interrupted" {
					os.Rename(filepath.Join(a.data, "db.sqlite3"), filepath.Join(old, "db.sqlite3"))
					os.Rename(filepath.Join(stage, "db.sqlite3"), filepath.Join(a.data, "db.sqlite3"))
				}
				// In the committed case the valid current tree must survive cleanup.
				if err = writeRestoreJournal(a.data, j); err != nil {
					t.Fatal(err)
				}
				reopened, e := Open(a.data, a.dist, false)
				if e != nil {
					t.Fatal(e)
				}
				a.db = reopened.db
			}
			var title string
			if err = a.db.QueryRow("SELECT title FROM blog WHERE id=?", id).Scan(&title); err != nil || title != "Original" {
				t.Fatal("original database not recovered", err)
			}
			if b, e := os.ReadFile(filepath.Join(a.data, "uploads", "original.jpg")); e != nil || string(b) != "original" {
				t.Fatal("original media not recovered")
			}
			if _, e := os.Stat(filepath.Join(a.data, ".restore-journal.json")); !os.IsNotExist(e) {
				t.Fatal("journal not cleaned")
			}
		})
	}
}

func TestBackupProductionSnapshotRoundTrip(t *testing.T) {
	source := os.Getenv("MOMENT_TEST_DATABASE")
	if source == "" {
		t.Skip("set MOMENT_TEST_DATABASE to a consistent SQLite backup")
	}
	bytes, err := os.ReadFile(source)
	if err != nil {
		t.Fatal(err)
	}
	data := t.TempDir()
	if err = os.WriteFile(filepath.Join(data, "db.sqlite3"), bytes, 0600); err != nil {
		t.Fatal(err)
	}
	a, err := Open(data, t.TempDir(), false)
	if err != nil {
		t.Fatal(err)
	}
	defer a.Close()
	tables, err := query(a.db, "SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name!='moment_sessions' ORDER BY name")
	if err != nil {
		t.Fatal(err)
	}
	digests := map[string][32]byte{}
	for _, table := range tables {
		name := text(table["name"])
		rows, e := query(a.db, `SELECT * FROM "`+strings.ReplaceAll(name, `"`, `""`)+`" ORDER BY rowid`)
		if e != nil {
			t.Fatal(e)
		}
		bytes, _ := json.Marshal(rows)
		digests[name] = sha256.Sum256(bytes)
	}
	info, err := a.exportBackup(context.Background(), "manual")
	if err != nil {
		t.Fatal(err)
	}
	stage := t.TempDir()
	if _, _, err = unpackBackup(context.Background(), a.backupPath(info.ID), stage); err != nil {
		t.Fatal(err)
	}
	restored, err := Open(stage, t.TempDir(), false)
	if err != nil {
		t.Fatal(err)
	}
	defer restored.Close()
	for _, table := range tables {
		name := text(table["name"])
		var schema string
		if err = restored.db.QueryRow("SELECT sql FROM sqlite_master WHERE name=?", name).Scan(&schema); err != nil || schema != table["sql"] {
			t.Fatalf("schema changed in backup: %s", name)
		}
		rows, e := query(restored.db, `SELECT * FROM "`+strings.ReplaceAll(name, `"`, `""`)+`" ORDER BY rowid`)
		if e != nil {
			t.Fatal(e)
		}
		bytes, _ := json.Marshal(rows)
		if sha256.Sum256(bytes) != digests[name] {
			t.Fatalf("records changed in backup: %s", name)
		}
	}
}
