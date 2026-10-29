import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Combobox,
  Dialog,
  IconButton,
  Input,
  Pagination,
  Segmented,
  Select,
  Table,
  Segmented as ViewSelector,
} from "@robert-stackflow/oneui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  Grid2X2,
  List,
  Pencil,
  Plus,
  Search,
  Tags,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, json, notifyError, notifySuccess } from "../api";
import {
  CategoryMultiSelect,
  CategorySelect,
} from "../components/CategoryPicker";
import { Empty, ErrorState, Loading, PageTitle } from "../components/Common";
import { useDebouncedValue } from "../hooks";
import type { Category, Post, Settings } from "../types";
import { coverPosition, orders, thumbnail } from "../types";
import {
  adminHref,
  badgeTone,
  segmentOptions,
  selectOptions,
  tone,
} from "../ui-data";
export default function Posts() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [q] = useDebouncedValue(search, 250);
  const [category, setCategory] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [order, setOrder] = useState("created_at_desc");
  const [page, setPage] = useState(1);
  const [view, setView] = useState("grid");
  const [selected, setSelected] = useState<number[]>([]);
  const [deleting, setDeleting] = useState<number[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [categoryMode, setCategoryMode] = useState("add");
  const [batchCategories, setBatchCategories] = useState<string[]>([]);
  const [failures, setFailures] = useState<
    {
      id: number;
      title: string;
      error: string;
    }[]
  >([]);
  const params = new URLSearchParams({
    page: String(page),
    page_size: "20",
    q,
    order,
  });
  if (category) params.set("category_id", category);
  if (location) params.set("location", location);
  const posts = useQuery({
    queryKey: ["posts", params.toString()],
    queryFn: () => api<Post[]>(`/posts?${params}`),
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/categories"),
  });
  const locations = useQuery({
    queryKey: ["locations"],
    queryFn: () =>
      api<
        {
          location: string;
          count: number;
        }[]
      >("/locations"),
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/settings"),
  });
  const rows = posts.data?.data || [];
  useEffect(() => {
    if (posts.data)
      setSelected((value) =>
        value.filter((id) => posts.data.data.some((post) => post.id === id)),
      );
  }, [posts.data]);
  function reset() {
    setPage(1);
    setSelected([]);
  }
  function choose(id: number, checked: boolean) {
    setSelected((value) =>
      checked ? [...value, id] : value.filter((item) => item !== id),
    );
  }
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["posts"] }),
      client.invalidateQueries({ queryKey: ["stats"] }),
      client.invalidateQueries({ queryKey: ["locations"] }),
      client.invalidateQueries({ queryKey: ["drafts"] }),
      client.invalidateQueries({ queryKey: ["post"] }),
      client.invalidateQueries({ queryKey: ["trash"] }),
    ]);
  }
  async function batch(
    action: "categories" | "visibility" | "delete",
    ids: number[],
    hidden?: boolean,
  ) {
    if (busy) return;
    setBusy(true);
    setFailures([]);
    try {
      const response = await api<
        {
          id: number;
          ok: boolean;
          error?: string;
        }[]
      >(
        "/posts/batch",
        json("POST", {
          action,
          targets: ids.map((id) => ({
            id,
            revision: rows.find((post) => post.id === id)?.revision,
          })),
          is_hidden: hidden,
          mode: categoryMode,
          category_ids: batchCategories.map(Number),
        }),
      );
      const failed = response.data
        .filter((item) => !item.ok)
        .map((item) => ({
          id: item.id,
          title:
            rows.find((post) => post.id === item.id)?.title ||
            `帖子 ${item.id}`,
          error: item.error || "操作失败",
        }));
      const count = response.data.length - failed.length;
      setFailures(failed);
      setClassifying(false);
      setDeleting(null);
      await refresh();
      setSelected(failed.map((item) => item.id));
      if (action === "delete" && count === rows.length && page > 1)
        setPage(page - 1);
      if (count)
        notifySuccess(
          `${count} 篇帖子已${
            action === "categories"
              ? "更新分类"
              : action === "delete"
                ? "移入回收站"
                : hidden
                  ? "隐藏"
                  : "公开"
          }`,
        );
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle title="帖子与图片">
        <Button href={adminHref("/posts/new")} variant="primary">
          {<Plus size={18} />}
          新建帖子
        </Button>
      </PageTitle>
      <div className="toolbar">
        <div className="toolbar-search">
          <Input
            aria-label="搜索帖子"
            placeholder="搜索标题、描述或图片标签"
            leading={<Search size={17} />}
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              reset();
            }}
          />
        </div>
        <div className="toolbar-category">
          <CategorySelect
            categories={categories.data?.data || []}
            value={category}
            onChange={(value) => {
              setCategory(value);
              reset();
            }}
          />
        </div>
        <div className="toolbar-location">
          <Combobox
            aria-label="按地点筛选"
            mode="input"
            placeholder="全部地点"
            options={[
              { value: "", label: "全部地点" },
              ...selectOptions(
                (locations.data?.data || []).map((item) => item.location),
              ),
            ]}
            onChange={(value) => {
              setLocation(value);
              reset();
            }}
            label={"按地点筛选"}
            value={location ?? ""}
          />
        </div>
        <div className="toolbar-sort">
          <Select
            aria-label="排序"
            options={selectOptions(orders)}
            onChange={(value) => {
              setOrder(value || "created_at_desc");
              reset();
            }}
            label={"排序"}
            value={order ?? ""}
          />
        </div>
        <div className="toolbar-view">
          <ViewSelector
            label="显示方式"
            value={view}
            onChange={setView}
            options={[
              {
                value: "grid",
                label: <Grid2X2 aria-label="图片网格" size={18} />,
              },
              {
                value: "list",
                label: <List aria-label="紧凑列表" size={18} />,
              },
            ]}
          />
        </div>
      </div>
      <div className={"ui-row " + "selection-bar"}>
        <Checkbox
          onChange={(checked) =>
            setSelected(checked ? rows.map((row) => row.id) : [])
          }
          label={selected.length ? `已选 ${selected.length} 项` : "选择本页"}
          checked={rows.length > 0 && selected.length === rows.length}
          indeterminate={selected.length > 0 && selected.length < rows.length}
          disabled={!rows.length || busy}
        />
        <div
          aria-hidden={!selected.length}
          className={
            "ui-row " +
            `selection-actions ${selected.length ? "is-visible" : ""}`
          }
        >
          <Button
            size="small"
            loading={busy}
            disabled={!selected.length}
            onClick={() => void batch("visibility", selected, false)}
            variant="secondary"
          >
            {<Eye size={14} />}
            公开
          </Button>
          <Button
            size="small"
            disabled={busy || !selected.length}
            onClick={() => void batch("visibility", selected, true)}
            variant="secondary"
          >
            {<EyeOff size={14} />}
            隐藏
          </Button>
          <Button
            size="small"
            disabled={
              busy ||
              !selected.length ||
              categories.isPending ||
              !!categories.error
            }
            onClick={() => {
              setClassifying(true);
              setCategoryMode("add");
              setBatchCategories([]);
            }}
            variant="secondary"
          >
            {<Tags size={14} />}
            分类
          </Button>
          <Button
            size="small"
            disabled={busy || !selected.length}
            onClick={() => setDeleting(selected)}
            variant="danger"
          >
            {<Trash2 size={14} />}
            删除
          </Button>
        </div>
      </div>
      {!!failures.length && (
        <div
          style={{
            marginBottom: 24,
          }}
        >
          <Alert
            tone={tone("orange")}
            title={`${failures.length} 篇帖子未完成操作`}
            onClose={() => setFailures([])}
          >
            <div
              className="ui-stack"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
              }}
            >
              {failures.map((item) => (
                <p
                  key={item.id}
                  className="ui-text"
                  style={{
                    fontSize: 13,
                  }}
                >
                  <Link to={`/posts/${item.id}`} className="ui-text">
                    {item.title}
                  </Link>
                  ：{item.error}
                </p>
              ))}
            </div>
            <p
              className="ui-text"
              style={{
                fontSize: 12,
                marginTop: 10,
              }}
            >
              已刷新列表，失败项目保留选择。检查最新内容后可重新操作。
            </p>
          </Alert>
        </div>
      )}
      {posts.isPending ? (
        <Loading />
      ) : posts.error ? (
        <ErrorState error={posts.error} retry={posts.refetch} />
      ) : rows.length === 0 ? (
        <Card className="moment-panel">
          <Empty
            title={
              q || category || location ? "没有匹配的帖子" : "开始记录你的时刻"
            }
            description={
              q || category || location
                ? "试试其他关键词或筛选条件。"
                : "上传照片，添加地点与文字。"
            }
          />
        </Card>
      ) : view === "grid" ? (
        <div className="post-grid view-enter">
          {rows.map((post) => (
            <Card key={post.id} className={"moment-panel " + "post-card"}>
              <div className="post-cover">
                <Checkbox
                  onChange={(checked) => choose(post.id, checked)}
                  label={`选择 ${post.title}`}
                  checked={selected.includes(post.id)}
                  disabled={busy}
                />
                <Link to={`/posts/${post.id}`}>
                  <img
                    onError={(event) => {
                      if (
                        !event.currentTarget.src.endsWith("/assets/loading.gif")
                      )
                        event.currentTarget.src = "/assets/loading.gif";
                    }}
                    className="photo-cover"
                    src={thumbnail(
                      (
                        post.images.find((photo) => !photo.is_hidden) ||
                        post.images[0]
                      )?.image_url || "",
                      settings.data?.data,
                    )}
                    alt={post.title}
                    loading="lazy"
                    style={{
                      ...{ objectPosition: coverPosition(post) },
                    }}
                  />
                </Link>
              </div>
              <div
                className="ui-stack"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: 8,
                  paddingTop: 14,
                }}
              >
                <div
                  className="ui-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "nowrap",
                    gap: 10,
                    justifyContent: "space-between",
                  }}
                >
                  <Link
                    to={`/posts/${post.id}`}
                    className="ui-text"
                    style={{
                      fontWeight: 600,
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {post.title}
                  </Link>
                  <Badge tone={badgeTone(post.is_hidden ? "gray" : "victoria")}>
                    {post.is_hidden ? "隐藏" : "公开"}
                  </Badge>
                </div>
                <p
                  className="ui-text"
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    display: "-webkit-box",
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {post.location || "未设置地点"} · {post.images.length} 张 ·{" "}
                  {post.time?.slice(0, 10) || "未设置时间"}
                </p>
                <div
                  className="ui-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                    justifyContent: "space-between",
                    marginTop: 4,
                  }}
                >
                  <div
                    className="ui-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 5,
                    }}
                  >
                    {post.categories.slice(0, 2).map((cat) => (
                      <Badge key={cat.id} tone={badgeTone("gray")}>
                        {cat.name}
                      </Badge>
                    ))}
                  </div>
                  <div
                    className="ui-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 4,
                    }}
                  >
                    <Button
                      href={adminHref(`/posts/${post.id}`)}
                      aria-label={`编辑 ${post.title}`}
                      variant="ghost"
                    >
                      <Pencil size={16} />
                    </Button>
                    <IconButton
                      label={`删除 ${post.title}`}
                      disabled={busy}
                      onClick={() => setDeleting([post.id])}
                      variant="danger"
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className={"moment-panel " + "desktop-table view-enter"}>
          <Table
            label={"\u5E16\u5B50\u5217\u8868"}
            rows={rows}
            rowKey={(post) => String(post.id)}
            columns={[
              {
                key: "column0",
                title: "\u9009\u62E9",
                render: (post) => (
                  <>
                    <Checkbox
                      onChange={(checked) => choose(post.id, checked)}
                      label={`选择 ${post.title}`}
                      checked={selected.includes(post.id)}
                      disabled={busy}
                    />
                  </>
                ),
              },
              {
                key: "column1",
                title: "\u5E16\u5B50",
                render: (post) => (
                  <>
                    <div
                      className="ui-row"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "nowrap",
                        gap: 10,
                      }}
                    >
                      <img
                        className="table-image"
                        src={thumbnail(
                          (
                            post.images.find((photo) => !photo.is_hidden) ||
                            post.images[0]
                          )?.image_url || "",
                          settings.data?.data,
                        )}
                        alt=""
                        style={{
                          ...{ objectPosition: coverPosition(post) },
                        }}
                      />
                      <div>
                        <Link
                          to={`/posts/${post.id}`}
                          className="ui-text"
                          style={{
                            fontWeight: 500,
                          }}
                        >
                          {post.title}
                        </Link>
                        <p
                          className="ui-text"
                          style={{
                            fontSize: 12,
                            color: "var(--muted)",
                          }}
                        >
                          {post.images.length} 张图片
                        </p>
                      </div>
                    </div>
                  </>
                ),
              },
              {
                key: "column2",
                title: "\u5730\u70B9",
                render: (post) => <>{post.location || "—"}</>,
              },
              {
                key: "column3",
                title: "\u62CD\u6444\u65E5\u671F",
                render: (post) => <>{post.time?.slice(0, 10) || "—"}</>,
              },
              {
                key: "column4",
                title: "\u72B6\u6001",
                render: (post) => (
                  <>
                    <Badge
                      tone={badgeTone(post.is_hidden ? "gray" : "victoria")}
                    >
                      {post.is_hidden ? "隐藏" : "公开"}
                    </Badge>
                  </>
                ),
              },
              {
                key: "column5",
                title: "\u64CD\u4F5C",
                align: "right",
                render: (post) => (
                  <>
                    <Button
                      href={adminHref(`/posts/${post.id}`)}
                      aria-label={`编辑 ${post.title}`}
                      variant="ghost"
                    >
                      <Pencil size={16} />
                    </Button>
                  </>
                ),
              },
            ]}
          />
        </Card>
      )}
      {posts.data && (posts.data.total || 0) > 20 ? (
        <div
          className="ui-row"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
            marginTop: 28,
          }}
        >
          <Pagination
            total={posts.data.total || 0}
            page={page}
            onPageChange={(value) => {
              setPage(value);
              setSelected([]);
            }}
            pageSize={20}
            summary={null}
          />
        </div>
      ) : null}
      <Dialog
        open={!!deleting}
        onClose={() => {
          if (!busy) setDeleting(null);
        }}
        title="移入回收站"
        footer={
          <>
            <Button
              disabled={busy}
              onClick={() => setDeleting(null)}
              variant="secondary"
              data-dialog-initial-focus
            >
              取消
            </Button>
            <Button
              loading={busy}
              onClick={() => deleting && void batch("delete", deleting)}
              variant="danger"
            >
              移入回收站
            </Button>
          </>
        }
        busy={!!busy}
        variant="confirm"
      >
        <div
          className="ui-stack"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <p className="ui-text">
            将这 {deleting?.length}{" "}
            篇帖子移入回收站？访客将无法再访问，图片、分类和未发布草稿会保留，可随时恢复。
          </p>
        </div>
      </Dialog>
      <Dialog
        open={classifying}
        onClose={() => !busy && setClassifying(false)}
        title={`批量分类 · ${selected.length} 篇帖子`}
        footer={
          <>
            <Button
              disabled={busy}
              onClick={() => setClassifying(false)}
              variant="secondary"
            >
              取消
            </Button>
            <Button
              loading={busy}
              disabled={categoryMode !== "replace" && !batchCategories.length}
              onClick={() => void batch("categories", selected)}
              variant="primary"
            >
              应用到 {selected.length} 篇帖子
            </Button>
          </>
        }
        busy={!!busy}
        variant="default"
      >
        <div
          className="ui-stack"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <Segmented
            aria-label="分类操作方式"
            value={categoryMode}
            onChange={setCategoryMode}
            options={segmentOptions([
              { value: "add", label: "添加" },
              { value: "replace", label: "替换" },
              { value: "remove", label: "移除" },
            ])}
            label={"分类操作方式"}
          />
          <p
            className="ui-text"
            style={{
              fontSize: 13,
              color: "var(--muted)",
            }}
          >
            {categoryMode === "add"
              ? "添加所选分类，保留原有分类。子分类会同时关联父分类。"
              : categoryMode === "replace"
                ? "将原有分类替换为所选分类。留空可清除全部分类。"
                : "移除所选分类。移除父分类时也会移除其下的子分类；只移除子分类会保留父分类。"}
          </p>
          <fieldset className="editor-fieldset" disabled={busy}>
            <CategoryMultiSelect
              categories={categories.data?.data || []}
              value={batchCategories}
              onChange={setBatchCategories}
            />
          </fieldset>
          {categoryMode === "replace" && (
            <Alert tone={tone("orange")}>
              {batchCategories.length
                ? "原有分类将被替换。"
                : "这会清除所选帖子的全部分类。"}
            </Alert>
          )}
        </div>
      </Dialog>
    </>
  );
}
