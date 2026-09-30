package moment

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	_ "golang.org/x/image/bmp"
	"golang.org/x/image/draw"
	_ "golang.org/x/image/tiff"
	_ "golang.org/x/image/webp"
	"golang.org/x/sync/singleflight"
)

const thumbnailPixels = 32_000_000
const thumbnailBytes int64 = 32 << 20
const thumbnailCacheBytes int64 = 512 << 20
const thumbnailCacheFiles = 20000

type thumbnailCache struct {
	worker    chan struct{}
	flights   singleflight.Group
	lastPrune time.Time // Only touched while worker is held.
}
type thumbnailResult struct{ path, contentType string }

var errOriginalImage = errors.New("use original image")

func newThumbnailCache() *thumbnailCache { return &thumbnailCache{worker: make(chan struct{}, 1)} }

func (a *App) thumbnail(c *gin.Context) {
	size, err := strconv.Atoi(c.Param("size"))
	if err != nil || (size != 320 && size != 640 && size != 1280) {
		fail(c, 400, "缩略图尺寸无效")
		return
	}
	name := strings.TrimPrefix(c.Param("file"), "/")
	if !validBackupName("uploads/" + name) {
		fail(c, 400, "图片路径无效")
		return
	}
	root, err := os.OpenRoot(filepath.Join(a.data, "uploads"))
	if err != nil {
		fail(c, 404, "图片不存在")
		return
	}
	defer root.Close()
	file, err := root.Open(filepath.FromSlash(name))
	if err != nil {
		fail(c, 404, "图片不存在")
		return
	}
	defer file.Close()
	stat, err := file.Stat()
	if err != nil || !stat.Mode().IsRegular() {
		fail(c, 404, "图片不存在")
		return
	}
	fallback := func() {
		c.Header("Cache-Control", "no-store")
		c.Redirect(http.StatusTemporaryRedirect, "/uploads/"+escapeKey(name))
	}
	var enabled int
	if err = a.db.QueryRowContext(c.Request.Context(), `SELECT COALESCE(json_extract(content,'$.local_thumbnails'),1) FROM setting ORDER BY id LIMIT 1`).Scan(&enabled); err != nil || enabled == 0 {
		fallback()
		return
	}
	// The source is immutable through the application. Its fingerprint also
	// changes when a restore replaces it; stale derivatives are never served.
	fingerprint := fmt.Sprintf("v1\n%s\n%d\n%d\n%d", name, size, stat.Size(), stat.ModTime().UnixNano())
	sum := sha256.Sum256([]byte(fingerprint))
	key := hex.EncodeToString(sum[:])
	directory := filepath.Join(a.data, "derivatives", "v1")
	result, found := cachedThumbnail(directory, key)
	if !found {
		value, e, _ := a.thumbnails.flights.Do(key, func() (any, error) {
			if cached, ok := cachedThumbnail(directory, key); ok {
				return cached, nil
			}
			ctx, cancel := context.WithTimeout(c.Request.Context(), 20*time.Second)
			defer cancel()
			select {
			case a.thumbnails.worker <- struct{}{}:
				defer func() { <-a.thumbnails.worker }()
			case <-ctx.Done():
				return nil, ctx.Err()
			}
			if err := os.MkdirAll(directory, 0700); err != nil {
				return nil, err
			}
			if time.Since(a.thumbnails.lastPrune) > 30*time.Second {
				pruneThumbnails(directory, thumbnailCacheBytes, thumbnailCacheFiles)
				a.thumbnails.lastPrune = time.Now()
			}
			generated, err := generateThumbnail(ctx, file, stat.Size(), directory, key, size)
			if errors.Is(err, errOriginalImage) {
				// Remember unsupported or damaged sources, so repeated views don't
				// repeatedly decode them. A changed source gets a different key.
				_ = os.WriteFile(filepath.Join(directory, key+".skip"), nil, 0600)
				return thumbnailResult{}, nil
			}
			return generated, err
		})
		if e != nil {
			fallback()
			return
		}
		result = value.(thumbnailResult)
	}
	if result.path == "" {
		fallback()
		return
	}
	output, err := os.Open(result.path)
	if err != nil {
		fallback()
		return
	}
	defer output.Close()
	c.Header("Content-Type", result.contentType)
	c.Header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400")
	c.Header("ETag", `W/"`+key+`"`)
	http.ServeContent(c.Writer, c.Request, filepath.Base(result.path), stat.ModTime(), output)
}

func cachedThumbnail(directory, key string) (thumbnailResult, bool) {
	for _, ext := range []string{".jpg", ".png", ".skip"} {
		path := filepath.Join(directory, key+ext)
		if stat, err := os.Lstat(path); err == nil && stat.Mode().IsRegular() {
			if ext == ".skip" {
				return thumbnailResult{}, true
			}
			mime := "image/jpeg"
			if ext == ".png" {
				mime = "image/png"
			}
			return thumbnailResult{path: path, contentType: mime}, true
		}
	}
	return thumbnailResult{}, false
}

func generateThumbnail(ctx context.Context, input *os.File, bytes int64, directory, key string, size int) (thumbnailResult, error) {
	if bytes < 1 || bytes > thumbnailBytes {
		return thumbnailResult{}, errOriginalImage
	}
	if _, err := input.Seek(0, io.SeekStart); err != nil {
		return thumbnailResult{}, err
	}
	config, format, err := image.DecodeConfig(input)
	if err != nil || format == "gif" || config.Width < 1 || config.Height < 1 || config.Width > 16384 || config.Height > 16384 || int64(config.Width)*int64(config.Height) > thumbnailPixels {
		return thumbnailResult{}, errOriginalImage
	}
	if config.Width <= size && config.Height <= size {
		return thumbnailResult{}, errOriginalImage
	}
	if format == "png" && animatedPNG(input) {
		return thumbnailResult{}, errOriginalImage
	}
	orientation := 1
	if format == "jpeg" {
		orientation = jpegOrientation(input)
	}
	if err = ctx.Err(); err != nil {
		return thumbnailResult{}, err
	}
	if _, err = input.Seek(0, io.SeekStart); err != nil {
		return thumbnailResult{}, err
	}
	source, _, err := image.Decode(io.LimitReader(input, thumbnailBytes+1))
	if err != nil {
		return thumbnailResult{}, errOriginalImage
	}
	if source.Bounds().Dx() != config.Width || source.Bounds().Dy() != config.Height {
		return thumbnailResult{}, errOriginalImage
	}
	width, height := config.Width, config.Height
	if width >= height {
		height = max(1, height*size/width)
		width = size
	} else {
		width = max(1, width*size/height)
		height = size
	}
	resized := image.NewNRGBA(image.Rect(0, 0, width, height))
	draw.ApproxBiLinear.Scale(resized, resized.Bounds(), source, source.Bounds(), draw.Src, nil)
	resized = orientThumbnail(resized, orientation)
	if err = ctx.Err(); err != nil {
		return thumbnailResult{}, err
	}
	ext, mime := ".jpg", "image/jpeg"
	if !resized.Opaque() {
		ext, mime = ".png", "image/png"
	}
	output, err := os.CreateTemp(directory, ".render-")
	if err != nil {
		return thumbnailResult{}, err
	}
	defer os.Remove(output.Name())
	if ext == ".png" {
		encoder := png.Encoder{CompressionLevel: png.BestSpeed}
		err = encoder.Encode(output, resized)
	} else {
		err = jpeg.Encode(output, resized, &jpeg.Options{Quality: 82})
	}
	closeErr := output.Close()
	if err == nil {
		err = closeErr
	}
	if err != nil {
		return thumbnailResult{}, err
	}
	if err = ctx.Err(); err != nil {
		return thumbnailResult{}, err
	}
	path := filepath.Join(directory, key+ext)
	if err = os.Rename(output.Name(), path); err != nil {
		return thumbnailResult{}, err
	}
	return thumbnailResult{path: path, contentType: mime}, nil
}

// Derivatives are disposable and excluded from backups. Periodically evict the
// oldest generations; source files are never touched by cache maintenance.
func pruneThumbnails(directory string, limit int64, fileLimit int) {
	entries, err := os.ReadDir(directory)
	if err != nil {
		return
	}
	type entry struct {
		path     string
		size     int64
		modified time.Time
	}
	items := []entry{}
	var total int64
	for _, item := range entries {
		if item.IsDir() {
			continue
		}
		if strings.HasPrefix(item.Name(), ".render-") {
			if stat, err := item.Info(); err == nil && stat.Mode().IsRegular() && time.Since(stat.ModTime()) > 10*time.Minute {
				_ = os.Remove(filepath.Join(directory, item.Name()))
			}
			continue
		}
		ext := filepath.Ext(item.Name())
		base := strings.TrimSuffix(item.Name(), ext)
		if len(base) != 64 || (ext != ".jpg" && ext != ".png" && ext != ".skip") {
			continue
		}
		if _, err := hex.DecodeString(base); err != nil {
			continue
		}
		stat, err := item.Info()
		if err != nil || !stat.Mode().IsRegular() {
			continue
		}
		items = append(items, entry{filepath.Join(directory, item.Name()), stat.Size(), stat.ModTime()})
		total += stat.Size()
	}
	sort.Slice(items, func(i, j int) bool { return items[i].modified.Before(items[j].modified) })
	count := len(items)
	for _, item := range items {
		if total <= limit && count <= fileLimit {
			break
		}
		if os.Remove(item.path) == nil {
			total -= item.size
			count--
		}
	}
}
