import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Image,
  Modal,
  Pagination,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  ArchiveRestore,
  ArrowLeft,
  ImageOff,
  Search,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api, json, notifyError, notifySuccess } from "../api";
import { Empty, ErrorState, Loading, PageTitle } from "../components/Common";
import { coverPosition, thumbnail } from "../types";
import type { Settings, TrashedPost } from "../types";

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
    { id: number; title: string; error: string }[]
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
      const result = await api<{ id: number; ok: boolean; error?: string }[]>(
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
        <Button
          component={Link}
          to="/posts"
          variant="subtle"
          color="gray"
          leftSection={<ArrowLeft size={16} />}
        >
          返回帖子
        </Button>
      </PageTitle>
      <TextInput
        aria-label="搜索回收站"
        placeholder="搜索已删除帖子的标题或描述"
        leftSection={<Search size={17} />}
        value={search}
        onChange={(event) => {
          setSearch(event.currentTarget.value);
          setPage(1);
          setSelected([]);
        }}
      />
      <Group
        justify="space-between"
        className="selection-bar trash-selection"
        wrap="nowrap"
      >
        <Checkbox
          label={
            selectedRows.length ? `已选 ${selectedRows.length} 项` : "选择本页"
          }
          checked={rows.length > 0 && selectedRows.length === rows.length}
          indeterminate={
            selectedRows.length > 0 && selectedRows.length < rows.length
          }
          disabled={busy || !rows.length}
          onChange={(event) =>
            setSelected(
              event.currentTarget.checked ? rows.map((post) => post.id) : [],
            )
          }
        />
        <Group
          gap="xs"
          className={`selection-actions ${
            selectedRows.length ? "is-visible" : ""
          }`}
          aria-hidden={!selectedRows.length}
          wrap="nowrap"
        >
          <Button
            size="xs"
            variant="light"
            leftSection={<ArchiveRestore size={14} />}
            disabled={busy || !selectedRows.length}
            onClick={() => void change("restore", selectedRows)}
          >
            恢复
          </Button>
          <Button
            size="xs"
            variant="light"
            color="red"
            leftSection={<Trash2 size={14} />}
            disabled={busy || !selectedRows.length}
            onClick={() => confirmPurge(selectedRows)}
          >
            永久删除
          </Button>
        </Group>
      </Group>
      {!!failures.length && (
        <Alert
          title={`${failures.length} 篇帖子未完成操作`}
          color="orange"
          mb="lg"
          withCloseButton
          onClose={() => setFailures([])}
        >
          <Stack gap={5}>
            {failures.map((item) => (
              <Text size="sm" key={item.id}>
                {item.title}：{item.error}
              </Text>
            ))}
          </Stack>
          <Text size="xs" mt="sm">
            列表已刷新，请核对状态后重试。
          </Text>
        </Alert>
      )}
      {trash.isPending ? (
        <Loading />
      ) : trash.error ? (
        <ErrorState error={trash.error} retry={trash.refetch} />
      ) : !rows.length ? (
        <Paper withBorder>
          <Empty
            title={q ? "没有匹配的内容" : "回收站是空的"}
            description={q ? "试试其他关键词。" : undefined}
          />
        </Paper>
      ) : (
        <Stack gap="sm">
          {rows.map((post) => {
            const cover =
              post.images.find((photo) => !photo.is_hidden) || post.images[0];
            return (
              <Paper withBorder p="md" className="trash-row" key={post.id}>
                <Checkbox
                  aria-label={`选择 ${post.title}`}
                  checked={selected.includes(post.id)}
                  disabled={busy}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setSelected((ids) =>
                      checked
                        ? [...ids, post.id]
                        : ids.filter((id) => id !== post.id),
                    );
                  }}
                />
                <button
                  className="trash-preview-target"
                  type="button"
                  onClick={() => setPreview(post)}
                  aria-label={`查看已删除帖子 ${post.title}`}
                >
                  <div className="trash-cover">
                    {cover ? (
                      <Image
                        src={thumbnail(cover.image_url, settings.data?.data)}
                        style={{ objectPosition: coverPosition(post) }}
                        alt=""
                        w={84}
                        h={76}
                        radius={10}
                      />
                    ) : (
                      <ImageOff size={22} />
                    )}
                  </div>
                  <div className="trash-copy">
                    <Group gap={8}>
                      <Text fw={600} truncate>
                        {post.title}
                      </Text>
                      <Badge
                        size="xs"
                        variant="light"
                        color={post.is_hidden ? "gray" : "victoria"}
                      >
                        {post.is_hidden ? "原为隐藏" : "原为公开"}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed" mt={5}>
                      {post.images.length} 张照片
                      {post.draft_count > 0
                        ? ` · ${post.draft_count} 份草稿`
                        : ""}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      删除于 {post.deleted_at}
                    </Text>
                  </div>
                </button>
                <Group className="trash-row-actions" gap={5} wrap="nowrap">
                  <ActionIcon
                    variant="light"
                    aria-label={`恢复 ${post.title}`}
                    disabled={busy}
                    onClick={() => void change("restore", [post])}
                  >
                    <ArchiveRestore size={17} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label={`永久删除 ${post.title}`}
                    disabled={busy}
                    onClick={() => confirmPurge([post])}
                  >
                    <Trash2 size={17} />
                  </ActionIcon>
                </Group>
              </Paper>
            );
          })}
          {(trash.data?.total || 0) > 20 && (
            <Group justify="center" mt="md">
              <Pagination
                total={Math.ceil((trash.data?.total || 0) / 20)}
                value={page}
                onChange={(value) => {
                  setPage(value);
                  setSelected([]);
                }}
              />
            </Group>
          )}
        </Stack>
      )}
      <Modal
        opened={!!preview}
        onClose={() => !busy && setPreview(null)}
        title="已删除的帖子"
        size="lg"
      >
        {preview && (
          <Stack>
            <Group justify="space-between">
              <Title order={3}>{preview.title}</Title>
              <Button
                size="xs"
                leftSection={<ArchiveRestore size={15} />}
                loading={busy}
                onClick={() => void change("restore", [preview])}
              >
                恢复帖子
              </Button>
            </Group>
            <Text size="sm" c="dimmed">
              {preview.location} {preview.time?.replace("T", " ")} ·{" "}
              {preview.is_hidden ? "恢复后仅自己可见" : "恢复后重新公开"}
            </Text>
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {preview.desc}
            </Text>
            {!!preview.categories.length && (
              <Group gap={6}>
                {preview.categories.map((cat) => (
                  <Badge variant="light" key={cat.id}>
                    {cat.name}
                  </Badge>
                ))}
              </Group>
            )}
            {preview.draft_count > 0 && (
              <Alert color="blue">
                关联草稿会随帖子恢复，可在编辑器中继续处理。
              </Alert>
            )}
            {preview.images.map((photo) => (
              <Stack key={photo.id} gap={6}>
                <Image
                  src={photo.image_url}
                  alt={photo.title || preview.title}
                  radius="md"
                  loading="lazy"
                />
                <Group gap={8}>
                  <Text size="sm">{photo.title}</Text>
                  {photo.is_hidden && (
                    <Badge color="gray" variant="light">
                      隐藏图片
                    </Badge>
                  )}
                </Group>
              </Stack>
            ))}
          </Stack>
        )}
      </Modal>
      <Modal
        opened={!!purging}
        onClose={() => !busy && setPurging(null)}
        title={`永久删除 ${purging?.length || 0} 篇帖子？`}
        centered
      >
        <Stack>
          <Text size="sm">
            帖子、图片记录和关联草稿将无法恢复。存储中的原始文件会保留，避免影响其他引用。
          </Text>
          <Checkbox
            checked={confirmed}
            onChange={(event) => setConfirmed(event.currentTarget.checked)}
            disabled={busy}
            label="我确认永久删除这些内容"
          />
          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={busy}
              onClick={() => setPurging(null)}
            >
              取消
            </Button>
            <Button
              color="red"
              disabled={!confirmed}
              loading={busy}
              onClick={() => purging && void change("purge", purging)}
            >
              永久删除
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
