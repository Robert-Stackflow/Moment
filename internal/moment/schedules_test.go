package moment

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

func scheduleFixture(t *testing.T, a *App, h http.Handler, cookie *http.Cookie, payload PostInput, postID *int64) int64 {
	t.Helper()
	w, _ := call(t, h, "PUT", "/api/admin/drafts/"+draftKey, Draft{MutationID: draftMutation, PostID: postID, Payload: payload}, cookie)
	status(t, w, 200)
	at := time.Now().Add(time.Hour).Unix()
	w, _ = call(t, h, "PUT", "/api/admin/drafts/"+draftKey+"/schedule", Object{"revision": 0, "draft_revision": 1, "publish_at": at}, cookie)
	status(t, w, 200)
	return at
}
func scheduleContent() PostInput {
	return PostInput{Title: "Scheduled", Images: []ImageInput{{URL: "https://example.com/photo.jpg"}}}
}
func assertScheduled(t *testing.T, a *App, want string, posts int) *Schedule {
	t.Helper()
	s, err := readSchedule(a.db, draftKey)
	if err != nil || s == nil || s.Status != want {
		t.Fatalf("schedule: %+v, %v", s, err)
	}
	var n int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM blog").Scan(&n); err != nil || n != posts {
		t.Fatalf("posts %d want %d: %v", n, posts, err)
	}
	return s
}

func TestScheduledPublicationLocksDraftAndPublishesOnce(t *testing.T) {
	a, h, cookie := testApp(t)
	at := scheduleFixture(t, a, h, cookie, scheduleContent(), nil)
	assertScheduled(t, a, "pending", 0)
	path := "/api/admin/drafts/" + draftKey
	for _, request := range []struct {
		method, path string
		body         any
	}{
		{"PUT", path, Draft{Revision: 1, MutationID: draftMutation, Payload: scheduleContent()}},
		{"DELETE", path, Object{"revision": 1}},
		{"POST", path + "/publish", Object{"revision": 1}},
	} {
		w, _ := call(t, h, request.method, request.path, request.body, cookie)
		status(t, w, 409)
	}
	w, _ := call(t, h, "PUT", path+"/schedule", Object{"revision": 0, "draft_revision": 1, "publish_at": at}, cookie)
	status(t, w, 200)
	if err := a.publishDue(context.Background(), time.Unix(at-1, 0)); err != nil {
		t.Fatal(err)
	}
	assertScheduled(t, a, "pending", 0)
	// Separate connections model simultaneous workers in two server processes.
	other, err := Open(a.data, a.dist, false)
	if err != nil {
		t.Fatal(err)
	}
	defer other.Close()
	var wg sync.WaitGroup
	results := make(chan error, 8)
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			worker := a
			if i%2 == 1 {
				worker = other
			}
			results <- worker.publishDue(context.Background(), time.Unix(at, 0))
		}(i)
	}
	wg.Wait()
	close(results)
	for err := range results {
		if err != nil {
			t.Fatal(err)
		}
	}
	s := assertScheduled(t, a, "published", 1)
	if s.CompletedAt == nil {
		t.Fatal("missing receipt time")
	}
	d, err := readDraft(a.db, 1, "id=?", draftKey)
	if err != nil || d.PublishedPostID == nil || d.PublishedAt == nil {
		t.Fatal("missing atomic draft receipt", err)
	}
	w, r := call(t, h, "POST", path+"/publish", Object{"revision": 1}, cookie)
	status(t, w, 200)
	if integer(object(r["data"])["id"]) != *d.PublishedPostID {
		t.Fatal("duplicate publication")
	}
	w, _ = call(t, h, "GET", fmt.Sprintf("/api/v1/visitor/blog/%d", *d.PublishedPostID), nil, nil)
	status(t, w, 200)
	assertScheduled(t, a, "published", 1)
	w, _ = call(t, h, "PUT", path+"/schedule", Object{"revision": 0, "draft_revision": 1, "publish_at": at}, cookie)
	status(t, w, 200)
}

func TestScheduleOwnerTimeValidationCancelAndReschedule(t *testing.T) {
	a, h, cookie := testApp(t)
	path := "/api/admin/drafts/" + draftKey + "/schedule"
	w, _ := call(t, h, "GET", "/api/admin/schedules", nil, nil)
	status(t, w, 401)
	w, _ = call(t, h, "PUT", path, Object{}, nil)
	status(t, w, 401)
	at := scheduleFixture(t, a, h, cookie, scheduleContent(), nil)
	otherToken := strings.Repeat("b", 64)
	_, err := a.db.Exec("INSERT INTO user(username,email,avatar,password) VALUES('other','other@example.com','',?)", legacyHash)
	if err == nil {
		_, err = a.db.Exec("INSERT INTO moment_sessions VALUES (?,2,?)", tokenDigest(otherToken), time.Now().Add(time.Hour).Unix())
	}
	if err != nil {
		t.Fatal(err)
	}
	otherCookie := &http.Cookie{Name: "moment_session", Value: otherToken}
	w, r := call(t, h, "GET", "/api/admin/schedules", nil, otherCookie)
	status(t, w, 200)
	if integer(r["total"]) != 0 {
		t.Fatal("owner content leaked")
	}
	w, _ = call(t, h, "PUT", path, Object{"revision": 1, "draft_revision": 1, "publish_at": at + 1}, otherCookie)
	status(t, w, 404)
	w, _ = call(t, h, "DELETE", path, Object{"revision": 1}, otherCookie)
	status(t, w, 409)
	req := httptest.NewRequest("DELETE", path, strings.NewReader(`{"revision":1}`))
	req.AddCookie(cookie)
	req.Header.Set("Origin", "https://untrusted.example")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	status(t, rec, 403)
	for _, due := range []int64{0, time.Now().Unix() - 1, time.Now().AddDate(6, 0, 0).Unix()} {
		w, _ = call(t, h, "PUT", path, Object{"revision": 1, "draft_revision": 1, "publish_at": due}, cookie)
		status(t, w, 400)
	}
	// Epoch instants from Shanghai wall clocks are not interpreted in the server's local zone.
	bj := time.Now().Add(2 * time.Hour).In(zone).Format(time.RFC3339)
	parsed, _ := time.Parse(time.RFC3339, bj)
	w, r = call(t, h, "PUT", path, Object{"revision": 1, "draft_revision": 1, "publish_at": parsed.Unix()}, cookie)
	status(t, w, 200)
	if integer(object(r["data"])["publish_at"]) != parsed.Unix() {
		t.Fatal("timezone shifted")
	}
	w, _ = call(t, h, "DELETE", path, Object{"revision": 1}, cookie)
	status(t, w, 409)
	w, _ = call(t, h, "DELETE", path, Object{"revision": 2}, cookie)
	status(t, w, 200)
	w, saved := call(t, h, "PUT", "/api/admin/drafts/"+draftKey, Draft{Revision: 1, MutationID: "137ded56-ec5c-431d-8b3f-ac58c1f5cfe8", Payload: scheduleContent()}, cookie)
	status(t, w, 200)
	if integer(object(object(saved["data"])["schedule"])["revision"]) != 3 {
		t.Fatal("autosave lost cancelled schedule revision")
	}
	if err = a.publishDue(context.Background(), time.Unix(at+86400, 0)); err != nil {
		t.Fatal(err)
	}
	assertScheduled(t, a, "cancelled", 0)
	w, _ = call(t, h, "PUT", path, Object{"revision": 3, "draft_revision": 2, "publish_at": at}, cookie)
	status(t, w, 200)
	w, r = call(t, h, "GET", "/api/admin/schedules?status=pending&q=Scheduled", nil, cookie)
	status(t, w, 200)
	if integer(r["total"]) != 1 {
		t.Fatal("filter")
	}
	w, _ = call(t, h, "PUT", path, Object{"revision": 3, "draft_revision": 1, "publish_at": at}, cookie)
	status(t, w, 409)
}

func TestScheduleValidationDoesNotWriteAndFailuresKeepDraft(t *testing.T) {
	for _, kind := range []string{"incomplete", "hidden", "no visible photo", "missing category", "foreign image"} {
		t.Run(kind, func(t *testing.T) {
			a, h, cookie := testApp(t)
			p := scheduleContent()
			switch kind {
			case "incomplete":
				p.Title = ""
			case "hidden":
				p.Hidden = true
			case "no visible photo":
				p.Images[0].Hidden = true
			case "missing category":
				p.Categories = []int64{999}
			case "foreign image":
				p.Images[0].ID = 999
			}
			w, _ := call(t, h, "PUT", "/api/admin/drafts/"+draftKey, Draft{MutationID: draftMutation, Payload: p}, cookie)
			status(t, w, 200)
			w, _ = call(t, h, "PUT", "/api/admin/drafts/"+draftKey+"/schedule", Object{"revision": 0, "draft_revision": 1, "publish_at": time.Now().Add(time.Hour).Unix()}, cookie)
			status(t, w, 400)
			var n int
			a.db.QueryRow("SELECT COUNT(*) FROM blog").Scan(&n)
			if n != 0 {
				t.Fatal("validation created post")
			}
		})
	}
	for _, kind := range []string{"post changed", "trash", "category removed", "write failure"} {
		t.Run(kind, func(t *testing.T) {
			a, h, cookie := testApp(t)
			p := scheduleContent()
			var existing *int64
			posts := 0
			if kind == "post changed" || kind == "trash" {
				id, img := seedPost(t, a, "Original", false, false)
				existing = &id
				p.Images[0].ID = img
				posts = 1
			}
			if kind == "category removed" {
				a.db.Exec("INSERT INTO category(name,alias) VALUES('A','a')")
				p.Categories = []int64{1}
			}
			at := scheduleFixture(t, a, h, cookie, p, existing)
			switch kind {
			case "post changed":
				a.db.Exec("INSERT INTO moment_post_revisions VALUES(?,1)", *existing)
			case "trash":
				w, _ := call(t, h, "DELETE", fmt.Sprintf("/api/admin/posts/%d", *existing), nil, cookie)
				status(t, w, 200)
			case "category removed":
				a.db.Exec("DELETE FROM category WHERE id=1")
			case "write failure":
				a.db.Exec("CREATE TRIGGER fail_schedule BEFORE INSERT ON blog_image BEGIN SELECT RAISE(ABORT, 'test injected failure'); END")
			}
			if err := a.publishDue(context.Background(), time.Unix(at, 0)); err != nil {
				t.Fatal(err)
			}
			s := assertScheduled(t, a, "failed", posts)
			if s.Error == "" {
				t.Fatal("missing failure reason")
			}
			d, err := readDraft(a.db, 1, "id=?", draftKey)
			if err != nil || d.PublishedAt != nil || d.Payload.Title != "Scheduled" {
				t.Fatal("failed draft lost", err)
			}
			if existing != nil {
				var title string
				a.db.QueryRow("SELECT title FROM blog WHERE id=?", *existing).Scan(&title)
				if title != "Original" {
					t.Fatal("overwrote newer content")
				}
			}
			if kind == "write failure" {
				a.db.Exec("DROP TRIGGER fail_schedule")
				w, _ := call(t, h, "PUT", "/api/admin/drafts/"+draftKey+"/schedule", Object{"revision": s.Revision, "draft_revision": 1, "publish_at": at}, cookie)
				status(t, w, 200)
				if err := a.publishDue(context.Background(), time.Unix(at, 0)); err != nil {
					t.Fatal(err)
				}
				assertScheduled(t, a, "published", 1)
			}
		})
	}
}

func TestSchedulerRestartAndBackupRestore(t *testing.T) {
	a, h, cookie := testApp(t)
	at := scheduleFixture(t, a, h, cookie, scheduleContent(), nil)
	backup, err := a.exportBackup(context.Background(), "manual")
	if err != nil {
		t.Fatal(err)
	}
	// Startup picks up an overdue persisted job without waiting for the first tick.
	_, err = a.db.Exec("UPDATE moment_schedules SET publish_at=?", time.Now().Add(-time.Hour).Unix())
	if err != nil {
		t.Fatal(err)
	}
	restarted, err := Open(a.data, a.dist, false)
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() { restarted.RunScheduler(ctx); close(done) }()
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		s, _ := readSchedule(a.db, draftKey)
		if s != nil && s.Status == "published" {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	cancel()
	<-done
	restarted.Close()
	assertScheduled(t, a, "published", 1)
	w, _ := call(t, h, "POST", "/api/admin/backups/"+backup.ID+"/restore", Object{"password": testPassword, "confirm": "恢复备份"}, cookie)
	status(t, w, 200)
	s := assertScheduled(t, a, "failed", 0)
	if !strings.Contains(s.Error, "备份") {
		t.Fatal("restore did not pause jobs")
	}
	if err = a.publishDue(context.Background(), time.Unix(at+86400, 0)); err != nil {
		t.Fatal(err)
	}
	assertScheduled(t, a, "failed", 0)
}

func TestScheduleReceiptFailureRollsBackContent(t *testing.T) {
	a, h, cookie := testApp(t)
	at := scheduleFixture(t, a, h, cookie, scheduleContent(), nil)
	if _, err := a.db.Exec("CREATE TRIGGER fail_receipt BEFORE UPDATE OF status ON moment_schedules WHEN NEW.status='published' BEGIN SELECT RAISE(ABORT, 'receipt failure'); END"); err != nil {
		t.Fatal(err)
	}
	if err := a.publishDue(context.Background(), time.Unix(at, 0)); err == nil {
		t.Fatal("expected receipt failure")
	}
	assertScheduled(t, a, "pending", 0)
	d, err := readDraft(a.db, 1, "id=?", draftKey)
	if err != nil || d.PublishedAt != nil {
		t.Fatal("receipt committed without job", err)
	}
	a.db.Exec("DROP TRIGGER fail_receipt")
	if err := a.publishDue(context.Background(), time.Unix(at, 0)); err != nil {
		t.Fatal(err)
	}
	assertScheduled(t, a, "published", 1)
}

func TestScheduledUpdatePreservesPhotoDetailsAndPublicationBoundary(t *testing.T) {
	a, h, cookie := testApp(t)
	id, img := seedPost(t, a, "Hidden original", true, false)
	if _, err := a.db.Exec("INSERT INTO category(name,alias) VALUES('Place','place')"); err != nil {
		t.Fatal(err)
	}
	focal, latitude, longitude := 24.0, 30.175, 118.175
	taken := "2025-01-01T00:00:00+08:00"
	p := PostInput{Title: "Now public", Time: &taken, Categories: []int64{1}, Discovery: &Discovery{Latitude: &latitude, Longitude: &longitude, Precision: "approximate", Timeline: "show"}, Images: []ImageInput{{ID: img, URL: "https://example.com/photo.jpg", FocusX: &focal, Time: &taken, Metadata: "preserved metadata"}, {URL: "https://example.com/private.jpg", Hidden: true}}}
	at := scheduleFixture(t, a, h, cookie, p, &id)
	w, _ := call(t, h, "GET", fmt.Sprintf("/api/v1/visitor/blog/%d", id), nil, nil)
	status(t, w, 404)
	var title string
	a.db.QueryRow("SELECT title FROM blog WHERE id=?", id).Scan(&title)
	if title != "Hidden original" {
		t.Fatal("validation changed original")
	}
	if err := a.publishDue(context.Background(), time.Unix(at, 0)); err != nil {
		t.Fatal(err)
	}
	w, r := call(t, h, "GET", fmt.Sprintf("/api/v1/visitor/blog/%d", id), nil, nil)
	status(t, w, 200)
	post := object(r["data"])
	if text(post["time"]) != "2025-01-01 00:00:00" || len(post["images"].([]any)) != 1 {
		t.Fatal("time or hidden image boundary", post)
	}
	var focus float64
	if err := a.db.QueryRow("SELECT focus_x FROM moment_image_focus WHERE image_id=?", img).Scan(&focus); err != nil || focus != 24 {
		t.Fatal("focus lost")
	}
	var precision string
	a.db.QueryRow("SELECT precision FROM moment_post_discovery WHERE post_id=?", id).Scan(&precision)
	if precision != "approximate" {
		t.Fatal("discovery lost")
	}
	var categories int
	a.db.QueryRow("SELECT COUNT(*) FROM blog_category WHERE blog_id=?", id).Scan(&categories)
	if categories != 1 {
		t.Fatal("categories lost")
	}
}
