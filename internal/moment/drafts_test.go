package moment

import (
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"
)

const draftKey = "fa36e4a1-f5b3-462f-9c67-6e6f42036199"
const draftMutation = "237ded56-ec5c-431d-8b3f-ac58c1f5cfe8"

func TestDraftLifecycleAndPublish(t *testing.T) {
	a, h, cookie := testApp(t)
	path := "/api/admin/drafts/" + draftKey
	in := Draft{MutationID: draftMutation, Payload: PostInput{Desc: "Unfinished story"}}
	w, _ := call(t, h, "PUT", path, in, nil)
	status(t, w, 401)
	w, result := call(t, h, "PUT", path, in, cookie)
	status(t, w, 200)
	if integer(object(result["data"])["revision"]) != 1 {
		t.Fatal("missing initial revision")
	}
	// A lost response may cause the same mutation to be retried.
	w, result = call(t, h, "PUT", path, in, cookie)
	status(t, w, 200)
	if integer(object(result["data"])["revision"]) != 1 {
		t.Fatal("retry created another revision")
	}
	w, _ = call(t, h, "POST", path+"/publish", Object{"revision": 1}, cookie)
	status(t, w, 400)
	var posts int
	_ = a.db.QueryRow("SELECT COUNT(*) FROM blog").Scan(&posts)
	if posts != 0 {
		t.Fatal("incomplete draft created a public record")
	}
	if err := a.initialize(); err != nil {
		t.Fatal(err)
	}
	w, result = call(t, h, "GET", path, nil, cookie)
	status(t, w, 200)
	if text(object(object(result["data"])["payload"])["desc"]) != "Unfinished story" {
		t.Fatal("draft lost after initialization")
	}
	in.Revision = 1
	in.MutationID = "937ded56-ec5c-431d-8b3f-ac58c1f5cfe8"
	in.Payload.Title = "Ready to publish"
	in.Payload.Images = []ImageInput{{URL: "https://example.com/photo.jpg"}}
	w, _ = call(t, h, "PUT", path, in, cookie)
	status(t, w, 200)
	w, result = call(t, h, "GET", "/api/admin/drafts?q=Ready", nil, cookie)
	status(t, w, 200)
	if integer(result["total"]) != 1 {
		t.Fatal("draft search failed")
	}
	w, _ = call(t, h, "POST", path+"/publish", Object{"revision": 1}, cookie)
	status(t, w, 409)
	w, result = call(t, h, "POST", path+"/publish", Object{"revision": 2}, cookie)
	status(t, w, 200)
	id := integer(object(result["data"])["id"])
	w, duplicate := call(t, h, "POST", path+"/publish", Object{"revision": 2}, cookie)
	status(t, w, 200)
	if integer(object(duplicate["data"])["id"]) != id {
		t.Fatal("repeat publish duplicated content")
	}
	w, result = call(t, h, "GET", "/api/admin/drafts", nil, cookie)
	status(t, w, 200)
	if integer(result["total"]) != 0 {
		t.Fatal("published receipt listed as a draft")
	}
	w, result = call(t, h, "GET", fmt.Sprintf("/api/v1/visitor/blog/%d", id), nil, nil)
	status(t, w, 200)
	if text(object(result["data"])["title"]) != "Ready to publish" {
		t.Fatal("published payload wrong")
	}
	in.Revision = 2
	in.MutationID = "837ded56-ec5c-431d-8b3f-ac58c1f5cfe8"
	w, _ = call(t, h, "PUT", path, in, cookie)
	status(t, w, 409)
}

func TestExistingDraftIsolationAndConflicts(t *testing.T) {
	a, h, cookie := testApp(t)
	id, img := seedPost(t, a, "Original public title", false, false)
	path := "/api/admin/drafts/" + draftKey
	publicPath := fmt.Sprintf("/api/v1/visitor/blog/%d", id)
	in := Draft{PostID: &id, MutationID: draftMutation, Payload: PostInput{Title: "Edited title", Images: []ImageInput{{ID: img, URL: "https://example.com/photo.jpg"}}}}
	w, _ := call(t, h, "PUT", path, in, cookie)
	status(t, w, 200)
	w, result := call(t, h, "GET", publicPath, nil, nil)
	status(t, w, 200)
	if text(object(result["data"])["title"]) != "Original public title" {
		t.Fatal("unpublished edit leaked")
	}
	w, result = call(t, h, "GET", fmt.Sprintf("/api/admin/posts/%d/draft", id), nil, cookie)
	status(t, w, 200)
	if text(object(result["data"])["id"]) != draftKey {
		t.Fatal("existing post draft not found")
	}
	secondPath := "/api/admin/drafts/ba36e4a1-f5b3-462f-9c67-6e6f42036199"
	w, _ = call(t, h, "PUT", secondPath, in, cookie)
	status(t, w, 409)
	in.Revision = 1
	in.MutationID = "937ded56-ec5c-431d-8b3f-ac58c1f5cfe8"
	w, _ = call(t, h, "PUT", path, in, cookie)
	status(t, w, 200)
	in.MutationID = "837ded56-ec5c-431d-8b3f-ac58c1f5cfe8"
	in.Payload.Title = "Stale tab"
	w, _ = call(t, h, "PUT", path, in, cookie)
	status(t, w, 409)
	w, _ = call(t, h, "DELETE", path, Object{"revision": 1}, cookie)
	status(t, w, 409)
	// Even an old client advances the post version and cannot be overwritten by a draft.
	external := PostInput{Title: "External update", Images: []ImageInput{{ID: img, URL: "https://example.com/photo.jpg"}}}
	w, _ = call(t, h, "PUT", fmt.Sprintf("/api/admin/posts/%d", id), external, cookie)
	status(t, w, 200)
	w, _ = call(t, h, "POST", path+"/publish", Object{"revision": 2}, cookie)
	status(t, w, 409)
	w, result = call(t, h, "GET", path, nil, cookie)
	status(t, w, 200)
	if text(object(object(result["data"])["payload"])["title"]) != "Edited title" {
		t.Fatal("conflict destroyed draft")
	}
	w, _ = call(t, h, "DELETE", path, Object{"revision": 2}, cookie)
	status(t, w, 200)
	in.Revision = 2
	w, _ = call(t, h, "PUT", path, in, cookie)
	status(t, w, 409)
	w, result = call(t, h, "GET", publicPath, nil, nil)
	status(t, w, 200)
	if text(object(result["data"])["title"]) != "External update" {
		t.Fatal("draft deletion affected published post")
	}
}

func TestDraftOwnershipAndPublishRollback(t *testing.T) {
	a, h, cookie := testApp(t)
	_, err := a.db.Exec("INSERT INTO user(username,email,avatar,password) VALUES ('second','second@example.com','',?)", legacyHash)
	if err != nil {
		t.Fatal(err)
	}
	token := strings.Repeat("b", 64)
	_, err = a.db.Exec("INSERT INTO moment_sessions VALUES (?,2,?)", tokenDigest(token), time.Now().Add(time.Hour).Unix())
	if err != nil {
		t.Fatal(err)
	}
	other := &http.Cookie{Name: "moment_session", Value: token}
	path := "/api/admin/drafts/" + draftKey
	in := Draft{MutationID: draftMutation, Payload: PostInput{Title: "Private draft", Images: []ImageInput{{URL: "https://example.com/p.jpg"}}, Categories: []int64{99999}}}
	w, _ := call(t, h, "PUT", path, in, cookie)
	status(t, w, 200)
	w, result := call(t, h, "GET", path, nil, other)
	status(t, w, 200)
	if result["data"] != nil {
		t.Fatal("another user's draft disclosed")
	}
	w, _ = call(t, h, "PUT", path, in, other)
	status(t, w, 409)
	w, _ = call(t, h, "POST", path+"/publish", Object{"revision": 1}, other)
	status(t, w, 404)
	w, _ = call(t, h, "DELETE", path, Object{"revision": 1}, other)
	status(t, w, 409)
	w, _ = call(t, h, "POST", path+"/publish", Object{"revision": 1}, cookie)
	status(t, w, 400)
	var count int
	_ = a.db.QueryRow("SELECT COUNT(*) FROM blog").Scan(&count)
	if count != 0 {
		t.Fatal("failed publishing left a partial post")
	}
	_ = a.db.QueryRow("SELECT COUNT(*) FROM moment_drafts WHERE published_at IS NULL").Scan(&count)
	if count != 1 {
		t.Fatal("failed publishing removed draft")
	}
}
