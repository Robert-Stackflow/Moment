package moment

import (
	"database/sql"
	"errors"
	"log"

	"github.com/gin-gonic/gin"
)

type batchTarget struct {
	ID       int64  `json:"id"`
	Revision *int64 `json:"revision"`
}
type batchInput struct {
	Targets    []batchTarget `json:"targets"`
	Action     string        `json:"action"`
	Hidden     *bool         `json:"is_hidden"`
	Mode       string        `json:"mode"`
	Categories []int64       `json:"category_ids"`
}
type batchResult struct {
	ID    int64  `json:"id"`
	OK    bool   `json:"ok"`
	Error string `json:"error,omitempty"`
}

func (a *App) batchPosts(c *gin.Context) {
	var in batchInput
	if !bind(c, &in) {
		return
	}
	if len(in.Targets) == 0 || len(in.Targets) > 100 || (in.Action != "categories" && in.Action != "visibility" && in.Action != "delete") || (in.Action == "visibility" && in.Hidden == nil) {
		fail(c, 400, "请选择 1 到 100 篇帖子和有效操作")
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
	if in.Action == "categories" {
		if (in.Mode != "add" && in.Mode != "replace" && in.Mode != "remove") || len(in.Categories) > 100 || (in.Mode != "replace" && len(in.Categories) == 0) {
			fail(c, 400, "请选择分类及添加、替换或移除方式")
			return
		}
		// Reject invalid category input before performing any item in the batch.
		for _, id := range in.Categories {
			var count int
			if err := a.db.QueryRow("SELECT COUNT(*) FROM category WHERE id=?", id).Scan(&count); err != nil {
				databaseError(c, err)
				return
			}
			if count == 0 {
				fail(c, 400, "分类已不存在，请刷新后重试")
				return
			}
		}
	}
	results := make([]batchResult, 0, len(in.Targets))
	for _, target := range in.Targets {
		message, err := a.batchPost(target, in, draftUser(c))
		if err != nil {
			log.Printf("batch post operation failed: %s", err)
			message = "操作失败，请重试"
		}
		results = append(results, batchResult{ID: target.ID, OK: message == "", Error: message})
	}
	ok(c, results)
}

// Each post has its own transaction: a rejected item cannot partly change its
// categories, while successful items have a precise per-item result.
func (a *App) batchPost(target batchTarget, in batchInput, user int64) (string, error) {
	tx, err := a.db.Begin()
	if err != nil {
		return "", err
	}
	defer tx.Rollback()
	var revision int64
	err = tx.QueryRow("SELECT COALESCE(r.revision,0) FROM blog b LEFT JOIN moment_post_revisions r ON r.post_id=b.id WHERE b.id=? AND "+activePost("b"), target.ID).Scan(&revision)
	if errors.Is(err, sql.ErrNoRows) {
		return "帖子已不存在", nil
	}
	if err != nil {
		return "", err
	}
	if revision != *target.Revision {
		return "帖子已被其他操作更新，请检查最新内容后重试", nil
	}
	switch in.Action {
	case "delete":
		err = movePostToTrash(tx, target.ID, user, revision)
	case "visibility":
		_, err = tx.Exec("UPDATE blog SET is_hidden=?,updated_at=? WHERE id=?", *in.Hidden, now(), target.ID)
	case "categories":
		categories, e := query(tx, "SELECT id,parent_id FROM category")
		if e != nil {
			return "", e
		}
		parents := map[int64]int64{}
		for _, cat := range categories {
			parents[integer(cat["id"])] = integer(cat["parent_id"])
		}
		for _, id := range in.Categories {
			if _, ok := parents[id]; !ok {
				return "分类已不存在，请刷新后重试", nil
			}
		}
		next := map[int64]bool{}
		if in.Mode != "replace" {
			existing, e := query(tx, "SELECT category_id FROM blog_category WHERE blog_id=?", target.ID)
			if e != nil {
				return "", e
			}
			for _, cat := range existing {
				next[integer(cat["category_id"])] = true
			}
		}
		for _, id := range in.Categories {
			if in.Mode == "remove" {
				delete(next, id)
				for child, parent := range parents {
					if parent == id {
						delete(next, child)
					}
				}
			} else {
				next[id] = true
				if parent := parents[id]; parent != 0 {
					next[parent] = true
				}
			}
		}
		if _, err = tx.Exec("DELETE FROM blog_category WHERE blog_id=?", target.ID); err != nil {
			return "", err
		}
		for id := range next {
			if _, err = tx.Exec("INSERT INTO blog_category(blog_id,category_id) VALUES (?,?)", target.ID, id); err != nil {
				return "", err
			}
		}
		_, err = tx.Exec("UPDATE blog SET updated_at=? WHERE id=?", now(), target.ID)
	}
	if err != nil {
		return "", err
	}
	if err = bumpPostRevision(tx, target.ID); err != nil {
		return "", err
	}
	return "", tx.Commit()
}
