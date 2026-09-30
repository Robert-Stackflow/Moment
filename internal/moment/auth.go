package moment

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/argon2"
)

func hashPassword(password string) string {
	salt := make([]byte, 16)
	_, _ = rand.Read(salt)
	hash := argon2.IDKey([]byte(password), salt, 3, 65536, 2, 32)
	return fmt.Sprintf("$argon2id$v=19$m=65536,t=3,p=2$%s$%s", base64.RawStdEncoding.EncodeToString(salt), base64.RawStdEncoding.EncodeToString(hash))
}
func verifyPassword(password, encoded string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" || parts[2] != "v=19" {
		return false
	}
	var memory, rounds uint32
	var parallel uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &rounds, &parallel); err != nil || memory < 8 || memory > 262144 || rounds == 0 || rounds > 10 || parallel == 0 || parallel > 16 {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil || len(salt) < 8 || len(salt) > 64 {
		return false
	}
	expected, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil || len(expected) < 16 || len(expected) > 64 {
		return false
	}
	actual := argon2.IDKey([]byte(password), salt, rounds, memory, parallel, uint32(len(expected)))
	return subtle.ConstantTimeCompare(expected, actual) == 1
}
func tokenDigest(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
func createLoginSession(tx *sql.Tx, id int64) (string, error) {
	token := make([]byte, 32)
	if _, err := rand.Read(token); err != nil {
		return "", err
	}
	value := hex.EncodeToString(token)
	if _, err := tx.Exec("DELETE FROM moment_sessions WHERE expires_at<=?", time.Now().Unix()); err != nil {
		return "", err
	}
	if _, err := tx.Exec("INSERT INTO moment_sessions VALUES (?,?,?)", tokenDigest(value), id, time.Now().Add(7*24*time.Hour).Unix()); err != nil {
		return "", err
	}
	_, err := tx.Exec("UPDATE user SET last_login=? WHERE id=?", now(), id)
	return value, err
}
func (a *App) cookie(c *gin.Context, value string, age int) {
	http.SetCookie(c.Writer, &http.Cookie{Name: "moment_session", Value: value, Path: "/", HttpOnly: true, Secure: a.secure, SameSite: http.SameSiteStrictMode, MaxAge: age})
}
func (a *App) authenticate(c *gin.Context) {
	token, _ := c.Cookie("moment_session")
	if len(token) != 64 {
		fail(c, 401, "请先登录")
		c.Abort()
		return
	}
	users, err := query(a.db, `SELECT u.id,u.username,u.alias,u.email,u.avatar,u.created_at,u.updated_at,u.last_login FROM user u JOIN moment_sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?`, tokenDigest(token), time.Now().Unix())
	if err != nil {
		fail(c, 500, "无法验证会话")
		c.Abort()
		return
	}
	if len(users) != 1 {
		a.cookie(c, "", -1)
		fail(c, 401, "登录已过期，请重新登录")
		c.Abort()
		return
	}
	c.Set("user", users[0])
	c.Next()
}
func sameOrigin(c *gin.Context) {
	if c.Request.Method == "GET" || c.Request.Method == "HEAD" {
		c.Next()
		return
	}
	origin := c.GetHeader("Origin")
	if origin != "" {
		parsed, err := url.Parse(origin)
		if err != nil || parsed.Host != c.Request.Host || (parsed.Scheme != "http" && parsed.Scheme != "https") {
			fail(c, 403, "请求来源无效")
			c.Abort()
			return
		}
	}
	if c.GetHeader("Sec-Fetch-Site") == "cross-site" {
		fail(c, 403, "请求来源无效")
		c.Abort()
		return
	}
	c.Next()
}
func (a *App) login(c *gin.Context) {
	if !a.limiter.allow(c.ClientIP()) {
		fail(c, 429, "登录尝试过多，请稍后重试")
		return
	}
	var in struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if !bind(c, &in) {
		return
	}
	if len(in.Password) > 1024 {
		fail(c, 400, "账户或密码错误")
		return
	}
	users, err := query(a.db, "SELECT id,password FROM user WHERE username=?", in.Username)
	if err != nil {
		fail(c, 500, "登录暂时不可用")
		return
	}
	if len(users) != 1 || !verifyPassword(in.Password, text(users[0]["password"])) {
		fail(c, 401, "账户或密码错误")
		return
	}
	id := integer(users[0]["id"])
	tx, err := a.db.Begin()
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	value, err := createLoginSession(tx, id)
	if err == nil {
		err = tx.Commit()
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	a.limiter.reset(c.ClientIP())
	a.cookie(c, value, 7*24*3600)
	ok(c, Object{"username": in.Username})
}
func (a *App) logout(c *gin.Context) {
	token, _ := c.Cookie("moment_session")
	_, err := a.db.Exec("DELETE FROM moment_sessions WHERE token_hash=?", tokenDigest(token))
	if err != nil {
		databaseError(c, err)
		return
	}
	a.cookie(c, "", -1)
	ok(c, nil)
}
func (a *App) setupStatus(c *gin.Context) {
	var count int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM user").Scan(&count); err != nil {
		databaseError(c, err)
		return
	}
	ok(c, Object{"needs_setup": count == 0})
}
func (a *App) setup(c *gin.Context) {
	if !a.limiter.allow(c.ClientIP()) {
		fail(c, 429, "请稍后重试")
		return
	}
	var in struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Email    string `json:"email"`
	}
	if !bind(c, &in) {
		return
	}
	if len(in.Username) < 1 || len(in.Username) > 20 || len(in.Password) < 10 || len(in.Password) > 1024 || !validEmail(in.Email) {
		fail(c, 400, "请填写用户名、有效邮箱及至少 10 位密码")
		return
	}
	tx, err := a.db.Begin()
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	var count int
	if err = tx.QueryRow("SELECT COUNT(*) FROM user").Scan(&count); err != nil {
		databaseError(c, err)
		return
	}
	if count != 0 {
		fail(c, 409, "管理员已初始化")
		return
	}
	_, err = tx.Exec("INSERT INTO user(username,email,avatar,password,created_at,updated_at) VALUES (?,?, '',?,?,?)", in.Username, in.Email, hashPassword(in.Password), now(), now())
	if err == nil {
		err = tx.Commit()
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	ok(c, nil)
}

type loginAttempt struct {
	count int
	until time.Time
}
type loginLimiter struct {
	mu      sync.Mutex
	entries map[string]loginAttempt
}

func newLoginLimiter() *loginLimiter { return &loginLimiter{entries: map[string]loginAttempt{}} }
func (l *loginLimiter) allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	current := time.Now()
	for key, value := range l.entries {
		if current.After(value.until) {
			delete(l.entries, key)
		}
	}
	entry := l.entries[ip]
	if entry.until.IsZero() {
		entry.until = current.Add(15 * time.Minute)
	}
	if entry.count >= 20 {
		return false
	}
	entry.count++
	l.entries[ip] = entry
	return true
}
func (l *loginLimiter) reset(ip string) { l.mu.Lock(); defer l.mu.Unlock(); delete(l.entries, ip) }
