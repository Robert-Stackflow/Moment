import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  FilePicker,
  IconButton,
  Input,
  PasswordField,
  Progress,
} from "@robert-stackflow/oneui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, Download, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { api, json, notifyError, notifySuccess } from "../api";
import { Empty, ErrorState, Loading } from "../components/Common";
import { UnsavedChanges } from "../components/UnsavedChanges";
import { badgeTone, gridStyle, tone } from "../ui-data";
interface Backup {
  id: string;
  created_at: string;
  size: number;
  source: "manual" | "import" | "before-restore";
  posts: number;
  images: number;
  drafts: number;
  trash: number;
  local_files: number;
}
function sizeLabel(bytes: number) {
  return bytes < 1048576
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1048576).toFixed(1)} MB`;
}
function dateLabel(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}
function Summary({ backup }: { backup: Backup }) {
  return (
    <div
      className="ui-grid"
      style={{
        ...gridStyle({ base: 2, sm: 4 }, 10),
      }}
    >
      {[
        ["帖子", backup.posts],
        ["照片", backup.images],
        ["草稿", backup.drafts],
        ["回收站", backup.trash],
      ].map(([label, value]) => (
        <Card key={label} className="moment-panel">
          <p
            className="ui-text"
            style={{
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            {label}
          </p>
          <p
            className="ui-text"
            style={{
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            {value}
          </p>
        </Card>
      ))}
    </div>
  );
}
export default function Backups() {
  const client = useQueryClient();
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState(0);
  const [restoring, setRestoring] = useState<Backup | null>(null);
  const [deleting, setDeleting] = useState<Backup | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [restored, setRestored] = useState(false);
  const [imported, setImported] = useState<Backup | null>(null);
  const backups = useQuery({
    queryKey: ["backups"],
    queryFn: () => api<Backup[]>("/backups"),
    staleTime: 0,
  });
  async function create() {
    setBusy("正在创建备份");
    try {
      await api("/backups", json("POST", {}));
      await client.invalidateQueries({ queryKey: ["backups"] });
      notifySuccess("备份已创建，可以下载保存");
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy("");
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 2 * 1024 ** 3) {
      notifyError(new Error("请选择不超过 2 GB 的 ZIP 文件"));
      return;
    }
    setBusy("正在上传备份");
    setProgress(0);
    setImported(null);
    try {
      const result = await new Promise<Backup>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const form = new FormData();
        form.append("file", file);
        xhr.open("POST", "/api/admin/backups/import");
        xhr.timeout = 5 * 60 * 1000;
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(percent);
            if (percent === 100) setBusy("正在校验备份");
          }
        };
        xhr.onload = () => {
          try {
            const result = JSON.parse(xhr.responseText);
            if (xhr.status === 200) resolve(result.data);
            else reject(new Error(result.msg || "导入失败"));
          } catch {
            reject(new Error("导入响应无效，请刷新备份列表检查结果"));
          }
        };
        xhr.onerror = () =>
          reject(new Error("连接中断，请刷新备份列表检查结果"));
        xhr.ontimeout = () =>
          reject(new Error("导入超时，请刷新备份列表检查结果"));
        xhr.send(form);
      });
      setImported(result);
      await client.invalidateQueries({ queryKey: ["backups"] });
      notifySuccess("备份校验通过，当前网站内容尚未改变");
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy("");
    }
  }
  async function restore() {
    if (!restoring || busy) return;
    setBusy("正在备份当前内容并恢复");
    try {
      await api(
        `/backups/${restoring.id}/restore`,
        json("POST", { confirm, password }),
      );
      setRestored(true);
      setPassword("");
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy("");
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy("正在删除备份");
    try {
      await api(`/backups/${deleting.id}`, json("DELETE", {}));
      setDeleting(null);
      await client.invalidateQueries({ queryKey: ["backups"] });
      notifySuccess("备份文件已删除");
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy("");
    }
  }
  function chooseRestore(backup: Backup) {
    setRestoring(backup);
    setPassword("");
    setConfirm("");
    setRestored(false);
  }
  return (
    <div
      className="ui-stack"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <UnsavedChanges
        dirty={!!busy}
        message="备份操作正在进行。离开可能中断传输；恢复一旦开始替换数据，将继续完成。返回后请检查操作结果。"
      />
      <Card className="moment-panel">
        <div
          className="ui-row"
          style={{
            display: "flex",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 24,
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 className="ui-title">备份与恢复</h3>
            <p
              className="ui-text"
              style={{
                fontSize: 13,
                color: "var(--muted)",
                marginTop: 8,
              }}
            >
              保存数据库、本地照片和头像，迁移后继续使用。
            </p>
          </div>
          <div
            className="ui-row"
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <FilePicker
              label="导入备份"
              accept=".zip,application/zip"
              maxSize={2 * 1024 ** 3}
              multiple={false}
              disabled={!!busy}
              onFiles={(files) => void upload(files[0])}
            />
            <Button
              disabled={!!busy}
              onClick={() => void create()}
              variant="primary"
            >
              {<Plus size={16} />}
              创建备份
            </Button>
          </div>
        </div>

        <p
          className="ui-text"
          style={{
            fontSize: 12,
            color: "var(--muted)",
            marginTop: 24,
          }}
        >
          包含账户及存储凭据，请妥善保管。S3
          原图不打包，需单独备份存储桶。支持本版本导出的 ZIP，最大 2
          GB；解压总量不超过 8 GB。
        </p>
        {!!busy && (
          <div
            className="ui-stack"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginTop: 24,
            }}
          >
            <p
              role="status"
              className="ui-text"
              style={{
                fontSize: 13,
              }}
            >
              {busy}… 创建备份期间编辑请求会等待，恢复期间网站会短暂等待。
            </p>
            {busy === "正在上传备份" ? (
              <Progress value={progress} label={"备份上传进度"} />
            ) : (
              <Progress value={100} label={"正在处理备份"} />
            )}
          </div>
        )}
      </Card>
      {imported && (
        <Alert
          tone={tone("green")}
          title="导入校验通过"
          onClose={() => setImported(null)}
        >
          <p
            className="ui-text"
            style={{
              fontSize: 13,
              marginBottom: 10,
            }}
          >
            备份时间：{dateLabel(imported.created_at)}，包含{" "}
            {imported.local_files} 个本地文件。确认恢复前，当前内容保持不变。
          </p>
          <Summary backup={imported} />
          <Button
            disabled={!!busy}
            onClick={() => chooseRestore(imported)}
            variant="secondary"
            style={{
              marginTop: 16,
            }}
          >
            查看恢复选项
          </Button>
        </Alert>
      )}
      {backups.isPending ? (
        <Loading />
      ) : backups.error ? (
        <ErrorState error={backups.error} retry={backups.refetch} />
      ) : !backups.data.data.length ? (
        <Card className="moment-panel">
          <Empty
            title="还没有备份"
            description="创建一份备份，或导入之前下载的备份。"
          />
        </Card>
      ) : (
        <div
          className="ui-stack"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {backups.data.data.map((backup) => (
            <Card key={backup.id} className="moment-panel">
              <div
                className="ui-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 16,
                  justifyContent: "space-between",
                  marginBottom: 16,
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
                  <Archive size={20} />
                  <p
                    className="ui-text"
                    style={{
                      fontWeight: 600,
                    }}
                  >
                    {dateLabel(backup.created_at)}
                  </p>
                  <Badge
                    tone={badgeTone(
                      backup.source === "before-restore" ? "orange" : "gray",
                    )}
                  >
                    {
                      {
                        manual: "手动备份",
                        import: "导入备份",
                        "before-restore": "恢复前备份",
                      }[backup.source]
                    }
                  </Badge>
                </div>
                <div
                  className="ui-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  <Button
                    href={`/api/admin/backups/${backup.id}/download`}
                    download
                    disabled={!!busy}
                    size="small"
                    variant="secondary"
                  >
                    {<Download size={14} />}
                    下载
                  </Button>
                  <Button
                    size="small"
                    disabled={!!busy}
                    onClick={() => chooseRestore(backup)}
                    variant="secondary"
                  >
                    {<ArchiveRestore size={14} />}
                    恢复
                  </Button>
                  <IconButton
                    disabled={!!busy}
                    label={`删除备份 ${dateLabel(backup.created_at)}`}
                    onClick={() => setDeleting(backup)}
                    variant="danger"
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </div>
              <Summary backup={backup} />
              <p
                className="ui-text"
                style={{
                  color: "var(--muted)",
                  fontSize: 12,
                  marginTop: 10,
                }}
              >
                {sizeLabel(backup.size)} · {backup.local_files} 个本地文件 ·
                帖子与照片数量包含回收站内容
              </p>
            </Card>
          ))}
        </div>
      )}
      <Dialog
        open={!!restoring}
        onClose={() => {
          if (busy) return;
          if (restored) window.location.assign("/admin/login");
          else setRestoring(null);
        }}
        title={restored ? "恢复完成" : "恢复整站备份"}
        footer={
          restored ? (
            <Button href="/admin/login" variant="primary">
              重新登录
            </Button>
          ) : (
            restoring && (
              <>
                {" "}
                <Button
                  disabled={!!busy}
                  onClick={() => setRestoring(null)}
                  variant="secondary"
                >
                  取消
                </Button>
                <Button
                  loading={!!busy}
                  disabled={!password || confirm !== "恢复备份"}
                  onClick={() => void restore()}
                  variant="primary"
                >
                  确认恢复
                </Button>{" "}
              </>
            )
          )
        }
        busy={!!!!busy}
        variant="default"
      >
        {restored ? (
          <div
            className="ui-stack"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <Alert tone={tone("green")}>
              内容已恢复，恢复前的数据也已自动备份。所有登录会话已失效，请使用备份中的账户重新登录。
            </Alert>
          </div>
        ) : (
          restoring && (
            <div
              className="ui-stack"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <p
                className="ui-text"
                style={{
                  fontSize: 13,
                }}
              >
                将网站恢复到 {dateLabel(restoring.created_at)}
                。现有帖子、账户、设置、本地照片和头像将被替换；服务器上的其他备份会保留。
              </p>
              <Summary backup={restoring} />
              <Alert tone={tone("orange")}>
                开始前会自动备份当前内容。恢复成功后需要用备份中的账户重新登录，请确认你知道该账户的密码。
                备份中的待发布计划将暂停，需要重新确认发布时间。
              </Alert>
              <PasswordField
                onChange={(value) => setPassword(value)}
                label="当前账户密码"
                autoComplete="current-password"
                value={password}
                disabled={!!busy}
              />
              <Input
                label="输入「恢复备份」确认"
                value={confirm}
                disabled={!!busy}
                onChange={(event) => setConfirm(event.currentTarget.value)}
              />
            </div>
          )
        )}
      </Dialog>
      <Dialog
        open={!!deleting}
        onClose={() => !busy && setDeleting(null)}
        title="删除备份文件？"
        footer={
          <>
            <Button
              disabled={!!busy}
              onClick={() => setDeleting(null)}
              variant="secondary"
              data-dialog-initial-focus
            >
              取消
            </Button>
            <Button
              loading={!!busy}
              onClick={() => void remove()}
              variant="danger"
            >
              删除备份
            </Button>
          </>
        }
        busy={!!!!busy}
        variant="confirm"
      >
        <div
          className="ui-stack"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <p
            className="ui-text"
            style={{
              fontSize: 13,
            }}
          >
            仅删除这份服务器备份，不影响当前网站内容。删除后无法从服务器下载或恢复这份备份。
          </p>
        </div>
      </Dialog>
    </div>
  );
}
