import {
  Alert,
  Button,
  Card,
  Divider,
  Form,
  FormField,
  FormErrorSummary,
  LoadingState,
  Input,
  PasswordField,
} from "@robert-stackflow/oneui";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Fingerprint } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { api, json } from "../api";
import { Brand } from "../components/Brand";
import { useModelForm } from "../components/useModelForm";
import { canUsePasskeys, passkeyError, type PasskeyConfig } from "../passkeys";
import { useAuth } from "../session";
export function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const setup = useQuery({
    queryKey: ["setup"],
    queryFn: () =>
      api<{
        needs_setup: boolean;
      }>("/setup"),
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
  const sharedForm = useModelForm(
    { username, password, email },
    {
      username: { label: "用户名", required: true, maxLength: 20 },
      password: {
        label: "密码",
        required: true,
        minLength: setup.data?.data.needs_setup ? 10 : undefined,
      },
      email: {
        label: "邮箱",
        required: setup.data?.data.needs_setup === true,
        disabled: setup.data?.data.needs_setup !== true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
    },
  );
  const from = location.state?.from;
  const destination =
    typeof from === "string" &&
    from.startsWith("/") &&
    !from.startsWith("//") &&
    from !== "/login"
      ? from
      : "/overview";
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
  async function submit() {
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
  if (setup.isPending)
    return <LoadingState label="加载登录页面" showLabel={false} fullPage />;
  const locked = busy || passkeyBusy;
  return (
    <main className="login-page">
      <section className="login-form">
        <div className="login-brand">
          <Brand size={36} />
          <h1>Moment</h1>
        </div>
        <Card>
          <Form
            controller={sharedForm}
            onSubmit={submit}
            className="login-fields"
            aria-label={initializing ? "创建管理账户" : "账户登录"}
          >
            <FormErrorSummary
              errors={{}}
              submitError={error || sharedForm.submitError}
              onFocus={sharedForm.focusField}
            />
            {setup.error && (
              <Alert
                tone="danger"
                action={
                  <Button onClick={() => void setup.refetch()} variant="ghost">
                    重试
                  </Button>
                }
              >
                服务连接失败，请重试。
              </Alert>
            )}
            <FormField
              {...sharedForm.field("username")}
              label="用户名"
              disabled={locked}
            >
              <Input
                placeholder="输入用户名"
                autoComplete="username"
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.currentTarget.value)}
              />
            </FormField>
            {initializing && (
              <FormField
                {...sharedForm.field("email")}
                label="邮箱"
                disabled={locked}
              >
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                />
              </FormField>
            )}
            <FormField
              {...sharedForm.field("password")}
              label="密码"
              disabled={locked}
            >
              <PasswordField
                value={password}
                onChange={setPassword}
                placeholder={initializing ? "至少 10 位" : "输入密码"}
                autoComplete={
                  initializing ? "new-password" : "current-password"
                }
                minLength={initializing ? 10 : undefined}
              />
            </FormField>
            <Button
              type="submit"
              className="login-full"
              variant="primary"
              loading={busy || sharedForm.isSubmitting}
              disabled={!!setup.error || passkeyBusy}
            >
              {initializing ? "创建账户并进入" : "登录"}
            </Button>
          </Form>
          {!initializing && passkeys.data?.data.enabled && (
            <>
              <div className="login-divider">
                <Divider />
                <span>或使用</span>
                <Divider />
              </div>
              <div className="login-alternatives">
                <Button
                  className="login-full"
                  loading={passkeyBusy}
                  disabled={busy || !correctOrigin || !canUsePasskeys()}
                  onClick={() => void usePasskey()}
                >
                  <Fingerprint size={18} />
                  通行密钥
                </Button>
                {passkeyBusy && (
                  <>
                    <p role="status">
                      {finishing ? "验证成功，正在登录…" : "请在设备上完成验证"}
                    </p>
                    <Button
                      size="small"
                      disabled={finishing}
                      onClick={() => controller.current?.abort()}
                      variant="ghost"
                    >
                      取消验证
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </Card>
        <div className="login-back">
          <Button href="/" variant="ghost">
            <ArrowLeft size={16} />
            返回相册
          </Button>
        </div>
      </section>
    </main>
  );
}
