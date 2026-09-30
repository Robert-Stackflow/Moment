import { useEffect, useRef, useState } from "react";
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
  Progress,
  Select,
  SimpleGrid,
  Stack,
  TagsInput,
  Text,
  TextInput,
} from "@mantine/core";
import {
  Check,
  History,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { api, ApiError, json, notifyError, notifySuccess } from "../api";
import { Empty, ErrorState, Loading, PageTitle } from "../components/Common";
import { OrganizeTabs } from "../components/OrganizeTabs";
import { PhotoHistory } from "../components/PhotoHistory";
import { Toggle } from "../components/Toggle";
import { UnsavedChanges } from "../components/UnsavedChanges";
import {
  TagModel,
  type ModelProgress,
  type TagSuggestion,
} from "../lib/tag-model";
import { photoQueries } from "../lib/photo-actions";
import { thumbnail, type Settings } from "../types";

interface TagPhoto {
  id: number;
  post_id: number;
  post_title: string;
  image_url: string;
  revision: number;
  tags: string[];
  is_hidden: boolean;
  post_hidden: boolean;
}
interface Review {
  photo: TagPhoto;
  suggestions: TagSuggestion[];
  tags: string[];
  state: "queued" | "done" | "error";
  error?: string;
  blocked?: boolean;
}
const pageSize = 12;
const normalize = (tag: string) => tag.normalize("NFKC").trim().toLowerCase();
function invalidTags(tags: string[]) {
  return (
    tags.length > 20 ||
    tags.some(
      (tag) =>
        !normalize(tag) ||
        [...normalize(tag)].length > 32 ||
        /\p{Cc}/u.test(tag),
    )
  );
}
function message(error: unknown) {
  return error instanceof TypeError
    ? "连接中断，请恢复网络后重试。已选标签仍保留。"
    : error instanceof Error
    ? error.message
    : "操作未完成，请重试";
}
const operationID = () => crypto.randomUUID().replaceAll("-", "");

export default function SmartTags() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [q] = useDebouncedValue(search, 250);
  const [untagged, setUntagged] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<number, TagPhoto>>({});
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [consent, setConsent] = useState(false);
  const [source, setSource] = useState<"remote" | "local">("remote");
  const [remote, setRemote] = useState(false);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState<ModelProgress | null>(null);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [history, setHistory] = useState(false);
  const [cacheDialog, setCacheDialog] = useState(false);
  const [cacheBusy, setCacheBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const model = useRef<TagModel | null>(null);
  const saveLock = useRef(false);
  const receipt = useRef<{ key: string; id: string } | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
      model.current?.close();
    };
  }, []);
  useEffect(() => {
    const control = new AbortController();
    fetch(import.meta.env.BASE_URL + "tag-model/local/manifest.json", {
      signal: control.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((value) => {
        if (
          !control.signal.aborted &&
          value?.revision === "d15189d7028b43f1d3e65039190477f6af591c2a"
        )
          setSource("local");
      })
      .catch(() => {});
    return () => control.abort();
  }, []);
  const photos = useQuery({
    queryKey: ["tagPhotos", q, untagged, page],
    queryFn: ({ signal }) =>
      api<TagPhoto[]>(
        `/photo-tags/photos?${new URLSearchParams({
          q,
          untagged: String(untagged),
          page: String(page),
          page_size: String(pageSize),
        })}`,
        { signal, preserveEditorOnUnauthorized: true },
      ),
    staleTime: 0,
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/settings"),
  });
  const rows = photos.data?.data || [];
  const selectedCount = Object.keys(selected).length;
  const locked = running || saving || refreshing;
  const targets = reviews
    .filter((r) => !r.blocked && r.tags.length)
    .map((r) => ({
      id: r.photo.id,
      revision: r.photo.revision,
      image_url: r.photo.image_url,
      tags: [...new Set(r.tags.map(normalize))].filter(
        (tag) => !r.photo.tags.includes(tag),
      ),
    }))
    .filter((target) => target.tags.length > 0);
  const badTags = reviews.some((r) =>
    invalidTags([...new Set([...r.photo.tags, ...r.tags.map(normalize)])]),
  );
  const pending = reviews.filter((r) => r.state !== "done" && !r.blocked);
  function choose(photo: TagPhoto, checked: boolean) {
    if (reviews.length || locked) return;
    if (checked && selectedCount >= 50) {
      notifyError(new Error("每次最多选择 50 张照片"));
      return;
    }
    setSelected((current) => {
      const next = { ...current };
      if (checked) next[photo.id] = photo;
      else delete next[photo.id];
      return next;
    });
  }
  function beginReview(): Review[] {
    const values = Object.values(selected).map((photo) => ({
      photo,
      suggestions: [],
      tags: [],
      state: "queued" as const,
    }));
    setReviews(values);
    setReviewPage(1);
    setError("");
    setConflict(false);
    setReviewOpen(true);
    return values;
  }
  function changeTags(id: number, tags: string[]) {
    setReviews((current) =>
      current.map((r) => (r.photo.id === id ? { ...r, tags } : r)),
    );
  }
  async function recognize() {
    if (controller.current || saveLock.current) return;
    const values = reviews.length ? reviews : beginReview();
    const todo = values.filter((r) => r.state !== "done" && !r.blocked);
    if (!todo.length) return;
    const control = new AbortController();
    controller.current = control;
    setConsent(false);
    setReviewOpen(true);
    setRunning(true);
    setError("");
    setPhase("准备识别模型…");
    setProgress(null);
    setProcessed(0);
    setTotal(todo.length);
    let engine: TagModel | null = null;
    try {
      if (!globalThis.Worker || !globalThis.WebAssembly || !crypto.subtle)
        throw new Error(
          "当前浏览器不支持本地识别，请使用新版浏览器并通过 HTTPS 或 localhost 访问；也可以手动添加标签。",
        );
      // Construct only after the explicit start action; no background model download.
      engine = new TagModel();
      model.current = engine;
      engine.onProgress = (p) => {
        if (!control.signal.aborted) {
          setPhase(p.loaded >= p.total ? "正在准备模型…" : "正在下载模型…");
          setProgress(p);
        }
      };
      try {
        await engine.load(source);
      } catch (cause) {
        if (control.signal.aborted) throw cause;
        throw new Error(
          source === "local"
            ? "站点模型未就绪或加载失败，请联系管理员部署模型，或切换在线下载后重试。也可以手动添加标签。"
            : "模型下载或初始化失败，请检查网络与浏览器可用内存后重试。也可以改用站点模型或手动添加标签。",
        );
      }
      for (
        let index = 0;
        index < todo.length && !control.signal.aborted;
        index++
      ) {
        const item = todo[index];
        setPhase(`正在识别 ${index + 1} / ${todo.length} 张`);
        try {
          const response = await fetch("/api/admin/photo-tags/preview", {
            ...json("POST", {
              id: item.photo.id,
              image_url: item.photo.image_url,
              remote,
            }),
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            signal: control.signal,
          });
          if (!response.ok) {
            const data = await response.json().catch(() => null);
            throw new ApiError(response.status, data?.msg || "无法读取照片");
          }
          const blob = await response.blob();
          if (control.signal.aborted) break;
          const suggestions = await engine.infer(blob);
          if (control.signal.aborted) break;
          setReviews((current) =>
            current.map((r) =>
              r.photo.id === item.photo.id
                ? { ...r, suggestions, state: "done", error: undefined }
                : r,
            ),
          );
        } catch (cause) {
          if (control.signal.aborted) break;
          setReviews((current) =>
            current.map((r) =>
              r.photo.id === item.photo.id
                ? {
                    ...r,
                    state: "error",
                    error:
                      cause instanceof ApiError
                        ? cause.message
                        : "这张照片未能完成识别，可重试或手动添加标签。",
                  }
                : r,
            ),
          );
          if (cause instanceof ApiError && cause.status === 401) {
            throw new Error(
              "登录已过期，请在另一个窗口重新登录后重试；当前候选与选择仍保留。",
            );
          }
          // A failed model session cannot be safely reused for later images.
          if (!(cause instanceof ApiError || cause instanceof TypeError))
            throw new Error(
              "识别已中断，请关闭其他占用内存的页面后重试。已完成的候选与选择仍保留。",
            );
        }
        setProcessed(index + 1);
      }
    } catch (cause) {
      if (!control.signal.aborted && mounted.current) setError(message(cause));
    } finally {
      try {
        await engine?.dispose();
      } catch {
        engine?.close();
      }
      if (controller.current === control) {
        controller.current = null;
        model.current = null;
      }
      if (mounted.current) {
        setRunning(false);
        setPhase("");
        setProgress(null);
      }
    }
  }
  function stop() {
    controller.current?.abort();
    model.current?.close();
  }
  async function refreshVersions() {
    if (locked) return;
    setRefreshing(true);
    setError("");
    try {
      const result = await api<TagPhoto[]>(
        `/photo-tags/photos?ids=${reviews
          .map((r) => r.photo.id)
          .join(",")}&page_size=50`,
        { preserveEditorOnUnauthorized: true },
      );
      const current = new Map(result.data.map((p) => [p.id, p]));
      setReviews((values) =>
        values.map((r) => {
          const photo = current.get(r.photo.id);
          return photo && photo.image_url === r.photo.image_url
            ? {
                ...r,
                photo,
                blocked: false,
                tags: r.tags.filter(
                  (tag) => !photo.tags.includes(normalize(tag)),
                ),
              }
            : {
                ...r,
                blocked: true,
                error: "照片已替换或移入回收站，请移除此项后重新选择照片。",
              };
        }),
      );
      setConflict(false);
      receipt.current = null;
      notifySuccess("已更新版本与现有标签，请核对后再保存");
    } catch (cause) {
      setError(message(cause));
    } finally {
      setRefreshing(false);
    }
  }
  async function save() {
    if (saveLock.current || running || !targets.length || badTags) return;
    saveLock.current = true;
    setSaving(true);
    setError("");
    const key = JSON.stringify(targets);
    if (receipt.current?.key !== key)
      receipt.current = { key, id: operationID() };
    try {
      await api("/photo-tags/apply", {
        ...json("POST", { id: receipt.current.id, targets, confirm: true }),
        preserveEditorOnUnauthorized: true,
      });
      setConfirm(false);
      setReviewOpen(false);
      setReviews([]);
      setSelected({});
      setConflict(false);
      receipt.current = null;
      await Promise.all(
        photoQueries.map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
      notifySuccess(
        `已为 ${targets.length} 张照片保存标签，可在处理记录中撤销`,
      );
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 401
          ? "登录已过期，请在另一个窗口重新登录后重试；当前标签仍保留。"
          : message(cause),
      );
      setConflict(cause instanceof ApiError && cause.status === 409);
      setConfirm(false);
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }
  async function clearCache() {
    setCacheBusy(true);
    try {
      if (!globalThis.caches) throw new Error("当前浏览器不提供模型缓存管理");
      await caches.delete("moment-tag-model-v1");
      setCacheDialog(false);
      notifySuccess("已清除本浏览器的模型缓存，下次识别会重新下载");
    } catch (cause) {
      notifyError(cause);
    } finally {
      setCacheBusy(false);
    }
  }
  const progressView = running && (
    <Paper withBorder p="md" className="tag-progress">
      <Group justify="space-between">
        <Text size="sm" role="status">
          {phase}
        </Text>
        <Button variant="subtle" size="xs" onClick={stop}>
          取消识别
        </Button>
      </Group>
      <Progress
        mt="sm"
        size={5}
        aria-label="识别进度"
        value={
          phase.includes("识别")
            ? (processed / Math.max(1, total)) * 100
            : progress && progress.total > 0
            ? (progress.loaded / progress.total) * 100
            : 0
        }
        animated
      />
      <Text size="xs" c="dimmed" mt={6}>
        {phase.includes("识别")
          ? "照片只在当前浏览器分析，完成的候选会保留。"
          : progress
          ? `${Math.round(progress.loaded / 1e6)} / ${Math.round(
              progress.total / 1e6,
            )} MB · 首次准备可能需要一些时间`
          : "首次使用需要下载模型，页面仍可操作。"}
      </Text>
    </Paper>
  );
  return (
    <>
      <UnsavedChanges
        dirty={!!selectedCount || !!reviews.length || running || saving}
        message="候选标签尚未保存，离开会清空选择并停止识别；已经保存的标签不受影响。"
      />
      <PageTitle title="智能标签">
        <Button
          variant="default"
          leftSection={<History size={16} />}
          onClick={() => setHistory(true)}
          disabled={locked}
        >
          处理记录
        </Button>
      </PageTitle>
      <OrganizeTabs />
      <Paper withBorder p="lg" mb="lg">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text fw={600}>用标签整理照片</Text>
            <Text size="sm" c="dimmed" mt={5}>
              本地识别后逐项确认。标签仅用于后台搜索，不会公开展示。
            </Text>
          </div>
          <ActionIcon
            variant="subtle"
            aria-label="清除识别模型缓存"
            disabled={locked}
            onClick={() => setCacheDialog(true)}
          >
            <Trash2 size={17} />
          </ActionIcon>
        </Group>
        <Group mt="lg" justify="space-between">
          <Text size="sm" c="dimmed">
            {reviews.length
              ? `${reviews.length} 张待核对 · ${targets.length} 张已选标签`
              : `已选择 ${selectedCount} / 50 张`}
          </Text>
          <Group gap="xs">
            {reviews.length ? (
              <>
                <Button
                  variant="subtle"
                  color="gray"
                  disabled={locked}
                  onClick={() => setDiscard(true)}
                >
                  放弃本次结果
                </Button>
                <Button onClick={() => setReviewOpen(true)}>核对标签</Button>
              </>
            ) : (
              <>
                <Button
                  variant="default"
                  disabled={!selectedCount}
                  onClick={() => beginReview()}
                >
                  手动整理
                </Button>
                <Button
                  leftSection={<Sparkles size={16} />}
                  disabled={!selectedCount}
                  onClick={() => setConsent(true)}
                >
                  识别所选照片
                </Button>
              </>
            )}
          </Group>
        </Group>
        {running && !reviewOpen && (
          <div style={{ marginTop: 14 }}>{progressView}</div>
        )}
      </Paper>
      <Group mb="md" align="center">
        <TextInput
          aria-label="搜索待整理照片"
          placeholder="搜索帖子、图片标题或标签"
          leftSection={<Search size={16} />}
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            setPage(1);
          }}
          style={{ flex: 1, minWidth: 220 }}
        />
        <Checkbox
          label="只看未设置标签"
          checked={untagged}
          onChange={(e) => {
            setUntagged(e.currentTarget.checked);
            setPage(1);
          }}
        />
      </Group>
      <Group justify="space-between" className="tag-selection" mb="md">
        <Checkbox
          label="选择本页"
          disabled={!rows.length || !!reviews.length || locked}
          checked={rows.length > 0 && rows.every((p) => !!selected[p.id])}
          indeterminate={
            rows.some((p) => !!selected[p.id]) &&
            !rows.every((p) => !!selected[p.id])
          }
          onChange={(e) => {
            const checked = e.currentTarget.checked;
            if (
              checked &&
              new Set([
                ...Object.keys(selected).map(Number),
                ...rows.map((p) => p.id),
              ]).size > 50
            ) {
              notifyError(new Error("每次最多选择 50 张照片"));
              return;
            }
            setSelected((current) => {
              const next = { ...current };
              rows.forEach((p) => {
                if (checked) next[p.id] = p;
                else delete next[p.id];
              });
              return next;
            });
          }}
        />
        <Group gap="xs">
          <Text size="sm" c="dimmed">
            共 {photos.data?.total || 0} 张
          </Text>
          <ActionIcon
            aria-label="刷新照片列表"
            variant="subtle"
            disabled={locked}
            onClick={() => void photos.refetch()}
            loading={photos.isFetching}
          >
            <RefreshCw size={16} />
          </ActionIcon>
          <Button
            size="xs"
            variant="subtle"
            disabled={!selectedCount || !!reviews.length || locked}
            onClick={() => setSelected({})}
          >
            清空选择
          </Button>
        </Group>
      </Group>
      {photos.isPending ? (
        <Loading />
      ) : photos.error ? (
        <ErrorState error={photos.error} retry={() => photos.refetch()} />
      ) : !rows.length ? (
        <Empty
          title="没有符合条件的照片"
          description="调整搜索条件，或先发布包含照片的帖子。"
        />
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, lg: 3, xl: 4 }} spacing="md">
          {rows.map((photo) => (
            <Paper
              key={photo.id}
              withBorder
              className={`tag-photo ${selected[photo.id] ? "is-selected" : ""}`}
            >
              <div className="tag-photo-image">
                <Image
                  src={thumbnail(photo.image_url, settings.data?.data, 320)}
                  alt={photo.post_title}
                  loading="lazy"
                  fit="cover"
                />
                <Checkbox
                  aria-label={`选择照片 ${photo.id}`}
                  checked={!!selected[photo.id]}
                  disabled={!!reviews.length || locked}
                  onChange={(e) => choose(photo, e.currentTarget.checked)}
                />
              </div>
              <Stack gap={8} p="md">
                <Group justify="space-between" wrap="nowrap">
                  <Text fw={600} size="sm" lineClamp={1}>
                    {photo.post_title}
                  </Text>
                  {(photo.is_hidden || photo.post_hidden) && (
                    <Badge size="xs" color="gray">
                      隐藏
                    </Badge>
                  )}
                </Group>
                <Group gap={5}>
                  {photo.tags.length ? (
                    photo.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="light" size="sm">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <Text size="xs" c="dimmed">
                      未设置标签
                    </Text>
                  )}
                  {photo.tags.length > 4 && (
                    <Text size="xs" c="dimmed">
                      +{photo.tags.length - 4}
                    </Text>
                  )}
                </Group>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      )}
      {(photos.data?.total || 0) > pageSize && (
        <Group justify="center" mt="xl">
          <Pagination
            value={page}
            onChange={setPage}
            total={Math.ceil(photos.data!.total! / pageSize)}
          />
        </Group>
      )}
      <Modal
        opened={consent}
        zIndex={220}
        onClose={() => setConsent(false)}
        title="识别照片标签"
        centered
      >
        <Stack gap="lg">
          <Text size="sm">
            照片由当前浏览器分析，不会上传给模型提供方。首次下载约 90 MB
            模型和约 30 MB 运行文件，后续可使用浏览器缓存；每次最多 50
            张，逐张处理。
          </Text>
          <Select
            label="模型来源"
            value={source}
            onChange={(value) =>
              setSource(value === "local" ? "local" : "remote")
            }
            allowDeselect={false}
            data={[
              { value: "remote", label: "在线下载（Hugging Face）" },
              { value: "local", label: "从本站加载" },
            ]}
          />
          <Text size="xs" c="dimmed">
            {source === "remote"
              ? "下载时会连接模型站点，该站点可见你的网络地址，不会收到照片。"
              : "需要管理员先部署模型文件，未部署时可切换在线下载。"}
          </Text>
          <Toggle
            label="允许读取远程照片"
            description="从原图片地址读取，可能产生存储流量。未启用时只识别本地照片。"
            checked={remote}
            onChange={(e) => setRemote(e.currentTarget.checked)}
          />
          <Text size="xs" c="dimmed">
            适合粗略内容归类，可能误识别或遗漏；不识别人脸身份。单张上限 32
            MB、3200 万像素，动图可手动添加标签。
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConsent(false)}>
              取消
            </Button>
            <Button onClick={() => void recognize()}>开始识别</Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={reviewOpen}
        onClose={() => !saving && setReviewOpen(false)}
        title="核对照片标签"
        size="xl"
        centered
        classNames={{ content: "tag-review" }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            点选需要的候选，或输入自己的标签。已有标签会保留，没有选择的候选不会保存。
          </Text>
          {progressView}
          {error && (
            <Alert color="red" role="alert">
              {error}
              {conflict && (
                <Button
                  size="xs"
                  variant="white"
                  mt="sm"
                  loading={refreshing}
                  onClick={() => void refreshVersions()}
                >
                  核对最新版本
                </Button>
              )}
            </Alert>
          )}
          {reviews.slice((reviewPage - 1) * 6, reviewPage * 6).map((item) => (
            <Paper
              withBorder
              p="md"
              key={item.photo.id}
              className="tag-review-row"
            >
              <div className="tag-review-image">
                <Image
                  src={thumbnail(
                    item.photo.image_url,
                    settings.data?.data,
                    320,
                  )}
                  alt={item.photo.post_title}
                  fit="contain"
                />
              </div>
              <Stack gap="xs" className="tag-review-copy">
                <Group justify="space-between" wrap="nowrap">
                  <Text fw={600} size="sm" lineClamp={1}>
                    {item.photo.post_title}
                  </Text>
                  <ActionIcon
                    variant="subtle"
                    aria-label={`移除照片 ${item.photo.id}`}
                    disabled={locked}
                    onClick={() => {
                      setReviews((current) =>
                        current.filter((r) => r.photo.id !== item.photo.id),
                      );
                      setSelected((current) => {
                        const next = { ...current };
                        delete next[item.photo.id];
                        return next;
                      });
                      setReviewPage(1);
                    }}
                  >
                    <X size={15} />
                  </ActionIcon>
                </Group>
                {item.photo.tags.length > 0 && (
                  <Text
                    size="xs"
                    c="dimmed"
                    style={{ overflowWrap: "anywhere" }}
                  >
                    已有：{item.photo.tags.join("、")}
                  </Text>
                )}
                {item.error && (
                  <Text size="xs" c="red" role="status">
                    {item.error}
                  </Text>
                )}
                {!item.blocked && (
                  <>
                    <div className="tag-suggestions">
                      {item.suggestions
                        .filter(
                          (s) => !item.photo.tags.includes(normalize(s.label)),
                        )
                        .map((s) => {
                          const chosen = item.tags
                            .map(normalize)
                            .includes(normalize(s.label));
                          return (
                            <button
                              type="button"
                              key={s.label}
                              aria-pressed={chosen}
                              disabled={locked}
                              className={chosen ? "is-selected" : ""}
                              onClick={() =>
                                changeTags(
                                  item.photo.id,
                                  chosen
                                    ? item.tags.filter(
                                        (tag) =>
                                          normalize(tag) !== normalize(s.label),
                                      )
                                    : [...item.tags, s.label],
                                )
                              }
                            >
                              {chosen && <Check size={13} />} {s.label}
                            </button>
                          );
                        })}
                    </div>
                    {item.state === "done" &&
                      item.suggestions.filter(
                        (s) => !item.photo.tags.includes(normalize(s.label)),
                      ).length === 0 && (
                        <Text size="xs" c="dimmed">
                          没有合适的新候选，可手动添加标签。
                        </Text>
                      )}
                    <TagsInput
                      label="待保存标签"
                      aria-label={`照片 ${item.photo.id} 的待保存标签`}
                      placeholder="输入后按回车添加"
                      value={item.tags}
                      onChange={(tags) => changeTags(item.photo.id, tags)}
                      maxTags={20}
                      disabled={locked}
                      error={
                        invalidTags([
                          ...new Set([
                            ...item.photo.tags,
                            ...item.tags.map(normalize),
                          ]),
                        ])
                          ? "合计最多 20 个标签，每个 1–32 字，不含控制字符"
                          : undefined
                      }
                      clearable
                      clearButtonProps={{
                        "aria-hidden": false,
                        tabIndex: 0,
                        "aria-label": `清空照片 ${item.photo.id} 的待保存标签`,
                      }}
                    />
                  </>
                )}
              </Stack>
            </Paper>
          ))}
          {reviews.length > 6 && (
            <Pagination
              value={reviewPage}
              onChange={setReviewPage}
              total={Math.ceil(reviews.length / 6)}
            />
          )}
          <Group justify="space-between" className="tag-review-actions">
            <Text size="sm" c="dimmed">
              {targets.length} 张照片待保存
            </Text>
            <Group gap="xs">
              {!!pending.length && (
                <Button
                  variant="default"
                  disabled={locked}
                  onClick={() => setConsent(true)}
                >
                  {reviews.some((r) => r.state === "done")
                    ? "继续识别剩余照片"
                    : "识别候选标签"}
                </Button>
              )}
              <Button
                loading={saving}
                disabled={locked || !targets.length || badTags}
                onClick={() => setConfirm(true)}
              >
                保存标签
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={confirm}
        onClose={() => !saving && setConfirm(false)}
        title="保存所选标签？"
        centered
      >
        <Text size="sm">
          为 {targets.length}{" "}
          张照片添加你选中的标签，保留已有标签。本次未选择的候选不会保存，核对列表将清空。保存后可在处理记录中撤销。
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button
            variant="default"
            disabled={saving}
            onClick={() => setConfirm(false)}
          >
            继续核对
          </Button>
          <Button loading={saving} onClick={() => void save()}>
            确认保存标签
          </Button>
        </Group>
      </Modal>
      <Modal
        opened={discard}
        onClose={() => setDiscard(false)}
        title="放弃本次结果？"
        centered
      >
        <Text size="sm">
          候选与未保存的标签将清空，已经保存的内容不会改变。
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setDiscard(false)}>
            继续核对
          </Button>
          <Button
            color="red"
            onClick={() => {
              setReviews([]);
              setSelected({});
              setError("");
              setConflict(false);
              setDiscard(false);
              setReviewOpen(false);
              receipt.current = null;
            }}
          >
            确认放弃
          </Button>
        </Group>
      </Modal>
      <Modal
        opened={cacheDialog}
        onClose={() => !cacheBusy && setCacheDialog(false)}
        title="清除模型缓存？"
        centered
      >
        <Text size="sm">
          仅清除本浏览器为智能标签下载的模型文件，照片与已保存标签不会改变。下次识别需重新下载。
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button
            variant="default"
            disabled={cacheBusy}
            onClick={() => setCacheDialog(false)}
          >
            取消
          </Button>
          <Button loading={cacheBusy} onClick={() => void clearCache()}>
            清除缓存
          </Button>
        </Group>
      </Modal>
      {history && <PhotoHistory onClose={() => setHistory(false)} />}
    </>
  );
}
