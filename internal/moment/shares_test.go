package moment

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func makeShare(t *testing.T, h http.Handler, cookie *http.Cookie, in shareInput) (int64, string) {
	t.Helper()
	w, result := call(t, h, "POST", "/api/admin/shares", in, cookie)
	status(t, w, 200)
	id := integer(object(result["data"])["id"])
	w, result = call(t, h, "GET", fmt.Sprintf("/api/admin/shares/%d", id), nil, cookie)
	status(t, w, 200)
	if strings.Contains(w.Body.String(), "password_hash") {
		t.Fatal("password hash leaked")
	}
	return id, "/api/shares/" + text(object(result["data"])["token"])
}
func shareMedia(h http.Handler, method, path string, cookie *http.Cookie) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, nil)
	if cookie != nil {
		r.AddCookie(cookie)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}
func unlock(t *testing.T, h http.Handler, path, password string) *http.Cookie {
	t.Helper()
	w, _ := call(t, h, "POST", path+"/unlock", Object{"password": password}, nil)
	status(t, w, 200)
	cookies := w.Result().Cookies()
	if len(cookies) != 1 || !cookies[0].HttpOnly || cookies[0].Path != path || cookies[0].SameSite != http.SameSiteLaxMode {
		t.Fatal("unsafe sharing grant")
	}
	return cookies[0]
}

func TestShareAccessMembershipAndMedia(t *testing.T) {
	a, h, admin := testApp(t)
	private, photo := seedPost(t, a, "Private album post", true, false)
	other, otherPhoto := seedPost(t, a, "Unselected hidden post", true, false)
	hidden, hiddenPhoto := seedPost(t, a, "Hidden picture", false, true)
	if err := os.MkdirAll(filepath.Join(a.data, "uploads"), 0700); err != nil {
		t.Fatal(err)
	}
	filename := "私人 photo.jpg"
	original := thumbnailFixture(t, a, filename, 900, 600, false)
	if _, err := a.db.Exec("UPDATE blog_image SET image_url=? WHERE id=?", "/uploads/"+escapeKey(filename), photo); err != nil {
		t.Fatal(err)
	}
	password := "AlbumPass42"
	expires := time.Now().Add(time.Hour).Unix()
	in := shareInput{Title: "Trip", Description: "For friends", PostIDs: []int64{private}, Password: &password, ExpiresAt: &expires}
	w, _ := call(t, h, "POST", "/api/admin/shares", in, nil)
	status(t, w, 401)
	id, path := makeShare(t, h, admin, in)
	media := fmt.Sprintf("%s/photos/%d/", path, photo)
	w, result := call(t, h, "GET", path, nil, admin)
	status(t, w, 200)
	if len(object(result["data"])) != 1 || object(result["data"])["locked"] != true {
		t.Fatal("locked metadata leaked or admin cookie bypassed share")
	}
	for _, suffix := range []string{"original", "320"} {
		status(t, shareMedia(h, "GET", media+suffix, nil), 401)
	}
	w, _ = call(t, h, "GET", fmt.Sprintf("/api/v1/visitor/blog/%d", private), nil, nil)
	status(t, w, 404)
	w, _ = call(t, h, "POST", path+"/unlock", Object{"password": "wrong"}, nil)
	status(t, w, 401)
	grant := unlock(t, h, path, password)
	w, result = call(t, h, "GET", path, nil, grant)
	status(t, w, 200)
	if strings.Contains(w.Body.String(), "/uploads/") || strings.Contains(w.Body.String(), "password_hash") || strings.Contains(w.Body.String(), "Unselected") || strings.Contains(w.Body.String(), "https://") {
		t.Fatal("private/original data leaked")
	}
	posts := object(result["data"])["posts"].([]any)
	if len(posts) != 1 || text(object(posts[0])["title"]) != "Private album post" {
		t.Fatal("wrong share contents")
	}
	w = shareMedia(h, "GET", media+"original", grant)
	status(t, w, 200)
	if string(original) != w.Body.String() || w.Header().Get("Cache-Control") != "no-store" || w.Header().Get("Referrer-Policy") != "no-referrer" {
		t.Fatal("unsafe original delivery")
	}
	w = shareMedia(h, "HEAD", media+"original", grant)
	status(t, w, 200)
	if w.Body.Len() != 0 {
		t.Fatal("HEAD returned body")
	}
	w = shareMedia(h, "GET", media+"320", grant)
	status(t, w, 200)
	if w.Header().Get("Cache-Control") != "no-store" || w.Header().Get("Location") != "" || w.Body.Len() >= len(original) {
		t.Fatal("protected thumbnail bypassed policy")
	}
	w, _ = call(t, h, "PATCH", "/api/admin/settings/content", Object{"local_thumbnails": false}, admin)
	status(t, w, 200)
	w = shareMedia(h, "GET", media+"320", grant)
	status(t, w, 200)
	if w.Header().Get("Location") != "" || w.Header().Get("Cache-Control") != "no-store" || w.Body.String() != string(original) {
		t.Fatal("private thumbnail fallback leaked original URL")
	}
	for _, p := range []int64{otherPhoto, hiddenPhoto, 99999} {
		status(t, shareMedia(h, "GET", fmt.Sprintf("%s/photos/%d/original", path, p), grant), 404)
	}
	// Even a selected post never exposes individually hidden photos.
	_, err := a.db.Exec("INSERT INTO blog_image(blog_id,image_url,is_hidden) VALUES (?,'https://example.com/secret.jpg',1)", private)
	if err != nil {
		t.Fatal(err)
	}
	w, result = call(t, h, "GET", path, nil, grant)
	status(t, w, 200)
	if len(object(object(result["data"])["posts"].([]any)[0])["images"].([]any)) != 1 {
		t.Fatal("hidden photo disclosed")
	}
	// Grants cannot cross album boundaries, even if the passwords match.
	_, path2 := makeShare(t, h, admin, shareInput{Title: "Other", PostIDs: []int64{other}, Password: &password})
	status(t, shareMedia(h, "GET", fmt.Sprintf("%s/photos/%d/original", path2, otherPhoto), grant), 401)
	in.Revision = 1
	in.PostIDs = []int64{private, hidden}
	w, _ = call(t, h, "PUT", fmt.Sprintf("/api/admin/shares/%d", id), in, admin)
	status(t, w, 409)
	w, _ = call(t, h, "POST", path+"/lock", Object{}, grant)
	status(t, w, 200)
	status(t, shareMedia(h, "GET", media+"original", grant), 401)
}

func TestShareLifecycleRevisionExpiryAndRestart(t *testing.T) {
	a, h, admin := testApp(t)
	p1, img := seedPost(t, a, "First", false, false)
	p2, _ := seedPost(t, a, "Second", true, false)
	password := "Shared secret"
	in := shareInput{Title: "Ordered", PostIDs: []int64{p2, p1}, Password: &password}
	id, path := makeShare(t, h, admin, in)
	adminPath := fmt.Sprintf("/api/admin/shares/%d", id)
	grant := unlock(t, h, path, password)
	w, result := call(t, h, "GET", path, nil, grant)
	status(t, w, 200)
	if integer(object(object(result["data"])["posts"].([]any)[0])["id"]) != p2 {
		t.Fatal("share order lost")
	}
	in.Revision = 1
	in.Password = nil
	in.PostIDs = []int64{p1, p2}
	in.Title = "Updated"
	w, _ = call(t, h, "PUT", adminPath, in, admin)
	status(t, w, 200)
	w, _ = call(t, h, "PUT", adminPath, in, admin)
	status(t, w, 409)
	media := fmt.Sprintf("%s/photos/%d/original", path, img)
	status(t, shareMedia(h, "GET", media, grant), 401)
	grant = unlock(t, h, path, password)
	w = shareMedia(h, "GET", media, grant)
	status(t, w, 307)
	if w.Header().Get("Location") != "https://example.com/photo.jpg" || w.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("remote delivery failed")
	}
	if err := a.Close(); err != nil {
		t.Fatal(err)
	}
	reopened, err := Open(a.data, a.dist, false)
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	a = reopened
	h = a.Router()
	w, _ = call(t, h, "GET", path, nil, grant)
	status(t, w, 200)
	action := func(name string, rev int64, want int) {
		t.Helper()
		w, _ := call(t, h, "POST", adminPath+"/action", Object{"action": name, "revision": rev}, admin)
		status(t, w, want)
	}
	action("revoke", 1, 409)
	action("revoke", 2, 200)
	w, _ = call(t, h, "GET", path, nil, grant)
	status(t, w, 404)
	status(t, shareMedia(h, "GET", media, grant), 404)
	action("resume", 3, 200)
	status(t, shareMedia(h, "GET", media, grant), 401)
	grant = unlock(t, h, path, password)
	action("rotate", 4, 200)
	w, _ = call(t, h, "GET", path, nil, grant)
	status(t, w, 404)
	w, result = call(t, h, "GET", adminPath, nil, admin)
	status(t, w, 200)
	nextPath := "/api/shares/" + text(object(result["data"])["token"])
	if nextPath == path {
		t.Fatal("link did not rotate")
	}
	status(t, shareMedia(h, "GET", strings.Replace(media, path, nextPath, 1), grant), 401)
	// Removing a password is explicit; restoring the share cannot revive grants.
	blank := ""
	in.Password = &blank
	in.Revision = 5
	w, _ = call(t, h, "PUT", adminPath, in, admin)
	status(t, w, 200)
	w, result = call(t, h, "GET", nextPath, nil, nil)
	status(t, w, 200)
	if object(result["data"])["locked"] != false {
		t.Fatal("password removal failed")
	}
	_, err = a.db.Exec("UPDATE moment_shares SET expires_at=? WHERE id=?", time.Now().Unix(), id)
	if err != nil {
		t.Fatal(err)
	}
	w, _ = call(t, h, "GET", nextPath, nil, nil)
	status(t, w, 404)
	w, _ = call(t, h, "POST", nextPath+"/unlock", Object{"password": password}, nil)
	status(t, w, 404)
	action("resume", 6, 400)
	action("delete", 6, 200)
	w, _ = call(t, h, "GET", adminPath, nil, admin)
	status(t, w, 404)
	var count int
	_ = a.db.QueryRow("SELECT COUNT(*) FROM blog").Scan(&count)
	if count != 2 {
		t.Fatal("deleting share deleted posts")
	}
}

func TestShareValidationTrashCSRFAndRateLimit(t *testing.T) {
	a, h, admin := testApp(t)
	p, img := seedPost(t, a, "Visible", false, false)
	past := time.Now().Add(-time.Minute).Unix()
	short := "tiny"
	for _, in := range []shareInput{
		{Title: "Empty"}, {Title: "", PostIDs: []int64{p}}, {Title: "Invalid", PostIDs: []int64{999}},
		{Title: "Duplicate", PostIDs: []int64{p, p}}, {Title: "Expired", PostIDs: []int64{p}, ExpiresAt: &past}, {Title: "Weak", PostIDs: []int64{p}, Password: &short},
	} {
		w, _ := call(t, h, "POST", "/api/admin/shares", in, admin)
		if w.Code != 400 && w.Code != 409 {
			t.Fatalf("invalid share accepted: %d", w.Code)
		}
	}
	_, path := makeShare(t, h, admin, shareInput{Title: "Temporary", PostIDs: []int64{p}})
	req := httptest.NewRequest("POST", path+"/unlock", strings.NewReader(`{"password":""}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", "https://other.example")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	status(t, w, 403)
	w, _ = call(t, h, "DELETE", fmt.Sprintf("/api/admin/posts/%d", p), nil, admin)
	status(t, w, 200)
	w, result := call(t, h, "GET", path, nil, nil)
	status(t, w, 200)
	if len(object(result["data"])["posts"].([]any)) != 0 {
		t.Fatal("trash appeared in share")
	}
	status(t, shareMedia(h, "GET", fmt.Sprintf("%s/photos/%d/original", path, img), nil), 404)
	for i := 0; i < 20; i++ {
		w, _ = call(t, h, "POST", "/api/shares/"+strings.Repeat("b", 64)+"/unlock", Object{}, nil)
		status(t, w, 404)
	}
	w, _ = call(t, h, "POST", path+"/unlock", Object{}, nil)
	status(t, w, 429)
}

func TestShareBackupPreservesAlbumsNotGrantsAndUpgradesOlderSchema(t *testing.T) {
	a, h, admin := testApp(t)
	p, _ := seedPost(t, a, "Shared", true, false)
	password := "Album backup"
	_, path := makeShare(t, h, admin, shareInput{Title: "Backup album", PostIDs: []int64{p}, Password: &password})
	grant := unlock(t, h, path, password)
	info, err := a.exportBackup(context.Background(), "manual")
	if err != nil {
		t.Fatal(err)
	}
	dir := t.TempDir()
	_, _, err = unpackBackup(context.Background(), a.backupPath(info.ID), dir)
	if err != nil {
		t.Fatal(err)
	}
	restored, err := Open(dir, t.TempDir(), false)
	if err != nil {
		t.Fatal(err)
	}
	defer restored.Close()
	status(t, shareMedia(restored.Router(), "GET", path+"/photos/1/original", grant), 401)
	unlock(t, restored.Router(), path, password)
	// Model a backup made by the previous release, before migration 006.
	for _, sql := range []string{"DROP TABLE moment_schedules", "DROP TABLE moment_image_discovery", "DROP TABLE moment_post_discovery", "DELETE FROM moment_share_sessions", "DROP TABLE moment_share_sessions", "DROP TABLE moment_share_posts", "DROP TABLE moment_shares", "DELETE FROM moment_schema_migrations WHERE version>='006_shares.sql'"} {
		if _, err = restored.db.Exec(sql); err != nil {
			t.Fatal(err)
		}
	}
	// Verify it using the real import validator, then the restore initializer.
	_, err = validateBackupDB(context.Background(), filepath.Join(dir, "db.sqlite3"))
	if err != nil {
		t.Fatal(err)
	}
	if err = restored.initialize(); err != nil {
		t.Fatal(err)
	}
	var count int
	if err = restored.db.QueryRow("SELECT COUNT(*) FROM moment_shares").Scan(&count); err != nil || count != 0 {
		t.Fatal("older backup did not upgrade")
	}
}

func TestShareUpdateRollbackAndExpiredGrant(t *testing.T) {
	a, h, admin := testApp(t)
	first, _ := seedPost(t, a, "First", true, false)
	second, _ := seedPost(t, a, "Second", false, false)
	password := "Rollback secret"
	id, path := makeShare(t, h, admin, shareInput{Title: "Original", PostIDs: []int64{first}, Password: &password})
	a.secure = true
	grant := unlock(t, h, path, password)
	if !grant.Secure {
		t.Fatal("HTTPS grant is missing Secure")
	}
	_, err := a.db.Exec(`CREATE TRIGGER fail_share_item BEFORE INSERT ON moment_share_posts WHEN NEW.position=1 BEGIN SELECT RAISE(ABORT,'share fixture'); END`)
	if err != nil {
		t.Fatal(err)
	}
	w, _ := call(t, h, "PUT", fmt.Sprintf("/api/admin/shares/%d", id), shareInput{Title: "Partial change", PostIDs: []int64{first, second}, Revision: 1}, admin)
	status(t, w, 500)
	w, result := call(t, h, "GET", path, nil, grant)
	status(t, w, 200)
	if object(result["data"])["locked"] != false || text(object(result["data"])["title"]) != "Original" || len(object(result["data"])["posts"].([]any)) != 1 {
		t.Fatal("failed save changed the album or invalidated its grant")
	}
	_, err = a.db.Exec("UPDATE moment_share_sessions SET expires_at=?", time.Now().Unix())
	if err != nil {
		t.Fatal(err)
	}
	w, result = call(t, h, "GET", path, nil, grant)
	status(t, w, 200)
	if object(result["data"])["locked"] != true {
		t.Fatal("expired grant still accepted")
	}
}
