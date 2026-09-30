import { useState } from "react";
import {
  Avatar,
  Button,
  FileButton,
  Group,
  Paper,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { Link, useNavigate } from "react-router-dom";
import { api, json, notifyError, notifySuccess } from "../api";
import { PageTitle } from "../components/Common";
import { useAuth } from "../session";
import { Fingerprint, Upload } from "lucide-react";
import { UnsavedChanges } from "../components/UnsavedChanges";

export default function Account() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(auth.user?.username || "");
  const [alias, setAlias] = useState(auth.user?.alias || "");
  const [email, setEmail] = useState(auth.user?.email || "");
  const [avatar, setAvatar] = useState(auth.user?.avatar || "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const dirty =
    !passwordUpdated &&
    (username !== (auth.user?.username || "") ||
      alias !== (auth.user?.alias || "") ||
      email !== (auth.user?.email || "") ||
      avatar !== (auth.user?.avatar || "") ||
      !!oldPassword ||
      !!newPassword ||
      !!repeat);
  async function uploadAvatar(file: File | null) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      notifyError(new Error("请选择不超过 5 MB 的头像图片"));
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const result = await api<{ avatar: string }>("/me/avatar", {
        method: "POST",
        body,
      });
      setAvatar(result.data.avatar);
      await auth.refresh();
      notifySuccess("头像已更新");
    } catch (error) {
      notifyError(error);
    } finally {
      setUploading(false);
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api("/me", json("PATCH", { username, alias, email, avatar }));
      await auth.refresh();
      notifySuccess("资料已更新");
    } catch (error) {
      notifyError(error);
    } finally {
      setSaving(false);
    }
  }
  async function password(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== repeat) {
      notifyError(new Error("两次新密码不一致"));
      return;
    }
    setChanging(true);
    try {
      await api(
        "/me/password",
        json("POST", { old_password: oldPassword, new_password: newPassword }),
      );
      setPasswordUpdated(true);
      await auth.refresh();
      notifySuccess("密码已更新，请重新登录");
      navigate("/login", { replace: true });
    } catch (error) {
      notifyError(error);
    } finally {
      setChanging(false);
    }
  }
  return (
    <>
      <UnsavedChanges dirty={dirty} uploading={uploading} />
      <PageTitle title="我的账户">
        <Button
          component={Link}
          to="/account/security"
          variant="default"
          leftSection={<Fingerprint size={18} />}
        >
          登录与安全
        </Button>
      </PageTitle>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        <Paper withBorder p="xl">
          <form onSubmit={save}>
            <Stack gap="lg">
              <Group>
                <Avatar src={avatar || undefined} size={64} radius="xl">
                  {username.slice(0, 1)}
                </Avatar>
                <div>
                  <Title order={4}>账户资料</Title>
                  <Text size="xs" c="dimmed" mt={4}>
                    上次登录 {auth.user?.last_login || "—"}
                  </Text>
                </div>
              </Group>
              <div className="account-avatar-upload">
                <FileButton
                  onChange={uploadAvatar}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                >
                  {(props) => (
                    <Button
                      {...props}
                      variant="light"
                      size="xs"
                      leftSection={<Upload size={14} />}
                      loading={uploading}
                      disabled={saving}
                    >
                      上传头像
                    </Button>
                  )}
                </FileButton>
                <Text size="xs" c="dimmed">
                  JPG、PNG、WebP、GIF · 最大 5 MB
                  <br />
                  头像保存在本机服务器，上传后立即生效
                </Text>
              </div>
              <TextInput
                label="用户名"
                required
                maxLength={20}
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.currentTarget.value)}
              />
              <TextInput
                label="昵称"
                maxLength={30}
                value={alias}
                onChange={(e) => setAlias(e.currentTarget.value)}
              />
              <TextInput
                label="邮箱"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
              />
              <TextInput
                label="头像地址"
                description="可上传图片，或填写已有图片地址"
                value={avatar}
                disabled={uploading}
                onChange={(e) => setAvatar(e.currentTarget.value)}
              />
              <Button type="submit" loading={saving} disabled={uploading}>
                保存资料
              </Button>
            </Stack>
          </form>
        </Paper>
        <Paper withBorder p="xl">
          <form onSubmit={password}>
            <Stack gap="lg">
              <div>
                <Title order={4}>修改密码</Title>
                <Text size="xs" c="dimmed" mt={6}>
                  修改后所有设备的登录会话都会失效。
                </Text>
              </div>
              <PasswordInput
                label="当前密码"
                autoComplete="current-password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.currentTarget.value)}
              />
              <PasswordInput
                label="新密码"
                description="至少 10 位"
                autoComplete="new-password"
                required
                minLength={10}
                value={newPassword}
                onChange={(e) => setNewPassword(e.currentTarget.value)}
              />
              <PasswordInput
                label="确认新密码"
                autoComplete="new-password"
                required
                minLength={10}
                value={repeat}
                onChange={(e) => setRepeat(e.currentTarget.value)}
              />
              <Button type="submit" loading={changing}>
                更新密码
              </Button>
            </Stack>
          </form>
        </Paper>
      </SimpleGrid>
    </>
  );
}
