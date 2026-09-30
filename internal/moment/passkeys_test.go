package moment

import (
	"bytes"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/fxamacker/cbor/v2"
)

const passkeyTestOrigin = "http://localhost:9989"

func passkeyCall(t *testing.T, h http.Handler, method, path string, body any, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	t.Helper()
	payload, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}
	r := httptest.NewRequest(method, passkeyTestOrigin+"/api/admin"+path, bytes.NewReader(payload))
	r.Header.Set("Content-Type", "application/json")
	r.Header.Set("Origin", passkeyTestOrigin)
	for _, cookie := range cookies {
		if cookie != nil {
			r.AddCookie(cookie)
		}
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

func passkeyResponseCookie(t *testing.T, w *httptest.ResponseRecorder, name string) *http.Cookie {
	t.Helper()
	for _, cookie := range w.Result().Cookies() {
		if cookie.Name == name && cookie.MaxAge > 0 {
			return cookie
		}
	}
	t.Fatalf("missing %s cookie", name)
	return nil
}

func enableTestPasskeys(t *testing.T, h http.Handler, auth *http.Cookie) {
	t.Helper()
	status(t, passkeyCall(t, h, "PUT", "/passkeys/config", Object{"enabled": true, "origin": passkeyTestOrigin, "revision": 0, "password": testPassword}, auth), 200)
}

func passkeyOptions(t *testing.T, w *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	status(t, w, 200)
	var result struct {
		Data struct {
			PublicKey map[string]any `json:"publicKey"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if result.Data.PublicKey == nil {
		t.Fatal("missing public key options")
	}
	return result.Data.PublicKey
}

// A software authenticator with a real P-256 key. These fixtures go through the
// production WebAuthn parser and signature verifier without bypasses or mocks.
type passkeyTestDevice struct {
	key        *ecdsa.PrivateKey
	id, handle []byte
}

func newPasskeyTestDevice(t *testing.T) *passkeyTestDevice {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	id := make([]byte, 32)
	if _, err = rand.Read(id); err != nil {
		t.Fatal(err)
	}
	return &passkeyTestDevice{key: key, id: id}
}

func passkeyTestJSON(t *testing.T, value any) []byte {
	t.Helper()
	data, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return data
}

func passkeyTestCBOR(t *testing.T, value any) []byte {
	t.Helper()
	data, err := cbor.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return data
}

func (d *passkeyTestDevice) registration(t *testing.T, options map[string]any) Object {
	t.Helper()
	var err error
	d.handle, err = base64.RawURLEncoding.DecodeString(options["user"].(map[string]any)["id"].(string))
	if err != nil {
		t.Fatal(err)
	}
	client := passkeyTestJSON(t, Object{"type": "webauthn.create", "challenge": options["challenge"], "origin": passkeyTestOrigin, "crossOrigin": false})
	hash := sha256.Sum256([]byte("localhost"))
	auth := append(hash[:], 0x45, 0, 0, 0, 0) // UP + UV + attested credential data
	auth = append(auth, make([]byte, 16)...)
	auth = binary.BigEndian.AppendUint16(auth, uint16(len(d.id)))
	auth = append(auth, d.id...)
	auth = append(auth, passkeyTestCBOR(t, map[int]any{1: 2, 3: -7, -1: 1, -2: d.key.X.FillBytes(make([]byte, 32)), -3: d.key.Y.FillBytes(make([]byte, 32))})...)
	attestation := passkeyTestCBOR(t, map[string]any{"fmt": "none", "authData": auth, "attStmt": map[string]any{}})
	encode := base64.RawURLEncoding.EncodeToString
	return Object{"id": encode(d.id), "rawId": encode(d.id), "type": "public-key", "response": Object{"clientDataJSON": encode(client), "attestationObject": encode(attestation), "transports": []string{"internal"}}, "clientExtensionResults": Object{"credProps": Object{"rk": true}}}
}

func (d *passkeyTestDevice) assertion(t *testing.T, options map[string]any, flags byte, counter uint32, origin, rp string) Object {
	t.Helper()
	client := passkeyTestJSON(t, Object{"type": "webauthn.get", "challenge": options["challenge"], "origin": origin, "crossOrigin": false})
	hash := sha256.Sum256([]byte(rp))
	auth := binary.BigEndian.AppendUint32(append(hash[:], flags), counter)
	clientHash := sha256.Sum256(client)
	message := sha256.Sum256(append(append([]byte{}, auth...), clientHash[:]...))
	signature, err := ecdsa.SignASN1(rand.Reader, d.key, message[:])
	if err != nil {
		t.Fatal(err)
	}
	encode := base64.RawURLEncoding.EncodeToString
	return Object{"id": encode(d.id), "rawId": encode(d.id), "type": "public-key", "response": Object{"clientDataJSON": encode(client), "authenticatorData": encode(auth), "signature": encode(signature), "userHandle": encode(d.handle)}, "clientExtensionResults": Object{}}
}

func addTestPasskey(t *testing.T, h http.Handler, auth *http.Cookie) *passkeyTestDevice {
	t.Helper()
	d := newPasskeyTestDevice(t)
	w := passkeyCall(t, h, "POST", "/me/passkeys/begin", Object{"name": "测试设备", "password": testPassword}, auth)
	body := d.registration(t, passkeyOptions(t, w))
	challenge := passkeyResponseCookie(t, w, "moment_passkey")
	if !challenge.HttpOnly || challenge.SameSite != http.SameSiteStrictMode || challenge.Path != "/api/admin" {
		t.Fatal("unsafe challenge cookie")
	}
	status(t, passkeyCall(t, h, "POST", "/me/passkeys/finish", body, auth, challenge), 200)
	status(t, passkeyCall(t, h, "POST", "/me/passkeys/finish", body, auth, challenge), 400)
	return d
}

func TestPasskeyOriginValidation(t *testing.T) {
	for _, value := range []string{"http://example.com", "https://127.0.0.1", "https://example.com/path", "https://a:secret@example.com", "https://example.com?x=1", "https://example.com#x", "https://com", "https://example.com."} {
		if _, err := passkeyOrigin(value); err == nil {
			t.Errorf("accepted %q", value)
		}
	}
	for value, want := range map[string]string{" HTTPS://Photos.Example.com:443/ ": "https://photos.example.com", "http://localhost:9989/": passkeyTestOrigin} {
		got, err := passkeyOrigin(value)
		if err != nil || got != want {
			t.Errorf("origin %q: %q, %v", value, got, err)
		}
	}
}

func TestPasskeyConfigurationAndDefaultOff(t *testing.T) {
	a, h, auth := testApp(t)
	status(t, passkeyCall(t, h, "POST", "/passkeys/login/begin", Object{}), 409)
	status(t, passkeyCall(t, h, "GET", "/me/passkeys", nil), 401)
	body := Object{"enabled": true, "origin": passkeyTestOrigin, "revision": 0, "password": "wrong"}
	status(t, passkeyCall(t, h, "PUT", "/passkeys/config", body, auth), 400)
	body["password"] = testPassword
	body["origin"] = "https://other.example.com"
	status(t, passkeyCall(t, h, "PUT", "/passkeys/config", body, auth), 400)
	enableTestPasskeys(t, h, auth)
	status(t, passkeyCall(t, h, "PUT", "/passkeys/config", Object{"enabled": false, "revision": 0, "password": testPassword}, auth), 409)
	status(t, passkeyCall(t, h, "POST", "/passkeys/login/begin", Object{}), 200)
	status(t, passkeyCall(t, h, "PUT", "/passkeys/config", Object{"enabled": false, "revision": 1, "password": testPassword}, auth), 200)
	var count int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM moment_passkey_challenges").Scan(&count); err != nil || count != 0 {
		t.Fatalf("challenges survived disable: %d, %v", count, err)
	}
	status(t, passkeyCall(t, h, "POST", "/passkeys/login/begin", Object{}), 409)
	status(t, passkeyCall(t, h, "POST", "/login", Object{"username": "tester", "password": testPassword}), 200)
}

func TestPasskeySignedLoginAndRemoval(t *testing.T) {
	a, h, auth := testApp(t)
	enableTestPasskeys(t, h, auth)
	d := addTestPasskey(t, h, auth)
	w := passkeyCall(t, h, "POST", "/passkeys/login/begin", Object{})
	options := passkeyOptions(t, w)
	if allowed, exists := options["allowCredentials"]; exists && len(allowed.([]any)) != 0 {
		t.Fatal("discoverable login enumerates credentials")
	}
	body := d.assertion(t, options, 0x05, 1, passkeyTestOrigin, "localhost")
	challenge := passkeyResponseCookie(t, w, "moment_passkey")
	login := passkeyCall(t, h, "POST", "/passkeys/login/finish", body, challenge)
	status(t, login, 200)
	session := passkeyResponseCookie(t, login, "moment_session")
	status(t, passkeyCall(t, h, "GET", "/me", nil, session), 200)
	status(t, passkeyCall(t, h, "POST", "/passkeys/login/finish", body, challenge), 400)
	var id, revision int64
	if err := a.db.QueryRow("SELECT id,revision FROM moment_passkeys").Scan(&id, &revision); err != nil {
		t.Fatal(err)
	}
	path := fmt.Sprintf("/me/passkeys/%d", id)
	status(t, passkeyCall(t, h, "PATCH", path, Object{"name": "备用设备", "revision": revision}, auth), 200)
	status(t, passkeyCall(t, h, "PATCH", path, Object{"name": "旧窗口", "revision": revision}, auth), 409)
	status(t, passkeyCall(t, h, "DELETE", path, Object{"password": "wrong", "revision": revision + 1}, auth), 400)
	status(t, passkeyCall(t, h, "DELETE", path, Object{"password": testPassword, "revision": revision + 1}, auth), 200)
	status(t, passkeyCall(t, h, "GET", "/me", nil, auth), 401)
	status(t, passkeyCall(t, h, "GET", "/me", nil, session), 401)
	status(t, passkeyCall(t, h, "POST", "/login", Object{"username": "tester", "password": testPassword}), 200)
}

func TestPasskeyRejectsInvalidAssertions(t *testing.T) {
	a, h, auth := testApp(t)
	enableTestPasskeys(t, h, auth)
	d := addTestPasskey(t, h, auth)
	for _, name := range []string{"missing user verification", "wrong origin", "wrong rp", "wrong signature", "wrong handle", "expired"} {
		t.Run(name, func(t *testing.T) {
			w := passkeyCall(t, h, "POST", "/passkeys/login/begin", Object{})
			options := passkeyOptions(t, w)
			flags, origin, rp := byte(0x05), passkeyTestOrigin, "localhost"
			if name == "missing user verification" {
				flags = 0x01
			}
			if name == "wrong origin" {
				origin = "https://evil.example"
			}
			if name == "wrong rp" {
				rp = "other.example"
			}
			body := d.assertion(t, options, flags, 1, origin, rp)
			if name == "wrong signature" {
				body["response"].(Object)["signature"] = base64.RawURLEncoding.EncodeToString([]byte("not a signature"))
			}
			if name == "wrong handle" {
				body["response"].(Object)["userHandle"] = base64.RawURLEncoding.EncodeToString([]byte("other account"))
			}
			want := 401
			if name == "expired" {
				if _, err := a.db.Exec("UPDATE moment_passkey_challenges SET expires_at=0"); err != nil {
					t.Fatal(err)
				}
				want = 400
			}
			challenge := passkeyResponseCookie(t, w, "moment_passkey")
			status(t, passkeyCall(t, h, "POST", "/passkeys/login/finish", body, challenge), want)
			status(t, passkeyCall(t, h, "POST", "/passkeys/login/finish", body, challenge), 400)
		})
	}
	var count int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM moment_sessions").Scan(&count); err != nil || count != 1 {
		t.Fatalf("rejected logins created sessions: %d, %v", count, err)
	}
}

func TestPasskeyRegistrationBoundToSession(t *testing.T) {
	a, h, auth := testApp(t)
	enableTestPasskeys(t, h, auth)
	w := passkeyCall(t, h, "POST", "/me/passkeys/begin", Object{"name": "设备", "password": testPassword}, auth)
	d := newPasskeyTestDevice(t)
	body := d.registration(t, passkeyOptions(t, w))
	other := &http.Cookie{Name: "moment_session", Value: strings.Repeat("b", 64)}
	if _, err := a.db.Exec("INSERT INTO moment_sessions SELECT ?,user_id,expires_at FROM moment_sessions LIMIT 1", tokenDigest(other.Value)); err != nil {
		t.Fatal(err)
	}
	status(t, passkeyCall(t, h, "POST", "/me/passkeys/finish", body, other, passkeyResponseCookie(t, w, "moment_passkey")), 400)
	var count int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM moment_passkeys").Scan(&count); err != nil || count != 0 {
		t.Fatalf("bound key across sessions: %d, %v", count, err)
	}
}
