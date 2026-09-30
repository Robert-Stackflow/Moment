package moment

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

// Both duplicate detection and local tagging use the same bounded read policy.
// A local fingerprint cache can avoid reading an unchanged file altogether.
func (a *App) readAnalysisPhoto(ctx context.Context, raw string, remote bool, cached func(string) bool) ([]byte, string, error) {
	var content []byte
	var sourceKey string
	var err error
	if strings.HasPrefix(raw, "/uploads/") {
		u, e := url.Parse(raw)
		if e != nil || u.RawQuery != "" || u.Fragment != "" {
			return nil, "", errors.New("本地图片路径无效")
		}
		name := strings.TrimPrefix(u.Path, "/uploads/")
		if !validBackupName("uploads/" + name) {
			return nil, "", errors.New("本地图片路径无效")
		}
		root, e := os.OpenRoot(filepath.Join(a.data, "uploads"))
		if e != nil {
			return nil, "", errors.New("本地图片不存在")
		}
		defer root.Close()
		file, e := root.Open(filepath.FromSlash(name))
		if e != nil {
			return nil, "", errors.New("本地图片不存在或路径不可用")
		}
		defer file.Close()
		stat, e := file.Stat()
		if e != nil || !stat.Mode().IsRegular() {
			return nil, "", errors.New("本地图片不可读取")
		}
		if stat.Size() < 1 || stat.Size() > analysisBytes {
			return nil, "", errors.New("文件超过 32 MB 或为空")
		}
		sourceKey = tokenDigest(fmt.Sprintf("analysis-v1\n%s\n%d\n%d", name, stat.Size(), stat.ModTime().UnixNano()))
		if cached != nil && cached(sourceKey) {
			return nil, sourceKey, nil
		}
		content, err = io.ReadAll(io.LimitReader(file, analysisBytes+1))
		after, e := file.Stat()
		if e != nil || after.Size() != stat.Size() || !after.ModTime().Equal(stat.ModTime()) {
			return nil, "", errors.New("扫描期间文件发生变化，请重新扫描")
		}
	} else {
		if !remote {
			return nil, "", errors.New("未启用远程图片读取，仅比较相同链接")
		}
		u, e := analysisURL(raw)
		if e != nil {
			return nil, "", e
		}
		req, e := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
		if e != nil {
			return nil, "", errors.New("图片地址无效")
		}
		req.Header.Set("Accept", "image/*")
		req.Header.Set("User-Agent", "Moment-PhotoAnalysis/1")
		response, e := a.analysisHTTP.Do(req)
		if e != nil {
			return nil, "", errors.New("远程图片无法读取（连接失败、超时或地址受限）")
		}
		defer response.Body.Close()
		if response.StatusCode != http.StatusOK {
			return nil, "", fmt.Errorf("远程图片返回 HTTP %d", response.StatusCode)
		}
		if response.ContentLength > analysisBytes {
			return nil, "", errors.New("文件超过 32 MB")
		}
		content, err = io.ReadAll(io.LimitReader(response.Body, analysisBytes+1))
	}
	if err != nil {
		return nil, "", errors.New("图片读取失败，请稍后重试")
	}
	if len(content) == 0 || int64(len(content)) > analysisBytes {
		return nil, "", errors.New("文件超过 32 MB 或为空")
	}
	if ctx.Err() != nil {
		return nil, "", ctx.Err()
	}
	return content, sourceKey, nil
}
