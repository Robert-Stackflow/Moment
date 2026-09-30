package moment

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/color"
	"io"
	"math"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"golang.org/x/image/draw"
)

const analysisBytes int64 = 32 << 20
const analysisPixels int64 = 32_000_000

type photoFingerprint struct {
	SHA    string `json:"sha,omitempty"`
	Hash   string `json:"hash,omitempty"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
	Bytes  int64  `json:"bytes"`
	Color  [3]int `json:"color"`
	Reason string `json:"reason,omitempty"`
}

// Analysis reads only a bounded original from local uploads or a public HTTP
// address. Never attach S3 credentials, cookies, proxies or request headers.
func publicAnalysisAddress(address netip.Addr) bool {
	address = address.Unmap()
	if !address.IsValid() || !address.IsGlobalUnicast() || address.IsPrivate() || address.IsLoopback() || address.IsLinkLocalUnicast() {
		return false
	}
	if address.Is6() && !netip.MustParsePrefix("2000::/3").Contains(address) {
		return false
	}
	for _, value := range []string{"0.0.0.0/8", "100.64.0.0/10", "192.0.0.0/24", "192.0.2.0/24", "198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24", "240.0.0.0/4", "2001:db8::/32", "2001::/32", "2002::/16", "64:ff9b::/96"} {
		if netip.MustParsePrefix(value).Contains(address) {
			return false
		}
	}
	return true
}
func analysisURL(raw string) (*url.URL, error) {
	u, err := url.Parse(raw)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Hostname() == "" || u.User != nil || u.Fragment != "" {
		return nil, errors.New("图片地址无效")
	}
	host := strings.TrimSuffix(strings.ToLower(u.Hostname()), ".")
	if host == "localhost" || strings.HasSuffix(host, ".localhost") || strings.HasSuffix(host, ".local") {
		return nil, errors.New("远程扫描仅支持公网图片地址")
	}
	if ip, err := netip.ParseAddr(host); err == nil && !publicAnalysisAddress(ip) {
		return nil, errors.New("远程扫描仅支持公网图片地址")
	}
	return u, nil
}
func analysisHTTPClient() *http.Client {
	transport := &http.Transport{Proxy: nil, MaxIdleConns: 2, MaxIdleConnsPerHost: 1, IdleConnTimeout: 30 * time.Second, TLSHandshakeTimeout: 5 * time.Second, ResponseHeaderTimeout: 8 * time.Second}
	transport.DialContext = func(ctx context.Context, network, address string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(address)
		if err != nil {
			return nil, err
		}
		addresses, err := net.DefaultResolver.LookupNetIP(ctx, "ip", host)
		if err != nil {
			return nil, errors.New("无法解析图片服务器")
		}
		if len(addresses) == 0 {
			return nil, errors.New("无法解析图片服务器")
		}
		// Validate every answer, then connect to a checked IP to prevent DNS rebinding.
		for _, ip := range addresses {
			if !publicAnalysisAddress(ip) {
				return nil, errors.New("远程扫描仅支持公网图片地址")
			}
		}
		dialer := net.Dialer{Timeout: 5 * time.Second}
		for _, ip := range addresses {
			connection, e := dialer.DialContext(ctx, network, net.JoinHostPort(ip.String(), port))
			if e == nil {
				return connection, nil
			}
			err = e
		}
		return nil, err
	}
	return &http.Client{Transport: transport, Timeout: 15 * time.Second, CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 3 {
			return errors.New("图片跳转次数过多")
		}
		_, err := analysisURL(req.URL.String())
		return err
	}}
}

func (a *App) fingerprintPhoto(ctx context.Context, raw string, remote bool) photoFingerprint {
	result := photoFingerprint{}
	var content []byte
	var sourceKey string
	var err error
	if strings.HasPrefix(raw, "/uploads/") {
		u, e := url.Parse(raw)
		if e != nil || u.RawQuery != "" || u.Fragment != "" {
			result.Reason = "本地图片路径无效"
			return result
		}
		name := strings.TrimPrefix(u.Path, "/uploads/")
		if !validBackupName("uploads/" + name) {
			result.Reason = "本地图片路径无效"
			return result
		}
		root, e := os.OpenRoot(filepath.Join(a.data, "uploads"))
		if e != nil {
			result.Reason = "本地图片不存在"
			return result
		}
		defer root.Close()
		file, e := root.Open(filepath.FromSlash(name))
		if e != nil {
			result.Reason = "本地图片不存在或路径不可用"
			return result
		}
		defer file.Close()
		stat, e := file.Stat()
		if e != nil || !stat.Mode().IsRegular() {
			result.Reason = "本地图片不可读取"
			return result
		}
		if stat.Size() < 1 || stat.Size() > analysisBytes {
			result.Reason = "文件超过 32 MB 或为空"
			return result
		}
		sourceKey = tokenDigest(fmt.Sprintf("analysis-v1\n%s\n%d\n%d", name, stat.Size(), stat.ModTime().UnixNano()))
		var cached string
		if a.db.QueryRowContext(ctx, "SELECT fingerprint FROM moment_photo_analysis_cache WHERE source_key=?", sourceKey).Scan(&cached) == nil && json.Unmarshal([]byte(cached), &result) == nil {
			return result
		}
		content, err = io.ReadAll(io.LimitReader(file, analysisBytes+1))
		after, e := file.Stat()
		if e != nil || after.Size() != stat.Size() || !after.ModTime().Equal(stat.ModTime()) {
			result.Reason = "扫描期间文件发生变化，请重新扫描"
			return result
		}
	} else {
		if !remote {
			result.Reason = "未启用远程图片读取，仅比较相同链接"
			return result
		}
		u, e := analysisURL(raw)
		if e != nil {
			result.Reason = e.Error()
			return result
		}
		req, e := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
		if e != nil {
			result.Reason = "图片地址无效"
			return result
		}
		req.Header.Set("Accept", "image/*")
		req.Header.Set("User-Agent", "Moment-PhotoAnalysis/1")
		response, e := a.analysisHTTP.Do(req)
		if e != nil {
			result.Reason = "远程图片无法读取（连接失败、超时或地址受限）"
			return result
		}
		defer response.Body.Close()
		if response.StatusCode != http.StatusOK {
			result.Reason = fmt.Sprintf("远程图片返回 HTTP %d", response.StatusCode)
			return result
		}
		if response.ContentLength > analysisBytes {
			result.Reason = "文件超过 32 MB"
			return result
		}
		content, err = io.ReadAll(io.LimitReader(response.Body, analysisBytes+1))
	}
	if err != nil {
		result.Reason = "图片读取失败，请稍后重试"
		return result
	}
	if len(content) == 0 || int64(len(content)) > analysisBytes {
		result.Reason = "文件超过 32 MB 或为空"
		return result
	}
	result = analyzePhotoBytes(ctx, content)
	if sourceKey != "" && ctx.Err() == nil {
		payload, _ := json.Marshal(result)
		_, _ = a.db.ExecContext(ctx, "INSERT INTO moment_photo_analysis_cache(source_key,fingerprint,created_at) VALUES(?,?,?) ON CONFLICT(source_key) DO UPDATE SET fingerprint=excluded.fingerprint,created_at=excluded.created_at", sourceKey, string(payload), time.Now().UnixNano())
		_, _ = a.db.ExecContext(ctx, "DELETE FROM moment_photo_analysis_cache WHERE source_key IN (SELECT source_key FROM moment_photo_analysis_cache ORDER BY created_at DESC LIMIT -1 OFFSET 5000)")
	}
	return result
}

func analyzePhotoBytes(ctx context.Context, content []byte) photoFingerprint {
	digest := sha256.Sum256(content)
	result := photoFingerprint{SHA: hex.EncodeToString(digest[:]), Bytes: int64(len(content))}
	config, format, err := image.DecodeConfig(bytes.NewReader(content))
	if err != nil {
		mime := http.DetectContentType(content[:min(512, len(content))])
		avif := len(content) >= 12 && string(content[4:8]) == "ftyp" && (string(content[8:12]) == "avif" || string(content[8:12]) == "avis")
		if !strings.HasPrefix(mime, "image/") && !avif {
			result.SHA = ""
			result.Reason = "内容不是可识别的图片"
		} else {
			result.Reason = "此格式仅比较文件内容，不比较画面"
		}
		return result
	}
	result.Width, result.Height = config.Width, config.Height
	if config.Width < 1 || config.Height < 1 || config.Width > 16384 || config.Height > 16384 || int64(config.Width)*int64(config.Height) > analysisPixels {
		result.Reason = "尺寸超过 3200 万像素，仅比较文件内容"
		return result
	}
	if format == "gif" || (format == "png" && animatedPNG(bytes.NewReader(content))) || (format == "webp" && bytes.Contains(content[:min(64, len(content))], []byte("ANIM"))) {
		result.Reason = "动图仅比较文件内容"
		return result
	}
	if ctx.Err() != nil {
		result.Reason = "扫描已暂停"
		return result
	}
	source, _, err := image.Decode(bytes.NewReader(content))
	if err != nil {
		result.Reason = "图片无法解码，仅比较文件内容"
		return result
	}
	if source.Bounds().Dx() != config.Width || source.Bounds().Dy() != config.Height {
		result.Reason = "图片尺寸不一致，仅比较文件内容"
		return result
	}
	small := image.NewNRGBA(image.Rect(0, 0, 32, 32))
	draw.Draw(small, small.Bounds(), image.NewUniform(color.White), image.Point{}, draw.Src)
	draw.ApproxBiLinear.Scale(small, small.Bounds(), source, source.Bounds(), draw.Over, nil)
	if format == "jpeg" {
		orientation := jpegOrientation(bytes.NewReader(content))
		small = orientThumbnail(small, orientation)
		if orientation >= 5 {
			result.Width, result.Height = result.Height, result.Width
		}
	}
	var gray [1024]float64
	for y := 0; y < 32; y++ {
		for x := 0; x < 32; x++ {
			c := small.NRGBAAt(x, y)
			result.Color[0] += int(c.R)
			result.Color[1] += int(c.G)
			result.Color[2] += int(c.B)
			gray[y*32+x] = .299*float64(c.R) + .587*float64(c.G) + .114*float64(c.B)
		}
	}
	for i := range result.Color {
		result.Color[i] /= 1024
	}
	// Low-frequency DCT coefficients survive ordinary JPEG recompression and resizing.
	coefficients := make([]float64, 0, 63)
	for v := 0; v < 8; v++ {
		for u := 0; u < 8; u++ {
			if u == 0 && v == 0 {
				continue
			}
			var total float64
			for y := 0; y < 32; y++ {
				for x := 0; x < 32; x++ {
					total += gray[y*32+x] * analysisCos[u][x] * analysisCos[v][y]
				}
			}
			coefficients = append(coefficients, total)
		}
	}
	sorted := append([]float64{}, coefficients...)
	sort.Float64s(sorted)
	median := sorted[len(sorted)/2]
	var hash uint64
	for i, value := range coefficients {
		if value > median {
			hash |= 1 << i
		}
	}
	result.Hash = strconv.FormatUint(hash, 16)
	return result
}

var analysisCos = func() [8][32]float64 {
	var values [8][32]float64
	for frequency := range values {
		for point := range values[frequency] {
			values[frequency][point] = math.Cos((2*float64(point) + 1) * float64(frequency) * math.Pi / 64)
		}
	}
	return values
}()
