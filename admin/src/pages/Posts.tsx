import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  Image,
  Modal,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { Link } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Grid2X2,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { api, json, notifyError, notifySuccess } from "../api";
import { CategorySelect } from "../components/CategoryPicker";
import { Empty, ErrorState, Loading, PageTitle } from "../components/Common";
import { orders, thumbnail } from "../types";
import type { Category, Post, Settings } from "../types";

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
    queryFn: () => api<{ location: string; count: number }[]>("/locations"),
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/settings"),
  });
  const rows = posts.data?.data || [];
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
    ]);
    setSelected([]);
  }
  async function visibility(hidden: boolean, ids: number[]) {
    setBusy(true);
    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const post = rows.find((row) => row.id === id);
        if (post)
          await api(
            `/posts/${id}`,
            json("PUT", { ...post, is_hidden: hidden }),
          );
      }),
    );
    await refresh();
    setBusy(false);
    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length)
      notifyError(
        new Error(
          `${ids.length - failed.length} 项已更新，${failed.length} 项失败，请刷新后重试`,
        ),
      );
    else notifySuccess(hidden ? "已隐藏" : "已公开");
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    const results = await Promise.allSettled(
      deleting.map((id) => api(`/posts/${id}`, { method: "DELETE" })),
    );
    setDeleting(null);
    await refresh();
    if (rows.length === deleting.length && page > 1)
      setPage((value) => value - 1);
    setBusy(false);
    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length)
      notifyError(new Error(`${failed.length} 项未删除，请刷新后重试`));
    else notifySuccess("已删除");
  }
  return (
    <>
      <PageTitle title="帖子与图片">
        <Button
          component={Link}
          to="/posts/new"
          leftSection={<Plus size={18} />}
        >
          新建帖子
        </Button>
      </PageTitle>
      <div className="toolbar">
        <TextInput
          className="toolbar-search"
          aria-label="搜索帖子"
          placeholder="搜索标题或描述"
          leftSection={<Search size={17} />}
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            reset();
          }}
        />
        <CategorySelect
          categories={categories.data?.data || []}
          value={category}
          onChange={(value) => {
            setCategory(value);
            reset();
          }}
        />
        <Select
          aria-label="按地点筛选"
          placeholder="全部地点"
          clearable
          searchable
          value={location}
          data={(locations.data?.data || []).map((item) => item.location)}
          onChange={(value) => {
            setLocation(value);
            reset();
          }}
        />
        <Select
          aria-label="排序"
          data={orders}
          value={order}
          onChange={(value) => {
            setOrder(value || "created_at_desc");
            reset();
          }}
        />
        <div className="view-switch" role="group" aria-label="显示方式">
          <span
            className={`view-switch-indicator ${view === "list" ? "is-list" : ""}`}
            aria-hidden="true"
          />
          <button
            type="button"
            aria-label="图片网格"
            aria-pressed={view === "grid"}
            title="图片网格"
            onClick={() => setView("grid")}
          >
            <Grid2X2 size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            aria-label="紧凑列表"
            aria-pressed={view === "list"}
            title="紧凑列表"
            onClick={() => setView("list")}
          >
            <List size={19} strokeWidth={1.8} />
          </button>
        </div>
      </div>
      <Group justify="space-between" className="selection-bar" wrap="nowrap">
        <Checkbox
          label={selected.length ? `已选 ${selected.length} 项` : "选择本页"}
          checked={rows.length > 0 && selected.length === rows.length}
          indeterminate={selected.length > 0 && selected.length < rows.length}
          disabled={!rows.length || busy}
          onChange={(e) =>
            setSelected(
              e.currentTarget.checked ? rows.map((row) => row.id) : [],
            )
          }
        />
        <Group
          gap="xs"
          className={`selection-actions ${selected.length ? "is-visible" : ""}`}
          aria-hidden={!selected.length}
          wrap="nowrap"
        >
          <Button
            size="xs"
            variant="light"
            leftSection={<Eye size={14} />}
            loading={busy}
            disabled={!selected.length}
            onClick={() => void visibility(false, selected)}
          >
            公开
          </Button>
          <Button
            size="xs"
            variant="light"
            color="gray"
            leftSection={<EyeOff size={14} />}
            disabled={busy || !selected.length}
            onClick={() => void visibility(true, selected)}
          >
            隐藏
          </Button>
          <Button
            size="xs"
            color="red"
            variant="light"
            leftSection={<Trash2 size={14} />}
            disabled={busy || !selected.length}
            onClick={() => setDeleting(selected)}
          >
            删除
          </Button>
        </Group>
      </Group>
      {posts.isPending ? (
        <Loading />
      ) : posts.error ? (
        <ErrorState error={posts.error} retry={posts.refetch} />
      ) : rows.length === 0 ? (
        <Paper withBorder>
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
        </Paper>
      ) : view === "grid" ? (
        <div className="post-grid view-enter">
          {rows.map((post) => (
            <Paper withBorder p={12} key={post.id} className="post-card">
              <div className="post-cover">
                <Checkbox
                  aria-label={`选择 ${post.title}`}
                  checked={selected.includes(post.id)}
                  disabled={busy}
                  onChange={(e) => choose(post.id, e.currentTarget.checked)}
                />
                <Link to={`/posts/${post.id}`}>
                  <Image
                    className="photo-cover"
                    src={thumbnail(
                      (
                        post.images.find((photo) => !photo.is_hidden) ||
                        post.images[0]
                      )?.image_url || "",
                      settings.data?.data,
                    )}
                    alt={post.title}
                    fallbackSrc="/assets/loading.gif"
                    loading="lazy"
                  />
                </Link>
              </div>
              <Stack gap={8} p={8} pt={14}>
                <Group justify="space-between" wrap="nowrap">
                  <Text
                    component={Link}
                    to={`/posts/${post.id}`}
                    fw={600}
                    lineClamp={1}
                  >
                    {post.title}
                  </Text>
                  <Badge
                    color={post.is_hidden ? "gray" : "victoria"}
                    variant="light"
                  >
                    {post.is_hidden ? "隐藏" : "公开"}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {post.location || "未设置地点"} · {post.images.length} 张 ·{" "}
                  {post.time?.slice(0, 10) || "未设置时间"}
                </Text>
                <Group justify="space-between" mt={4}>
                  <Group gap={5}>
                    {post.categories.slice(0, 2).map((cat) => (
                      <Badge
                        key={cat.id}
                        variant="outline"
                        color="gray"
                        size="xs"
                      >
                        {cat.name}
                      </Badge>
                    ))}
                  </Group>
                  <Group gap={4}>
                    <ActionIcon
                      component={Link}
                      to={`/posts/${post.id}`}
                      variant="subtle"
                      aria-label={`编辑 ${post.title}`}
                    >
                      <Pencil size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label={`删除 ${post.title}`}
                      disabled={busy}
                      onClick={() => setDeleting([post.id])}
                    >
                      <Trash2 size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Stack>
            </Paper>
          ))}
        </div>
      ) : (
        <Paper withBorder p="md" className="desktop-table view-enter">
          <Table verticalSpacing="md" miw={600}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>选择</Table.Th>
                <Table.Th>帖子</Table.Th>
                <Table.Th>地点</Table.Th>
                <Table.Th>拍摄日期</Table.Th>
                <Table.Th>状态</Table.Th>
                <Table.Th>操作</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((post) => (
                <Table.Tr key={post.id}>
                  <Table.Td>
                    <Checkbox
                      aria-label={`选择 ${post.title}`}
                      checked={selected.includes(post.id)}
                      onChange={(e) => choose(post.id, e.currentTarget.checked)}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Group wrap="nowrap">
                      <Image
                        className="table-image"
                        src={thumbnail(
                          (
                            post.images.find((photo) => !photo.is_hidden) ||
                            post.images[0]
                          )?.image_url || "",
                          settings.data?.data,
                        )}
                        alt=""
                      />
                      <div>
                        <Text
                          component={Link}
                          to={`/posts/${post.id}`}
                          fw={500}
                        >
                          {post.title}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {post.images.length} 张图片
                        </Text>
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td>{post.location || "—"}</Table.Td>
                  <Table.Td>{post.time?.slice(0, 10) || "—"}</Table.Td>
                  <Table.Td>
                    <Badge
                      variant="light"
                      color={post.is_hidden ? "gray" : "victoria"}
                    >
                      {post.is_hidden ? "隐藏" : "公开"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      component={Link}
                      to={`/posts/${post.id}`}
                      variant="subtle"
                      aria-label={`编辑 ${post.title}`}
                    >
                      <Pencil size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
      {posts.data && (posts.data.total || 0) > 20 ? (
        <Group justify="center" mt={28}>
          <Pagination
            total={Math.ceil((posts.data.total || 0) / 20)}
            value={page}
            onChange={(value) => {
              setPage(value);
              setSelected([]);
            }}
          />
        </Group>
      ) : null}
      <Modal
        opened={!!deleting}
        onClose={() => {
          if (!busy) setDeleting(null);
        }}
        title="删除帖子"
        centered
      >
        <Stack>
          <Text>
            确定删除这 {deleting?.length}{" "}
            篇帖子？删除后无法恢复。图片记录会一起删除，存储中的原始文件会保留。
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              取消
            </Button>
            <Button color="red" loading={busy} onClick={() => void remove()}>
              确认删除
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
