package moment

import (
	"context"
	"errors"
	"log"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type Schedule struct {
	DraftID       string  `json:"draft_id"`
	Revision      int64   `json:"revision"`
	DraftRevision int64   `json:"draft_revision"`
	PublishAt     int64   `json:"publish_at"`
	Status        string  `json:"status"`
	Title         string  `json:"title"`
	Error         string  `json:"error"`
	UpdatedAt     string  `json:"updated_at"`
	CompletedAt   *string `json:"completed_at"`
}

func readSchedule(q querier, key string) (*Schedule, error) {
	rows, err := query(q, "SELECT * FROM moment_schedules WHERE draft_id=?", key)
	if err != nil || len(rows) == 0 {
		return nil, err
	}
	r := rows[0]
	s := &Schedule{DraftID: key, Revision: integer(r["revision"]), DraftRevision: integer(r["draft_revision"]), PublishAt: integer(r["publish_at"]), Status: text(r["status"]), Title: text(r["title"]), Error: text(r["error"]), UpdatedAt: text(r["updated_at"])}
	if r["completed_at"] != nil {
		v := text(r["completed_at"])
		s.CompletedAt = &v
	}
	return s, nil
}

func editableDraft(q querier, key string) error {
	s, err := readSchedule(q, key)
	if err != nil {
		return err
	}
	if s != nil && s.Status == "pending" {
		return &postError{409, "草稿已安排定时发布，请先取消计划再编辑或立即发布"}
	}
	return nil
}

func (a *App) listSchedules(c *gin.Context) {
	page, size, valid := pageParams(c)
	if !valid {
		return
	}
	filter := c.Query("status")
	if filter != "" && filter != "pending" && filter != "failed" && filter != "published" && filter != "cancelled" {
		fail(c, 400, "计划状态无效")
		return
	}
	where := "d.user_id=? AND (?='' OR s.status=?) AND s.title LIKE ?"
	args := []any{draftUser(c), filter, filter, "%" + strings.TrimSpace(c.Query("q")) + "%"}
	var total int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM moment_schedules s JOIN moment_drafts d ON d.id=s.draft_id WHERE "+where, args...).Scan(&total); err != nil {
		databaseError(c, err)
		return
	}
	rows, err := query(a.db, `SELECT s.*,d.post_id,d.published_post_id,json_extract(d.payload,'$.images[0].image_url') AS cover FROM moment_schedules s JOIN moment_drafts d ON d.id=s.draft_id WHERE `+where+` ORDER BY CASE s.status WHEN 'failed' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,CASE WHEN s.status='pending' THEN s.publish_at ELSE -s.publish_at END,s.draft_id LIMIT ? OFFSET ?`, append(args, size, (page-1)*size)...)
	if err != nil {
		databaseError(c, err)
		return
	}
	c.JSON(200, Object{"code": 200, "msg": "OK", "data": rows, "total": total, "page": page, "page_size": size})
}

func (a *App) saveSchedule(c *gin.Context) {
	var in struct {
		Revision      int64 `json:"revision"`
		DraftRevision int64 `json:"draft_revision"`
		PublishAt     int64 `json:"publish_at"`
	}
	if !bind(c, &in) {
		return
	}
	stamp := time.Now()
	if in.Revision < 0 || in.DraftRevision < 1 {
		fail(c, 400, "发布计划版本无效")
		return
	}
	tx, err := a.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	key := c.Param("key")
	user := draftUser(c)
	// Acquire SQLite's writer lock before reading versions, including across processes.
	if _, err = tx.Exec("UPDATE moment_schedules SET revision=revision WHERE draft_id=?", key); err != nil {
		databaseError(c, err)
		return
	}
	draft, err := readDraft(tx, user, "id=?", key)
	if err != nil {
		databaseError(c, err)
		return
	}
	if draft == nil {
		fail(c, 404, "草稿不存在")
		return
	}
	current, err := readSchedule(tx, key)
	if err != nil {
		databaseError(c, err)
		return
	}
	// A lost response can be retried even after the worker finished the exact request.
	if current != nil && current.DraftRevision == in.DraftRevision && current.PublishAt == in.PublishAt && ((current.Revision == in.Revision+1 && current.Status == "pending") || (current.Revision == in.Revision+2 && current.Status == "published")) {
		ok(c, current)
		return
	}
	if in.PublishAt <= stamp.Unix() || in.PublishAt > stamp.AddDate(5, 0, 0).Unix() {
		fail(c, 400, "请选择未来五年内的发布时间（北京时间）")
		return
	}
	if draft.PublishedAt != nil || draft.Revision != in.DraftRevision || (current == nil && in.Revision != 0) || (current != nil && current.Revision != in.Revision) {
		fail(c, 409, "草稿或发布计划已改变，请刷新后重试")
		return
	}
	if draft.Payload.Hidden {
		fail(c, 400, "定时发布需要将帖子设为公开")
		return
	}
	visible := false
	for _, img := range draft.Payload.Images {
		visible = visible || !img.Hidden
	}
	if !visible {
		fail(c, 400, "请至少保留一张公开图片")
		return
	}
	// Exercise the same validation as immediate publishing, without changing content.
	if _, err = tx.Exec("SAVEPOINT schedule_validation"); err != nil {
		databaseError(c, err)
		return
	}
	id := int64(0)
	if draft.PostID != nil {
		id = *draft.PostID
	}
	_, err = writePostTx(tx, draft.Payload, id, &draft.BaseRevision, draft, user, true)
	if err != nil {
		respondPostError(c, err)
		return
	}
	if _, err = tx.Exec("ROLLBACK TO schedule_validation; RELEASE schedule_validation"); err != nil {
		databaseError(c, err)
		return
	}
	_, err = tx.Exec(`INSERT INTO moment_schedules(draft_id,revision,draft_revision,publish_at,status,title,created_at,updated_at) VALUES (?,?,?,?, 'pending',?,?,?) ON CONFLICT(draft_id) DO UPDATE SET revision=excluded.revision,draft_revision=excluded.draft_revision,publish_at=excluded.publish_at,status='pending',title=excluded.title,error='',updated_at=excluded.updated_at,completed_at=NULL`, key, in.Revision+1, draft.Revision, in.PublishAt, strings.TrimSpace(draft.Payload.Title), now(), now())
	if err != nil {
		databaseError(c, err)
		return
	}
	result, err := readSchedule(tx, key)
	if err == nil {
		err = tx.Commit()
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	ok(c, result)
}

func (a *App) cancelSchedule(c *gin.Context) {
	var in struct {
		Revision int64 `json:"revision"`
	}
	if !bind(c, &in) {
		return
	}
	result, err := a.db.Exec(`UPDATE moment_schedules SET status='cancelled',revision=revision+1,error='',updated_at=? WHERE draft_id=? AND revision=? AND status IN ('pending','failed') AND EXISTS (SELECT 1 FROM moment_drafts d WHERE d.id=draft_id AND d.user_id=?)`, now(), c.Param("key"), in.Revision, draftUser(c))
	if err != nil {
		databaseError(c, err)
		return
	}
	count, _ := result.RowsAffected()
	if count != 1 {
		fail(c, 409, "计划已改变或已经发布，请刷新列表")
		return
	}
	ok(c, nil)
}

// RunScheduler starts with overdue work and then checks every five seconds. The
// caller cancels and joins this loop before closing the database.
func (a *App) RunScheduler(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	for {
		if ctx.Err() != nil {
			return
		}
		if err := a.publishDue(ctx, time.Now()); err != nil && ctx.Err() == nil {
			log.Printf("scheduled publishing: %v", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (a *App) publishDue(ctx context.Context, at time.Time) error {
	a.stateMu.RLock()
	defer a.stateMu.RUnlock()
	a.writeMu.RLock()
	defer a.writeMu.RUnlock()
	rows, err := query(a.db, "SELECT draft_id FROM moment_schedules WHERE status='pending' AND publish_at<=? ORDER BY publish_at,draft_id LIMIT 25", at.Unix())
	if err != nil {
		return err
	}
	for _, row := range rows {
		if err := a.publishScheduled(ctx, text(row["draft_id"]), at); err != nil {
			return err
		}
	}
	return nil
}

func (a *App) publishScheduled(ctx context.Context, key string, at time.Time) error {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	tx, err := a.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	result, err := tx.Exec("UPDATE moment_schedules SET revision=revision WHERE draft_id=? AND status='pending' AND publish_at<=?", key, at.Unix())
	if err != nil {
		return err
	}
	count, _ := result.RowsAffected()
	if count == 0 {
		return nil
	}
	s, err := readSchedule(tx, key)
	if err != nil {
		return err
	}
	var user int64
	if err = tx.QueryRow("SELECT user_id FROM moment_drafts WHERE id=?", key).Scan(&user); err != nil {
		return err
	}
	d, err := readDraft(tx, user, "id=?", key)
	if err != nil {
		return err
	}
	if _, err = tx.Exec("SAVEPOINT scheduled_content"); err != nil {
		return err
	}
	var id int64
	if d == nil || d.PublishedAt != nil || d.Revision != s.DraftRevision {
		err = &postError{409, "草稿版本已经变化，请重新确认内容"}
	} else {
		if d.PostID != nil {
			id = *d.PostID
		}
		id, err = writePostTx(tx, d.Payload, id, &d.BaseRevision, d, user, true)
	}
	state, message := "published", ""
	if err != nil {
		state, message = "failed", "写入失败，草稿已保留；请稍后重新安排"
		var failure *postError
		if errors.As(err, &failure) {
			message = failure.message
		} else {
			log.Printf("scheduled draft %s: %v", key, err)
		}
		if _, rollbackErr := tx.Exec("ROLLBACK TO scheduled_content"); rollbackErr != nil {
			return errors.Join(err, rollbackErr)
		}
	}
	if _, err = tx.Exec("RELEASE scheduled_content"); err != nil {
		return err
	}
	_, err = tx.Exec("UPDATE moment_schedules SET status=?,error=?,revision=revision+1,updated_at=?,completed_at=? WHERE draft_id=?", state, message, now(), now(), key)
	if err != nil {
		return err
	}
	return tx.Commit()
}
