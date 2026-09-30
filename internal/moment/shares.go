package moment

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
)

var shareToken = regexp.MustCompile(`^[a-f0-9]{64}$`)
var sharePasswordWorkers = make(chan struct{}, 2)

type shareInput struct {
	Title       string  `json:"title"`
	Description string  `json:"description"`
	PostIDs     []int64 `json:"post_ids"`
	Password    *string `json:"password"` // omitted preserves it; empty removes it
	ExpiresAt   *int64  `json:"expires_at"`
	Revision    int64   `json:"revision"`
}

const shareColumns = `s.id,s.token,s.title,s.description,s.expires_at,s.revoked,s.revision,s.created_at,s.updated_at,(s.password_hash!='') AS password_required`

func randomShareToken() (string, error) {
	var data [32]byte
	if _, err := rand.Read(data[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(data[:]), nil
}

func (a *App) listShares(c *gin.Context) {
	page, size, valid := pageParams(c)
	if !valid {
		return
	}
	search := "%" + strings.TrimSpace(c.Query("q")) + "%"
	var total int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM moment_shares WHERE title LIKE ?", search).Scan(&total); err != nil {
		databaseError(c, err)
		return
	}
	rows, err := query(a.db, `SELECT `+shareColumns+`,(SELECT COUNT(*) FROM moment_share_posts sp JOIN blog b ON b.id=sp.post_id WHERE sp.share_id=s.id AND `+activePost("b")+`) AS post_count FROM moment_shares s WHERE s.title LIKE ? ORDER BY s.id DESC LIMIT ? OFFSET ?`, search, size, (page-1)*size)
	if err != nil {
		databaseError(c, err)
		return
	}
	c.JSON(200, Object{"code": 200, "msg": "OK", "data": rows, "total": total})
}

func (a *App) getShare(c *gin.Context) {
	id, valid := routeID(c)
	if !valid {
		return
	}
	rows, err := query(a.db, "SELECT "+shareColumns+" FROM moment_shares s WHERE s.id=?", id)
	if err != nil {
		databaseError(c, err)
		return
	}
	if len(rows) == 0 {
		fail(c, 404, "分享相册不存在")
		return
	}
	posts, err := query(a.db, `SELECT b.* FROM moment_share_posts sp JOIN blog b ON b.id=sp.post_id WHERE sp.share_id=? AND `+activePost("b")+` ORDER BY sp.position`, id)
	if err == nil {
		err = a.attach(posts, false)
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	rows[0]["posts"] = posts
	ok(c, rows[0])
}

func (a *App) saveShare(c *gin.Context) {
	var in shareInput
	if !bind(c, &in) {
		return
	}
	in.Title = strings.TrimSpace(in.Title)
	if in.Title == "" || utf8.RuneCountInString(in.Title) > 100 || utf8.RuneCountInString(in.Description) > 2000 || len(in.PostIDs) < 1 || len(in.PostIDs) > 100 {
		fail(c, 400, "请填写相册名称，并选择 1 到 100 篇帖子")
		return
	}
	if in.ExpiresAt != nil && (*in.ExpiresAt <= time.Now().Unix() || *in.ExpiresAt > time.Now().AddDate(10, 0, 0).Unix()) {
		fail(c, 400, "到期时间需在未来十年内")
		return
	}
	hash := ""
	if in.Password != nil && *in.Password != "" {
		if utf8.RuneCountInString(*in.Password) < 6 || utf8.RuneCountInString(*in.Password) > 128 || strings.TrimSpace(*in.Password) == "" {
			fail(c, 400, "分享密码需为 6 到 128 位")
			return
		}
		select {
		case sharePasswordWorkers <- struct{}{}:
			defer func() { <-sharePasswordWorkers }()
		default:
			fail(c, 503, "正在处理其他密码请求，请稍后重试")
			return
		}
		hash = hashPassword(*in.Password)
	}
	id := int64(0)
	if c.Param("id") != "" {
		var valid bool
		id, valid = routeID(c)
		if !valid {
			return
		}
	}
	token, err := randomShareToken()
	if err != nil {
		databaseError(c, err)
		return
	}
	tx, err := a.db.Begin()
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	seen := map[int64]bool{}
	for _, post := range in.PostIDs {
		var exists int
		if post < 1 || seen[post] {
			fail(c, 400, "帖子列表无效")
			return
		}
		seen[post] = true
		if err = tx.QueryRow("SELECT COUNT(*) FROM blog b WHERE b.id=? AND "+activePost("b")+" AND EXISTS (SELECT 1 FROM blog_image i WHERE i.blog_id=b.id AND i.is_hidden=0)", post).Scan(&exists); err != nil {
			databaseError(c, err)
			return
		}
		if exists != 1 {
			fail(c, 409, "选中的帖子已删除或没有可分享的照片，请重新选择")
			return
		}
	}
	if id == 0 {
		var result sql.Result
		result, err = tx.Exec("INSERT INTO moment_shares(token,title,description,password_hash,expires_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?)", token, in.Title, in.Description, hash, in.ExpiresAt, now(), now())
		if err == nil {
			id, err = result.LastInsertId()
		}
	} else {
		var revision int64
		var oldHash string
		err = tx.QueryRow("SELECT revision,password_hash FROM moment_shares WHERE id=?", id).Scan(&revision, &oldHash)
		if errors.Is(err, sql.ErrNoRows) {
			fail(c, 404, "分享相册不存在")
			return
		}
		if err != nil {
			databaseError(c, err)
			return
		}
		if revision != in.Revision {
			fail(c, 409, "相册已在其他窗口修改，请重新加载后编辑")
			return
		}
		if in.Password == nil {
			hash = oldHash
		}
		_, err = tx.Exec("UPDATE moment_shares SET title=?,description=?,password_hash=?,expires_at=?,revision=revision+1,updated_at=? WHERE id=?", in.Title, in.Description, hash, in.ExpiresAt, now(), id)
		if err == nil {
			_, err = tx.Exec("DELETE FROM moment_share_posts WHERE share_id=?", id)
		}
		if err == nil {
			_, err = tx.Exec("DELETE FROM moment_share_sessions WHERE share_id=?", id)
		}
	}
	for position, post := range in.PostIDs {
		if err == nil {
			_, err = tx.Exec("INSERT INTO moment_share_posts VALUES(?,?,?)", id, post, position)
		}
	}
	if err == nil {
		err = tx.Commit()
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	ok(c, Object{"id": id})
}

func (a *App) changeShare(c *gin.Context) {
	id, valid := routeID(c)
	if !valid {
		return
	}
	var in struct {
		Action   string `json:"action"`
		Revision int64  `json:"revision"`
	}
	if !bind(c, &in) {
		return
	}
	if in.Action != "revoke" && in.Action != "resume" && in.Action != "rotate" && in.Action != "delete" {
		fail(c, 400, "操作无效")
		return
	}
	tx, err := a.db.Begin()
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	var revision int64
	var expires sql.NullInt64
	err = tx.QueryRow("SELECT revision,expires_at FROM moment_shares WHERE id=?", id).Scan(&revision, &expires)
	if errors.Is(err, sql.ErrNoRows) {
		fail(c, 404, "分享相册不存在")
		return
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	if revision != in.Revision {
		fail(c, 409, "相册已改变，请刷新后重试")
		return
	}
	if in.Action == "resume" && expires.Valid && expires.Int64 <= time.Now().Unix() {
		fail(c, 400, "请先编辑相册，延长到期时间")
		return
	}
	switch in.Action {
	case "delete":
		_, err = tx.Exec("DELETE FROM moment_shares WHERE id=?", id)
	case "rotate":
		var token string
		token, err = randomShareToken()
		if err == nil {
			_, err = tx.Exec("UPDATE moment_shares SET token=?,revision=revision+1,updated_at=? WHERE id=?", token, now(), id)
		}
	default:
		_, err = tx.Exec("UPDATE moment_shares SET revoked=?,revision=revision+1,updated_at=? WHERE id=?", in.Action == "revoke", now(), id)
	}
	if err == nil {
		_, err = tx.Exec("DELETE FROM moment_share_sessions WHERE share_id=?", id)
	}
	if err == nil {
		err = tx.Commit()
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	ok(c, nil)
}

// A sharing URL is a random capability, separate from public post IDs and admin
// sessions. Recheck the share and session on every content and media request.
func (a *App) activeShare(c *gin.Context) (Object, bool) {
	c.Header("Cache-Control", "no-store")
	c.Header("Referrer-Policy", "no-referrer")
	c.Header("X-Robots-Tag", "noindex, nofollow, noarchive")
	if !shareToken.MatchString(c.Param("token")) {
		fail(c, 404, "分享链接不存在或已失效")
		return nil, false
	}
	rows, err := query(a.db, "SELECT * FROM moment_shares WHERE token=? AND revoked=0 AND (expires_at IS NULL OR expires_at>?)", c.Param("token"), time.Now().Unix())
	if err != nil {
		databaseError(c, err)
		return nil, false
	}
	if len(rows) != 1 {
		fail(c, 404, "分享链接不存在或已失效")
		return nil, false
	}
	return rows[0], true
}
func (a *App) shareAuthorized(c *gin.Context, share Object) bool {
	if text(share["password_hash"]) == "" {
		return true
	}
	token, _ := c.Cookie("moment_share_access")
	if !shareToken.MatchString(token) {
		return false
	}
	var count int
	err := a.db.QueryRow("SELECT COUNT(*) FROM moment_share_sessions WHERE token_hash=? AND share_id=? AND revision=? AND expires_at>?", tokenDigest(token), share["id"], share["revision"], time.Now().Unix()).Scan(&count)
	return err == nil && count == 1
}
func (a *App) shareCookie(c *gin.Context, value string, age int) {
	http.SetCookie(c.Writer, &http.Cookie{Name: "moment_share_access", Value: value, Path: "/api/shares/" + c.Param("token"), MaxAge: age, HttpOnly: true, Secure: a.secure, SameSite: http.SameSiteLaxMode})
}
func (a *App) unlockShare(c *gin.Context) {
	if !a.shareLimiter.allow(c.ClientIP()) {
		c.Header("Retry-After", "900")
		fail(c, 429, "尝试过多，请在 15 分钟后重试")
		return
	}
	share, valid := a.activeShare(c)
	if !valid {
		return
	}
	var in struct {
		Password string `json:"password"`
	}
	if !bind(c, &in) {
		return
	}
	if len(in.Password) > 512 {
		fail(c, 400, "密码过长")
		return
	}
	hash := text(share["password_hash"])
	if hash != "" {
		select {
		case sharePasswordWorkers <- struct{}{}:
			defer func() { <-sharePasswordWorkers }()
		default:
			fail(c, 503, "正在验证其他请求，请稍后重试")
			return
		}
		if !verifyPassword(in.Password, hash) {
			fail(c, 401, "分享密码不正确")
			return
		}
	}
	token, err := randomShareToken()
	if err != nil {
		databaseError(c, err)
		return
	}
	expires := time.Now().Add(12 * time.Hour).Unix()
	if share["expires_at"] != nil {
		expires = min(expires, integer(share["expires_at"]))
	}
	// Do not create a grant if the password was changed while hashing.
	tx, err := a.db.Begin()
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	_, err = tx.Exec("DELETE FROM moment_share_sessions WHERE expires_at<=?", time.Now().Unix())
	var result sql.Result
	if err == nil {
		result, err = tx.Exec(`INSERT INTO moment_share_sessions SELECT ?,id,revision,? FROM moment_shares WHERE id=? AND revision=? AND revoked=0 AND (expires_at IS NULL OR expires_at>?)`, tokenDigest(token), expires, share["id"], share["revision"], time.Now().Unix())
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	count, _ := result.RowsAffected()
	if count != 1 {
		fail(c, 409, "分享已更新，请重新打开链接")
		return
	}
	if err = tx.Commit(); err != nil {
		databaseError(c, err)
		return
	}
	a.shareCookie(c, token, int(expires-time.Now().Unix()))
	ok(c, nil)
}
func (a *App) lockShare(c *gin.Context) {
	share, valid := a.activeShare(c)
	if !valid {
		return
	}
	token, _ := c.Cookie("moment_share_access")
	if _, err := a.db.Exec("DELETE FROM moment_share_sessions WHERE token_hash=? AND share_id=?", tokenDigest(token), share["id"]); err != nil {
		databaseError(c, err)
		return
	}
	a.shareCookie(c, "", -1)
	ok(c, nil)
}
func (a *App) sharedAlbum(c *gin.Context) {
	share, valid := a.activeShare(c)
	if !valid {
		return
	}
	if !a.shareAuthorized(c, share) {
		ok(c, Object{"locked": true})
		return
	}
	posts, err := query(a.db, `SELECT b.id,b.title,b.desc,b.location,b.time FROM moment_share_posts sp JOIN blog b ON b.id=sp.post_id WHERE sp.share_id=? AND `+activePost("b")+` AND EXISTS (SELECT 1 FROM blog_image i WHERE i.blog_id=b.id AND i.is_hidden=0) ORDER BY sp.position`, share["id"])
	if err == nil {
		err = a.attach(posts, true)
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	for _, post := range posts {
		photos := []Object{}
		for _, photo := range post["images"].([]Object) {
			// Never return legacy original URLs or raw EXIF in the sharing API.
			base := fmt.Sprintf("/api/shares/%s/photos/%d/", c.Param("token"), integer(photo["id"]))
			photos = append(photos, Object{"id": photo["id"], "title": photo["title"], "desc": photo["desc"], "location": photo["location"], "time": photo["time"], "focus_x": photo["focus_x"], "focus_y": photo["focus_y"], "image_url": base + "original", "thumbnail_url": base + "640"})
		}
		post["images"] = photos
	}
	ok(c, Object{"locked": false, "title": share["title"], "description": share["description"], "expires_at": share["expires_at"], "password_required": text(share["password_hash"]) != "", "posts": posts})
}
func (a *App) sharedPhoto(c *gin.Context) {
	share, valid := a.activeShare(c)
	if !valid {
		return
	}
	if !a.shareAuthorized(c, share) {
		fail(c, 401, "请先输入分享密码")
		return
	}
	id, err := strconv.ParseInt(c.Param("photo"), 10, 64)
	size := c.Param("size")
	if err != nil || id < 1 || (size != "original" && size != "320" && size != "640" && size != "1280") {
		fail(c, 404, "照片不存在")
		return
	}
	var source string
	err = a.db.QueryRow(`SELECT i.image_url FROM blog_image i JOIN blog b ON b.id=i.blog_id JOIN moment_share_posts sp ON sp.post_id=b.id WHERE sp.share_id=? AND i.id=? AND i.is_hidden=0 AND `+activePost("b"), share["id"], id).Scan(&source)
	if err != nil {
		fail(c, 404, "照片不存在")
		return
	}
	if strings.HasPrefix(source, "/uploads/") {
		parsed, err := url.Parse(source)
		if err != nil {
			fail(c, 404, "照片不存在")
			return
		}
		name := strings.TrimPrefix(parsed.Path, "/uploads/")
		if !validBackupName("uploads/" + name) {
			fail(c, 404, "照片不存在")
			return
		}
		if size != "original" {
			pixels, _ := strconv.Atoi(size)
			a.serveThumbnail(c, name, pixels, true)
			return
		}
		root, err := os.OpenRoot(filepath.Join(a.data, "uploads"))
		if err != nil {
			fail(c, 404, "照片不存在")
			return
		}
		defer root.Close()
		file, err := root.Open(filepath.FromSlash(name))
		if err != nil {
			fail(c, 404, "照片不存在")
			return
		}
		defer file.Close()
		stat, err := file.Stat()
		if err != nil || !stat.Mode().IsRegular() {
			fail(c, 404, "照片不存在")
			return
		}
		http.ServeContent(c.Writer, c.Request, filepath.Base(name), stat.ModTime(), file)
		return
	}
	if !validURL(source) {
		fail(c, 404, "照片不存在")
		return
	}
	// S3/external originals retain their provider's access policy. No server-side
	// fetching of arbitrary URLs; redirect only after checking album membership.
	settings, err := a.readSettings()
	if err != nil {
		databaseError(c, err)
		return
	}
	suffix := "detail_suffix"
	if size != "original" {
		suffix = "thumbnail_suffix"
	}
	c.Redirect(http.StatusTemporaryRedirect, source+text(object(settings["content"])[suffix]))
}
