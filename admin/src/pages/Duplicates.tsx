import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Image,
  Modal,
  Pagination,
  Paper,
  Progress,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  Copy,
  EyeOff,
  History,
  Info,
  Pause,
  Play,
  RefreshCw,
  ScanSearch,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api, ApiError, json, notifyError, notifySuccess } from "../api";
import { Empty, ErrorState, Loading, PageTitle } from "../components/Common";
import { PhotoHistory } from "../components/PhotoHistory";
import { OrganizeTabs } from "../components/OrganizeTabs";
import { photoQueries } from "../lib/photo-actions";
import { Toggle } from "../components/Toggle";
import { UnsavedChanges } from "../components/UnsavedChanges";
import { thumbnail, type Settings } from "../types";

interface Scan {
  id: string;
  status: "scanning" | "ready" | "cancelled";
  remote: boolean;
  total: number;
  done: number;
  message: string;
  created_at: string;
  updated_at: string;
}
type Kind = "file" | "link" | "similar";
interface GroupSummary {
  id: number;
  anchor_id: number;
  kind: Kind;
  count: number;
  images: { image_id: number; image_url: string }[];
}
interface ScanPhoto {
  image_id: number;
  image_url: string;
  post_id: number;
  post_title: string;
  current_title: string | null;
  is_hidden: boolean;
  post_hidden: boolean;
  current: boolean;
  revision: number;
  distance: number;
  fingerprint: {
    width: number;
    height: number;
    bytes: number;
    reason?: string;
  };
}
const kinds: Record<Kind, string> = {
  file: "文件内容一致",
  link: "相同链接",
  similar: "画面相似",
};
function errorText(error: unknown) {
  return error instanceof TypeError
    ? "连接中断，进度已保留，可以稍后继续。"
    : error instanceof Error
    ? error.message
    : "操作未完成，请重试";
}

export default function Duplicates() {
  const client = useQueryClient();
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startDialog, setStartDialog] = useState(false);
  const [remote, setRemote] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState<string | null>(null);
  const [view, setView] = useState("pending");
  const [group, setGroup] = useState<GroupSummary | null>(null);
  const [selected, setSelected] = useState(false);
  const [history, setHistory] = useState(false);
  const [issues, setIssues] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const latest = useQuery({
    queryKey: ["duplicateScan"],
    queryFn: ({ signal }) =>
      api<Scan | null>("/duplicates/scans/latest", { signal }),
    staleTime: 0,
    refetchInterval: (query) =>
      !running && query.state.data?.data?.status === "scanning" ? 3000 : false,
  });
  const scan = latest.data?.data;
  const groups = useQuery({
    queryKey: ["duplicateGroups", scan?.id, kind, view, page],
    queryFn: () =>
      api<GroupSummary[]>(
        `/duplicates/scans/${scan!.id}/groups?${new URLSearchParams({
          page: String(page),
          page_size: "8",
          kind: kind || "",
          ignored: String(view === "ignored"),
        })}`,
      ),
    enabled: scan?.status === "ready",
    staleTime: 0,
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/settings"),
  });
  async function run(value: Scan) {
    if (controller.current) return;
    const control = new AbortController();
    controller.current = control;
    setRunning(true);
    setError("");
    setNote("");
    try {
      await client.cancelQueries({ queryKey: ["duplicateScan"] });
      while (!control.signal.aborted) {
        try {
          const result = await api<Scan>(`/duplicates/scans/${value.id}/step`, {
            ...json("POST", {}),
            signal: control.signal,
          });
          client.setQueryData(["duplicateScan"], result);
          setNote("");
          if (result.data.status !== "scanning") {
            void client.invalidateQueries({ queryKey: ["duplicateGroups"] });
            break;
          }
        } catch (cause) {
          if (!(cause instanceof ApiError && cause.status === 409)) throw cause;
          setNote("另一处正在分析图片，等待当前步骤完成…");
          await new Promise<void>((resolve) => {
            const timer = window.setTimeout(done, 700);
            function done() {
              window.clearTimeout(timer);
              control.signal.removeEventListener("abort", done);
              resolve();
            }
            control.signal.addEventListener("abort", done, { once: true });
          });
        }
      }
    } catch (cause) {
      if (!control.signal.aborted) setError(errorText(cause));
    } finally {
      controller.current = null;
      setRunning(false);
      setNote("");
      void latest.refetch();
    }
  }
  async function start() {
    if (starting) return;
    setStarting(true);
    setError("");
    try {
      const result = await api<Scan>(
        "/duplicates/scans",
        json("POST", { remote }),
      );
      client.setQueryData(["duplicateScan"], result);
      setStartDialog(false);
      setPage(1);
      setView("pending");
      void run(result.data);
    } catch (cause) {
      setError(errorText(cause));
      void latest.refetch();
    } finally {
      setStarting(false);
    }
  }
  async function cancel() {
    if (!scan) return;
    controller.current?.abort();
    setCancelDialog(false);
    try {
      const result = await api<Scan>(
        `/duplicates/scans/${scan.id}/cancel`,
        json("POST", {}),
      );
      client.setQueryData(["duplicateScan"], result);
    } catch (cause) {
      setError(errorText(cause));
    }
  }
  async function ignore(item: GroupSummary) {
    try {
      await api(
        `/duplicates/scans/${scan!.id}/groups/${item.id}/ignore`,
        json("PUT", { ignored: view !== "ignored" }),
      );
      await groups.refetch();
      if (groups.data?.data.length === 1 && page > 1) setPage(page - 1);
      notifySuccess(
        view === "ignored"
          ? "已恢复到待处理"
          : "已忽略，相同分组在下次扫描时也会忽略",
      );
    } catch (cause) {
      notifyError(cause);
    }
  }
  return (
    <>
      <UnsavedChanges
        dirty={selected || running}
        message={
          running
            ? "离开会暂停扫描，已完成的进度会保留，回来后可继续。"
            : "尚未处理所选图片，离开将清空选择。"
        }
      />
      <PageTitle title="重复图片">
        <Group gap="xs">
          <Button
            variant="default"
            leftSection={<History size={16} />}
            onClick={() => setHistory(true)}
          >
            处理记录
          </Button>
          <Button
            leftSection={<ScanSearch size={17} />}
            disabled={running || scan?.status === "scanning"}
            onClick={() => {
              setError("");
              setStartDialog(true);
            }}
          >
            开始扫描
          </Button>
        </Group>
      </PageTitle>
      <OrganizeTabs />
      <Paper withBorder p="lg" mb="xl">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text fw={600}>
              {scan
                ? scan.status === "ready"
                  ? `已扫描 ${scan.done} 张照片`
                  : scan.status === "cancelled"
                  ? "扫描已停止"
                  : running
                  ? scan.done >= scan.total
                    ? "正在比较图片…"
                    : "正在读取图片…"
                  : "扫描已暂停，可继续"
                : "找出重复与相似照片"}
            </Text>
            <Text size="sm" c="dimmed" mt={5}>
              {scan
                ? `开始于 ${scan.created_at}${
                    scan.remote ? " · 包含远程图片" : " · 本地图片与相同链接"
                  }`
                : "比较现有帖子中的照片，再由你选择保留或隐藏。"}
            </Text>
          </div>
          {scan && (
            <ActionIcon
              variant="subtle"
              aria-label="刷新扫描进度"
              disabled={running}
              loading={latest.isFetching}
              onClick={() => void latest.refetch()}
            >
              <RefreshCw size={17} />
            </ActionIcon>
          )}
        </Group>
        {scan?.status === "scanning" && (
          <>
            <Progress
              value={scan.total ? (scan.done / scan.total) * 100 : 100}
              mt="lg"
              size={6}
              aria-label="扫描进度"
            />
            <Group justify="space-between" mt="md">
              <Text size="sm" c="dimmed" role="status">
                {scan.done} / {scan.total} 张{note ? ` · ${note}` : ""}
              </Text>
              <Group gap="xs">
                {running ? (
                  <Button
                    size="xs"
                    variant="default"
                    leftSection={<Pause size={14} />}
                    onClick={() => controller.current?.abort()}
                  >
                    暂停
                  </Button>
                ) : (
                  <Button
                    size="xs"
                    leftSection={<Play size={14} />}
                    onClick={() => void run(scan)}
                  >
                    继续扫描
                  </Button>
                )}
                <Button
                  size="xs"
                  color="gray"
                  variant="subtle"
                  onClick={() => setCancelDialog(true)}
                >
                  取消扫描
                </Button>
              </Group>
            </Group>
          </>
        )}
        {scan?.message && (
          <Text size="sm" c="dimmed" mt="sm">
            {scan.message}
          </Text>
        )}
        {scan && scan.done > 0 && (
          <Button
            variant="subtle"
            size="xs"
            mt="sm"
            px={0}
            leftSection={<Info size={14} />}
            onClick={() => setIssues(true)}
          >
            查看读取说明与未完成的图片
          </Button>
        )}
        {error && !startDialog && (
          <Alert color="red" mt="md">
            {error}
          </Alert>
        )}
      </Paper>
      {latest.isPending ? (
        <Loading />
      ) : latest.error ? (
        <ErrorState error={latest.error} retry={() => latest.refetch()} />
      ) : scan?.status === "ready" ? (
        <>
          <Group justify="space-between" mb="lg">
            <SegmentedControl
              value={view}
              onChange={(value) => {
                setView(value);
                setPage(1);
              }}
              data={[
                { value: "pending", label: "待处理" },
                { value: "ignored", label: "已忽略" },
              ]}
            />
            <Select
              aria-label="重复类型"
              placeholder="全部类型"
              clearable
              value={kind}
              onChange={(value) => {
                setKind(value);
                setPage(1);
              }}
              data={Object.entries(kinds).map(([value, label]) => ({
                value,
                label,
              }))}
              w={180}
            />
          </Group>
          {groups.isPending ? (
            <Loading />
          ) : groups.error ? (
            <ErrorState error={groups.error} retry={() => groups.refetch()} />
          ) : !groups.data?.data.length ? (
            <Empty
              title={
                view === "ignored" ? "没有已忽略的分组" : "没有待处理的重复分组"
              }
              description="相似判断仅供参考；未能读取的图片可在读取说明中查看。"
            />
          ) : (
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
              {groups.data.data.map((item) => (
                <Paper
                  key={item.id}
                  withBorder
                  p="lg"
                  className="duplicate-group-card"
                >
                  <Group justify="space-between" mb="md">
                    <Group gap="xs">
                      <Copy size={17} />
                      <Text fw={600}>{kinds[item.kind]}</Text>
                    </Group>
                    <Badge
                      variant="light"
                      color={item.kind === "similar" ? "orange" : "victoria"}
                    >
                      {item.count} 张
                    </Badge>
                  </Group>
                  <button
                    className="duplicate-previews"
                    onClick={() => setGroup(item)}
                    aria-label={`比较分组 ${item.id}，${item.count} 张图片`}
                  >
                    {item.images.map((photo) => (
                      <Image
                        key={photo.image_id}
                        src={thumbnail(
                          photo.image_url,
                          settings.data?.data,
                          320,
                        )}
                        alt="待比较照片"
                        loading="lazy"
                        fit="cover"
                      />
                    ))}
                  </button>
                  <Group justify="space-between" mt="md">
                    <Button
                      size="sm"
                      variant="subtle"
                      color="gray"
                      onClick={() => void ignore(item)}
                    >
                      {view === "ignored" ? "恢复分组" : "忽略此组"}
                    </Button>
                    <Button
                      size="sm"
                      variant="light"
                      onClick={() => setGroup(item)}
                    >
                      比较与处理
                    </Button>
                  </Group>
                </Paper>
              ))}
            </SimpleGrid>
          )}
          {(groups.data?.total || 0) > 8 && (
            <Group justify="center" mt="xl">
              <Pagination
                value={page}
                onChange={setPage}
                total={Math.ceil(groups.data!.total! / 8)}
              />
            </Group>
          )}
        </>
      ) : (
        !scan && (
          <Empty
            title="还没有扫描结果"
            description="识别相同文件、重复链接和画面相似的候选照片。结果仅在后台可见。"
          />
        )
      )}
      <Modal
        opened={startDialog}
        onClose={() => !starting && setStartDialog(false)}
        title="扫描重复图片"
        centered
      >
        <Stack gap="lg">
          <Text size="sm">
            扫描已发布帖子的全部照片（含隐藏照片），不包含草稿和回收站。已有内容不会自动改变。
          </Text>
          <Toggle
            label="同时读取远程图片"
            description="从图片原地址读取，可能产生存储流量费用；照片不会发送到识别服务。"
            checked={remote}
            onChange={(e) => setRemote(e.currentTarget.checked)}
            disabled={starting}
          />
          <Text size="xs" c="dimmed">
            每次只分析一张，支持暂停继续。单张读取上限 32 MB；超过 3200
            万像素或动图仅比较文件内容。远程读取仅支持公网地址。相似结果需人工核对。
          </Text>
          {error && <Alert color="red">{error}</Alert>}
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setStartDialog(false)}
              disabled={starting}
            >
              取消
            </Button>
            <Button onClick={() => void start()} loading={starting}>
              开始检测
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={cancelDialog}
        onClose={() => setCancelDialog(false)}
        title="取消这次扫描？"
        centered
      >
        <Text size="sm">取消后可以重新扫描；照片与之前的处理记录会保留。</Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setCancelDialog(false)}>
            保留进度
          </Button>
          <Button color="red" onClick={() => void cancel()}>
            确认取消扫描
          </Button>
        </Group>
      </Modal>
      {scan && group && (
        <DuplicateGroup
          key={`${scan.id}:${group.id}`}
          scan={scan.id}
          summary={group}
          settings={settings.data?.data}
          onClose={() => setGroup(null)}
          onDirty={setSelected}
        />
      )}
      {scan && issues && (
        <ScanIssues scan={scan.id} onClose={() => setIssues(false)} />
      )}
      {history && <PhotoHistory onClose={() => setHistory(false)} />}
    </>
  );
}

function DuplicateGroup({
  scan,
  summary,
  settings,
  onClose,
  onDirty,
}: {
  scan: string;
  summary: GroupSummary;
  settings?: Settings;
  onClose: () => void;
  onDirty: (dirty: boolean) => void;
}) {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ScanPhoto[]>([]);
  const [preview, setPreview] = useState<ScanPhoto | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [operation, setOperation] = useState("");
  const group = useQuery({
    queryKey: ["duplicateGroup", scan, summary.id, page],
    queryFn: () =>
      api<{ id: number; kind: Kind; total: number; images: ScanPhoto[] }>(
        `/duplicates/scans/${scan}/groups/${summary.id}?page=${page}&page_size=12`,
      ),
    staleTime: 0,
  });
  useEffect(() => {
    onDirty(selected.length > 0 || busy);
    return () => onDirty(false);
  }, [selected.length, busy, onDirty]);
  function close() {
    if (busy) return;
    if (selected.length) setClosing(true);
    else onClose();
  }
  function choose(photo: ScanPhoto, checked: boolean) {
    if (checked && selected.length >= 100) {
      notifyError(new Error("每次最多处理 100 张照片"));
      return;
    }
    setSelected((current) =>
      checked
        ? [...current, photo]
        : current.filter((item) => item.image_id !== photo.image_id),
    );
    setOperation("");
    setError("");
  }
  async function hide() {
    if (busy || !selected.length) return;
    const id = operation || crypto.randomUUID().replaceAll("-", "");
    setOperation(id);
    setBusy(true);
    setError("");
    try {
      await api(
        `/duplicates/scans/${scan}/groups/${summary.id}/hide`,
        json("POST", {
          id,
          confirm: true,
          targets: selected.map((photo) => ({
            id: photo.image_id,
            revision: photo.revision,
          })),
        }),
      );
      setSelected([]);
      setConfirm(false);
      setOperation("");
      await Promise.all(
        photoQueries.map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
      notifySuccess("所选图片已隐藏，可在处理记录中撤销");
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Modal
        opened
        onClose={close}
        title={`${kinds[summary.kind]} · ${summary.count} 张`}
        size="xl"
        centered
        classNames={{ content: "duplicate-comparison" }}
        closeOnClickOutside={false}
        closeOnEscape={!busy}
      >
        <Stack gap="lg">
          <Text size="sm" c="dimmed">
            选中需要隐藏的照片，至少保留一张。隐藏会同步影响照片墙与分享相册，原图仍保留。
            {summary.kind === "similar" &&
              "相似画面可能是连拍或不同作品，请仔细比较。"}
          </Text>
          <Group justify="space-between" className="duplicate-selection">
            <Text size="sm">已选 {selected.length} 张</Text>
            <Group gap="xs">
              <Button
                variant="subtle"
                size="xs"
                disabled={busy}
                onClick={() => {
                  setSelected([]);
                  setOperation("");
                  setError("");
                  void group.refetch();
                }}
              >
                清空选择并刷新
              </Button>
              <Button
                size="sm"
                leftSection={<EyeOff size={15} />}
                disabled={!selected.length || busy}
                onClick={() => {
                  setError("");
                  setConfirm(true);
                }}
              >
                隐藏所选
              </Button>
            </Group>
          </Group>
          {group.isPending ? (
            <Loading />
          ) : group.error ? (
            <ErrorState error={group.error} retry={() => group.refetch()} />
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {group.data?.data.images.map((photo) => (
                <div
                  className={`duplicate-photo ${
                    selected.some((item) => item.image_id === photo.image_id)
                      ? "is-selected"
                      : ""
                  }`}
                  key={photo.image_id}
                >
                  <button
                    className="duplicate-photo-preview"
                    aria-label={`查看原图 ${photo.image_id}`}
                    onClick={() => setPreview(photo)}
                  >
                    <Image
                      src={thumbnail(photo.image_url, settings, 640)}
                      alt={photo.current_title || photo.post_title}
                      loading="lazy"
                      fit="contain"
                    />
                  </button>
                  <div className="duplicate-photo-copy">
                    <Group
                      justify="space-between"
                      align="flex-start"
                      wrap="nowrap"
                    >
                      <Checkbox
                        aria-label={`选择图片 ${photo.image_id}`}
                        checked={selected.some(
                          (item) => item.image_id === photo.image_id,
                        )}
                        disabled={!photo.current || photo.is_hidden || busy}
                        onChange={(e) => choose(photo, e.currentTarget.checked)}
                      />
                      <Text
                        size="sm"
                        fw={600}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {photo.current_title || photo.post_title}
                      </Text>
                      {photo.image_id === summary.anchor_id && (
                        <Badge variant="light" size="sm">
                          参考
                        </Badge>
                      )}
                    </Group>
                    <Group gap={6} mt="sm">
                      {photo.is_hidden && (
                        <Badge color="gray" size="xs">
                          图片已隐藏
                        </Badge>
                      )}
                      {photo.post_hidden && (
                        <Badge color="gray" size="xs">
                          帖子已隐藏
                        </Badge>
                      )}
                      {!photo.current && (
                        <Badge color="orange" size="xs">
                          内容已变化
                        </Badge>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed" mt={6}>
                      #{photo.image_id} ·{" "}
                      {photo.fingerprint.width
                        ? `${photo.fingerprint.width} × ${photo.fingerprint.height}`
                        : "尺寸未知"}
                      {photo.fingerprint.bytes > 0
                        ? ` · ${(photo.fingerprint.bytes / 1024 / 1024).toFixed(
                            2,
                          )} MB`
                        : ""}
                    </Text>
                    {photo.fingerprint.reason && (
                      <Text size="xs" c="dimmed" mt={4}>
                        {photo.fingerprint.reason}
                      </Text>
                    )}
                    <Button
                      component={Link}
                      to={`/posts/${photo.post_id}`}
                      variant="subtle"
                      size="xs"
                      px={0}
                      mt={5}
                    >
                      编辑所属帖子
                    </Button>
                  </div>
                </div>
              ))}
            </SimpleGrid>
          )}
          {(group.data?.data.total || 0) > 12 && (
            <Group justify="center">
              <Pagination
                value={page}
                onChange={setPage}
                total={Math.ceil(group.data!.data.total / 12)}
              />
            </Group>
          )}
        </Stack>
      </Modal>
      <Modal
        opened={confirm}
        onClose={() => !busy && setConfirm(false)}
        title={`隐藏这 ${selected.length} 张照片？`}
        centered
        closeOnClickOutside={!busy}
      >
        <Text size="sm">
          照片将从公开页面和分享相册中隐藏。如果某篇帖子的可见照片全部隐藏，该帖子也将不再出现在照片墙。可在处理记录中撤销；之后若编辑过帖子，请在编辑页调整。
        </Text>
        {error && (
          <Alert color="red" mt="md" role="alert">
            {error}
          </Alert>
        )}
        <Group justify="flex-end" mt="lg">
          <Button
            variant="default"
            disabled={busy}
            onClick={() => setConfirm(false)}
          >
            继续比较
          </Button>
          <Button loading={busy} onClick={() => void hide()}>
            确认隐藏
          </Button>
        </Group>
      </Modal>
      <Modal
        opened={closing}
        onClose={() => setClosing(false)}
        title="清空选择并关闭？"
        centered
      >
        <Text size="sm">尚未隐藏任何照片，关闭会清空当前选择。</Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setClosing(false)}>
            继续比较
          </Button>
          <Button onClick={onClose}>清空并关闭</Button>
        </Group>
      </Modal>
      <Modal
        opened={!!preview}
        onClose={() => setPreview(null)}
        title={
          preview
            ? `原图 · ${preview.current_title || preview.post_title}`
            : "原图"
        }
        size="xl"
        centered
      >
        {preview && (
          <Image
            src={preview.image_url}
            alt="用于比较的原图"
            fit="contain"
            mah="75vh"
          />
        )}
      </Modal>
    </>
  );
}

function ScanIssues({ scan, onClose }: { scan: string; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const issues = useQuery({
    queryKey: ["duplicateIssues", scan, page],
    queryFn: () =>
      api<
        {
          image_id: number;
          post_id: number;
          post_title: string;
          reason: string;
        }[]
      >(`/duplicates/scans/${scan}/issues?page=${page}&page_size=15`),
    staleTime: 0,
  });
  return (
    <Modal opened onClose={onClose} title="读取说明" size="lg" centered>
      {issues.isPending ? (
        <Loading />
      ) : issues.error ? (
        <ErrorState error={issues.error} retry={() => issues.refetch()} />
      ) : (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            以下图片未能进行完整的画面比较；相同链接或已读取的文件内容仍会参与比较。修正地址或启用远程读取后可重新扫描。
          </Text>
          {issues.data?.data.length ? (
            issues.data.data.map((item) => (
              <Paper key={item.image_id} withBorder p="md">
                <Text size="sm" fw={600}>
                  {item.post_title} · #{item.image_id}
                </Text>
                <Text size="sm" c="dimmed" mt={5}>
                  {item.reason}
                </Text>
                <Button
                  component={Link}
                  to={`/posts/${item.post_id}`}
                  size="xs"
                  variant="subtle"
                  px={0}
                  mt={4}
                >
                  查看帖子
                </Button>
              </Paper>
            ))
          ) : (
            <Text size="sm">没有需要说明的图片。</Text>
          )}
          {(issues.data?.total || 0) > 15 && (
            <Pagination
              value={page}
              onChange={setPage}
              total={Math.ceil(issues.data!.total! / 15)}
            />
          )}
        </Stack>
      )}
    </Modal>
  );
}
