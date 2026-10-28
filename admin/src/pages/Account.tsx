import {
  Avatar,
  Button,
  Card,
  FilePicker,
  Form,
  Input,
} from "@robert-stackflow/oneui";
import { useState } from "react";
import { api, json, notifyError, notifySuccess } from "../api";
import { UnsavedChanges } from "../components/UnsavedChanges";
import { useModelForm } from "../components/useModelForm";
import { useAuth } from "../session";
export default function Account() {
  const auth = useAuth();
  const [username, setUsername] = useState(auth.user?.username || "");
  const [alias, setAlias] = useState(auth.user?.alias || "");
  const [email, setEmail] = useState(auth.user?.email || "");
  const [avatar, setAvatar] = useState(auth.user?.avatar || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const sharedForm = useModelForm(
    { username, alias, email, avatar },
    {
      username: { label: "用户名", required: true, maxLength: 20 },
      email: {
        label: "邮箱",
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
    },
  );
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
      const result = await api<{
        avatar: string;
      }>("/me/avatar", {
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
  async function save() {
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
      <Card className={"moment-panel " + "account-panel"}>
        <Form controller={sharedForm} onSubmit={save}>
          <div
            className="ui-stack"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            <div
              className="ui-row"
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <Avatar src={avatar || undefined} name={username} size={64} />
              <div>
                <h3 className="ui-title">账户资料</h3>
                <p
                  className="ui-text"
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    marginTop: 4,
                  }}
                >
                  上次登录 {auth.user?.last_login || "—"}
                </p>
              </div>
            </div>
            <div className="account-avatar-upload">
              <FilePicker
                onFiles={(files) => void uploadAvatar(files[0])}
                accept="image/jpeg,image/png,image/webp,image/gif"
                maxSize={5 * 1024 * 1024}
                multiple={false}
                disabled={saving || uploading}
                label={uploading ? "正在上传头像…" : "上传头像"}
              />
              <p
                className="ui-text"
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                }}
              >
                JPG、PNG、WebP、GIF · 最大 5 MB
                <br />
                头像保存在本机服务器，上传后立即生效
              </p>
            </div>
            <Input
              {...sharedForm.field("username")}
              label="用户名"
              required
              maxLength={20}
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
            />
            <Input
              {...sharedForm.field("alias")}
              label="昵称"
              maxLength={30}
              value={alias}
              onChange={(e) => setAlias(e.currentTarget.value)}
            />
            <Input
              {...sharedForm.field("email")}
              label="邮箱"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <Input
              {...sharedForm.field("avatar")}
              label="头像地址"
              hint={"可上传图片，或填写已有图片地址"}
              value={avatar}
              disabled={uploading}
              onChange={(e) => setAvatar(e.currentTarget.value)}
            />
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
                type="submit"
                loading={saving}
                disabled={uploading || !dirty}
                variant="primary"
              >
                保存资料
              </Button>
            </div>
          </div>
        </Form>
      </Card>
    </>
  );
}
