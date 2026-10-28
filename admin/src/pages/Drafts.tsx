import {
  Badge,
  Button,
  Card,
  Dialog,
  IconButton,
  Input,
  Pagination,
} from "@robert-stackflow/oneui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePenLine, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api, json, notifyError, notifySuccess } from "../api";
import { Empty, ErrorState, Loading, PageTitle } from "../components/Common";
import { scheduleTime } from "../components/ScheduleDialog";
import { useDebouncedValue } from "../hooks";
import type { DraftSummary, Settings } from "../types";
import { thumbnail } from "../types";
import { adminHref, badgeTone } from "../ui-data";
export default function Drafts() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [q] = useDebouncedValue(search, 250);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<DraftSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/settings"),
  });
  const drafts = useQuery({
    queryKey: ["drafts", page, q],
    queryFn: () =>
      api<DraftSummary[]>(
        `/drafts?${new URLSearchParams({
          page: String(page),
          page_size: "20",
          q,
        })}`,
      ),
    staleTime: 0,
  });
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(
        `/drafts/${deleting.id}`,
        json("DELETE", { revision: deleting.revision }),
      );
      client.removeQueries({ queryKey: ["draft", deleting.id] });
      client.removeQueries({
        queryKey: ["postDraft", String(deleting.post_id)],
      });
      if (drafts.data?.data.length === 1 && page > 1) setPage(page - 1);
      await client.invalidateQueries({ queryKey: ["drafts"] });
      setDeleting(null);
      notifySuccess("草稿已删除，已发布内容保持不变");
    } catch (cause) {
      notifyError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle title="草稿">
        <Button href={adminHref("/posts/new")} variant="primary">
          {<Plus size={17} />}
          新建帖子
        </Button>
      </PageTitle>
      <Input
        aria-label="搜索草稿"
        placeholder="搜索草稿标题或描述"
        leading={<Search size={17} />}
        value={search}
        onChange={(e) => {
          setSearch(e.currentTarget.value);
          setPage(1);
        }}
        style={{
          marginBottom: 24,
        }}
      />
      {drafts.isPending ? (
        <Loading />
      ) : drafts.error ? (
        <ErrorState error={drafts.error} retry={drafts.refetch} />
      ) : !drafts.data.data.length ? (
        <Empty title={q ? "没有匹配的草稿" : "还没有草稿"} />
      ) : (
        <div
          className="ui-stack"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {drafts.data.data.map((draft) => (
            <Card key={draft.id} className={"moment-panel " + "draft-row"}>
              <Link
                to={
                  draft.post_id
                    ? `/posts/${draft.post_id}`
                    : `/drafts/${draft.id}`
                }
                className="draft-row-main"
              >
                <div className="draft-cover">
                  {draft.cover ? (
                    <img
                      src={thumbnail(draft.cover, settings.data?.data, 320)}
                      alt=""
                      style={{
                        width: 76,
                        height: 68,
                      }}
                    />
                  ) : (
                    <FilePenLine size={23} />
                  )}
                </div>
                <div className="draft-row-copy">
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
                      {draft.title || "未命名草稿"}
                    </p>
                    <Badge tone={badgeTone(draft.post_id ? "blue" : "gray")}>
                      {draft.post_id ? "待发布更新" : "新帖子"}
                    </Badge>
                    {draft.schedule_status === "pending" && (
                      <Badge tone={badgeTone("blue")}>定时发布</Badge>
                    )}
                    {draft.schedule_status === "failed" && (
                      <Badge tone={badgeTone("red")}>发布失败</Badge>
                    )}
                  </div>
                  <p
                    className="ui-text"
                    style={{
                      fontSize: 13,
                      color: "var(--muted)",
                      marginTop: 4,
                    }}
                  >
                    {draft.description || "尚未添加描述"}
                  </p>
                  {draft.schedule_status === "pending" && draft.publish_at && (
                    <p
                      className="ui-text"
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        marginTop: 4,
                      }}
                    >
                      {scheduleTime(draft.publish_at)} · 北京时间
                    </p>
                  )}
                  <p
                    className="ui-text"
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      marginTop: 6,
                    }}
                  >
                    {draft.image_count} 张照片 · {draft.updated_at}
                  </p>
                </div>
              </Link>
              <IconButton
                disabled={draft.schedule_status === "pending"}
                label={`删除草稿 ${draft.title || "未命名草稿"}`}
                onClick={() => setDeleting(draft)}
                variant="danger"
              >
                <Trash2 size={17} />
              </IconButton>
            </Card>
          ))}
          {(drafts.data.total || 0) > 20 && (
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
                page={page}
                onPageChange={setPage}
                total={Math.ceil((drafts.data.total || 0) / 20)}
                pageSize={1}
                summary={null}
              />
            </div>
          )}
        </div>
      )}
      <Dialog
        open={!!deleting}
        onClose={() => !busy && setDeleting(null)}
        title="删除这份草稿？"
      >
        <p
          className="ui-text"
          style={{
            fontSize: 13,
          }}
        >
          草稿中的未发布修改将被删除，已发布的帖子和原始图片不受影响。
        </p>
        <div
          className="ui-row"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 32,
          }}
        >
          <Button
            disabled={busy}
            onClick={() => setDeleting(null)}
            variant="secondary"
          >
            取消
          </Button>
          <Button loading={busy} onClick={() => void remove()} variant="danger">
            删除草稿
          </Button>
        </div>
      </Dialog>
    </>
  );
}
