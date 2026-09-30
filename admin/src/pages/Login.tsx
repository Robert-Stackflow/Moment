import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Center,
  Divider,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { ArrowLeft, Fingerprint } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { api, json } from "../api";
import { Brand } from "../components/Brand";
import { useAuth } from "../session";
import { canUsePasskeys, passkeyError, type PasskeyConfig } from "../passkeys";

export function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const setup = useQuery({
    queryKey: ["setup"],
    queryFn: () => api<{ needs_setup: boolean }>("/setup"),
  });
  const passkeys = useQuery({
    queryKey: ["passkeyConfig"],
    queryFn: () => api<PasskeyConfig>("/passkeys/config"),
    staleTime: 0,
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const from = location.state?.from;
  const destination =
    typeof from === "string" &&
    from.startsWith("/") &&
    !from.startsWith("//") &&
    from !== "/login"
      ? from
      : "/workbench";
  if (auth.user) return <Navigate to={destination} replace />;
  const initializing = setup.data?.data.needs_setup === true;
  const correctOrigin = passkeys.data?.data.origin === window.location.origin;
  async function usePasskey() {
    if (busy || passkeyBusy) return;
    setPasskeyBusy(true);
    setFinishing(false);
    setError("");
    controller.current = new AbortController();
    try {
      await auth.loginWithPasskey(controller.current.signal, () =>
        setFinishing(true),
      );
      navigate(destination, { replace: true });
    } catch (cause) {
      setError(passkeyError(cause));
    } finally {
      setPasskeyBusy(false);
      setFinishing(false);
      controller.current = null;
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || passkeyBusy) return;
    setBusy(true);
    setError("");
    try {
      if (initializing)
        await api("/setup", json("POST", { username, password, email }));
      await auth.login(username, password);
      navigate(destination, { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "登录失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Center className="login-page">
      <Stack w="100%" maw={420} px={20} gap={26}>
        <Stack align="center" gap={12}>
          <Brand size={58} />
          <Title order={1}>Moment</Title>
          <Text c="dimmed" size="sm">
            让值得记住的时刻，有处安放。
          </Text>
        </Stack>
        <Paper withBorder p={30}>
          <form onSubmit={submit}>
            <Stack gap="lg">
              <div>
                <Title order={3}>
                  {initializing ? "创建管理账户" : "欢迎回来"}
                </Title>
                <Text c="dimmed" size="sm" mt={6}>
                  {initializing
                    ? "设置你的第一个管理员账户。"
                    : "登录后继续整理你的相册。"}
                </Text>
              </div>
              {error ? (
                <Alert color="red" role="alert">
                  {error}
                </Alert>
              ) : null}
              {setup.error ? (
                <Alert color="red">
                  服务连接失败。
                  <Button variant="subtle" onClick={() => void setup.refetch()}>
                    重试
                  </Button>
                </Alert>
              ) : null}
              {!initializing && passkeys.data?.data.enabled && (
                <Stack gap="xs">
                  <Button
                    type="button"
                    variant="default"
                    fullWidth
                    leftSection={<Fingerprint size={19} />}
                    loading={passkeyBusy}
                    disabled={busy || !correctOrigin || !canUsePasskeys()}
                    onClick={() => void usePasskey()}
                  >
                    使用通行密钥登录
                  </Button>
                  {passkeyBusy && (
                    <>
                      <Text size="xs" c="dimmed" ta="center" role="status">
                        {finishing
                          ? "验证成功，正在登录…"
                          : "请在设备上完成验证"}
                      </Text>
                      <Button
                        type="button"
                        variant="subtle"
                        size="xs"
                        disabled={finishing}
                        onClick={() => controller.current?.abort()}
                      >
                        取消验证
                      </Button>
                    </>
                  )}
                  {!correctOrigin ? (
                    <Text
                      size="xs"
                      c="dimmed"
                      style={{ overflowWrap: "anywhere" }}
                    >
                      通行密钥需在 {passkeys.data.data.origin}{" "}
                      使用；当前可使用密码登录。
                    </Text>
                  ) : (
                    !canUsePasskeys() && (
                      <Text size="xs" c="dimmed">
                        此浏览器暂不支持通行密钥，请使用密码登录。
                      </Text>
                    )
                  )}
                  <Divider label="或使用密码" labelPosition="center" mt="sm" />
                </Stack>
              )}
              <TextInput
                label="用户名"
                placeholder="输入用户名"
                autoComplete="username"
                required
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.currentTarget.value)}
              />
              {initializing ? (
                <TextInput
                  label="邮箱"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                />
              ) : null}
              <PasswordInput
                label="密码"
                placeholder={initializing ? "至少 10 位" : "输入密码"}
                autoComplete={
                  initializing ? "new-password" : "current-password"
                }
                required
                minLength={initializing ? 10 : undefined}
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
              />
              <Button
                fullWidth
                type="submit"
                loading={busy}
                disabled={setup.isPending || !!setup.error || passkeyBusy}
              >
                {initializing ? "创建账户并进入" : "进入管理后台"}
              </Button>
            </Stack>
          </form>
        </Paper>
        <Button
          component="a"
          href="/"
          variant="subtle"
          color="gray"
          leftSection={<ArrowLeft size={16} />}
        >
          返回相册
        </Button>
      </Stack>
    </Center>
  );
}
