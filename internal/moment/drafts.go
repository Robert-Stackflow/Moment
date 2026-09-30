package moment

import (
	"database/sql"
	"encoding/json"
	"errors"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
)

type Draft struct {
	ID              string    `json:"id"`
	PostID          *int64    `json:"post_id"`
	BaseRevision    int64     `json:"base_revision"`
	Revision        int64     `json:"revision"`
	MutationID      string    `json:"mutation_id"`
	Payload         PostInput `json:"payload"`
	CreatedAt       string    `json:"created_at"`
	UpdatedAt       string    `json:"updated_at"`
	PublishedPostID *int64    `json:"published_post_id"`
	PublishedAt     *string   `json:"published_at"`
}

var draftKeyPattern = regexp.MustCompile(`^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$`)

func draftUser(c *gin.Context) int64 { return integer(c.MustGet("user").(Object)["id"]) }

func readDraft(q querier, user int64, condition string, arg any) (*Draft, error) {
	rows, err := query(q, "SELECT * FROM moment_drafts WHERE user_id=? AND "+condition, user, arg)
	if err != nil || len(rows) == 0 {
		return nil, err
	}
	r := rows[0]
	d := &Draft{ID: text(r["id"]), BaseRevision: integer(r["base_revision"]), Revision: integer(r["revision"]), MutationID: text(r["mutation_id"]), CreatedAt: text(r["created_at"]), UpdatedAt: text(r["updated_at"])}
	if r["post_id"] != nil {
		id := integer(r["post_id"])
		d.PostID = &id
	}
	if r["published_post_id"] != nil {
		id := integer(r["published_post_id"])
		d.PublishedPostID = &id
	}
	if r["published_at"] != nil {
		stamp := text(r["published_at"])
		d.PublishedAt = &stamp
	}
	err = json.Unmarshal([]byte(text(r["payload"])), &d.Payload)
	return d, err
}

func (a *App) getDraft(c *gin.Context) {
	key := c.Param("key")
	if !draftKeyPattern.MatchString(key) {
		fail(c, 400, "草稿标识无效")
		return
	}
	draft, err := readDraft(a.db, draftUser(c), "id=?", key)
	if err != nil {
		databaseError(c, err)
		return
	}
	ok(c, draft)
}

func (a *App) postDraft(c *gin.Context) {
	id, valid := routeID(c)
	if !valid {
		return
	}
	draft, err := readDraft(a.db, draftUser(c), "post_id=? AND published_at IS NULL", id)
	if err != nil {
		databaseError(c, err)
		return
	}
	ok(c, draft)
}

func (a *App) listDrafts(c *gin.Context) {
	page, size, valid := pageParams(c)
	if !valid {
		return
	}
	user := draftUser(c)
	search := "%" + strings.TrimSpace(c.Query("q")) + "%"
	where := "user_id=? AND published_at IS NULL AND NOT EXISTS (SELECT 1 FROM moment_trash_posts t WHERE t.post_id=moment_drafts.post_id) AND (json_extract(payload,'$.title') LIKE ? OR json_extract(payload,'$.desc') LIKE ?)"
	var total int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM moment_drafts WHERE "+where, user, search, search).Scan(&total); err != nil {
		databaseError(c, err)
		return
	}
	rows, err := query(a.db, `SELECT id,post_id,revision,updated_at,json_extract(payload,'$.title') AS title,json_extract(payload,'$.desc') AS description,json_array_length(payload,'$.images') AS image_count,json_extract(payload,'$.images[0].image_url') AS cover FROM moment_drafts WHERE `+where+" ORDER BY updated_at DESC,id LIMIT ? OFFSET ?", user, search, search, size, (page-1)*size)
	if err != nil {
		databaseError(c, err)
		return
	}
	c.JSON(200, Object{"code": 200, "msg": "OK", "data": rows, "total": total, "page": page, "page_size": size})
}

func (a *App) saveDraft(c *gin.Context) {
	var in Draft
	if !bind(c, &in) {
		return
	}
	in.ID = c.Param("key")
	in.PublishedAt, in.PublishedPostID = nil, nil
	if !draftKeyPattern.MatchString(in.ID) || !draftKeyPattern.MatchString(in.MutationID) || in.Revision < 0 || in.BaseRevision < 0 || (in.PostID != nil && *in.PostID < 1) {
		fail(c, 400, "草稿参数无效")
		return
	}
	p := in.Payload
	if utf8.RuneCountInString(p.Title) > 50 || len(p.Images) > 200 || len(p.Categories) > 100 {
		fail(c, 400, "标题最多 50 字，图片最多 200 张")
		return
	}
	for _, img := range p.Images {
		if !validURL(img.URL) || img.ID < 0 {
			fail(c, 400, "图片地址或 ID 无效")
			return
		}
	}
	payload, err := json.Marshal(p)
	if err != nil {
		fail(c, 400, "草稿格式无效")
		return
	}
	user := draftUser(c)
	tx, err := a.db.Begin()
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	if in.PostID != nil {
		var trashed int
		if err := tx.QueryRow("SELECT COUNT(*) FROM moment_trash_posts WHERE post_id=?", *in.PostID).Scan(&trashed); err != nil {
			databaseError(c, err)
			return
		}
		if trashed > 0 {
			fail(c, 409, "帖子已移入回收站，请恢复后继续编辑")
			return
		}
	}
	existing, err := readDraft(tx, user, "id=?", in.ID)
	if err != nil {
		databaseError(c, err)
		return
	}
	if existing != nil && existing.PublishedAt != nil {
		fail(c, 409, "草稿已发布，请打开帖子继续编辑")
		return
	}
	// Retrying a request whose response was lost must not create a second version.
	if existing != nil && existing.MutationID == in.MutationID {
		stored, _ := json.Marshal(existing.Payload)
		if string(stored) != string(payload) {
			fail(c, 409, "重复请求的内容不一致")
			return
		}
		ok(c, existing)
		return
	}
	if existing == nil {
		if in.Revision != 0 {
			fail(c, 409, "草稿已被删除或发布，请重新打开编辑器")
			return
		}
		var duplicates int
		if err := tx.QueryRow("SELECT COUNT(*) FROM moment_drafts WHERE id=? OR (user_id=? AND post_id=? AND published_at IS NULL)", in.ID, user, in.PostID).Scan(&duplicates); err != nil {
			databaseError(c, err)
			return
		}
		if duplicates > 0 {
			fail(c, 409, "已存在编辑草稿，请重新打开编辑器")
			return
		}
		if in.PostID != nil {
			var revision int64
			err = tx.QueryRow("SELECT COALESCE(r.revision,0) FROM blog b LEFT JOIN moment_post_revisions r ON r.post_id=b.id WHERE b.id=?", *in.PostID).Scan(&revision)
			if errors.Is(err, sql.ErrNoRows) {
				fail(c, 404, "帖子不存在")
				return
			}
			if err != nil {
				databaseError(c, err)
				return
			}
			if revision != in.BaseRevision {
				fail(c, 409, "帖子已在其他窗口更新，请重新打开编辑器")
				return
			}
		}
		in.Revision = 1
		in.CreatedAt, in.UpdatedAt = now(), now()
		_, err = tx.Exec("INSERT INTO moment_drafts(id,user_id,post_id,base_revision,revision,mutation_id,payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)", in.ID, user, in.PostID, in.BaseRevision, in.Revision, in.MutationID, string(payload), in.CreatedAt, in.UpdatedAt)
		if err != nil {
			databaseError(c, err)
			return
		}
	} else {
		if existing.Revision != in.Revision || existing.BaseRevision != in.BaseRevision || (existing.PostID == nil) != (in.PostID == nil) || (existing.PostID != nil && *existing.PostID != *in.PostID) {
			fail(c, 409, "草稿已在其他窗口更新，当前内容未覆盖服务器草稿")
			return
		}
		in.Revision++
		in.CreatedAt, in.UpdatedAt = existing.CreatedAt, now()
		_, err = tx.Exec("UPDATE moment_drafts SET revision=?,mutation_id=?,payload=?,updated_at=? WHERE id=? AND user_id=?", in.Revision, in.MutationID, string(payload), in.UpdatedAt, in.ID, user)
		if err != nil {
			databaseError(c, err)
			return
		}
	}
	if err = tx.Commit(); err != nil {
		databaseError(c, err)
		return
	}
	ok(c, in)
}

func (a *App) deleteDraft(c *gin.Context) {
	var in struct {
		Revision int64 `json:"revision"`
	}
	if !bind(c, &in) {
		return
	}
	result, err := a.db.Exec("DELETE FROM moment_drafts WHERE id=? AND user_id=? AND revision=? AND published_at IS NULL", c.Param("key"), draftUser(c), in.Revision)
	if err != nil {
		databaseError(c, err)
		return
	}
	n, _ := result.RowsAffected()
	if n != 1 {
		fail(c, 409, "草稿已改变，请刷新列表后再删除")
		return
	}
	ok(c, nil)
}

func (a *App) publishDraft(c *gin.Context) {
	var in struct {
		Revision int64 `json:"revision"`
	}
	if !bind(c, &in) {
		return
	}
	draft, err := readDraft(a.db, draftUser(c), "id=?", c.Param("key"))
	if err != nil {
		databaseError(c, err)
		return
	}
	if draft == nil {
		fail(c, 404, "草稿不存在")
		return
	}
	if draft.PublishedAt != nil {
		if draft.PublishedPostID == nil {
			fail(c, 404, "已发布的帖子已被删除")
			return
		}
		ok(c, Object{"id": *draft.PublishedPostID})
		return
	}
	if in.Revision != draft.Revision {
		fail(c, 409, "草稿已更新，请重新打开后发布")
		return
	}
	var id int64
	if draft.PostID != nil {
		id = *draft.PostID
	}
	a.writePost(c, draft.Payload, id, &draft.BaseRevision, draft)
}
