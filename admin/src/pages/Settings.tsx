import {
  Button,
  Card,
  Form,
  FormField,
  NumberInput,
  PasswordField,
  SelectSettingRow,
  SettingRow,
  SwitchSettingRow,
  TextSettingRow,
  TextAreaSettingRow,
  Textarea,
} from "@robert-stackflow/oneui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Code2, Database, Globe, Image, Save } from "lucide-react";
import { lazy, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { api, json, notifyError, notifySuccess } from "../api";
import { brandAppleIcon, brandIcon } from "../components/Brand";
import { ErrorState, Loading, PageTitle } from "../components/Common";
import {
  EntryList,
  type EditableEntry,
  type Entry,
} from "../components/EntryList";
import { PreferencesLayout } from "../components/PreferencesLayout";
import { UnsavedChanges } from "../components/UnsavedChanges";
import { useModelForm } from "../components/useModelForm";
import type { Section, Settings } from "../types";
import { orders } from "../types";
import { selectOptions } from "../ui-data";
interface Field {
  key: string;
  label: string;
  description?: string;
  kind?: "text" | "textarea" | "number" | "switch" | "password" | "select";
  options?: {
    value: string;
    label: string;
  }[];
  fallback?: unknown;
}
const Backups = lazy(() => import("./Backups"));
const sections = [
  { key: "meta", label: "网站信息", icon: Globe },
  { key: "content", label: "相册展示", icon: Image },
  { key: "storage", label: "图片存储", icon: Database },
  { key: "general", label: "个性化", icon: Code2 },
  { key: "backups", label: "备份与恢复", icon: Archive },
] as const;
const fields: Record<Section, Field[]> = {
  meta: [
    { key: "site_name", label: "网站名称" },
    { key: "site_desc", label: "网站描述", kind: "textarea" },
    { key: "site_url", label: "网站地址" },
    { key: "site_keywords", label: "搜索关键词" },
    { key: "site_splitter", label: "标题分隔符", fallback: "|" },
    { key: "primary_color", label: "相册主题色", description: "例如 #4059aa" },
    { key: "site_icon", label: "网站图标地址" },
    { key: "site_apple_icon", label: "Apple 图标地址" },
    { key: "bottom_icon", label: "底栏图标地址" },
    { key: "bottom_desc", label: "底栏描述" },
    { key: "icp", label: "ICP备案号" },
  ],
  content: [
    {
      key: "map_enabled",
      label: "地图浏览",
      description: "仅展示明确公开的坐标；关闭后同时停用地图接口",
      kind: "switch",
      fallback: true,
    },
    {
      key: "timeline_enabled",
      label: "拍摄时间线",
      description: "按照片拍摄时间排列，可在帖子或照片中单独排除",
      kind: "switch",
      fallback: true,
    },
    {
      key: "local_thumbnails",
      label: "自动生成本地缩略图",
      kind: "switch",
      fallback: true,
      description: "加快照片墙和后台预览；保留原图，远程照片沿用图片处理后缀",
    },
    { key: "page_size", label: "每页帖子数量", kind: "number", fallback: 20 },
    {
      key: "order_option",
      label: "默认排序",
      kind: "select",
      options: orders,
      fallback: "meta_time_desc",
    },
    {
      key: "thumbnail_suffix",
      label: "缩略图处理后缀",
      description: "保留原有图片服务的处理参数",
    },
    { key: "detail_suffix", label: "详情图处理后缀" },
    {
      key: "thumbnail_show_location",
      label: "缩略图显示地点",
      kind: "switch",
      fallback: true,
    },
    {
      key: "thumbnail_show_time",
      label: "缩略图显示时间",
      kind: "switch",
      fallback: true,
    },
    {
      key: "thumbnail_time_format",
      label: "缩略图时间格式",
      fallback: "YYYY-MM-DD",
    },
    {
      key: "detail_show_location",
      label: "详情显示地点",
      kind: "switch",
      fallback: true,
    },
    {
      key: "detail_show_time",
      label: "详情显示时间",
      kind: "switch",
      fallback: true,
    },
    {
      key: "detail_time_format",
      label: "详情时间格式",
      fallback: "YYYY-MM-DD HH:mm:ss",
    },
  ],
  storage: [
    {
      key: "enable_storage",
      label: "允许上传图片",
      kind: "switch",
      fallback: true,
    },
    {
      key: "provider",
      label: "存储方式",
      kind: "select",
      options: [
        { value: "s3", label: "S3 兼容存储" },
        { value: "local", label: "服务器本地存储" },
      ],
      fallback: "local",
    },
    {
      key: "max_size",
      label: "单张图片大小上限",
      description: "单位 MB，最大 256 MB",
      kind: "number",
      fallback: 32,
    },
    {
      key: "timeout_time",
      label: "S3 上传超时",
      description: "单位秒，范围 5 到 600",
      kind: "number",
      fallback: 120,
    },
    {
      key: "endpoint",
      label: "S3 Endpoint",
      description: "S3 兼容服务的完整地址",
    },
    { key: "region", label: "区域", fallback: "us-east-1" },
    { key: "bucket", label: "存储桶" },
    {
      key: "access_id",
      label: "Access Key ID",
      kind: "password",
      description: "留空保留当前凭据",
    },
    {
      key: "secret_key",
      label: "Secret Access Key",
      kind: "password",
      description: "留空保留当前凭据",
    },
    {
      key: "prefix",
      label: "公共访问前缀",
      description: "图片对外访问的 HTTP 或 HTTPS 地址",
    },
    {
      key: "path",
      label: "上传路径模板",
      description:
        "支持 {year}、{month}、{day}、{timestamp}、{filename}；文件名会自动添加随机标识",
      fallback: "{year}/{month}/{filename}",
    },
  ],
  general: [
    {
      key: "custom_css",
      label: "相册自定义 CSS",
      kind: "textarea",
      description: "仅应用于公开相册，不应用于管理后台",
    },
    {
      key: "custom_js",
      label: "相册自定义 JavaScript",
      kind: "textarea",
      description: "在公开相册页面执行，请只使用可信脚本",
    },
  ],
};
export default function SettingsPage() {
  const { section } = useParams();
  const navigate = useNavigate();
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/settings"),
  });
  if (!sections.some((item) => item.key === section))
    return <Navigate to="/settings/meta" replace />;
  if (settings.isPending) return <Loading />;
  if (settings.error)
    return <ErrorState error={settings.error} retry={settings.refetch} />;
  const selected = section as Section | "backups";
  return (
    <>
      <PageTitle title="网站设置" />
      <PreferencesLayout
        label="网站设置导航"
        active={`/settings/${selected}`}
        onNavigate={navigate}
        groups={[
          {
            id: "site",
            items: sections
              .filter((item) => ["meta", "content"].includes(item.key))
              .map(({ key, label, icon: Icon }) => ({
                id: `/settings/${key}`,
                path: `/settings/${key}`,
                label,
                icon: <Icon />,
              })),
          },
          {
            id: "data",
            label: "数据",
            items: sections
              .filter((item) => ["storage", "backups"].includes(item.key))
              .map(({ key, label, icon: Icon }) => ({
                id: `/settings/${key}`,
                path: `/settings/${key}`,
                label,
                icon: <Icon />,
              })),
          },
          {
            id: "advanced",
            label: "高级",
            items: sections
              .filter((item) => item.key === "general")
              .map(({ key, label, icon: Icon }) => ({
                id: `/settings/${key}`,
                path: `/settings/${key}`,
                label,
                icon: <Icon />,
              })),
          },
        ]}
      >
        {selected === "backups" ? (
          <Backups />
        ) : (
          <SettingsForm
            key={selected}
            section={selected}
            initial={settings.data.data[selected]}
          />
        )}
      </PreferencesLayout>
    </>
  );
}
function SettingsForm({
  section,
  initial,
}: {
  section: Section;
  initial: Record<string, unknown>;
}) {
  const client = useQueryClient();
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(
      fields[section].map((field) => [
        field.key,
        initial[field.key] ?? field.fallback ?? "",
      ]),
    ),
  );
  const sharedForm = useModelForm(
    values,
    Object.fromEntries(
      fields[section]
        .filter((field) => field.kind === "number")
        .map((field) => [
          field.key,
          {
            label: field.label,
            min:
              field.key === "max_size"
                ? 0.1
                : field.key === "timeout_time"
                  ? 5
                  : 1,
            max:
              field.key === "max_size"
                ? 256
                : field.key === "timeout_time"
                  ? 600
                  : 100,
          },
        ]),
    ),
  );
  const [entries, setEntries] = useState<EditableEntry[]>(
    (Array.isArray(initial.entries) ? (initial.entries as Entry[]) : []).map(
      (entry) => ({ ...entry, _key: crypto.randomUUID() }),
    ),
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  function set(key: string, value: unknown) {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }
  async function save() {
    setBusy(true);
    try {
      await api(
        `/settings/${section}`,
        json(
          "PATCH",
          section === "meta"
            ? { ...values, entries: entries.map(({ _key, ...entry }) => entry) }
            : values,
        ),
      );
      setDirty(false);
      setValues((current) =>
        section === "storage"
          ? { ...current, access_id: "", secret_key: "" }
          : current,
      );
      await client.invalidateQueries({ queryKey: ["settings"] });
      notifySuccess();
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy(false);
    }
  }
  function renderField(field: Field) {
    const value = values[field.key],
      control = sharedForm.field(field.key);
    const credential = field.kind === "password",
      configured = initial[field.key + "_configured"] === true;
    const description =
      credential && configured ? "已配置，留空保留当前凭据" : field.description;
    const common = { title: field.label, description };
    if (field.kind === "switch")
      return (
        <SwitchSettingRow
          key={field.key}
          {...common}
          {...control}
          checked={value === true}
          onChange={(next) => set(field.key, next)}
        />
      );
    if (field.kind === "select")
      return (
        <SelectSettingRow
          key={field.key}
          {...common}
          {...control}
          options={selectOptions(field.options)}
          value={String(value ?? "")}
          onChange={(next) => set(field.key, next)}
        />
      );
    if (field.kind === "textarea")
      return (
        <TextAreaSettingRow
          key={field.key}
          {...common}
          {...control}
          align="start"
          controlWidth="100%"
          value={String(value ?? "")}
          rows={3}
          onChange={(next) => set(field.key, next)}
        />
      );
    if (field.kind !== "number" && !credential)
      return (
        <TextSettingRow
          key={field.key}
          {...common}
          {...control}
          controlWidth="100%"
          value={String(value ?? "")}
          onChange={(next) => set(field.key, next)}
        />
      );
    const descriptionId = description ? `${control.id}-description` : undefined;
    return (
      <SettingRow
        key={field.key}
        {...common}
        controlId={control.id}
        descriptionId={descriptionId}
        controlWidth={credential ? "100%" : 180}
      >
        <FormField {...control} aria-describedby={descriptionId}>
          {credential ? (
            <PasswordField
              value={String(value ?? "")}
              onChange={(next) => set(field.key, next)}
              autoComplete="off"
              placeholder={configured ? "已配置，输入以替换" : "尚未配置"}
            />
          ) : (
            <NumberInput
              label={field.label}
              fullWidth
              step={field.key === "max_size" ? 0.1 : 1}
              min={
                field.key === "max_size"
                  ? 0.1
                  : field.key === "timeout_time"
                    ? 5
                    : 1
              }
              max={
                field.key === "max_size"
                  ? 256
                  : field.key === "timeout_time"
                    ? 600
                    : 100
              }
              value={Number(value) || 0}
              onChange={(next) => set(field.key, next)}
            />
          )}
        </FormField>
      </SettingRow>
    );
  }
  const group = (title: string, items: Field[], action?: React.ReactNode) => (
    <Card title={title} action={action}>
      <div className="settings-rows">{items.map(renderField)}</div>
    </Card>
  );
  const iconKeys = [
      "primary_color",
      "site_icon",
      "site_apple_icon",
      "bottom_icon",
    ],
    footerKeys = ["bottom_desc", "icp"];
  return (
    <div className="settings-form">
      <Form controller={sharedForm} onSubmit={save}>
        <UnsavedChanges dirty={dirty} />
        <div className="settings-groups">
          {section === "meta" ? (
            <>
              {group(
                "网站信息",
                fields.meta.filter(
                  (field) => ![...iconKeys, ...footerKeys].includes(field.key),
                ),
              )}
              {group(
                "外观与图标",
                fields.meta.filter((field) => iconKeys.includes(field.key)),
                <Button
                  size="small"
                  onClick={() => {
                    setValues((current) => ({
                      ...current,
                      site_icon: brandIcon,
                      site_apple_icon: brandAppleIcon,
                      bottom_icon: brandIcon,
                    }));
                    setDirty(true);
                  }}
                >
                  使用 Moment 图标
                </Button>,
              )}
              {group(
                "页脚",
                fields.meta.filter((field) => footerKeys.includes(field.key)),
              )}
              <EntryList
                entries={entries}
                onChange={(next) => {
                  setEntries(next);
                  setDirty(true);
                }}
              />
            </>
          ) : section === "storage" ? (
            <>
              {group(
                "图片上传",
                ["provider", "enable_storage", "max_size", "path"].map(
                  (key) => fields.storage.find((field) => field.key === key)!,
                ),
              )}
              {values.provider === "s3" &&
                group(
                  "S3 连接",
                  fields.storage.filter(
                    (field) =>
                      ![
                        "provider",
                        "enable_storage",
                        "max_size",
                        "path",
                      ].includes(field.key),
                  ),
                )}
            </>
          ) : section === "content" ? (
            <>
              {group(
                "浏览入口",
                fields.content.filter((field) =>
                  ["map_enabled", "timeline_enabled"].includes(field.key),
                ),
              )}
              {group(
                "照片墙",
                fields.content.filter((field) =>
                  [
                    "page_size",
                    "order_option",
                    "thumbnail_show_location",
                    "thumbnail_show_time",
                    "thumbnail_time_format",
                  ].includes(field.key),
                ),
              )}
              {group(
                "照片详情",
                fields.content.filter((field) =>
                  [
                    "detail_show_location",
                    "detail_show_time",
                    "detail_time_format",
                  ].includes(field.key),
                ),
              )}
              {group(
                "图片加载",
                fields.content.filter((field) =>
                  [
                    "local_thumbnails",
                    "thumbnail_suffix",
                    "detail_suffix",
                  ].includes(field.key),
                ),
              )}
            </>
          ) : (
            fields.general.map((field) => (
              <Card
                key={field.key}
                title={field.label}
                description={field.description}
              >
                <Textarea
                  {...sharedForm.field(field.key)}
                  aria-label={field.label}
                  rows={10}
                  value={String(values[field.key] ?? "")}
                  onChange={(event) =>
                    set(field.key, event.currentTarget.value)
                  }
                />
              </Card>
            ))
          )}
        </div>
        <div className="form-actions">
          <span className="muted">
            {dirty ? "有尚未保存的修改" : "设置已同步"}
          </span>
          <Button
            type="submit"
            loading={busy}
            disabled={!dirty}
            variant="primary"
          >
            <Save size={16} />
            保存设置
          </Button>
        </div>
      </Form>
    </div>
  );
}
