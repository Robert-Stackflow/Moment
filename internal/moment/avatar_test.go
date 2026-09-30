package moment

import (
	"bytes"
	"encoding/json"
	"image"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func avatarRequest(t *testing.T, handler http.Handler, data []byte, cookie *http.Cookie, origin string) *httptest.ResponseRecorder {
	t.Helper()
	var body bytes.Buffer
	form := multipart.NewWriter(&body)
	part, err := form.CreateFormFile("file", "../../avatar.png")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = part.Write(data); err != nil {
		t.Fatal(err)
	}
	if err = form.Close(); err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest("POST", "/api/admin/me/avatar", &body)
	request.Header.Set("Content-Type", form.FormDataContentType())
	request.Header.Set("Origin", origin)
	if cookie != nil {
		request.AddCookie(cookie)
	}
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	return response
}

func TestAvatarAlwaysLocalAndCompatibleWithProfile(t *testing.T) {
	a, handler, cookie := testApp(t)
	s3Calls := 0
	s3Server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { s3Calls++; w.WriteHeader(500) }))
	defer s3Server.Close()
	storage, _ := json.Marshal(Object{"provider": "s3", "endpoint": s3Server.URL, "enable_storage": false, "max_size": 0.001, "path": "invalid/../path"})
	if _, err := a.db.Exec("UPDATE setting SET storage=?", string(storage)); err != nil {
		t.Fatal(err)
	}
	var input bytes.Buffer
	if err := png.Encode(&input, image.NewNRGBA(image.Rect(0, 0, 1024, 768))); err != nil {
		t.Fatal(err)
	}
	status(t, avatarRequest(t, handler, input.Bytes(), nil, ""), 401)
	status(t, avatarRequest(t, handler, input.Bytes(), cookie, "https://untrusted.example"), 403)
	response := avatarRequest(t, handler, input.Bytes(), cookie, "")
	status(t, response, 200)
	var result Object
	if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	url := text(object(result["data"])["avatar"])
	if !localAvatarURL.MatchString(url) || s3Calls != 0 {
		t.Fatal("avatar used photo storage")
	}
	file, err := os.ReadFile(filepath.Join(a.data, "avatars", filepath.Base(url)))
	if err != nil {
		t.Fatal(err)
	}
	config, format, err := image.DecodeConfig(bytes.NewReader(file))
	if err != nil || format != "png" || config.Width != 512 || config.Height != 384 {
		t.Fatalf("unexpected normalized avatar: %+v %s %v", config, format, err)
	}
	public := httptest.NewRecorder()
	handler.ServeHTTP(public, httptest.NewRequest("GET", url, nil))
	status(t, public, 200)
	if !bytes.Equal(public.Body.Bytes(), file) {
		t.Fatal("local avatar cannot be read")
	}
	w, _ := call(t, handler, "PATCH", "/api/admin/me", Object{"username": "tester", "email": "test@example.com", "alias": "Updated", "avatar": url}, cookie)
	status(t, w, 200)
	w, me := call(t, handler, "GET", "/api/admin/me", nil, cookie)
	status(t, w, 200)
	if text(object(me["data"])["avatar"]) != url {
		t.Fatal("avatar did not persist")
	}
	for _, invalid := range [][]byte{[]byte("<svg onload='alert(1)'></svg>"), input.Bytes()[:40], bytes.Repeat([]byte("x"), avatarLimit+1)} {
		status(t, avatarRequest(t, handler, invalid, cookie, ""), 400)
	}
	_, me = call(t, handler, "GET", "/api/admin/me", nil, cookie)
	if text(object(me["data"])["avatar"]) != url {
		t.Fatal("rejected upload changed avatar")
	}
	files, err := os.ReadDir(filepath.Join(a.data, "avatars"))
	if err != nil || len(files) != 1 {
		t.Fatal("invalid upload left a file")
	}
	w, _ = call(t, handler, "PATCH", "/api/admin/me", Object{"username": "tester", "email": "test@example.com", "avatar": "/avatars/../" + strings.Repeat("a", 32) + ".png"}, cookie)
	status(t, w, 400)
}
