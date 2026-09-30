package moment

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"math/bits"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func duplicateScan(q querier, user int64, id string) (Object, error) {
	where, args := "id=? AND user_id=?", []any{id, user}
	if id == "latest" {
		where, args = "user_id=? ORDER BY rowid DESC LIMIT 1", []any{user}
	}
	rows, err := query(q, "SELECT id,remote,status,total,done,message,created_at,updated_at FROM moment_duplicate_scans WHERE "+where, args...)
	if err != nil || len(rows) == 0 {
		return nil, err
	}
	rows[0]["remote"] = integer(rows[0]["remote"]) != 0
	return rows[0], nil
}
func (a *App) getDuplicateScan(c *gin.Context) {
	scan, err := duplicateScan(a.db, draftUser(c), c.Param("scan"))
	if err != nil {
		databaseError(c, err)
		return
	}
	if scan == nil && c.Param("scan") != "latest" {
		fail(c, 404, "扫描记录不存在")
		return
	}
	ok(c, scan)
}
func (a *App) createDuplicateScan(c *gin.Context) {
	var in struct {
		Remote bool `json:"remote"`
	}
	if !bind(c, &in) {
		return
	}
	tx, err := a.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		databaseError(c, err)
		return
	}
	defer tx.Rollback()
	if _, err = tx.Exec("UPDATE moment_duplicate_scans SET lease_until=lease_until WHERE user_id=?", draftUser(c)); err != nil {
		databaseError(c, err)
		return
	}
	var pending int
	if err = tx.QueryRow("SELECT COUNT(*) FROM moment_duplicate_scans WHERE user_id=? AND status='scanning'", draftUser(c)).Scan(&pending); err != nil {
		databaseError(c, err)
		return
	}
	if pending > 0 {
		fail(c, 409, "上次扫描尚未完成，请继续或取消后再开始")
		return
	}
	id, err := randomBackupKey()
	if err != nil {
		databaseError(c, err)
		return
	}
	if _, err = tx.Exec("INSERT INTO moment_duplicate_scans(id,user_id,remote,created_at,updated_at) VALUES(?,?,?,?,?)", id, draftUser(c), in.Remote, now(), now()); err == nil {
		_, err = tx.Exec("INSERT INTO moment_duplicate_items(scan_id,image_id,post_id,image_url,post_title) SELECT ?,i.id,i.blog_id,i.image_url,b.title FROM blog_image i JOIN blog b ON b.id=i.blog_id WHERE "+activePost("b"), id)
	}
	if err == nil {
		_, err = tx.Exec("UPDATE moment_duplicate_scans SET total=(SELECT COUNT(*) FROM moment_duplicate_items WHERE scan_id=?) WHERE id=?", id, id)
	}
	if err == nil {
		_, err = tx.Exec("DELETE FROM moment_duplicate_scans WHERE id IN (SELECT id FROM moment_duplicate_scans WHERE user_id=? ORDER BY rowid DESC LIMIT -1 OFFSET 5)", draftUser(c))
	}
	if err == nil {
		err = tx.Commit()
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	scan, _ := duplicateScan(a.db, draftUser(c), id)
	ok(c, scan)
}
func (a *App) cancelDuplicateScan(c *gin.Context) {
	result, err := a.db.Exec("UPDATE moment_duplicate_scans SET status='cancelled',lease_token='',lease_until=0,message='扫描已取消',updated_at=? WHERE id=? AND user_id=? AND status='scanning'", now(), c.Param("scan"), draftUser(c))
	if err != nil {
		databaseError(c, err)
		return
	}
	count, _ := result.RowsAffected()
	if count == 0 {
		scan, err := duplicateScan(a.db, draftUser(c), c.Param("scan"))
		if err != nil {
			databaseError(c, err)
			return
		}
		if scan == nil {
			fail(c, 404, "扫描记录不存在")
			return
		}
	}
	a.getDuplicateScan(c)
}

// Each step reads one bounded original. The client can pause between steps;
// leases also let a reopened page resume safely after a lost request or restart.
func (a *App) stepDuplicateScan(c *gin.Context) {
	if !a.analysisMu.TryLock() {
		fail(c, 409, "有图片正在分析，请稍后继续")
		return
	}
	defer a.analysisMu.Unlock()
	scan, err := duplicateScan(a.db, draftUser(c), c.Param("scan"))
	if err != nil {
		databaseError(c, err)
		return
	}
	if scan == nil {
		fail(c, 404, "扫描记录不存在")
		return
	}
	if text(scan["status"]) != "scanning" {
		ok(c, scan)
		return
	}
	id := text(scan["id"])
	token, err := randomBackupKey()
	if err != nil {
		databaseError(c, err)
		return
	}
	result, err := a.db.Exec("UPDATE moment_duplicate_scans SET lease_token=?,lease_until=? WHERE id=? AND user_id=? AND status='scanning' AND lease_until<=?", token, time.Now().Add(time.Minute).Unix(), id, draftUser(c), time.Now().Unix())
	if err != nil {
		databaseError(c, err)
		return
	}
	count, _ := result.RowsAffected()
	if count != 1 {
		fail(c, 409, "扫描正在另一个窗口进行，请稍后继续")
		return
	}
	defer func() {
		_, _ = a.db.Exec("UPDATE moment_duplicate_scans SET lease_token='',lease_until=0 WHERE id=? AND lease_token=?", id, token)
	}()
	ctx, cancel := context.WithTimeout(c.Request.Context(), 25*time.Second)
	defer cancel()
	rows, err := query(a.db, "SELECT image_id,image_url FROM moment_duplicate_items WHERE scan_id=? AND done=0 ORDER BY image_id LIMIT 1", id)
	if err != nil {
		databaseError(c, err)
		return
	}
	if len(rows) == 0 {
		if err = a.matchDuplicates(ctx, id, token); err != nil {
			if ctx.Err() == nil {
				databaseError(c, err)
			}
			return
		}
	} else {
		row := rows[0]
		raw := text(row["image_url"])
		var fingerprint string
		// Identical URLs only require one read during this scan.
		if a.db.QueryRowContext(ctx, "SELECT fingerprint FROM moment_duplicate_items WHERE scan_id=? AND image_url=? AND done=1 LIMIT 1", id, raw).Scan(&fingerprint) != nil {
			value := a.fingerprintPhoto(ctx, raw, scan["remote"] == true)
			encoded, _ := json.Marshal(value)
			fingerprint = string(encoded)
		}
		if ctx.Err() != nil {
			return
		}
		tx, e := a.db.BeginTx(ctx, nil)
		if e != nil {
			databaseError(c, e)
			return
		}
		defer tx.Rollback()
		result, e = tx.Exec("UPDATE moment_duplicate_scans SET done=done+1,updated_at=? WHERE id=? AND lease_token=? AND status='scanning'", now(), id, token)
		if e == nil {
			count, _ = result.RowsAffected()
			if count != 1 {
				fail(c, 409, "扫描状态已变化，请刷新")
				return
			}
			_, e = tx.Exec("UPDATE moment_duplicate_items SET done=1,fingerprint=? WHERE scan_id=? AND image_id=? AND done=0", fingerprint, id, row["image_id"])
		}
		if e == nil {
			e = tx.Commit()
		}
		if e != nil {
			databaseError(c, e)
			return
		}
	}
	scan, err = duplicateScan(a.db, draftUser(c), id)
	if err != nil {
		databaseError(c, err)
		return
	}
	ok(c, scan)
}

type duplicateImage struct {
	ID          int64
	URL         string
	Fingerprint photoFingerprint
}
type duplicateCluster struct {
	Kind      string
	Images    []duplicateImage
	Distances map[int64]int
}
type fingerprintNode struct {
	Hash     uint64
	Clusters []int
	Children map[int]*fingerprintNode
}

func (n *fingerprintNode) add(hash uint64, index int) {
	for {
		distance := bits.OnesCount64(n.Hash ^ hash)
		if distance == 0 {
			n.Clusters = append(n.Clusters, index)
			return
		}
		child := n.Children[distance]
		if child == nil {
			n.Children[distance] = &fingerprintNode{hash, []int{index}, map[int]*fingerprintNode{}}
			return
		}
		n = child
	}
}
func (n *fingerprintNode) search(hash uint64, radius int) []int {
	found := []int{}
	stack := []*fingerprintNode{n}
	for len(stack) > 0 {
		node := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		distance := bits.OnesCount64(node.Hash ^ hash)
		if distance <= radius {
			found = append(found, node.Clusters...)
		}
		for d, child := range node.Children {
			if d >= distance-radius && d <= distance+radius {
				stack = append(stack, child)
			}
		}
	}
	sort.Ints(found)
	return found
}
func visualDistance(a, b photoFingerprint) (int, bool) {
	if a.Hash == "" || b.Hash == "" || a.Height < 1 || b.Height < 1 {
		return 0, false
	}
	ratioA, ratioB := float64(a.Width)/float64(a.Height), float64(b.Width)/float64(b.Height)
	if math.Abs(math.Log(ratioA/ratioB)) > .08 {
		return 0, false
	}
	for i := range a.Color {
		if math.Abs(float64(a.Color[i]-b.Color[i])) > 28 {
			return 0, false
		}
	}
	left, e1 := strconv.ParseUint(a.Hash, 16, 64)
	right, e2 := strconv.ParseUint(b.Hash, 16, 64)
	distance := bits.OnesCount64(left ^ right)
	return distance, e1 == nil && e2 == nil && distance <= 7
}
func clusterDuplicates(ctx context.Context, images []duplicateImage) ([]duplicateCluster, error) {
	// Exact-content/link components first, then compare each candidate to a fixed
	// representative. Similarity is never chained from A to B to unrelated C.
	parents := make([]int, len(images))
	for i := range parents {
		parents[i] = i
	}
	var root func(int) int
	root = func(i int) int {
		for parents[i] != i {
			parents[i] = parents[parents[i]]
			i = parents[i]
		}
		return i
	}
	urls, hashes := map[string]int{}, map[string]int{}
	for i, img := range images {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		for key, lookup := range map[string]map[string]int{img.URL: urls, "sha:" + img.Fingerprint.SHA: hashes} {
			if key == "" || key == "sha:" {
				continue
			}
			if previous, exists := lookup[key]; exists {
				parents[root(i)] = root(previous)
			} else {
				lookup[key] = i
			}
		}
	}
	units := map[int][]duplicateImage{}
	for i, img := range images {
		units[root(i)] = append(units[root(i)], img)
	}
	sorted := make([][]duplicateImage, 0, len(units))
	for _, items := range units {
		sort.Slice(items, func(i, j int) bool {
			pi, pj := items[i].Fingerprint, items[j].Fingerprint
			if pi.Width*pi.Height != pj.Width*pj.Height {
				return pi.Width*pi.Height > pj.Width*pj.Height
			}
			return items[i].ID < items[j].ID
		})
		sorted = append(sorted, items)
	}
	sort.Slice(sorted, func(i, j int) bool {
		a, b := sorted[i][0], sorted[j][0]
		sa, sb := a.Fingerprint.Width*a.Fingerprint.Height, b.Fingerprint.Width*b.Fingerprint.Height
		if sa != sb {
			return sa > sb
		}
		return a.ID < b.ID
	})
	clusters := []duplicateCluster{}
	groups := []duplicateCluster{}
	unitCount := map[int]int{}
	var tree *fingerprintNode
	for _, unit := range sorted {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		anchor := unit[0]
		if len(unit) > 1 {
			kind := "link"
			if anchor.Fingerprint.SHA != "" {
				kind = "file"
			}
			groups = append(groups, duplicateCluster{Kind: kind, Images: unit, Distances: map[int64]int{}})
		}
		target := -1
		distance := 0
		hash, hashErr := strconv.ParseUint(anchor.Fingerprint.Hash, 16, 64)
		if hashErr == nil && tree != nil {
			for _, candidate := range tree.search(hash, 7) {
				if d, matches := visualDistance(anchor.Fingerprint, clusters[candidate].Images[0].Fingerprint); matches {
					target, distance = candidate, d
					break
				}
			}
		}
		if target < 0 {
			target = len(clusters)
			clusters = append(clusters, duplicateCluster{Images: []duplicateImage{}, Distances: map[int64]int{}})
			if hashErr == nil {
				if tree == nil {
					tree = &fingerprintNode{hash, []int{target}, map[int]*fingerprintNode{}}
				} else {
					tree.add(hash, target)
				}
			}
		}
		for _, img := range unit {
			clusters[target].Images = append(clusters[target].Images, img)
			clusters[target].Distances[img.ID] = distance
		}
		unitCount[target]++
	}
	for index, group := range clusters {
		if unitCount[index] < 2 {
			continue
		}
		group.Kind = "similar"
		groups = append(groups, group)
	}
	return groups, nil
}
func (a *App) matchDuplicates(ctx context.Context, id, token string) error {
	rows, err := query(a.db, "SELECT image_id,image_url,fingerprint FROM moment_duplicate_items WHERE scan_id=? ORDER BY image_id", id)
	if err != nil {
		return err
	}
	images := make([]duplicateImage, 0, len(rows))
	for _, row := range rows {
		var f photoFingerprint
		if err = json.Unmarshal([]byte(text(row["fingerprint"])), &f); err != nil {
			return err
		}
		images = append(images, duplicateImage{integer(row["image_id"]), text(row["image_url"]), f})
	}
	groups, err := clusterDuplicates(ctx, images)
	if err != nil {
		return err
	}
	tx, err := a.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	result, err := tx.Exec("UPDATE moment_duplicate_scans SET status='ready',updated_at=? WHERE id=? AND lease_token=? AND status='scanning'", now(), id, token)
	if err != nil {
		return err
	}
	count, _ := result.RowsAffected()
	if count != 1 {
		return errors.New("duplicate scan changed while matching")
	}
	for index, group := range groups {
		ids := []string{}
		for _, img := range group.Images {
			ids = append(ids, fmt.Sprintf("%d:%s:%s:%s", img.ID, img.URL, img.Fingerprint.SHA, img.Fingerprint.Hash))
		}
		sort.Strings(ids)
		signature := tokenDigest(group.Kind + "\n" + strings.Join(ids, "\n"))
		groupID := index + 1
		if _, err = tx.Exec("INSERT INTO moment_duplicate_groups(scan_id,id,anchor_id,kind,signature) VALUES(?,?,?,?,?)", id, groupID, group.Images[0].ID, group.Kind, signature); err != nil {
			return err
		}
		for _, img := range group.Images {
			if _, err = tx.Exec("INSERT INTO moment_duplicate_members(scan_id,group_id,image_id,distance) VALUES(?,?,?,?)", id, groupID, img.ID, group.Distances[img.ID]); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}

func (a *App) ownDuplicateScan(c *gin.Context) bool {
	scan, err := duplicateScan(a.db, draftUser(c), c.Param("scan"))
	if err != nil {
		databaseError(c, err)
		return false
	}
	if scan == nil {
		fail(c, 404, "扫描记录不存在")
		return false
	}
	return true
}
func (a *App) duplicateGroups(c *gin.Context) {
	if !a.ownDuplicateScan(c) {
		return
	}
	page, size, valid := pageParams(c)
	if !valid {
		return
	}
	filter := c.Query("kind")
	if filter != "" && filter != "file" && filter != "link" && filter != "similar" {
		fail(c, 400, "分组类型无效")
		return
	}
	ignored := c.Query("ignored") == "true"
	where := "g.scan_id=? AND (?='' OR g.kind=?) AND (EXISTS(SELECT 1 FROM moment_duplicate_ignored d WHERE d.signature=g.signature AND d.user_id=?))=?"
	args := []any{c.Param("scan"), filter, filter, draftUser(c), ignored}
	var total int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM moment_duplicate_groups g WHERE "+where, args...).Scan(&total); err != nil {
		databaseError(c, err)
		return
	}
	rows, err := query(a.db, "SELECT g.id,g.anchor_id,g.kind,(SELECT COUNT(*) FROM moment_duplicate_members m WHERE m.scan_id=g.scan_id AND m.group_id=g.id) AS count FROM moment_duplicate_groups g WHERE "+where+" ORDER BY CASE kind WHEN 'file' THEN 0 WHEN 'link' THEN 1 ELSE 2 END,g.id LIMIT ? OFFSET ?", append(args, size, (page-1)*size)...)
	if err != nil {
		databaseError(c, err)
		return
	}
	for _, row := range rows {
		images, e := query(a.db, "SELECT i.image_id,i.image_url FROM moment_duplicate_members m JOIN moment_duplicate_items i ON i.scan_id=m.scan_id AND i.image_id=m.image_id WHERE m.scan_id=? AND m.group_id=? ORDER BY (i.image_id=?) DESC,i.image_id LIMIT 4", c.Param("scan"), row["id"], row["anchor_id"])
		if e != nil {
			databaseError(c, e)
			return
		}
		row["images"] = images
	}
	c.JSON(200, Object{"code": 200, "msg": "OK", "data": rows, "total": total, "page": page, "page_size": size})
}
func duplicateGroupPhotos(q querier, scan string, group int64, limit, offset int) ([]Object, error) {
	rows, err := query(q, `SELECT d.image_id,d.post_id,d.image_url,d.post_title,d.fingerprint,m.distance,i.is_hidden,COALESCE(r.revision,0) AS revision,
 CASE WHEN i.id IS NOT NULL AND i.image_url=d.image_url AND b.id IS NOT NULL AND `+activePost("b")+` THEN 1 ELSE 0 END AS current,
 b.title AS current_title,b.is_hidden AS post_hidden
 FROM moment_duplicate_members m JOIN moment_duplicate_items d ON d.scan_id=m.scan_id AND d.image_id=m.image_id
 LEFT JOIN blog_image i ON i.id=d.image_id LEFT JOIN blog b ON b.id=i.blog_id LEFT JOIN moment_post_revisions r ON r.post_id=b.id
 WHERE m.scan_id=? AND m.group_id=? ORDER BY (d.image_id=(SELECT anchor_id FROM moment_duplicate_groups WHERE scan_id=m.scan_id AND id=m.group_id)) DESC,d.image_id LIMIT ? OFFSET ?`, scan, group, limit, offset)
	for _, row := range rows {
		var fingerprint photoFingerprint
		if json.Unmarshal([]byte(text(row["fingerprint"])), &fingerprint) == nil {
			row["fingerprint"] = fingerprint
		}
		row["current"] = integer(row["current"]) != 0
		row["post_hidden"] = integer(row["post_hidden"]) != 0
	}
	return rows, err
}
func (a *App) duplicateGroup(c *gin.Context) {
	if !a.ownDuplicateScan(c) {
		return
	}
	id, valid := routeID(c)
	if !valid {
		return
	}
	page, size, valid := pageParams(c)
	if !valid {
		return
	}
	groups, err := query(a.db, "SELECT id,kind,(SELECT COUNT(*) FROM moment_duplicate_members WHERE scan_id=g.scan_id AND group_id=g.id) AS total FROM moment_duplicate_groups g WHERE scan_id=? AND id=?", c.Param("scan"), id)
	if err != nil {
		databaseError(c, err)
		return
	}
	if len(groups) != 1 {
		fail(c, 404, "分组不存在")
		return
	}
	rows, err := duplicateGroupPhotos(a.db, c.Param("scan"), id, size, (page-1)*size)
	if err != nil {
		databaseError(c, err)
		return
	}
	groups[0]["images"] = rows
	ok(c, groups[0])
}
func (a *App) ignoreDuplicateGroup(c *gin.Context) {
	if !a.ownDuplicateScan(c) {
		return
	}
	id, valid := routeID(c)
	if !valid {
		return
	}
	var in struct {
		Ignored bool `json:"ignored"`
	}
	if !bind(c, &in) {
		return
	}
	var signature string
	err := a.db.QueryRow("SELECT signature FROM moment_duplicate_groups WHERE scan_id=? AND id=?", c.Param("scan"), id).Scan(&signature)
	if errors.Is(err, sql.ErrNoRows) {
		fail(c, 404, "分组不存在")
		return
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	if in.Ignored {
		_, err = a.db.Exec("INSERT INTO moment_duplicate_ignored(user_id,signature,created_at) VALUES(?,?,?) ON CONFLICT DO NOTHING", draftUser(c), signature, now())
	} else {
		_, err = a.db.Exec("DELETE FROM moment_duplicate_ignored WHERE user_id=? AND signature=?", draftUser(c), signature)
	}
	if err != nil {
		databaseError(c, err)
		return
	}
	ok(c, nil)
}
func (a *App) duplicateScanIssues(c *gin.Context) {
	if !a.ownDuplicateScan(c) {
		return
	}
	page, size, valid := pageParams(c)
	if !valid {
		return
	}
	where := "scan_id=? AND done=1 AND COALESCE(json_extract(fingerprint,'$.reason'),'')!=''"
	var total int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM moment_duplicate_items WHERE "+where, c.Param("scan")).Scan(&total); err != nil {
		databaseError(c, err)
		return
	}
	rows, err := query(a.db, "SELECT image_id,post_id,post_title,json_extract(fingerprint,'$.reason') AS reason FROM moment_duplicate_items WHERE "+where+" ORDER BY image_id LIMIT ? OFFSET ?", c.Param("scan"), size, (page-1)*size)
	if err != nil {
		databaseError(c, err)
		return
	}
	c.JSON(200, Object{"code": 200, "msg": "OK", "data": rows, "total": total, "page": page, "page_size": size})
}
