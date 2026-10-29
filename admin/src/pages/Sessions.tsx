import {
  Alert,
  SessionItem,
  Button,
  Card,
  Dialog,
  IconButton,
} from "@robert-stackflow/oneui";
import { useQuery } from "@tanstack/react-query";
import { LogOut, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError, json, notifyError, notifySuccess } from "../api";
import { ErrorState, Loading } from "../components/Common";
import { useAuth } from "../session";
import { tone } from "../ui-data";
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
      <Card
        className="account-panel"
        title="登录会话"
        action={
          <div className="row-actions">
            <IconButton
              label="刷新登录会话"
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
            >
              <LogOut size={16} />
              退出其他会话
            </Button>
          </div>
        }
      >
        {sessions.isPending ? (
          <Loading />
        ) : sessions.error ? (
          <ErrorState error={sessions.error} retry={sessions.refetch} />
        ) : (
          <div className="account-item-list" aria-label="登录会话" role="list">
            {sessions.data.data.map((session) => (
              <SessionItem
                key={session.id}
                device={session.device}
                deviceType={
                  session.device_type === "mobile" ||
                  session.device_type === "tablet" ||
                  session.device_type === "unknown"
                    ? session.device_type
                    : "desktop"
                }
                current={session.current}
                description={`${methods[session.method]} · ${session.ip || "IP 未记录"}`}
                metadata={[
                  { label: "登录时间", value: date(session.created_at) },
                  { label: "最近活动", value: date(session.last_seen_at) },
                  { label: "到期时间", value: date(session.expires_at) },
                ]}
                disabled={busy}
                onRevoke={() => confirm(session)}
              />
            ))}
          </div>
        )}
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
