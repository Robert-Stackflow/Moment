import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActionIcon,
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Collapse,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import {
  Pencil,
  Plus,
  Trash2,
  ChevronRight,
  Folder,
  Tag,
  FolderPlus,
} from "lucide-react";
import { api, json, notifyError, notifySuccess } from "../api";
import { Empty, ErrorState, Loading, PageTitle } from "../components/Common";
import { flatten } from "../types";
import type { Category } from "../types";
import { usePendingChanges } from "../components/PendingChanges";
const blank = { name: "", alias: "", desc: "", order: 0, parent_id: 0 };

export default function Categories() {
  const client = useQueryClient();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/categories"),
  });
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [form, setForm] = useState(blank);
  const [initialForm, setInitialForm] = useState(blank);
  usePendingChanges(
    !!editing && JSON.stringify(form) !== JSON.stringify(initialForm),
  );
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState<number[]>([]);
  const rows = flatten(categories.data?.data || []);
  function field(key: keyof typeof blank, value: string | number) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function edit(item: Category | "new", parent = 0) {
    setEditing(item);
    const nextForm =
      item === "new"
        ? { ...blank, parent_id: parent }
        : {
            name: item.name,
            alias: item.alias,
            desc: item.desc || "",
            order: item.order,
            parent_id: item.parent_id,
          };
    setForm(nextForm);
    setInitialForm(nextForm);
  }
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["categories"] }),
      client.invalidateQueries({ queryKey: ["stats"] }),
      client.invalidateQueries({ queryKey: ["posts"] }),
    ]);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const path =
        editing && editing !== "new"
          ? `/categories/${editing.id}`
          : "/categories";
      await api(path, json(editing === "new" ? "POST" : "PUT", form));
      setEditing(null);
      await refresh();
      notifySuccess();
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/categories/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      await refresh();
      notifySuccess("分类已删除");
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle title="分类管理">
        <Button leftSection={<Plus size={18} />} onClick={() => edit("new")}>
          新建分类
        </Button>
      </PageTitle>
      {categories.isPending ? (
        <Loading />
      ) : categories.error ? (
        <ErrorState error={categories.error} retry={categories.refetch} />
      ) : rows.length === 0 ? (
        <Paper withBorder>
          <Empty description="创建第一个分类，开始整理你的照片。" />
        </Paper>
      ) : (
        <Paper withBorder className="category-tree">
          <div className="category-tree-heading">
            <span>分类与层级</span>
            <span>访问路径</span>
            <span>排序</span>
            <span>操作</span>
          </div>
          {(categories.data?.data || []).map((parent) => {
            const children = parent.children || [];
            const expanded = !collapsed.includes(parent.id);
            const row = (item: Category, child = false) => (
              <div
                className={`category-tree-row ${child ? "is-child" : "is-parent"}`}
                key={item.id}
              >
                <div className="category-tree-name">
                  {!child && (
                    <ActionIcon
                      className="category-expand"
                      variant="subtle"
                      color="gray"
                      aria-label={`${expanded ? "收起" : "展开"} ${item.name}`}
                      aria-expanded={expanded}
                      disabled={!children.length}
                      onClick={() =>
                        setCollapsed((current) =>
                          expanded
                            ? [...current, item.id]
                            : current.filter((id) => id !== item.id),
                        )
                      }
                    >
                      <ChevronRight
                        size={16}
                        className={expanded ? "is-expanded" : ""}
                      />
                    </ActionIcon>
                  )}
                  <span
                    className={`category-tree-icon ${child ? "is-child" : ""}`}
                  >
                    {child ? (
                      <Tag size={16} strokeWidth={1.7} />
                    ) : (
                      <Folder size={20} strokeWidth={1.6} />
                    )}
                  </span>
                  <div className="category-name-copy">
                    <Group gap={9}>
                      <Text fw={child ? 500 : 600} size="sm">
                        {item.name}
                      </Text>
                      {!child && children.length > 0 && (
                        <span className="category-count">
                          {children.length}
                        </span>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed" lineClamp={1} mt={3}>
                      {item.desc || (child ? `属于 ${parent.name}` : "主分类")}
                    </Text>
                  </div>
                </div>
                <a
                  className="category-path"
                  href={`/category/${encodeURIComponent(item.alias)}`}
                  target="_blank"
                  rel="noopener"
                >
                  /{item.alias}
                </a>
                <span className="category-order">{item.order}</span>
                <Group gap={3} wrap="nowrap" className="category-tree-actions">
                  {!child && (
                    <ActionIcon
                      aria-label={`新建子分类 ${item.name}`}
                      data-tooltip="新建子分类"
                      variant="subtle"
                      onClick={() => edit("new", item.id)}
                    >
                      <FolderPlus size={17} />
                    </ActionIcon>
                  )}
                  <ActionIcon
                    aria-label={`编辑分类 ${item.name}`}
                    variant="subtle"
                    onClick={() => edit(item)}
                  >
                    <Pencil size={16} />
                  </ActionIcon>
                  <ActionIcon
                    aria-label={`删除分类 ${item.name}`}
                    variant="subtle"
                    color="red"
                    onClick={() => setDeleting(item)}
                  >
                    <Trash2 size={16} />
                  </ActionIcon>
                </Group>
              </div>
            );
            return (
              <section className="category-tree-group" key={parent.id}>
                {row(parent)}
                {children.length > 0 && (
                  <Collapse
                    in={expanded}
                    transitionDuration={200}
                    transitionTimingFunction="cubic-bezier(.2,.7,.2,1)"
                  >
                    <div className="category-tree-children">
                      {children.map((child) => row(child, true))}
                    </div>
                  </Collapse>
                )}
              </section>
            );
          })}
        </Paper>
      )}
      <Modal
        opened={!!editing}
        onClose={() => {
          if (!busy) setEditing(null);
        }}
        title={editing === "new" ? "新建分类" : "编辑分类"}
        centered
      >
        <form onSubmit={save}>
          <Stack gap="lg">
            <TextInput
              label="分类名称"
              required
              maxLength={30}
              value={form.name}
              onChange={(e) => field("name", e.currentTarget.value)}
            />
            <TextInput
              label="访问别名"
              description="用于分类网址，可使用字母、数字、下划线和连字符"
              required
              maxLength={50}
              value={form.alias}
              onChange={(e) => field("alias", e.currentTarget.value)}
            />
            <Textarea
              label="描述"
              value={form.desc}
              onChange={(e) => field("desc", e.currentTarget.value)}
            />
            <Select
              label="父分类"
              data={[
                { value: "0", label: "作为顶级分类" },
                ...rows
                  .filter(
                    (item) =>
                      !item.parent_id &&
                      (editing === "new" || item.id !== editing?.id),
                  )
                  .map((item) => ({
                    value: String(item.id),
                    label: item.name,
                  })),
              ]}
              value={String(form.parent_id)}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  parent_id: Number(value || 0),
                }))
              }
            />
            <NumberInput
              label="显示顺序"
              description="数字越小越靠前"
              allowDecimal={false}
              value={form.order}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  order: Number(value || 0),
                }))
              }
            />
            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => setEditing(null)}
                disabled={busy}
              >
                取消
              </Button>
              <Button type="submit" loading={busy}>
                保存分类
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      <Modal
        opened={!!deleting}
        onClose={() => {
          if (!busy) setDeleting(null);
        }}
        title="删除分类"
        centered
      >
        <Stack>
          <Text>
            确定删除「{deleting?.name}
            」？帖子和图片会保留，所属分类关系会移除。有子分类时需要先处理子分类。
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
              删除分类
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
