package moment

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"hash/crc32"
	"image"
	"image/color"
	"image/gif"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func dropDuplicateSchema(t *testing.T, a *App) {
	t.Helper()
	dropPhotoTagSchema(t, a)
	for _, table := range []string{"moment_duplicate_members", "moment_duplicate_groups", "moment_duplicate_items", "moment_duplicate_scans", "moment_duplicate_ignored", "moment_photo_analysis_cache", "moment_photo_actions"} {
		if _, err := a.db.Exec("DROP TABLE " + table); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := a.db.Exec("DELETE FROM moment_schema_migrations WHERE version='010_duplicates.sql'"); err != nil {
		t.Fatal(err)
	}
}
func duplicateFixture(t *testing.T, variant bool) []byte {
	t.Helper()
	img := image.NewNRGBA(image.Rect(0, 0, 160, 120))
	for y := 0; y < 120; y++ {
		for x := 0; x < 160; x++ {
			red, green, blue := uint8(x*255/159), uint8(y*255/119), uint8((x+y)%70+90)
			if x > 30 && x < 100 && y > 20 && y < 90 {
				red = 30
				green = 110
				blue = 200
			}
			if variant {
				red, blue = blue, red
				green = 255 - green
			}
			img.SetNRGBA(x, y, color.NRGBA{red, green, blue, 255})
		}
	}
	var buffer bytes.Buffer
	if err := png.Encode(&buffer, img); err != nil {
		t.Fatal(err)
	}
	return buffer.Bytes()
}
func duplicatePost(t *testing.T, a *App, title, url string) (int64, int64) {
	t.Helper()
	post, photo := seedPost(t, a, title, false, false)
	if _, err := a.db.Exec("UPDATE blog_image SET image_url=? WHERE id=?", url, photo); err != nil {
		t.Fatal(err)
	}
	return post, photo
}
func duplicateFile(t *testing.T, a *App, name string, data []byte) {
	t.Helper()
	if err := os.MkdirAll(filepath.Join(a.data, "uploads"), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(a.data, "uploads", name), data, 0600); err != nil {
		t.Fatal(err)
	}
}
func runDuplicateScan(t *testing.T, h http.Handler, cookie *http.Cookie, remote bool) string {
	t.Helper()
	w, result := call(t, h, "POST", "/api/admin/duplicates/scans", Object{"remote": remote}, cookie)
	status(t, w, 200)
	id := text(object(result["data"])["id"])
	for i := 0; i < 200; i++ {
		w, result = call(t, h, "POST", "/api/admin/duplicates/scans/"+id+"/step", Object{}, cookie)
		status(t, w, 200)
		if text(object(result["data"])["status"]) == "ready" {
			return id
		}
	}
	t.Fatal("scan did not finish")
	return ""
}
func duplicateResults(t *testing.T, h http.Handler, cookie *http.Cookie, scan, kind string) []any {
	t.Helper()
	w, result := call(t, h, "GET", "/api/admin/duplicates/scans/"+scan+"/groups?kind="+kind, nil, cookie)
	status(t, w, 200)
	return result["data"].([]any)
}

func TestPhotoFingerprint(t *testing.T) {
	ctx := context.Background()
	original := duplicateFixture(t, false)
	first := analyzePhotoBytes(ctx, original)
	decoded, _, err := image.Decode(bytes.NewReader(original))
	if err != nil {
		t.Fatal(err)
	}
	var recompressed bytes.Buffer
	if err = jpeg.Encode(&recompressed, decoded, &jpeg.Options{Quality: 70}); err != nil {
		t.Fatal(err)
	}
	other := analyzePhotoBytes(ctx, recompressed.Bytes())
	if first.SHA == other.SHA || first.Hash == "" {
		t.Fatal("file hashes did not distinguish recompression")
	}
	if d, similar := visualDistance(first, other); !similar {
		t.Fatalf("ordinary JPEG recompression not detected: %d", d)
	}
	unrelated := analyzePhotoBytes(ctx, duplicateFixture(t, true))
	if _, same := visualDistance(first, unrelated); same {
		t.Fatal("unrelated fixture matched")
	}
	var animated bytes.Buffer
	if err = gif.Encode(&animated, decoded, nil); err != nil {
		t.Fatal(err)
	}
	animation := analyzePhotoBytes(ctx, animated.Bytes())
	if animation.SHA == "" || animation.Hash != "" || animation.Reason == "" {
		t.Fatal("GIF not limited to exact content")
	}
	invalid := analyzePhotoBytes(ctx, []byte("<html>login page</html>"))
	if invalid.SHA != "" || invalid.Hash != "" {
		t.Fatal("HTML misclassified as duplicate image")
	}
	cancelled, cancel := context.WithCancel(ctx)
	cancel()
	if analyzePhotoBytes(cancelled, original).Hash != "" {
		t.Fatal("cancelled analysis decoded pixels")
	}
}

func TestDuplicateScanAndReversibleHide(t *testing.T) {
	a, h, admin := testApp(t)
	data := duplicateFixture(t, false)
	duplicateFile(t, a, "one.png", data)
	duplicateFile(t, a, "copy.png", data)
	p1, i1 := duplicatePost(t, a, "Reference", "/uploads/one.png")
	p2, i2 := duplicatePost(t, a, "Duplicate", "/uploads/copy.png")
	scan := runDuplicateScan(t, h, admin, false)
	groups := duplicateResults(t, h, admin, scan, "file")
	if len(groups) != 1 {
		t.Fatal("expected one exact group", groups)
	}
	group := object(groups[0])
	path := fmt.Sprintf("/api/admin/duplicates/scans/%s/groups/%d", scan, integer(group["id"]))
	w, result := call(t, h, "GET", path, nil, admin)
	status(t, w, 200)
	if integer(object(result["data"])["total"]) != 2 {
		t.Fatal("missing group members")
	}
	action := strings.Repeat("b", 32)
	input := Object{"id": action, "confirm": true, "targets": []Object{{"id": i2, "revision": 0}}}
	w, _ = call(t, h, "POST", path+"/hide", input, admin)
	status(t, w, 200)
	w, _ = call(t, h, "POST", path+"/hide", input, admin)
	status(t, w, 200)
	var hidden, revision int
	if err := a.db.QueryRow("SELECT is_hidden FROM blog_image WHERE id=?", i2).Scan(&hidden); err != nil || hidden != 1 {
		t.Fatal("photo not hidden", err)
	}
	if err := a.db.QueryRow("SELECT revision FROM moment_post_revisions WHERE post_id=?", p2).Scan(&revision); err != nil || revision != 1 {
		t.Fatal("retry changed revision", err)
	}
	w, _ = call(t, h, "GET", fmt.Sprintf("/api/v1/visitor/blog/%d", p2), nil, nil)
	status(t, w, 404)
	w, _ = call(t, h, "GET", fmt.Sprintf("/api/v1/visitor/blog/%d", p1), nil, nil)
	status(t, w, 200)
	w, _ = call(t, h, "POST", "/api/admin/photo-actions/"+action+"/undo", Object{}, admin)
	status(t, w, 200)
	w, _ = call(t, h, "POST", "/api/admin/photo-actions/"+action+"/undo", Object{}, admin)
	status(t, w, 200)
	if err := a.db.QueryRow("SELECT is_hidden FROM blog_image WHERE id=?", i2).Scan(&hidden); err != nil || hidden != 0 {
		t.Fatal("undo failed", err)
	}
	if err := a.db.QueryRow("SELECT revision FROM moment_post_revisions WHERE post_id=?", p2).Scan(&revision); err != nil || revision != 2 {
		t.Fatal("undo retry changed revision", err)
	}
	w, _ = call(t, h, "POST", path+"/hide", Object{"id": strings.Repeat("c", 32), "confirm": true, "targets": []Object{{"id": i1, "revision": 0}, {"id": i2, "revision": 2}}}, admin)
	status(t, w, 400)
	if after, err := os.ReadFile(filepath.Join(a.data, "uploads", "copy.png")); err != nil || sha256.Sum256(after) != sha256.Sum256(data) {
		t.Fatal("original file changed", err)
	}
}

func TestDuplicatePrivacyScopeAndIgnore(t *testing.T) {
	a, h, admin := testApp(t)
	p, _ := duplicatePost(t, a, "Trashed", "https://example.com/same.png")
	duplicatePost(t, a, "Hidden", "https://example.com/same.png")
	duplicatePost(t, a, "Visible", "https://example.com/same.png")
	if _, err := a.db.Exec("UPDATE blog SET is_hidden=1 WHERE title='Hidden'"); err != nil {
		t.Fatal(err)
	}
	w, _ := call(t, h, "DELETE", fmt.Sprintf("/api/admin/posts/%d", p), nil, admin)
	status(t, w, 200)
	w, _ = call(t, h, "POST", "/api/admin/duplicates/scans", Object{}, nil)
	status(t, w, 401)
	scan := runDuplicateScan(t, h, admin, false)
	groups := duplicateResults(t, h, admin, scan, "link")
	if len(groups) != 1 || integer(object(groups[0])["count"]) != 2 {
		t.Fatal("scan scope changed", groups)
	}
	path := fmt.Sprintf("/api/admin/duplicates/scans/%s/groups/%d/ignore", scan, integer(object(groups[0])["id"]))
	w, _ = call(t, h, "PUT", path, Object{"ignored": true}, admin)
	status(t, w, 200)
	if len(duplicateResults(t, h, admin, scan, "link")) != 0 {
		t.Fatal("ignore not applied")
	}
	scan = runDuplicateScan(t, h, admin, false)
	if len(duplicateResults(t, h, admin, scan, "link")) != 0 {
		t.Fatal("ignore lost on rescan")
	}
	w, result := call(t, h, "GET", "/api/admin/duplicates/scans/"+scan+"/groups?ignored=true", nil, admin)
	status(t, w, 200)
	if integer(result["total"]) != 1 {
		t.Fatal("ignored group missing")
	}
	group := object(result["data"].([]any)[0])
	path = fmt.Sprintf("/api/admin/duplicates/scans/%s/groups/%d/ignore", scan, integer(group["id"]))
	w, _ = call(t, h, "PUT", path, Object{"ignored": false}, admin)
	status(t, w, 200)
	if _, err := a.db.Exec("INSERT INTO user(username,email,avatar,password) VALUES('other','other@example.com','',?)", legacyHash); err != nil {
		t.Fatal(err)
	}
	other := &http.Cookie{Name: "moment_session", Value: strings.Repeat("d", 64)}
	if _, err := a.db.Exec("INSERT INTO moment_sessions VALUES(?,2,?)", tokenDigest(other.Value), time.Now().Add(time.Hour).Unix()); err != nil {
		t.Fatal(err)
	}
	for _, suffix := range []string{"", "/groups", "/issues"} {
		w, _ = call(t, h, "GET", "/api/admin/duplicates/scans/"+scan+suffix, nil, other)
		status(t, w, 404)
	}
	w, _ = call(t, h, "PUT", path, Object{"ignored": true}, other)
	status(t, w, 404)
}

type analysisRoundTrip func(*http.Request) (*http.Response, error)

func (f analysisRoundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func TestPhotoAnalysisRemoteAndLocalBoundaries(t *testing.T) {
	a, _, _ := testApp(t)
	data := duplicateFixture(t, false)
	var calls atomic.Int32
	a.analysisHTTP = &http.Client{Transport: analysisRoundTrip(func(request *http.Request) (*http.Response, error) {
		calls.Add(1)
		if request.Header.Get("Authorization") != "" || request.Header.Get("Cookie") != "" {
			t.Fatal("credentials leaked")
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(bytes.NewReader(data)), Header: http.Header{}, ContentLength: int64(len(data))}, nil
	})}
	result := a.fingerprintPhoto(context.Background(), "https://example.com/photo.png", false)
	if calls.Load() != 0 || result.Reason == "" {
		t.Fatal("remote read without opt-in")
	}
	result = a.fingerprintPhoto(context.Background(), "https://example.com/photo.png", true)
	if calls.Load() != 1 || result.SHA == "" || result.Hash == "" {
		t.Fatal("remote scan failed", result)
	}
	for _, url := range []string{"http://127.0.0.1/a", "http://169.254.169.254/latest", "http://[::1]/a", "http://192.168.1.2/a", "http://localhost/a", "http://user:pass@example.com/a", "file:///etc/passwd"} {
		if _, err := analysisURL(url); err == nil {
			t.Fatal("unsafe URL allowed", url)
		}
	}
	for _, ip := range []string{"127.0.0.1", "10.0.0.1", "100.64.0.1", "::ffff:127.0.0.1", "fe80::1", "fc00::1", "64:ff9b::a00:1", "2002:7f00:1::"} {
		if publicAnalysisAddress(netip.MustParseAddr(ip)) {
			t.Fatal("unsafe address", ip)
		}
	}
	if !publicAnalysisAddress(netip.MustParseAddr("1.1.1.1")) {
		t.Fatal("public address denied")
	}
	client := analysisHTTPClient()
	r := httptest.NewRequest("GET", "http://127.0.0.1/private", nil)
	if err := client.CheckRedirect(r, []*http.Request{r}); err == nil {
		t.Fatal("redirect to private network allowed")
	}
	client.CloseIdleConnections()
	duplicateFile(t, a, "valid.png", data)
	result = a.fingerprintPhoto(context.Background(), "/uploads/valid.png", false)
	if result.Hash == "" {
		t.Fatal("local image not decoded")
	}
	for _, url := range []string{"/uploads/../db.sqlite3", "/uploads/%2e%2e/db.sqlite3", "/uploads/missing.png"} {
		if result = a.fingerprintPhoto(context.Background(), url, false); result.SHA != "" || result.Reason == "" {
			t.Fatal("invalid local source accepted", url)
		}
	}
	target := filepath.Join(t.TempDir(), "secret.png")
	if err := os.WriteFile(target, data, 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(target, filepath.Join(a.data, "uploads", "outside.png")); err == nil {
		if result = a.fingerprintPhoto(context.Background(), "/uploads/outside.png", false); result.SHA != "" {
			t.Fatal("escaped uploads root")
		}
	}
}

func TestDuplicatePauseLeaseAndRestart(t *testing.T) {
	a, h, admin := testApp(t)
	duplicatePost(t, a, "One", "https://example.com/same.png")
	duplicatePost(t, a, "Two", "https://example.com/same.png")
	w, result := call(t, h, "POST", "/api/admin/duplicates/scans", Object{}, admin)
	status(t, w, 200)
	scan := text(object(result["data"])["id"])
	path := "/api/admin/duplicates/scans/" + scan
	w, _ = call(t, h, "POST", "/api/admin/duplicates/scans", Object{}, admin)
	status(t, w, 409)
	w, _ = call(t, h, "POST", path+"/step", Object{}, admin)
	status(t, w, 200)
	if _, err := a.db.Exec("UPDATE moment_duplicate_scans SET lease_token='other',lease_until=? WHERE id=?", time.Now().Add(time.Minute).Unix(), scan); err != nil {
		t.Fatal(err)
	}
	w, _ = call(t, h, "POST", path+"/step", Object{}, admin)
	status(t, w, 409)
	if _, err := a.db.Exec("UPDATE moment_duplicate_scans SET lease_until=0 WHERE id=?", scan); err != nil {
		t.Fatal(err)
	}
	reopened, err := Open(a.data, a.dist, false)
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	w, _ = call(t, reopened.Router(), "POST", path+"/step", Object{}, admin)
	status(t, w, 200)
	w, result = call(t, reopened.Router(), "POST", path+"/step", Object{}, admin)
	status(t, w, 200)
	if text(object(result["data"])["status"]) != "ready" {
		t.Fatal("restart could not continue")
	}
	w, result = call(t, h, "POST", "/api/admin/duplicates/scans", Object{}, admin)
	status(t, w, 200)
	id := text(object(result["data"])["id"])
	w, _ = call(t, h, "POST", "/api/admin/duplicates/scans/"+id+"/cancel", Object{}, admin)
	status(t, w, 200)
	w, result = call(t, h, "POST", "/api/admin/duplicates/scans/"+id+"/step", Object{}, admin)
	status(t, w, 200)
	if text(object(result["data"])["status"]) != "cancelled" {
		t.Fatal("cancelled job resumed")
	}
}

func TestDuplicateConflictRollbackAndBackup(t *testing.T) {
	a, h, admin := testApp(t)
	data := duplicateFixture(t, false)
	duplicateFile(t, a, "same.png", data)
	p1, i1 := duplicatePost(t, a, "One", "/uploads/same.png")
	_, i2 := duplicatePost(t, a, "Two", "/uploads/same.png")
	duplicatePost(t, a, "Three", "/uploads/same.png")
	scan := runDuplicateScan(t, h, admin, false)
	group := object(duplicateResults(t, h, admin, scan, "file")[0])
	path := fmt.Sprintf("/api/admin/duplicates/scans/%s/groups/%d/hide", scan, integer(group["id"]))
	if _, err := a.db.Exec("INSERT INTO moment_post_revisions VALUES(?,1)", p1); err != nil {
		t.Fatal(err)
	}
	targets := []Object{{"id": i1, "revision": 0}, {"id": i2, "revision": 0}}
	input := Object{"id": strings.Repeat("e", 32), "confirm": true, "targets": targets}
	w, _ := call(t, h, "POST", path, input, admin)
	status(t, w, 409)
	var hidden int
	if err := a.db.QueryRow("SELECT SUM(is_hidden) FROM blog_image").Scan(&hidden); err != nil || hidden != 0 {
		t.Fatal("conflict partially wrote", err)
	}
	targets[0]["revision"] = 1
	if _, err := a.db.Exec("CREATE TRIGGER fail_hide BEFORE INSERT ON moment_photo_actions BEGIN SELECT RAISE(ABORT,'fixture rollback'); END"); err != nil {
		t.Fatal(err)
	}
	w, _ = call(t, h, "POST", path, input, admin)
	status(t, w, 500)
	if err := a.db.QueryRow("SELECT SUM(is_hidden) FROM blog_image").Scan(&hidden); err != nil || hidden != 0 {
		t.Fatal("transaction did not rollback", err)
	}
	if _, err := a.db.Exec("DROP TRIGGER fail_hide"); err != nil {
		t.Fatal(err)
	}
	w, _ = call(t, h, "POST", path, input, admin)
	status(t, w, 200)
	info, err := a.exportBackup(context.Background(), "manual")
	if err != nil {
		t.Fatal(err)
	}
	w, _ = call(t, h, "POST", "/api/admin/photo-actions/"+strings.Repeat("e", 32)+"/undo", Object{}, admin)
	status(t, w, 200)
	w, _ = call(t, h, "POST", "/api/admin/backups/"+info.ID+"/restore", Object{"password": testPassword, "confirm": "恢复备份"}, admin)
	status(t, w, 200)
	w, _ = call(t, h, "POST", "/api/admin/login", Object{"username": "tester", "password": testPassword}, nil)
	status(t, w, 200)
	admin = w.Result().Cookies()[0]
	w, result := call(t, h, "GET", "/api/admin/duplicates/scans/latest", nil, admin)
	status(t, w, 200)
	if text(object(result["data"])["status"]) != "cancelled" {
		t.Fatal("restored scan not invalidated")
	}
	w, _ = call(t, h, "POST", "/api/admin/photo-actions/"+strings.Repeat("e", 32)+"/undo", Object{}, admin)
	status(t, w, 200)
	if err := a.db.QueryRow("SELECT SUM(is_hidden) FROM blog_image").Scan(&hidden); err != nil || hidden != 0 {
		t.Fatal("restored history cannot undo", err)
	}
	dropDuplicateSchema(t, a)
	if _, err = validateBackupDB(context.Background(), filepath.Join(a.data, "db.sqlite3")); err != nil {
		t.Fatal(err)
	}
	if err = a.initialize(); err != nil {
		t.Fatal(err)
	}
	var total int
	if err = a.db.QueryRow("SELECT COUNT(*) FROM moment_duplicate_scans").Scan(&total); err != nil || total != 0 {
		t.Fatal("old schema upgrade failed", err)
	}
}

func TestDuplicateSimilarGroupsDoNotHideExactGroups(t *testing.T) {
	original := analyzePhotoBytes(context.Background(), duplicateFixture(t, false))
	variant := original
	variant.SHA = "reencoded"
	variant.Hash = original.Hash
	groups, err := clusterDuplicates(context.Background(), []duplicateImage{{1, "/one", original}, {2, "/two", original}, {3, "/three", variant}})
	if err != nil {
		t.Fatal(err)
	}
	if len(groups) != 2 || groups[0].Kind != "file" || groups[1].Kind != "similar" || len(groups[0].Images) != 2 || len(groups[1].Images) != 3 {
		t.Fatal("exact duplicates lost inside similar group", groups)
	}
}

func TestDuplicateSamePostRevisionAndUndoConflict(t *testing.T) {
	a, h, admin := testApp(t)
	duplicateFile(t, a, "same.png", duplicateFixture(t, false))
	w, created := call(t, h, "POST", "/api/admin/posts", PostInput{Title: "Several photos", Images: []ImageInput{{URL: "/uploads/same.png"}, {URL: "/uploads/same.png"}, {URL: "/uploads/same.png"}}}, admin)
	status(t, w, 200)
	id := integer(object(created["data"])["id"])
	w, detail := call(t, h, "GET", fmt.Sprintf("/api/admin/posts/%d", id), nil, admin)
	status(t, w, 200)
	post := object(detail["data"])
	photos := post["images"].([]any)
	revision := integer(post["revision"])
	scan := runDuplicateScan(t, h, admin, false)
	group := object(duplicateResults(t, h, admin, scan, "file")[0])
	targets := []Object{{"id": object(photos[0])["id"], "revision": revision}, {"id": object(photos[1])["id"], "revision": revision}}
	action := strings.Repeat("f", 32)
	w, _ = call(t, h, "POST", fmt.Sprintf("/api/admin/duplicates/scans/%s/groups/%d/hide", scan, integer(group["id"])), Object{"id": action, "confirm": true, "targets": targets}, admin)
	status(t, w, 200)
	var actual int64
	if err := a.db.QueryRow("SELECT revision FROM moment_post_revisions WHERE post_id=?", id).Scan(&actual); err != nil || actual != revision+1 {
		t.Fatal("same post was revised more than once", actual, err)
	}
	// A later edit must not be overwritten by an older undo receipt.
	if _, err := a.db.Exec("UPDATE moment_post_revisions SET revision=revision+1 WHERE post_id=?", id); err != nil {
		t.Fatal(err)
	}
	w, _ = call(t, h, "POST", "/api/admin/photo-actions/"+action+"/undo", Object{}, admin)
	status(t, w, 409)
	var hidden int
	if err := a.db.QueryRow("SELECT SUM(is_hidden) FROM blog_image WHERE blog_id=?", id).Scan(&hidden); err != nil || hidden != 2 {
		t.Fatal("conflicting undo changed photos", hidden, err)
	}
}

type analysisCountingReader struct{ bytes int64 }

func (r *analysisCountingReader) Read(p []byte) (int, error) {
	clear(p)
	r.bytes += int64(len(p))
	return len(p), nil
}

func TestPhotoAnalysisResourceLimitsAndCacheInvalidation(t *testing.T) {
	a, _, _ := testApp(t)
	stream := &analysisCountingReader{}
	a.analysisHTTP = &http.Client{Transport: analysisRoundTrip(func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 200, Body: io.NopCloser(stream), Header: http.Header{}, ContentLength: -1}, nil
	})}
	result := a.fingerprintPhoto(context.Background(), "https://example.com/chunked.png", true)
	if result.SHA != "" || !strings.Contains(result.Reason, "32 MB") || stream.bytes != analysisBytes+1 {
		t.Fatal("unbounded remote response", result, stream.bytes)
	}
	// A valid PNG header declaring huge dimensions must never reach image.Decode.
	oversized := duplicateFixture(t, false)
	binary.BigEndian.PutUint32(oversized[16:20], 16000)
	binary.BigEndian.PutUint32(oversized[20:24], 16000)
	binary.BigEndian.PutUint32(oversized[29:33], crc32.ChecksumIEEE(oversized[12:29]))
	result = analyzePhotoBytes(context.Background(), oversized)
	if result.SHA == "" || result.Hash != "" || !strings.Contains(result.Reason, "3200 万像素") {
		t.Fatal("oversized picture was decoded", result)
	}
	duplicateFile(t, a, "changing.png", duplicateFixture(t, false))
	first := a.fingerprintPhoto(context.Background(), "/uploads/changing.png", false)
	duplicateFile(t, a, "changing.png", duplicateFixture(t, true))
	stamp := time.Now().Add(time.Second)
	if err := os.Chtimes(filepath.Join(a.data, "uploads", "changing.png"), stamp, stamp); err != nil {
		t.Fatal(err)
	}
	second := a.fingerprintPhoto(context.Background(), "/uploads/changing.png", false)
	if first.SHA == "" || second.SHA == "" || first.SHA == second.SHA {
		t.Fatal("changed source reused stale analysis")
	}
	client := analysisHTTPClient()
	defer client.CloseIdleConnections()
	transport := client.Transport.(*http.Transport)
	if conn, err := transport.DialContext(context.Background(), "tcp", "localhost:80"); err == nil {
		conn.Close()
		t.Fatal("resolved loopback address was allowed")
	}
}

func TestDuplicateConcurrentStepAndCancelledRead(t *testing.T) {
	a, h, admin := testApp(t)
	duplicatePost(t, a, "Remote", "https://example.com/a.png")
	started := make(chan struct{})
	a.analysisHTTP = &http.Client{Transport: analysisRoundTrip(func(r *http.Request) (*http.Response, error) {
		close(started)
		<-r.Context().Done()
		return nil, r.Context().Err()
	})}
	w, created := call(t, h, "POST", "/api/admin/duplicates/scans", Object{"remote": true}, admin)
	status(t, w, 200)
	id := text(object(created["data"])["id"])
	path := "/api/admin/duplicates/scans/" + id + "/step"
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	request := httptest.NewRequest("POST", path, strings.NewReader("{}")).WithContext(ctx)
	request.Header.Set("Content-Type", "application/json")
	request.AddCookie(admin)
	finished := make(chan struct{})
	go func() { defer close(finished); h.ServeHTTP(httptest.NewRecorder(), request) }()
	select {
	case <-started:
	case <-time.After(5 * time.Second):
		t.Fatal("scan never started")
	}
	reopened, err := Open(a.data, a.dist, false)
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	w, _ = call(t, reopened.Router(), "POST", path, Object{}, admin)
	status(t, w, 409)
	cancel()
	select {
	case <-finished:
	case <-time.After(5 * time.Second):
		t.Fatal("cancelled read remained active")
	}
	var done int
	var lease string
	if err := a.db.QueryRow("SELECT done,lease_token FROM moment_duplicate_scans WHERE id=?", id).Scan(&done, &lease); err != nil || done != 0 || lease != "" {
		t.Fatal("cancelled read committed progress or retained lease", done, lease, err)
	}
	data := duplicateFixture(t, false)
	reopened.analysisHTTP = &http.Client{Transport: analysisRoundTrip(func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(bytes.NewReader(data)), ContentLength: int64(len(data))}, nil
	})}
	w, _ = call(t, reopened.Router(), "POST", path, Object{}, admin)
	status(t, w, 200)
	w, result := call(t, reopened.Router(), "POST", path, Object{}, admin)
	status(t, w, 200)
	if integer(object(result["data"])["done"]) != 1 || text(object(result["data"])["status"]) != "ready" {
		t.Fatal("retry after interrupted read failed", result)
	}
}

func TestDuplicateSimilarityDoesNotChain(t *testing.T) {
	images := []duplicateImage{}
	for index, hash := range []string{"0", "7f", "3fff"} {
		images = append(images, duplicateImage{int64(index + 1), fmt.Sprint(index), photoFingerprint{SHA: fmt.Sprint(index), Hash: hash, Width: 100, Height: 100}})
	}
	groups, err := clusterDuplicates(context.Background(), images)
	if err != nil || len(groups) != 1 || len(groups[0].Images) != 2 || groups[0].Images[0].ID != 1 || groups[0].Images[1].ID != 2 {
		t.Fatal("similarity was chained through an intermediate photo", groups, err)
	}
}
