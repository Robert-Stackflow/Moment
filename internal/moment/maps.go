package moment

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

var mapCallback = regexp.MustCompile(`^[A-Za-z_$][A-Za-z0-9_$]*$`)

// Only the browser key is public. The JS security code stays on this service.
func (a *App) mapCredentials() (string, string, error) {
	var raw string
	if err := a.db.QueryRow("SELECT maps FROM setting ORDER BY id LIMIT 1").Scan(&raw); err != nil {
		return "", "", err
	}
	var settings Object
	if err := json.Unmarshal([]byte(raw), &settings); err != nil {
		return "", "", err
	}
	switch text(settings["source"]) {
	case "disabled":
		return "", "", nil
	default:
		return text(settings["key"]), text(settings["security_code"]), nil
	}
}

func (a *App) registerMaps(r *gin.Engine) {
	r.GET("/api/v1/visitor/maps/config", func(c *gin.Context) {
		key, secret, err := a.mapCredentials()
		if err != nil {
			databaseError(c, err)
			return
		}
		if key == "" || secret == "" {
			ok(c, Object{"provider": "local"})
			return
		}
		ok(c, Object{"provider": "amap", "key": key, "serviceHost": "/_AMapService", "style": "amap://styles/fresh"})
	})
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.ResponseHeaderTimeout = 15 * time.Second
	r.GET("/_AMapService/*path", func(c *gin.Context) {
		key, secret, err := a.mapCredentials()
		if err != nil {
			databaseError(c, err)
			return
		}
		if key == "" || secret == "" {
			c.Status(http.StatusNotFound)
			return
		}
		path := c.Param("path")
		if (!strings.HasPrefix(path, "/v3/") && path != "/v4/map/styles") || strings.Contains(path, "..") || len(c.Request.URL.RawQuery) > 8192 {
			c.Status(http.StatusNotFound)
			return
		}
		amapProxy(key, secret, transport).ServeHTTP(c.Writer, c.Request)
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
			// them JSON or octet-stream. Keep nosniff and correct only callback responses.
			callback := response.Request.URL.Query().Get("callback")
			kind := strings.ToLower(strings.Split(response.Header.Get("Content-Type"), ";")[0])
			if response.StatusCode == http.StatusOK && mapCallback.MatchString(callback) && (kind == "application/octet-stream" || kind == "text/plain" || kind == "application/json") {
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
