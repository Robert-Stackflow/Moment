package moment

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"sort"

	"github.com/gin-gonic/gin"
)

type photoActionTarget struct {
	ID       int64 `json:"id"`
	Revision int64 `json:"revision"`
}
type photoActionChange struct {
	ID       int64  `json:"id"`
	PostID   int64  `json:"post_id"`
	URL      string `json:"image_url"`
	Title    string `json:"post_title"`
	Revision int64  `json:"revision"`
}

func (a *App) hideDuplicatePhotos(c *gin.Context) {
	if !a.ownDuplicateScan(c) {
		return
	}
	groupID, valid := routeID(c)
	if !valid {
		return
	}
	scan, err := duplicateScan(a.db, draftUser(c), c.Param("scan"))
	if err != nil {
		databaseError(c, err)
		return
	}
	if text(scan["status"]) != "ready" {
		fail(c, 409, "扫描结果已失效，请重新扫描")
		return
	}
	var in struct {
		ID      string              `json:"id"`
		Targets []photoActionTarget `json:"targets"`
		Confirm bool                `json:"confirm"`
	}
	if !bind(c, &in) {
		return
	}
	if !backupKey.MatchString(in.ID) || len(in.Targets) < 1 || len(in.Targets) > 100 || !in.Confirm {
		fail(c, 400, "请选择 1 到 100 张图片并确认隐藏")
		return
	}
	seen := map[int64]bool{}
	for _, target := range in.Targets {
		if target.ID < 1 || target.Revision < 0 || seen[target.ID] {
			fail(c, 400, "图片或版本无效")
			return
		}
		seen[target.ID] = true
	}
	sort.Slice(in.Targets, func(i, j int) bool { return in.Targets[i].ID < in.Targets[j].ID })
	encoded, _ := json.Marshal(Object{"scan": c.Param("scan"), "group": groupID, "targets": in.Targets})
	digest := tokenDigest(string(encoded))
	tx, err := a.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	// Acquire the writer before reading versions, including separate app instances.
	if _, err = tx.Exec("UPDATE moment_photo_actions SET status=status WHERE id=?", in.ID); err != nil {
		databaseError(c, err)
		return
	}
	existing, err := query(tx, "SELECT user_id,digest FROM moment_photo_actions WHERE id=?", in.ID)
	if err != nil {
		databaseError(c, err)
		return
	}
	if len(existing) > 0 {
		if integer(existing[0]["user_id"]) != draftUser(c) || text(existing[0]["digest"]) != digest {
			fail(c, 409, "操作标识已使用，请重新确认")
			return
		}
		ok(c, Object{"id": in.ID})
		return
	}
	var total int
	if err = tx.QueryRow(`SELECT COUNT(*) FROM moment_duplicate_members m JOIN moment_duplicate_items d ON d.scan_id=m.scan_id AND d.image_id=m.image_id
 JOIN blog_image i ON i.id=d.image_id AND i.image_url=d.image_url JOIN blog b ON b.id=i.blog_id
 WHERE m.scan_id=? AND m.group_id=? AND i.is_hidden=0 AND `+activePost("b"), c.Param("scan"), groupID).Scan(&total); err != nil {
		databaseError(c, err)
		return
	}
	if total <= len(in.Targets) {
		fail(c, 400, "请至少保留一张当前可见的图片")
		return
	}
	changes := make([]photoActionChange, 0, len(in.Targets))
	posts := map[int64]int64{}
	for _, target := range in.Targets {
		rows, e := query(tx, `SELECT d.post_id,d.image_url,b.title,COALESCE(r.revision,0) AS revision FROM moment_duplicate_members m
 JOIN moment_duplicate_items d ON d.scan_id=m.scan_id AND d.image_id=m.image_id
 JOIN blog_image i ON i.id=d.image_id AND i.blog_id=d.post_id AND i.image_url=d.image_url JOIN blog b ON b.id=i.blog_id
 LEFT JOIN moment_post_revisions r ON r.post_id=b.id
 WHERE m.scan_id=? AND m.group_id=? AND d.image_id=? AND i.is_hidden=0 AND `+activePost("b"), c.Param("scan"), groupID, target.ID)
		if e != nil {
			databaseError(c, e)
			return
		}
		if len(rows) != 1 || integer(rows[0]["revision"]) != target.Revision {
			fail(c, 409, "图片或帖子已改变，请刷新分组后重新选择")
			return
		}
		row := rows[0]
		postID := integer(row["post_id"])
		posts[postID] = target.Revision + 1
		changes = append(changes, photoActionChange{target.ID, postID, text(row["image_url"]), text(row["title"]), target.Revision + 1})
	}
	for _, change := range changes {
		if _, err = tx.Exec("UPDATE blog_image SET is_hidden=1,updated_at=? WHERE id=?", now(), change.ID); err != nil {
			databaseError(c, err)
			return
		}
	}
	for postID := range posts {
		if _, err = tx.Exec("UPDATE blog SET updated_at=? WHERE id=?", now(), postID); err == nil {
			err = bumpPostRevision(tx, postID)
		}
		if err != nil {
			databaseError(c, err)
			return
		}
	}
	payload, _ := json.Marshal(changes)
	if _, err = tx.Exec("INSERT INTO moment_photo_actions(id,user_id,kind,digest,payload,created_at) VALUES(?,?,'duplicates_hide',?,?,?)", in.ID, draftUser(c), digest, string(payload), now()); err == nil {
		err = tx.Commit()
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	ok(c, Object{"id": in.ID})
}

func (a *App) photoActions(c *gin.Context) {
	page, size, valid := pageParams(c)
	if !valid {
		return
	}
	var total int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM moment_photo_actions WHERE user_id=?", draftUser(c)).Scan(&total); err != nil {
		databaseError(c, err)
		return
	}
	rows, err := query(a.db, "SELECT id,kind,status,created_at,undone_at,payload FROM moment_photo_actions WHERE user_id=? ORDER BY rowid DESC LIMIT ? OFFSET ?", draftUser(c), size, (page-1)*size)
	if err != nil {
		databaseError(c, err)
		return
	}
	for _, row := range rows {
		var changes []photoActionChange
		if err = json.Unmarshal([]byte(text(row["payload"])), &changes); err != nil {
			databaseError(c, err)
			return
		}
		row["changes"] = changes
		delete(row, "payload")
	}
	c.JSON(200, Object{"code": 200, "msg": "OK", "data": rows, "total": total, "page": page, "page_size": size})
}
func (a *App) undoPhotoAction(c *gin.Context) {
	id := c.Param("action")
	if !backupKey.MatchString(id) {
		fail(c, 400, "操作记录无效")
		return
	}
	tx, err := a.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	if _, err = tx.Exec("UPDATE moment_photo_actions SET status=status WHERE id=? AND user_id=?", id, draftUser(c)); err != nil {
		databaseError(c, err)
		return
	}
	var state, kind, payload string
	err = tx.QueryRow("SELECT status,kind,payload FROM moment_photo_actions WHERE id=? AND user_id=?", id, draftUser(c)).Scan(&state, &kind, &payload)
	if errors.Is(err, sql.ErrNoRows) {
		fail(c, 404, "操作记录不存在")
		return
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	if state == "undone" {
		ok(c, nil)
		return
	}
	if kind == "tags_add" {
		if err = undoPhotoTags(tx, payload); err != nil {
			respondPostError(c, err)
			return
		}
		if _, err = tx.Exec("UPDATE moment_photo_actions SET status='undone',undone_at=? WHERE id=?", now(), id); err == nil {
			err = tx.Commit()
		}
		if err != nil {
			databaseError(c, err)
			return
		}
		ok(c, nil)
		return
	}
	if kind != "duplicates_hide" {
		fail(c, 400, "此记录不支持撤销")
		return
	}
	var changes []photoActionChange
	if err = json.Unmarshal([]byte(payload), &changes); err != nil {
		databaseError(c, err)
		return
	}
	posts := map[int64]bool{}
	for _, change := range changes {
		var revision int64
		err = tx.QueryRow(`SELECT COALESCE(r.revision,0) FROM blog_image i JOIN blog b ON b.id=i.blog_id LEFT JOIN moment_post_revisions r ON r.post_id=b.id
 WHERE i.id=? AND b.id=? AND i.image_url=? AND i.is_hidden=1 AND `+activePost("b"), change.ID, change.PostID, change.URL).Scan(&revision)
		if errors.Is(err, sql.ErrNoRows) || (err == nil && revision != change.Revision) {
			fail(c, 409, fmt.Sprintf("「%s」在整理后已有修改，请在帖子编辑页调整图片显示状态", change.Title))
			return
		}
		if err != nil {
			databaseError(c, err)
			return
		}
		posts[change.PostID] = true
	}
	for _, change := range changes {
		if _, err = tx.Exec("UPDATE blog_image SET is_hidden=0,updated_at=? WHERE id=?", now(), change.ID); err != nil {
			databaseError(c, err)
			return
		}
	}
	for postID := range posts {
		if _, err = tx.Exec("UPDATE blog SET updated_at=? WHERE id=?", now(), postID); err == nil {
			err = bumpPostRevision(tx, postID)
		}
		if err != nil {
			databaseError(c, err)
			return
		}
	}
	if _, err = tx.Exec("UPDATE moment_photo_actions SET status='undone',undone_at=? WHERE id=?", now(), id); err == nil {
		err = tx.Commit()
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	ok(c, nil)
}
