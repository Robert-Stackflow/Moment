package moment

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"golang.org/x/net/idna"
	"golang.org/x/net/publicsuffix"
)

type passkeyConfig struct {
	Enabled  bool   `json:"enabled"`
	Origin   string `json:"origin"`
	RPID     string `json:"rp_id"`
	Revision int64  `json:"revision"`
}

func readPasskeyConfig(q querier) (passkeyConfig, error) {
	rows, err := query(q, "SELECT enabled,origin,revision FROM moment_passkey_config WHERE id=1")
	if err != nil {
		return passkeyConfig{}, err
	}
	if len(rows) != 1 {
		return passkeyConfig{}, errors.New("missing passkey configuration")
	}
	r := rows[0]
	config := passkeyConfig{Enabled: integer(r["enabled"]) != 0, Origin: text(r["origin"]), Revision: integer(r["revision"])}
	if u, err := url.Parse(config.Origin); err == nil {
		config.RPID = u.Hostname()
	}
	return config, nil
}

func passkeyOrigin(value string) (string, error) {
	u, err := url.Parse(strings.TrimSpace(value))
	if err != nil || u.User != nil || u.Host == "" || (u.Path != "" && u.Path != "/") || u.RawQuery != "" || u.ForceQuery || u.Fragment != "" || u.Opaque != "" {
		return "", errors.New("请填写完整登录网址，不包含路径、参数或账户信息")
	}
	u.Scheme = strings.ToLower(u.Scheme)
	u.Host = strings.ToLower(u.Host)
	host := u.Hostname()
	if net.ParseIP(host) != nil || strings.HasSuffix(host, ".") {
		return "", errors.New("通行密钥需要固定域名；本地调试请使用 localhost")
	}
	if host != "localhost" {
		host, err = idna.Lookup.ToASCII(host)
		if err != nil || len(host) > 253 {
			return "", errors.New("请填写有效的网站域名")
		}
		if _, err = publicsuffix.EffectiveTLDPlusOne(host); err != nil {
			return "", errors.New("请填写有效的网站域名")
		}
	}
	port := u.Port()
	if port != "" {
		number, err := strconv.Atoi(port)
		if err != nil || number < 1 || number > 65535 {
			return "", errors.New("登录网址的端口无效")
		}
		port = strconv.Itoa(number)
	}
	if u.Scheme != "https" && !(u.Scheme == "http" && host == "localhost") {
		return "", errors.New("通行密钥需要 HTTPS；仅 localhost 可使用 HTTP")
	}
	if (u.Scheme == "https" && port == "443") || (u.Scheme == "http" && port == "80") {
		port = ""
	}
	if port != "" {
		host = net.JoinHostPort(host, port)
	}
	return u.Scheme + "://" + host, nil
}

// Run inside the write transaction: a password change or key removal may have
// revoked this session while the password was being verified outside it.
func currentPasskeyAccountSession(c *gin.Context, q querier) bool {
	token, _ := c.Cookie("moment_session")
	rows, err := query(q, "SELECT user_id FROM moment_sessions WHERE token_hash=? AND user_id=? AND expires_at>?", tokenDigest(token), draftUser(c), time.Now().Unix())
	if err != nil {
		databaseError(c, err)
		return false
	}
	if len(rows) != 1 {
		fail(c, 401, "登录已失效，请重新登录后再操作")
		return false
	}
	return true
}

func passkeyRP(config passkeyConfig) (*webauthn.WebAuthn, error) {
	return webauthn.New(&webauthn.Config{RPID: config.RPID, RPDisplayName: "Moment", RPOrigins: []string{config.Origin}, AttestationPreference: protocol.PreferNoAttestation, AuthenticatorSelection: protocol.AuthenticatorSelection{ResidentKey: protocol.ResidentKeyRequirementRequired, UserVerification: protocol.VerificationRequired}, Timeouts: webauthn.TimeoutsConfig{Login: webauthn.TimeoutConfig{Enforce: true, Timeout: 5 * time.Minute}, Registration: webauthn.TimeoutConfig{Enforce: true, Timeout: 5 * time.Minute}}})
}

func (a *App) passkeyStatus(c *gin.Context) {
	config, err := readPasskeyConfig(a.db)
	if err != nil {
		databaseError(c, err)
		return
	}
	ok(c, config)
}

func (a *App) confirmAccountPassword(c *gin.Context, password string) bool {
	if !a.limiter.allow(c.ClientIP()) {
		fail(c, 429, "验证尝试过多，请稍后重试")
		return false
	}
	var hash string
	if err := a.db.QueryRow("SELECT password FROM user WHERE id=?", draftUser(c)).Scan(&hash); err != nil {
		databaseError(c, err)
		return false
	}
	if len(password) > 1024 || !verifyPassword(password, hash) {
		fail(c, 400, "当前密码不正确")
		return false
	}
	return true
}

func (a *App) configurePasskeys(c *gin.Context) {
	var in struct {
		Enabled  bool   `json:"enabled"`
		Origin   string `json:"origin"`
		Revision int64  `json:"revision"`
		Password string `json:"password"`
	}
	if !bind(c, &in) || !a.confirmAccountPassword(c, in.Password) {
		return
	}
	origin := ""
	if in.Enabled || strings.TrimSpace(in.Origin) != "" {
		var err error
		origin, err = passkeyOrigin(in.Origin)
		if err != nil {
			fail(c, 400, err.Error())
			return
		}
		u, _ := url.Parse(origin)
		if in.Enabled && (c.GetHeader("Origin") != origin || c.Request.Host != u.Host) {
			fail(c, 400, "请在要启用通行密钥的网站地址下打开后台，再保存配置")
			return
		}
		if in.Enabled && u.Scheme == "https" && !a.secure {
			fail(c, 400, "请先在服务器开启 MOMENT_COOKIE_SECURE，再启用 HTTPS 通行密钥登录")
			return
		}
	}
	tx, err := a.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	result, err := tx.Exec("UPDATE moment_passkey_config SET enabled=?,origin=?,revision=revision+1 WHERE id=1 AND revision=?", in.Enabled, origin, in.Revision)
	if err != nil {
		databaseError(c, err)
		return
	}
	count, _ := result.RowsAffected()
	if count != 1 {
		fail(c, 409, "登录配置已在其他窗口改变，请刷新后重试")
		return
	}
	if !currentPasskeyAccountSession(c, tx) {
		return
	}
	if _, err = tx.Exec("DELETE FROM moment_passkey_challenges"); err == nil {
		err = tx.Commit()
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	a.limiter.reset(c.ClientIP())
	a.passkeyStatus(c)
}

func activePasskeyRP(c *gin.Context, q querier) (passkeyConfig, *webauthn.WebAuthn, bool) {
	config, err := readPasskeyConfig(q)
	if err != nil {
		databaseError(c, err)
		return config, nil, false
	}
	if !config.Enabled {
		fail(c, 409, "通行密钥登录尚未启用，请使用密码登录")
		return config, nil, false
	}
	if c.GetHeader("Origin") != config.Origin {
		fail(c, 403, "请从配置的登录网址使用通行密钥")
		return config, nil, false
	}
	rp, err := passkeyRP(config)
	if err != nil {
		fail(c, 500, "通行密钥配置无效，请使用密码登录并检查设置")
		return config, nil, false
	}
	return config, rp, true
}

type passkeyUser struct {
	id          int64
	handle      []byte
	name        string
	credentials []webauthn.Credential
}

func (u *passkeyUser) WebAuthnID() []byte                         { return u.handle }
func (u *passkeyUser) WebAuthnName() string                       { return u.name }
func (u *passkeyUser) WebAuthnDisplayName() string                { return u.name }
func (u *passkeyUser) WebAuthnCredentials() []webauthn.Credential { return u.credentials }
func loadPasskeyUser(q querier, id int64, rpID string) (*passkeyUser, error) {
	rows, err := query(q, "SELECT u.username,p.handle FROM user u JOIN moment_passkey_users p ON p.user_id=u.id WHERE u.id=?", id)
	if err != nil {
		return nil, err
	}
	if len(rows) != 1 {
		return nil, sql.ErrNoRows
	}
	handle, err := base64.RawURLEncoding.DecodeString(text(rows[0]["handle"]))
	if err != nil {
		return nil, err
	}
	u := &passkeyUser{id: id, handle: handle, name: text(rows[0]["username"])}
	rows, err = query(q, "SELECT credential FROM moment_passkeys WHERE user_id=? AND rp_id=?", id, rpID)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		var cred webauthn.Credential
		if err = json.Unmarshal([]byte(text(row["credential"])), &cred); err != nil {
			return nil, err
		}
		u.credentials = append(u.credentials, cred)
	}
	return u, nil
}

func (a *App) passkeyChallengeCookie(c *gin.Context, token string, age int) {
	http.SetCookie(c.Writer, &http.Cookie{Name: "moment_passkey", Value: token, Path: "/api/admin", HttpOnly: true, Secure: a.secure, SameSite: http.SameSiteStrictMode, MaxAge: age})
}

func (a *App) savePasskeyChallenge(c *gin.Context, config passkeyConfig, kind, name string, user *int64, session *webauthn.SessionData) bool {
	token := make([]byte, 32)
	if _, err := rand.Read(token); err != nil {
		databaseError(c, err)
		return false
	}
	value := hex.EncodeToString(token)
	payload, err := json.Marshal(session)
	if err != nil {
		databaseError(c, err)
		return false
	}
	previous, _ := c.Cookie("moment_passkey")
	authToken, _ := c.Cookie("moment_session")
	tx, err := a.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		databaseError(c, err)
		return false
	}
	defer tx.Rollback()
	if _, err = tx.Exec("DELETE FROM moment_passkey_challenges WHERE expires_at<=? OR token_hash=?", time.Now().Unix(), tokenDigest(previous)); err != nil {
		databaseError(c, err)
		return false
	}
	latest, err := readPasskeyConfig(tx)
	if err != nil {
		databaseError(c, err)
		return false
	}
	if !latest.Enabled || latest.Revision != config.Revision {
		fail(c, 409, "登录设置已变化，请重新开始")
		return false
	}
	if user != nil && !currentPasskeyAccountSession(c, tx) {
		return false
	}
	var count int
	if err = tx.QueryRow("SELECT COUNT(*) FROM moment_passkey_challenges").Scan(&count); err != nil {
		databaseError(c, err)
		return false
	}
	if count >= 1024 {
		fail(c, 429, "验证请求较多，请稍后重试")
		return false
	}
	_, err = tx.Exec("INSERT INTO moment_passkey_challenges(token_hash,kind,user_id,auth_session,name,config_revision,session,expires_at) VALUES(?,?,?,?,?,?,?,?)", tokenDigest(value), kind, user, tokenDigest(authToken), name, config.Revision, string(payload), time.Now().Add(5*time.Minute).Unix())
	if err == nil {
		err = tx.Commit()
	}
	if err != nil {
		databaseError(c, err)
		return false
	}
	a.passkeyChallengeCookie(c, value, 300)
	return true
}

type passkeyChallenge struct {
	session           webauthn.SessionData
	user              int64
	authSession, name string
	revision          int64
}

func (a *App) consumePasskeyChallenge(c *gin.Context, kind string) (*passkeyChallenge, bool) {
	token, _ := c.Cookie("moment_passkey")
	a.passkeyChallengeCookie(c, "", -1)
	if len(token) != 64 {
		fail(c, 400, "验证已过期或未开始，请重新尝试")
		return nil, false
	}
	// DELETE RETURNING consumes even a failed response, and only one worker can claim it.
	rows, err := query(a.db, "DELETE FROM moment_passkey_challenges WHERE token_hash=? RETURNING *", tokenDigest(token))
	if err != nil {
		databaseError(c, err)
		return nil, false
	}
	if len(rows) != 1 || text(rows[0]["kind"]) != kind || integer(rows[0]["expires_at"]) <= time.Now().Unix() {
		fail(c, 400, "验证已过期或已使用，请重新尝试")
		return nil, false
	}
	row := rows[0]
	challenge := &passkeyChallenge{user: integer(row["user_id"]), authSession: text(row["auth_session"]), name: text(row["name"]), revision: integer(row["config_revision"])}
	if err = json.Unmarshal([]byte(text(row["session"])), &challenge.session); err != nil {
		databaseError(c, err)
		return nil, false
	}
	return challenge, true
}

func (a *App) beginPasskeyRegistration(c *gin.Context) {
	var in struct {
		Name     string `json:"name"`
		Password string `json:"password"`
	}
	if !bind(c, &in) {
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" || utf8.RuneCountInString(in.Name) > 60 {
		fail(c, 400, "请为通行密钥填写不超过 60 字的名称")
		return
	}
	if !a.confirmAccountPassword(c, in.Password) {
		return
	}
	config, rp, valid := activePasskeyRP(c, a.db)
	if !valid {
		return
	}
	id := draftUser(c)
	var count int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM moment_passkeys WHERE user_id=?", id).Scan(&count); err != nil {
		databaseError(c, err)
		return
	}
	if count >= 20 {
		fail(c, 400, "每个账户最多保存 20 个通行密钥")
		return
	}
	handle := make([]byte, 32)
	if _, err := rand.Read(handle); err != nil {
		databaseError(c, err)
		return
	}
	if _, err := a.db.Exec("INSERT INTO moment_passkey_users(user_id,handle) VALUES(?,?) ON CONFLICT(user_id) DO NOTHING", id, base64.RawURLEncoding.EncodeToString(handle)); err != nil {
		databaseError(c, err)
		return
	}
	user, err := loadPasskeyUser(a.db, id, config.RPID)
	if err != nil {
		databaseError(c, err)
		return
	}
	options, session, err := rp.BeginRegistration(user, webauthn.WithResidentKeyRequirement(protocol.ResidentKeyRequirementRequired), webauthn.WithExclusions(webauthn.Credentials(user.credentials).CredentialDescriptors()), webauthn.WithRegistrationOrigin(config.Origin), webauthn.WithExtensions(webauthn.WithExtensionCredProps()))
	if err != nil {
		databaseError(c, err)
		return
	}
	if a.savePasskeyChallenge(c, config, "register", in.Name, &id, session) {
		ok(c, options)
	}
}

func (a *App) finishPasskeyRegistration(c *gin.Context) {
	config, rp, valid := activePasskeyRP(c, a.db)
	if !valid {
		return
	}
	challenge, valid := a.consumePasskeyChallenge(c, "register")
	if !valid {
		return
	}
	authToken, _ := c.Cookie("moment_session")
	if challenge.revision != config.Revision || challenge.user != draftUser(c) || challenge.authSession != tokenDigest(authToken) {
		fail(c, 400, "账户或登录设置已变化，请重新添加")
		return
	}
	parsed, err := protocol.ParseCredentialCreationResponseBody(http.MaxBytesReader(c.Writer, c.Request.Body, 1<<20))
	if err != nil {
		fail(c, 400, "设备响应无效，请重新添加通行密钥")
		return
	}
	tx, err := a.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	// Serialize verification with removal, password changes and configuration changes.
	if _, err = tx.Exec("UPDATE moment_passkey_config SET revision=revision WHERE id=1"); err != nil {
		databaseError(c, err)
		return
	}
	latest, err := readPasskeyConfig(tx)
	if err != nil {
		databaseError(c, err)
		return
	}
	var sessions, count int
	if err = tx.QueryRow("SELECT COUNT(*) FROM moment_sessions WHERE token_hash=? AND user_id=? AND expires_at>?", challenge.authSession, challenge.user, time.Now().Unix()).Scan(&sessions); err != nil {
		databaseError(c, err)
		return
	}
	if latest.Revision != challenge.revision || !latest.Enabled || sessions != 1 {
		fail(c, 409, "账户或登录设置已变化，请重新添加")
		return
	}
	user, err := loadPasskeyUser(tx, challenge.user, config.RPID)
	if err != nil {
		databaseError(c, err)
		return
	}
	credential, err := rp.CreateCredential(user, challenge.session, parsed)
	if err != nil {
		fail(c, 400, "通行密钥验证失败，请确认设备已验证身份后重试")
		return
	}
	if credential.Extensions.RK != nil && !*credential.Extensions.RK {
		fail(c, 400, "此设备不支持保存可用于免用户名登录的通行密钥")
		return
	}
	if err = tx.QueryRow("SELECT COUNT(*) FROM moment_passkeys WHERE user_id=?", challenge.user).Scan(&count); err != nil {
		databaseError(c, err)
		return
	}
	if count >= 20 {
		fail(c, 400, "通行密钥数量已达上限")
		return
	}
	key := base64.RawURLEncoding.EncodeToString(credential.ID)
	if err = tx.QueryRow("SELECT COUNT(*) FROM moment_passkeys WHERE credential_id=?", key).Scan(&count); err != nil {
		databaseError(c, err)
		return
	}
	if count > 0 {
		fail(c, 409, "这个通行密钥已经添加")
		return
	}
	encoded, err := json.Marshal(credential)
	if err != nil {
		databaseError(c, err)
		return
	}
	_, err = tx.Exec("INSERT INTO moment_passkeys(user_id,credential_id,rp_id,name,credential,created_at) VALUES(?,?,?,?,?,?)", challenge.user, key, config.RPID, challenge.name, string(encoded), now())
	if err == nil {
		err = tx.Commit()
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	a.limiter.reset(c.ClientIP())
	ok(c, nil)
}

func (a *App) beginPasskeyLogin(c *gin.Context) {
	if !a.passkeyLimiter.allow(c.ClientIP()) {
		fail(c, 429, "登录尝试过多，请稍后重试或使用密码登录")
		return
	}
	config, rp, valid := activePasskeyRP(c, a.db)
	if !valid {
		return
	}
	options, session, err := rp.BeginDiscoverableLogin(webauthn.WithUserVerification(protocol.VerificationRequired), webauthn.WithLoginOrigin(config.Origin))
	if err != nil {
		databaseError(c, err)
		return
	}
	if a.savePasskeyChallenge(c, config, "login", "", nil, session) {
		ok(c, options)
	}
}

func (a *App) finishPasskeyLogin(c *gin.Context) {
	if !a.passkeyLimiter.allow(c.ClientIP()) {
		fail(c, 429, "登录尝试过多，请稍后重试或使用密码登录")
		return
	}
	config, rp, valid := activePasskeyRP(c, a.db)
	if !valid {
		return
	}
	challenge, valid := a.consumePasskeyChallenge(c, "login")
	if !valid {
		return
	}
	if challenge.revision != config.Revision {
		fail(c, 400, "登录设置已变化，请重新登录")
		return
	}
	parsed, err := protocol.ParseCredentialRequestResponseBody(http.MaxBytesReader(c.Writer, c.Request.Body, 1<<20))
	if err != nil {
		fail(c, 400, "设备响应无效，请重新尝试")
		return
	}
	tx, err := a.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	if _, err = tx.Exec("UPDATE moment_passkey_config SET revision=revision WHERE id=1"); err != nil {
		databaseError(c, err)
		return
	}
	latest, err := readPasskeyConfig(tx)
	if err != nil {
		databaseError(c, err)
		return
	}
	if latest.Revision != challenge.revision || !latest.Enabled {
		fail(c, 409, "登录设置已变化，请使用密码登录")
		return
	}
	handler := func(rawID, userHandle []byte) (webauthn.User, error) {
		var id int64
		err := tx.QueryRow("SELECT p.user_id FROM moment_passkeys p JOIN moment_passkey_users u ON u.user_id=p.user_id WHERE p.credential_id=? AND p.rp_id=? AND u.handle=?", base64.RawURLEncoding.EncodeToString(rawID), config.RPID, base64.RawURLEncoding.EncodeToString(userHandle)).Scan(&id)
		if err != nil {
			return nil, err
		}
		return loadPasskeyUser(tx, id, config.RPID)
	}
	user, credential, err := rp.ValidatePasskeyLogin(handler, challenge.session, parsed)
	if err != nil || credential == nil || credential.Authenticator.CloneWarning {
		fail(c, 401, "通行密钥验证失败，请重试或使用密码登录")
		return
	}
	id := user.(*passkeyUser).id
	encoded, err := json.Marshal(credential)
	if err != nil {
		databaseError(c, err)
		return
	}
	_, err = tx.Exec("UPDATE moment_passkeys SET credential=?,last_used_at=?,revision=revision+1 WHERE user_id=? AND credential_id=?", string(encoded), now(), id, base64.RawURLEncoding.EncodeToString(credential.ID))
	var token string
	if err == nil {
		token, err = createLoginSession(tx, id)
	}
	if err == nil {
		err = tx.Commit()
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	a.passkeyLimiter.reset(c.ClientIP())
	a.cookie(c, token, 7*24*3600)
	ok(c, nil)
}

func (a *App) listPasskeys(c *gin.Context) {
	rows, err := query(a.db, "SELECT id,name,rp_id,revision,created_at,last_used_at FROM moment_passkeys WHERE user_id=? ORDER BY id DESC", draftUser(c))
	if err != nil {
		databaseError(c, err)
		return
	}
	ok(c, rows)
}
func (a *App) renamePasskey(c *gin.Context) {
	id, valid := routeID(c)
	if !valid {
		return
	}
	var in struct {
		Name     string `json:"name"`
		Revision int64  `json:"revision"`
	}
	if !bind(c, &in) {
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" || utf8.RuneCountInString(in.Name) > 60 {
		fail(c, 400, "名称需为 1 到 60 字")
		return
	}
	result, err := a.db.Exec("UPDATE moment_passkeys SET name=?,revision=revision+1 WHERE id=? AND user_id=? AND revision=?", in.Name, id, draftUser(c), in.Revision)
	if err != nil {
		databaseError(c, err)
		return
	}
	count, _ := result.RowsAffected()
	if count != 1 {
		fail(c, 409, "通行密钥已改变，请刷新后重试")
		return
	}
	ok(c, nil)
}
func (a *App) deletePasskey(c *gin.Context) {
	id, valid := routeID(c)
	if !valid {
		return
	}
	var in struct {
		Password string `json:"password"`
		Revision int64  `json:"revision"`
	}
	if !bind(c, &in) || !a.confirmAccountPassword(c, in.Password) {
		return
	}
	tx, err := a.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	result, err := tx.Exec("DELETE FROM moment_passkeys WHERE id=? AND user_id=? AND revision=?", id, draftUser(c), in.Revision)
	if err != nil {
		databaseError(c, err)
		return
	}
	count, _ := result.RowsAffected()
	if count != 1 {
		fail(c, 409, "通行密钥已改变，请刷新后重试")
		return
	}
	if !currentPasskeyAccountSession(c, tx) {
		return
	}
	if _, err = tx.Exec("DELETE FROM moment_sessions WHERE user_id=?", draftUser(c)); err == nil {
		_, err = tx.Exec("DELETE FROM moment_passkey_challenges WHERE user_id=? OR kind='login'", draftUser(c))
	}
	if err == nil {
		err = tx.Commit()
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	a.limiter.reset(c.ClientIP())
	a.cookie(c, "", -1)
	ok(c, nil)
}
