package moment

import (
	"encoding/json"
	"math"
	"net/mail"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
)

func (a *App) readSettings() (Object, error) {
	rows, err := query(a.db, "SELECT general,meta,content,storage FROM setting ORDER BY id LIMIT 1")
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return Object{}, nil
	}
	return rows[0], nil
}
func (a *App) settings(c *gin.Context) {
	settings, err := a.readSettings()
	if err != nil {
		databaseError(c, err)
		return
	}
	storage := object(settings["storage"])
	for _, key := range []string{"access_id", "secret_key"} {
		storage[key+"_configured"] = text(storage[key]) != ""
		storage[key] = ""
	}
	if text(storage["provider"]) == "" {
		if text(storage["endpoint"]) != "" {
			storage["provider"] = "s3"
		} else {
			storage["provider"] = "local"
		}
	}
	settings["storage"] = storage
	ok(c, settings)
}
func (a *App) saveSettings(c *gin.Context) {
	section := c.Param("section")
	if section != "general" && section != "meta" && section != "content" && section != "storage" {
		fail(c, 400, "设置分组无效")
		return
	}
	var changes Object
	if !bind(c, &changes) {
		return
	}
	if changes == nil {
		fail(c, 400, "设置不能为空")
		return
	}
	tx, err := a.db.Begin()
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	var raw string
	var id int64
	if err = tx.QueryRow("SELECT id,"+section+" FROM setting ORDER BY id LIMIT 1").Scan(&id, &raw); err != nil {
		databaseError(c, err)
		return
	}
	current := Object{}
	if err = json.Unmarshal([]byte(raw), &current); err != nil {
		fail(c, 409, "原设置数据格式无效，请先备份并修复")
		return
	}
	originalPageSize, originalPageSizeIsNumber := current["page_size"].(float64)
	for key, value := range changes {
		if strings.HasSuffix(key, "_configured") {
			continue
		}
		if section == "storage" && (key == "secret_key" || key == "access_id") {
			if value == "" {
				continue
			}
			if value == nil {
				value = ""
			}
		}
		current[key] = value
	}
	if section == "content" {
		if value, found := current["local_thumbnails"]; found {
			if _, valid := value.(bool); !valid {
				fail(c, 400, "自动缩略图开关无效")
				return
			}
		}
		if value, found := changes["page_size"]; found {
			size, numeric := value.(float64)
			// Preserve an unchanged legacy limit when another option is saved.
			// The gallery already splits large legacy pages into bounded requests.
			unchanged := numeric && originalPageSizeIsNumber && size == originalPageSize
			if !numeric || !unchanged && (size < 1 || size > 100 || math.Trunc(size) != size) {
				fail(c, 400, "每页数量必须是 1 到 100 之间的整数")
				return
			}
		}
		if order := text(current["order_option"]); order != "" {
			if _, found := sortSQL[order]; !found {
				fail(c, 400, "排序选项无效")
				return
			}
		}
	}
	if section == "storage" {
		if value, found := changes["timeout_time"]; found && (integer(value) < 5 || integer(value) > 600) {
			fail(c, 400, "上传超时必须在 5 到 600 秒之间")
			return
		}
		if value, found := current["max_size"]; found {
			size, ok := value.(float64)
			if !ok {
				size = float64(integer(value))
			}
			if size <= 0 || size > 256 {
				fail(c, 400, "上传大小必须在 0 到 256 MB 之间")
				return
			}
		}
		if provider := text(current["provider"]); provider != "" && provider != "s3" && provider != "local" {
			fail(c, 400, "存储类型无效")
			return
		}
		if endpoint := text(current["endpoint"]); endpoint != "" && !validURL(endpoint) {
			fail(c, 400, "S3 endpoint 必须是有效的 HTTP 或 HTTPS 地址")
			return
		}
	}
	encoded, err := json.Marshal(current)
	if err == nil {
		_, err = tx.Exec("UPDATE setting SET "+section+"=?,updated_at=? WHERE id=?", string(encoded), now(), id)
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
func validEmail(value string) bool {
	address, err := mail.ParseAddress(value)
	return err == nil && address.Address == value && len(value) <= 255
}
func (a *App) profile(c *gin.Context) {
	var in struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Avatar   string `json:"avatar"`
		Alias    string `json:"alias"`
	}
	if !bind(c, &in) {
		return
	}
	in.Username = strings.TrimSpace(in.Username)
	if in.Username == "" || utf8.RuneCountInString(in.Username) > 20 || !validEmail(in.Email) || len(in.Avatar) > 255 || in.Avatar != "" && !validURL(in.Avatar) && !localAvatarURL.MatchString(in.Avatar) || utf8.RuneCountInString(in.Alias) > 30 {
		fail(c, 400, "账户资料格式无效")
		return
	}
	user := object(c.MustGet("user"))
	var count int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM user WHERE id!=? AND (username=? OR email=?)", user["id"], in.Username, in.Email).Scan(&count); err != nil {
		databaseError(c, err)
		return
	}
	if count > 0 {
		fail(c, 409, "用户名或邮箱已存在")
		return
	}
	if _, err := a.db.Exec("UPDATE user SET username=?,email=?,avatar=?,alias=?,updated_at=? WHERE id=?", in.Username, in.Email, in.Avatar, in.Alias, now(), user["id"]); err != nil {
		databaseError(c, err)
		return
	}
	ok(c, nil)
}
func (a *App) password(c *gin.Context) {
	var in struct {
		Old string `json:"old_password"`
		New string `json:"new_password"`
	}
	if !bind(c, &in) {
		return
	}
	if len(in.New) < 10 || len(in.New) > 1024 || len(in.Old) > 1024 {
		fail(c, 400, "新密码至少 10 位，最多 1024 字节")
		return
	}
	id := object(c.MustGet("user"))["id"]
	var hash string
	if err := a.db.QueryRow("SELECT password FROM user WHERE id=?", id).Scan(&hash); err != nil {
		databaseError(c, err)
		return
	}
	if !verifyPassword(in.Old, hash) {
		fail(c, 400, "旧密码错误")
		return
	}
	tx, err := a.db.Begin()
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	if _, err = tx.Exec("UPDATE user SET password=?,updated_at=? WHERE id=?", hashPassword(in.New), now(), id); err == nil {
		_, err = tx.Exec("DELETE FROM moment_sessions WHERE user_id=?", id)
	}
	if err == nil {
		err = tx.Commit()
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	a.cookie(c, "", -1)
	ok(c, nil)
}
