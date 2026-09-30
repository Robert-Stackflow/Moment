import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  PasswordInput,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  Archive,
  ArchiveRestore,
  Download,
  FileUp,
  Plus,
  Trash2,
} from "lucide-react";
import { api, json, notifyError, notifySuccess } from "../api";
import { Empty, ErrorState, Loading } from "../components/Common";
import { UnsavedChanges } from "../components/UnsavedChanges";

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
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
      {[
        ["帖子", backup.posts],
        ["照片", backup.images],
        ["草稿", backup.drafts],
        ["回收站", backup.trash],
      ].map(([label, value]) => (
        <Paper key={label} withBorder p="sm">
          <Text size="xs" c="dimmed">
            {label}
          </Text>
          <Text fw={600} size="lg">
            {value}
          </Text>
        </Paper>
      ))}
    </SimpleGrid>
  );
}
export default function Backups() {
  const client = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
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
    <Stack gap="lg">
      <UnsavedChanges
        dirty={!!busy}
        message="备份操作正在进行。离开可能中断传输；恢复一旦开始替换数据，将继续完成。返回后请检查操作结果。"
      />
      <Paper withBorder p="xl">
        <Group justify="space-between" align="flex-start" gap="lg">
          <div>
            <Title order={3}>备份与恢复</Title>
            <Text size="sm" c="dimmed" mt={8}>
              保存数据库、本地照片和头像，迁移后继续使用。
            </Text>
          </div>
          <Group gap="xs">
            <Button
              variant="default"
              leftSection={<FileUp size={16} />}
              disabled={!!busy}
              onClick={() => fileInput.current?.click()}
            >
              导入备份
            </Button>
            <Button
              leftSection={<Plus size={16} />}
              disabled={!!busy}
              onClick={() => void create()}
            >
              创建备份
            </Button>
          </Group>
        </Group>
        <input
          ref={fileInput}
          type="file"
          accept=".zip,application/zip"
          aria-label="选择备份文件"
          hidden
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            void upload(file);
          }}
        />
        <Text size="xs" c="dimmed" mt="lg">
          包含账户及存储凭据，请妥善保管。S3
          原图不打包，需单独备份存储桶。支持本版本导出的 ZIP，最大 2
          GB；解压总量不超过 8 GB。
        </Text>
        {!!busy && (
          <Stack gap={8} mt="lg">
            <Text size="sm" role="status">
              {busy}… 创建备份期间编辑请求会等待，恢复期间网站会短暂等待。
            </Text>
            {busy === "正在上传备份" ? (
              <Progress value={progress} aria-label="备份上传进度" />
            ) : (
              <Progress value={100} animated aria-label="正在处理备份" />
            )}
          </Stack>
        )}
      </Paper>
      {imported && (
        <Alert
          color="green"
          title="导入校验通过"
          withCloseButton
          onClose={() => setImported(null)}
        >
          <Text size="sm" mb="sm">
            备份时间：{dateLabel(imported.created_at)}，包含{" "}
            {imported.local_files} 个本地文件。确认恢复前，当前内容保持不变。
          </Text>
          <Summary backup={imported} />
          <Button
            mt="md"
            variant="light"
            disabled={!!busy}
            onClick={() => chooseRestore(imported)}
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
        <Paper withBorder>
          <Empty
            title="还没有备份"
            description="创建一份备份，或导入之前下载的备份。"
          />
        </Paper>
      ) : (
        <Stack gap="sm">
          {backups.data.data.map((backup) => (
            <Paper withBorder p="lg" key={backup.id}>
              <Group justify="space-between" gap="md" mb="md">
                <Group gap="sm">
                  <Archive size={20} />
                  <Text fw={600}>{dateLabel(backup.created_at)}</Text>
                  <Badge
                    variant="light"
                    color={
                      backup.source === "before-restore" ? "orange" : "gray"
                    }
                  >
                    {
                      {
                        manual: "手动备份",
                        import: "导入备份",
                        "before-restore": "恢复前备份",
                      }[backup.source]
                    }
                  </Badge>
                </Group>
                <Group gap={6}>
                  <Button
                    component="a"
                    href={`/api/admin/backups/${backup.id}/download`}
                    download
                    disabled={!!busy}
                    size="xs"
                    variant="default"
                    leftSection={<Download size={14} />}
                  >
                    下载
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    disabled={!!busy}
                    leftSection={<ArchiveRestore size={14} />}
                    onClick={() => chooseRestore(backup)}
                  >
                    恢复
                  </Button>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    disabled={!!busy}
                    aria-label={`删除备份 ${dateLabel(backup.created_at)}`}
                    onClick={() => setDeleting(backup)}
                  >
                    <Trash2 size={16} />
                  </ActionIcon>
                </Group>
              </Group>
              <Summary backup={backup} />
              <Text c="dimmed" size="xs" mt="sm">
                {sizeLabel(backup.size)} · {backup.local_files} 个本地文件 ·
                帖子与照片数量包含回收站内容
              </Text>
            </Paper>
          ))}
        </Stack>
      )}
      <Modal
        opened={!!restoring}
        onClose={() => !busy && !restored && setRestoring(null)}
        title={restored ? "恢复完成" : "恢复整站备份"}
        centered
        closeOnClickOutside={!busy && !restored}
        closeOnEscape={!busy && !restored}
        withCloseButton={!busy && !restored}
      >
        {restored ? (
          <Stack>
            <Alert color="green">
              内容已恢复，恢复前的数据也已自动备份。所有登录会话已失效，请使用备份中的账户重新登录。
            </Alert>
            <Button component="a" href="/admin/login">
              重新登录
            </Button>
          </Stack>
        ) : (
          restoring && (
            <Stack>
              <Text size="sm">
                将网站恢复到 {dateLabel(restoring.created_at)}
                。现有帖子、账户、设置、本地照片和头像将被替换；服务器上的其他备份会保留。
              </Text>
              <Summary backup={restoring} />
              <Alert color="orange">
                开始前会自动备份当前内容。恢复成功后需要用备份中的账户重新登录，请确认你知道该账户的密码。
              </Alert>
              <PasswordInput
                label="当前账户密码"
                autoComplete="current-password"
                value={password}
                disabled={!!busy}
                onChange={(event) => setPassword(event.currentTarget.value)}
              />
              <TextInput
                label="输入「恢复备份」确认"
                value={confirm}
                disabled={!!busy}
                onChange={(event) => setConfirm(event.currentTarget.value)}
              />
              <Group justify="flex-end">
                <Button
                  variant="default"
                  disabled={!!busy}
                  onClick={() => setRestoring(null)}
                >
                  取消
                </Button>
                <Button
                  color="orange"
                  loading={!!busy}
                  disabled={!password || confirm !== "恢复备份"}
                  onClick={() => void restore()}
                >
                  确认恢复
                </Button>
              </Group>
            </Stack>
          )
        )}
      </Modal>
      <Modal
        opened={!!deleting}
        onClose={() => !busy && setDeleting(null)}
        title="删除备份文件？"
        centered
      >
        <Stack>
          <Text size="sm">
            仅删除这份服务器备份，不影响当前网站内容。删除后无法从服务器下载或恢复这份备份。
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={!!busy}
              onClick={() => setDeleting(null)}
            >
              取消
            </Button>
            <Button color="red" loading={!!busy} onClick={() => void remove()}>
              删除备份
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
