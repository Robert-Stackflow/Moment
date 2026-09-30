package moment

import (
	"database/sql"
	"encoding/json"
	"errors"
	"github.com/gin-gonic/gin"
	"os"
	"path/filepath"
	"strings"
)

func (a *App) restoreBackup(c *gin.Context) {
	if !a.beginBackup(c) {
		return
	}
	defer a.backupMu.Unlock()
	var in struct {
		Confirm  string `json:"confirm"`
		Password string `json:"password"`
	}
	if !bind(c, &in) {
		return
	}
	if in.Confirm != "恢复备份" || len(in.Password) > 1024 {
		fail(c, 400, "请输入恢复备份并验证当前密码")
		return
	}
	if !a.limiter.allow(c.ClientIP()) {
		fail(c, 429, "验证尝试过多，请稍后重试")
		return
	}
	var hash string
	if err := a.db.QueryRow("SELECT password FROM user WHERE id=?", draftUser(c)).Scan(&hash); err != nil || !verifyPassword(in.Password, hash) {
		fail(c, 400, "当前密码不正确")
		return
	}
	a.limiter.reset(c.ClientIP())
	info, err := a.readBackupInfo(c.Param("key"))
	if err != nil {
		fail(c, 404, "备份不存在")
		return
	}
	ctx, cancel := backupContext(c)
	defer cancel()
	stage, err := os.MkdirTemp(a.data, ".restore-stage-")
	if err != nil {
		databaseError(c, err)
		return
	}
	defer os.RemoveAll(stage)
	_, _, err = unpackBackup(ctx, a.backupPath(info.ID), stage)
	if err != nil {
		fail(c, 400, "备份校验失败，当前内容未改变")
		return
	}
	prepared, err := Open(stage, a.dist, a.secure)
	if err != nil {
		databaseError(c, err)
		return
	}
	_, err = prepared.db.Exec("DELETE FROM moment_sessions; DELETE FROM moment_share_sessions; DELETE FROM moment_passkey_challenges")
	if err == nil {
		_, err = prepared.db.Exec("UPDATE moment_schedules SET status='failed',error='已从备份恢复，请确认内容后重新安排发布时间',revision=revision+1,updated_at=? WHERE status='pending'", now())
	}
	closeErr := prepared.Close()
	if err == nil {
		err = closeErr
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	safety, err := a.exportBackup(ctx, "before-restore")
	if err != nil {
		fail(c, 500, "恢复前备份失败，当前内容未改变")
		return
	}
	if err = ctx.Err(); err != nil {
		fail(c, 408, "恢复准备超时，当前内容未改变")
		return
	}
	if err = a.installRestore(stage); err != nil {
		databaseError(c, err)
		return
	}
	a.cookie(c, "", -1)
	ok(c, Object{"safety_backup_id": safety.ID, "login_required": true})
}

type restoreJournal struct {
	Old       string          `json:"old"`
	Stage     string          `json:"stage"`
	Existing  map[string]bool `json:"existing"`
	Committed bool            `json:"committed"`
}

var restoreParts = []string{"db.sqlite3", "uploads", "avatars"}

func writeRestoreJournal(data string, j restoreJournal) error {
	bytes, err := json.Marshal(j)
	if err != nil {
		return err
	}
	path := filepath.Join(data, ".restore-journal.json")
	f, err := os.OpenFile(path+".tmp", os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}
	_, err = f.Write(bytes)
	syncErr := f.Sync()
	closeErr := f.Close()
	if err == nil {
		err = errors.Join(syncErr, closeErr)
	}
	if err != nil {
		return err
	}
	return os.Rename(path+".tmp", path)
}
func (a *App) installRestore(stage string) error {
	old, err := os.MkdirTemp(a.data, ".restore-old-")
	if err != nil {
		return err
	}
	j := restoreJournal{Old: filepath.Base(old), Stage: filepath.Base(stage), Existing: map[string]bool{}}
	for _, part := range restoreParts {
		_, e := os.Lstat(filepath.Join(a.data, part))
		if e != nil && !os.IsNotExist(e) {
			return e
		}
		j.Existing[part] = e == nil
	}
	if _, err = a.db.Exec("PRAGMA wal_checkpoint(TRUNCATE)"); err != nil {
		return err
	}
	if err = writeRestoreJournal(a.data, j); err != nil {
		return err
	}
	if err = a.db.Close(); err != nil {
		return err
	}
	for _, part := range restoreParts {
		if j.Existing[part] {
			err = os.Rename(filepath.Join(a.data, part), filepath.Join(old, part))
			if err != nil {
				break
			}
		}
		if _, e := os.Stat(filepath.Join(stage, part)); e == nil {
			err = os.Rename(filepath.Join(stage, part), filepath.Join(a.data, part))
			if err != nil {
				break
			}
		}
	}
	var restored *App
	if err == nil {
		// Open() recovers pending restores; open this already validated database
		// directly until the commit marker makes replacement durable.
		var db *sql.DB
		db, err = sql.Open("sqlite", filepath.ToSlash(filepath.Join(a.data, "db.sqlite3"))+"?_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)")
		if err == nil {
			db.SetMaxOpenConns(1)
			restored = &App{db: db, data: a.data, dist: a.dist}
			err = restored.initialize()
			if err != nil {
				db.Close()
			}
		}
	}
	if err == nil {
		j.Committed = true
		err = writeRestoreJournal(a.data, j)
		if err != nil {
			restored.Close()
		}
	}
	if err != nil {
		if recoveryErr := recoverRestore(a.data); recoveryErr != nil {
			return errors.Join(err, recoveryErr)
		}
		original, openErr := Open(a.data, a.dist, a.secure)
		if openErr != nil {
			return errors.Join(err, openErr)
		}
		a.db = original.db
		return err
	}
	a.db = restored.db
	// Cleanup failure does not undo a committed restore. Startup retries cleanup.
	_ = recoverRestore(a.data)
	return nil
}
func recoverRestore(data string) error {
	path := filepath.Join(data, ".restore-journal.json")
	bytes, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	var j restoreJournal
	if err = json.Unmarshal(bytes, &j); err != nil {
		return err
	}
	if filepath.Base(j.Old) != j.Old || !strings.HasPrefix(j.Old, ".restore-old-") || filepath.Base(j.Stage) != j.Stage || !strings.HasPrefix(j.Stage, ".restore-stage-") {
		return errors.New("invalid restore journal")
	}
	for _, part := range restoreParts {
		if _, ok := j.Existing[part]; !ok {
			return errors.New("incomplete restore journal")
		}
	}
	if !j.Existing["db.sqlite3"] {
		return errors.New("restore journal has no original database")
	}
	old := filepath.Join(data, j.Old)
	if !j.Committed {
		for _, part := range restoreParts {
			saved := filepath.Join(old, part)
			target := filepath.Join(data, part)
			_, e := os.Lstat(saved)
			if e != nil && !os.IsNotExist(e) {
				return e
			}
			if e == nil || !j.Existing[part] {
				if err = os.RemoveAll(target); err != nil {
					return err
				}
				if part == "db.sqlite3" {
					for _, suffix := range []string{"-wal", "-shm"} {
						if e := os.Remove(target + suffix); e != nil && !os.IsNotExist(e) {
							return e
						}
					}
				}
				if j.Existing[part] {
					if err = os.Rename(saved, target); err != nil {
						return err
					}
				}
			}
		}
	}
	if err = os.RemoveAll(old); err != nil {
		return err
	}
	if err = os.RemoveAll(filepath.Join(data, j.Stage)); err != nil {
		return err
	}
	return os.Remove(path)
}
