import {
  Badge,
  Button,
  Card,
  Dialog,
  Form,
  FormField,
  IconButton,
  Input,
  NumberInput,
  Select,
  Textarea,
  TreeTable,
} from "@robert-stackflow/oneui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Folder, FolderPlus, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { api, json, notifyError, notifySuccess } from "../api";
import { Empty, ErrorState, Loading, PageTitle } from "../components/Common";
import { usePendingChanges } from "../components/PendingChanges";
import { useModelForm } from "../components/useModelForm";
import type { Category } from "../types";
import { flatten } from "../types";
const blank = { name: "", alias: "", desc: "", order: 0, parent_id: 0 };
export default function Categories() {
  const dialogFormId = useId();
  const client = useQueryClient();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/categories"),
  });
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [form, setForm] = useState(blank);
  const sharedForm = useModelForm(form, {
    name: { label: "分类名称", required: true, maxLength: 30 },
    alias: {
      label: "访问别名",
      required: true,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9_-]+$/,
    },
  });
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
    sharedForm.reset(nextForm);
    setInitialForm(nextForm);
  }
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["categories"] }),
      client.invalidateQueries({ queryKey: ["stats"] }),
      client.invalidateQueries({ queryKey: ["posts"] }),
    ]);
  }
  async function save() {
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
  const data = categories.data?.data || [];
  return (
    <>
      <PageTitle title="分类管理">
        <Button variant="primary" onClick={() => edit("new")}>
          <Plus />
          新建分类
        </Button>
      </PageTitle>
      {categories.isPending ? (
        <Loading />
      ) : categories.error ? (
        <ErrorState error={categories.error} retry={categories.refetch} />
      ) : !data.length ? (
        <Card>
          <Empty title="还没有分类" description="为照片创建第一个分类。" />
        </Card>
      ) : (
        <TreeTable
          rows={data}
          label="分类与层级"
          rowKey={(item) => item.id}
          rowLabel={(item) => item.name}
          getChildren={(item) => item.children}
          expanded={data
            .filter((item) => !collapsed.includes(item.id))
            .map((item) => item.id)}
          onExpandedChange={(keys) =>
            setCollapsed(
              data
                .filter((item) => !keys.includes(item.id))
                .map((item) => item.id),
            )
          }
          columns={[
            {
              key: "name",
              title: "分类与层级",
              render: (item) => (
                <div className="category-label">
                  <span className="category-symbol">
                    {item.parent_id ? <Tag /> : <Folder />}
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    {!!item.children?.length && (
                      <Badge>{item.children.length}</Badge>
                    )}
                    <small>
                      {item.parent_id
                        ? "属于 " +
                          rows.find((parent) => parent.id === item.parent_id)
                            ?.name
                        : "主分类"}
                    </small>
                  </span>
                </div>
              ),
            },
            {
              key: "path",
              title: "访问路径",
              render: (item) => <span className="muted">/{item.alias}</span>,
            },
            {
              key: "order",
              title: "排序",
              width: 80,
              render: (item) => item.order,
            },
            {
              key: "actions",
              title: "操作",
              align: "right",
              width: 156,
              render: (item) => (
                <div className="row-actions">
                  {!item.parent_id && (
                    <IconButton
                      label={"在 " + item.name + " 下添加分类"}
                      variant="ghost"
                      onClick={() => edit("new", item.id)}
                    >
                      <FolderPlus />
                    </IconButton>
                  )}
                  <IconButton
                    label={"编辑 " + item.name}
                    variant="ghost"
                    onClick={() => edit(item)}
                  >
                    <Pencil />
                  </IconButton>
                  <IconButton
                    label={"删除 " + item.name}
                    variant="danger"
                    onClick={() => setDeleting(item)}
                  >
                    <Trash2 />
                  </IconButton>
                </div>
              ),
            },
          ]}
        />
      )}
      <Dialog
        open={!!editing}
        onClose={() => !busy && setEditing(null)}
        busy={busy}
        title={editing === "new" ? "新建分类" : "编辑分类"}
        variant="form"
        footer={
          <>
            <Button disabled={busy} onClick={() => setEditing(null)}>
              取消
            </Button>
            <Button
              type="submit"
              form={dialogFormId}
              variant="primary"
              loading={busy}
            >
              保存分类
            </Button>
          </>
        }
      >
        <Form controller={sharedForm} onSubmit={save} id={dialogFormId}>
          <div className="ui-stack form-fields">
            <Input
              {...sharedForm.field("name")}
              label="分类名称"
              required
              maxLength={30}
              value={form.name}
              onChange={(event) => field("name", event.currentTarget.value)}
            />
            <Input
              {...sharedForm.field("alias")}
              label="访问别名"
              hint="字母、数字、下划线或连字符"
              required
              maxLength={50}
              value={form.alias}
              onChange={(event) => field("alias", event.currentTarget.value)}
            />
            <Textarea
              label="描述"
              value={form.desc}
              onChange={(event) => field("desc", event.currentTarget.value)}
            />
            <FormField label="父分类">
              <Select
                label="父分类"
                value={String(form.parent_id)}
                onChange={(value) => field("parent_id", Number(value))}
                options={[
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
              />
            </FormField>
            <FormField label="显示顺序">
              <NumberInput
                label="显示顺序"
                value={form.order}
                onChange={(value) => field("order", value)}
              />
            </FormField>
          </div>
        </Form>
      </Dialog>
      <Dialog
        open={!!deleting}
        onClose={() => !busy && setDeleting(null)}
        busy={busy}
        title="删除分类"
        variant="confirm"
        footer={
          <>
            <Button
              disabled={busy}
              onClick={() => setDeleting(null)}
              data-dialog-initial-focus
            >
              取消
            </Button>
            <Button
              loading={busy}
              variant="danger"
              onClick={() => void remove()}
            >
              删除分类
            </Button>
          </>
        }
      >
        <p>
          删除「{deleting?.name}」？子分类会一起删除，帖子会保留并移除此分类。
        </p>
      </Dialog>
    </>
  );
}
