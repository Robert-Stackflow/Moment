package moment

import (
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type mapRoundTripper func(*http.Request) (*http.Response, error)

func (f mapRoundTripper) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestMapConfigurationAndRoutes(t *testing.T) {
	a, handler, cookie := testApp(t)
	w, _ := call(t, handler, "PATCH", "/api/admin/settings/maps", Object{"source": "custom", "key": "browser-key", "security_code": "server-only-code"}, cookie)
	status(t, w, 200)
	w, _ = call(t, handler, "GET", "/api/v1/visitor/maps/config", nil, nil)
	if w.Code != 200 || !strings.Contains(w.Body.String(), "browser-key") || strings.Contains(w.Body.String(), "server-only-code") {
		t.Fatal("public configuration must expose only the browser key")
	}
	for _, path := range []string{"/_AMapService/v1/other", "/_AMapService/v3/../secret"} {
		w = httptest.NewRecorder()
		handler.ServeHTTP(w, httptest.NewRequest("GET", path, nil))
		if w.Code != 404 {
			t.Fatal("unexpected proxy route", path, w.Code)
		}
	}
	if _, err := a.db.Exec(`UPDATE setting SET maps='{}'`); err != nil {
		t.Fatal(err)
	}
	w, _ = call(t, handler, "GET", "/api/v1/visitor/maps/config", nil, nil)
	if strings.Contains(w.Body.String(), "browser-key") || !strings.Contains(w.Body.String(), "local") {
		t.Fatal("incomplete configuration must not enable AMap")
	}
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, httptest.NewRequest("GET", "/_AMapService/v3/config", nil))
	if w.Code != 404 {
		t.Fatal("unconfigured proxy must be unavailable")
	}
}

func TestMapSettingsLifecycle(t *testing.T) {
	t.Setenv("MOMENT_AMAP_KEY", "unused-environment-key")
	t.Setenv("MOMENT_AMAP_SECURITY_CODE", "unused-environment-secret")
	_, h, cookie := testApp(t)
	w, _ := call(t, h, "GET", "/api/v1/visitor/maps/config", nil, nil)
	if strings.Contains(w.Body.String(), "unused-environment") || !strings.Contains(w.Body.String(), "local") {
		t.Fatal("environment variables must not configure maps")
	}
	w, _ = call(t, h, "PATCH", "/api/admin/settings/maps", Object{"source": "custom", "key": "saved-key", "security_code": "saved-secret"}, nil)
	status(t, w, 401)
	for _, changes := range []Object{
		{"source": "environment"}, {"source": "custom", "key": "missing-secret"},
		{"source": "custom", "security_code": 42}, {"unknown": "value"},
	} {
		w, _ = call(t, h, "PATCH", "/api/admin/settings/maps", changes, cookie)
		status(t, w, 400)
	}
	w, _ = call(t, h, "PATCH", "/api/admin/settings/maps", Object{"source": "custom", "key": " saved-key ", "security_code": " saved-secret "}, cookie)
	status(t, w, 200)
	w, result := call(t, h, "GET", "/api/admin/settings", nil, cookie)
	maps := object(object(result["data"])["maps"])
	if strings.Contains(w.Body.String(), "saved-secret") || maps["security_code_configured"] != true || text(maps["key"]) != "saved-key" {
		t.Fatal("admin settings must mask the saved security code")
	}
	w, _ = call(t, h, "PATCH", "/api/admin/settings/maps", Object{"source": "custom", "key": "next-key", "security_code": ""}, cookie)
	status(t, w, 200)
	w, _ = call(t, h, "GET", "/api/v1/visitor/maps/config", nil, nil)
	if !strings.Contains(w.Body.String(), "next-key") || strings.Contains(w.Body.String(), "saved-secret") {
		t.Fatal("configuration changes must take effect without restart")
	}
	for _, section := range []string{"general", "meta", "content", "maps"} {
		w, _ = call(t, h, "GET", "/api/v1/visitor/settings/"+section, nil, nil)
		if strings.Contains(w.Body.String(), "saved-secret") || strings.Contains(w.Body.String(), "next-key") {
			t.Fatal("map credentials exposed through public settings")
		}
	}
	w, _ = call(t, h, "PATCH", "/api/admin/settings/maps", Object{"source": "disabled"}, cookie)
	status(t, w, 200)
	w, _ = call(t, h, "GET", "/api/v1/visitor/maps/config", nil, nil)
	if !strings.Contains(w.Body.String(), "local") {
		t.Fatal("disabling AMap must use the local map")
	}
}

func TestMapProxyKeepsSecurityCodeServerSide(t *testing.T) {
	for _, path := range []string{"/v4/map/styles", "/v3/config", "/v3/log/init"} {
		proxy := amapProxy("configured-key", "server-only-code", mapRoundTripper(func(r *http.Request) (*http.Response, error) {
			want := "restapi.amap.com"
			if path == "/v4/map/styles" {
				want = "webapi.amap.com"
			}
			if r.URL.Host != want || r.URL.Scheme != "https" || r.URL.Path != path || r.Host != want {
				t.Fatal("wrong upstream")
			}
			if r.URL.Query().Get("jscode") != "server-only-code" || r.URL.Query().Get("key") != "configured-key" {
				t.Fatal("credentials were not injected server side")
			}
			if r.Header.Get("Cookie") != "" || r.Header.Get("Authorization") != "" {
				t.Fatal("application credentials forwarded")
			}
			return &http.Response{StatusCode: 200, Header: http.Header{"Content-Type": []string{"application/octet-stream"}}, Body: io.NopCloser(strings.NewReader(`jsonp_123({"ok":true})`)), Request: r}, nil
		}))
		request := httptest.NewRequest("GET", "/_AMapService"+path+"?key=untrusted&jscode=untrusted&callback=jsonp_123", nil)
		request.Header.Set("Cookie", "moment_session=private")
		request.Header.Set("Authorization", "Bearer private")
		response := httptest.NewRecorder()
		proxy.ServeHTTP(response, request)
		if !strings.HasPrefix(response.Header().Get("Content-Type"), "application/javascript") {
			t.Fatal("SDK JSONP response must have script MIME type")
		}
		if strings.Contains(response.Body.String(), "server-only-code") || strings.Contains(request.URL.RawQuery, "server-only-code") {
			t.Fatal("secret escaped upstream request")
		}
	}
	proxy := amapProxy("key", "secret", mapRoundTripper(func(*http.Request) (*http.Response, error) { return nil, errors.New("upstream URL contains secret") }))
	w := httptest.NewRecorder()
	proxy.ServeHTTP(w, httptest.NewRequest("GET", "/_AMapService/v3/config", nil))
	if w.Code != 502 || strings.Contains(w.Body.String(), "secret") {
		t.Fatal("upstream error must not expose credentials")
	}
}

func TestMapBinaryResponsesKeepTheirContentType(t *testing.T) {
	for _, query := range []string{"", "?callback=invalid()"} {
		proxy := amapProxy("key", "secret", mapRoundTripper(func(r *http.Request) (*http.Response, error) {
			return &http.Response{StatusCode: 200, Header: http.Header{"Content-Type": []string{"application/octet-stream"}}, Body: io.NopCloser(strings.NewReader("binary")), Request: r}, nil
		}))
		w := httptest.NewRecorder()
		proxy.ServeHTTP(w, httptest.NewRequest("GET", "/_AMapService/v3/config"+query, nil))
		if w.Header().Get("Content-Type") != "application/octet-stream" {
			t.Fatal("non-JSONP content type changed")
		}
	}
}

func TestMapGeocoderJSONPHasScriptContentType(t *testing.T) {
	proxy := amapProxy("key", "secret", mapRoundTripper(func(r *http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 200, Header: http.Header{"Content-Type": []string{"application/json;charset=utf-8"}}, Body: io.NopCloser(strings.NewReader(`callback_1({"status":"1"})`)), Request: r}, nil
	}))
	for _, query := range []string{"", "?callback=callback_1"} {
		w := httptest.NewRecorder()
		proxy.ServeHTTP(w, httptest.NewRequest("GET", "/_AMapService/v3/geocode/regeo"+query, nil))
		want := "application/json"
		if query != "" {
			want = "application/javascript"
		}
		if !strings.HasPrefix(w.Header().Get("Content-Type"), want) {
			t.Fatal("incorrect geocoder MIME")
		}
	}
}
