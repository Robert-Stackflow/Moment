import { useState } from "react";
import {
  Avatar,
  Button,
  FileButton,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { api, json, notifyError, notifySuccess } from "../api";
import { useAuth } from "../session";
import { Upload } from "lucide-react";
import { UnsavedChanges } from "../components/UnsavedChanges";

export default function Account() {
  const auth = useAuth();
  const [username, setUsername] = useState(auth.user?.username || "");
  const [alias, setAlias] = useState(auth.user?.alias || "");
  const [email, setEmail] = useState(auth.user?.email || "");
  const [avatar, setAvatar] = useState(auth.user?.avatar || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dirty =
    username !== (auth.user?.username || "") ||
    alias !== (auth.user?.alias || "") ||
    email !== (auth.user?.email || "") ||
    avatar !== (auth.user?.avatar || "");
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
  return (
    <>
      <UnsavedChanges dirty={dirty} uploading={uploading} />
      <Paper withBorder p="xl" className="account-panel">
        <form onSubmit={save}>
          <Stack gap="lg">
            <Group>
              <Avatar src={avatar || undefined} size={64} radius="xl">
                {username.slice(0, 1)}
              </Avatar>
              <div>
                <Title order={3}>账户资料</Title>
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
            <Group justify="flex-end">
              <Button
                type="submit"
                loading={saving}
                disabled={uploading || !dirty}
              >
                保存资料
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </>
  );
}
