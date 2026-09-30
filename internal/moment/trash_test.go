package moment

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func TestTrashRestorePreservesContentAndDrafts(t *testing.T) {
	a, h, cookie := testApp(t)
	id, img := seedPost(t, a, "Recover me", false, false)
	path := fmt.Sprintf("/api/admin/posts/%d", id)
	publicPath := fmt.Sprintf("/api/v1/visitor/blog/%d", id)
	if _, err := a.db.Exec("INSERT INTO category(name,alias,parent_id) VALUES ('Root','root',0),('Child','child',1)"); err != nil {
		t.Fatal(err)
	}
	x, y := 12.5, 87.0
	in := PostInput{Title: "Recover me", Desc: "Preserved description", Location: "Private trash location", Images: []ImageInput{{ID: img, URL: "/uploads/kept.png", Title: "Cover", FocusX: &x, FocusY: &y}, {URL: "https://example.com/hidden.jpg", Hidden: true}}, Categories: []int64{2}}
	w, _ := call(t, h, "PUT", path, in, cookie)
	status(t, w, 200)
	w, before := call(t, h, "GET", path, nil, cookie)
	status(t, w, 200)
	original := object(before["data"])
	if err := os.MkdirAll(filepath.Join(a.data, "uploads"), 0700); err != nil {
		t.Fatal(err)
	}
	file := filepath.Join(a.data, "uploads", "kept.png")
	if err := os.WriteFile(file, []byte("original file"), 0600); err != nil {
		t.Fatal(err)
	}
	draft := Draft{PostID: &id, BaseRevision: integer(original["revision"]), MutationID: draftMutation, Payload: in}
	draft.Payload.Desc = "Unpublished draft"
	draftPath := "/api/admin/drafts/" + draftKey
	w, _ = call(t, h, "PUT", draftPath, draft, cookie)
	status(t, w, 200)
	w, _ = call(t, h, "DELETE", path, nil, cookie)
	status(t, w, 200)
	w, _ = call(t, h, "DELETE", path, nil, cookie)
	status(t, w, 200)
	for _, p := range []string{path, publicPath} {
		w, _ = call(t, h, "GET", p, nil, cookie)
		status(t, w, 404)
	}
	for _, p := range []string{"/api/admin/posts", "/api/v1/visitor/blog/list", "/api/v1/visitor/blog/list?category=root", "/api/v1/visitor/blog/list?location=Private", "/api/admin/drafts"} {
		w, result := call(t, h, "GET", p, nil, cookie)
		status(t, w, 200)
		if integer(result["total"]) != 0 || len(result["data"].([]any)) != 0 {
			t.Fatalf("trashed record leaked through %s", p)
		}
	}
	w, stats := call(t, h, "GET", "/api/admin/stats", nil, cookie)
	status(t, w, 200)
	if s := object(stats["data"]); integer(s["blog"]) != 0 || integer(s["image"]) != 0 || integer(s["trash"]) != 1 {
		t.Fatal("active statistics count trash", s)
	}
	w, locations := call(t, h, "GET", "/api/admin/locations", nil, cookie)
	status(t, w, 200)
	if len(locations["data"].([]any)) != 0 {
		t.Fatal("trash leaked into location suggestions")
	}
	w, _ = call(t, h, "PUT", path, in, cookie)
	status(t, w, 409)
	draft.Revision = 1
	draft.MutationID = "337ded56-ec5c-431d-8b3f-ac58c1f5cfe8"
	w, _ = call(t, h, "PUT", draftPath, draft, cookie)
	status(t, w, 409)
	w, _ = call(t, h, "POST", draftPath+"/publish", Object{"revision": 1}, cookie)
	status(t, w, 409)
	// Reopen the actual database, not an in-memory mock, while content is trashed.
	data, dist := a.data, a.dist
	if err := a.Close(); err != nil {
		t.Fatal(err)
	}
	var err error
	a, err = Open(data, dist, false)
	if err != nil {
		t.Fatal(err)
	}
	defer a.Close()
	h = a.Router()
	w, list := call(t, h, "GET", "/api/admin/trash?q=Recover", nil, cookie)
	status(t, w, 200)
	if integer(list["total"]) != 1 {
		t.Fatal("trash did not survive restart")
	}
	trashed := object(list["data"].([]any)[0])
	if integer(trashed["draft_count"]) != 1 || integer(trashed["revision"]) != 2 {
		t.Fatal("trash metadata incorrect", trashed)
	}
	w, result := call(t, h, "POST", "/api/admin/trash/batch", trashRequest("restore", id, integer(trashed["revision"])), cookie)
	status(t, w, 200)
	batchOK(t, result, true)
	w, restored := call(t, h, "GET", path, nil, cookie)
	status(t, w, 200)
	content := object(restored["data"])
	delete(content, "revision")
	delete(original, "revision")
	if !reflect.DeepEqual(content, original) {
		t.Fatal("restore changed IDs, image order, focus, categories or original metadata")
	}
	w, _ = call(t, h, "GET", publicPath, nil, nil)
	status(t, w, 200)
	w, recovered := call(t, h, "GET", draftPath, nil, cookie)
	status(t, w, 200)
	d := object(recovered["data"])
	if integer(d["base_revision"]) != 3 || integer(d["revision"]) != 2 || text(object(d["payload"])["desc"]) != "Unpublished draft" {
		t.Fatal("draft was not restored with a valid base")
	}
	w, _ = call(t, h, "POST", draftPath+"/publish", Object{"revision": d["revision"]}, cookie)
	status(t, w, 200)
	w, _ = call(t, h, "DELETE", path, nil, cookie)
	status(t, w, 200)
	w, r := call(t, h, "POST", "/api/admin/trash/batch", trashRequest("purge", id, 5), cookie)
	status(t, w, 200)
	batchOK(t, r, true)
	var count int
	for _, table := range []string{"blog_image", "blog_category"} {
		if err := a.db.QueryRow("SELECT COUNT(*) FROM "+table+" WHERE blog_id=?", id).Scan(&count); err != nil || count != 0 {
			t.Fatal("purge left relations", table, err)
		}
	}
	for _, q := range []string{"SELECT COUNT(*) FROM moment_drafts WHERE id=?", "SELECT COUNT(*) FROM moment_image_focus WHERE image_id=?"} {
		var key any = img
		if q == "SELECT COUNT(*) FROM moment_drafts WHERE id=?" {
			key = draftKey
		}
		// New-post publishing receipts have no post_id; this receipt belongs to an existing post and cascades.
		if err := a.db.QueryRow(q, key).Scan(&count); err != nil || count != 0 {
			t.Fatal("purge left private related data", q, err)
		}
	}
	if bytes, err := os.ReadFile(file); err != nil || string(bytes) != "original file" {
		t.Fatal("original file changed")
	}
}

func trashRequest(action string, id, revision int64) Object {
	return Object{"action": action, "confirm": action == "purge", "targets": []Object{{"id": id, "revision": revision}}}
}
func batchOK(t *testing.T, result Object, want bool) {
	t.Helper()
	if object(result["data"].([]any)[0])["ok"] != want {
		t.Fatalf("unexpected batch result: %v", result)
	}
}

func TestTrashVersionChecksPurgeAndPrivateRestore(t *testing.T) {
	a, h, cookie := testApp(t)
	id, img := seedPost(t, a, "Private", true, false)
	path := fmt.Sprintf("/api/admin/posts/%d", id)
	w, _ := call(t, h, "DELETE", path, nil, cookie)
	status(t, w, 200)
	for _, route := range []struct {
		method, path string
		body         any
	}{{"GET", "/api/admin/trash", nil}, {"POST", "/api/admin/trash/batch", trashRequest("restore", id, 1)}} {
		w, _ = call(t, h, route.method, route.path, route.body, nil)
		status(t, w, http.StatusUnauthorized)
	}
	w, r := call(t, h, "POST", "/api/admin/trash/batch", trashRequest("restore", id, 0), cookie)
	status(t, w, 200)
	batchOK(t, r, false)
	w, r = call(t, h, "POST", "/api/admin/trash/batch", trashRequest("restore", id, 1), cookie)
	status(t, w, 200)
	batchOK(t, r, true)
	w, _ = call(t, h, "GET", fmt.Sprintf("/api/v1/visitor/blog/%d", id), nil, nil)
	status(t, w, 404)
	w, r = call(t, h, "POST", "/api/admin/trash/batch", trashRequest("purge", id, 1), cookie)
	status(t, w, 200)
	batchOK(t, r, false)
	w, _ = call(t, h, "DELETE", path, nil, cookie)
	status(t, w, 200)
	// A stale recycle-bin tab cannot purge a post that was restored and trashed again.
	w, r = call(t, h, "POST", "/api/admin/trash/batch", trashRequest("purge", id, 1), cookie)
	status(t, w, 200)
	batchOK(t, r, false)
	request := trashRequest("purge", id, 3)
	request["confirm"] = false
	w, _ = call(t, h, "POST", "/api/admin/trash/batch", request, cookie)
	status(t, w, 400)
	w, r = call(t, h, "POST", "/api/admin/trash/batch", trashRequest("purge", id, 3), cookie)
	status(t, w, 200)
	batchOK(t, r, true)
	var count int
	for _, q := range []string{"SELECT COUNT(*) FROM blog WHERE id=?", "SELECT COUNT(*) FROM moment_trash_posts WHERE post_id=?", "SELECT COUNT(*) FROM moment_post_revisions WHERE post_id=?"} {
		if err := a.db.QueryRow(q, id).Scan(&count); err != nil || count != 0 {
			t.Fatal("purge left related record", q, err)
		}
	}
	if err := a.db.QueryRow("SELECT COUNT(*) FROM blog_image WHERE id=?", img).Scan(&count); err != nil || count != 0 {
		t.Fatal("purge left image record")
	}
}

func TestTrashBatchPartialFailureAndStaleDraft(t *testing.T) {
	a, h, cookie := testApp(t)
	one, img := seedPost(t, a, "One", false, false)
	two, _ := seedPost(t, a, "Two", false, false)
	draft := Draft{PostID: &one, MutationID: draftMutation, Payload: PostInput{Title: "Old draft", Images: []ImageInput{{ID: img, URL: "https://example.com/photo.jpg"}}}}
	w, _ := call(t, h, "PUT", "/api/admin/drafts/"+draftKey, draft, cookie)
	status(t, w, 200)
	w, _ = call(t, h, "PUT", fmt.Sprintf("/api/admin/posts/%d", one), PostInput{Title: "Newer published content", Images: draft.Payload.Images}, cookie)
	status(t, w, 200)
	for _, id := range []int64{one, two} {
		w, _ = call(t, h, "DELETE", fmt.Sprintf("/api/admin/posts/%d", id), nil, cookie)
		status(t, w, 200)
	}
	w, r := call(t, h, "POST", "/api/admin/trash/batch", Object{"action": "restore", "targets": []Object{{"id": one, "revision": 2}, {"id": two, "revision": 0}, {"id": 99999, "revision": 0}}}, cookie)
	status(t, w, 200)
	results := r["data"].([]any)
	if object(results[0])["ok"] != true || object(results[1])["ok"] != false || object(results[2])["ok"] != false {
		t.Fatal("partial results incorrect", r)
	}
	w, _ = call(t, h, "POST", "/api/admin/drafts/"+draftKey+"/publish", Object{"revision": 1}, cookie)
	status(t, w, 409)
	// Validate inputs before any change, including permanent deletion of duplicates.
	w, _ = call(t, h, "POST", "/api/admin/trash/batch", Object{"action": "purge", "confirm": true, "targets": []Object{{"id": two, "revision": 1}, {"id": two, "revision": 1}}}, cookie)
	status(t, w, 400)
}
