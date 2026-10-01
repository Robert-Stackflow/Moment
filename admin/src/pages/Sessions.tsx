import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  Globe,
  LogOut,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api, ApiError, json, notifyError, notifySuccess } from "../api";
import { ErrorState, Loading } from "../components/Common";
import { useAuth } from "../session";

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
    refetchInterval: 60_000,
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
      const result = await api<{ current?: boolean }>(
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
      <Paper withBorder className="account-panel">
        <div className="account-panel-heading">
          <Group justify="space-between" gap="md">
            <Title order={3}>登录会话</Title>
            <Group gap="xs">
              <ActionIcon
                variant="subtle"
                aria-label="刷新登录会话"
                loading={sessions.isFetching}
                onClick={() => void sessions.refetch()}
              >
                <RefreshCw size={18} />
              </ActionIcon>
              <Button
                variant="default"
                size="sm"
                leftSection={<LogOut size={16} />}
                disabled={!others || busy}
                onClick={() => confirm("others")}
              >
                退出其他会话
              </Button>
            </Group>
          </Group>
          <Text c="dimmed" size="sm" mt="sm">
            查看当前有效的登录，退出不再使用的浏览器或设备。
          </Text>
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
                  className={`session-row${
                    session.current ? " is-current" : ""
                  }`}
                >
                  <div className="session-device-icon">
                    <Icon size={22} strokeWidth={1.7} />
                  </div>
                  <div className="session-copy">
                    <Group gap="sm">
                      <Text fw={600} size="sm">
                        {session.device}
                      </Text>
                      {session.current && (
                        <Badge variant="light" color="teal" size="sm">
                          当前会话
                        </Badge>
                      )}
                    </Group>
                    <Text c="dimmed" size="xs" mt={7}>
                      {methods[session.method]} · IP {session.ip || "未记录"}
                    </Text>
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
                    color={session.current ? "gray" : "red"}
                    variant="subtle"
                    size="xs"
                    disabled={busy}
                    onClick={() => confirm(session)}
                    aria-label={`退出${
                      session.current ? "当前会话" : session.device + " 会话"
                    }`}
                  >
                    {session.current ? "退出当前会话" : "退出会话"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        <div className="account-session-note">
          <Text size="xs" c="dimmed">
            时间按北京时间显示，活动记录约每分钟更新。设备信息由浏览器提供；旧会话可能缺少登录详情。
          </Text>
        </div>
      </Paper>
      <Modal
        opened={!!target}
        onClose={() => !busy && setTarget(null)}
        title={
          target === "others"
            ? "退出其他会话？"
            : target?.current
            ? "退出当前会话？"
            : "退出此会话？"
        }
        centered
        closeOnEscape={!busy}
        closeOnClickOutside={!busy}
        withCloseButton={!busy}
      >
        <Stack gap="lg">
          <Text size="sm">
            {target === "others"
              ? "其他浏览器或设备需要重新登录，当前会话会保留。"
              : target?.current
              ? "你将返回登录页面，需要再次验证身份。"
              : `${target?.device || "该设备"} 需要重新登录才能继续操作。`}
          </Text>
          {error && (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={busy}
              onClick={() => setTarget(null)}
            >
              取消
            </Button>
            <Button color="red" loading={busy} onClick={() => void revoke()}>
              确认退出
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
