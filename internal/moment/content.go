package moment

import (
	"fmt"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
)

var orderOptions = []Object{{"label": "拍摄时间降序", "value": "meta_time_desc", "order": "-time"}, {"label": "拍摄时间升序", "value": "meta_time_asc", "order": "time"}, {"label": "创建时间降序", "value": "created_at_desc", "order": "-created_at"}, {"label": "创建时间升序", "value": "created_at_asc", "order": "created_at"}, {"label": "更新时间降序", "value": "updated_at_desc", "order": "-updated_at"}, {"label": "更新时间升序", "value": "updated_at_asc", "order": "updated_at"}}
var sortSQL = map[string]string{"meta_time_desc": "b.time DESC,b.id DESC", "meta_time_asc": "b.time ASC,b.id ASC", "created_at_desc": "b.created_at DESC,b.id DESC", "created_at_asc": "b.created_at ASC,b.id ASC", "updated_at_desc": "b.updated_at DESC,b.id DESC", "updated_at_asc": "b.updated_at ASC,b.id ASC"}

type PostInput struct {
	Title      string       `json:"title"`
	Desc       string       `json:"desc"`
	Location   string       `json:"location"`
	Time       *string      `json:"time"`
	Hidden     bool         `json:"is_hidden"`
	Images     []ImageInput `json:"images"`
	Categories []int64      `json:"category_ids"`
}
type ImageInput struct {
	ID       int64    `json:"id,omitempty"`
	URL      string   `json:"image_url"`
	Title    string   `json:"title"`
	Desc     string   `json:"desc"`
	Location string   `json:"location"`
	Time     *string  `json:"time"`
	Hidden   bool     `json:"is_hidden"`
	Metadata string   `json:"metadata"`
	Order    int      `json:"order"`
	FocusX   *float64 `json:"focus_x,omitempty"`
	FocusY   *float64 `json:"focus_y,omitempty"`
}

func validURL(value string) bool {
	if strings.HasPrefix(value, "/uploads/") {
		return !strings.Contains(value, "..")
	}
	u, err := url.Parse(value)
	return err == nil && (u.Scheme == "http" || u.Scheme == "https") && u.Host != "" && u.User == nil
}
func normalizeTime(value *string) (any, error) {
	if value == nil || *value == "" {
		return nil, nil
	}
	for _, layout := range []string{time.RFC3339Nano, "2006-01-02 15:04:05.999999999", "2006-01-02T15:04:05.999999999", "2006-01-02T15:04", "2006-01-02"} {
		t, err := time.ParseInLocation(layout, *value, zone)
		if err == nil {
			return t.In(zone).Format("2006-01-02 15:04:05"), nil
		}
	}
	return nil, fmt.Errorf("时间格式无效")
}

func (a *App) listPosts(c *gin.Context)    { a.posts(c, false) }
func (a *App) visitorPosts(c *gin.Context) { a.posts(c, true) }
func (a *App) posts(c *gin.Context, public bool) {
	page, size, valid := pageParams(c)
	if !valid {
		return
	}
	conditions := []string{"1=1"}
	args := []any{}
	if public {
		conditions = append(conditions, "b.is_hidden=0 AND EXISTS (SELECT 1 FROM blog_image i WHERE i.blog_id=b.id AND i.is_hidden=0)")
	}
	if search := strings.TrimSpace(c.Query("q")); search != "" {
		conditions = append(conditions, "(b.title LIKE ? OR b.desc LIKE ?)")
		args = append(args, "%"+search+"%", "%"+search+"%")
	}
	if location := c.Query("location"); location != "" {
		visibility := ""
		if public {
			visibility = " AND i.is_hidden=0"
		}
		conditions = append(conditions, "(b.location LIKE ? OR EXISTS (SELECT 1 FROM blog_image i WHERE i.blog_id=b.id"+visibility+" AND i.location LIKE ?))")
		args = append(args, "%"+location+"%", "%"+location+"%")
	}
	if alias := c.Query("category"); alias != "" {
		conditions = append(conditions, "EXISTS (SELECT 1 FROM blog_category bc JOIN category cat ON cat.id=bc.category_id WHERE bc.blog_id=b.id AND cat.alias=?)")
		args = append(args, alias)
	}
	if id := c.Query("category_id"); id != "" {
		n, err := strconv.ParseInt(id, 10, 64)
		if err != nil || n < 1 {
			fail(c, 400, "分类无效")
			return
		}
		conditions = append(conditions, "EXISTS (SELECT 1 FROM blog_category bc WHERE bc.blog_id=b.id AND bc.category_id=?)")
		args = append(args, n)
	}
	where := strings.Join(conditions, " AND ")
	order := c.DefaultQuery("order", "created_at_desc")
	if public {
		settings, err := a.readSettings()
		if err != nil {
			databaseError(c, err)
			return
		}
		order = text(object(settings["content"])["order_option"])
		if order == "" {
			order = "meta_time_desc"
		}
	}
	ordering, found := sortSQL[order]
	if !found {
		fail(c, 400, "排序选项无效")
		return
	}
	var total int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM blog b WHERE "+where, args...).Scan(&total); err != nil {
		databaseError(c, err)
		return
	}
	selectArgs := append(append([]any{}, args...), size, (page-1)*size)
	blogs, err := query(a.db, "SELECT b.* FROM blog b WHERE "+where+" ORDER BY "+ordering+" LIMIT ? OFFSET ?", selectArgs...)
	if err != nil {
		databaseError(c, err)
		return
	}
	if err = a.attach(blogs, public); err != nil {
		databaseError(c, err)
		return
	}
	c.JSON(200, Object{"code": 200, "msg": "OK", "data": blogs, "total": total, "page": page, "page_size": size})
}
func (a *App) attach(blogs []Object, public bool) error {
	if len(blogs) == 0 {
		return nil
	}
	args := make([]any, len(blogs))
	byID := map[int64]Object{}
	for i, b := range blogs {
		args[i] = b["id"]
		b["images"] = []Object{}
		b["categories"] = []Object{}
		b["category_ids"] = []int64{}
		byID[integer(b["id"])] = b
	}
	visibility := ""
	if public {
		visibility = " AND i.is_hidden=0"
	}
	images, err := query(a.db, `SELECT i.*,COALESCE(f.focus_x,50.0) AS focus_x,COALESCE(f.focus_y,50.0) AS focus_y FROM blog_image i LEFT JOIN moment_image_focus f ON f.image_id=i.id WHERE i.blog_id IN (`+placeholders(len(args))+`)`+visibility+` ORDER BY i."order",i.id`, args...)
	if err != nil {
		return err
	}
	for _, img := range images {
		b := byID[integer(img["blog_id"])]
		b["images"] = append(b["images"].([]Object), img)
	}
	categories, err := query(a.db, "SELECT c.*,bc.blog_id FROM category c JOIN blog_category bc ON bc.category_id=c.id WHERE bc.blog_id IN ("+placeholders(len(args))+") ORDER BY c.\"order\",c.id", args...)
	if err != nil {
		return err
	}
	for _, cat := range categories {
		b := byID[integer(cat["blog_id"])]
		delete(cat, "blog_id")
		b["categories"] = append(b["categories"].([]Object), cat)
		b["category_ids"] = append(b["category_ids"].([]int64), integer(cat["id"]))
	}
	return nil
}
func (a *App) getPost(c *gin.Context) {
	a.post(c, false)
}
func (a *App) visitorPost(c *gin.Context) {
	a.post(c, true)
}
func (a *App) post(c *gin.Context, public bool) {
	id, valid := routeID(c)
	if !valid {
		return
	}
	visibility := ""
	if public {
		visibility = " AND is_hidden=0 AND EXISTS (SELECT 1 FROM blog_image WHERE blog_id=blog.id AND is_hidden=0)"
	}
	blogs, err := query(a.db, "SELECT * FROM blog WHERE id=?"+visibility, id)
	if err != nil {
		databaseError(c, err)
		return
	}
	if len(blogs) == 0 {
		fail(c, 404, "帖子不存在")
		return
	}
	if err = a.attach(blogs, public); err != nil {
		databaseError(c, err)
		return
	}
	ok(c, blogs[0])
}
func (a *App) savePost(c *gin.Context) {
	var in PostInput
	if !bind(c, &in) {
		return
	}
	in.Title = strings.TrimSpace(in.Title)
	if in.Title == "" || utf8.RuneCountInString(in.Title) > 50 || len(in.Images) == 0 || len(in.Images) > 200 || len(in.Categories) > 100 {
		fail(c, 400, "请填写不超过 50 字的标题和至少一张图片")
		return
	}
	postTime, err := normalizeTime(in.Time)
	if err != nil {
		fail(c, 400, err.Error())
		return
	}
	imageTimes := make([]any, len(in.Images))
	imageIDs := map[int64]bool{}
	for i, img := range in.Images {
		for _, focus := range []*float64{img.FocusX, img.FocusY} {
			if focus != nil && (*focus < 0 || *focus > 100) {
				fail(c, 400, "封面焦点须在 0 到 100 之间")
				return
			}
		}
		if !validURL(img.URL) || utf8.RuneCountInString(img.Title) > 50 || img.ID < 0 || img.ID > 0 && imageIDs[img.ID] {
			fail(c, 400, "图片地址、标题或 ID 无效")
			return
		}
		imageIDs[img.ID] = true
		imageTimes[i], err = normalizeTime(img.Time)
		if err != nil {
			fail(c, 400, err.Error())
			return
		}
	}
	var id int64
	if c.Param("id") != "" {
		var valid bool
		id, valid = routeID(c)
		if !valid {
			return
		}
	}
	tx, err := a.db.Begin()
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	categoryIDs := map[int64]bool{}
	for _, categoryID := range in.Categories {
		if categoryID < 1 {
			fail(c, 400, "分类无效")
			return
		}
		var parent int64
		if err := tx.QueryRow("SELECT parent_id FROM category WHERE id=?", categoryID).Scan(&parent); err != nil {
			fail(c, 400, "分类不存在")
			return
		}
		categoryIDs[categoryID] = true
		if parent != 0 {
			categoryIDs[parent] = true
		}
	}
	stamp := now()
	if id == 0 {
		result, e := tx.Exec("INSERT INTO blog(title,desc,location,time,is_hidden,created_at,updated_at,remark) VALUES (?,?,?,?,?,?,?,'{}')", in.Title, in.Desc, in.Location, postTime, in.Hidden, stamp, stamp)
		if e != nil {
			databaseError(c, e)
			return
		}
		id, _ = result.LastInsertId()
	} else {
		result, e := tx.Exec("UPDATE blog SET title=?,desc=?,location=?,time=?,is_hidden=?,updated_at=? WHERE id=?", in.Title, in.Desc, in.Location, postTime, in.Hidden, stamp, id)
		if e != nil {
			databaseError(c, e)
			return
		}
		n, _ := result.RowsAffected()
		if n == 0 {
			fail(c, 404, "帖子不存在")
			return
		}
	}
	if _, err = tx.Exec("DELETE FROM blog_category WHERE blog_id=?", id); err != nil {
		databaseError(c, err)
		return
	}
	for categoryID := range categoryIDs {
		if _, err = tx.Exec("INSERT INTO blog_category (blog_id,category_id) VALUES (?,?)", id, categoryID); err != nil {
			databaseError(c, err)
			return
		}
	}
	kept := []any{id}
	for i, img := range in.Images {
		imageID := img.ID
		if img.ID > 0 {
			result, e := tx.Exec(`UPDATE blog_image SET image_url=?,title=?,desc=?,location=?,time=?,is_hidden=?,metadata=?,"order"=?,updated_at=? WHERE id=? AND blog_id=?`, img.URL, img.Title, img.Desc, img.Location, imageTimes[i], img.Hidden, img.Metadata, i, stamp, img.ID, id)
			if e != nil {
				databaseError(c, e)
				return
			}
			n, _ := result.RowsAffected()
			if n != 1 {
				fail(c, 400, "图片不属于当前帖子")
				return
			}
			kept = append(kept, img.ID)
		} else {
			result, e := tx.Exec(`INSERT INTO blog_image(blog_id,image_url,title,desc,location,time,is_hidden,metadata,"order",created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, id, img.URL, img.Title, img.Desc, img.Location, imageTimes[i], img.Hidden, img.Metadata, i, stamp, stamp)
			if e != nil {
				databaseError(c, e)
				return
			}
			imageID, _ = result.LastInsertId()
			kept = append(kept, imageID)
		}
		// Omitted coordinates retain existing focus, including saves by older clients.
		if img.FocusX != nil || img.FocusY != nil {
			_, err = tx.Exec(`INSERT INTO moment_image_focus(image_id,focus_x,focus_y) VALUES (?,COALESCE(?,50),COALESCE(?,50)) ON CONFLICT(image_id) DO UPDATE SET focus_x=COALESCE(?,focus_x),focus_y=COALESCE(?,focus_y)`, imageID, img.FocusX, img.FocusY, img.FocusX, img.FocusY)
			if err != nil {
				databaseError(c, err)
				return
			}
		}
	}
	if _, err = tx.Exec("DELETE FROM blog_image WHERE blog_id=? AND id NOT IN ("+placeholders(len(kept)-1)+")", kept...); err != nil {
		databaseError(c, err)
		return
	}
	if err = tx.Commit(); err != nil {
		databaseError(c, err)
		return
	}
	ok(c, Object{"id": id})
}
func (a *App) deletePost(c *gin.Context) {
	id, valid := routeID(c)
	if !valid {
		return
	}
	result, err := a.db.Exec("DELETE FROM blog WHERE id=?", id)
	if err != nil {
		databaseError(c, err)
		return
	}
	count, _ := result.RowsAffected()
	if count == 0 {
		fail(c, 404, "帖子不存在")
		return
	}
	ok(c, nil)
}
func (a *App) stats(c *gin.Context) {
	rows, err := query(a.db, "SELECT (SELECT COUNT(*) FROM blog) AS blog,(SELECT COUNT(*) FROM blog_image) AS image,(SELECT COUNT(*) FROM category) AS category,(SELECT COUNT(*) FROM blog WHERE is_hidden=1) AS hidden")
	if err != nil {
		databaseError(c, err)
		return
	}
	ok(c, rows[0])
}
func (a *App) locations(c *gin.Context) {
	rows, err := query(a.db, "SELECT location,COUNT(*) AS count FROM (SELECT location FROM blog WHERE location IS NOT NULL AND location!='' UNION ALL SELECT location FROM blog_image WHERE location IS NOT NULL AND location!='') GROUP BY location ORDER BY count DESC,location")
	if err != nil {
		databaseError(c, err)
		return
	}
	ok(c, rows)
}
func (a *App) listCategories(c *gin.Context) {
	rows, err := query(a.db, `SELECT * FROM category ORDER BY "order",id`)
	if err != nil {
		databaseError(c, err)
		return
	}
	roots := []Object{}
	byID := map[int64]Object{}
	for _, cat := range rows {
		cat["children"] = []Object{}
		byID[integer(cat["id"])] = cat
	}
	for _, cat := range rows {
		if parent := byID[integer(cat["parent_id"])]; parent != nil {
			parent["children"] = append(parent["children"].([]Object), cat)
		} else {
			roots = append(roots, cat)
		}
	}
	c.JSON(200, Object{"code": 200, "msg": "OK", "data": roots, "total": len(rows)})
}
func (a *App) categoryByAlias(c *gin.Context) {
	rows, err := query(a.db, "SELECT * FROM category WHERE alias=?", c.Query("alias"))
	if err != nil {
		databaseError(c, err)
		return
	}
	if len(rows) == 0 {
		fail(c, 404, "分类不存在")
		return
	}
	ok(c, rows[0])
}

var aliasPattern = regexp.MustCompile(`^[\p{L}\p{N}_-]+$`)

func (a *App) saveCategory(c *gin.Context) {
	var in struct {
		Name   string `json:"name"`
		Alias  string `json:"alias"`
		Desc   string `json:"desc"`
		Order  int    `json:"order"`
		Parent int64  `json:"parent_id"`
	}
	if !bind(c, &in) {
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" || utf8.RuneCountInString(in.Name) > 30 || utf8.RuneCountInString(in.Alias) > 50 || !aliasPattern.MatchString(in.Alias) || in.Parent < 0 {
		fail(c, 400, "名称或别名无效，别名可使用字母、数字、下划线与连字符")
		return
	}
	var id int64
	if c.Param("id") != "" {
		var valid bool
		id, valid = routeID(c)
		if !valid {
			return
		}
	}
	tx, err := a.db.Begin()
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	var count int
	if err = tx.QueryRow("SELECT COUNT(*) FROM category WHERE id!=? AND (name=? OR alias=?)", id, in.Name, in.Alias).Scan(&count); err != nil {
		databaseError(c, err)
		return
	}
	if count > 0 {
		fail(c, 409, "名称或别名已存在")
		return
	}
	if in.Parent != 0 {
		var parent int64
		if in.Parent == id || tx.QueryRow("SELECT parent_id FROM category WHERE id=?", in.Parent).Scan(&parent) != nil || parent != 0 {
			fail(c, 400, "请选择有效的顶级分类")
			return
		}
		if id > 0 {
			if err = tx.QueryRow("SELECT COUNT(*) FROM category WHERE parent_id=?", id).Scan(&count); err != nil {
				databaseError(c, err)
				return
			}
			if count > 0 {
				fail(c, 400, "有子分类的分类不能移入其他分类")
				return
			}
		}
	}
	if id == 0 {
		result, e := tx.Exec(`INSERT INTO category(name,alias,desc,"order",parent_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`, in.Name, in.Alias, in.Desc, in.Order, in.Parent, now(), now())
		err = e
		if err == nil {
			id, _ = result.LastInsertId()
		}
	} else {
		result, e := tx.Exec(`UPDATE category SET name=?,alias=?,desc=?,"order"=?,parent_id=?,updated_at=? WHERE id=?`, in.Name, in.Alias, in.Desc, in.Order, in.Parent, now(), id)
		err = e
		if err == nil {
			n, _ := result.RowsAffected()
			if n == 0 {
				fail(c, 404, "分类不存在")
				return
			}
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
func (a *App) deleteCategory(c *gin.Context) {
	id, valid := routeID(c)
	if !valid {
		return
	}
	tx, err := a.db.Begin()
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	var count int
	if err = tx.QueryRow("SELECT COUNT(*) FROM category WHERE parent_id=?", id).Scan(&count); err != nil {
		databaseError(c, err)
		return
	}
	if count > 0 {
		fail(c, 409, "请先处理子分类")
		return
	}
	result, err := tx.Exec("DELETE FROM category WHERE id=?", id)
	if err != nil {
		databaseError(c, err)
		return
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		fail(c, 404, "分类不存在")
		return
	}
	if err = tx.Commit(); err != nil {
		databaseError(c, err)
		return
	}
	ok(c, nil)
}
