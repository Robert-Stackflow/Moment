import { Toggle as Switch } from "./Toggle";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ActionIcon,
  Alert,
  Button,
  Drawer,
  Group,
  Image,
  Menu,
  Modal,
  Paper,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CloudCheck,
  FilePenLine,
  Eye,
  EyeOff,
  GripVertical,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Star,
  Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError, json, notifyError, notifySuccess } from "../api";
import { PageTitle } from "./Common";
import { UnsavedChanges } from "./UnsavedChanges";
import { CategoryMultiSelect } from "./CategoryPicker";
import { DateTimePicker } from "./DateTimePicker";
import { localDateTime } from "./dateTime";
import { PhotoDetails } from "./PhotoDetails";
import { DiscoveryEditor, defaultDiscovery } from "./DiscoveryEditor";
import { UploadQueue } from "./UploadQueue";
import { usePostDraft } from "./usePostDraft";
import { datetime, thumbnail } from "../types";
import type {
  Category,
  Discovery,
  Photo,
  Post,
  PostContent,
  PostDraft,
  Settings,
} from "../types";

function formValues(post?: PostContent): {
  discovery: Discovery;
  title: string;
  desc: string;
  location: string;
  time: string;
  is_hidden: boolean;
  category_ids: string[];
  images: (Photo & { _key: string })[];
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
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [publishConflict, setPublishConflict] = useState(false);
  const [needsReload, setNeedsReload] = useState(false);
  const [removed, setRemoved] = useState<{
    photo: Photo & { _key: string };
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
  const locked = busy || uploading || needsReload;
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
      const result = await api<{ id: number }>(
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
    if (busy || uploading || editing || adding || preview || needsReload)
      return;
    try {
      await autosave.flush();
      notifySuccess("草稿已保存");
    } catch (cause) {
      notifyError(cause);
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
      <form
        className="post-editor"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <UnsavedChanges dirty={autosave.dirty} uploading={uploading} />
        <PageTitle title={initial ? "编辑帖子" : "新建帖子"}>
          <Button
            component={Link}
            to="/posts"
            variant="subtle"
            color="gray"
            leftSection={<ArrowLeft size={16} />}
            disabled={busy}
          >
            返回帖子
          </Button>
        </PageTitle>
        {publishConflict && (
          <Alert color="orange" title="帖子已有更新" mb="lg">
            <Text size="sm" mb="sm">
              其他窗口已经修改了这篇帖子。草稿仍完整保留，可另存为新草稿后对比整理。
            </Text>
            <Button
              variant="light"
              color="orange"
              loading={busy}
              onClick={() => void saveCopy()}
            >
              另存为新草稿
            </Button>
          </Alert>
        )}
        <div className="draft-notice">
          <FilePenLine size={17} />
          <Text size="sm">
            {initialDraft ? "已恢复未发布的草稿。" : "编辑会自动保存为草稿。"}
            {postID ? "发布更新后，访客才会看到修改。" : "发布前仅自己可见。"}
          </Text>
        </div>
        {autosave.error && (
          <Alert
            color="orange"
            title={autosave.conflict ? "编辑版本发生冲突" : "草稿尚未同步"}
            mb="lg"
          >
            <Stack gap="sm">
              <Text size="sm">
                {autosave.error.message}
                {autosave.conflict
                  ? "。当前内容仍在本页，可另存一份新草稿后对比处理。"
                  : autosave.error instanceof ApiError &&
                    autosave.error.status === 401
                  ? "。请在新标签页登录，再回来重试。"
                  : "。内容仍在本页，恢复连接后会自动重试。"}
              </Text>
              <Group>
                {autosave.conflict ? (
                  <Button
                    variant="light"
                    color="orange"
                    loading={busy}
                    onClick={() => void saveCopy()}
                  >
                    另存为新草稿
                  </Button>
                ) : (
                  <Button
                    variant="light"
                    color="orange"
                    onClick={() => void saveDraft()}
                  >
                    立即重试
                  </Button>
                )}
                {autosave.error instanceof ApiError &&
                  autosave.error.status === 401 && (
                    <Button
                      component="a"
                      href="/admin/login"
                      target="_blank"
                      variant="default"
                    >
                      重新登录
                    </Button>
                  )}
              </Group>
            </Stack>
          </Alert>
        )}
        {error && (
          <Alert
            role="alert"
            color="red"
            mb="lg"
            withCloseButton
            onClose={() => setError("")}
          >
            {error}
          </Alert>
        )}
        <fieldset disabled={busy || needsReload} className="editor-fieldset">
          <div className="editor-layout">
            <Stack gap={22}>
              <Paper withBorder className="editor-story">
                <div className="editor-section-heading">
                  <span className="editor-step">01</span>
                  <div>
                    <Title order={4}>内容</Title>
                  </div>
                </div>
                <Stack gap="lg">
                  <TextInput
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
                    autosize
                    minRows={3}
                    value={draft.desc}
                    onChange={(e) => field("desc", e.currentTarget.value)}
                  />
                  <Text size="xs" c="dimmed" ta="right">
                    标题 {draft.title.length} / 50
                  </Text>
                </Stack>
              </Paper>
              <Paper withBorder className="editor-image-section">
                <div className="editor-section-heading">
                  <span className="editor-step">02</span>
                  <div>
                    <Title order={4}>
                      照片{" "}
                      <Text span size="sm" c="dimmed" fw={400}>
                        {photos.length} / 200
                      </Text>
                    </Title>
                    <Text size="xs" c="dimmed" mt={4}>
                      点击照片编辑；拖动排序，或在菜单中移动
                    </Text>
                  </div>
                  <Button
                    className="add-url-button"
                    size="xs"
                    variant="light"
                    leftSection={<Link2 size={14} />}
                    onClick={() => {
                      setAdding(true);
                      setUrlError("");
                    }}
                    disabled={locked || photos.length >= 200}
                  >
                    图片地址
                  </Button>
                </div>
                {removed && (
                  <div className="photo-undo" role="status">
                    <span>已从帖子移除 1 张图片</span>
                    <Button
                      size="xs"
                      variant="subtle"
                      disabled={photos.length >= 200 || locked}
                      leftSection={<RotateCcw size={13} />}
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
                    >
                      撤销
                    </Button>
                  </div>
                )}
                {!!photos.length && (
                  <div className="editor-photos">
                    {photos.map((photo, index) => (
                      <div
                        className={`photo-editor-card ${
                          dragging === photo._key ? "is-dragging" : ""
                        } ${
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
                        <button
                          type="button"
                          className="photo-edit-target"
                          aria-label={`编辑图片 ${index + 1}`}
                          onClick={() => setEditing(photo._key)}
                        >
                          <Image
                            className="photo-cover"
                            style={{
                              objectPosition: `${photo.focus_x ?? 50}% ${
                                photo.focus_y ?? 50
                              }%`,
                            }}
                            src={thumbnail(photo.image_url, settings)}
                            alt={photo.title || `图片 ${index + 1}`}
                            draggable={false}
                            loading="lazy"
                          />
                          <span className="photo-edit-hint">
                            <Pencil size={15} />
                            编辑信息
                          </span>
                        </button>
                        <span
                          className={`photo-status-badge ${
                            photo.is_hidden ? "is-hidden" : ""
                          }`}
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
                          <Text size="xs" truncate>
                            {photo.title ||
                              `照片 ${String(index + 1).padStart(2, "0")}`}
                          </Text>
                          <Menu position="bottom-end" width={172} withinPortal>
                            <Menu.Target>
                              <ActionIcon
                                variant="subtle"
                                color="gray"
                                aria-label={`图片 ${index + 1} 更多操作`}
                              >
                                <MoreHorizontal size={18} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                leftSection={<Pencil size={14} />}
                                onClick={() => setEditing(photo._key)}
                              >
                                编辑图片信息
                              </Menu.Item>
                              <Menu.Item
                                leftSection={<Star size={14} />}
                                disabled={cover?._key === photo._key}
                                onClick={() => setCover(photo._key)}
                              >
                                设为封面
                              </Menu.Item>
                              <Menu.Item
                                leftSection={
                                  photo.is_hidden ? (
                                    <Eye size={14} />
                                  ) : (
                                    <EyeOff size={14} />
                                  )
                                }
                                onClick={() =>
                                  updatePhotos((current) =>
                                    current.map((item) =>
                                      item._key === photo._key
                                        ? {
                                            ...item,
                                            is_hidden: !item.is_hidden,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              >
                                {photo.is_hidden ? "显示图片" : "隐藏图片"}
                              </Menu.Item>
                              <Menu.Divider />
                              <Menu.Item
                                leftSection={<ArrowUp size={14} />}
                                disabled={index === 0}
                                onClick={() => move(index, index - 1)}
                              >
                                向前移动
                              </Menu.Item>
                              <Menu.Item
                                leftSection={<ArrowDown size={14} />}
                                disabled={index === photos.length - 1}
                                onClick={() => move(index, index + 1)}
                              >
                                向后移动
                              </Menu.Item>
                              <Menu.Divider />
                              <Menu.Item
                                color="red"
                                leftSection={<Trash2 size={14} />}
                                onClick={() => removePhoto(index)}
                              >
                                从帖子移除
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
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
              </Paper>
            </Stack>
            <Stack gap={18} className="editor-details-column">
              <Paper withBorder className="editor-meta">
                <div className="editor-section-heading">
                  <span className="editor-step">03</span>
                  <Title order={4}>整理与发布</Title>
                </div>
                <Stack gap="xl">
                  <div className="editor-visibility">
                    <div>
                      <Text fw={600} size="sm">
                        公开到相册
                      </Text>
                      <Text size="xs" c="dimmed" mt={4}>
                        {draft.is_hidden
                          ? "当前仅自己可见"
                          : "发布后，访客可以看到这组照片"}
                      </Text>
                    </div>
                    <Switch
                      aria-label="公开到相册"
                      checked={!draft.is_hidden}
                      onChange={(e) =>
                        field("is_hidden", !e.currentTarget.checked)
                      }
                    />
                  </div>
                  <DateTimePicker
                    label="拍摄时间"
                    value={draft.time}
                    onChange={(value) => field("time", value)}
                  />
                  <TextInput
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
                </Stack>
              </Paper>
              {cover && (
                <Paper withBorder className="editor-cover-summary">
                  <Image
                    src={thumbnail(cover.image_url, settings)}
                    alt="当前封面"
                    radius={9}
                  />
                  <div>
                    <Text size="sm" fw={600}>
                      相册封面
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      {visibleCount} 张公开 · {photos.length - visibleCount}{" "}
                      张隐藏
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      在图片菜单中更换封面
                    </Text>
                  </div>
                </Paper>
              )}
              {!!photos.length && !visibleCount && (
                <Alert color="yellow" icon={<EyeOff size={16} />}>
                  所有图片都已隐藏，访客不会看到这篇帖子。
                </Alert>
              )}
              {initial && (
                <Text size="xs" c="dimmed" px={4}>
                  创建于 {initial.created_at}
                </Text>
              )}
            </Stack>
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
              <Text size="sm" fw={500}>
                {uploading
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
              </Text>
              <Text size="xs" c="dimmed">
                {autosave.savedAt
                  ? `保存于 ${autosave.savedAt}`
                  : savedAt && !dirty
                  ? `上次保存 ${savedAt}`
                  : "Ctrl / ⌘ + S 保存草稿"}
              </Text>
            </div>
          </div>
          <Group gap={8} className="editor-save-actions">
            <Button
              variant="subtle"
              color="gray"
              leftSection={<Eye size={16} />}
              disabled={!photos.length || locked}
              onClick={() => setPreview(true)}
            >
              预览
            </Button>
            <Button
              variant="default"
              disabled={
                locked ||
                autosave.conflict ||
                autosave.status === "saving" ||
                (!autosave.dirty && autosave.status === "saved")
              }
              onClick={() => void saveDraft()}
            >
              保存草稿
            </Button>
            <Button
              type="submit"
              leftSection={<Save size={16} />}
              loading={busy}
              disabled={
                uploading ||
                needsReload ||
                autosave.conflict ||
                publishConflict ||
                (!dirty && !!postID)
              }
            >
              {postID
                ? "发布更新"
                : draft.is_hidden
                ? "保存帖子"
                : "保存并公开"}
            </Button>
          </Group>
        </div>
      </form>
      <Drawer
        opened={!!current}
        onClose={() => setEditing(null)}
        title="编辑图片信息"
        position="right"
        size={440}
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
      <Modal
        opened={adding}
        onClose={() => setAdding(false)}
        title="通过地址添加照片"
        centered
      >
        <Stack>
          <Text size="sm" c="dimmed">
            每行一个图片地址，可以一次添加多张。
          </Text>
          <Textarea
            label="图片地址"
            placeholder={
              "https://example.com/photo-1.jpg\nhttps://example.com/photo-2.jpg"
            }
            minRows={5}
            autosize
            value={urls}
            error={urlError}
            onChange={(e) => {
              setUrls(e.currentTarget.value);
              setUrlError("");
            }}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setAdding(false)}>
              取消
            </Button>
            <Button onClick={addURLs} leftSection={<Plus size={15} />}>
              添加到帖子
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={preview}
        onClose={() => setPreview(false)}
        title="相册内容预览"
        size="xl"
      >
        <Stack>
          <Title order={2}>{draft.title || "未命名帖子"}</Title>
          <Text size="sm" c="dimmed">
            {draft.location} {draft.time.replace("T", " ")}
          </Text>
          <Text style={{ whiteSpace: "pre-wrap" }}>{draft.desc}</Text>
          {photos
            .filter((photo) => !photo.is_hidden)
            .map((photo) => (
              <Stack key={photo._key} gap={8}>
                <Image
                  src={photo.image_url}
                  alt={photo.title || draft.title}
                  radius="md"
                />
                <Text fw={500}>{photo.title || draft.title}</Text>
                <Text size="sm" c="dimmed">
                  {photo.desc || draft.desc}
                </Text>
              </Stack>
            ))}
          {draft.is_hidden && <Alert color="gray">这篇帖子仅自己可见。</Alert>}
          {!visibleCount && <Alert color="gray">没有可公开展示的图片。</Alert>}
        </Stack>
      </Modal>
    </>
  );
}
