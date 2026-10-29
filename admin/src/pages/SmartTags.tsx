import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  FormField,
  IconButton,
  Input,
  Pagination,
  Progress,
  Select,
  TagInput,
  Tooltip,
} from "@robert-stackflow/oneui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Maximize2,
  RefreshCw,
  Search,
  Sparkles,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, json, notifyError, notifySuccess } from "../api";
import { useOrganizeTools } from "../components/OrganizeLayout";
import { OrganizePanel } from "../components/OrganizePanel";
import { Empty, ErrorState, Loading } from "../components/Common";
import { Toggle } from "../components/Toggle";
import { UnsavedChanges } from "../components/UnsavedChanges";
import { useDebouncedValue } from "../hooks";
import { photoQueries } from "../lib/photo-actions";
import {
  TagModel,
  type ModelProgress,
  type TagSuggestion,
} from "../lib/tag-model";
import { thumbnail, type Settings } from "../types";
import { badgeTone, gridStyle, selectOptions, tone } from "../ui-data";
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
  const [preview, setPreview] = useState<TagPhoto | null>(null);
  const reviewScroll = useRef<HTMLDivElement>(null);
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
  const [cacheDialog, setCacheDialog] = useState(false);
  const [cacheBusy, setCacheBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const model = useRef<TagModel | null>(null);
  const saveLock = useRef(false);
  const receipt = useRef<{
    key: string;
    id: string;
  } | null>(null);
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
  const organizeTools = useMemo(
    () => [
      {
        label: "刷新照片列表",
        icon: <RefreshCw size={16} />,
        disabled: locked || photos.isFetching,
        action: () => {
          void photos.refetch();
        },
      },
      {
        label: "清除识别模型缓存",
        icon: <Trash2 size={16} />,
        disabled: locked,
        action: () => setCacheDialog(true),
      },
    ],
    [locked, photos.isFetching, photos.refetch],
  );
  useOrganizeTools(organizeTools, locked);
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
    <Card className={"moment-panel " + "tag-progress"}>
      <div
        className="ui-row"
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          justifyContent: "space-between",
        }}
      >
        <p
          role="status"
          className="ui-text"
          style={{
            fontSize: 13,
          }}
        >
          {phase}
        </p>
        <Button size="small" onClick={stop} variant="ghost">
          取消识别
        </Button>
      </div>
      <div
        style={{
          marginTop: 10,
        }}
      >
        <Progress
          value={
            phase.includes("识别")
              ? (processed / Math.max(1, total)) * 100
              : progress && progress.total > 0
                ? (progress.loaded / progress.total) * 100
                : 0
          }
          label={"识别进度"}
        />
      </div>
      <p
        className="ui-text"
        style={{
          fontSize: 12,
          color: "var(--muted)",
          marginTop: 6,
        }}
      >
        {phase.includes("识别")
          ? "照片只在当前浏览器分析，完成的候选会保留。"
          : progress
            ? `${Math.round(progress.loaded / 1e6)} / ${Math.round(progress.total / 1e6)} MB · 首次准备可能需要一些时间`
            : "首次使用需要下载模型，页面仍可操作。"}
      </p>
    </Card>
  );
  return (
    <>
      <UnsavedChanges
        dirty={!!selectedCount || !!reviews.length || running || saving}
        message="候选标签尚未保存，离开会清空选择并停止识别；已经保存的标签不受影响。"
      />

      <OrganizePanel
        title="用标签整理照片"
        description="标签仅用于后台搜索，不会公开展示。"
        actions={
          <div className="organize-actions">
            {reviews.length ? (
              <>
                <Button
                  disabled={locked}
                  onClick={() => setDiscard(true)}
                  variant="ghost"
                >
                  放弃本次结果
                </Button>
                <Button onClick={() => setReviewOpen(true)} variant="primary">
                  核对标签
                </Button>
              </>
            ) : (
              <>
                <Button
                  disabled={!selectedCount}
                  onClick={() => beginReview()}
                  variant="secondary"
                >
                  手动整理
                </Button>
                <Button
                  disabled={!selectedCount}
                  onClick={() => setConsent(true)}
                  variant="primary"
                >
                  {<Sparkles size={16} />}
                  识别所选照片
                </Button>
              </>
            )}
          </div>
        }
        filters={
          <>
            <Input
              aria-label="搜索待整理照片"
              placeholder="搜索帖子、图片标题或标签"
              leading={<Search size={16} />}
              value={search}
              onChange={(e) => {
                setSearch(e.currentTarget.value);
                setPage(1);
              }}
            />
            <Checkbox
              label="只看未设置标签"
              checked={untagged}
              onChange={(checked) => {
                setUntagged(checked);
                setPage(1);
              }}
            />
          </>
        }
        summary={
          rows.length || reviews.length ? (
            <>
              {rows.length > 0 && (
                <Checkbox
                  onChange={(checked) => {
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
                  label="选择本页"
                  disabled={!rows.length || !!reviews.length || locked}
                  checked={
                    rows.length > 0 && rows.every((p) => !!selected[p.id])
                  }
                  indeterminate={
                    rows.some((p) => !!selected[p.id]) &&
                    !rows.every((p) => !!selected[p.id])
                  }
                />
              )}
              <p className="organize-meta" role="status">
                {reviews.length
                  ? reviews.length + " 张待核对"
                  : (selectedCount ? "已选 " + selectedCount + "/50 · " : "") +
                    "共 " +
                    (photos.data?.total || 0) +
                    " 张"}
              </p>
            </>
          ) : undefined
        }
        footerActions={
          selectedCount > 0 && !reviews.length ? (
            <Button
              size="small"
              disabled={locked}
              onClick={() => setSelected({})}
              variant="ghost"
            >
              清空选择
            </Button>
          ) : undefined
        }
      >
        {running && !reviewOpen ? progressView : undefined}
      </OrganizePanel>

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
        <div
          className="ui-grid"
          style={{
            ...gridStyle({ base: 1, xs: 2, lg: 3, xl: 4 }, 16),
          }}
        >
          {rows.map((photo) => (
            <Card
              key={photo.id}
              className={
                "moment-panel " +
                `tag-photo ${selected[photo.id] ? "is-selected" : ""}`
              }
            >
              <div className="tag-photo-image">
                <img
                  src={thumbnail(photo.image_url, settings.data?.data, 320)}
                  alt={photo.post_title}
                  loading="lazy"
                />
              </div>
              <div
                className="ui-stack"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: 16,
                }}
              >
                <div
                  className="ui-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "nowrap",
                    gap: 10,
                    justifyContent: "space-between",
                  }}
                >
                  <p
                    className="ui-text"
                    style={{
                      minWidth: 0,
                      flex: 1,
                      fontWeight: 600,
                      fontSize: 13,
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {photo.post_title}
                  </p>
                  {(photo.is_hidden || photo.post_hidden) && (
                    <Badge tone={badgeTone("gray")}>隐藏</Badge>
                  )}
                  <div className="tag-photo-select">
                    <Checkbox
                      onChange={(checked) => choose(photo, checked)}
                      label={`选择照片 ${photo.id}`}
                      checked={!!selected[photo.id]}
                      disabled={!!reviews.length || locked}
                    />
                  </div>
                </div>
                <div
                  className="ui-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 5,
                  }}
                >
                  {photo.tags.length ? (
                    photo.tags
                      .slice(0, 4)
                      .map((tag) => <Badge key={tag}>{tag}</Badge>)
                  ) : (
                    <p
                      className="ui-text"
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      未设置标签
                    </p>
                  )}
                  {photo.tags.length > 4 && (
                    <p
                      className="ui-text"
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      +{photo.tags.length - 4}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {(photos.data?.total || 0) > pageSize && (
        <div
          className="ui-row"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
            marginTop: 32,
          }}
        >
          <Pagination
            page={page}
            onPageChange={setPage}
            total={photos.data!.total!}
            pageSize={pageSize}
            summary={null}
          />
        </div>
      )}
      <Dialog
        open={consent}
        onClose={() => setConsent(false)}
        title="识别照片标签"
        footer={
          <>
            <Button onClick={() => setConsent(false)} variant="secondary">
              取消
            </Button>
            <Button onClick={() => void recognize()} variant="primary">
              开始识别
            </Button>
          </>
        }
        variant="default"
      >
        <div
          className="ui-stack"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <p
            className="ui-text"
            style={{
              fontSize: 13,
            }}
          >
            照片由当前浏览器分析，不会上传给模型提供方。首次下载约 90 MB
            模型和约 30 MB 运行文件，后续可使用浏览器缓存；每次最多 50
            张，逐张处理。
          </p>
          <FormField label={"模型来源"}>
            <Select
              label="模型来源"
              onChange={(value) =>
                setSource(value === "local" ? "local" : "remote")
              }
              options={selectOptions([
                { value: "remote", label: "在线下载（Hugging Face）" },
                { value: "local", label: "从本站加载" },
              ])}
              value={source ?? ""}
            />
          </FormField>
          <p
            className="ui-text"
            style={{
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            {source === "remote"
              ? "下载时会连接模型站点，该站点可见你的网络地址，不会收到照片。"
              : "需要管理员先部署模型文件，未部署时可切换在线下载。"}
          </p>
          <Toggle
            label="允许读取远程照片"
            description="从原图片地址读取，可能产生存储流量。未启用时只识别本地照片。"
            checked={remote}
            onChange={(e) => setRemote(e)}
          />
          <p
            className="ui-text"
            style={{
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            适合粗略内容归类，可能误识别或遗漏；不识别人脸身份。单张上限 32
            MB、3200 万像素，动图可手动添加标签。
          </p>
        </div>
      </Dialog>
      <Dialog
        open={reviewOpen}
        onClose={() => !saving && setReviewOpen(false)}
        size="large"
        title="核对照片标签"
        busy={saving}
        footer={
          <div className="tag-review-actions">
            <div className="tag-review-summary" role="status">
              <span className="tag-review-summary-icon" aria-hidden="true">
                <Tags size={18} />
              </span>
              <p
                className="ui-text"
                style={{
                  fontSize: 13,
                }}
              >
                <strong>{targets.length}</strong> 张照片待保存
              </p>
            </div>
            {reviews.length > 6 && (
              <div className="tag-review-pagination">
                <Pagination
                  page={reviewPage}
                  onPageChange={(value) => {
                    setReviewPage(value);
                    reviewScroll.current?.scrollTo({ top: 0 });
                  }}
                  total={reviews.length}
                  pageSize={6}
                  summary={null}
                />
              </div>
            )}
            <div className={"ui-row " + "tag-review-buttons"}>
              {!!pending.length && (
                <Button
                  disabled={locked}
                  onClick={() => setConsent(true)}
                  variant="secondary"
                >
                  {<Sparkles size={16} />}
                  {reviews.some((r) => r.state === "done")
                    ? "继续识别剩余照片"
                    : "识别候选标签"}
                </Button>
              )}
              <Button
                loading={saving}
                disabled={locked || !targets.length || badTags}
                onClick={() => setConfirm(true)}
                variant="primary"
              >
                {<Check size={16} />}
                保存标签
              </Button>
            </div>
          </div>
        }
      >
        <div className="tag-review-scroll" ref={reviewScroll}>
          <p
            className={"ui-text " + "tag-review-hint"}
            style={{
              fontSize: 13,
              color: "var(--muted)",
            }}
          >
            点选需要的候选，或输入自己的标签。已有标签会保留，没有选择的候选不会保存。
          </p>
          {progressView}
          {error && (
            <Alert tone={tone("red")}>
              {error}
              {conflict && (
                <Button
                  size="small"
                  loading={refreshing}
                  onClick={() => void refreshVersions()}
                  variant="primary"
                  style={{
                    marginTop: 10,
                  }}
                >
                  核对最新版本
                </Button>
              )}
            </Alert>
          )}
          {reviews.slice((reviewPage - 1) * 6, reviewPage * 6).map((item) => (
            <Card
              key={item.photo.id}
              className={"moment-panel " + "tag-review-row"}
            >
              <Tooltip content="查看完整照片">
                <Button
                  type="button"
                  className="tag-review-image image-action app-button-layout"
                  aria-label={`查看照片 ${item.photo.id} 原图`}
                  onClick={() => setPreview(item.photo)}
                  variant="ghost"
                >
                  <img
                    src={thumbnail(
                      item.photo.image_url,
                      settings.data?.data,
                      320,
                    )}
                    alt={item.photo.post_title}
                    loading="lazy"
                  />
                  <span className="tag-review-image-expand" aria-hidden="true">
                    <Maximize2 size={14} />
                  </span>
                </Button>
              </Tooltip>
              <div
                className={"ui-stack " + "tag-review-copy"}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div
                  className="ui-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "nowrap",
                    gap: 10,
                    justifyContent: "space-between",
                  }}
                >
                  <p
                    className={"ui-text " + "tag-review-title"}
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.photo.post_title}
                  </p>
                  <IconButton
                    size="small"
                    label={`移除照片 ${item.photo.id}`}
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
                    variant="ghost"
                  >
                    <X size={15} />
                  </IconButton>
                </div>
                {item.photo.tags.length > 0 && (
                  <p
                    className="ui-text"
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      ...{ overflowWrap: "anywhere" },
                    }}
                  >
                    已有：{item.photo.tags.join("、")}
                  </p>
                )}
                {item.error && (
                  <p
                    role="status"
                    className="ui-text"
                    style={{
                      fontSize: 12,
                      color: "var(--danger)",
                    }}
                  >
                    {item.error}
                  </p>
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
                            <Button
                              type="button"
                              key={s.label}
                              aria-pressed={chosen}
                              disabled={locked}
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
                              size="small"
                              variant={chosen ? "primary" : "secondary"}
                            >
                              {chosen && <Check size={13} />} {s.label}
                            </Button>
                          );
                        })}
                    </div>
                    {item.state === "done" &&
                      item.suggestions.filter(
                        (s) => !item.photo.tags.includes(normalize(s.label)),
                      ).length === 0 && (
                        <p
                          className="ui-text"
                          style={{
                            fontSize: 12,
                            color: "var(--muted)",
                          }}
                        >
                          没有合适的新候选，可手动添加标签。
                        </p>
                      )}
                    <FormField label={"待保存标签"}>
                      <div className="tag-review-input">
                        <TagInput
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
                        />
                      </div>
                    </FormField>
                  </>
                )}
              </div>
            </Card>
          ))}
          {reviews.length === 0 && (
            <Empty
              title="没有待核对的照片"
              description="关闭窗口后重新选择照片。"
            />
          )}
        </div>
      </Dialog>
      <Dialog
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.post_title || "查看完整照片"}
        size="large"
      >
        {preview && (
          <img
            src={preview.image_url}
            alt={preview.post_title}
            style={{
              maxHeight: "70dvh",
            }}
          />
        )}
      </Dialog>
      <Dialog
        open={confirm}
        onClose={() => !saving && setConfirm(false)}
        title="保存所选标签？"
        footer={
          <>
            <Button
              disabled={saving}
              onClick={() => setConfirm(false)}
              variant="secondary"
            >
              继续核对
            </Button>
            <Button
              loading={saving}
              onClick={() => void save()}
              variant="primary"
            >
              确认保存标签
            </Button>
          </>
        }
        busy={!!saving}
        variant="default"
      >
        <p
          className="ui-text"
          style={{
            fontSize: 13,
          }}
        >
          为 {targets.length}{" "}
          张照片添加你选中的标签，保留已有标签。本次未选择的候选不会保存，核对列表将清空。保存后可在处理记录中撤销。
        </p>
      </Dialog>
      <Dialog
        open={discard}
        onClose={() => setDiscard(false)}
        title="放弃本次结果？"
        footer={
          <>
            <Button
              onClick={() => setDiscard(false)}
              variant="secondary"
              data-dialog-initial-focus
            >
              继续核对
            </Button>
            <Button
              onClick={() => {
                setReviews([]);
                setSelected({});
                setError("");
                setConflict(false);
                setDiscard(false);
                setReviewOpen(false);
                receipt.current = null;
              }}
              variant="danger"
            >
              确认放弃
            </Button>
          </>
        }
        variant="confirm"
      >
        <p
          className="ui-text"
          style={{
            fontSize: 13,
          }}
        >
          候选与未保存的标签将清空，已经保存的内容不会改变。
        </p>
      </Dialog>
      <Dialog
        open={cacheDialog}
        onClose={() => !cacheBusy && setCacheDialog(false)}
        title="清除模型缓存？"
        footer={
          <>
            <Button
              disabled={cacheBusy}
              onClick={() => setCacheDialog(false)}
              variant="secondary"
            >
              取消
            </Button>
            <Button
              loading={cacheBusy}
              onClick={() => void clearCache()}
              variant="primary"
            >
              清除缓存
            </Button>
          </>
        }
        busy={!!cacheBusy}
        variant="default"
      >
        <p
          className="ui-text"
          style={{
            fontSize: 13,
          }}
        >
          仅清除本浏览器为智能标签下载的模型文件，照片与已保存标签不会改变。下次识别需重新下载。
        </p>
      </Dialog>
    </>
  );
}
