import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  Form,
  IconButton,
  Input,
  Pagination,
  PasswordField,
  Textarea,
} from "@robert-stackflow/oneui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError, json, notifyError, notifySuccess } from "../api";
import { ErrorState, Loading, PageTitle } from "../components/Common";
import { DateTimePicker } from "../components/DateTimePicker";
import { Toggle } from "../components/Toggle";
import { UnsavedChanges } from "../components/UnsavedChanges";
import { useModelForm } from "../components/useModelForm";
import { useDebouncedValue } from "../hooks";
import { thumbnail, type Post, type Settings } from "../types";
import { adminHref, tone } from "../ui-data";
import type { Share } from "./Shares";
type Detail = Share & {
  posts: Post[];
};
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
  const sharedForm = useModelForm(
    { title, password },
    {
      title: { label: "相册名称", required: true, maxLength: 100 },
      password: {
        label: "分享密码",
        disabled: !protectedByPassword,
        required: protectedByPassword && !initial?.password_required,
        minLength: 6,
        maxLength: 128,
      },
    },
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
      <Form controller={sharedForm} onSubmit={save}>
        <PageTitle title={initial ? "编辑分享相册" : "新建分享相册"}>
          <div
            className="ui-row"
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <Button href={adminHref("/shares")} variant="secondary">
              {<ArrowLeft size={16} />}
              返回
            </Button>
            <Button loading={busy} type="submit" variant="primary">
              {<Save size={16} />}
              保存相册
            </Button>
          </div>
        </PageTitle>
        {conflict && (
          <div
            style={{
              marginBottom: 24,
            }}
          >
            <Alert tone={tone("orange")}>
              <p
                className="ui-text"
                style={{
                  fontSize: 13,
                }}
              >
                相册或所选帖子已发生变化，当前编辑已保留。可以调整选择后重试，或加载最新内容重新编辑。
              </p>
              {initial && (
                <Button
                  size="small"
                  onClick={() => setReloadOpen(true)}
                  variant="secondary"
                  style={{
                    marginTop: 10,
                  }}
                >
                  加载最新相册
                </Button>
              )}
            </Alert>
          </div>
        )}
        {initial?.revoked && (
          <div
            style={{
              marginBottom: 24,
            }}
          >
            <Alert>
              此相册已撤销。保存后仍保持撤销状态，可在列表中恢复分享。
            </Alert>
          </div>
        )}
        <fieldset
          disabled={busy}
          aria-busy={busy}
          style={{
            ...{ border: 0, padding: 0, margin: 0, minWidth: 0 },
          }}
        >
          <div className="share-editor-grid">
            <div
              className="ui-stack"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <Card className="moment-panel">
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
                    label="相册名称"
                    required
                    maxLength={100}
                    value={title}
                    onChange={(e) => setTitle(e.currentTarget.value)}
                  />
                  <Textarea
                    label="描述"
                    maxLength={2000}
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.currentTarget.value)}
                  />
                  <Toggle
                    label="密码保护"
                    checked={protectedByPassword}
                    onChange={(e) => setProtected(e)}
                  />
                  {protectedByPassword ? (
                    <>
                      <PasswordField
                        {...sharedForm.field("password")}
                        onChange={(value) => setPassword(value)}
                        label="分享密码"
                        autoComplete="new-password"
                        hint={
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
                      />
                      <Button
                        size="small"
                        onClick={() => setPassword(newPassword())}
                        variant="ghost"
                        style={{
                          width: "fit-content",
                        }}
                      >
                        {<RefreshCw size={14} />}
                        生成随机密码
                      </Button>
                    </>
                  ) : (
                    <p
                      className="ui-text"
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      任何持有链接的人都可以访问。
                    </p>
                  )}
                  <Toggle
                    label="设置有效期"
                    checked={limited}
                    onChange={(e) => setLimited(e)}
                  />
                  {limited && (
                    <div
                      className={"ui-stack " + "share-expiry"}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <DateTimePicker
                        label="到期时间"
                        description="北京时间（UTC+8）"
                        timeZone="Asia/Shanghai"
                        value={deadline}
                        onChange={setDeadline}
                      />
                      <div
                        className="ui-row"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 6,
                        }}
                      >
                        {[1, 7, 30].map((days) => (
                          <Button
                            key={days}
                            size="small"
                            onClick={() =>
                              setDeadline(
                                shanghaiDate(Date.now() + days * 86400000),
                              )
                            }
                            variant="secondary"
                          >
                            {days} 天后
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  <p
                    className={"ui-text " + "share-access-note"}
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                    }}
                  >
                    仅选中的帖子可通过此链接访问；隐藏照片和回收站内容不展示。帖子更新会同步到相册。分享限制不改变原图在原存储服务中的公开状态。
                  </p>
                </div>
              </Card>
              <Card className="moment-panel">
                <div
                  className="ui-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <h4 className="ui-title">浏览顺序</h4>
                  <Badge>{selected.length} / 100</Badge>
                </div>
                {!selected.length ? (
                  <p
                    className="ui-text"
                    style={{
                      fontSize: 13,
                      color: "var(--muted)",
                    }}
                  >
                    从帖子列表中选择内容。
                  </p>
                ) : (
                  <div
                    className="ui-stack"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {selected.map((post, index) => (
                      <div key={post.id} className="share-selected-row">
                        <span className="share-position">{index + 1}</span>
                        <img
                          src={cover(post)}
                          alt=""
                          style={{
                            width: 44,
                            height: 44,
                          }}
                        />
                        <div className="share-post-copy">
                          <p
                            className="ui-text"
                            style={{
                              fontSize: 13,
                            }}
                          >
                            {post.title}
                          </p>
                          {post.is_hidden && (
                            <p
                              className="ui-text"
                              style={{
                                fontSize: 12,
                                color: "var(--muted)",
                              }}
                            >
                              隐藏帖子 · 仅在分享中展示
                            </p>
                          )}
                        </div>
                        <div
                          className="ui-row"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            flexWrap: "nowrap",
                            gap: 2,
                          }}
                        >
                          <IconButton
                            disabled={index === 0}
                            label={`上移 ${post.title}`}
                            onClick={() => move(index, -1)}
                            variant="ghost"
                          >
                            <ArrowUp size={14} />
                          </IconButton>
                          <IconButton
                            disabled={index === selected.length - 1}
                            label={`下移 ${post.title}`}
                            onClick={() => move(index, 1)}
                            variant="ghost"
                          >
                            <ArrowDown size={14} />
                          </IconButton>
                          <IconButton
                            label={`移除 ${post.title}`}
                            onClick={() => choose(post, false)}
                            variant="ghost"
                          >
                            <X size={15} />
                          </IconButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
            <Card className={"moment-panel " + "share-picker"}>
              <div
                className="ui-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                  justifyContent: "space-between",
                  marginBottom: 24,
                }}
              >
                <h4 className="ui-title">选择帖子</h4>
                <Plus size={18} />
              </div>
              <div
                style={{
                  marginBottom: 24,
                }}
              >
                <Input
                  aria-label="搜索帖子"
                  placeholder="搜索标题或描述"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.currentTarget.value);
                    setPage(1);
                  }}
                  leading={<Search size={16} />}
                />
              </div>
              {posts.isLoading ? (
                <Loading />
              ) : posts.isError ? (
                <ErrorState error={posts.error} retry={posts.refetch} />
              ) : (
                <>
                  <div
                    className="ui-stack"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {posts.data?.data.map((post) => {
                      const visible = post.images.filter(
                          (p) => !p.is_hidden,
                        ).length,
                        checked = selected.some((p) => p.id === post.id);
                      return (
                        <div
                          onClick={(event) => {
                            if (
                              !(event.target as Element).closest(
                                "label,input,button,a",
                              ) &&
                              !busy &&
                              visible
                            )
                              choose(post, !checked);
                          }}
                          key={post.id}
                          className={`share-pick-row ${checked ? "is-selected" : ""} ${!visible ? "is-disabled" : ""}`}
                        >
                          <Checkbox
                            onChange={(checked) => choose(post, checked)}
                            label={`选择 ${post.title}`}
                            checked={checked}
                            disabled={busy || !visible}
                          />
                          <img
                            src={cover(post)}
                            alt=""
                            style={{
                              width: 56,
                              height: 56,
                            }}
                          />
                          <div className="share-post-copy">
                            <p
                              className="ui-text"
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                              }}
                            >
                              {post.title}
                            </p>
                            <p
                              className="ui-text"
                              style={{
                                fontSize: 12,
                                color: "var(--muted)",
                              }}
                            >
                              {visible
                                ? `${visible} 张照片${post.is_hidden ? " · 隐藏帖子" : ""}`
                                : "没有可分享的照片"}
                            </p>
                          </div>
                          {checked && <Check size={16} />}
                        </div>
                      );
                    })}
                  </div>
                  {!posts.data?.data.length && (
                    <p
                      className="ui-text"
                      style={{
                        color: "var(--muted)",
                        fontSize: 13,
                      }}
                    >
                      没有匹配的帖子。
                    </p>
                  )}
                  {(posts.data?.total || 0) > 12 && (
                    <div
                      style={{
                        marginTop: 24,
                      }}
                    >
                      <Pagination
                        page={page}
                        onPageChange={setPage}
                        total={Math.ceil((posts.data?.total || 0) / 12)}
                        pageSize={1}
                        summary={null}
                      />
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>
        </fieldset>
      </Form>
      <Dialog
        open={reloadOpen}
        onClose={() => setReloadOpen(false)}
        title="加载最新相册？"
        footer={
          <>
            <Button onClick={() => setReloadOpen(false)} variant="secondary">
              继续编辑
            </Button>
            <Button
              onClick={() => {
                void client.invalidateQueries({ queryKey: ["share-picker"] });
                onReload();
              }}
              variant="primary"
            >
              放弃编辑并加载
            </Button>
          </>
        }
        variant="default"
      >
        <p
          className="ui-text"
          style={{
            fontSize: 13,
          }}
        >
          当前未保存的编辑将被替换。请先复制需要保留的文字或密码。
        </p>
      </Dialog>
    </>
  );
}
