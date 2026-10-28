import {
  Alert,
  Button,
  Card,
  Divider,
  Form,
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
import { tone } from "../ui-data";
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
  return (
    <div
      className={"ui-center " + "login-page"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="ui-stack"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 26,
          width: "100%",
          maxWidth: 420,
          paddingLeft: 20,
          paddingRight: 20,
        }}
      >
        <div
          className="ui-stack"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignItems: "center",
          }}
        >
          <Brand size={58} />
          <h1 className="ui-title">Moment</h1>
        </div>
        <Card className="moment-panel">
          <Form controller={sharedForm} onSubmit={submit}>
            <div
              className="ui-stack"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 24,
              }}
            >
              <div>
                <h3 className="ui-title">
                  {initializing ? "创建管理账户" : "欢迎回来"}
                </h3>
                <p
                  className="ui-text"
                  style={{
                    color: "var(--muted)",
                    fontSize: 13,
                    marginTop: 6,
                  }}
                >
                  {initializing
                    ? "设置你的第一个管理员账户。"
                    : "登录后继续整理你的相册。"}
                </p>
              </div>
              {error ? <Alert tone={tone("red")}>{error}</Alert> : null}
              {setup.error ? (
                <Alert tone={tone("red")}>
                  服务连接失败。
                  <Button onClick={() => void setup.refetch()} variant="ghost">
                    重试
                  </Button>
                </Alert>
              ) : null}
              {!initializing && passkeys.data?.data.enabled && (
                <div
                  className="ui-stack"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <Button
                    type="button"
                    loading={passkeyBusy}
                    disabled={busy || !correctOrigin || !canUsePasskeys()}
                    onClick={() => void usePasskey()}
                    variant="secondary"
                    style={{
                      width: "100%",
                    }}
                  >
                    {<Fingerprint size={19} />}
                    使用通行密钥登录
                  </Button>
                  {passkeyBusy && (
                    <>
                      <p
                        role="status"
                        className="ui-text"
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          textAlign: "center",
                        }}
                      >
                        {finishing
                          ? "验证成功，正在登录…"
                          : "请在设备上完成验证"}
                      </p>
                      <Button
                        type="button"
                        size="small"
                        disabled={finishing}
                        onClick={() => controller.current?.abort()}
                        variant="ghost"
                      >
                        取消验证
                      </Button>
                    </>
                  )}
                  {!correctOrigin ? (
                    <p
                      className="ui-text"
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        ...{ overflowWrap: "anywhere" },
                      }}
                    >
                      通行密钥需在 {passkeys.data.data.origin}{" "}
                      使用；当前可使用密码登录。
                    </p>
                  ) : (
                    !canUsePasskeys() && (
                      <p
                        className="ui-text"
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                        }}
                      >
                        此浏览器暂不支持通行密钥，请使用密码登录。
                      </p>
                    )
                  )}
                  <div
                    style={{
                      marginTop: 10,
                    }}
                  >
                    <div className="login-divider">
                      <Divider />
                      <span>或使用密码</span>
                      <Divider />
                    </div>
                  </div>
                </div>
              )}
              <Input
                {...sharedForm.field("username")}
                label="用户名"
                placeholder="输入用户名"
                autoComplete="username"
                required
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.currentTarget.value)}
              />
              {initializing ? (
                <Input
                  {...sharedForm.field("email")}
                  label="邮箱"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                />
              ) : null}
              <PasswordField
                {...sharedForm.field("password")}
                onChange={(value) => setPassword(value)}
                label="密码"
                placeholder={initializing ? "至少 10 位" : "输入密码"}
                autoComplete={
                  initializing ? "new-password" : "current-password"
                }
                required
                minLength={initializing ? 10 : undefined}
                value={password}
              />
              <Button
                type="submit"
                loading={busy}
                disabled={setup.isPending || !!setup.error || passkeyBusy}
                variant="primary"
                style={{
                  width: "100%",
                }}
              >
                {initializing ? "创建账户并进入" : "进入管理后台"}
              </Button>
            </div>
          </Form>
        </Card>
        <Button href="/" variant="ghost">
          {<ArrowLeft size={16} />}
          返回相册
        </Button>
      </div>
    </div>
  );
}
