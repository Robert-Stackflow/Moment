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
	t.Setenv("MOMENT_AMAP_KEY", "browser-key")
	t.Setenv("MOMENT_AMAP_SECURITY_CODE", "server-only-code")
	_, handler, _ := testApp(t)
	w, _ := call(t, handler, "GET", "/api/v1/visitor/maps/config", nil, nil)
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
	t.Setenv("MOMENT_AMAP_SECURITY_CODE", "")
	_, handler, _ = testApp(t)
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
