package moment

import (
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

var mapCallback = regexp.MustCompile(`^[A-Za-z_$][A-Za-z0-9_$]*$`)

// Only the browser key is public. The JS security code stays on this service.
func registerMaps(r *gin.Engine) {
	key, secret := strings.TrimSpace(os.Getenv("MOMENT_AMAP_KEY")), strings.TrimSpace(os.Getenv("MOMENT_AMAP_SECURITY_CODE"))
	enabled := key != "" && secret != ""
	r.GET("/api/v1/visitor/maps/config", func(c *gin.Context) {
		if !enabled {
			ok(c, Object{"provider": "local"})
			return
		}
		ok(c, Object{"provider": "amap", "key": key, "serviceHost": "/_AMapService", "style": "amap://styles/whitesmoke"})
	})
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.ResponseHeaderTimeout = 15 * time.Second
	proxy := amapProxy(key, secret, transport)
	r.GET("/_AMapService/*path", func(c *gin.Context) {
		if !enabled {
			c.Status(http.StatusNotFound)
			return
		}
		path := c.Param("path")
		if (!strings.HasPrefix(path, "/v3/") && path != "/v4/map/styles") || strings.Contains(path, "..") || len(c.Request.URL.RawQuery) > 8192 {
			c.Status(http.StatusNotFound)
			return
		}
		proxy.ServeHTTP(c.Writer, c.Request)
	})
}

func amapProxy(key, secret string, transport http.RoundTripper) *httputil.ReverseProxy {
	return &httputil.ReverseProxy{
		Rewrite: func(p *httputil.ProxyRequest) {
			path := strings.TrimPrefix(p.In.URL.Path, "/_AMapService")
			p.Out.URL.Scheme, p.Out.URL.Host, p.Out.URL.Path = "https", "restapi.amap.com", path
			if path == "/v4/map/styles" {
				p.Out.URL.Host = "webapi.amap.com"
			}
			p.Out.Host = p.Out.URL.Host
			q := p.Out.URL.Query()
			q.Set("key", key)
			q.Set("jscode", secret)
			p.Out.URL.RawQuery = q.Encode()
			p.Out.Header.Del("Cookie")
			p.Out.Header.Del("Authorization")
		},
		Transport: transport,
		ModifyResponse: func(response *http.Response) error {
			// The SDK loads some JSONP endpoints as scripts, although AMap labels
			// them octet-stream. Keep nosniff and correct only callback responses.
			callback := response.Request.URL.Query().Get("callback")
			kind := strings.ToLower(strings.Split(response.Header.Get("Content-Type"), ";")[0])
			if response.StatusCode == http.StatusOK && mapCallback.MatchString(callback) && (kind == "application/octet-stream" || kind == "text/plain") {
				response.Header.Set("Content-Type", "application/javascript; charset=utf-8")
			}
			return nil
		},
		ErrorLog: log.New(io.Discard, "", 0),
		ErrorHandler: func(w http.ResponseWriter, _ *http.Request, _ error) {
			http.Error(w, "地图服务暂时不可用", http.StatusBadGateway)
		},
	}
}
