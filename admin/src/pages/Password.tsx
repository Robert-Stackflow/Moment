import { useState } from "react";
import { flushSync } from "react-dom";
import {
  Button,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { api, json, notifyError, notifySuccess } from "../api";
import { useAuth } from "../session";
import { UnsavedChanges } from "../components/UnsavedChanges";

export default function Password() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [updated, setUpdated] = useState(false);
  const dirty = !updated && !!(oldPassword || newPassword || repeat);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== repeat) {
      notifyError(new Error("两次新密码不一致"));
      return;
    }
    setBusy(true);
    try {
      await api(
        "/me/password",
        json("POST", { old_password: oldPassword, new_password: newPassword }),
      );
      flushSync(() => {
        setUpdated(true);
        setOldPassword("");
        setNewPassword("");
        setRepeat("");
      });
      await auth.refresh();
      notifySuccess("密码已更新，请重新登录");
      navigate("/login", { replace: true });
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <UnsavedChanges dirty={dirty} />
      <Paper withBorder className="account-panel">
        <div className="account-panel-heading">
          <Group gap="sm">
            <KeyRound size={21} />
            <Title order={3}>修改密码</Title>
          </Group>
          <Text size="sm" c="dimmed" mt="sm">
            修改后所有设备的登录会话都会失效，请使用新密码重新登录。
          </Text>
        </div>
        <form onSubmit={save}>
          <Stack className="account-password-fields" gap="lg">
            <PasswordInput
              label="当前密码"
              autoComplete="current-password"
              required
              value={oldPassword}
              disabled={busy}
              onChange={(e) => setOldPassword(e.currentTarget.value)}
            />
            <PasswordInput
              label="新密码"
              description="至少 10 位"
              autoComplete="new-password"
              required
              minLength={10}
              value={newPassword}
              disabled={busy}
              onChange={(e) => setNewPassword(e.currentTarget.value)}
            />
            <PasswordInput
              label="确认新密码"
              autoComplete="new-password"
              required
              minLength={10}
              value={repeat}
              disabled={busy}
              onChange={(e) => setRepeat(e.currentTarget.value)}
            />
          </Stack>
          <div className="save-bar">
            <Text size="sm" c="dimmed">
              请使用未在其他网站使用过的密码
            </Text>
            <Button type="submit" loading={busy} disabled={!dirty}>
              更新密码
            </Button>
          </div>
        </form>
      </Paper>
    </>
  );
}
