package moment

import (
	"crypto/rand"
	"encoding/hex"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	"image/png"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"

	"github.com/gin-gonic/gin"
	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
)

const avatarLimit = 5 << 20

var localAvatarURL = regexp.MustCompile(`^/avatars/[a-f0-9]{32}\.png$`)

// Avatars always live in the data directory, independently of photo storage settings.
func (a *App) uploadAvatar(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, avatarLimit+(1<<20))
	file, err := c.FormFile("file")
	if c.Request.MultipartForm != nil {
		defer c.Request.MultipartForm.RemoveAll()
	}
	if err != nil || file.Size < 1 || file.Size > avatarLimit {
		fail(c, 400, "请选择不超过 5 MB 的头像图片")
		return
	}
	stream, err := file.Open()
	if err != nil {
		fail(c, 400, "无法读取头像")
		return
	}
	defer stream.Close()
	config, _, err := image.DecodeConfig(stream)
	if err != nil || config.Width < 1 || config.Height < 1 || config.Width > 16384 || config.Height > 16384 || int64(config.Width)*int64(config.Height) > 32_000_000 {
		fail(c, 400, "请选择有效的 JPG、PNG、WebP 或 GIF 图片，像素不超过 3200 万")
		return
	}
	if _, err = stream.Seek(0, io.SeekStart); err != nil {
		fail(c, 400, "无法读取头像")
		return
	}
	source, _, err := image.Decode(stream)
	if err != nil {
		fail(c, 400, "头像图片损坏，请重新选择")
		return
	}
	width, height := config.Width, config.Height
	if width > 512 || height > 512 {
		if width >= height {
			height = max(1, height*512/width)
			width = 512
		} else {
			width = max(1, width*512/height)
			height = 512
		}
	}
	avatar := image.NewNRGBA(image.Rect(0, 0, width, height))
	draw.ApproxBiLinear.Scale(avatar, avatar.Bounds(), source, source.Bounds(), draw.Src, nil)
	name := make([]byte, 16)
	if _, err = rand.Read(name); err != nil {
		fail(c, 500, "无法保存头像")
		return
	}
	directory := filepath.Join(a.data, "avatars")
	if err = os.MkdirAll(directory, 0750); err != nil {
		fail(c, 500, "无法创建头像目录")
		return
	}
	filename := hex.EncodeToString(name) + ".png"
	path := filepath.Join(directory, filename)
	output, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0640)
	if err != nil {
		fail(c, 500, "无法保存头像")
		return
	}
	err = png.Encode(output, avatar)
	closeErr := output.Close()
	if err != nil || closeErr != nil {
		_ = os.Remove(path)
		fail(c, 500, "头像保存失败")
		return
	}
	url := "/avatars/" + filename
	user := object(c.MustGet("user"))
	if _, err = a.db.Exec("UPDATE user SET avatar=?,updated_at=? WHERE id=?", url, now(), user["id"]); err != nil {
		_ = os.Remove(path)
		databaseError(c, err)
		return
	}
	ok(c, Object{"avatar": url})
}
