package moment

import (
	"database/sql"
	"errors"
	"log"
	"strings"

	"github.com/gin-gonic/gin"
)

func activePost(alias string) string {
	return "NOT EXISTS (SELECT 1 FROM moment_trash_posts t WHERE t.post_id=" + alias + ".id)"
}

func bumpPostRevision(tx *sql.Tx, id int64) error {
	_, err := tx.Exec("INSERT INTO moment_post_revisions(post_id,revision) VALUES (?,1) ON CONFLICT(post_id) DO UPDATE SET revision=revision+1", id)
	return err
}

func movePostToTrash(tx *sql.Tx, id, user, revision int64) error {
	_, err := tx.Exec("INSERT INTO moment_trash_posts(post_id,deleted_at,deleted_by,content_revision) VALUES (?,?,?,?)", id, now(), user, revision)
	return err
}

func (a *App) listTrash(c *gin.Context) {
	page, size, valid := pageParams(c)
	if !valid {
		return
	}
	search := "%" + strings.TrimSpace(c.Query("q")) + "%"
	where := "(b.title LIKE ? OR b.desc LIKE ?)"
	var total int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM moment_trash_posts t JOIN blog b ON b.id=t.post_id WHERE "+where, search, search).Scan(&total); err != nil {
		databaseError(c, err)
		return
	}
	rows, err := query(a.db, `SELECT b.*,t.deleted_at,(SELECT COUNT(*) FROM moment_drafts d WHERE d.post_id=b.id AND d.published_at IS NULL) AS draft_count FROM moment_trash_posts t JOIN blog b ON b.id=t.post_id WHERE `+where+" ORDER BY t.deleted_at DESC,t.post_id DESC LIMIT ? OFFSET ?", search, search, size, (page-1)*size)
	if err != nil {
		databaseError(c, err)
		return
	}
	if err = a.attach(rows, false); err != nil {
		databaseError(c, err)
		return
	}
	c.JSON(200, Object{"code": 200, "msg": "OK", "data": rows, "total": total, "page": page, "page_size": size})
}

func (a *App) changeTrash(c *gin.Context) {
	var in struct {
		Action  string        `json:"action"`
		Targets []batchTarget `json:"targets"`
		Confirm bool          `json:"confirm"`
	}
	if !bind(c, &in) {
		return
	}
	if len(in.Targets) == 0 || len(in.Targets) > 100 || (in.Action != "restore" && in.Action != "purge") || (in.Action == "purge" && !in.Confirm) {
		fail(c, 400, "请选择 1 到 100 篇帖子；永久删除需要再次确认")
		return
	}
	seen := map[int64]bool{}
	for _, target := range in.Targets {
		if target.ID < 1 || seen[target.ID] || target.Revision == nil || *target.Revision < 0 {
			fail(c, 400, "帖子 ID 或版本无效")
			return
		}
		seen[target.ID] = true
	}
	results := make([]batchResult, 0, len(in.Targets))
	for _, target := range in.Targets {
		message, err := a.changeTrashPost(target, in.Action)
		if err != nil {
			log.Printf("trash operation failed: %s", err)
			message = "操作失败，请重试"
		}
		results = append(results, batchResult{ID: target.ID, OK: message == "", Error: message})
	}
	ok(c, results)
}

func (a *App) changeTrashPost(target batchTarget, action string) (string, error) {
	tx, err := a.db.Begin()
	if err != nil {
		return "", err
	}
	defer tx.Rollback()
	var revision, contentRevision int64
	err = tx.QueryRow("SELECT COALESCE(r.revision,0),t.content_revision FROM moment_trash_posts t LEFT JOIN moment_post_revisions r ON r.post_id=t.post_id WHERE t.post_id=?", target.ID).Scan(&revision, &contentRevision)
	if errors.Is(err, sql.ErrNoRows) {
		return "帖子已不在回收站，可能已恢复或永久删除", nil
	}
	if err != nil {
		return "", err
	}
	if revision != *target.Revision {
		return "帖子状态已改变，请检查最新内容后重试", nil
	}
	if action == "purge" {
		// Foreign keys remove image records, focal points, categories and drafts.
		// Original files are retained, as other posts may reference the same URL.
		if _, err = tx.Exec("DELETE FROM blog WHERE id=?", target.ID); err != nil {
			return "", err
		}
	} else {
		if _, err = tx.Exec("DELETE FROM moment_trash_posts WHERE post_id=?", target.ID); err != nil {
			return "", err
		}
		if err = bumpPostRevision(tx, target.ID); err != nil {
			return "", err
		}
		// Restore drafts based on the content that was actually trashed. Already
		// stale drafts remain stale; restoring must not erase a genuine conflict.
		if _, err = tx.Exec("UPDATE moment_drafts SET base_revision=?,revision=revision+1 WHERE post_id=? AND base_revision=? AND published_at IS NULL", revision+1, target.ID, contentRevision); err != nil {
			return "", err
		}
	}
	return "", tx.Commit()
}
