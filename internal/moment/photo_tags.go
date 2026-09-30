package moment

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"sort"
	"strconv"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"golang.org/x/image/draw"
	"golang.org/x/text/unicode/norm"
)

func normalizePhotoTags(tags []string) ([]string, error) {
	if len(tags) > 20 {
		return nil, errors.New("每张图片最多设置 20 个标签")
	}
	result := []string{}
	seen := map[string]bool{}
	for _, tag := range tags {
		tag = strings.ToLower(strings.TrimSpace(norm.NFKC.String(tag)))
		if tag == "" || utf8.RuneCountInString(tag) > 32 {
			return nil, errors.New("标签须为 1 到 32 个字")
		}
		for _, char := range tag {
			if unicode.IsControl(char) {
				return nil, errors.New("标签不能包含控制字符")
			}
		}
		if !seen[tag] {
			seen[tag] = true
			result = append(result, tag)
		}
	}
	sort.Strings(result)
	return result, nil
}
func readPhotoTags(q querier, id int64) ([]string, error) {
	rows, err := query(q, "SELECT tag FROM moment_image_tags WHERE image_id=? ORDER BY tag", id)
	tags := []string{}
	for _, row := range rows {
		tags = append(tags, text(row["tag"]))
	}
	return tags, err
}
func savePhotoTags(tx *sql.Tx, id int64, tags *[]string) error {
	if tags == nil {
		return nil
	}
	values, err := normalizePhotoTags(*tags)
	if err != nil {
		return &postError{400, err.Error()}
	}
	if _, err = tx.Exec("DELETE FROM moment_image_tags WHERE image_id=?", id); err != nil {
		return err
	}
	for _, tag := range values {
		if _, err = tx.Exec("INSERT INTO moment_image_tags(image_id,tag) VALUES(?,?)", id, tag); err != nil {
			return err
		}
	}
	return nil
}
func (a *App) attachPhotoTags(blogs []Object, args []any) error {
	rows, err := query(a.db, "SELECT t.image_id,t.tag FROM moment_image_tags t JOIN blog_image i ON i.id=t.image_id WHERE i.blog_id IN ("+placeholders(len(args))+") ORDER BY t.tag", args...)
	if err != nil {
		return err
	}
	tags := map[int64][]string{}
	for _, row := range rows {
		id := integer(row["image_id"])
		tags[id] = append(tags[id], text(row["tag"]))
	}
	for _, post := range blogs {
		for _, photo := range post["images"].([]Object) {
			values := tags[integer(photo["id"])]
			if values == nil {
				values = []string{}
			}
			photo["tags"] = values
		}
	}
	return nil
}
func (a *App) photoTagOptions(c *gin.Context) {
	rows, err := query(a.db, "SELECT t.tag,COUNT(*) AS count FROM moment_image_tags t JOIN blog_image i ON i.id=t.image_id JOIN blog b ON b.id=i.blog_id WHERE "+activePost("b")+" AND t.tag LIKE ? GROUP BY t.tag ORDER BY count DESC,t.tag LIMIT 100", "%"+strings.TrimSpace(c.Query("q"))+"%")
	if err != nil {
		databaseError(c, err)
		return
	}
	ok(c, rows)
}
func (a *App) tagPhotos(c *gin.Context) {
	page, size, valid := pageParams(c)
	if !valid {
		return
	}
	where := activePost("b")
	args := []any{}
	if raw := c.Query("ids"); raw != "" {
		values := strings.Split(raw, ",")
		if len(values) > 50 {
			fail(c, 400, "每次最多核对 50 张图片")
			return
		}
		for _, value := range values {
			id, err := strconv.ParseInt(value, 10, 64)
			if err != nil || id < 1 {
				fail(c, 400, "图片编号无效")
				return
			}
			args = append(args, id)
		}
		where += " AND i.id IN (" + placeholders(len(args)) + ")"
	}
	if q := strings.TrimSpace(c.Query("q")); q != "" {
		where += " AND (b.title LIKE ? OR i.title LIKE ? OR EXISTS(SELECT 1 FROM moment_image_tags t WHERE t.image_id=i.id AND t.tag LIKE ?))"
		args = append(args, "%"+q+"%", "%"+q+"%", "%"+strings.ToLower(norm.NFKC.String(q))+"%")
	}
	if c.Query("untagged") == "true" {
		where += " AND NOT EXISTS(SELECT 1 FROM moment_image_tags t WHERE t.image_id=i.id)"
	}
	var total int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM blog_image i JOIN blog b ON b.id=i.blog_id WHERE "+where, args...).Scan(&total); err != nil {
		databaseError(c, err)
		return
	}
	rows, err := query(a.db, "SELECT i.id,i.image_url,i.is_hidden,b.is_hidden AS post_hidden,b.id AS post_id,b.title AS post_title,COALESCE(r.revision,0) AS revision FROM blog_image i JOIN blog b ON b.id=i.blog_id LEFT JOIN moment_post_revisions r ON r.post_id=b.id WHERE "+where+" ORDER BY b.created_at DESC,b.id DESC,i.\"order\",i.id LIMIT ? OFFSET ?", append(args, size, (page-1)*size)...)
	if err != nil {
		databaseError(c, err)
		return
	}
	for _, photo := range rows {
		photo["post_hidden"] = integer(photo["post_hidden"]) != 0
		tags, e := readPhotoTags(a.db, integer(photo["id"]))
		if e != nil {
			databaseError(c, e)
			return
		}
		photo["tags"] = tags
	}
	c.JSON(200, Object{"code": 200, "msg": "OK", "data": rows, "total": total, "page": page, "page_size": size})
}

func (a *App) tagPhotoPreview(c *gin.Context) {
	var in struct {
		ID     int64  `json:"id"`
		URL    string `json:"image_url"`
		Remote bool   `json:"remote"`
	}
	if !bind(c, &in) {
		return
	}
	if in.ID < 0 || !validURL(in.URL) {
		fail(c, 400, "图片地址无效")
		return
	}
	if in.ID > 0 {
		var count int
		if err := a.db.QueryRow("SELECT COUNT(*) FROM blog_image i JOIN blog b ON b.id=i.blog_id WHERE i.id=? AND i.image_url=? AND "+activePost("b"), in.ID, in.URL).Scan(&count); err != nil {
			databaseError(c, err)
			return
		}
		if count != 1 {
			fail(c, 409, "图片已变化，请刷新后重新识别")
			return
		}
	}
	if !strings.HasPrefix(in.URL, "/uploads/") && !in.Remote {
		fail(c, 400, "请先允许读取远程图片")
		return
	}
	if !a.analysisMu.TryLock() {
		fail(c, 409, "有图片正在分析，请稍后重试")
		return
	}
	defer a.analysisMu.Unlock()
	content, _, err := a.readAnalysisPhoto(c.Request.Context(), in.URL, in.Remote, nil)
	if err != nil {
		fail(c, 422, err.Error())
		return
	}
	config, format, err := image.DecodeConfig(bytes.NewReader(content))
	if err != nil || config.Width < 1 || config.Height < 1 {
		fail(c, 422, "无法解码这张图片，可手动添加标签")
		return
	}
	if config.Width > 16384 || config.Height > 16384 || int64(config.Width)*int64(config.Height) > analysisPixels {
		fail(c, 422, "识别支持不超过 3200 万像素的图片")
		return
	}
	if format == "gif" || (format == "png" && animatedPNG(bytes.NewReader(content))) || (format == "webp" && bytes.Contains(content[:min(64, len(content))], []byte("ANIM"))) {
		fail(c, 422, "动图请手动添加标签")
		return
	}
	source, _, err := image.Decode(bytes.NewReader(content))
	if err != nil {
		fail(c, 422, "无法解码这张图片，可手动添加标签")
		return
	}
	if err = c.Request.Context().Err(); err != nil {
		return
	}
	if source.Bounds().Dx() != config.Width || source.Bounds().Dy() != config.Height {
		fail(c, 422, "图片尺寸不一致")
		return
	}
	width, height := config.Width, config.Height
	ratio := min(1.0, 512.0/float64(max(width, height)))
	width = max(1, int(float64(width)*ratio))
	height = max(1, int(float64(height)*ratio))
	small := image.NewNRGBA(image.Rect(0, 0, width, height))
	draw.Draw(small, small.Bounds(), image.NewUniform(color.White), image.Point{}, draw.Src)
	draw.ApproxBiLinear.Scale(small, small.Bounds(), source, source.Bounds(), draw.Over, nil)
	if format == "jpeg" {
		small = orientThumbnail(small, jpegOrientation(bytes.NewReader(content)))
	}
	var buffer bytes.Buffer
	if err = jpeg.Encode(&buffer, small, &jpeg.Options{Quality: 88}); err != nil {
		databaseError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.Header("X-Content-Type-Options", "nosniff")
	c.Data(200, "image/jpeg", buffer.Bytes())
}

type photoTagTarget struct {
	ID       int64    `json:"id"`
	Revision int64    `json:"revision"`
	URL      string   `json:"image_url"`
	Tags     []string `json:"tags"`
}
type photoTagChange struct {
	ID       int64    `json:"id"`
	PostID   int64    `json:"post_id"`
	URL      string   `json:"image_url"`
	Title    string   `json:"post_title"`
	Revision int64    `json:"revision"`
	Before   []string `json:"before"`
	After    []string `json:"after"`
}

func (a *App) applyPhotoTags(c *gin.Context) {
	var in struct {
		ID      string           `json:"id"`
		Targets []photoTagTarget `json:"targets"`
		Confirm bool             `json:"confirm"`
	}
	if !bind(c, &in) {
		return
	}
	if !backupKey.MatchString(in.ID) || !in.Confirm || len(in.Targets) < 1 || len(in.Targets) > 50 {
		fail(c, 400, "每次请选择 1 到 50 张图片并确认标签")
		return
	}
	seen := map[int64]bool{}
	for index, target := range in.Targets {
		if target.ID < 1 || target.Revision < 0 || target.URL == "" || seen[target.ID] || len(target.Tags) == 0 {
			fail(c, 400, "图片、版本或标签无效")
			return
		}
		seen[target.ID] = true
		tags, err := normalizePhotoTags(target.Tags)
		if err != nil {
			fail(c, 400, err.Error())
			return
		}
		in.Targets[index].Tags = tags
	}
	sort.Slice(in.Targets, func(i, j int) bool { return in.Targets[i].ID < in.Targets[j].ID })
	encoded, _ := json.Marshal(in.Targets)
	digest := tokenDigest(string(encoded))
	tx, err := a.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	if _, err = tx.Exec("UPDATE moment_photo_actions SET status=status WHERE id=?", in.ID); err != nil {
		databaseError(c, err)
		return
	}
	existing, err := query(tx, "SELECT user_id,digest,kind FROM moment_photo_actions WHERE id=?", in.ID)
	if err != nil {
		databaseError(c, err)
		return
	}
	if len(existing) > 0 {
		if integer(existing[0]["user_id"]) != draftUser(c) || text(existing[0]["digest"]) != digest || text(existing[0]["kind"]) != "tags_add" {
			fail(c, 409, "操作标识已使用，请重新确认")
			return
		}
		ok(c, Object{"id": in.ID})
		return
	}
	changes := []photoTagChange{}
	posts := map[int64]bool{}
	for _, target := range in.Targets {
		rows, e := query(tx, "SELECT b.id,b.title,COALESCE(r.revision,0) AS revision FROM blog_image i JOIN blog b ON b.id=i.blog_id LEFT JOIN moment_post_revisions r ON r.post_id=b.id WHERE i.id=? AND i.image_url=? AND "+activePost("b"), target.ID, target.URL)
		if e != nil {
			databaseError(c, e)
			return
		}
		if len(rows) != 1 || integer(rows[0]["revision"]) != target.Revision {
			fail(c, 409, "图片或帖子已变化，候选标签仍保留，请刷新后核对")
			return
		}
		before, e := readPhotoTags(tx, target.ID)
		if e != nil {
			databaseError(c, e)
			return
		}
		merged := make([]string, 0, len(before)+len(target.Tags))
		unique := map[string]bool{}
		for _, tag := range append(append([]string{}, before...), target.Tags...) {
			if !unique[tag] {
				unique[tag] = true
				merged = append(merged, tag)
			}
		}
		after, e := normalizePhotoTags(merged)
		if e != nil {
			fail(c, 400, e.Error())
			return
		}
		postID := integer(rows[0]["id"])
		posts[postID] = true
		changes = append(changes, photoTagChange{target.ID, postID, target.URL, text(rows[0]["title"]), target.Revision + 1, before, after})
	}
	for _, change := range changes {
		if err = savePhotoTags(tx, change.ID, &change.After); err != nil {
			respondPostError(c, err)
			return
		}
	}
	for postID := range posts {
		if _, err = tx.Exec("UPDATE blog SET updated_at=? WHERE id=?", now(), postID); err != nil {
			databaseError(c, err)
			return
		}
		if err = bumpPostRevision(tx, postID); err != nil {
			databaseError(c, err)
			return
		}
	}
	payload, _ := json.Marshal(changes)
	if _, err = tx.Exec("INSERT INTO moment_photo_actions(id,user_id,kind,digest,payload,created_at) VALUES(?,?,'tags_add',?,?,?)", in.ID, draftUser(c), digest, string(payload), now()); err == nil {
		err = tx.Commit()
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	ok(c, Object{"id": in.ID})
}
func undoPhotoTags(tx *sql.Tx, payload string) error {
	var changes []photoTagChange
	if err := json.Unmarshal([]byte(payload), &changes); err != nil {
		return err
	}
	posts := map[int64]bool{}
	for _, change := range changes {
		var revision int64
		err := tx.QueryRow("SELECT COALESCE(r.revision,0) FROM blog_image i JOIN blog b ON b.id=i.blog_id LEFT JOIN moment_post_revisions r ON r.post_id=b.id WHERE i.id=? AND i.blog_id=? AND i.image_url=? AND "+activePost("b"), change.ID, change.PostID, change.URL).Scan(&revision)
		if errors.Is(err, sql.ErrNoRows) || (err == nil && revision != change.Revision) {
			return &postError{409, fmt.Sprintf("「%s」在整理后已有修改，请在帖子编辑页调整标签", change.Title)}
		}
		if err != nil {
			return err
		}
		posts[change.PostID] = true
	}
	for _, change := range changes {
		if err := savePhotoTags(tx, change.ID, &change.Before); err != nil {
			return err
		}
	}
	for postID := range posts {
		if _, err := tx.Exec("UPDATE blog SET updated_at=? WHERE id=?", now(), postID); err != nil {
			return err
		}
		if err := bumpPostRevision(tx, postID); err != nil {
			return err
		}
	}
	return nil
}
