import {
  Alert,
  Button,
  Card,
  Dialog,
  Form,
  IconButton,
  Input,
  PasswordField,
  PasskeyItem,
} from "@robert-stackflow/oneui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import { api, ApiError, json, notifySuccess } from "../api";
import { ErrorState, Loading } from "../components/Common";
import { UnsavedChanges } from "../components/UnsavedChanges";
import { useModelForm } from "../components/useModelForm";
import {
  canUsePasskeys,
  passkeyError,
  registerPasskey,
  type Passkey,
  type PasskeyConfig,
} from "../passkeys";
import { useAuth } from "../session";
import { adminHref, tone } from "../ui-data";
type Dialog =
  | {
      kind: "create";
    }
  | {
      kind: "rename" | "delete";
      key: Passkey;
    };
export default function Security() {
  const client = useQueryClient();
  const auth = useAuth();
  const navigate = useNavigate();
  const config = useQuery({
    queryKey: ["passkeyConfig"],
    queryFn: () => api<PasskeyConfig>("/passkeys/config"),
    staleTime: 0,
  });
  const keys = useQuery({
    queryKey: ["passkeys"],
    queryFn: () => api<Passkey[]>("/me/passkeys"),
    staleTime: 0,
  });
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const sharedForm = useModelForm(
    { name, password },
    {
      name: {
        label: "密钥名称",
        required: dialog?.kind !== "delete",
        disabled: dialog?.kind === "delete",
        maxLength: 60,
      },
      password: {
        label: "当前密码",
        required: dialog?.kind === "delete",
        disabled: dialog?.kind !== "delete",
      },
    },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [reloadPrompt, setReloadPrompt] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const dirty =
    !!dialog &&
    (!!password ||
      (dialog.kind === "rename"
        ? name !== dialog.key.name
        : dialog.kind === "create" && !!name));
  function open(value: Dialog) {
    setDialog(value);
    sharedForm.reset({
      name: "key" in value ? value.key.name : "",
      password: "",
    });
    setName("key" in value ? value.key.name : "");
    setPassword("");
    setError("");
    setConflict(false);
  }
  function close() {
    if (!busy) {
      setDialog(null);
      setPassword("");
      setError("");
    }
  }
  async function submit() {
    if (!dialog || busy) return;
    setBusy(true);
    setError("");
    setConflict(false);
    setFinishing(false);
    controller.current = new AbortController();
    try {
      switch (dialog.kind) {
        case "create":
          await registerPasskey(name, controller.current.signal, () =>
            setFinishing(true),
          );
          break;
        case "rename":
          await api(
            `/me/passkeys/${dialog.key.id}`,
            json("PATCH", { name, revision: dialog.key.revision }),
          );
          break;
        case "delete":
          await api(
            `/me/passkeys/${dialog.key.id}`,
            json("DELETE", { password, revision: dialog.key.revision }),
          );
          break;
      }
      const removed = dialog.kind === "delete";
      flushSync(() => {
        setDialog(null);
        setPassword("");
        setBusy(false);
      });
      if (removed) {
        notifySuccess("密钥已移除，所有设备已退出，请重新登录");
        await auth.refresh();
        navigate("/login", { replace: true });
      } else {
        notifySuccess(dialog.kind === "create" ? "通行密钥已添加" : "已保存");
        await Promise.all([config.refetch(), keys.refetch()]);
      }
      void client.invalidateQueries({ queryKey: ["passkeyConfig"] });
    } catch (cause) {
      setError(passkeyError(cause));
      setConflict(cause instanceof ApiError && cause.status === 409);
      if (dialog.kind === "create") void keys.refetch();
    } finally {
      setBusy(false);
      setFinishing(false);
      controller.current = null;
    }
  }
  async function reloadLatest() {
    setReloadPrompt(false);
    setBusy(true);
    try {
      if (dialog && "key" in dialog) {
        const latest = await keys.refetch({ throwOnError: true });
        const key = latest.data?.data.find((key) => key.id === dialog.key.id);
        if (key) open({ kind: dialog.kind, key });
        else {
          setDialog(null);
          setPassword("");
          notifySuccess("此通行密钥已被移除");
        }
      } else {
        setDialog(null);
        setPassword("");
        await Promise.all([config.refetch(), keys.refetch()]);
      }
    } catch (cause) {
      setError(passkeyError(cause));
    } finally {
      setBusy(false);
    }
  }
  const settings = config.data?.data;
  const correctOrigin = settings?.origin === location.origin;
  return (
    <>
      <UnsavedChanges
        dirty={dirty || busy}
        message="登录与安全设置尚未保存，离开将中断当前操作。"
      />
      {config.isPending || keys.isPending ? (
        <Loading />
      ) : config.error || keys.error ? (
        <ErrorState
          error={(config.error || keys.error)!}
          retry={() => {
            void config.refetch();
            void keys.refetch();
          }}
        />
      ) : (
        <div
          className="ui-stack"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 32,
          }}
        >
          <Card
            className="account-panel"
            title="通行密钥"
            action={
              <div className="row-actions">
                <IconButton
                  label="刷新通行密钥"
                  loading={config.isFetching || keys.isFetching}
                  onClick={() => {
                    void config.refetch();
                    void keys.refetch();
                  }}
                  variant="ghost"
                >
                  <RefreshCw size={17} />
                </IconButton>
                <Button
                  size="small"
                  variant="primary"
                  disabled={
                    busy ||
                    !correctOrigin ||
                    !canUsePasskeys() ||
                    (keys.data?.data.length || 0) >= 20
                  }
                  onClick={() => open({ kind: "create" })}
                >
                  <Plus size={16} />
                  添加通行密钥
                </Button>
              </div>
            }
          >
            {(!canUsePasskeys() || !correctOrigin) && (
              <Alert tone="warning">
                当前浏览器或网址不支持通行密钥。请使用支持通行密钥的浏览器和
                HTTPS；本地预览请用 localhost。
              </Alert>
            )}
            {!keys.data?.data.length ? (
              <p className="account-empty">还没有通行密钥</p>
            ) : (
              <div
                className="account-item-list"
                role="list"
                aria-label="通行密钥"
              >
                {keys.data.data.map((key) => (
                  <PasskeyItem
                    key={key.id}
                    name={key.name}
                    createdAt={key.created_at}
                    lastUsedAt={key.last_used_at || undefined}
                    description={
                      key.rp_id !== settings?.rp_id
                        ? `属于其他登录域名：${key.rp_id}`
                        : undefined
                    }
                    disabled={busy}
                    onRename={() => open({ kind: "rename", key })}
                    onRemove={() => open({ kind: "delete", key })}
                  />
                ))}
              </div>
            )}
          </Card>
          <div className="account-recovery">
            <p>设备丢失时，可使用账户密码登录并移除对应的通行密钥。</p>
            <Button
              size="small"
              href={adminHref("/account/password")}
              variant="ghost"
            >
              管理账户密码
            </Button>
          </div>
        </div>
      )}
      <Dialog
        open={!!dialog}
        onClose={close}
        title={
          dialog?.kind === "create"
            ? "添加通行密钥"
            : dialog?.kind === "rename"
              ? "重命名通行密钥"
              : "移除通行密钥？"
        }
        busy={busy}
      >
        {dialog && (
          <Form controller={sharedForm} onSubmit={submit}>
            <div
              className="ui-stack"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 24,
              }}
            >
              {(dialog.kind === "create" || dialog.kind === "rename") && (
                <Input
                  {...sharedForm.field("name")}
                  label="密钥名称"
                  placeholder="例如：我的笔记本"
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  maxLength={60}
                  required
                  disabled={busy}
                  autoComplete="off"
                />
              )}
              {dialog.kind === "create" && (
                <p
                  className="ui-text"
                  style={{
                    fontSize: 13,
                    color: "var(--muted)",
                  }}
                >
                  浏览器会请你选择保存位置并验证身份。
                </p>
              )}
              {dialog.kind === "delete" && (
                <Alert tone={tone("orange")}>
                  移除「{dialog.key.name}
                  」后，它将无法登录。所有设备（包括本机）的登录会话都会退出，请确认还记得账户密码。
                </Alert>
              )}
              {dialog.kind === "delete" && (
                <PasswordField
                  {...sharedForm.field("password")}
                  onChange={(value) => setPassword(value)}
                  label="当前密码"
                  value={password}
                  autoComplete="current-password"
                  required
                  disabled={busy}
                />
              )}
              {busy && dialog.kind === "create" && (
                <p
                  role="status"
                  className="ui-text"
                  style={{
                    fontSize: 13,
                    color: "var(--muted)",
                  }}
                >
                  {finishing ? "验证成功，正在保存…" : "正在等待设备验证…"}
                </p>
              )}
              {error && (
                <Alert tone={tone("red")}>
                  {error}
                  {conflict && (
                    <Button
                      size="small"
                      onClick={() => setReloadPrompt(true)}
                      variant="danger"
                    >
                      重新加载
                    </Button>
                  )}
                </Alert>
              )}
              <div
                className="ui-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  disabled={busy && (dialog.kind !== "create" || finishing)}
                  onClick={() => (busy ? controller.current?.abort() : close())}
                  variant="secondary"
                >
                  {busy ? "取消验证" : "取消"}
                </Button>
                <Button type="submit" loading={busy} variant="primary">
                  {dialog.kind === "create"
                    ? "验证并添加"
                    : dialog.kind === "delete"
                      ? "确认移除"
                      : "保存"}
                </Button>
              </div>
            </div>
          </Form>
        )}
      </Dialog>
      <Dialog
        open={reloadPrompt}
        onClose={() => setReloadPrompt(false)}
        title="放弃当前修改并重新加载？"
      >
        <p
          className="ui-text"
          style={{
            fontSize: 13,
          }}
        >
          另一处修改已保存。重新加载后，此窗口尚未保存的内容会被替换。
        </p>
        <div
          className="ui-row"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 24,
          }}
        >
          <Button onClick={() => setReloadPrompt(false)} variant="secondary">
            继续编辑
          </Button>
          <Button onClick={() => void reloadLatest()} variant="primary">
            放弃修改并重新加载
          </Button>
        </div>
      </Dialog>
    </>
  );
}
