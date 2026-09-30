package moment

import (
	"context"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"testing"
)

func discoveryInput(lat, lng float64, precision, timeline string) *Discovery {
	return &Discovery{Latitude: &lat, Longitude: &lng, Precision: precision, Timeline: timeline}
}
func discoveryData(t *testing.T, h http.Handler, path string) Object {
	t.Helper()
	w, r := call(t, h, "GET", "/api/v1/visitor/explore/"+path, nil, nil)
	status(t, w, 200)
	return object(r["data"])
}
func TestDiscoveryPrivacyPrecisionInheritanceAndPagination(t *testing.T) {
	a, h, admin := testApp(t)
	stamp := "2025-01-01T00:30:00+08:00"
	photoStamp := "2024-12-31T12:00:00Z"
	in := PostInput{Title: "Discovery", Time: &stamp, Discovery: discoveryInput(30.178912, 118.178912, "approximate", "show"), Images: []ImageInput{
		{URL: "https://example.com/inherit.jpg"},
		{URL: "https://example.com/private.jpg", Time: &photoStamp, Discovery: discoveryInput(45.123456, 80.987654, "private", "hide")},
		{URL: "https://example.com/exact.jpg", Time: &photoStamp, Discovery: discoveryInput(-33.912345, 151.212345, "exact", "show")},
		{URL: "https://example.com/hidden.jpg", Hidden: true, Discovery: discoveryInput(50, 50, "exact", "show")},
	}}
	w, r := call(t, h, "POST", "/api/admin/posts", in, admin)
	status(t, w, 200)
	id := integer(object(r["data"])["id"])
	w, detail := call(t, h, "GET", fmt.Sprintf("/api/admin/posts/%d", id), nil, admin)
	status(t, w, 200)
	post := object(detail["data"])
	imgs := post["images"].([]any)
	if object(post["discovery"])["latitude"] != 30.178912 || object(object(imgs[0])["discovery"])["precision"] != "inherit" {
		t.Fatal("editable discovery not preserved")
	}
	for _, path := range []string{fmt.Sprintf("/api/v1/visitor/blog/%d", id), "/api/v1/visitor/blog/list"} {
		w, _ = call(t, h, "GET", path, nil, nil)
		status(t, w, 200)
		for _, secret := range []string{"discovery", "30.178912", "45.123456", "80.987654"} {
			if strings.Contains(w.Body.String(), secret) {
				t.Fatalf("private location leaked through %s", path)
			}
		}
	}
	points := discoveryData(t, h, "points?zoom=18")["points"].([]any)
	if len(points) != 2 {
		t.Fatal("private/hidden points returned", points)
	}
	seenApprox := false
	for _, p := range points {
		if object(p)["latitude"] == 30.2 {
			seenApprox = true
			if object(p)["longitude"] != 118.2 {
				t.Fatal("longitude not reduced")
			}
		}
	}
	if !seenApprox {
		t.Fatal("approximate point missing", points)
	}
	// Tiny bounds around the raw coordinate must not act as a precision oracle.
	if integer(discoveryData(t, h, "photos?view=map&bounds=118.1789,30.1789,118.179,30.179")["total"]) != 0 {
		t.Fatal("raw coordinate used for public filtering")
	}
	rows := discoveryData(t, h, "photos?view=timeline&page_size=1")
	if integer(rows["total"]) != 2 || object(rows["photos"].([]any)[0])["time"] != "2025-01-01 00:30:00" {
		t.Fatal("timeline ordering/inheritance", rows)
	}
	second := discoveryData(t, h, "photos?view=timeline&page=2&page_size=1")
	if object(second["photos"].([]any)[0])["time"] != "2024-12-31 20:00:00" {
		t.Fatal("Shanghai time normalization", second)
	}
	if integer(discoveryData(t, h, "photos?year=2024")["total"]) != 1 {
		t.Fatal("year filter")
	}
	// Old clients omit the new fields: preserve both post and image preferences.
	in.Discovery = nil
	for i := range in.Images {
		in.Images[i].ID = integer(object(imgs[i])["id"])
		in.Images[i].Discovery = nil
	}
	w, _ = call(t, h, "PUT", fmt.Sprintf("/api/admin/posts/%d", id), in, admin)
	status(t, w, 200)
	if len(discoveryData(t, h, "points")["points"].([]any)) != 2 {
		t.Fatal("old client erased location preferences")
	}
	in.Discovery = discoveryInput(30, 118, "private", "hide")
	in.Images[1].Discovery = &Discovery{Precision: "inherit", Timeline: "inherit"}
	w, _ = call(t, h, "PUT", fmt.Sprintf("/api/admin/posts/%d", id), in, admin)
	status(t, w, 200)
	if integer(discoveryData(t, h, "photos")["total"]) != 1 || integer(discoveryData(t, h, "photos?view=map")["total"]) != 1 {
		t.Fatal("explicit photo overrides must survive parent privacy")
	}
	// Hidden and trashed posts cannot appear in either discovery mode.
	in.Hidden = true
	w, _ = call(t, h, "PUT", fmt.Sprintf("/api/admin/posts/%d", id), in, admin)
	status(t, w, 200)
	if integer(discoveryData(t, h, "photos")["total"]) != 0 || len(discoveryData(t, h, "points")["points"].([]any)) != 0 {
		t.Fatal("hidden post leaked")
	}
	in.Hidden = false
	w, _ = call(t, h, "PUT", fmt.Sprintf("/api/admin/posts/%d", id), in, admin)
	status(t, w, 200)
	w, _ = call(t, h, "DELETE", fmt.Sprintf("/api/admin/posts/%d", id), nil, admin)
	status(t, w, 200)
	if integer(discoveryData(t, h, "photos")["total"]) != 0 || len(discoveryData(t, h, "points")["points"].([]any)) != 0 {
		t.Fatal("trash leaked")
	}
	var count int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM moment_image_discovery").Scan(&count); err != nil || count != 3 {
		t.Fatal("trash destroyed coordinates")
	}
}
func TestDiscoveryUnknownDatesDatelineAndValidation(t *testing.T) {
	a, h, admin := testApp(t)
	for _, lng := range []float64{-179.5, 179.5, 0} {
		w, _ := call(t, h, "POST", "/api/admin/posts", PostInput{Title: "Untimed", Discovery: discoveryInput(0, lng, "exact", "show"), Images: []ImageInput{{URL: "https://example.com/a.jpg"}}}, admin)
		status(t, w, 200)
	}
	if integer(discoveryData(t, h, "photos?year=unknown")["total"]) != 3 {
		t.Fatal("unknown dates lost")
	}
	if integer(discoveryData(t, h, "photos?view=map&bounds=170,-10,-170,10")["total"]) != 2 {
		t.Fatal("antimeridian bounds incorrect")
	}
	w, r := call(t, h, "GET", "/api/v1/visitor/explore/years", nil, nil)
	status(t, w, 200)
	if text(object(r["data"].([]any)[0])["year"]) != "unknown" {
		t.Fatal("unknown year missing")
	}
	for _, path := range []string{"photos?view=secret", "photos?year=2024x", "photos?year=0000", "photos?page=0", "photos?view=map&bounds=NaN,0,1,1", "photos?view=map&bounds=0,50,20,20", "points?zoom=19", "points?bounds=0,0,1"} {
		w, _ := call(t, h, "GET", "/api/v1/visitor/explore/"+path, nil, nil)
		status(t, w, 400)
	}
	for _, d := range []*Discovery{discoveryInput(91, 10, "exact", "show"), discoveryInput(1, 181, "exact", "show"), discoveryInput(1, 1, "inherit", "show"), discoveryInput(1, 1, "exact", "inherit"), {Latitude: new(float64), Precision: "private", Timeline: "show"}} {
		w, _ := call(t, h, "POST", "/api/admin/posts", PostInput{Title: "Bad", Discovery: d, Images: []ImageInput{{URL: "https://example.com/a.jpg"}}}, admin)
		status(t, w, 400)
	}
	w, _ = call(t, h, "PATCH", "/api/admin/settings/content", Object{"map_enabled": false, "timeline_enabled": false}, admin)
	status(t, w, 200)
	for _, path := range []string{"photos?view=map", "points", "photos", "years"} {
		w, _ := call(t, h, "GET", "/api/v1/visitor/explore/"+path, nil, nil)
		status(t, w, 404)
	}
	w, _ = call(t, h, "PATCH", "/api/admin/settings/content", Object{"map_enabled": "true"}, admin)
	status(t, w, 400)
	var count int
	_ = a.db.QueryRow("SELECT COUNT(*) FROM blog").Scan(&count)
	if count != 3 {
		t.Fatal("invalid writes changed database")
	}
}
func TestDiscoveryDraftBackupRollbackAndOlderUpgrade(t *testing.T) {
	a, h, admin := testApp(t)
	in := PostInput{Title: "Draft map", Discovery: discoveryInput(10.123, 20.456, "approximate", "show"), Images: []ImageInput{{URL: "https://example.com/a.jpg", Discovery: discoveryInput(-10.456, -20.789, "private", "inherit")}, {URL: "https://example.com/b.jpg"}}}
	draft := Draft{MutationID: draftMutation, Payload: in}
	w, _ := call(t, h, "PUT", "/api/admin/drafts/"+draftKey, draft, admin)
	status(t, w, 200)
	if integer(discoveryData(t, h, "photos")["total"]) != 0 {
		t.Fatal("draft leaked")
	}
	w, r := call(t, h, "GET", "/api/admin/drafts/"+draftKey, nil, admin)
	status(t, w, 200)
	if object(object(object(r["data"])["payload"])["discovery"])["latitude"] != 10.123 {
		t.Fatal("autosave lost coordinates")
	}
	w, r = call(t, h, "POST", "/api/admin/drafts/"+draftKey+"/publish", Object{"revision": 1}, admin)
	status(t, w, 200)
	id := integer(object(r["data"])["id"])
	w, r = call(t, h, "GET", fmt.Sprintf("/api/admin/posts/%d", id), nil, admin)
	status(t, w, 200)
	imgs := object(r["data"])["images"].([]any)
	for i := range in.Images {
		in.Images[i].ID = integer(object(imgs[i])["id"])
	}
	in.Discovery = discoveryInput(70, 80, "exact", "show")
	in.Images[1].ID = 99999
	w, _ = call(t, h, "PUT", fmt.Sprintf("/api/admin/posts/%d", id), in, admin)
	status(t, w, 400)
	if object(discoveryData(t, h, "points")["points"].([]any)[0])["latitude"] != 10.1 {
		t.Fatal("failed post write partially changed discovery")
	}
	info, err := a.exportBackup(context.Background(), "manual")
	if err != nil {
		t.Fatal(err)
	}
	dir := t.TempDir()
	if _, _, err = unpackBackup(context.Background(), a.backupPath(info.ID), dir); err != nil {
		t.Fatal(err)
	}
	restored, err := Open(dir, t.TempDir(), false)
	if err != nil {
		t.Fatal(err)
	}
	defer restored.Close()
	if integer(discoveryData(t, restored.Router(), "photos?view=map")["total"]) != 1 {
		t.Fatal("backup lost discovery")
	}
	var lat float64
	if err = restored.db.QueryRow("SELECT latitude FROM moment_image_discovery LIMIT 1").Scan(&lat); err != nil || lat != -10.456 {
		t.Fatal("private data not preserved in backup")
	}
	for _, q := range []string{"DROP TABLE moment_passkey_challenges", "DROP TABLE moment_passkeys", "DROP TABLE moment_passkey_users", "DROP TABLE moment_passkey_config", "DROP TABLE moment_schedules", "DROP TABLE moment_image_discovery", "DROP TABLE moment_post_discovery", "DELETE FROM moment_schema_migrations WHERE version>='007_discovery.sql'"} {
		if _, err = restored.db.Exec(q); err != nil {
			t.Fatal(err)
		}
	}
	if _, err = validateBackupDB(context.Background(), filepath.Join(dir, "db.sqlite3")); err != nil {
		t.Fatal(err)
	}
	if err = restored.initialize(); err != nil {
		t.Fatal(err)
	}
	if integer(discoveryData(t, restored.Router(), "photos?view=map")["total"]) != 0 || integer(discoveryData(t, restored.Router(), "photos")["total"]) != 2 {
		t.Fatal("old backup upgrade defaults changed")
	}
}
