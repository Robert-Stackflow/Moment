import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import {
  Alert,
  Badge,
  Button,
  Group,
  Image,
  Modal,
  Pagination,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { CalendarClock, FilePenLine, RefreshCw, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { api, json, notifyError, notifySuccess } from "../api";
import { Empty, ErrorState, Loading, PageTitle } from "../components/Common";
import { ScheduleDialog, scheduleTime } from "../components/ScheduleDialog";
import {
  thumbnail,
  type PostDraft,
  type PublishSchedule,
  type Settings,
} from "../types";

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
    refetchInterval: 5_000,
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
    setEditing(null);
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
          variant="default"
          leftSection={<RefreshCw size={16} />}
          onClick={() => void plans.refetch()}
          loading={plans.isFetching}
        >
          刷新
        </Button>
      </PageTitle>
      <Group mb="lg" align="end">
        <TextInput
          style={{ flex: "1 1 220px" }}
          aria-label="搜索发布计划"
          placeholder="搜索帖子标题"
          leftSection={<Search size={17} />}
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            setPage(1);
          }}
        />
        <Select
          aria-label="计划状态"
          w={170}
          value={status}
          onChange={(value) => {
            setStatus(value || "");
            setPage(1);
          }}
          data={[
            { value: "", label: "全部状态" },
            ...Object.entries(labels).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          allowDeselect={false}
        />
      </Group>
      {plans.isPending ? (
        <Loading />
      ) : plans.error ? (
        <ErrorState error={plans.error} retry={plans.refetch} />
      ) : !plans.data.data.length ? (
        <Empty title="没有发布计划" />
      ) : (
        <Stack gap="sm">
          {plans.data.data.map((plan) => (
            <Paper
              key={plan.draft_id}
              withBorder
              p="lg"
              className="schedule-card"
            >
              <div className="schedule-copy">
                <div className="schedule-cover">
                  {plan.cover ? (
                    <Image
                      src={thumbnail(plan.cover, settings.data?.data, 320)}
                      alt=""
                      w={64}
                      h={64}
                      radius={10}
                    />
                  ) : (
                    <CalendarClock size={24} />
                  )}
                </div>
                <div className="schedule-details">
                  <Group gap={8}>
                    <Text fw={600} style={{ overflowWrap: "anywhere" }}>
                      {plan.title}
                    </Text>
                    <Badge
                      size="xs"
                      variant="light"
                      color={colors[plan.status]}
                    >
                      {labels[plan.status]}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed" mt={6}>
                    {scheduleTime(plan.publish_at)}
                  </Text>
                  {plan.completed_at && (
                    <Text size="xs" c="dimmed" mt={4}>
                      {plan.status === "published" ? "实际发布" : "最近处理"} ·{" "}
                      {plan.completed_at}
                    </Text>
                  )}
                </div>
              </div>
              {plan.error && (
                <Alert color="orange" role="status" mt="md">
                  {plan.error}
                </Alert>
              )}
              <Group justify="flex-end" gap={8} mt="md">
                {plan.status === "published" ? (
                  plan.published_post_id ? (
                    <Button
                      size="xs"
                      variant="subtle"
                      component={Link}
                      to={`/posts/${plan.published_post_id}`}
                    >
                      查看帖子
                    </Button>
                  ) : (
                    <Text size="xs" c="dimmed">
                      帖子已删除
                    </Text>
                  )
                ) : (
                  <>
                    <Button
                      size="xs"
                      variant="subtle"
                      leftSection={<FilePenLine size={14} />}
                      component={Link}
                      to={`/drafts/${plan.draft_id}`}
                    >
                      {plan.status === "pending" ? "查看内容" : "编辑草稿"}
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      disabled={busy}
                      onClick={() => void edit(plan)}
                    >
                      {plan.status === "pending" ? "修改时间" : "重新安排"}
                    </Button>
                    {(plan.status === "pending" ||
                      plan.status === "failed") && (
                      <Button
                        size="xs"
                        variant="default"
                        disabled={busy}
                        onClick={() => setCancelling(plan)}
                      >
                        取消计划
                      </Button>
                    )}
                  </>
                )}
              </Group>
            </Paper>
          ))}
          {(plans.data.total || 0) > 20 && (
            <Group justify="center">
              <Pagination
                value={page}
                onChange={setPage}
                total={Math.ceil((plans.data.total || 0) / 20)}
              />
            </Group>
          )}
        </Stack>
      )}
      {editing && (
        <ScheduleDialog
          title={editing.draft.payload.title}
          initialTime={
            editing.schedule.publish_at > Date.now() / 1000
              ? editing.schedule.publish_at
              : undefined
          }
          onClose={() => setEditing(null)}
          onConfirm={save}
        />
      )}
      <Modal
        opened={!!cancelling}
        onClose={() => !busy && setCancelling(null)}
        title="取消发布计划？"
        centered
      >
        <Text size="sm">
          「{cancelling?.title}
          」将保留为草稿，可以继续编辑或重新安排时间。已公开的内容保持原样。
        </Text>
        <Group justify="flex-end" mt="xl">
          <Button
            variant="default"
            disabled={busy}
            onClick={() => setCancelling(null)}
          >
            保留计划
          </Button>
          <Button color="red" loading={busy} onClick={() => void cancel()}>
            确认取消
          </Button>
        </Group>
      </Modal>
    </>
  );
}
