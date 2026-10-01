import {
  EntryList,
  type Entry,
  type EditableEntry,
} from "../components/EntryList";
import { Toggle as Switch } from "../components/Toggle";
import { lazy, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Collapse,
  Radio,
  SimpleGrid,
  Button,
  Group,
  NavLink,
  NumberInput,
  Paper,
  PasswordInput,
  Select,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { NavLink as RouterLink, Navigate, useParams } from "react-router-dom";
import {
  Code2,
  Cloud,
  HardDrive,
  Database,
  Globe,
  Image,
  Save,
  Archive,
} from "lucide-react";
import { api, json, notifyError, notifySuccess } from "../api";
import { ErrorState, Loading, PageTitle } from "../components/Common";
import { UnsavedChanges } from "../components/UnsavedChanges";
import { Brand, brandIcon, brandAppleIcon } from "../components/Brand";
import { orders } from "../types";
import type { Section, Settings } from "../types";

interface Field {
  key: string;
  label: string;
  description?: string;
  kind?: "text" | "textarea" | "number" | "switch" | "password" | "select";
  options?: { value: string; label: string }[];
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
      <div className="settings-layout">
        <Paper withBorder p="xs" className="settings-navigation">
          {sections.map(({ key, label, icon: Icon }) => (
            <NavLink
              key={key}
              component={RouterLink}
              to={`/settings/${key}`}
              label={label}
              leftSection={<Icon size={18} />}
              active={selected === key}
              className="studio-nav"
            />
          ))}
        </Paper>
        {selected === "backups" ? (
          <Backups />
        ) : (
          <SettingsForm
            key={selected}
            section={selected}
            initial={settings.data.data[selected]}
          />
        )}
      </div>
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
  async function save(event: React.FormEvent) {
    event.preventDefault();
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
    const value = values[field.key];
    const isCredential = field.kind === "password";
    const configured = initial[`${field.key}_configured`] === true;
    return (
      <div
        className={`setting-row ${
          field.kind === "textarea" ? "setting-wide" : ""
        }`}
        key={field.key}
      >
        <div>
          <Text fw={500} size="sm" id={`label-${field.key}`}>
            {field.label}
          </Text>
          <Text size="xs" c="dimmed" mt={5}>
            {isCredential && configured
              ? "已配置。留空保留当前凭据。"
              : field.description}
          </Text>
        </div>
        <div>
          {field.kind === "switch" ? (
            <Switch
              aria-labelledby={`label-${field.key}`}
              checked={value === true}
              onChange={(e) => set(field.key, e.currentTarget.checked)}
            />
          ) : field.kind === "number" ? (
            <NumberInput
              aria-labelledby={`label-${field.key}`}
              value={Number(value) || 0}
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
              onChange={(value) => set(field.key, Number(value || 0))}
            />
          ) : field.kind === "select" ? (
            <Select
              aria-labelledby={`label-${field.key}`}
              data={field.options}
              value={String(value)}
              allowDeselect={false}
              onChange={(value) => set(field.key, value)}
            />
          ) : isCredential ? (
            <PasswordInput
              aria-labelledby={`label-${field.key}`}
              value={String(value)}
              autoComplete="off"
              placeholder={configured ? "已配置，输入以替换" : "尚未配置"}
              onChange={(e) => set(field.key, e.currentTarget.value)}
            />
          ) : field.kind === "textarea" ? (
            <Textarea
              aria-labelledby={`label-${field.key}`}
              value={String(value)}
              autosize
              minRows={field.key.startsWith("custom_") ? 6 : 3}
              onChange={(e) => set(field.key, e.currentTarget.value)}
            />
          ) : (
            <TextInput
              aria-labelledby={`label-${field.key}`}
              value={String(value)}
              onChange={(e) => set(field.key, e.currentTarget.value)}
            />
          )}
        </div>
      </div>
    );
  }
  return (
    <Paper withBorder style={{ overflow: "hidden" }}>
      <form onSubmit={save}>
        <UnsavedChanges dirty={dirty} />
        {section === "storage" ? (
          <>
            <div className="storage-provider-section">
              <Title order={4}>存储方式</Title>
              <Text c="dimmed" size="sm" mt={6} mb={20}>
                选择新上传照片的存储方式，已有照片地址保持有效。
              </Text>
              <Radio.Group
                name="storage-provider"
                value={String(values.provider)}
                onChange={(value) => set("provider", value)}
                aria-label="图片存储方式"
              >
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={12}>
                  <Radio.Card value="local" className="storage-provider-card">
                    <Group justify="space-between">
                      <span className="storage-provider-icon">
                        <HardDrive size={21} />
                      </span>
                      <Radio.Indicator />
                    </Group>
                    <Text fw={600} mt={14}>
                      本地存储
                    </Text>
                    <Text size="xs" c="dimmed" mt={5}>
                      照片保存在当前服务器
                    </Text>
                  </Radio.Card>
                  <Radio.Card value="s3" className="storage-provider-card">
                    <Group justify="space-between">
                      <span className="storage-provider-icon">
                        <Cloud size={22} />
                      </span>
                      <Radio.Indicator />
                    </Group>
                    <Text fw={600} mt={14}>
                      S3 对象存储
                    </Text>
                    <Text size="xs" c="dimmed" mt={5}>
                      连接 S3 兼容的云存储服务
                    </Text>
                  </Radio.Card>
                </SimpleGrid>
              </Radio.Group>
            </div>
            <div className="storage-common-fields">
              {fields.storage
                .filter((field) =>
                  ["enable_storage", "max_size", "path"].includes(field.key),
                )
                .map(renderField)}
            </div>
            <Collapse in={values.provider === "s3"} transitionDuration={200}>
              <div className="storage-connection">
                {fields.storage
                  .filter((field) =>
                    [
                      "endpoint",
                      "region",
                      "bucket",
                      "prefix",
                      "access_id",
                      "secret_key",
                      "timeout_time",
                    ].includes(field.key),
                  )
                  .map(renderField)}
              </div>
            </Collapse>
          </>
        ) : (
          <>
            {section === "meta" && (
              <div className="brand-setting">
                <Brand size={44} />
                <div>
                  <Text fw={600} size="sm">
                    Moment 新图标
                  </Text>
                  <Text size="xs" c="dimmed" mt={3}>
                    用于浏览器标签页和相册标识
                  </Text>
                </div>
                <Button
                  variant="light"
                  size="xs"
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
                  使用新图标
                </Button>
              </div>
            )}
            {fields[section].map(renderField)}
          </>
        )}

        {section === "meta" && (
          <EntryList
            entries={entries}
            onChange={(next) => {
              setEntries(next);
              setDirty(true);
            }}
          />
        )}
        <div className="save-bar">
          <Text size="xs" c="dimmed">
            {dirty ? "有尚未保存的修改" : "设置已同步"}
          </Text>
          <Button
            type="submit"
            loading={busy}
            disabled={!dirty}
            leftSection={<Save size={16} />}
          >
            保存设置
          </Button>
        </div>
      </form>
    </Paper>
  );
}
