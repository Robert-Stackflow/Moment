package moment

import (
	"database/sql"
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// Discovery is kept outside the legacy tables. Omission by an older client
// preserves existing preferences; an explicit object replaces them atomically.
type Discovery struct {
	Latitude  *float64 `json:"latitude"`
	Longitude *float64 `json:"longitude"`
	Precision string   `json:"precision"`
	Timeline  string   `json:"timeline"`
}

func validateDiscovery(d *Discovery, image bool) error {
	if d == nil {
		return nil
	}
	if d.Precision != "private" && d.Precision != "approximate" && d.Precision != "exact" && !(image && d.Precision == "inherit") {
		return fmt.Errorf("位置公开方式无效")
	}
	if d.Timeline != "show" && d.Timeline != "hide" && !(image && d.Timeline == "inherit") {
		return fmt.Errorf("时间线显示方式无效")
	}
	if (d.Latitude == nil) != (d.Longitude == nil) {
		return fmt.Errorf("请同时填写经纬度，或同时清空")
	}
	if d.Latitude != nil && (math.IsNaN(*d.Latitude) || math.IsInf(*d.Latitude, 0) || math.Abs(*d.Latitude) > 90 || math.IsNaN(*d.Longitude) || math.IsInf(*d.Longitude, 0) || math.Abs(*d.Longitude) > 180) {
		return fmt.Errorf("纬度须在 -90 到 90，经度须在 -180 到 180 之间")
	}
	return nil
}
func saveDiscovery(tx *sql.Tx, id int64, d *Discovery, image bool) error {
	if d == nil {
		return nil
	}
	table, key := "moment_post_discovery", "post_id"
	if image {
		table, key = "moment_image_discovery", "image_id"
	}
	_, err := tx.Exec("INSERT INTO "+table+"("+key+",latitude,longitude,precision,timeline) VALUES(?,?,?,?,?) ON CONFLICT("+key+") DO UPDATE SET latitude=excluded.latitude,longitude=excluded.longitude,precision=excluded.precision,timeline=excluded.timeline", id, d.Latitude, d.Longitude, d.Precision, d.Timeline)
	return err
}
func (a *App) attachDiscovery(blogs []Object, args []any) error {
	rows, err := query(a.db, "SELECT * FROM moment_post_discovery WHERE post_id IN ("+placeholders(len(args))+")", args...)
	if err != nil {
		return err
	}
	posts := map[int64]Object{}
	for _, row := range rows {
		posts[integer(row["post_id"])] = row
		delete(row, "post_id")
	}
	rows, err = query(a.db, "SELECT d.* FROM moment_image_discovery d JOIN blog_image i ON i.id=d.image_id WHERE i.blog_id IN ("+placeholders(len(args))+")", args...)
	if err != nil {
		return err
	}
	images := map[int64]Object{}
	for _, row := range rows {
		images[integer(row["image_id"])] = row
		delete(row, "image_id")
	}
	for _, b := range blogs {
		d := posts[integer(b["id"])]
		if d == nil {
			d = Object{"latitude": nil, "longitude": nil, "precision": "private", "timeline": "show"}
		}
		b["discovery"] = d
		for _, i := range b["images"].([]Object) {
			d := images[integer(i["id"])]
			if d == nil {
				d = Object{"latitude": nil, "longitude": nil, "precision": "inherit", "timeline": "inherit"}
			}
			i["discovery"] = d
		}
	}
	return nil
}

// Reduce precision before filtering, aggregation or pagination. No public API
// selects the private coordinates or the editable Discovery object.
func discoveryCTE() string {
	return `WITH source AS (
 SELECT i.id AS photo_id,b.id AS post_id,i.image_url,
 COALESCE(NULLIF(i.title,''),b.title) AS title,COALESCE(NULLIF(i.location,''),b.location) AS location,
 COALESCE(NULLIF(i.time,''),NULLIF(b.time,'')) AS captured,
 COALESCE(f.focus_x,50) AS focus_x,COALESCE(f.focus_y,50) AS focus_y,
 CASE WHEN COALESCE(d.precision,'inherit')='inherit' THEN COALESCE(p.precision,'private') ELSE d.precision END AS precision,
 CASE WHEN COALESCE(d.precision,'inherit')='inherit' THEN p.latitude ELSE d.latitude END AS lat,
 CASE WHEN COALESCE(d.precision,'inherit')='inherit' THEN p.longitude ELSE d.longitude END AS lng,
 CASE WHEN COALESCE(d.timeline,'inherit')='inherit' THEN COALESCE(p.timeline,'show') ELSE d.timeline END AS timeline
 FROM blog_image i JOIN blog b ON b.id=i.blog_id
 LEFT JOIN moment_post_discovery p ON p.post_id=b.id
 LEFT JOIN moment_image_discovery d ON d.image_id=i.id
 LEFT JOIN moment_image_focus f ON f.image_id=i.id
 WHERE b.is_hidden=0 AND i.is_hidden=0 AND ` + activePost("b") + `
 ), photos AS (
 SELECT photo_id,post_id,image_url,title,location,focus_x,focus_y,precision,timeline,
 CASE WHEN date(captured) IS NOT NULL THEN substr(replace(captured,'T',' '),1,19) END AS time,
 CASE precision WHEN 'exact' THEN lat WHEN 'approximate' THEN round(lat,1) END AS latitude,
 CASE precision WHEN 'exact' THEN lng WHEN 'approximate' THEN round(lng,1) END AS longitude
 FROM source)
 `
}
func (a *App) discoveryEnabled(c *gin.Context, view string) bool {
	if view != "map" && view != "timeline" {
		fail(c, 400, "浏览方式无效")
		return false
	}
	s, err := a.readSettings()
	if err != nil {
		databaseError(c, err)
		return false
	}
	if object(s["content"])[view+"_enabled"] == false {
		fail(c, 404, "此浏览入口已关闭")
		return false
	}
	return true
}
func discoveryFilter(c *gin.Context, view string) (string, []any, bool) {
	conditions := []string{"timeline='show'"}
	args := []any{}
	if view == "map" {
		conditions = []string{"latitude IS NOT NULL AND longitude IS NOT NULL"}
	}
	if year := c.Query("year"); year != "" {
		if year == "unknown" {
			conditions = append(conditions, "time IS NULL")
		} else {
			n, err := strconv.Atoi(year)
			if err != nil || n < 1 || n > 9999 || len(year) != 4 {
				fail(c, 400, "年份无效")
				return "", nil, false
			}
			conditions = append(conditions, "substr(time,1,4)=?")
			args = append(args, year)
		}
	}
	if bounds := c.Query("bounds"); bounds != "" && view == "map" {
		parts := strings.Split(bounds, ",")
		if len(parts) != 4 {
			fail(c, 400, "地图范围无效")
			return "", nil, false
		}
		v := make([]float64, 4)
		for i, s := range parts {
			n, err := strconv.ParseFloat(s, 64)
			if err != nil || math.IsNaN(n) || math.IsInf(n, 0) || math.Abs(n) > 180 || i%2 == 1 && math.Abs(n) > 90 {
				fail(c, 400, "地图范围无效")
				return "", nil, false
			}
			v[i] = n
		}
		if v[1] > v[3] {
			fail(c, 400, "地图范围无效")
			return "", nil, false
		}
		conditions = append(conditions, "latitude BETWEEN ? AND ?")
		args = append(args, v[1], v[3])
		if v[0] <= v[2] {
			conditions = append(conditions, "longitude BETWEEN ? AND ?")
		} else {
			conditions = append(conditions, "(longitude>=? OR longitude<=?)")
		}
		args = append(args, v[0], v[2])
	}
	return strings.Join(conditions, " AND "), args, true
}
func (a *App) discoveryPhotos(c *gin.Context) {
	view := c.DefaultQuery("view", "timeline")
	if !a.discoveryEnabled(c, view) {
		return
	}
	page, size, valid := pageParams(c)
	if !valid {
		return
	}
	where, args, valid := discoveryFilter(c, view)
	if !valid {
		return
	}
	var count int
	if err := a.db.QueryRow(discoveryCTE()+"SELECT COUNT(*) FROM photos WHERE "+where, args...).Scan(&count); err != nil {
		databaseError(c, err)
		return
	}
	rows, err := query(a.db, discoveryCTE()+"SELECT photo_id,post_id,title,location,time,image_url,focus_x,focus_y FROM photos WHERE "+where+" ORDER BY time DESC,photo_id DESC LIMIT ? OFFSET ?", append(args, size, (page-1)*size)...)
	if err != nil {
		databaseError(c, err)
		return
	}
	ok(c, Object{"photos": rows, "total": count, "page": page})
}
func (a *App) discoveryYears(c *gin.Context) {
	view := c.DefaultQuery("view", "timeline")
	if !a.discoveryEnabled(c, view) {
		return
	}
	where := "timeline='show'"
	if view == "map" {
		where = "latitude IS NOT NULL AND longitude IS NOT NULL"
	}
	rows, err := query(a.db, discoveryCTE()+"SELECT COALESCE(substr(time,1,4),'unknown') AS year,COUNT(*) AS count FROM photos WHERE "+where+" GROUP BY year ORDER BY (year='unknown'),year DESC")
	if err != nil {
		databaseError(c, err)
		return
	}
	ok(c, rows)
}
func (a *App) discoveryPoints(c *gin.Context) {
	if !a.discoveryEnabled(c, "map") {
		return
	}
	where, args, valid := discoveryFilter(c, "map")
	if !valid {
		return
	}
	zoom, err := strconv.Atoi(c.DefaultQuery("zoom", "2"))
	if err != nil || zoom < 1 || zoom > 18 {
		fail(c, 400, "地图缩放级别无效")
		return
	}
	// A global grid is stable while panning; at most 2,000 clusters per response.
	cell := 360 / math.Pow(2, float64(zoom+2))
	rows, err := query(a.db, discoveryCTE()+`SELECT COUNT(*) AS count,AVG(latitude) AS latitude,AVG(longitude) AS longitude,MIN(latitude) AS south,MAX(latitude) AS north,MIN(longitude) AS west,MAX(longitude) AS east FROM photos WHERE `+where+` GROUP BY CAST((longitude+180)/? AS INTEGER),CAST((latitude+90)/? AS INTEGER) ORDER BY COUNT(*) DESC,MIN(photo_id) LIMIT 2001`, append(args, cell, cell)...)
	if err != nil {
		databaseError(c, err)
		return
	}
	truncated := len(rows) > 2000
	if truncated {
		rows = rows[:2000]
	}
	ok(c, Object{"points": rows, "truncated": truncated})
}
