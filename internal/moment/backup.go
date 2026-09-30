package moment

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"github.com/gin-gonic/gin"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

const backupArchiveLimit int64 = 2 << 30
const backupExpandedLimit int64 = 8 << 30
const backupFileLimit = 100000

var backupKey = regexp.MustCompile(`^[a-f0-9]{32}$`)

type backupFile struct {
	Name   string `json:"name"`
	Size   int64  `json:"size"`
	SHA256 string `json:"sha256"`
}
type backupManifest struct {
	Format    string       `json:"format"`
	Version   int          `json:"version"`
	CreatedAt string       `json:"created_at"`
	Files     []backupFile `json:"files"`
}
type backupInfo struct {
	ID         string `json:"id"`
	CreatedAt  string `json:"created_at"`
	Size       int64  `json:"size"`
	Source     string `json:"source"`
	Posts      int64  `json:"posts"`
	Images     int64  `json:"images"`
	Drafts     int64  `json:"drafts"`
	Trash      int64  `json:"trash"`
	LocalFiles int    `json:"local_files"`
}

// Normal readers can continue during an export. Mutations wait until the
// snapshot and immutable media have been archived. Restore excludes all readers.
func (a *App) dataGate(c *gin.Context) {
	path := c.Request.URL.Path
	if c.Request.Method == "POST" && strings.HasPrefix(path, "/api/admin/backups/") && strings.HasSuffix(path, "/restore") {
		a.stateMu.Lock()
		defer a.stateMu.Unlock()
	} else {
		a.stateMu.RLock()
		defer a.stateMu.RUnlock()
	}
	if c.Request.Method == "POST" && path == "/api/admin/backups" {
		a.writeMu.Lock()
		defer a.writeMu.Unlock()
	} else if c.Request.Method != "GET" && c.Request.Method != "HEAD" {
		a.writeMu.RLock()
		defer a.writeMu.RUnlock()
	}
	c.Next()
}

func randomBackupKey() (string, error) {
	var bytes [16]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes[:]), nil
}
func (a *App) backupDir() string           { return filepath.Join(a.data, "backups", "exports") }
func (a *App) backupPath(id string) string { return filepath.Join(a.backupDir(), id+".zip") }
func backupContext(c *gin.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(c.Request.Context(), 4*time.Minute)
}
func (a *App) beginBackup(c *gin.Context) bool {
	if !a.backupMu.TryLock() {
		fail(c, 409, "已有备份操作正在进行，请稍后重试")
		return false
	}
	return true
}
func (a *App) listBackups(c *gin.Context) {
	entries, err := os.ReadDir(a.backupDir())
	if err != nil && !os.IsNotExist(err) {
		databaseError(c, err)
		return
	}
	list := []backupInfo{}
	for _, entry := range entries {
		id := strings.TrimSuffix(entry.Name(), ".json")
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") || !backupKey.MatchString(id) {
			continue
		}
		info, err := a.readBackupInfo(id)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			databaseError(c, err)
			return
		}
		list = append(list, info)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].CreatedAt > list[j].CreatedAt })
	ok(c, list)
}
func (a *App) readBackupInfo(id string) (backupInfo, error) {
	var info backupInfo
	if !backupKey.MatchString(id) {
		return info, os.ErrNotExist
	}
	data, err := os.ReadFile(filepath.Join(a.backupDir(), id+".json"))
	if err == nil {
		err = json.Unmarshal(data, &info)
	}
	if err != nil {
		return info, err
	}
	stat, err := os.Lstat(a.backupPath(id))
	if err == nil && !stat.Mode().IsRegular() {
		err = errors.New("backup is not a regular file")
	}
	if err == nil {
		info.Size = stat.Size()
		info.ID = id
	}
	return info, err
}
func (a *App) saveBackupInfo(id, source string, manifest backupManifest, info backupInfo) (backupInfo, error) {
	stat, err := os.Stat(a.backupPath(id))
	if err != nil {
		return info, err
	}
	info.ID, info.Source, info.CreatedAt = id, source, manifest.CreatedAt
	info.Size, info.LocalFiles = stat.Size(), len(manifest.Files)-1
	bytes, err := json.Marshal(info)
	if err == nil {
		target := filepath.Join(a.backupDir(), id+".json")
		err = os.WriteFile(target+".tmp", bytes, 0600)
		if err == nil {
			err = os.Rename(target+".tmp", target)
		}
	}
	return info, err
}
func (a *App) createBackup(c *gin.Context) {
	if !a.beginBackup(c) {
		return
	}
	defer a.backupMu.Unlock()
	ctx, cancel := backupContext(c)
	defer cancel()
	info, err := a.exportBackup(ctx, "manual")
	if err != nil {
		databaseError(c, err)
		return
	}
	ok(c, info)
}

func (a *App) importBackup(c *gin.Context) {
	if !a.beginBackup(c) {
		return
	}
	defer a.backupMu.Unlock()
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, backupArchiveLimit+(1<<20))
	file, err := c.FormFile("file")
	if c.Request.MultipartForm != nil {
		defer c.Request.MultipartForm.RemoveAll()
	}
	if err != nil || file.Size < 1 || file.Size > backupArchiveLimit {
		fail(c, 400, "请选择不超过 2 GB 的 Moment 备份 ZIP")
		return
	}
	if err = os.MkdirAll(a.backupDir(), 0700); err != nil {
		databaseError(c, err)
		return
	}
	stage, err := os.MkdirTemp(a.backupDir(), ".import-")
	if err != nil {
		databaseError(c, err)
		return
	}
	defer os.RemoveAll(stage)
	input, err := file.Open()
	if err != nil {
		fail(c, 400, "无法读取备份")
		return
	}
	defer input.Close()
	path := filepath.Join(stage, "archive.zip")
	output, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		databaseError(c, err)
		return
	}
	ctx, cancel := backupContext(c)
	defer cancel()
	_, err = io.Copy(output, contextReader{ctx, input})
	closeErr := output.Close()
	if err == nil {
		err = closeErr
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	manifest, info, err := unpackBackup(ctx, path, filepath.Join(stage, "data"))
	if err != nil {
		fail(c, 400, "备份校验失败：文件损坏、格式/版本不匹配或内容超出限制")
		return
	}
	id, err := randomBackupKey()
	if err == nil {
		err = os.Rename(path, a.backupPath(id))
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	info, err = a.saveBackupInfo(id, "import", manifest, info)
	if err != nil {
		_ = os.Remove(a.backupPath(id))
		databaseError(c, err)
		return
	}
	ok(c, info)
}
func (a *App) downloadBackup(c *gin.Context) {
	info, err := a.readBackupInfo(c.Param("key"))
	if err != nil {
		fail(c, 404, "备份不存在")
		return
	}
	c.Header("Content-Type", "application/zip")
	c.FileAttachment(a.backupPath(info.ID), "moment-"+info.ID+".zip")
}
func (a *App) deleteBackup(c *gin.Context) {
	if !a.beginBackup(c) {
		return
	}
	defer a.backupMu.Unlock()
	info, err := a.readBackupInfo(c.Param("key"))
	if err != nil {
		fail(c, 404, "备份不存在")
		return
	}
	if err = os.Remove(a.backupPath(info.ID)); err != nil {
		databaseError(c, err)
		return
	}
	if err = os.Remove(filepath.Join(a.backupDir(), info.ID+".json")); err != nil {
		databaseError(c, err)
		return
	}
	ok(c, nil)
}
