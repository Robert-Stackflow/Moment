package moment

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

func (a *App) Router() http.Handler {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	_ = r.SetTrustedProxies(nil)
	r.Use(gin.Recovery())
	r.Use(a.dataGate)
	r.Use(func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("X-Frame-Options", "SAMEORIGIN")
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.Header("Cache-Control", "no-store")
		}
		c.Next()
	})
	r.GET("/healthz", func(c *gin.Context) {
		if err := a.db.PingContext(c.Request.Context()); err != nil {
			fail(c, 503, "数据库不可用")
			return
		}
		ok(c, Object{"status": "ok"})
	})
	admin := r.Group("/api/admin", sameOrigin)
	admin.GET("/setup", a.setupStatus)
	admin.POST("/setup", a.setup)
	admin.POST("/login", a.login)
	admin.GET("/passkeys/config", a.passkeyStatus)
	admin.POST("/passkeys/login/begin", a.beginPasskeyLogin)
	admin.POST("/passkeys/login/finish", a.finishPasskeyLogin)
	admin.Use(a.authenticate)
	admin.POST("/logout", a.logout)
	admin.GET("/me", func(c *gin.Context) { ok(c, c.MustGet("user")) })
	admin.PATCH("/me", a.profile)
	admin.POST("/me/avatar", a.uploadAvatar)
	admin.POST("/me/password", a.password)
	admin.PUT("/passkeys/config", a.configurePasskeys)
	admin.GET("/me/passkeys", a.listPasskeys)
	admin.POST("/me/passkeys/begin", a.beginPasskeyRegistration)
	admin.POST("/me/passkeys/finish", a.finishPasskeyRegistration)
	admin.PATCH("/me/passkeys/:id", a.renamePasskey)
	admin.DELETE("/me/passkeys/:id", a.deletePasskey)
	admin.GET("/stats", a.stats)
	admin.GET("/photo-tags", a.photoTagOptions)
	admin.GET("/photo-tags/photos", a.tagPhotos)
	admin.POST("/photo-tags/preview", a.tagPhotoPreview)
	admin.POST("/photo-tags/apply", a.applyPhotoTags)
	admin.POST("/duplicates/scans", a.createDuplicateScan)
	admin.GET("/duplicates/scans/:scan", a.getDuplicateScan)
	admin.POST("/duplicates/scans/:scan/step", a.stepDuplicateScan)
	admin.POST("/duplicates/scans/:scan/cancel", a.cancelDuplicateScan)
	admin.GET("/duplicates/scans/:scan/groups", a.duplicateGroups)
	admin.GET("/duplicates/scans/:scan/issues", a.duplicateScanIssues)
	admin.GET("/duplicates/scans/:scan/groups/:id", a.duplicateGroup)
	admin.PUT("/duplicates/scans/:scan/groups/:id/ignore", a.ignoreDuplicateGroup)
	admin.POST("/duplicates/scans/:scan/groups/:id/hide", a.hideDuplicatePhotos)
	admin.GET("/photo-actions", a.photoActions)
	admin.POST("/photo-actions/:action/undo", a.undoPhotoAction)
	admin.GET("/locations", a.locations)
	admin.GET("/posts", a.listPosts)
	admin.GET("/posts/:id", a.getPost)
	admin.POST("/posts", a.savePost)
	admin.POST("/posts/batch", a.batchPosts)
	admin.GET("/trash", a.listTrash)
	admin.POST("/trash/batch", a.changeTrash)
	admin.PUT("/posts/:id", a.savePost)
	admin.DELETE("/posts/:id", a.deletePost)
	admin.GET("/posts/:id/draft", a.postDraft)
	admin.GET("/drafts", a.listDrafts)
	admin.GET("/drafts/:key", a.getDraft)
	admin.PUT("/drafts/:key", a.saveDraft)
	admin.DELETE("/drafts/:key", a.deleteDraft)
	admin.POST("/drafts/:key/publish", a.publishDraft)
	admin.GET("/schedules", a.listSchedules)
	admin.PUT("/drafts/:key/schedule", a.saveSchedule)
	admin.DELETE("/drafts/:key/schedule", a.cancelSchedule)
	admin.GET("/categories", a.listCategories)
	admin.POST("/categories", a.saveCategory)
	admin.PUT("/categories/:id", a.saveCategory)
	admin.DELETE("/categories/:id", a.deleteCategory)
	admin.GET("/settings", a.settings)
	admin.PATCH("/settings/:section", a.saveSettings)
	admin.POST("/uploads", a.upload)
	admin.GET("/backups", a.listBackups)
	admin.POST("/backups", a.createBackup)
	admin.POST("/backups/import", a.importBackup)
	admin.GET("/backups/:key/download", a.downloadBackup)
	admin.POST("/backups/:key/restore", a.restoreBackup)
	admin.DELETE("/backups/:key", a.deleteBackup)
	admin.GET("/shares", a.listShares)
	admin.POST("/shares", a.saveShare)
	admin.GET("/shares/:id", a.getShare)
	admin.PUT("/shares/:id", a.saveShare)
	admin.POST("/shares/:id/action", a.changeShare)
	shares := r.Group("/api/shares/:token", sameOrigin)
	shares.GET("", a.sharedAlbum)
	shares.POST("/unlock", a.unlockShare)
	shares.POST("/lock", a.lockShare)
	shares.GET("/photos/:photo/:size", a.sharedPhoto)
	shares.HEAD("/photos/:photo/:size", a.sharedPhoto)
	visitor := r.Group("/api/v1/visitor")
	visitor.GET("/explore/photos", a.discoveryPhotos)
	visitor.GET("/explore/points", a.discoveryPoints)
	visitor.GET("/explore/years", a.discoveryYears)
	visitor.GET("/blog/list", a.visitorPosts)
	visitor.GET("/blog/:id", a.visitorPost)
	visitor.GET("/category/list", a.listCategories)
	visitor.GET("/category/get/alias", a.categoryByAlias)
	visitor.GET("/order/list", func(c *gin.Context) {
		encoded := []string{}
		for _, item := range orderOptions {
			b, _ := json.Marshal(item)
			encoded = append(encoded, string(b))
		}
		ok(c, encoded)
	})
	for _, section := range []string{"general", "meta", "content"} {
		section := section
		visitor.GET("/settings/"+section, func(c *gin.Context) {
			settings, err := a.readSettings()
			if err != nil {
				databaseError(c, err)
				return
			}
			ok(c, settings[section])
		})
	}
	r.Static("/assets", filepath.Join(a.dist, "assets"))
	r.Static("/admin/assets", filepath.Join(a.dist, "admin", "assets"))
	r.Static("/admin/tag-model", filepath.Join(a.dist, "admin", "tag-model"))
	r.Static("/uploads", filepath.Join(a.data, "uploads"))
	r.GET("/thumbnails/:size/*file", a.thumbnail)
	r.HEAD("/thumbnails/:size/*file", a.thumbnail)
	r.Static("/avatars", filepath.Join(a.data, "avatars"))
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if c.Request.Method != "GET" || strings.HasPrefix(path, "/api/") {
			fail(c, 404, "接口不存在")
			return
		}
		entry := filepath.Join(a.dist, "index.html")
		if path == "/admin" || strings.HasPrefix(path, "/admin/") {
			if filepath.Ext(path) != "" {
				fail(c, 404, "文件不存在")
				return
			}
			entry = filepath.Join(a.dist, "admin", "index.html")
		} else if path != "/" && path != "/map" && path != "/timeline" && !strings.HasPrefix(path, "/category/") && !strings.HasPrefix(path, "/location/") && !strings.HasPrefix(path, "/post/") && !strings.HasPrefix(path, "/share/") {
			fail(c, 404, "页面不存在")
			return
		}
		if _, err := os.Stat(entry); err != nil {
			fail(c, 503, "请先构建前端")
			return
		}
		c.Header("Cache-Control", "no-cache")
		if strings.HasPrefix(path, "/share/") {
			c.Header("Cache-Control", "no-store")
			c.Header("Referrer-Policy", "no-referrer")
			c.Header("X-Robots-Tag", "noindex, nofollow, noarchive")
		}
		c.File(entry)
	})
	return r
}
func ok(c *gin.Context, data any) { c.JSON(200, Object{"code": 200, "msg": "OK", "data": data}) }
func fail(c *gin.Context, status int, message string) {
	c.JSON(status, Object{"code": status, "msg": message, "data": nil})
}
func databaseError(c *gin.Context, err error) {
	log.Printf("database operation failed: %s", err.Error())
	fail(c, 500, "操作失败，请稍后重试")
}
func bind(c *gin.Context, target any) bool {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 2<<20)
	if err := c.ShouldBindJSON(target); err != nil {
		fail(c, 400, "请求格式无效")
		return false
	}
	return true
}
func routeID(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id < 1 {
		fail(c, 400, "ID 无效")
		return 0, false
	}
	return id, true
}
func pageParams(c *gin.Context) (int, int, bool) {
	page, size := 1, 20
	var err error
	if v := c.Query("page"); v != "" {
		page, err = strconv.Atoi(v)
		if err != nil {
			fail(c, 400, "分页参数无效")
			return 0, 0, false
		}
	}
	if v := c.Query("page_size"); v != "" {
		size, err = strconv.Atoi(v)
		if err != nil {
			fail(c, 400, "分页参数无效")
			return 0, 0, false
		}
	}
	if page < 1 || page > 100000 || size < 1 || size > 100 {
		fail(c, 400, "分页范围无效")
		return 0, 0, false
	}
	return page, size, true
}
