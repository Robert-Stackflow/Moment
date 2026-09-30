import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Image,
  Modal,
  Pagination,
  Paper,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { FilePenLine, Plus, Search, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api, json, notifyError, notifySuccess } from "../api";
import { Empty, ErrorState, Loading, PageTitle } from "../components/Common";
import type { DraftSummary } from "../types";

export default function Drafts() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [q] = useDebouncedValue(search, 250);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<DraftSummary | null>(null);
  const [busy, setBusy] = useState(false);
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
        <Button
          component={Link}
          to="/posts/new"
          leftSection={<Plus size={17} />}
        >
          新建帖子
        </Button>
      </PageTitle>
      <TextInput
        mb="lg"
        aria-label="搜索草稿"
        placeholder="搜索草稿标题或描述"
        leftSection={<Search size={17} />}
        value={search}
        onChange={(e) => {
          setSearch(e.currentTarget.value);
          setPage(1);
        }}
      />
      {drafts.isPending ? (
        <Loading />
      ) : drafts.error ? (
        <ErrorState error={drafts.error} retry={drafts.refetch} />
      ) : !drafts.data.data.length ? (
        <Empty
          title={q ? "没有匹配的草稿" : "还没有草稿"}
          description="编辑内容会自动保存到这里，发布后从草稿中移出。"
        />
      ) : (
        <Stack gap="sm">
          {drafts.data.data.map((draft) => (
            <Paper withBorder p="md" key={draft.id} className="draft-row">
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
                    <Image src={draft.cover} alt="" w={76} h={68} radius={9} />
                  ) : (
                    <FilePenLine size={23} />
                  )}
                </div>
                <div className="draft-row-copy">
                  <Group gap={8}>
                    <Text fw={600} truncate>
                      {draft.title || "未命名草稿"}
                    </Text>
                    <Badge
                      size="xs"
                      variant="light"
                      color={draft.post_id ? "blue" : "gray"}
                    >
                      {draft.post_id ? "待发布更新" : "新帖子"}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed" truncate mt={4}>
                    {draft.description || "尚未添加描述"}
                  </Text>
                  <Text size="xs" c="dimmed" mt={6}>
                    {draft.image_count} 张照片 · {draft.updated_at}
                  </Text>
                </div>
              </Link>
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={`删除草稿 ${draft.title || "未命名草稿"}`}
                onClick={() => setDeleting(draft)}
              >
                <Trash2 size={17} />
              </ActionIcon>
            </Paper>
          ))}
          {(drafts.data.total || 0) > 20 && (
            <Group justify="center" mt="md">
              <Pagination
                value={page}
                onChange={setPage}
                total={Math.ceil((drafts.data.total || 0) / 20)}
              />
            </Group>
          )}
        </Stack>
      )}
      <Modal
        opened={!!deleting}
        onClose={() => !busy && setDeleting(null)}
        title="删除这份草稿？"
        centered
      >
        <Text size="sm">
          草稿中的未发布修改将被删除，已发布的帖子和原始图片不受影响。
        </Text>
        <Group justify="flex-end" mt="xl">
          <Button
            variant="default"
            disabled={busy}
            onClick={() => setDeleting(null)}
          >
            取消
          </Button>
          <Button color="red" loading={busy} onClick={() => void remove()}>
            删除草稿
          </Button>
        </Group>
      </Modal>
    </>
  );
}
