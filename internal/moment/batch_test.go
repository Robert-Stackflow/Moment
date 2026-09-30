package moment

import (
	"fmt"
	"reflect"
	"testing"
)

func TestBatchCategoriesAndFieldIsolation(t *testing.T) {
	a, h, cookie := testApp(t)
	one, img := seedPost(t, a, "Keep title", false, false)
	two, _ := seedPost(t, a, "Second", true, false)
	if _, err := a.db.Exec(`INSERT INTO category(id,name,alias,parent_id) VALUES (1,'Root','root',0),(2,'Child','child',1),(3,'Other','other',0),(4,'Sibling','sibling',1)`); err != nil {
		t.Fatal(err)
	}
	var revision int64
	apply := func(mode string, cats []int64) {
		t.Helper()
		in := batchInput{Targets: []batchTarget{{one, &revision}, {two, &revision}}, Action: "categories", Mode: mode, Categories: cats}
		w, r := call(t, h, "POST", "/api/admin/posts/batch", in, cookie)
		status(t, w, 200)
		for _, result := range r["data"].([]any) {
			if object(result)["ok"] != true {
				t.Fatalf("batch failure: %v", r)
			}
		}
		revision++
	}
	check := func(want []int64) {
		t.Helper()
		for _, id := range []int64{one, two} {
			rows, err := query(a.db, "SELECT category_id FROM blog_category WHERE blog_id=? ORDER BY category_id", id)
			if err != nil {
				t.Fatal(err)
			}
			got := []int64{}
			for _, r := range rows {
				got = append(got, integer(r["category_id"]))
			}
			if !reflect.DeepEqual(got, want) {
				t.Fatalf("categories %v, want %v", got, want)
			}
		}
	}
	apply("add", []int64{3})
	check([]int64{3})
	apply("add", []int64{2, 2})
	check([]int64{1, 2, 3})
	apply("replace", []int64{2, 4})
	check([]int64{1, 2, 4})
	apply("remove", []int64{2})
	check([]int64{1, 4})
	apply("remove", []int64{1})
	check([]int64{})
	apply("replace", []int64{})
	check([]int64{})
	var title string
	var hidden bool
	if err := a.db.QueryRow("SELECT title,is_hidden FROM blog WHERE id=?", one).Scan(&title, &hidden); err != nil || title != "Keep title" || hidden {
		t.Fatal("categories modified unrelated fields")
	}
	var image int64
	if err := a.db.QueryRow("SELECT id FROM blog_image WHERE blog_id=?", one).Scan(&image); err != nil || image != img {
		t.Fatal("categories replaced image record")
	}
	hide := true
	w, r := call(t, h, "POST", "/api/admin/posts/batch", batchInput{Targets: []batchTarget{{one, &revision}}, Action: "visibility", Hidden: &hide}, cookie)
	status(t, w, 200)
	if object(r["data"].([]any)[0])["ok"] != true {
		t.Fatal(r)
	}
	if err := a.db.QueryRow("SELECT title,is_hidden FROM blog WHERE id=?", one).Scan(&title, &hidden); err != nil || title != "Keep title" || !hidden {
		t.Fatal("visibility modified unrelated fields")
	}
}

func TestBatchPartialFailureAndValidation(t *testing.T) {
	a, h, cookie := testApp(t)
	one, _ := seedPost(t, a, "One", false, false)
	two, _ := seedPost(t, a, "Two", false, false)
	zero, stale := int64(0), int64(99)
	in := batchInput{Targets: []batchTarget{{one, &zero}, {two, &stale}, {99999, &zero}}, Action: "delete"}
	w, _ := call(t, h, "POST", "/api/admin/posts/batch", in, nil)
	status(t, w, 401)
	w, r := call(t, h, "POST", "/api/admin/posts/batch", in, cookie)
	status(t, w, 200)
	results := r["data"].([]any)
	if object(results[0])["ok"] != true || object(results[1])["ok"] != false || object(results[2])["ok"] != false {
		t.Fatal("partial failure result is inaccurate", r)
	}
	w, _ = call(t, h, "GET", fmt.Sprintf("/api/admin/posts/%d", two), nil, cookie)
	status(t, w, 200)
	in = batchInput{Targets: []batchTarget{{two, &zero}}, Action: "categories", Mode: "replace", Categories: []int64{999}}
	w, _ = call(t, h, "POST", "/api/admin/posts/batch", in, cookie)
	status(t, w, 400)
	var version int
	_ = a.db.QueryRow("SELECT COUNT(*) FROM moment_post_revisions").Scan(&version)
	if version != 0 {
		t.Fatal("invalid batch changed post version")
	}
	in.Targets = append(in.Targets, in.Targets[0])
	in.Action = "delete"
	w, _ = call(t, h, "POST", "/api/admin/posts/batch", in, cookie)
	status(t, w, 400)
	in.Targets = []batchTarget{{two, nil}}
	w, _ = call(t, h, "POST", "/api/admin/posts/batch", in, cookie)
	status(t, w, 400)
}
