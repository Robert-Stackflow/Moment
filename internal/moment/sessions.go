package moment

import (
	"database/sql"
	"strings"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"
)

// Display IDs are unrelated to the bearer token or its hash. Legacy sessions
// retain their original expiry and show unknown login details until active.
func sessionAgent(c *gin.Context) string {
	value := []rune(strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, c.Request.UserAgent()))
	if len(value) > 512 {
		value = value[:512]
	}
	return string(value)
}

func addSessionDetails(tx *sql.Tx, token string, c *gin.Context, method string) error {
	stamp := time.Now().Unix()
	_, err := tx.Exec(`INSERT INTO moment_session_details(token_hash,id,created_at,last_seen_at,ip,user_agent,method) VALUES (?,lower(hex(randomblob(16))),?,?,?,?,?)`, tokenDigest(token), stamp, stamp, c.ClientIP(), sessionAgent(c), method)
	return err
}

func (a *App) touchSession(c *gin.Context, hash string, stamp int64) error {
	// SELECT prevents resurrecting a session revoked between authentication and
	// activity tracking. Concurrent touches cannot move the timestamp backwards.
	_, err := a.db.Exec(`INSERT INTO moment_session_details(token_hash,id,last_seen_at,ip,user_agent)
 SELECT token_hash,lower(hex(randomblob(16))),?,?,? FROM moment_sessions WHERE token_hash=? AND expires_at>?
 ON CONFLICT(token_hash) DO UPDATE SET last_seen_at=excluded.last_seen_at,ip=excluded.ip,user_agent=excluded.user_agent
 WHERE moment_session_details.last_seen_at < excluded.last_seen_at-59`, stamp, c.ClientIP(), sessionAgent(c), hash, stamp)
	return err
}

func sessionDevice(agent string) (string, string) {
	if agent == "" {
		return "未记录设备", "unknown"
	}
	os, kind := "未知系统", "desktop"
	switch {
	case strings.Contains(agent, "iPad") || strings.Contains(agent, "Macintosh") && strings.Contains(agent, "Mobile/"):
		os, kind = "iPadOS", "tablet"
	case strings.Contains(agent, "iPhone"):
		os, kind = "iOS", "mobile"
	case strings.Contains(agent, "Android"):
		os = "Android"
		if strings.Contains(agent, "Mobile") {
			kind = "mobile"
		} else {
			kind = "tablet"
		}
	case strings.Contains(agent, "Windows"):
		os = "Windows"
	case strings.Contains(agent, "Macintosh") || strings.Contains(agent, "Mac OS"):
		os = "macOS"
	case strings.Contains(agent, "Linux"):
		os = "Linux"
	}
	browser := "其他浏览器"
	switch {
	case strings.Contains(agent, "Edg/") || strings.Contains(agent, "EdgiOS/") || strings.Contains(agent, "EdgA/"):
		browser = "Edge"
	case strings.Contains(agent, "OPR/") || strings.Contains(agent, "Opera/"):
		browser = "Opera"
	case strings.Contains(agent, "Firefox/") || strings.Contains(agent, "FxiOS/"):
		browser = "Firefox"
	case strings.Contains(agent, "Chrome/") || strings.Contains(agent, "CriOS/"):
		browser = "Chrome"
	case strings.Contains(agent, "Safari/"):
		browser = "Safari"
	}
	return browser + " · " + os, kind
}

func (a *App) listSessions(c *gin.Context) {
	stamp := time.Now().Unix()
	user := draftUser(c)
	if _, err := a.db.Exec(`INSERT OR IGNORE INTO moment_session_details(token_hash,id)
 SELECT token_hash,lower(hex(randomblob(16))) FROM moment_sessions WHERE user_id=? AND expires_at>?`, user, stamp); err != nil {
		databaseError(c, err)
		return
	}
	token, _ := c.Cookie("moment_session")
	rows, err := query(a.db, `SELECT d.id,d.created_at,d.last_seen_at,d.ip,d.user_agent,d.method,s.expires_at,s.token_hash=? AS current
 FROM moment_sessions s JOIN moment_session_details d ON d.token_hash=s.token_hash
 WHERE s.user_id=? AND s.expires_at>? ORDER BY current DESC,d.last_seen_at DESC,d.created_at DESC,d.id`, tokenDigest(token), user, stamp)
	if err != nil {
		databaseError(c, err)
		return
	}
	for _, row := range rows {
		row["device"], row["device_type"] = sessionDevice(text(row["user_agent"]))
		delete(row, "user_agent")
		row["current"] = integer(row["current"]) == 1
	}
	ok(c, rows)
}

func (a *App) revokeSession(c *gin.Context) {
	token, _ := c.Cookie("moment_session")
	tx, err := a.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	// Obtain the write lock before rechecking the acting session.
	if _, err = tx.Exec("UPDATE moment_sessions SET expires_at=expires_at WHERE token_hash=?", tokenDigest(token)); err != nil {
		databaseError(c, err)
		return
	}
	if !currentPasskeyAccountSession(c, tx) {
		return
	}
	var hash string
	if err = tx.QueryRow(`SELECT s.token_hash FROM moment_sessions s JOIN moment_session_details d ON d.token_hash=s.token_hash WHERE d.id=? AND s.user_id=?`, c.Param("id"), draftUser(c)).Scan(&hash); err == sql.ErrNoRows {
		fail(c, 404, "此会话已退出或不存在")
		return
	} else if err != nil {
		databaseError(c, err)
		return
	}
	if _, err = tx.Exec("DELETE FROM moment_sessions WHERE token_hash=? AND user_id=?", hash, draftUser(c)); err == nil {
		err = tx.Commit()
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	current := hash == tokenDigest(token)
	if current {
		a.cookie(c, "", -1)
	}
	ok(c, Object{"current": current})
}

func (a *App) revokeOtherSessions(c *gin.Context) {
	token, _ := c.Cookie("moment_session")
	tx, err := a.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	if _, err = tx.Exec("UPDATE moment_sessions SET expires_at=expires_at WHERE token_hash=?", tokenDigest(token)); err != nil {
		databaseError(c, err)
		return
	}
	if !currentPasskeyAccountSession(c, tx) {
		return
	}
	result, err := tx.Exec("DELETE FROM moment_sessions WHERE user_id=? AND token_hash!=?", draftUser(c), tokenDigest(token))
	if err == nil {
		err = tx.Commit()
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	count, _ := result.RowsAffected()
	ok(c, Object{"revoked": count})
}
