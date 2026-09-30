package moment

import (
	"archive/zip"
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
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

func thumbnailFixture(t *testing.T, a *App, name string, width, height int, transparent bool) []byte {
	t.Helper()
	img := image.NewNRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			alpha := uint8(255)
			if transparent && x < width/4 {
				alpha = 0
			}
			img.SetNRGBA(x, y, color.NRGBA{R: uint8(x * 255 / width), G: uint8(y * 255 / height), B: 80, A: alpha})
		}
	}
	var data bytes.Buffer
	if strings.HasSuffix(name, ".png") {
		if err := png.Encode(&data, img); err != nil {
			t.Fatal(err)
		}
	} else {
		if err := jpeg.Encode(&data, img, &jpeg.Options{Quality: 96}); err != nil {
			t.Fatal(err)
		}
	}
	putThumbnailFile(t, a, name, data.Bytes())
	return data.Bytes()
}
func putThumbnailFile(t *testing.T, a *App, name string, data []byte) {
	t.Helper()
	path := filepath.Join(a.data, "uploads", filepath.FromSlash(name))
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, data, 0600); err != nil {
		t.Fatal(err)
	}
}
func imageRequest(h http.Handler, method, path string, headers map[string]string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, nil)
	for key, value := range headers {
		r.Header.Set(key, value)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}
func TestThumbnailGenerationCachingAndSourcePreservation(t *testing.T) {
	a, h, cookie := testApp(t)
	original := thumbnailFixture(t, a, "2026/large.jpg", 2000, 1200, false)
	for _, size := range []int{320, 640, 1280} {
		path := fmt.Sprintf("/thumbnails/%d/2026/large.jpg", size)
		w := imageRequest(h, "GET", path, nil)
		status(t, w, 200)
		config, format, err := image.DecodeConfig(bytes.NewReader(w.Body.Bytes()))
		if err != nil || format != "jpeg" || config.Width != size || config.Height != size*1200/2000 {
			t.Fatal("invalid derivative dimensions", config, format, err)
		}
		if len(w.Body.Bytes()) >= len(original) {
			t.Fatal("thumbnail not smaller than source")
		}
		etag := w.Header().Get("ETag")
		if etag == "" || !strings.Contains(w.Header().Get("Cache-Control"), "max-age") {
			t.Fatal("cache headers missing")
		}
		again := imageRequest(h, "GET", path, nil)
		status(t, again, 200)
		if !bytes.Equal(w.Body.Bytes(), again.Body.Bytes()) {
			t.Fatal("cache hit changed bytes")
		}
		conditional := imageRequest(h, "GET", path, map[string]string{"If-None-Match": etag})
		status(t, conditional, 304)
		head := imageRequest(h, "HEAD", path, nil)
		status(t, head, 200)
		if head.Body.Len() != 0 {
			t.Fatal("HEAD returned body")
		}
	}
	read, err := os.ReadFile(filepath.Join(a.data, "uploads", "2026", "large.jpg"))
	if err != nil || sha256.Sum256(read) != sha256.Sum256(original) {
		t.Fatal("original changed")
	}
	// Disabling thumbnails is effective even for an already cached endpoint.
	w, _ := call(t, h, "PATCH", "/api/admin/settings/content", Object{"local_thumbnails": false}, cookie)
	status(t, w, 200)
	fallback := imageRequest(h, "GET", "/thumbnails/640/2026/large.jpg", nil)
	status(t, fallback, 307)
	if fallback.Header().Get("Location") != "/uploads/2026/large.jpg" {
		t.Fatal("bad fallback")
	}
	w, _ = call(t, h, "PATCH", "/api/admin/settings/content", Object{"local_thumbnails": "false"}, cookie)
	status(t, w, 400)
	w, _ = call(t, h, "PATCH", "/api/admin/settings/content", Object{"local_thumbnails": true}, cookie)
	status(t, w, 200)
	// Cache files do not become part of a database/media backup.
	backup, err := a.exportBackup(context.Background(), "manual")
	if err != nil {
		t.Fatal(err)
	}
	archive, err := zip.OpenReader(a.backupPath(backup.ID))
	if err != nil {
		t.Fatal(err)
	}
	defer archive.Close()
	for _, file := range archive.File {
		if strings.HasPrefix(file.Name, "derivatives/") {
			t.Fatal("derived cache included in backup")
		}
	}
}

func TestThumbnailAlphaOrientationAndFallbacks(t *testing.T) {
	a, h, _ := testApp(t)
	thumbnailFixture(t, a, "alpha.png", 1000, 600, true)
	w := imageRequest(h, "GET", "/thumbnails/640/alpha.png", nil)
	status(t, w, 200)
	decoded, format, err := image.Decode(bytes.NewReader(w.Body.Bytes()))
	if err != nil || format != "png" {
		t.Fatal("alpha format lost")
	}
	_, _, _, alpha := decoded.At(0, 0).RGBA()
	if alpha != 0 {
		t.Fatal("transparency lost")
	}
	jpegBytes := thumbnailFixture(t, a, "rotated.jpg", 1200, 800, false)
	exif := []byte{'E', 'x', 'i', 'f', 0, 0, 'I', 'I', 42, 0, 8, 0, 0, 0, 1, 0, 0x12, 1, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0}
	oriented := append([]byte{0xff, 0xd8, 0xff, 0xe1, 0, byte(len(exif) + 2)}, exif...)
	oriented = append(oriented, jpegBytes[2:]...)
	putThumbnailFile(t, a, "rotated.jpg", oriented)
	w = imageRequest(h, "GET", "/thumbnails/640/rotated.jpg", nil)
	status(t, w, 200)
	config, _, err := image.DecodeConfig(bytes.NewReader(w.Body.Bytes()))
	if err != nil || config.Width != 426 || config.Height != 640 {
		t.Fatal("EXIF orientation ignored", config)
	}
	thumbnailFixture(t, a, "tiny.png", 24, 16, false)
	putThumbnailFile(t, a, "broken.jpg", []byte("not an image"))
	putThumbnailFile(t, a, "unsupported.avif", []byte("unsupported"))
	var animated bytes.Buffer
	frames := &gif.GIF{Image: []*image.Paletted{image.NewPaletted(image.Rect(0, 0, 1000, 1000), color.Palette{color.Black, color.White}), image.NewPaletted(image.Rect(0, 0, 1000, 1000), color.Palette{color.White, color.Black})}, Delay: []int{5, 5}}
	if err = gif.EncodeAll(&animated, frames); err != nil {
		t.Fatal(err)
	}
	putThumbnailFile(t, a, "animated.gif", animated.Bytes())
	// acTL before IDAT marks an APNG: retain its animation rather than the first frame.
	apng := thumbnailFixture(t, a, "animated.png", 1000, 600, false)
	chunk := make([]byte, 20)
	binary.BigEndian.PutUint32(chunk[:4], 8)
	copy(chunk[4:8], "acTL")
	binary.BigEndian.PutUint32(chunk[8:12], 2)
	binary.BigEndian.PutUint32(chunk[16:20], crc32.ChecksumIEEE(chunk[4:16]))
	apng = append(append(append([]byte{}, apng[:33]...), chunk...), apng[33:]...)
	putThumbnailFile(t, a, "animated.png", apng)
	// A valid large IHDR must be rejected before any pixel buffer is allocated.
	oversized := append([]byte(nil), thumbnailFixture(t, a, "huge.png", 1, 1, false)...)
	binary.BigEndian.PutUint32(oversized[16:20], 16384)
	binary.BigEndian.PutUint32(oversized[20:24], 16384)
	binary.BigEndian.PutUint32(oversized[29:33], crc32.ChecksumIEEE(oversized[12:29]))
	putThumbnailFile(t, a, "huge.png", oversized)
	putThumbnailFile(t, a, "large-file.jpg", nil)
	file, err := os.OpenFile(filepath.Join(a.data, "uploads", "large-file.jpg"), os.O_WRONLY, 0600)
	if err != nil {
		t.Fatal(err)
	}
	file.Truncate(thumbnailBytes + 1)
	file.Close()
	for _, name := range []string{"tiny.png", "broken.jpg", "unsupported.avif", "animated.gif", "animated.png", "huge.png", "large-file.jpg"} {
		w = imageRequest(h, "GET", "/thumbnails/640/"+name, nil)
		status(t, w, 307)
		if w.Header().Get("Location") != "/uploads/"+name {
			t.Fatal("not falling back to original", name)
		}
	}
	// Failed cache storage must not break an otherwise valid original.
	b, handler, _ := testApp(t)
	thumbnailFixture(t, b, "file.jpg", 1000, 800, false)
	if err = os.WriteFile(filepath.Join(b.data, "derivatives"), []byte("blocked"), 0600); err != nil {
		t.Fatal(err)
	}
	w = imageRequest(handler, "GET", "/thumbnails/640/file.jpg", nil)
	status(t, w, 307)
}

func TestThumbnailConcurrentRequestsAndInvalidation(t *testing.T) {
	a, h, _ := testApp(t)
	thumbnailFixture(t, a, "same.jpg", 1200, 800, false)
	var wg sync.WaitGroup
	results := make(chan *httptest.ResponseRecorder, 12)
	for i := 0; i < 12; i++ {
		wg.Add(1)
		go func() { defer wg.Done(); results <- imageRequest(h, "GET", "/thumbnails/640/same.jpg", nil) }()
	}
	wg.Wait()
	close(results)
	var previous string
	var body []byte
	for result := range results {
		status(t, result, 200)
		if previous != "" && !bytes.Equal(body, result.Body.Bytes()) {
			t.Fatal("concurrent responses differ")
		}
		previous = result.Header().Get("ETag")
		body = result.Body.Bytes()
	}
	files, err := os.ReadDir(filepath.Join(a.data, "derivatives", "v1"))
	if err != nil || len(files) != 1 {
		t.Fatal("duplicate/partial cache outputs", err, len(files))
	}
	thumbnailFixture(t, a, "same.jpg", 1600, 800, false)
	w := imageRequest(h, "GET", "/thumbnails/640/same.jpg", map[string]string{"If-None-Match": previous})
	status(t, w, 200)
	if w.Header().Get("ETag") == previous {
		t.Fatal("source replacement did not invalidate cache")
	}
	if err = os.Remove(filepath.Join(a.data, "uploads", "same.jpg")); err != nil {
		t.Fatal(err)
	}
	w = imageRequest(h, "GET", "/thumbnails/640/same.jpg", nil)
	status(t, w, 404)
	for _, path := range []string{"/thumbnails/641/no.jpg", "/thumbnails/640/../db.sqlite3", "/thumbnails/640/%2e%2e/db.sqlite3", "/thumbnails/640/C:/db.sqlite3"} {
		w = imageRequest(h, "GET", path, nil)
		if w.Code < 400 {
			t.Fatal("unsafe request accepted", path, w.Code)
		}
	}
	if err = os.Symlink(filepath.Join(a.data, "db.sqlite3"), filepath.Join(a.data, "uploads", "escape.jpg")); err == nil {
		w = imageRequest(h, "GET", "/thumbnails/640/escape.jpg", nil)
		status(t, w, 404)
	} else {
		t.Log("symbolic-link creation unavailable on this host")
	}
}

func TestThumbnailOrientationsAndCacheEviction(t *testing.T) {
	source := image.NewNRGBA(image.Rect(0, 0, 2, 3))
	for y := 0; y < 3; y++ {
		for x := 0; x < 2; x++ {
			source.SetNRGBA(x, y, color.NRGBA{R: uint8(y*2 + x + 1), A: 255})
		}
	}
	expected := [][]byte{{1, 2, 3, 4, 5, 6}, {2, 1, 4, 3, 6, 5}, {6, 5, 4, 3, 2, 1}, {5, 6, 3, 4, 1, 2}, {1, 3, 5, 2, 4, 6}, {5, 3, 1, 6, 4, 2}, {6, 4, 2, 5, 3, 1}, {2, 4, 6, 1, 3, 5}}
	for i, want := range expected {
		got := orientThumbnail(source, i+1)
		var values []byte
		for y := 0; y < got.Bounds().Dy(); y++ {
			for x := 0; x < got.Bounds().Dx(); x++ {
				values = append(values, got.NRGBAAt(x, y).R)
			}
		}
		if !bytes.Equal(values, want) {
			t.Fatal("bad orientation", i+1, values)
		}
	}
	if tiffOrientation([]byte("II*\x00\xff\xff\xff\xff")) != 1 {
		t.Fatal("bad EXIF was accepted")
	}
	directory := t.TempDir()
	for i := 0; i < 3; i++ {
		name := fmt.Sprintf("%064x.jpg", i)
		path := filepath.Join(directory, name)
		os.WriteFile(path, []byte(strings.Repeat("x", 10)), 0600)
		stamp := time.Unix(int64(100+i), 0)
		os.Chtimes(path, stamp, stamp)
	}
	os.WriteFile(filepath.Join(directory, "keep.txt"), []byte("keep"), 0600)
	pruneThumbnails(directory, 15, 2)
	if _, err := os.Stat(filepath.Join(directory, fmt.Sprintf("%064x.jpg", 2))); err != nil {
		t.Fatal("newest derivative removed")
	}
	if _, err := os.Stat(filepath.Join(directory, "keep.txt")); err != nil {
		t.Fatal("unrelated file removed")
	}
	entries, _ := os.ReadDir(directory)
	if len(entries) != 2 {
		t.Fatal("cache budget not enforced")
	}
}

func TestThumbnailSettingPreservesLegacyPageSize(t *testing.T) {
	a, h, cookie := testApp(t)
	if _, err := a.db.Exec(`UPDATE setting SET content='{"page_size":999}'`); err != nil {
		t.Fatal(err)
	}
	for _, changes := range []Object{{"local_thumbnails": true}, {"page_size": 999, "local_thumbnails": false}} {
		w, _ := call(t, h, "PATCH", "/api/admin/settings/content", changes, cookie)
		status(t, w, 200)
	}
	settings, err := a.readSettings()
	if err != nil || integer(object(settings["content"])["page_size"]) != 999 {
		t.Fatal("legacy page size changed")
	}
	for _, value := range []any{1000, 0, 12.5, "999"} {
		w, _ := call(t, h, "PATCH", "/api/admin/settings/content", Object{"page_size": value}, cookie)
		status(t, w, 400)
	}
	w, _ := call(t, h, "PATCH", "/api/admin/settings/content", Object{"page_size": 100}, cookie)
	status(t, w, 200)
}
