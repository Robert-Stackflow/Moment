import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  IconButton,
} from "@robert-stackflow/oneui";
import { useQuery } from "@tanstack/react-query";
import {
  Globe,
  LogOut,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError, json, notifyError, notifySuccess } from "../api";
import { ErrorState, Loading } from "../components/Common";
import { useAuth } from "../session";
import { badgeTone, tone } from "../ui-data";
type LoginSession = {
  id: string;
  current: boolean;
  device: string;
  device_type: string;
  ip: string;
  method: "password" | "passkey" | "unknown";
  created_at: number;
  last_seen_at: number;
  expires_at: number;
};
const dateFormat = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const date = (value: number) =>
  value ? dateFormat.format(new Date(value * 1000)) : "未记录";
const methods = {
  password: "密码登录",
  passkey: "通行密钥",
  unknown: "较早的登录",
};
export default function Sessions() {
  const auth = useAuth();
  const navigate = useNavigate();
  const sessions = useQuery({
    queryKey: ["loginSessions"],
    queryFn: () => api<LoginSession[]>("/me/sessions"),
    staleTime: 0,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });
  const [target, setTarget] = useState<LoginSession | "others" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const others =
    sessions.data?.data.filter((item) => !item.current).length || 0;
  function confirm(value: LoginSession | "others") {
    setError("");
    setTarget(value);
  }
  async function revoke() {
    if (!target || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{
        current?: boolean;
      }>(
        `/me/sessions/${target === "others" ? "others" : target.id}`,
        json("DELETE", {}),
      );
      setTarget(null);
      if (result.data.current) {
        await auth.refresh();
        navigate("/login", { replace: true });
      } else {
        notifySuccess(target === "others" ? "其他会话已退出" : "会话已退出");
        await sessions.refetch();
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) {
        setTarget(null);
        notifySuccess("此会话已经退出");
        await sessions.refetch();
      } else if (cause instanceof Error) setError(cause.message);
      else notifyError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Card className={"moment-panel " + "account-panel"}>
        <div className="account-panel-heading">
          <div
            className="ui-row"
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
              justifyContent: "space-between",
            }}
          >
            <h3 className="ui-title">登录会话</h3>
            <div
              className="ui-row"
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              <IconButton
                label={"刷新登录会话"}
                loading={sessions.isFetching}
                onClick={() => void sessions.refetch()}
                variant="ghost"
              >
                <RefreshCw size={18} />
              </IconButton>
              <Button
                size="small"
                disabled={!others || busy}
                onClick={() => confirm("others")}
                variant="secondary"
              >
                {<LogOut size={16} />}
                退出其他会话
              </Button>
            </div>
          </div>
          <p
            className="ui-text"
            style={{
              color: "var(--muted)",
              fontSize: 13,
              marginTop: 10,
            }}
          >
            查看当前有效的登录，退出不再使用的浏览器或设备。
          </p>
        </div>
        {sessions.isPending ? (
          <Loading />
        ) : sessions.error ? (
          <div className="account-panel-body">
            <ErrorState error={sessions.error} retry={sessions.refetch} />
          </div>
        ) : (
          <div className="session-list">
            {sessions.data.data.map((session) => {
              const Icon =
                session.device_type === "mobile"
                  ? Smartphone
                  : session.device_type === "tablet"
                    ? Tablet
                    : session.device_type === "unknown"
                      ? Globe
                      : Monitor;
              return (
                <div
                  key={session.id}
                  className={`session-row${session.current ? " is-current" : ""}`}
                >
                  <div className="session-device-icon">
                    <Icon size={22} strokeWidth={1.7} />
                  </div>
                  <div className="session-copy">
                    <div
                      className="ui-row"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <p
                        className="ui-text"
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        {session.device}
                      </p>
                      {session.current && (
                        <Badge tone={badgeTone("teal")}>当前会话</Badge>
                      )}
                    </div>
                    <p
                      className="ui-text"
                      style={{
                        color: "var(--muted)",
                        fontSize: 12,
                        marginTop: 7,
                      }}
                    >
                      {methods[session.method]} · IP {session.ip || "未记录"}
                    </p>
                    <dl className="session-times">
                      <div>
                        <dt>登录时间</dt>
                        <dd>{date(session.created_at)}</dd>
                      </div>
                      <div>
                        <dt>最近活动</dt>
                        <dd>{date(session.last_seen_at)}</dd>
                      </div>
                      <div>
                        <dt>到期时间</dt>
                        <dd>{date(session.expires_at)}</dd>
                      </div>
                    </dl>
                  </div>
                  <Button
                    className="session-exit"
                    size="small"
                    disabled={busy}
                    onClick={() => confirm(session)}
                    aria-label={`退出${session.current ? "当前会话" : session.device + " 会话"}`}
                    variant="ghost"
                  >
                    {session.current ? "退出当前会话" : "退出会话"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        <div className="account-session-note">
          <p
            className="ui-text"
            style={{
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            时间按北京时间显示，活动记录约每分钟更新。设备信息由浏览器提供；旧会话可能缺少登录详情。
          </p>
        </div>
      </Card>
      <Dialog
        open={!!target}
        onClose={() => !busy && setTarget(null)}
        title={
          target === "others"
            ? "退出其他会话？"
            : target?.current
              ? "退出当前会话？"
              : "退出此会话？"
        }
        busy={busy}
      >
        <div
          className="ui-stack"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <p
            className="ui-text"
            style={{
              fontSize: 13,
            }}
          >
            {target === "others"
              ? "其他浏览器或设备需要重新登录，当前会话会保留。"
              : target?.current
                ? "你将返回登录页面，需要再次验证身份。"
                : `${target?.device || "该设备"} 需要重新登录才能继续操作。`}
          </p>
          {error && <Alert tone={tone("red")}>{error}</Alert>}
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
              disabled={busy}
              onClick={() => setTarget(null)}
              variant="secondary"
            >
              取消
            </Button>
            <Button
              loading={busy}
              onClick={() => void revoke()}
              variant="danger"
            >
              确认退出
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
