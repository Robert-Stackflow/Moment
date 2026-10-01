package moment

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func loginSessionForTest(t *testing.T, h http.Handler, agent string) *http.Cookie {
	t.Helper()
	req := httptest.NewRequest("POST", "/api/admin/login", strings.NewReader(`{"username":"tester","password":"`+testPassword+`"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", agent)
	req.Header.Set("X-Forwarded-For", "203.0.113.99")
	req.RemoteAddr = "192.0.2.20:12345"
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	status(t, w, 200)
	return w.Result().Cookies()[0]
}

func sessionListForTest(t *testing.T, h http.Handler, cookie *http.Cookie) []Object {
	t.Helper()
	w, result := call(t, h, "GET", "/api/admin/me/sessions", nil, cookie)
	status(t, w, 200)
	if w.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("session list cacheable")
	}
	if strings.Contains(w.Body.String(), cookie.Value) || strings.Contains(w.Body.String(), tokenDigest(cookie.Value)) || strings.Contains(w.Body.String(), "token_hash") || strings.Contains(w.Body.String(), "user_agent") {
		t.Fatal("session credentials disclosed")
	}
	rows := []Object{}
	for _, row := range result["data"].([]any) {
		rows = append(rows, object(row))
	}
	return rows
}

func TestSessionDetailsLoginActivityAndLegacy(t *testing.T) {
	a, h, legacy := testApp(t)
	agent := "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/145.0 Safari/537.36 Edg/145.0"
	logged := loginSessionForTest(t, h, agent)
	rows := sessionListForTest(t, h, logged)
	if len(rows) != 2 || rows[0]["current"] != true || rows[0]["device"] != "Edge · Windows" || rows[0]["method"] != "password" || rows[0]["ip"] != "192.0.2.20" || integer(rows[0]["created_at"]) <= 0 || integer(rows[0]["expires_at"]) <= time.Now().Unix() {
		t.Fatalf("incorrect login details: %+v", rows)
	}
	if integer(rows[1]["created_at"]) != 0 || rows[1]["method"] != "unknown" || rows[1]["device"] != "未记录设备" {
		t.Fatal("invented legacy details")
	}
	var expiry int64
	if err := a.db.QueryRow("SELECT expires_at FROM moment_sessions WHERE token_hash=?", tokenDigest(legacy.Value)).Scan(&expiry); err != nil {
		t.Fatal(err)
	}
	// A pre-feature database retains the same token, expiry and original table.
	if _, err := a.db.Exec("DROP TABLE moment_session_details; DELETE FROM moment_schema_migrations WHERE version='012_session_details.sql'"); err != nil {
		t.Fatal(err)
	}
	if err := a.initialize(); err != nil {
		t.Fatal(err)
	}
	rows = sessionListForTest(t, h, legacy)
	if len(rows) != 2 || rows[0]["current"] != true || integer(rows[0]["created_at"]) != 0 || integer(rows[0]["expires_at"]) != expiry {
		t.Fatal("legacy session changed")
	}
	last := time.Now().Unix() - 10
	if _, err := a.db.Exec("UPDATE moment_session_details SET last_seen_at=? WHERE token_hash=?", last, tokenDigest(legacy.Value)); err != nil {
		t.Fatal(err)
	}
	w, _ := call(t, h, "GET", "/api/admin/me", nil, legacy)
	status(t, w, 200)
	var got int64
	a.db.QueryRow("SELECT last_seen_at FROM moment_session_details WHERE token_hash=?", tokenDigest(legacy.Value)).Scan(&got)
	if got != last {
		t.Fatal("activity written more than once per minute")
	}
	if _, err := a.db.Exec("UPDATE moment_session_details SET last_seen_at=? WHERE token_hash=?", last-120, tokenDigest(legacy.Value)); err != nil {
		t.Fatal(err)
	}
	w, _ = call(t, h, "GET", "/api/admin/me", nil, legacy)
	status(t, w, 200)
	a.db.QueryRow("SELECT last_seen_at FROM moment_session_details WHERE token_hash=?", tokenDigest(legacy.Value)).Scan(&got)
	if got < time.Now().Unix()-2 {
		t.Fatal("activity not updated")
	}
	if _, err := a.db.Exec("UPDATE moment_sessions SET expires_at=0 WHERE token_hash=?", tokenDigest(logged.Value)); err != nil {
		t.Fatal(err)
	}
	if len(sessionListForTest(t, h, legacy)) != 1 {
		t.Fatal("expired session listed")
	}
}

func TestSessionRevocationIsolationAndCookie(t *testing.T) {
	a, h, current := testApp(t)
	one := loginSessionForTest(t, h, "Mozilla/5.0 (iPhone) Version/18 Safari/605.1 Mobile/15")
	two := loginSessionForTest(t, h, "Mozilla/5.0 (Linux; Android 15) Chrome/140 Mobile Safari/537")
	if _, err := a.db.Exec("INSERT INTO user(username,email,avatar,password) VALUES('other','other@example.com','',?)", legacyHash); err != nil {
		t.Fatal(err)
	}
	foreign := &http.Cookie{Name: "moment_session", Value: strings.Repeat("b", 64)}
	if _, err := a.db.Exec("INSERT INTO moment_sessions VALUES(?,2,?)", tokenDigest(foreign.Value), time.Now().Add(time.Hour).Unix()); err != nil {
		t.Fatal(err)
	}
	foreignID := text(sessionListForTest(t, h, foreign)[0]["id"])
	rows := sessionListForTest(t, h, current)
	if len(rows) != 3 {
		t.Fatal("other account sessions disclosed")
	}
	for _, tc := range []struct{ method, path string }{{"GET", "/me/sessions"}, {"DELETE", "/me/sessions/others"}, {"DELETE", "/me/sessions/" + foreignID}} {
		w, _ := call(t, h, tc.method, "/api/admin"+tc.path, nil, nil)
		status(t, w, 401)
	}
	w, _ := call(t, h, "DELETE", "/api/admin/me/sessions/"+foreignID, nil, current)
	status(t, w, 404)
	for _, path := range []string{"others", text(rows[1]["id"])} {
		req := httptest.NewRequest("DELETE", "/api/admin/me/sessions/"+path, nil)
		req.AddCookie(current)
		req.Header.Set("Origin", "https://attacker.example")
		denied := httptest.NewRecorder()
		h.ServeHTTP(denied, req)
		status(t, denied, 403)
	}
	oneID := text(sessionListForTest(t, h, one)[0]["id"])
	w, result := call(t, h, "DELETE", "/api/admin/me/sessions/"+oneID, nil, current)
	status(t, w, 200)
	if object(result["data"])["current"] != false {
		t.Fatal("wrong current-session marker")
	}
	w, _ = call(t, h, "GET", "/api/admin/me", nil, one)
	status(t, w, 401)
	var details int
	a.db.QueryRow("SELECT COUNT(*) FROM moment_session_details WHERE token_hash=?", tokenDigest(one.Value)).Scan(&details)
	if details != 0 {
		t.Fatal("revoked session metadata retained")
	}
	w, _ = call(t, h, "DELETE", "/api/admin/me/sessions/"+oneID, nil, current)
	status(t, w, 404)
	// A partial bulk-delete must roll back both sessions and cascaded metadata.
	if _, err := a.db.Exec("CREATE TRIGGER reject_session_delete BEFORE DELETE ON moment_sessions BEGIN SELECT RAISE(ABORT,'fixture'); END"); err != nil {
		t.Fatal(err)
	}
	w, _ = call(t, h, "DELETE", "/api/admin/me/sessions/others", nil, current)
	status(t, w, 500)
	if len(sessionListForTest(t, h, current)) != 2 {
		t.Fatal("failed revocation changed sessions")
	}
	if _, err := a.db.Exec("DROP TRIGGER reject_session_delete"); err != nil {
		t.Fatal(err)
	}
	w, _ = call(t, h, "DELETE", "/api/admin/me/sessions/others", nil, current)
	status(t, w, 200)
	if len(sessionListForTest(t, h, current)) != 1 {
		t.Fatal("other sessions retained")
	}
	w, _ = call(t, h, "GET", "/api/admin/me", nil, two)
	status(t, w, 401)
	w, _ = call(t, h, "GET", "/api/admin/me", nil, foreign)
	status(t, w, 200)
	ownID := text(sessionListForTest(t, h, current)[0]["id"])
	w, result = call(t, h, "DELETE", "/api/admin/me/sessions/"+ownID, nil, current)
	status(t, w, 200)
	if object(result["data"])["current"] != true || len(w.Result().Cookies()) != 1 || w.Result().Cookies()[0].MaxAge != -1 {
		t.Fatal("current cookie not cleared")
	}
	w, _ = call(t, h, "GET", "/api/admin/me", nil, current)
	status(t, w, 401)
}

func TestSessionMetadataFailureRollsBackLogin(t *testing.T) {
	a, h, _ := testApp(t)
	if _, err := a.db.Exec("CREATE TRIGGER reject_metadata BEFORE INSERT ON moment_session_details BEGIN SELECT RAISE(ABORT,'fixture'); END"); err != nil {
		t.Fatal(err)
	}
	w, _ := call(t, h, "POST", "/api/admin/login", Object{"username": "tester", "password": testPassword}, nil)
	status(t, w, 500)
	var count int
	var last any
	a.db.QueryRow("SELECT COUNT(*) FROM moment_sessions").Scan(&count)
	a.db.QueryRow("SELECT last_login FROM user WHERE id=1").Scan(&last)
	if count != 1 || text(last) != "" || len(w.Result().Cookies()) != 0 {
		t.Fatal("failed login left partial state")
	}
}

func TestSessionDeviceLabels(t *testing.T) {
	for _, tc := range []struct{ ua, label, kind string }{{"", "未记录设备", "unknown"}, {"Mozilla iPhone Mobile Version/18 Safari/605", "Safari · iOS", "mobile"}, {"Mozilla Macintosh Mobile/15 Safari/605", "Safari · iPadOS", "tablet"}, {"Android Chrome/140", "Chrome · Android", "tablet"}, {"Linux Firefox/144", "Firefox · Linux", "desktop"}} {
		label, kind := sessionDevice(tc.ua)
		if label != tc.label || kind != tc.kind {
			t.Fatalf("%s: %s %s", tc.ua, label, kind)
		}
	}
}

func TestSessionListJSONHasStablePublicIDs(t *testing.T) {
	_, h, current := testApp(t)
	first := sessionListForTest(t, h, current)
	second := sessionListForTest(t, h, current)
	if len(text(first[0]["id"])) != 32 || first[0]["id"] != second[0]["id"] {
		t.Fatal("unstable display ID")
	}
	bytes, err := json.Marshal(first)
	if err != nil || strings.Contains(string(bytes), "session_seen") {
		t.Fatal("internal activity fields leaked")
	}
}
