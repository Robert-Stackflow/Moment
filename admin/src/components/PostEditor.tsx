import {
  Alert,
  Button,
  Card,
  Dialog,
  Drawer,
  Form,
  Input,
  ActionSheet,
  Textarea,
} from "@robert-stackflow/oneui";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarClock,
  CloudCheck,
  Eye,
  EyeOff,
  FilePenLine,
  GripVertical,
  Link2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Star,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import { api, ApiError, json, notifyError, notifySuccess } from "../api";
import type {
  Category,
  Discovery,
  Photo,
  Post,
  PostContent,
  PostDraft,
  Settings,
} from "../types";
import { datetime, thumbnail } from "../types";
import { adminHref, tone } from "../ui-data";
import { CategoryMultiSelect } from "./CategoryPicker";
import { PageTitle } from "./Common";
import { localDateTime } from "./dateTime";
import { DateTimePicker } from "./DateTimePicker";
import { defaultDiscovery, DiscoveryEditor } from "./DiscoveryEditor";
import { PhotoDetails } from "./PhotoDetails";
import { ScheduleDialog, scheduleTime } from "./ScheduleDialog";
import { Toggle as Switch } from "./Toggle";
import { UnsavedChanges } from "./UnsavedChanges";
import { UploadQueue } from "./UploadQueue";
import { useModelForm } from "./useModelForm";
import { usePostDraft } from "./usePostDraft";
function formValues(post?: PostContent): {
  discovery: Discovery;
  title: string;
  desc: string;
  location: string;
  time: string;
  is_hidden: boolean;
  category_ids: string[];
  images: (Photo & {
    _key: string;
  })[];
} {
  return {
    discovery: post?.discovery || defaultDiscovery(false),
    title: post?.title || "",
    desc: post?.desc || "",
    location: post?.location || "",
    time: post ? datetime(post.time) : localDateTime(new Date()),
    is_hidden: post?.is_hidden || false,
    category_ids: (post?.category_ids || []).map(String),
    images: (post?.images || []).map((photo) => ({
      ...photo,
      _key: crypto.randomUUID(),
    })),
  };
}
function payload(value: ReturnType<typeof formValues>): PostContent {
  return {
    ...value,
    time: value.time || null,
    category_ids: value.category_ids.map(Number),
    images: value.images.map(({ _key, ...photo }, order) => ({
      ...photo,
      title: photo.title || "",
      desc: photo.desc || "",
      location: photo.location || "",
      metadata: photo.metadata || "",
      time: photo.time || null,
      order,
    })),
  };
}
export function PostEditor({
  initial,
  initialDraft,
  draftKey,
  categories,
  settings,
}: {
  initial?: Post;
  initialDraft: PostDraft | null;
  draftKey?: string;
  categories: Category[];
  settings: Settings;
}) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [draft, setDraft] = useState(() =>
    formValues(initialDraft?.payload || initial),
  );
  const sharedForm = useModelForm(
    { title: draft.title },
    { title: { label: "帖子标题", required: true, maxLength: 50 } },
  );
  const [snapshot, setSnapshot] = useState(() =>
    JSON.stringify(
      payload(
        initial ? formValues(initial) : initialDraft ? formValues() : draft,
      ),
    ),
  );
  const [key] = useState(() => draftKey || crypto.randomUUID());
  const serialized = JSON.stringify(payload(draft));
  const autosave = usePostDraft(
    serialized,
    initialDraft,
    key,
    initial?.id,
    initial?.revision,
  );
  const [postID, setPostID] = useState(initial?.id);
  const [savedAt, setSavedAt] = useState(initial?.updated_at || "");
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [urls, setUrls] = useState("");
  const [urlError, setUrlError] = useState("");
  const [preview, setPreview] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const pendingSchedule = initialDraft?.schedule?.status === "pending";
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [publishConflict, setPublishConflict] = useState(false);
  const [needsReload, setNeedsReload] = useState(false);
  const [removed, setRemoved] = useState<{
    photo: Photo & {
      _key: string;
    };
    index: number;
  } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const saving = useRef(false);
  const saveShortcut = useRef<() => void>(() => {});
  const dirty = serialized !== snapshot;
  const photos = draft.images;
  const cover = photos.find((photo) => !photo.is_hidden);
  const current = photos.find((photo) => photo._key === editing);
  const locked = busy || uploading || needsReload || pendingSchedule;
  const visibleCount = photos.filter((photo) => !photo.is_hidden).length;
  function field<K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  function updatePhotos(
    action: (photos: typeof draft.images) => typeof draft.images,
  ) {
    setDraft((current) => ({ ...current, images: action(current.images) }));
  }
  function move(from: number, to: number) {
    if (from < 0 || to < 0 || to >= photos.length || from === to) return;
    updatePhotos((current) => {
      const next = [...current];
      const [photo] = next.splice(from, 1);
      next.splice(to, 0, photo);
      return next;
    });
  }
  function setCover(key: string) {
    updatePhotos((current) => {
      const photo = current.find((item) => item._key === key);
      return photo
        ? [
            { ...photo, is_hidden: false },
            ...current.filter((item) => item._key !== key),
          ]
        : current;
    });
  }
  function removePhoto(index: number) {
    setRemoved({ photo: photos[index], index });
    updatePhotos((current) => current.filter((_, i) => i !== index));
  }
  async function save(exit = false) {
    if (
      saving.current ||
      uploading ||
      editing ||
      adding ||
      preview ||
      pendingSchedule ||
      needsReload
    )
      return;
    if (!draft.title.trim()) {
      setError("先给这组照片写一个标题，再保存。");
      titleInput.current?.focus();
      return;
    }
    if (!photos.length) {
      setError("请至少添加一张图片。");
      document
        .querySelector(".editor-image-section")
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    if (!dirty && postID) {
      if (exit) navigate("/posts");
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    let committed = false;
    try {
      const savedDraft = await autosave.flush();
      const result = await api<{
        id: number;
      }>(
        `/drafts/${savedDraft.id}/publish`,
        json("POST", { revision: savedDraft.revision }),
      );
      committed = true;
      setPostID(result.data.id);
      // Read server-assigned image IDs before allowing a second save.
      const saved = await api<Post>(`/posts/${result.data.id}`);
      const next = formValues(saved.data);
      flushSync(() => {
        setDraft(next);
        setSnapshot(JSON.stringify(payload(next)));
        autosave.reset(
          JSON.stringify(payload(next)),
          result.data.id,
          saved.data.revision,
        );
        setRemoved(null);
        setSavedAt(saved.data.updated_at);
      });
      client.setQueryData(["post", String(result.data.id)], saved);
      client.setQueryData(["postDraft", String(result.data.id)], {
        code: 200,
        msg: "OK",
        data: null,
      });
      client.removeQueries({ queryKey: ["draft", savedDraft.id] });
      void Promise.all(
        ["posts", "stats", "locations", "drafts"].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
      notifySuccess(draft.is_hidden ? "已保存，仅自己可见" : "已保存到相册");
      if (exit) navigate("/posts");
      else if (!initial)
        navigate(`/posts/${result.data.id}`, { replace: true });
    } catch (error) {
      if (committed) {
        setError("帖子已保存，但读取最新状态失败。请刷新页面后继续编辑。");
        setNeedsReload(true);
        flushSync(() => {
          setSnapshot(serialized);
          autosave.reset(serialized, postID || 0, 0);
        });
      } else {
        if (error instanceof ApiError && error.status === 409)
          setPublishConflict(true);
        notifyError(error);
      }
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function saveDraft() {
    if (
      busy ||
      uploading ||
      editing ||
      adding ||
      preview ||
      needsReload ||
      pendingSchedule
    )
      return;
    try {
      await autosave.flush();
      notifySuccess("草稿已保存");
    } catch (cause) {
      notifyError(cause);
    }
  }
  async function schedule(publishAt: number) {
    setBusy(true);
    try {
      const saved = await autosave.flush();
      await api(
        `/drafts/${saved.id}/schedule`,
        json("PUT", {
          revision: initialDraft?.schedule?.revision || 0,
          draft_revision: saved.revision,
          publish_at: publishAt,
        }),
      );
      await Promise.all(
        ["schedules", "drafts", "draft", "postDraft"].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
      flushSync(() => setScheduling(false));
      notifySuccess("已安排定时发布");
      navigate("/schedules");
    } finally {
      setBusy(false);
    }
  }
  async function saveCopy() {
    if (busy) return;
    setBusy(true);
    try {
      const copyID = crypto.randomUUID();
      const content = payload(draft);
      const copy = await api<PostDraft>(`/drafts/${copyID}`, {
        ...json("PUT", {
          revision: 0,
          base_revision: 0,
          mutation_id: crypto.randomUUID(),
          payload: {
            ...content,
            images: content.images.map(({ id, ...photo }) => photo),
          },
        }),
        preserveEditorOnUnauthorized: true,
      });
      client.setQueryData(["draft", copyID], copy);
      void client.invalidateQueries({ queryKey: ["drafts"] });
      flushSync(() => autosave.reset(serialized, 0, 0));
      navigate(`/drafts/${copyID}`);
    } catch (cause) {
      notifyError(cause);
    } finally {
      setBusy(false);
    }
  }
  saveShortcut.current = () => void saveDraft();
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveShortcut.current();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  function addURLs() {
    const list = urls
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (
      !list.length ||
      list.some((value) => {
        try {
          return !["http:", "https:"].includes(new URL(value).protocol);
        } catch {
          return true;
        }
      })
    ) {
      setUrlError("每行填写一个完整的 HTTP 或 HTTPS 图片地址。");
      return;
    }
    if (photos.length + list.length > 200) {
      setUrlError(`还能添加 ${200 - photos.length} 张图片。`);
      return;
    }
    updatePhotos((current) => [
      ...current,
      ...list.map((image_url) => ({
        _key: crypto.randomUUID(),
        image_url,
        title: "",
        desc: "",
        location: "",
        time: null,
        metadata: "",
        is_hidden: false,
        order: 0,
      })),
    ]);
    setAdding(false);
    setUrls("");
    setUrlError("");
    setError("");
  }
  return (
    <>
      <Form
        className="post-editor"
        controller={sharedForm}
        onSubmit={() => save()}
      >
        {!scheduling && (
          <UnsavedChanges dirty={autosave.dirty} uploading={uploading} />
        )}
        <PageTitle title={initial ? "编辑帖子" : "新建帖子"}>
          <Button href={adminHref("/posts")} disabled={busy} variant="ghost">
            {<ArrowLeft size={16} />}
            返回帖子
          </Button>
        </PageTitle>
        {publishConflict && (
          <div
            style={{
              marginBottom: 24,
            }}
          >
            <Alert tone={tone("orange")} title="帖子已有更新">
              <p
                className="ui-text"
                style={{
                  fontSize: 13,
                  marginBottom: 10,
                }}
              >
                其他窗口已经修改了这篇帖子。草稿仍完整保留，可另存为新草稿后对比整理。
              </p>
              <Button
                loading={busy}
                onClick={() => void saveCopy()}
                variant="secondary"
              >
                另存为新草稿
              </Button>
            </Alert>
          </div>
        )}
        {initialDraft?.schedule &&
          ["pending", "failed"].includes(initialDraft.schedule.status) && (
            <div
              style={{
                marginBottom: 24,
              }}
            >
              <Alert
                tone={tone(pendingSchedule ? "blue" : "orange")}
                title={pendingSchedule ? "已安排定时发布" : "发布计划需要处理"}
              >
                <p
                  className="ui-text"
                  style={{
                    fontSize: 13,
                    marginBottom: 10,
                  }}
                >
                  {pendingSchedule
                    ? `将于 ${scheduleTime(initialDraft.schedule.publish_at)}（北京时间）公开。修改内容请先取消计划。`
                    : initialDraft.schedule.error}
                </p>
                <Button
                  href={adminHref("/schedules")}
                  size="small"
                  variant="secondary"
                >
                  管理发布计划
                </Button>
              </Alert>
            </div>
          )}
        <div className="draft-notice">
          <FilePenLine size={17} />
          <p
            className="ui-text"
            style={{
              fontSize: 13,
            }}
          >
            {initialDraft ? "已恢复未发布的草稿。" : "编辑会自动保存为草稿。"}
            {postID ? "发布更新后，访客才会看到修改。" : "发布前仅自己可见。"}
          </p>
        </div>
        {autosave.error && (
          <div
            style={{
              marginBottom: 24,
            }}
          >
            <Alert
              tone={tone("orange")}
              title={autosave.conflict ? "编辑版本发生冲突" : "草稿尚未同步"}
            >
              <div
                className="ui-stack"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <p
                  className="ui-text"
                  style={{
                    fontSize: 13,
                  }}
                >
                  {autosave.error.message}
                  {autosave.conflict
                    ? "。当前内容仍在本页，可另存一份新草稿后对比处理。"
                    : autosave.error instanceof ApiError &&
                        autosave.error.status === 401
                      ? "。请在新标签页登录，再回来重试。"
                      : "。内容仍在本页，恢复连接后会自动重试。"}
                </p>
                <div
                  className="ui-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  {autosave.conflict ? (
                    <Button
                      loading={busy}
                      onClick={() => void saveCopy()}
                      variant="secondary"
                    >
                      另存为新草稿
                    </Button>
                  ) : (
                    <Button
                      onClick={() => void saveDraft()}
                      variant="secondary"
                    >
                      立即重试
                    </Button>
                  )}
                  {autosave.error instanceof ApiError &&
                    autosave.error.status === 401 && (
                      <Button
                        href="/admin/login"
                        target="_blank"
                        variant="secondary"
                      >
                        重新登录
                      </Button>
                    )}
                </div>
              </div>
            </Alert>
          </div>
        )}
        {error && (
          <div
            style={{
              marginBottom: 24,
            }}
          >
            <Alert tone={tone("red")} onClose={() => setError("")}>
              {error}
            </Alert>
          </div>
        )}
        <fieldset
          disabled={busy || needsReload || pendingSchedule}
          className="editor-fieldset"
        >
          <div className="editor-layout">
            <div
              className="ui-stack"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 22,
              }}
            >
              <Card className={"moment-panel " + "editor-story"}>
                <div className="editor-section-heading">
                  <span className="editor-step">01</span>
                  <div>
                    <h4 className="ui-title">内容</h4>
                  </div>
                </div>
                <div
                  className="ui-stack"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 24,
                  }}
                >
                  <Input
                    {...sharedForm.field("title")}
                    ref={titleInput}
                    aria-label="帖子标题"
                    placeholder="帖子标题"
                    className="editor-title-input"
                    value={draft.title}
                    maxLength={50}
                    onChange={(e) => {
                      field("title", e.currentTarget.value);
                      setError("");
                    }}
                  />
                  <Textarea
                    aria-label="帖子描述"
                    placeholder="添加描述…"
                    rows={3}
                    value={draft.desc}
                    onChange={(e) => field("desc", e.currentTarget.value)}
                  />
                  <p
                    className="ui-text"
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      textAlign: "right",
                    }}
                  >
                    标题 {draft.title.length} / 50
                  </p>
                </div>
              </Card>
              <Card className={"moment-panel " + "editor-image-section"}>
                <div className="editor-section-heading">
                  <span className="editor-step">02</span>
                  <div>
                    <h4 className="ui-title">
                      照片{" "}
                      <p
                        className="ui-text"
                        style={{
                          fontSize: 13,
                          color: "var(--muted)",
                          fontWeight: 400,
                        }}
                      >
                        {photos.length} / 200
                      </p>
                    </h4>
                    <p
                      className="ui-text"
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        marginTop: 4,
                      }}
                    >
                      点击照片编辑；拖动排序，或在菜单中移动
                    </p>
                  </div>
                  <Button
                    className="add-url-button"
                    size="small"
                    onClick={() => {
                      setAdding(true);
                      setUrlError("");
                    }}
                    disabled={locked || photos.length >= 200}
                    variant="secondary"
                  >
                    {<Link2 size={14} />}
                    图片地址
                  </Button>
                </div>
                {removed && (
                  <div className="photo-undo" role="status">
                    <span>已从帖子移除 1 张图片</span>
                    <Button
                      size="small"
                      disabled={photos.length >= 200 || locked}
                      onClick={() => {
                        updatePhotos((current) => {
                          const next = [...current];
                          next.splice(
                            Math.min(removed.index, next.length),
                            0,
                            removed.photo,
                          );
                          return next;
                        });
                        setRemoved(null);
                      }}
                      variant="ghost"
                    >
                      {<RotateCcw size={13} />}
                      撤销
                    </Button>
                  </div>
                )}
                {!!photos.length && (
                  <div className="editor-photos">
                    {photos.map((photo, index) => (
                      <div
                        className={`photo-editor-card ${dragging === photo._key ? "is-dragging" : ""} ${
                          dragTarget === photo._key && dragging !== photo._key
                            ? "is-drop-target"
                            : ""
                        }`}
                        key={photo._key}
                        draggable={!locked}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", photo._key);
                          setDragging(photo._key);
                        }}
                        onDragOver={(event) => {
                          if (!dragging) return;
                          event.preventDefault();
                          setDragTarget(photo._key);
                        }}
                        onDrop={(event) => {
                          if (!dragging) return;
                          event.preventDefault();
                          move(
                            photos.findIndex((item) => item._key === dragging),
                            index,
                          );
                          setDragging(null);
                          setDragTarget(null);
                        }}
                        onDragEnd={() => {
                          setDragging(null);
                          setDragTarget(null);
                        }}
                      >
                        <Button
                          type="button"
                          className="photo-edit-target image-action app-button-layout"
                          aria-label={`编辑图片 ${index + 1}`}
                          onClick={() => setEditing(photo._key)}
                          variant="ghost"
                        >
                          <img
                            className="photo-cover"
                            src={thumbnail(photo.image_url, settings)}
                            alt={photo.title || `图片 ${index + 1}`}
                            draggable={false}
                            loading="lazy"
                            style={{
                              ...{
                                objectPosition: `${photo.focus_x ?? 50}% ${photo.focus_y ?? 50}%`,
                              },
                            }}
                          />
                          <span className="photo-edit-hint">
                            <Pencil size={15} />
                            编辑信息
                          </span>
                        </Button>
                        <span
                          className={`photo-status-badge ${photo.is_hidden ? "is-hidden" : ""}`}
                        >
                          {cover?._key === photo._key ? (
                            <>
                              <Star size={11} />
                              封面
                            </>
                          ) : photo.is_hidden ? (
                            <>
                              <EyeOff size={11} />
                              隐藏
                            </>
                          ) : (
                            String(index + 1).padStart(2, "0")
                          )}
                        </span>
                        <div className="photo-card-footer">
                          <GripVertical size={15} className="photo-grip" />
                          <p
                            className="ui-text"
                            style={{
                              fontSize: 12,
                            }}
                          >
                            {photo.title ||
                              `照片 ${String(index + 1).padStart(2, "0")}`}
                          </p>
                          <ActionSheet
                            label={`图片操作 ${index + 1}`}
                            title="图片操作"
                            items={[
                              {
                                label: "\u7F16\u8F91\u56FE\u7247\u4FE1\u606F",
                                icon: <Pencil size={14} />,
                                action: () => setEditing(photo._key),
                              },
                              {
                                label: "\u8BBE\u4E3A\u5C01\u9762",
                                icon: <Star size={14} />,
                                action: () => setCover(photo._key),
                                disabled: cover?._key === photo._key,
                              },
                              {
                                label: photo.is_hidden
                                  ? "显示图片"
                                  : "隐藏图片",
                                icon: photo.is_hidden ? (
                                  <Eye size={14} />
                                ) : (
                                  <EyeOff size={14} />
                                ),
                                action: () =>
                                  updatePhotos((current) =>
                                    current.map((item) =>
                                      item._key === photo._key
                                        ? {
                                            ...item,
                                            is_hidden: !item.is_hidden,
                                          }
                                        : item,
                                    ),
                                  ),
                              },
                              {
                                label: "\u5411\u524D\u79FB\u52A8",
                                icon: <ArrowUp size={14} />,
                                action: () => move(index, index - 1),
                                disabled: index === 0,
                              },
                              {
                                label: "\u5411\u540E\u79FB\u52A8",
                                icon: <ArrowDown size={14} />,
                                action: () => move(index, index + 1),
                                disabled: index === photos.length - 1,
                              },
                              {
                                label: "\u4ECE\u5E16\u5B50\u79FB\u9664",
                                icon: <Trash2 size={14} />,
                                action: () => removePhoto(index),
                                danger: true,
                              },
                            ]}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <UploadQueue
                  compact={!!photos.length}
                  remaining={200 - photos.length}
                  limit={Number(settings.storage.max_size || 32)}
                  enabled={settings.storage.enable_storage !== false && !busy}
                  onBusy={setUploading}
                  onPhoto={(photo) => {
                    updatePhotos((current) => [
                      ...current,
                      { ...photo, _key: photo._key || crypto.randomUUID() },
                    ]);
                    setError("");
                  }}
                />
              </Card>
            </div>
            <div
              className={"ui-stack " + "editor-details-column"}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <Card className={"moment-panel " + "editor-meta"}>
                <div className="editor-section-heading">
                  <span className="editor-step">03</span>
                  <h4 className="ui-title">整理与发布</h4>
                </div>
                <div
                  className="ui-stack"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 32,
                  }}
                >
                  <div className="editor-visibility">
                    <div>
                      <p
                        className="ui-text"
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        公开到相册
                      </p>
                      <p
                        className="ui-text"
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          marginTop: 4,
                        }}
                      >
                        {draft.is_hidden
                          ? "当前仅自己可见"
                          : "发布后，访客可以看到这组照片"}
                      </p>
                    </div>
                    <Switch
                      aria-label="公开到相册"
                      checked={!draft.is_hidden}
                      onChange={(e) => field("is_hidden", !e)}
                    />
                  </div>
                  <DateTimePicker
                    label="拍摄时间"
                    value={draft.time}
                    onChange={(value) => field("time", value)}
                  />
                  <Input
                    label="拍摄地点"
                    placeholder="这组照片在哪里拍摄？"
                    value={draft.location}
                    onChange={(e) => field("location", e.currentTarget.value)}
                  />
                  <CategoryMultiSelect
                    categories={categories}
                    value={draft.category_ids}
                    onChange={(value) => field("category_ids", value)}
                  />
                  <DiscoveryEditor
                    value={draft.discovery}
                    onChange={(value) => field("discovery", value)}
                  />
                </div>
              </Card>
              {cover && (
                <Card className={"moment-panel " + "editor-cover-summary"}>
                  <img
                    className="editor-cover-thumb"
                    src={thumbnail(cover.image_url, settings)}
                    alt="当前封面"
                  />
                  <div className="editor-cover-copy">
                    <p
                      className="ui-text"
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      相册封面
                    </p>
                    <p
                      className="ui-text"
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        marginTop: 4,
                      }}
                    >
                      {visibleCount} 张公开 · {photos.length - visibleCount}{" "}
                      张隐藏
                    </p>
                    <p
                      className="ui-text"
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        marginTop: 4,
                      }}
                    >
                      在图片菜单中更换封面
                    </p>
                  </div>
                </Card>
              )}
              {!!photos.length && !visibleCount && (
                <Alert tone={tone("yellow")} icon={<EyeOff size={16} />}>
                  所有图片都已隐藏，访客不会看到这篇帖子。
                </Alert>
              )}
              {initial && (
                <p
                  className="ui-text"
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    paddingLeft: 4,
                    paddingRight: 4,
                  }}
                >
                  创建于 {initial.created_at}
                </p>
              )}
            </div>
          </div>
        </fieldset>
        <div className="editor-save-dock">
          <div className="editor-save-status" aria-live="polite">
            {autosave.status === "saved" && !autosave.dirty ? (
              <CloudCheck size={18} />
            ) : (
              <span
                className={
                  autosave.dirty ? "status-dot is-dirty" : "status-dot"
                }
              />
            )}
            <div>
              <p
                className="ui-text"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {pendingSchedule
                  ? "已安排定时发布"
                  : uploading
                    ? "照片上传中…"
                    : busy
                      ? "正在保存…"
                      : autosave.status === "saving"
                        ? "正在保存草稿…"
                        : autosave.error
                          ? "草稿未同步"
                          : autosave.dirty
                            ? "等待自动保存…"
                            : autosave.status === "saved"
                              ? "草稿已保存 · 未发布"
                              : postID
                                ? "所有修改已保存"
                                : "尚未保存"}
              </p>
              <p
                className="ui-text"
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                }}
              >
                {autosave.savedAt
                  ? `保存于 ${autosave.savedAt}`
                  : savedAt && !dirty
                    ? `上次保存 ${savedAt}`
                    : "Ctrl / ⌘ + S 保存草稿"}
              </p>
            </div>
          </div>
          <div
            className={"ui-row " + "editor-save-actions"}
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <Button
              disabled={!photos.length || busy || uploading}
              onClick={() => setPreview(true)}
              variant="ghost"
            >
              {<Eye size={16} />}
              预览
            </Button>
            <Button
              disabled={
                locked ||
                autosave.conflict ||
                autosave.status === "saving" ||
                (!autosave.dirty && autosave.status === "saved")
              }
              onClick={() => void saveDraft()}
              variant="secondary"
            >
              保存草稿
            </Button>
            <Button
              disabled={
                locked ||
                autosave.conflict ||
                publishConflict ||
                draft.is_hidden ||
                !visibleCount ||
                !draft.title.trim()
              }
              onClick={() => setScheduling(true)}
              variant="secondary"
            >
              {<CalendarClock size={16} />}
              定时发布
            </Button>
            <Button
              type="submit"
              loading={busy}
              disabled={
                uploading ||
                needsReload ||
                pendingSchedule ||
                autosave.conflict ||
                publishConflict ||
                (!dirty && !!postID)
              }
              variant="primary"
            >
              {<Save size={16} />}
              {postID
                ? "发布更新"
                : draft.is_hidden
                  ? "保存帖子"
                  : "保存并公开"}
            </Button>
          </div>
        </div>
      </Form>
      {scheduling && (
        <ScheduleDialog
          title={draft.title}
          parentDirty={autosave.dirty}
          onClose={() => setScheduling(false)}
          onConfirm={schedule}
        />
      )}
      <Drawer
        onClose={() => setEditing(null)}
        title="编辑图片信息"
        size={440}
        open={!!current}
      >
        {current && (
          <PhotoDetails
            key={current._key}
            photo={current}
            settings={settings}
            onApply={(photo) => {
              updatePhotos((current) =>
                current.map((item) =>
                  item._key === photo._key
                    ? { ...photo, _key: item._key }
                    : item,
                ),
              );
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Drawer>
      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="通过地址添加照片"
        footer={
          <>
            <Button onClick={() => setAdding(false)} variant="secondary">
              取消
            </Button>
            <Button onClick={addURLs} variant="primary">
              {<Plus size={15} />}
              添加到帖子
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
            gap: 16,
          }}
        >
          <p
            className="ui-text"
            style={{
              fontSize: 13,
              color: "var(--muted)",
            }}
          >
            每行一个图片地址，可以一次添加多张。
          </p>
          <Textarea
            label="图片地址"
            placeholder={
              "https://example.com/photo-1.jpg\nhttps://example.com/photo-2.jpg"
            }
            rows={5}
            value={urls}
            error={urlError}
            onChange={(e) => {
              setUrls(e.currentTarget.value);
              setUrlError("");
            }}
          />
        </div>
      </Dialog>
      <Dialog
        open={preview}
        onClose={() => setPreview(false)}
        title="相册内容预览"
        size="large"
      >
        <div
          className="ui-stack"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <h2 className="ui-title">{draft.title || "未命名帖子"}</h2>
          <p
            className="ui-text"
            style={{
              fontSize: 13,
              color: "var(--muted)",
            }}
          >
            {draft.location} {draft.time.replace("T", " ")}
          </p>
          <p
            className="ui-text"
            style={{
              ...{ whiteSpace: "pre-wrap" },
            }}
          >
            {draft.desc}
          </p>
          {photos
            .filter((photo) => !photo.is_hidden)
            .map((photo) => (
              <div
                key={photo._key}
                className="ui-stack"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <img src={photo.image_url} alt={photo.title || draft.title} />
                <p
                  className="ui-text"
                  style={{
                    fontWeight: 500,
                  }}
                >
                  {photo.title || draft.title}
                </p>
                <p
                  className="ui-text"
                  style={{
                    fontSize: 13,
                    color: "var(--muted)",
                  }}
                >
                  {photo.desc || draft.desc}
                </p>
              </div>
            ))}
          {draft.is_hidden && (
            <Alert tone={tone("gray")}>这篇帖子仅自己可见。</Alert>
          )}
          {!visibleCount && (
            <Alert tone={tone("gray")}>没有可公开展示的图片。</Alert>
          )}
        </div>
      </Dialog>
    </>
  );
}
