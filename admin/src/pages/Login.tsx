import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { ArrowLeft } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { api, json } from "../api";
import { Brand } from "../components/Brand";
import { useAuth } from "../session";

export function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const setup = useQuery({
    queryKey: ["setup"],
    queryFn: () => api<{ needs_setup: boolean }>("/setup"),
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (auth.user) return <Navigate to="/workbench" replace />;
  const initializing = setup.data?.data.needs_setup === true;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (initializing)
        await api("/setup", json("POST", { username, password, email }));
      await auth.login(username, password);
      const from = location.state?.from;
      navigate(
        typeof from === "string" &&
          from.startsWith("/") &&
          !from.startsWith("//") &&
          from !== "/login"
          ? from
          : "/workbench",
        { replace: true },
      );
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
                disabled={setup.isPending || !!setup.error}
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
