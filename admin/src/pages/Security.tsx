import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  Fingerprint,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError, json, notifySuccess } from "../api";
import {
  canUsePasskeys,
  passkeyError,
  registerPasskey,
  type Passkey,
  type PasskeyConfig,
} from "../passkeys";
import { useAuth } from "../session";
import { ErrorState, Loading } from "../components/Common";
import { Toggle } from "../components/Toggle";
import { UnsavedChanges } from "../components/UnsavedChanges";

type Dialog =
  | { kind: "create" }
  | { kind: "config"; config: PasskeyConfig }
  | { kind: "rename" | "delete"; key: Passkey };
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
  const [enabled, setEnabled] = useState(false);
  const [origin, setOrigin] = useState("");
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
      (dialog.kind === "config"
        ? enabled !== dialog.config.enabled ||
          origin !== (dialog.config.origin || location.origin)
        : dialog.kind === "rename"
        ? name !== dialog.key.name
        : dialog.kind === "create" && !!name));
  function open(value: Dialog) {
    setDialog(value);
    setName("key" in value ? value.key.name : "");
    setPassword("");
    setError("");
    setConflict(false);
    if (value.kind === "config") {
      setEnabled(value.config.enabled);
      setOrigin(value.config.origin || location.origin);
    }
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
        case "config":
          await api(
            "/passkeys/config",
            json("PUT", {
              enabled,
              origin,
              revision: dialog.config.revision,
              password,
            }),
          );
          break;
        case "create":
          await registerPasskey(name, password, controller.current.signal, () =>
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
      if (dialog?.kind === "config") {
        const latest = await config.refetch({ throwOnError: true });
        if (latest.data) open({ kind: "config", config: latest.data.data });
      } else if (dialog && "key" in dialog) {
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
        <Stack gap="xl">
          <Paper withBorder p="xl">
            <Title order={3} mb="lg">
              登录安全
            </Title>
            <Group justify="space-between" align="flex-start" gap="lg">
              <div>
                <Group gap="sm">
                  <Fingerprint size={23} />
                  <Title order={4}>通行密钥</Title>
                  <Badge
                    color={settings?.enabled ? "teal" : "gray"}
                    variant="light"
                  >
                    {settings?.enabled ? "已启用" : "未启用"}
                  </Badge>
                </Group>
                <Text c="dimmed" size="sm" mt="sm">
                  使用设备的指纹、面容、PIN
                  或安全密钥验证身份，无需输入账户密码。
                </Text>
              </div>
              <Button
                variant="default"
                size="sm"
                leftSection={<Settings2 size={16} />}
                onClick={() =>
                  settings && open({ kind: "config", config: settings })
                }
              >
                登录配置
              </Button>
            </Group>
            {settings?.origin && (
              <Text size="sm" mt="lg" style={{ overflowWrap: "anywhere" }}>
                登录网址：{settings.origin}
              </Text>
            )}
            {settings?.enabled && !correctOrigin && (
              <Alert color="orange" mt="md">
                当前网址与通行密钥配置不同，请从 {settings.origin}{" "}
                登录，或在「登录配置」中更新网址。密码登录仍可使用。
              </Alert>
            )}
            {!canUsePasskeys() && (
              <Alert color="orange" mt="md">
                当前浏览器或网址不支持通行密钥。请使用支持通行密钥的浏览器和
                HTTPS；本地预览请用 localhost。
              </Alert>
            )}
          </Paper>
          <Paper withBorder p="xl">
            <Group justify="space-between" mb="lg">
              <Title order={4}>我的通行密钥</Title>
              <Group gap="xs">
                <ActionIcon
                  variant="subtle"
                  aria-label="刷新通行密钥"
                  loading={config.isFetching || keys.isFetching}
                  onClick={() => {
                    void config.refetch();
                    void keys.refetch();
                  }}
                >
                  <RefreshCw size={17} />
                </ActionIcon>
                <Button
                  size="sm"
                  leftSection={<Plus size={16} />}
                  disabled={
                    !settings?.enabled ||
                    !correctOrigin ||
                    !canUsePasskeys() ||
                    (keys.data?.data.length || 0) >= 20
                  }
                  onClick={() => open({ kind: "create" })}
                >
                  添加通行密钥
                </Button>
              </Group>
            </Group>
            {!keys.data?.data.length ? (
              <Text c="dimmed" size="sm">
                还没有通行密钥。建议添加常用设备，再保留另一台设备作为备用。
              </Text>
            ) : (
              <Stack gap="sm">
                {keys.data.data.map((key) => (
                  <div key={key.id} className="passkey-row">
                    <KeyRound size={21} className="passkey-row-icon" />
                    <div className="passkey-row-copy">
                      <Text fw={600} style={{ overflowWrap: "anywhere" }}>
                        {key.name}
                      </Text>
                      <Text size="xs" c="dimmed" mt={4}>
                        添加于 {key.created_at}
                      </Text>
                      <Text size="xs" c="dimmed" mt={3}>
                        {key.last_used_at
                          ? `最近使用 ${key.last_used_at}`
                          : "尚未用于登录"}
                      </Text>
                      {key.rp_id !== settings?.rp_id && (
                        <Text size="xs" c="orange" mt={4}>
                          属于其他登录域名：{key.rp_id}
                        </Text>
                      )}
                    </div>
                    <Group gap={4} wrap="nowrap">
                      <ActionIcon
                        variant="subtle"
                        aria-label={`重命名 ${key.name}`}
                        onClick={() => open({ kind: "rename", key })}
                      >
                        <Pencil size={17} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label={`移除 ${key.name}`}
                        onClick={() => open({ kind: "delete", key })}
                      >
                        <Trash2 size={17} />
                      </ActionIcon>
                    </Group>
                  </div>
                ))}
              </Stack>
            )}
          </Paper>
          <Paper withBorder p="xl">
            <Title order={4}>设备丢失或无法验证？</Title>
            <Text size="sm" c="dimmed" mt="sm">
              使用原来的用户名和密码登录，再移除丢失设备的通行密钥。移除会退出此账户的所有登录会话。密码登录始终保留；更换网站域名后，需要为新域名重新添加密钥。
            </Text>
            <Button
              component={Link}
              to="/account/password"
              variant="subtle"
              mt="sm"
              px={0}
            >
              管理账户密码
            </Button>
          </Paper>
        </Stack>
      )}
      <Modal
        opened={!!dialog}
        onClose={close}
        title={
          dialog?.kind === "config"
            ? "通行密钥登录配置"
            : dialog?.kind === "create"
            ? "添加通行密钥"
            : dialog?.kind === "rename"
            ? "重命名通行密钥"
            : "移除通行密钥？"
        }
        centered
        closeOnClickOutside={false}
        closeOnEscape={!busy}
      >
        {dialog && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <Stack gap="lg">
              {dialog.kind === "config" && (
                <>
                  <Toggle
                    label="启用通行密钥登录"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.currentTarget.checked)}
                    disabled={busy}
                  />
                  <TextInput
                    label="登录网址"
                    placeholder="https://photos.example.com"
                    value={origin}
                    onChange={(e) => setOrigin(e.currentTarget.value)}
                    disabled={busy}
                    required={enabled}
                  />
                  <Button
                    size="xs"
                    variant="subtle"
                    disabled={busy}
                    onClick={() => setOrigin(location.origin)}
                  >
                    使用当前网址
                  </Button>
                  <Text size="sm" c="dimmed">
                    需使用 HTTPS，本地 localhost
                    除外。请在此网址打开后台后启用。更换域名后旧密钥仍保留，但不能登录新域名；关闭此功能会停止所有通行密钥登录。
                  </Text>
                </>
              )}
              {(dialog.kind === "create" || dialog.kind === "rename") && (
                <TextInput
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
                <Text size="sm" c="dimmed">
                  确认密码后，浏览器会请你选择保存位置并验证身份。私钥由设备或密码管理器保存。
                </Text>
              )}
              {dialog.kind === "delete" && (
                <Alert color="orange">
                  移除「{dialog.key.name}
                  」后，它将无法登录。所有设备（包括本机）的登录会话都会退出，请确认还记得账户密码。
                </Alert>
              )}
              {dialog.kind !== "rename" && (
                <PasswordInput
                  label="当前密码"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  autoComplete="current-password"
                  required
                  disabled={busy}
                />
              )}
              {busy && dialog.kind === "create" && (
                <Text size="sm" c="dimmed" role="status">
                  {finishing ? "验证成功，正在保存…" : "正在等待设备验证…"}
                </Text>
              )}
              {error && (
                <Alert color="red" role="alert">
                  {error}
                  {conflict && (
                    <Button
                      variant="subtle"
                      color="red"
                      size="xs"
                      onClick={() => setReloadPrompt(true)}
                    >
                      重新加载
                    </Button>
                  )}
                </Alert>
              )}
              <Group justify="flex-end">
                <Button
                  variant="default"
                  disabled={busy && (dialog.kind !== "create" || finishing)}
                  onClick={() => (busy ? controller.current?.abort() : close())}
                >
                  {busy ? "取消验证" : "取消"}
                </Button>
                <Button
                  type="submit"
                  color={dialog.kind === "delete" ? "red" : undefined}
                  loading={busy}
                >
                  {dialog.kind === "create"
                    ? "验证并添加"
                    : dialog.kind === "delete"
                    ? "确认移除"
                    : "保存"}
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>
      <Modal
        opened={reloadPrompt}
        onClose={() => setReloadPrompt(false)}
        title="放弃当前修改并重新加载？"
        centered
      >
        <Text size="sm">
          另一处修改已保存。重新加载后，此窗口尚未保存的内容会被替换。
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setReloadPrompt(false)}>
            继续编辑
          </Button>
          <Button onClick={() => void reloadLatest()}>
            放弃修改并重新加载
          </Button>
        </Group>
      </Modal>
    </>
  );
}
