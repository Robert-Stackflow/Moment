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
  PasswordInput,
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
  Check,
  Plus,
  RefreshCw,
  Save,
  Search,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, json, notifyError, notifySuccess, ApiError } from "../api";
import { ErrorState, Loading, PageTitle } from "../components/Common";
import { UnsavedChanges } from "../components/UnsavedChanges";
import { DateTimePicker } from "../components/DateTimePicker";
import { Toggle } from "../components/Toggle";
import { thumbnail, type Post, type Settings } from "../types";
import type { Share } from "./Shares";

type Detail = Share & { posts: Post[] };
function shanghaiDate(value: number) {
  return new Date(value)
    .toLocaleString("sv-SE", { timeZone: "Asia/Shanghai" })
    .replace(" ", "T");
}
function newPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(
    crypto.getRandomValues(new Uint8Array(12)),
    (n) => alphabet[n % alphabet.length],
  ).join("");
}

export default function ShareEditor() {
  const { id } = useParams();
  const detail = useQuery({
    queryKey: ["share", id],
    queryFn: () => api<Detail>(`/shares/${id}`),
    enabled: !!id,
    staleTime: 0,
    refetchOnReconnect: false,
  });
  if (id && detail.isFetching) return <Loading />;
  if (id && detail.isError)
    return <ErrorState error={detail.error} retry={detail.refetch} />;
  return (
    <ShareForm
      key={id || "new"}
      initial={detail.data?.data}
      onReload={() => {
        void detail.refetch();
      }}
    />
  );
}
function ShareForm({
  initial,
  onReload,
}: {
  initial?: Detail;
  onReload: () => void;
}) {
  const client = useQueryClient(),
    navigate = useNavigate();
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [selected, setSelected] = useState<Post[]>(initial?.posts || []);
  const [protectedByPassword, setProtected] = useState(
    initial ? initial.password_required : true,
  );
  const [password, setPassword] = useState("");
  const [limited, setLimited] = useState(initial ? !!initial.expires_at : true);
  const [deadline, setDeadline] = useState(() =>
    shanghaiDate(
      initial?.expires_at
        ? initial.expires_at * 1000
        : Date.now() + 7 * 86400000,
    ),
  );
  const [baseline] = useState(() =>
    JSON.stringify({
      title,
      description,
      ids: selected.map((p) => p.id),
      protectedByPassword,
      password,
      limited,
      deadline,
    }),
  );
  const [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false),
    [conflict, setConflict] = useState(false);
  const [reloadOpen, setReloadOpen] = useState(false);
  const dirty =
    !saved &&
    baseline !==
      JSON.stringify({
        title,
        description,
        ids: selected.map((p) => p.id),
        protectedByPassword,
        password,
        limited,
        deadline,
      });
  const [search, setSearch] = useState("");
  const [q] = useDebouncedValue(search, 250);
  const [page, setPage] = useState(1);
  const posts = useQuery({
    queryKey: ["share-picker", q, page],
    queryFn: () =>
      api<Post[]>(
        `/posts?${new URLSearchParams({
          q,
          page: String(page),
          page_size: "12",
        })}`,
      ),
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/settings"),
  });
  useEffect(() => {
    if (saved) navigate("/shares", { replace: true });
  }, [saved, navigate]);
  function move(index: number, offset: number) {
    if (index + offset < 0 || index + offset >= selected.length) return;
    setSelected((current) => {
      const next = [...current];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next;
    });
  }
  function choose(post: Post, checked: boolean) {
    if (checked && selected.length >= 100) {
      notifyError(new Error("每个相册最多选择 100 篇帖子"));
      return;
    }
    setSelected((current) =>
      checked ? [...current, post] : current.filter((p) => p.id !== post.id),
    );
  }
  async function save() {
    if (busy) return;
    if (!title.trim() || !selected.length) {
      notifyError(new Error("请填写名称并选择至少一篇帖子"));
      return;
    }
    const expires = limited
      ? Math.floor(Date.parse(deadline + "+08:00") / 1000)
      : null;
    if (limited && (!expires || expires <= Date.now() / 1000)) {
      notifyError(new Error("请选择未来的到期时间（北京时间）"));
      return;
    }
    if (
      protectedByPassword &&
      (!initial?.password_required || password) &&
      (Array.from(password).length < 6 || Array.from(password).length > 128)
    ) {
      notifyError(new Error("请设置至少 6 位分享密码"));
      return;
    }
    setBusy(true);
    try {
      await api(
        initial ? `/shares/${initial.id}` : "/shares",
        json(initial ? "PUT" : "POST", {
          title,
          description,
          post_ids: selected.map((p) => p.id),
          revision: initial?.revision || 0,
          expires_at: expires,
          ...(protectedByPassword
            ? password
              ? { password }
              : {}
            : { password: "" }),
        }),
      );
      await client.invalidateQueries({ queryKey: ["shares"] });
      notifySuccess(
        initial ? "相册已更新，原访问授权已失效" : "分享相册已创建",
      );
      setSaved(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setConflict(true);
      notifyError(error);
    } finally {
      setBusy(false);
    }
  }
  const cover = (post: Post) =>
    thumbnail(
      post.images.find((p) => !p.is_hidden)?.image_url || "",
      settings.data?.data,
      320,
    );
  return (
    <>
      <UnsavedChanges dirty={dirty} uploading={busy} />
      <PageTitle title={initial ? "编辑分享相册" : "新建分享相册"}>
        <Group>
          <Button
            variant="default"
            component={Link}
            to="/shares"
            leftSection={<ArrowLeft size={16} />}
          >
            返回
          </Button>
          <Button
            loading={busy}
            leftSection={<Save size={16} />}
            onClick={() => void save()}
          >
            保存相册
          </Button>
        </Group>
      </PageTitle>
      {conflict && (
        <Alert color="orange" mb="lg">
          <Text size="sm">
            相册或所选帖子已发生变化，当前编辑已保留。可以调整选择后重试，或加载最新内容重新编辑。
          </Text>
          {initial && (
            <Button
              mt="sm"
              size="xs"
              color="orange"
              variant="light"
              onClick={() => setReloadOpen(true)}
            >
              加载最新相册
            </Button>
          )}
        </Alert>
      )}
      {initial?.revoked && (
        <Alert mb="lg">
          此相册已撤销。保存后仍保持撤销状态，可在列表中恢复分享。
        </Alert>
      )}
      <fieldset
        disabled={busy}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        aria-busy={busy}
      >
        <div className="share-editor-grid">
          <Stack>
            <Paper withBorder p="xl">
              <Stack gap="lg">
                <TextInput
                  label="相册名称"
                  required
                  maxLength={100}
                  value={title}
                  onChange={(e) => setTitle(e.currentTarget.value)}
                />
                <Textarea
                  label="描述"
                  maxLength={2000}
                  autosize
                  minRows={2}
                  value={description}
                  onChange={(e) => setDescription(e.currentTarget.value)}
                />
                <Toggle
                  label="密码保护"
                  checked={protectedByPassword}
                  onChange={(e) => setProtected(e.currentTarget.checked)}
                />
                {protectedByPassword ? (
                  <>
                    <PasswordInput
                      label="分享密码"
                      autoComplete="new-password"
                      description={
                        initial?.password_required
                          ? "留空保留当前密码；保存后访客需重新解锁"
                          : "至少 6 位，密码不会随链接一起复制"
                      }
                      placeholder={
                        initial?.password_required
                          ? "已设置密码"
                          : "设置访问密码"
                      }
                      maxLength={128}
                      value={password}
                      onChange={(e) => setPassword(e.currentTarget.value)}
                    />
                    <Button
                      variant="subtle"
                      size="xs"
                      w="fit-content"
                      leftSection={<RefreshCw size={14} />}
                      onClick={() => setPassword(newPassword())}
                    >
                      生成随机密码
                    </Button>
                  </>
                ) : (
                  <Text size="xs" c="dimmed">
                    任何持有链接的人都可以访问。
                  </Text>
                )}
                <Toggle
                  label="设置有效期"
                  checked={limited}
                  onChange={(e) => setLimited(e.currentTarget.checked)}
                />
                {limited && (
                  <>
                    <DateTimePicker
                      label="到期时间"
                      description="北京时间（UTC+8）"
                      getNow={() => new Date(shanghaiDate(Date.now()))}
                      value={deadline}
                      onChange={setDeadline}
                    />
                    <Group gap="xs">
                      {[1, 7, 30].map((days) => (
                        <Button
                          key={days}
                          size="compact-xs"
                          variant="light"
                          onClick={() =>
                            setDeadline(
                              shanghaiDate(Date.now() + days * 86400000),
                            )
                          }
                        >
                          {days} 天后
                        </Button>
                      ))}
                    </Group>
                  </>
                )}
                <Text size="xs" c="dimmed">
                  仅选中的帖子可通过此链接访问；隐藏照片和回收站内容不展示。帖子更新会同步到相册。分享限制不改变原图在原存储服务中的公开状态。
                </Text>
              </Stack>
            </Paper>
            <Paper withBorder p="xl">
              <Group justify="space-between" mb="md">
                <Title order={4}>浏览顺序</Title>
                <Badge variant="light">{selected.length} / 100</Badge>
              </Group>
              {!selected.length ? (
                <Text size="sm" c="dimmed">
                  从帖子列表中选择内容。
                </Text>
              ) : (
                <Stack gap="xs">
                  {selected.map((post, index) => (
                    <div key={post.id} className="share-selected-row">
                      <span className="share-position">{index + 1}</span>
                      <Image
                        w={44}
                        h={44}
                        radius={7}
                        src={cover(post)}
                        alt=""
                      />
                      <div className="share-post-copy">
                        <Text size="sm" truncate>
                          {post.title}
                        </Text>
                        {post.is_hidden && (
                          <Text size="xs" c="dimmed">
                            隐藏帖子 · 仅在分享中展示
                          </Text>
                        )}
                      </div>
                      <Group gap={2} wrap="nowrap">
                        <ActionIcon
                          variant="subtle"
                          disabled={index === 0}
                          aria-label={`上移 ${post.title}`}
                          onClick={() => move(index, -1)}
                        >
                          <ArrowUp size={14} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          disabled={index === selected.length - 1}
                          aria-label={`下移 ${post.title}`}
                          onClick={() => move(index, 1)}
                        >
                          <ArrowDown size={14} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          aria-label={`移除 ${post.title}`}
                          onClick={() => choose(post, false)}
                        >
                          <X size={15} />
                        </ActionIcon>
                      </Group>
                    </div>
                  ))}
                </Stack>
              )}
            </Paper>
          </Stack>
          <Paper withBorder p="xl" className="share-picker">
            <Group justify="space-between" mb="lg">
              <Title order={4}>选择帖子</Title>
              <Plus size={18} />
            </Group>
            <TextInput
              mb="lg"
              aria-label="搜索帖子"
              placeholder="搜索标题或描述"
              value={search}
              onChange={(e) => {
                setSearch(e.currentTarget.value);
                setPage(1);
              }}
              leftSection={<Search size={16} />}
            />
            {posts.isLoading ? (
              <Loading />
            ) : posts.isError ? (
              <ErrorState error={posts.error} retry={posts.refetch} />
            ) : (
              <>
                <Stack gap="xs">
                  {posts.data?.data.map((post) => {
                    const visible = post.images.filter(
                        (p) => !p.is_hidden,
                      ).length,
                      checked = selected.some((p) => p.id === post.id);
                    return (
                      <label
                        key={post.id}
                        className={`share-pick-row ${
                          checked ? "is-selected" : ""
                        } ${!visible ? "is-disabled" : ""}`}
                      >
                        <Checkbox
                          aria-label={`选择 ${post.title}`}
                          checked={checked}
                          disabled={busy || !visible}
                          onChange={(e) =>
                            choose(post, e.currentTarget.checked)
                          }
                        />
                        <Image
                          src={cover(post)}
                          alt=""
                          w={56}
                          h={56}
                          radius={8}
                        />
                        <div className="share-post-copy">
                          <Text size="sm" fw={500} truncate>
                            {post.title}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {visible
                              ? `${visible} 张照片${
                                  post.is_hidden ? " · 隐藏帖子" : ""
                                }`
                              : "没有可分享的照片"}
                          </Text>
                        </div>
                        {checked && <Check size={16} />}
                      </label>
                    );
                  })}
                </Stack>
                {!posts.data?.data.length && (
                  <Text c="dimmed" size="sm">
                    没有匹配的帖子。
                  </Text>
                )}
                {(posts.data?.total || 0) > 12 && (
                  <Pagination
                    size="sm"
                    mt="lg"
                    value={page}
                    onChange={setPage}
                    total={Math.ceil((posts.data?.total || 0) / 12)}
                  />
                )}
              </>
            )}
          </Paper>
        </div>
      </fieldset>
      <Modal
        opened={reloadOpen}
        onClose={() => setReloadOpen(false)}
        title="加载最新相册？"
        centered
      >
        <Text size="sm">
          当前未保存的编辑将被替换。请先复制需要保留的文字或密码。
        </Text>
        <Group mt="xl" justify="flex-end">
          <Button variant="default" onClick={() => setReloadOpen(false)}>
            继续编辑
          </Button>
          <Button
            color="orange"
            onClick={() => {
              void client.invalidateQueries({ queryKey: ["share-picker"] });
              onReload();
            }}
          >
            放弃编辑并加载
          </Button>
        </Group>
      </Modal>
    </>
  );
}
