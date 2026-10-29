import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  Input,
  Pagination,
  Select,
} from "@robert-stackflow/oneui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, FilePenLine, RefreshCw, Search } from "lucide-react";
import { useRef, useState } from "react";
import { api, json, notifyError, notifySuccess } from "../api";
import { Empty, ErrorState, Loading, PageTitle } from "../components/Common";
import { ScheduleDialog, scheduleTime } from "../components/ScheduleDialog";
import { useDebouncedValue } from "../hooks";
import {
  thumbnail,
  type PostDraft,
  type PublishSchedule,
  type Settings,
} from "../types";
import { adminHref, badgeTone, selectOptions, tone } from "../ui-data";
const labels = {
  pending: "等待发布",
  failed: "需要处理",
  published: "已发布",
  cancelled: "已取消",
};
const colors = {
  pending: "blue",
  failed: "red",
  published: "teal",
  cancelled: "gray",
};
export default function Schedules() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [q] = useDebouncedValue(search, 250);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<{
    schedule: PublishSchedule;
    draft: PostDraft;
  } | null>(null);
  const [cancelling, setCancelling] = useState<PublishSchedule | null>(null);
  const [busy, setBusy] = useState(false);
  const editTrigger = useRef<HTMLButtonElement | null>(null);
  function closeEditor() {
    setEditing(null);
    requestAnimationFrame(() =>
      editTrigger.current?.focus({ preventScroll: true }),
    );
  }
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/settings"),
  });
  const plans = useQuery({
    queryKey: ["schedules", page, q, status],
    queryFn: () =>
      api<PublishSchedule[]>(
        `/schedules?${new URLSearchParams({
          page: String(page),
          page_size: "20",
          q,
          status,
        })}`,
      ),
    refetchInterval: 5000,
  });
  async function invalidate() {
    await Promise.all(
      ["schedules", "draft", "postDraft", "drafts", "posts", "stats"].map(
        (key) => client.invalidateQueries({ queryKey: [key] }),
      ),
    );
  }
  async function edit(schedule: PublishSchedule) {
    setBusy(true);
    try {
      const { data: draft } = await api<PostDraft | null>(
        `/drafts/${schedule.draft_id}`,
      );
      if (!draft || draft.published_at)
        throw new Error("草稿已经发布或删除，请刷新列表");
      if (draft.schedule?.revision !== schedule.revision)
        throw new Error("计划已改变，请刷新列表后重试");
      setEditing({ schedule, draft });
    } catch (cause) {
      notifyError(cause);
      void plans.refetch();
    } finally {
      setBusy(false);
    }
  }
  async function save(publishAt: number) {
    if (!editing) return;
    await api(
      `/drafts/${editing.draft.id}/schedule`,
      json("PUT", {
        revision: editing.schedule.revision,
        draft_revision: editing.draft.revision,
        publish_at: publishAt,
      }),
    );
    closeEditor();
    notifySuccess("发布计划已保存");
    await invalidate();
  }
  async function cancel() {
    if (!cancelling) return;
    setBusy(true);
    try {
      await api(
        `/drafts/${cancelling.draft_id}/schedule`,
        json("DELETE", { revision: cancelling.revision }),
      );
      setCancelling(null);
      notifySuccess("计划已取消，内容保留在草稿中");
      await invalidate();
    } catch (cause) {
      notifyError(cause);
      setCancelling(null);
      void plans.refetch();
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle title="定时发布" description="所有时间均为北京时间 · UTC+8">
        <Button
          onClick={() => void plans.refetch()}
          loading={plans.isFetching}
          variant="secondary"
        >
          {<RefreshCw size={16} />}
          刷新
        </Button>
      </PageTitle>
      <div
        className="ui-row"
        style={{
          display: "flex",
          alignItems: "end",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            ...{ flex: "1 1 220px" },
          }}
        >
          <Input
            aria-label="搜索发布计划"
            placeholder="搜索帖子标题"
            leading={<Search size={17} />}
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
          />
        </div>
        <div
          style={{
            width: 170,
          }}
        >
          <Select
            aria-label="计划状态"
            onChange={(value) => {
              setStatus(value || "");
              setPage(1);
            }}
            options={selectOptions([
              { value: "", label: "全部状态" },
              ...Object.entries(labels).map(([value, label]) => ({
                value,
                label,
              })),
            ])}
            label={"计划状态"}
            value={status ?? ""}
          />
        </div>
      </div>
      {plans.isPending ? (
        <Loading />
      ) : plans.error ? (
        <ErrorState error={plans.error} retry={plans.refetch} />
      ) : !plans.data.data.length ? (
        <Empty title="没有发布计划" />
      ) : (
        <div
          className="ui-stack"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {plans.data.data.map((plan) => (
            <Card
              key={plan.draft_id}
              className={"moment-panel " + "schedule-card"}
            >
              <div className="schedule-copy">
                <div className="schedule-cover">
                  {plan.cover ? (
                    <img
                      src={thumbnail(plan.cover, settings.data?.data, 320)}
                      alt=""
                      style={{
                        width: 64,
                        height: 64,
                      }}
                    />
                  ) : (
                    <CalendarClock size={24} />
                  )}
                </div>
                <div className="schedule-details">
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
                        ...{ overflowWrap: "anywhere" },
                      }}
                    >
                      {plan.title}
                    </p>
                    <Badge tone={badgeTone(colors[plan.status])}>
                      {labels[plan.status]}
                    </Badge>
                  </div>
                  <p
                    className="ui-text"
                    style={{
                      fontSize: 13,
                      color: "var(--muted)",
                      marginTop: 6,
                    }}
                  >
                    {scheduleTime(plan.publish_at)}
                  </p>
                  {plan.completed_at && (
                    <p
                      className="ui-text"
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        marginTop: 4,
                      }}
                    >
                      {plan.status === "published" ? "实际发布" : "最近处理"} ·{" "}
                      {plan.completed_at}
                    </p>
                  )}
                </div>
              </div>
              {plan.error && (
                <div
                  style={{
                    marginTop: 16,
                  }}
                >
                  <Alert tone={tone("orange")}>{plan.error}</Alert>
                </div>
              )}
              <div
                className="ui-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                  justifyContent: "flex-end",
                  marginTop: 16,
                }}
              >
                {plan.status === "published" ? (
                  plan.published_post_id ? (
                    <Button
                      size="small"
                      href={adminHref(`/posts/${plan.published_post_id}`)}
                      variant="ghost"
                    >
                      查看帖子
                    </Button>
                  ) : (
                    <p
                      className="ui-text"
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      帖子已删除
                    </p>
                  )
                ) : (
                  <>
                    <Button
                      size="small"
                      href={adminHref(`/drafts/${plan.draft_id}`)}
                      variant="ghost"
                    >
                      {<FilePenLine size={14} />}
                      {plan.status === "pending" ? "查看内容" : "编辑草稿"}
                    </Button>
                    <Button
                      size="small"
                      disabled={busy}
                      onClick={(event) => {
                        editTrigger.current = event.currentTarget;
                        void edit(plan);
                      }}
                      variant="secondary"
                    >
                      {plan.status === "pending" ? "修改时间" : "重新安排"}
                    </Button>
                    {(plan.status === "pending" ||
                      plan.status === "failed") && (
                      <Button
                        size="small"
                        disabled={busy}
                        onClick={() => setCancelling(plan)}
                        variant="secondary"
                      >
                        取消计划
                      </Button>
                    )}
                  </>
                )}
              </div>
            </Card>
          ))}
          {(plans.data.total || 0) > 20 && (
            <div
              className="ui-row"
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "center",
              }}
            >
              <Pagination
                page={page}
                onPageChange={setPage}
                total={plans.data.total || 0}
                pageSize={20}
                summary={null}
              />
            </div>
          )}
        </div>
      )}
      {editing && (
        <ScheduleDialog
          title={editing.draft.payload.title}
          initialTime={
            editing.schedule.publish_at > Date.now() / 1000
              ? editing.schedule.publish_at
              : undefined
          }
          onClose={closeEditor}
          onConfirm={save}
        />
      )}
      <Dialog
        open={!!cancelling}
        onClose={() => !busy && setCancelling(null)}
        title="取消发布计划？"
        footer={
          <>
            <Button
              disabled={busy}
              onClick={() => setCancelling(null)}
              variant="secondary"
              data-dialog-initial-focus
            >
              保留计划
            </Button>
            <Button
              loading={busy}
              onClick={() => void cancel()}
              variant="danger"
            >
              确认取消
            </Button>
          </>
        }
        busy={!!busy}
        variant="confirm"
      >
        <p
          className="ui-text"
          style={{
            fontSize: 13,
          }}
        >
          「{cancelling?.title}
          」将保留为草稿，可以继续编辑或重新安排时间。已公开的内容保持原样。
        </p>
      </Dialog>
    </>
  );
}
