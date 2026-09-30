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
  Select,
  SegmentedControl,
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
  Tags,
  Trash2,
} from "lucide-react";
import { api, json, notifyError, notifySuccess } from "../api";
import {
  CategorySelect,
  CategoryMultiSelect,
} from "../components/CategoryPicker";
import { Empty, ErrorState, Loading, PageTitle } from "../components/Common";
import { orders, thumbnail, coverPosition } from "../types";
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
  const [classifying, setClassifying] = useState(false);
  const [categoryMode, setCategoryMode] = useState("add");
  const [batchCategories, setBatchCategories] = useState<string[]>([]);
  const [failures, setFailures] = useState<
    { id: number; title: string; error: string }[]
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
    queryFn: () => api<{ location: string; count: number }[]>("/locations"),
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
      const response = await api<{ id: number; ok: boolean; error?: string }[]>(
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
            className={`view-switch-indicator ${
              view === "list" ? "is-list" : ""
            }`}
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
            onClick={() => void batch("visibility", selected, false)}
          >
            公开
          </Button>
          <Button
            size="xs"
            variant="light"
            color="gray"
            leftSection={<EyeOff size={14} />}
            disabled={busy || !selected.length}
            onClick={() => void batch("visibility", selected, true)}
          >
            隐藏
          </Button>
          <Button
            size="xs"
            variant="light"
            color="gray"
            leftSection={<Tags size={14} />}
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
          >
            分类
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
      {!!failures.length && (
        <Alert
          color="orange"
          title={`${failures.length} 篇帖子未完成操作`}
          withCloseButton
          onClose={() => setFailures([])}
          mb="lg"
        >
          <Stack gap={5}>
            {failures.map((item) => (
              <Text size="sm" key={item.id}>
                <Text
                  component={Link}
                  to={`/posts/${item.id}`}
                  inherit
                  span
                  td="underline"
                >
                  {item.title}
                </Text>
                ：{item.error}
              </Text>
            ))}
          </Stack>
          <Text size="xs" mt="sm">
            已刷新列表，失败项目保留选择。检查最新内容后可重新操作。
          </Text>
        </Alert>
      )}
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
                    style={{ objectPosition: coverPosition(post) }}
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
                      disabled={busy}
                      onChange={(e) => choose(post.id, e.currentTarget.checked)}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Group wrap="nowrap">
                      <Image
                        className="table-image"
                        style={{ objectPosition: coverPosition(post) }}
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
        title="移入回收站"
        centered
      >
        <Stack>
          <Text>
            将这 {deleting?.length}{" "}
            篇帖子移入回收站？访客将无法再访问，图片、分类和未发布草稿会保留，可随时恢复。
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              取消
            </Button>
            <Button
              color="red"
              loading={busy}
              onClick={() => deleting && void batch("delete", deleting)}
            >
              移入回收站
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={classifying}
        onClose={() => !busy && setClassifying(false)}
        title={`批量分类 · ${selected.length} 篇帖子`}
        centered
      >
        <Stack>
          <SegmentedControl
            aria-label="分类操作方式"
            fullWidth
            value={categoryMode}
            onChange={setCategoryMode}
            disabled={busy}
            data={[
              { value: "add", label: "添加" },
              { value: "replace", label: "替换" },
              { value: "remove", label: "移除" },
            ]}
          />
          <Text size="sm" c="dimmed">
            {categoryMode === "add"
              ? "添加所选分类，保留原有分类。子分类会同时关联父分类。"
              : categoryMode === "replace"
              ? "将原有分类替换为所选分类。留空可清除全部分类。"
              : "移除所选分类。移除父分类时也会移除其下的子分类；只移除子分类会保留父分类。"}
          </Text>
          <fieldset className="editor-fieldset" disabled={busy}>
            <CategoryMultiSelect
              categories={categories.data?.data || []}
              value={batchCategories}
              onChange={setBatchCategories}
            />
          </fieldset>
          {categoryMode === "replace" && (
            <Alert color="orange">
              {batchCategories.length
                ? "原有分类将被替换。"
                : "这会清除所选帖子的全部分类。"}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={busy}
              onClick={() => setClassifying(false)}
            >
              取消
            </Button>
            <Button
              loading={busy}
              disabled={categoryMode !== "replace" && !batchCategories.length}
              onClick={() => void batch("categories", selected)}
            >
              应用到 {selected.length} 篇帖子
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
