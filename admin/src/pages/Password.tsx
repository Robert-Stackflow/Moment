import { Button, Card, Form, PasswordField } from "@robert-stackflow/oneui";
import { useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import { api, json, notifyError, notifySuccess } from "../api";
import { UnsavedChanges } from "../components/UnsavedChanges";
import { useModelForm } from "../components/useModelForm";
import { useAuth } from "../session";
export default function Password() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [updated, setUpdated] = useState(false);
  const sharedForm = useModelForm(
    { oldPassword, newPassword, repeat },
    {
      oldPassword: { label: "当前密码", required: true },
      newPassword: { label: "新密码", required: true, minLength: 10 },
      repeat: {
        label: "确认新密码",
        required: true,
        validate: (value, values) =>
          value === values.newPassword ? undefined : "两次新密码不一致",
      },
    },
  );
  const dirty = !updated && !!(oldPassword || newPassword || repeat);
  async function save() {
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
      <Card className={"moment-panel " + "account-panel"} title="修改密码">
        <p
          className="ui-text"
          style={{
            fontSize: 13,
            color: "var(--muted)",
            marginBottom: 24,
          }}
        >
          修改后所有设备的登录会话都会失效，请使用新密码重新登录。
        </p>
        <Form controller={sharedForm} onSubmit={save}>
          <div
            className={"ui-stack " + "account-password-fields"}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            <PasswordField
              {...sharedForm.field("oldPassword")}
              onChange={(value) => setOldPassword(value)}
              label="当前密码"
              autoComplete="current-password"
              required
              value={oldPassword}
              disabled={busy}
            />
            <PasswordField
              {...sharedForm.field("newPassword")}
              onChange={(value) => setNewPassword(value)}
              label="新密码"
              hint={"至少 10 位"}
              autoComplete="new-password"
              required
              minLength={10}
              value={newPassword}
              disabled={busy}
            />
            <PasswordField
              {...sharedForm.field("repeat")}
              onChange={(value) => setRepeat(value)}
              label="确认新密码"
              autoComplete="new-password"
              required
              minLength={10}
              value={repeat}
              disabled={busy}
            />
          </div>
          <div className="form-actions">
            <p
              className="ui-text"
              style={{
                fontSize: 13,
                color: "var(--muted)",
              }}
            >
              请使用未在其他网站使用过的密码
            </p>
            <Button
              type="submit"
              loading={busy}
              disabled={!dirty}
              variant="primary"
            >
              更新密码
            </Button>
          </div>
        </Form>
      </Card>
    </>
  );
}
