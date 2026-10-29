import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  IconButton,
  Input,
  Pagination,
} from "@robert-stackflow/oneui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArchiveRestore,
  ArrowLeft,
  ImageOff,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api, json, notifyError, notifySuccess } from "../api";
import { Empty, ErrorState, Loading, PageTitle } from "../components/Common";
import { useDebouncedValue } from "../hooks";
import type { Settings, TrashedPost } from "../types";
import { coverPosition, thumbnail } from "../types";
import { adminHref, badgeTone, tone } from "../ui-data";
export default function Trash() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [q] = useDebouncedValue(search, 250);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<TrashedPost | null>(null);
  const [purging, setPurging] = useState<TrashedPost[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [failures, setFailures] = useState<
    {
      id: number;
      title: string;
      error: string;
    }[]
  >([]);
  const trash = useQuery({
    queryKey: ["trash", page, q],
    queryFn: () =>
      api<TrashedPost[]>(
        `/trash?${new URLSearchParams({
          page: String(page),
          page_size: "20",
          q,
        })}`,
      ),
    staleTime: 0,
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/settings"),
  });
  const rows = trash.data?.data || [];
  useEffect(() => {
    if (trash.data)
      setSelected((ids) =>
        ids.filter((id) => trash.data.data.some((post) => post.id === id)),
      );
  }, [trash.data]);
  const selectedRows = rows.filter((post) => selected.includes(post.id));
  function confirmPurge(posts: TrashedPost[]) {
    setConfirmed(false);
    setPurging(posts);
  }
  async function change(action: "restore" | "purge", posts: TrashedPost[]) {
    if (busy || !posts.length) return;
    setBusy(true);
    setFailures([]);
    try {
      const result = await api<
        {
          id: number;
          ok: boolean;
          error?: string;
        }[]
      >(
        "/trash/batch",
        json("POST", {
          action,
          confirm: action === "purge" && confirmed,
          targets: posts.map(({ id, revision }) => ({ id, revision })),
        }),
      );
      const failed = result.data
        .filter((item) => !item.ok)
        .map((item) => ({
          id: item.id,
          title:
            posts.find((p) => p.id === item.id)?.title || `帖子 ${item.id}`,
          error: item.error || "操作失败",
        }));
      const done = result.data.length - failed.length;
      setFailures(failed);
      setPurging(null);
      setPreview(null);
      await Promise.all(
        [
          "trash",
          "posts",
          "post",
          "stats",
          "locations",
          "drafts",
          "postDraft",
          "draft",
        ].map((key) => client.invalidateQueries({ queryKey: [key] })),
      );
      setSelected(failed.map((item) => item.id));
      if (done === rows.length && page > 1) setPage(page - 1);
      if (done)
        notifySuccess(
          `${done} 篇帖子已${action === "restore" ? "恢复" : "永久删除"}`,
        );
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle title="回收站">
        <Button href={adminHref("/posts")} variant="ghost">
          {<ArrowLeft size={16} />}
          返回帖子
        </Button>
      </PageTitle>
      <Input
        aria-label="搜索回收站"
        placeholder="搜索已删除帖子的标题或描述"
        leading={<Search size={17} />}
        value={search}
        onChange={(event) => {
          setSearch(event.currentTarget.value);
          setPage(1);
          setSelected([]);
        }}
      />
      <div
        className={"ui-row " + "selection-bar trash-selection"}
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "nowrap",
          gap: 10,
          justifyContent: "space-between",
        }}
      >
        <Checkbox
          onChange={(checked) =>
            setSelected(checked ? rows.map((post) => post.id) : [])
          }
          label={
            selectedRows.length ? `已选 ${selectedRows.length} 项` : "选择本页"
          }
          checked={rows.length > 0 && selectedRows.length === rows.length}
          indeterminate={
            selectedRows.length > 0 && selectedRows.length < rows.length
          }
          disabled={busy || !rows.length}
        />
        <div
          aria-hidden={!selectedRows.length}
          className={
            "ui-row " +
            `selection-actions ${selectedRows.length ? "is-visible" : ""}`
          }
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "nowrap",
            gap: 6,
          }}
        >
          <Button
            size="small"
            disabled={busy || !selectedRows.length}
            onClick={() => void change("restore", selectedRows)}
            variant="secondary"
          >
            {<ArchiveRestore size={14} />}
            恢复
          </Button>
          <Button
            size="small"
            disabled={busy || !selectedRows.length}
            onClick={() => confirmPurge(selectedRows)}
            variant="danger"
          >
            {<Trash2 size={14} />}
            永久删除
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
            title={`${failures.length} 篇帖子未完成操作`}
            tone={tone("orange")}
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
                  {item.title}：{item.error}
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
              列表已刷新，请核对状态后重试。
            </p>
          </Alert>
        </div>
      )}
      {trash.isPending ? (
        <Loading />
      ) : trash.error ? (
        <ErrorState error={trash.error} retry={trash.refetch} />
      ) : !rows.length ? (
        <Card className="moment-panel">
          <Empty
            title={q ? "没有匹配的内容" : "回收站是空的"}
            description={q ? "试试其他关键词。" : undefined}
          />
        </Card>
      ) : (
        <div
          className="ui-stack"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {rows.map((post) => {
            const cover =
              post.images.find((photo) => !photo.is_hidden) || post.images[0];
            return (
              <Card key={post.id} className={"moment-panel " + "trash-row"}>
                <Checkbox
                  onChange={(checked) => {
                    setSelected((ids) =>
                      checked
                        ? [...ids, post.id]
                        : ids.filter((id) => id !== post.id),
                    );
                  }}
                  label={`选择 ${post.title}`}
                  checked={selected.includes(post.id)}
                  disabled={busy}
                />
                <Button
                  className="trash-preview-target image-action app-button-layout"
                  type="button"
                  onClick={() => setPreview(post)}
                  aria-label={`查看已删除帖子 ${post.title}`}
                  variant="ghost"
                >
                  <div className="trash-cover">
                    {cover ? (
                      <img
                        src={thumbnail(cover.image_url, settings.data?.data)}
                        alt=""
                        style={{
                          ...{ objectPosition: coverPosition(post) },
                          width: 84,
                          height: 76,
                        }}
                      />
                    ) : (
                      <ImageOff size={22} />
                    )}
                  </div>
                  <div className="trash-copy">
                    <div
                      className="ui-row"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <p
                        className="ui-text"
                        style={{
                          fontWeight: 600,
                        }}
                      >
                        {post.title}
                      </p>
                      <Badge
                        tone={badgeTone(post.is_hidden ? "gray" : "victoria")}
                      >
                        {post.is_hidden ? "原为隐藏" : "原为公开"}
                      </Badge>
                    </div>
                    <p
                      className="ui-text"
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        marginTop: 5,
                      }}
                    >
                      {post.images.length} 张照片
                      {post.draft_count > 0
                        ? ` · ${post.draft_count} 份草稿`
                        : ""}
                    </p>
                    <p
                      className="ui-text"
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        marginTop: 4,
                      }}
                    >
                      删除于 {post.deleted_at}
                    </p>
                  </div>
                </Button>
                <div
                  className={"ui-row " + "trash-row-actions"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "nowrap",
                    gap: 5,
                  }}
                >
                  <IconButton
                    label={`恢复 ${post.title}`}
                    disabled={busy}
                    onClick={() => void change("restore", [post])}
                    variant="secondary"
                  >
                    <ArchiveRestore size={17} />
                  </IconButton>
                  <IconButton
                    label={`永久删除 ${post.title}`}
                    disabled={busy}
                    onClick={() => confirmPurge([post])}
                    variant="danger"
                  >
                    <Trash2 size={17} />
                  </IconButton>
                </div>
              </Card>
            );
          })}
          {(trash.data?.total || 0) > 20 && (
            <div
              className="ui-row"
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "center",
                marginTop: 16,
              }}
            >
              <Pagination
                total={trash.data?.total || 0}
                page={page}
                onPageChange={(value) => {
                  setPage(value);
                  setSelected([]);
                }}
                pageSize={20}
                summary={null}
              />
            </div>
          )}
        </div>
      )}
      <Dialog
        open={!!preview}
        onClose={() => !busy && setPreview(null)}
        title="已删除的帖子"
        size="medium"
      >
        {preview && (
          <div
            className="ui-stack"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              className="ui-row"
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "space-between",
              }}
            >
              <h3 className="ui-title">{preview.title}</h3>
              <Button
                size="small"
                loading={busy}
                onClick={() => void change("restore", [preview])}
                variant="primary"
              >
                {<ArchiveRestore size={15} />}
                恢复帖子
              </Button>
            </div>
            <p
              className="ui-text"
              style={{
                fontSize: 13,
                color: "var(--muted)",
              }}
            >
              {preview.location} {preview.time?.replace("T", " ")} ·{" "}
              {preview.is_hidden ? "恢复后仅自己可见" : "恢复后重新公开"}
            </p>
            <p
              className="ui-text"
              style={{
                fontSize: 13,
                ...{ whiteSpace: "pre-wrap" },
              }}
            >
              {preview.desc}
            </p>
            {!!preview.categories.length && (
              <div
                className="ui-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {preview.categories.map((cat) => (
                  <Badge key={cat.id}>{cat.name}</Badge>
                ))}
              </div>
            )}
            {preview.draft_count > 0 && (
              <Alert tone={tone("blue")}>
                关联草稿会随帖子恢复，可在编辑器中继续处理。
              </Alert>
            )}
            {preview.images.map((photo) => (
              <div
                key={photo.id}
                className="ui-stack"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <img
                  src={photo.image_url}
                  alt={photo.title || preview.title}
                  loading="lazy"
                />
                <div
                  className="ui-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <p
                    className="ui-text"
                    style={{
                      fontSize: 13,
                    }}
                  >
                    {photo.title}
                  </p>
                  {photo.is_hidden && (
                    <Badge tone={badgeTone("gray")}>隐藏图片</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Dialog>
      <Dialog
        open={!!purging}
        onClose={() => !busy && setPurging(null)}
        title={`永久删除 ${purging?.length || 0} 篇帖子？`}
        footer={
          <>
            <Button
              disabled={busy}
              onClick={() => setPurging(null)}
              variant="secondary"
              data-dialog-initial-focus
            >
              取消
            </Button>
            <Button
              disabled={!confirmed}
              loading={busy}
              onClick={() => purging && void change("purge", purging)}
              variant="danger"
            >
              永久删除
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
          <p
            className="ui-text"
            style={{
              fontSize: 13,
            }}
          >
            帖子、图片记录和关联草稿将无法恢复。存储中的原始文件会保留，避免影响其他引用。
          </p>
          <Checkbox
            onChange={(checked) => setConfirmed(checked)}
            checked={confirmed}
            disabled={busy}
            label="我确认永久删除这些内容"
          />
        </div>
      </Dialog>
    </>
  );
}
