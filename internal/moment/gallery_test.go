package moment

import (
	"fmt"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestImageFocusAndPublicPost(t *testing.T) {
	a, h, cookie := testApp(t)
	id, imageID := seedPost(t, a, "Visible", false, false)
	hiddenID, _ := seedPost(t, a, "Hidden", true, false)
	emptyID, _ := seedPost(t, a, "Hidden images", false, true)
	path := fmt.Sprintf("/api/admin/posts/%d", id)
	publicPath := fmt.Sprintf("/api/v1/visitor/blog/%d", id)
	getFocus := func(wantX, wantY float64) {
		t.Helper()
		w, response := call(t, h, "GET", publicPath, nil, nil)
		status(t, w, 200)
		images := object(response["data"])["images"].([]any)
		if len(images) != 1 {
			t.Fatalf("private image leaked: %d", len(images))
		}
		image := object(images[0])
		if image["focus_x"] != wantX || image["focus_y"] != wantY {
			t.Fatalf("focus = (%v,%v), want (%v,%v)", image["focus_x"], image["focus_y"], wantX, wantY)
		}
	}
	getFocus(50, 50)
	x, y := 0.0, 23.5
	body := PostInput{Title: "Visible", Images: []ImageInput{
		{ID: imageID, URL: "https://example.com/photo.jpg", FocusX: &x, FocusY: &y},
		{URL: "https://example.com/private.jpg", Hidden: true, FocusX: &x},
	}}
	w, _ := call(t, h, "PUT", path, body, cookie)
	status(t, w, 200)
	getFocus(0, 23.5)
	// An older client omits presentation fields, preserving focus and existing IDs.
	body.Images = body.Images[:1]
	body.Images[0].FocusX, body.Images[0].FocusY = nil, nil
	w, _ = call(t, h, "PUT", path, body, cookie)
	status(t, w, 200)
	getFocus(0, 23.5)
	var count int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM moment_image_focus").Scan(&count); err != nil || count != 1 {
		t.Fatal("removed image left orphaned presentation data")
	}
	x = 100
	body.Images[0].FocusX = &x
	w, _ = call(t, h, "PUT", path, body, cookie)
	status(t, w, 200)
	getFocus(100, 23.5)
	x = 101
	body.Title = "Invalid update"
	w, _ = call(t, h, "PUT", path, body, cookie)
	status(t, w, 400)
	getFocus(100, 23.5)
	for _, private := range []int64{hiddenID, emptyID, 99999} {
		w, _ = call(t, h, "GET", fmt.Sprintf("/api/v1/visitor/blog/%d", private), nil, nil)
		status(t, w, 404)
	}
	w, _ = call(t, h, "GET", "/api/v1/visitor/blog/invalid", nil, nil)
	status(t, w, 400)
	w, _ = call(t, h, "DELETE", path, nil, cookie)
	status(t, w, 200)
	if err := a.db.QueryRow("SELECT COUNT(*) FROM moment_image_focus").Scan(&count); err != nil || count != 0 {
		t.Fatal("deleted post left orphaned presentation data")
	}
}

func TestSharedLinkServesGalleryOnRefresh(t *testing.T) {
	a, h, _ := testApp(t)
	if err := os.WriteFile(filepath.Join(a.dist, "index.html"), []byte("<html>gallery</html>"), 0600); err != nil {
		t.Fatal(err)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/post/1?photo=2", nil))
	if w.Code != 200 || w.Body.String() != "<html>gallery</html>" {
		t.Fatal("shared link does not serve the gallery entry point")
	}
}
