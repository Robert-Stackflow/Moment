package moment

import (
	"bytes"
	"context"
	"fmt"
	"image/jpeg"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

func dropPhotoTagSchema(t *testing.T, a *App) {
	t.Helper()
	if _, err := a.db.Exec("DROP TABLE moment_session_details; DELETE FROM moment_schema_migrations WHERE version='012_session_details.sql'"); err != nil {
		t.Fatal(err)
	}
	if _, err := a.db.Exec("DROP TABLE moment_image_tags"); err != nil {
		t.Fatal(err)
	}
	if _, err := a.db.Exec("DELETE FROM moment_schema_migrations WHERE version='011_photo_tags.sql'"); err != nil {
		t.Fatal(err)
	}
}

func expectPhotoTags(t *testing.T, a *App, id int64, want ...string) {
	t.Helper()
	got, err := readPhotoTags(a.db, id)
	if err != nil || !slices.Equal(got, want) {
		t.Fatalf("photo tags: got %v, want %v: %v", got, want, err)
	}
}

func TestPhotoTagsPersistencePrivacyAndLegacyClients(t *testing.T) {
	a, h, admin := testApp(t)
	tags := []string{" Private-Tag ", "ＰＲＩＶＡＴＥ－ＴＡＧ", "旅行"}
	in := PostInput{Title: "A photo", Images: []ImageInput{{URL: "https://example.com/photo.jpg", Tags: &tags}}}
	w, result := call(t, h, "POST", "/api/admin/posts", in, admin)
	status(t, w, 200)
	id := integer(object(result["data"])["id"])
	path := fmt.Sprintf("/api/admin/posts/%d", id)
	w, result = call(t, h, "GET", path, nil, admin)
	status(t, w, 200)
	photo := object(object(result["data"])["images"].([]any)[0])
	imageID := integer(photo["id"])
	expectPhotoTags(t, a, imageID, "private-tag", "旅行")
	if len(photo["tags"].([]any)) != 2 {
		t.Fatal("editable tags missing")
	}
	for _, publicPath := range []string{fmt.Sprintf("/api/v1/visitor/blog/%d", id), "/api/v1/visitor/blog/list"} {
		w, _ = call(t, h, "GET", publicPath, nil, nil)
		status(t, w, 200)
		if strings.Contains(w.Body.String(), "private-tag") || strings.Contains(w.Body.String(), `"tags"`) {
			t.Fatal("private tags leaked to visitors")
		}
	}
	for _, search := range []string{"private-tag", "ＰＲＩＶＡＴＥ－ＴＡＧ"} {
		for _, endpoint := range []string{"/api/admin/posts", "/api/admin/photo-tags/photos"} {
			w, result = call(t, h, "GET", endpoint+"?q="+url.QueryEscape(search), nil, admin)
			status(t, w, 200)
			if integer(result["total"]) != 1 {
				t.Fatalf("tag search failed: %s %s", endpoint, search)
			}
		}
		w, result = call(t, h, "GET", "/api/admin/photo-tags?q="+url.QueryEscape(search), nil, admin)
		status(t, w, 200)
		options := result["data"].([]any)
		if len(options) != 1 || text(object(options[0])["tag"]) != "private-tag" {
			t.Fatalf("tag options must use the same normalization: %s", search)
		}
	}
	w, result = call(t, h, "GET", "/api/v1/visitor/blog/list?q=private-tag", nil, nil)
	status(t, w, 200)
	if integer(result["total"]) != 0 {
		t.Fatal("visitor search used private tags")
	}
	// Older clients omit tags, whereas an explicit empty list clears them.
	in.Images[0].ID, in.Images[0].Tags = imageID, nil
	w, _ = call(t, h, "PUT", path, in, admin)
	status(t, w, 200)
	expectPhotoTags(t, a, imageID, "private-tag", "旅行")
	empty := []string{}
	in.Images[0].Tags = &empty
	w, _ = call(t, h, "PUT", path, in, admin)
	status(t, w, 200)
	expectPhotoTags(t, a, imageID)
	for _, invalid := range [][]string{{" "}, {strings.Repeat("字", 33)}, {"a\x00b"}, make([]string, 21)} {
		in.Images[0].Tags = &invalid
		w, _ = call(t, h, "PUT", path, in, admin)
		status(t, w, 400)
		expectPhotoTags(t, a, imageID)
	}
}

func TestPhotoTagsConfirmationRetryConflictAndUndo(t *testing.T) {
	a, h, admin := testApp(t)
	postID, photoID := seedPost(t, a, "Tag target", false, false)
	if _, err := a.db.Exec("INSERT INTO moment_image_tags VALUES (?, 'existing')", photoID); err != nil {
		t.Fatal(err)
	}
	id := strings.Repeat("b", 32)
	target := photoTagTarget{ID: photoID, URL: "https://example.com/photo.jpg", Tags: []string{"new"}}
	in := Object{"id": id, "targets": []photoTagTarget{target}, "confirm": false}
	path := "/api/admin/photo-tags/apply"
	w, _ := call(t, h, "POST", path, in, nil)
	status(t, w, 401)
	w, _ = call(t, h, "POST", path, in, admin)
	status(t, w, 400)
	in["confirm"] = true
	for range 2 {
		w, _ = call(t, h, "POST", path, in, admin)
		status(t, w, 200)
	}
	expectPhotoTags(t, a, photoID, "existing", "new")
	var revision int64
	if err := a.db.QueryRow("SELECT revision FROM moment_post_revisions WHERE post_id=?", postID).Scan(&revision); err != nil || revision != 1 {
		t.Fatal("retry created another revision", revision, err)
	}
	in["id"] = strings.Repeat("c", 32)
	w, _ = call(t, h, "POST", path, in, admin)
	status(t, w, 409)
	undo := "/api/admin/photo-actions/" + id + "/undo"
	w, _ = call(t, h, "POST", undo, Object{}, admin)
	status(t, w, 200)
	expectPhotoTags(t, a, photoID, "existing")
	target.Revision = 2
	in["targets"] = []photoTagTarget{target}
	// A receipt write failure must roll back both tags and the revision.
	if _, err := a.db.Exec("CREATE TRIGGER fail_tag_receipt BEFORE INSERT ON moment_photo_actions BEGIN SELECT RAISE(ABORT,'tag fixture rollback'); END"); err != nil {
		t.Fatal(err)
	}
	w, _ = call(t, h, "POST", path, in, admin)
	status(t, w, 500)
	expectPhotoTags(t, a, photoID, "existing")
	if _, err := a.db.Exec("DROP TRIGGER fail_tag_receipt"); err != nil {
		t.Fatal(err)
	}
	w, _ = call(t, h, "POST", path, in, admin)
	status(t, w, 200)
	if _, err := a.db.Exec("UPDATE moment_post_revisions SET revision=revision+1 WHERE post_id=?", postID); err != nil {
		t.Fatal(err)
	}
	w, _ = call(t, h, "POST", "/api/admin/photo-actions/"+strings.Repeat("c", 32)+"/undo", Object{}, admin)
	status(t, w, 409)
	expectPhotoTags(t, a, photoID, "existing", "new")
}

func TestPhotoTagPreviewRequiresConsentAndProducesPrivateJPEG(t *testing.T) {
	a, h, admin := testApp(t)
	path := "/api/admin/photo-tags/preview"
	w, _ := call(t, h, "POST", path, Object{"image_url": "https://example.com/photo.jpg"}, admin)
	status(t, w, 400)
	w, _ = call(t, h, "POST", path, Object{"image_url": "http://127.0.0.1/private", "remote": true}, admin)
	status(t, w, 422)
	duplicateFile(t, a, "tags.png", duplicateFixture(t, false))
	r := httptest.NewRequest("POST", path, strings.NewReader(`{"image_url":"/uploads/tags.png"}`))
	r.Header.Set("Content-Type", "application/json")
	r.AddCookie(admin)
	w = httptest.NewRecorder()
	h.ServeHTTP(w, r)
	status(t, w, 200)
	if w.Header().Get("Content-Type") != "image/jpeg" || w.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("preview headers wrong")
	}
	config, err := jpeg.DecodeConfig(bytes.NewReader(w.Body.Bytes()))
	if err != nil || config.Width != 160 || config.Height != 120 {
		t.Fatal("preview did not preserve aspect ratio", config, err)
	}
}

func TestPhotoTagsDraftMultiPhotoBackupAndOldSchema(t *testing.T) {
	a, h, admin := testApp(t)
	initial := []string{"original"}
	in := Draft{MutationID: draftMutation, Payload: PostInput{Title: "Tagged draft", Images: []ImageInput{
		{URL: "https://example.com/one.jpg", Tags: &initial},
		{URL: "https://example.com/two.jpg"},
	}}}
	w, _ := call(t, h, "PUT", "/api/admin/drafts/"+draftKey, in, admin)
	status(t, w, 200)
	var count int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM moment_image_tags").Scan(&count); err != nil || count != 0 {
		t.Fatal("draft wrote live tags", count, err)
	}
	w, result := call(t, h, "POST", "/api/admin/drafts/"+draftKey+"/publish", Object{"revision": 1}, admin)
	status(t, w, 200)
	id := integer(object(result["data"])["id"])
	w, result = call(t, h, "GET", fmt.Sprintf("/api/admin/posts/%d", id), nil, admin)
	status(t, w, 200)
	post := object(result["data"])
	images := post["images"].([]any)
	one, two := integer(object(images[0])["id"]), integer(object(images[1])["id"])
	expectPhotoTags(t, a, one, "original")
	targets := []photoTagTarget{
		{ID: one, URL: text(object(images[0])["image_url"]), Revision: integer(post["revision"]), Tags: []string{"new"}},
		{ID: two, URL: text(object(images[1])["image_url"]), Revision: integer(post["revision"]), Tags: []string{"new"}},
	}
	receipt := strings.Repeat("d", 32)
	targets[1].Revision++
	w, _ = call(t, h, "POST", "/api/admin/photo-tags/apply", Object{"id": receipt, "targets": targets, "confirm": true}, admin)
	status(t, w, 409)
	expectPhotoTags(t, a, one, "original")
	expectPhotoTags(t, a, two)
	targets[1].Revision--
	w, _ = call(t, h, "POST", "/api/admin/photo-tags/apply", Object{"id": receipt, "targets": targets, "confirm": true}, admin)
	status(t, w, 200)
	var revision int64
	if err := a.db.QueryRow("SELECT revision FROM moment_post_revisions WHERE post_id=?", id).Scan(&revision); err != nil || revision != targets[0].Revision+1 {
		t.Fatal("same-post batch advanced multiple revisions", revision, err)
	}
	w, result = call(t, h, "GET", fmt.Sprintf("/api/admin/photo-tags/photos?ids=%d,%d", one, two), nil, admin)
	status(t, w, 200)
	if integer(result["total"]) != 2 {
		t.Fatal("selected-photo refresh missing rows")
	}
	for _, ids := range []string{"0", "-1", "1,invalid", strings.Repeat("1,", 50) + "1"} {
		w, _ = call(t, h, "GET", "/api/admin/photo-tags/photos?ids="+ids, nil, admin)
		status(t, w, 400)
	}
	info, err := a.exportBackup(context.Background(), "manual")
	if err != nil {
		t.Fatal(err)
	}
	undo := "/api/admin/photo-actions/" + receipt + "/undo"
	w, _ = call(t, h, "POST", undo, Object{}, admin)
	status(t, w, 200)
	expectPhotoTags(t, a, one, "original")
	w, _ = call(t, h, "POST", "/api/admin/backups/"+info.ID+"/restore", Object{"password": testPassword, "confirm": "恢复备份"}, admin)
	status(t, w, 200)
	expectPhotoTags(t, a, one, "new", "original")
	expectPhotoTags(t, a, two, "new")
	w, _ = call(t, h, "POST", "/api/admin/login", Object{"username": "tester", "password": testPassword}, nil)
	status(t, w, 200)
	admin = w.Result().Cookies()[0]
	w, _ = call(t, h, "POST", undo, Object{}, admin)
	status(t, w, 200)
	expectPhotoTags(t, a, one, "original")
	expectPhotoTags(t, a, two)
	dropPhotoTagSchema(t, a)
	if _, err = validateBackupDB(context.Background(), filepath.Join(a.data, "db.sqlite3")); err != nil {
		t.Fatal(err)
	}
	if err = a.initialize(); err != nil {
		t.Fatal(err)
	}
	expectPhotoTags(t, a, one)
}

func TestPhotoTagVocabularyAssetIsServedAsJSON(t *testing.T) {
	a, h, _ := testApp(t)
	dir := filepath.Join(a.dist, "admin", "tag-model")
	if err := os.MkdirAll(dir, 0700); err != nil {
		t.Fatal(err)
	}
	body := []byte(`{"version":"fixture","data":"AAAAAA=="}`)
	if err := os.WriteFile(filepath.Join(dir, "vocabulary-v1.json"), body, 0600); err != nil {
		t.Fatal(err)
	}
	r := httptest.NewRequest("GET", "/admin/tag-model/vocabulary-v1.json", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	status(t, w, 200)
	if !bytes.Equal(w.Body.Bytes(), body) || !strings.HasPrefix(w.Header().Get("Content-Type"), "application/json") {
		t.Fatal("model asset missing or replaced by SPA document")
	}
}
