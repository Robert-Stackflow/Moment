package moment

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-gonic/gin"
)

func (a *App) upload(c *gin.Context) {
	settings, err := a.readSettings()
	if err != nil {
		databaseError(c, err)
		return
	}
	storage := object(settings["storage"])
	if enabled, exists := storage["enable_storage"]; exists && enabled == false {
		fail(c, 400, "上传已关闭")
		return
	}
	max := float64(32)
	switch size := storage["max_size"].(type) {
	case float64:
		if size > 0 && size <= 256 {
			max = size
		}
	case int64:
		if size > 0 && size <= 256 {
			max = float64(size)
		}
	}
	limit := int64(max * 1024 * 1024)
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, limit+(1<<20))
	file, err := c.FormFile("file")
	if c.Request.MultipartForm != nil {
		defer c.Request.MultipartForm.RemoveAll()
	}
	if err != nil {
		fail(c, 400, "请上传限制大小内的图片")
		return
	}
	if file.Size < 1 || file.Size > limit {
		fail(c, 400, "图片超过上传大小限制")
		return
	}
	stream, err := file.Open()
	if err != nil {
		fail(c, 400, "无法读取图片")
		return
	}
	defer stream.Close()
	buffer := make([]byte, 512)
	n, _ := stream.Read(buffer)
	contentType := http.DetectContentType(buffer[:n])
	if n >= 12 && string(buffer[4:8]) == "ftyp" && (string(buffer[8:12]) == "avif" || string(buffer[8:12]) == "avis") {
		contentType = "image/avif"
	}
	extensions := map[string]string{"image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp", "image/bmp": ".bmp", "image/tiff": ".tif", "image/avif": ".avif", "image/x-icon": ".ico", "image/vnd.microsoft.icon": ".ico"}
	extension, valid := extensions[contentType]
	if !valid {
		fail(c, 400, "请上传 JPEG、PNG、WebP、GIF、AVIF、TIFF、BMP 或 ICO 图片")
		return
	}
	if _, err = stream.Seek(0, io.SeekStart); err != nil {
		fail(c, 400, "无法读取图片")
		return
	}
	random := make([]byte, 16)
	if _, err = rand.Read(random); err != nil {
		fail(c, 500, "无法生成文件名")
		return
	}
	unique := hex.EncodeToString(random)
	filename := strings.TrimSuffix(filepath.Base(strings.ReplaceAll(file.Filename, "\\", "/")), filepath.Ext(file.Filename))
	filename = strings.Map(func(r rune) rune {
		if r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || r == '_' || r == '-' {
			return r
		}
		return '_'
	}, filename)
	if len(filename) > 60 {
		filename = filename[:60]
	}
	filename = filename + "-" + unique + extension
	date := time.Now().In(zone)
	template := text(storage["path"])
	if template == "" {
		template = "{year}/{month}/{filename}"
	}
	key := strings.NewReplacer("{year}", date.Format("2006"), "{month}", date.Format("01"), "{day}", date.Format("02"), "{timestamp}", fmt.Sprint(date.UnixNano()), "{filename}", filename).Replace(template)
	key = strings.TrimLeft(key, "/")
	if !strings.Contains(key, unique) {
		key = strings.TrimSuffix(key, filepath.Ext(key)) + "-" + unique + extension
	}
	if strings.Contains(key, "..") || strings.ContainsAny(key, "\\{}\x00") {
		fail(c, 400, "存储路径模板无效")
		return
	}
	provider := text(storage["provider"])
	if provider == "" && text(storage["endpoint"]) != "" {
		provider = "s3"
	}
	if provider == "s3" {
		endpoint, region, bucket := text(storage["endpoint"]), text(storage["region"]), text(storage["bucket"])
		access, secret := text(storage["access_id"]), text(storage["secret_key"])
		if region == "" {
			region = "us-east-1"
		}
		if endpoint == "" || bucket == "" || access == "" || secret == "" || !validURL(text(storage["prefix"])) {
			fail(c, 400, "请完善 S3 配置和公共访问前缀")
			return
		}
		client := s3.New(s3.Options{Region: region, Credentials: credentials.NewStaticCredentialsProvider(access, secret, ""), BaseEndpoint: aws.String(endpoint), UsePathStyle: true})
		timeout := int64(120)
		if value := integer(storage["timeout_time"]); value >= 5 && value <= 600 {
			timeout = value
		}
		ctx, cancel := context.WithTimeout(c.Request.Context(), time.Duration(timeout)*time.Second)
		defer cancel()
		_, err = client.PutObject(ctx, &s3.PutObjectInput{Bucket: aws.String(bucket), Key: aws.String(key), Body: stream, ContentType: aws.String(contentType), ContentLength: aws.Int64(file.Size)})
		if err != nil {
			fail(c, 502, "S3 上传失败，请检查存储配置或稍后重试")
			return
		}
		prefix := strings.TrimRight(text(storage["prefix"]), "/")
		ok(c, Object{"image_url": prefix + "/" + escapeKey(key), "size": file.Size})
		return
	}
	path := filepath.Join(a.data, "uploads", filepath.FromSlash(key))
	base, err := filepath.Abs(filepath.Join(a.data, "uploads"))
	if err != nil {
		fail(c, 500, "无法读取存储目录")
		return
	}
	absolute, err := filepath.Abs(path)
	if err != nil || !strings.HasPrefix(absolute, base+string(filepath.Separator)) {
		fail(c, 400, "存储路径模板无效")
		return
	}
	if err = os.MkdirAll(filepath.Dir(path), 0750); err != nil {
		fail(c, 500, "无法创建存储目录")
		return
	}
	output, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0640)
	if err != nil {
		fail(c, 500, "无法保存图片")
		return
	}
	_, err = io.Copy(output, stream)
	closeErr := output.Close()
	if err != nil || closeErr != nil {
		_ = os.Remove(path)
		fail(c, 500, "图片保存失败")
		return
	}
	ok(c, Object{"image_url": "/uploads/" + escapeKey(key), "size": file.Size})
}
func escapeKey(key string) string {
	parts := strings.Split(key, "/")
	for i, part := range parts {
		parts[i] = url.PathEscape(part)
	}
	return strings.Join(parts, "/")
}
