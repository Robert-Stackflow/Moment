import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  IconButton,
  Pagination,
  Progress,
  Segmented,
  Select,
} from "@robert-stackflow/oneui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CheckCircle2,
  Copy,
  EyeOff,
  History,
  ImageOff,
  Inbox,
  Info,
  Pause,
  Play,
  RefreshCw,
  ScanSearch,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, json, notifyError, notifySuccess } from "../api";
import { useRestoreFocusOnUnmount } from "../hooks";
import { Empty, ErrorState, Loading, PageTitle } from "../components/Common";
import { OrganizeTabs } from "../components/OrganizeTabs";
import { PhotoHistory } from "../components/PhotoHistory";
import { RecordDialog, RecordEmpty } from "../components/RecordDialog";
import { Toggle } from "../components/Toggle";
import { UnsavedChanges } from "../components/UnsavedChanges";
import { photoQueries } from "../lib/photo-actions";
import { thumbnail, type Settings } from "../types";
import {
  adminHref,
  badgeTone,
  gridStyle,
  segmentOptions,
  selectOptions,
  tone,
} from "../ui-data";
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
  images: {
    image_id: number;
    image_url: string;
  }[];
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
        <div
          className="ui-row"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          <Button onClick={() => setHistory(true)} variant="secondary">
            {<History size={16} />}
            处理记录
          </Button>
        </div>
      </PageTitle>
      <OrganizeTabs />
      <Card className={"moment-panel " + "duplicate-scan-card"}>
        <div
          className="ui-row"
          style={{
            display: "flex",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              className="ui-text"
              style={{
                fontWeight: 600,
              }}
            >
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
            </p>
            <p
              className="ui-text"
              style={{
                fontSize: 13,
                color: "var(--muted)",
                marginTop: 5,
              }}
            >
              {scan
                ? `开始于 ${scan.created_at}${scan.remote ? " · 包含远程图片" : " · 本地图片与相同链接"}`
                : "比较现有帖子中的照片，再由你选择保留或隐藏。"}
            </p>
          </div>
          {scan && (
            <IconButton
              label={"刷新扫描进度"}
              disabled={running}
              loading={latest.isFetching}
              onClick={() => void latest.refetch()}
              variant="ghost"
            >
              <RefreshCw size={17} />
            </IconButton>
          )}
        </div>
        {scan?.status === "scanning" && (
          <>
            <div
              style={{
                marginTop: 24,
              }}
            >
              <Progress
                value={scan.total ? (scan.done / scan.total) * 100 : 100}
                label={"扫描进度"}
              />
            </div>
            <div
              className="ui-row"
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "space-between",
                marginTop: 16,
              }}
            >
              <p
                role="status"
                className="ui-text"
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                }}
              >
                {scan.done} / {scan.total} 张{note ? ` · ${note}` : ""}
              </p>
              <div
                className="ui-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {running ? (
                  <Button
                    size="small"
                    onClick={() => controller.current?.abort()}
                    variant="secondary"
                  >
                    {<Pause size={14} />}
                    暂停
                  </Button>
                ) : (
                  <Button
                    size="small"
                    onClick={() => void run(scan)}
                    variant="primary"
                  >
                    {<Play size={14} />}
                    继续扫描
                  </Button>
                )}
                <Button
                  size="small"
                  onClick={() => setCancelDialog(true)}
                  variant="ghost"
                >
                  取消扫描
                </Button>
              </div>
            </div>
          </>
        )}
        {scan?.message && (
          <p
            className="ui-text"
            style={{
              fontSize: 13,
              color: "var(--muted)",
              marginTop: 10,
            }}
          >
            {scan.message}
          </p>
        )}
        <div className="duplicate-scan-actions">
          {scan && scan.done > 0 && (
            <Button
              size="small"
              onClick={() => setIssues(true)}
              variant="secondary"
            >
              {<Info size={16} />}
              读取说明与未完成图片
            </Button>
          )}
          {scan?.status !== "scanning" && (
            <Button
              className="duplicate-scan-start"
              disabled={running || latest.isPending}
              onClick={() => {
                setError("");
                setStartDialog(true);
              }}
              variant="primary"
            >
              {<ScanSearch size={17} />}
              {scan ? "重新扫描" : "开始扫描"}
            </Button>
          )}
        </div>
        {error && !startDialog && (
          <div
            style={{
              marginTop: 16,
            }}
          >
            <Alert tone={tone("red")}>{error}</Alert>
          </div>
        )}
      </Card>
      {latest.isPending ? (
        <Loading />
      ) : latest.error ? (
        <ErrorState error={latest.error} retry={() => latest.refetch()} />
      ) : scan?.status === "ready" ? (
        <>
          <div
            className={"ui-row " + "duplicate-filters"}
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              justifyContent: "space-between",
              marginBottom: 24,
            }}
          >
            <div className="duplicate-view-switch">
              <Segmented
                aria-label="重复分组状态"
                value={view}
                onChange={(value) => {
                  setView(value);
                  setPage(1);
                }}
                options={segmentOptions([
                  {
                    value: "pending",
                    label: (
                      <span className="duplicate-view-option">
                        <Inbox size={15} aria-hidden="true" />
                        待处理
                      </span>
                    ),
                  },
                  {
                    value: "ignored",
                    label: (
                      <span className="duplicate-view-option">
                        <EyeOff size={15} aria-hidden="true" />
                        已忽略
                      </span>
                    ),
                  },
                ])}
                label={"重复分组状态"}
              />
            </div>
            <div className="duplicate-type-filter">
              <Select
                aria-label="重复类型"
                placeholder="全部类型"
                onChange={(value) => {
                  setKind(value);
                  setPage(1);
                }}
                options={selectOptions([
                  { value: "", label: "全部类型" },
                  ...Object.entries(kinds).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ])}
                label={"重复类型"}
                value={kind ?? ""}
              />
            </div>
          </div>
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
            <div
              className="ui-grid"
              style={{
                ...gridStyle({ base: 1, lg: 2 }, 24),
              }}
            >
              {groups.data.data.map((item) => (
                <Card
                  key={item.id}
                  className={"moment-panel " + "duplicate-group-card"}
                >
                  <div
                    className="ui-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 10,
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
                        gap: 6,
                      }}
                    >
                      <Copy size={17} />
                      <p
                        className="ui-text"
                        style={{
                          fontWeight: 600,
                        }}
                      >
                        {kinds[item.kind]}
                      </p>
                    </div>
                    <Badge
                      tone={badgeTone(
                        item.kind === "similar" ? "orange" : "victoria",
                      )}
                    >
                      {item.count} 张
                    </Badge>
                  </div>
                  <Button
                    className="duplicate-previews image-action app-button-layout"
                    onClick={() => setGroup(item)}
                    aria-label={`比较分组 ${item.id}，${item.count} 张图片`}
                    variant="ghost"
                  >
                    {item.images.map((photo) => (
                      <img
                        key={photo.image_id}
                        src={thumbnail(
                          photo.image_url,
                          settings.data?.data,
                          320,
                        )}
                        alt="待比较照片"
                        loading="lazy"
                      />
                    ))}
                  </Button>
                  <div
                    className="ui-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 10,
                      justifyContent: "space-between",
                      marginTop: 16,
                    }}
                  >
                    <Button
                      size="small"
                      onClick={() => void ignore(item)}
                      variant="ghost"
                    >
                      {view === "ignored" ? "恢复分组" : "忽略此组"}
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setGroup(item)}
                      variant="secondary"
                    >
                      比较与处理
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {(groups.data?.total || 0) > 8 && (
            <div
              className="ui-row"
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "center",
                marginTop: 32,
              }}
            >
              <Pagination
                page={page}
                onPageChange={setPage}
                total={groups.data!.total!}
                pageSize={8}
                summary={null}
              />
            </div>
          )}
        </>
      ) : (
        !scan && <Empty title="还没有扫描结果" />
      )}
      <Dialog
        open={startDialog}
        onClose={() => !starting && setStartDialog(false)}
        title="扫描重复图片"
        footer={
          <>
            <Button
              onClick={() => setStartDialog(false)}
              disabled={starting}
              variant="secondary"
            >
              取消
            </Button>
            <Button
              onClick={() => void start()}
              loading={starting}
              variant="primary"
            >
              开始检测
            </Button>
          </>
        }
        busy={!!starting}
        variant="default"
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
            扫描已发布帖子的全部照片（含隐藏照片），不包含草稿和回收站。已有内容不会自动改变。
          </p>
          <Toggle
            label="同时读取远程图片"
            description="从图片原地址读取，可能产生存储流量费用；照片不会发送到识别服务。"
            checked={remote}
            onChange={(e) => setRemote(e)}
            disabled={starting}
          />
          <p
            className="ui-text"
            style={{
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            每次只分析一张，支持暂停继续。单张读取上限 32 MB；超过 3200
            万像素或动图仅比较文件内容。远程读取仅支持公网地址。相似结果需人工核对。
          </p>
          {error && <Alert tone={tone("red")}>{error}</Alert>}
        </div>
      </Dialog>
      <Dialog
        open={cancelDialog}
        onClose={() => setCancelDialog(false)}
        title="取消这次扫描？"
        footer={
          <>
            <Button
              onClick={() => setCancelDialog(false)}
              variant="secondary"
              data-dialog-initial-focus
            >
              保留进度
            </Button>
            <Button onClick={() => void cancel()} variant="danger">
              确认取消扫描
            </Button>
          </>
        }
        variant="confirm"
      >
        <p
          className="ui-text"
          style={{
            fontSize: 13,
          }}
        >
          取消后可以重新扫描；照片与之前的处理记录会保留。
        </p>
      </Dialog>
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
  useRestoreFocusOnUnmount();
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
      api<{
        id: number;
        kind: Kind;
        total: number;
        images: ScanPhoto[];
      }>(
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
      <Dialog
        open={true}
        onClose={close}
        title={`${kinds[summary.kind]} · ${summary.count} 张`}
        size="large"
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
              color: "var(--muted)",
            }}
          >
            选中需要隐藏的照片，至少保留一张。隐藏会同步影响照片墙与分享相册，原图仍保留。
            {summary.kind === "similar" &&
              "相似画面可能是连拍或不同作品，请仔细比较。"}
          </p>
          <div
            className={"ui-row " + "duplicate-selection"}
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              justifyContent: "space-between",
            }}
          >
            <p
              className="ui-text"
              style={{
                fontSize: 13,
              }}
            >
              已选 {selected.length} 张
            </p>
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
                size="small"
                disabled={busy}
                onClick={() => {
                  setSelected([]);
                  setOperation("");
                  setError("");
                  void group.refetch();
                }}
                variant="ghost"
              >
                清空选择并刷新
              </Button>
              <Button
                size="small"
                disabled={!selected.length || busy}
                onClick={() => {
                  setError("");
                  setConfirm(true);
                }}
                variant="primary"
              >
                {<EyeOff size={15} />}
                隐藏所选
              </Button>
            </div>
          </div>
          {group.isPending ? (
            <Loading />
          ) : group.error ? (
            <ErrorState error={group.error} retry={() => group.refetch()} />
          ) : (
            <div
              className="ui-grid"
              style={{
                ...gridStyle({ base: 1, sm: 2 }, 16),
              }}
            >
              {group.data?.data.images.map((photo) => (
                <div
                  className={`duplicate-photo ${
                    selected.some((item) => item.image_id === photo.image_id)
                      ? "is-selected"
                      : ""
                  }`}
                  key={photo.image_id}
                >
                  <Button
                    className="duplicate-photo-preview image-action app-button-layout"
                    aria-label={`查看原图 ${photo.image_id}`}
                    onClick={() => setPreview(photo)}
                    variant="ghost"
                  >
                    <img
                      src={thumbnail(photo.image_url, settings, 640)}
                      alt={photo.current_title || photo.post_title}
                      loading="lazy"
                    />
                  </Button>
                  <div className="duplicate-photo-copy">
                    <div
                      className="ui-row"
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        flexWrap: "nowrap",
                        gap: 10,
                        justifyContent: "space-between",
                      }}
                    >
                      <Checkbox
                        onChange={(checked) => choose(photo, checked)}
                        label={`选择图片 ${photo.image_id}`}
                        checked={selected.some(
                          (item) => item.image_id === photo.image_id,
                        )}
                        disabled={!photo.current || photo.is_hidden || busy}
                      />
                      <p
                        className="ui-text"
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          ...{
                            flex: 1,
                            minWidth: 0,
                            overflowWrap: "anywhere",
                          },
                        }}
                      >
                        {photo.current_title || photo.post_title}
                      </p>
                      {photo.image_id === summary.anchor_id && (
                        <Badge>参考</Badge>
                      )}
                    </div>
                    <div
                      className="ui-row"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 10,
                      }}
                    >
                      {photo.is_hidden && (
                        <Badge tone={badgeTone("gray")}>图片已隐藏</Badge>
                      )}
                      {photo.post_hidden && (
                        <Badge tone={badgeTone("gray")}>帖子已隐藏</Badge>
                      )}
                      {!photo.current && (
                        <Badge tone={badgeTone("orange")}>内容已变化</Badge>
                      )}
                    </div>
                    <p
                      className="ui-text"
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        marginTop: 6,
                      }}
                    >
                      #{photo.image_id} ·{" "}
                      {photo.fingerprint.width
                        ? `${photo.fingerprint.width} × ${photo.fingerprint.height}`
                        : "尺寸未知"}
                      {photo.fingerprint.bytes > 0
                        ? ` · ${(photo.fingerprint.bytes / 1024 / 1024).toFixed(2)} MB`
                        : ""}
                    </p>
                    {photo.fingerprint.reason && (
                      <p
                        className="ui-text"
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          marginTop: 4,
                        }}
                      >
                        {photo.fingerprint.reason}
                      </p>
                    )}
                    <Button
                      href={adminHref(`/posts/${photo.post_id}`)}
                      size="small"
                      variant="ghost"
                      style={{
                        paddingLeft: 0,
                        paddingRight: 0,
                        marginTop: 5,
                      }}
                    >
                      编辑所属帖子
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {(group.data?.data.total || 0) > 12 && (
            <div
              className="ui-row"
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "center",
              }}
            >
              <Pagination
                page={page}
                onPageChange={setPage}
                total={group.data!.data.total}
                pageSize={12}
                summary={null}
              />
            </div>
          )}
        </div>
      </Dialog>
      <Dialog
        open={confirm}
        onClose={() => !busy && setConfirm(false)}
        title={`隐藏这 ${selected.length} 张照片？`}
        busy={busy}
        footer={
          <>
            <Button
              disabled={busy}
              onClick={() => setConfirm(false)}
              variant="secondary"
            >
              继续比较
            </Button>
            <Button
              loading={busy}
              onClick={() => void hide()}
              variant="primary"
            >
              确认隐藏
            </Button>
          </>
        }
        variant="default"
      >
        <p
          className="ui-text"
          style={{
            fontSize: 13,
          }}
        >
          照片将从公开页面和分享相册中隐藏。如果某篇帖子的可见照片全部隐藏，该帖子也将不再出现在照片墙。可在处理记录中撤销；之后若编辑过帖子，请在编辑页调整。
        </p>
        {error && (
          <div
            style={{
              marginTop: 16,
            }}
          >
            <Alert tone={tone("red")}>{error}</Alert>
          </div>
        )}
      </Dialog>
      <Dialog
        open={closing}
        onClose={() => setClosing(false)}
        title="清空选择并关闭？"
        footer={
          <>
            <Button onClick={() => setClosing(false)} variant="secondary">
              继续比较
            </Button>
            <Button onClick={onClose} variant="primary">
              清空并关闭
            </Button>
          </>
        }
        variant="default"
      >
        <p
          className="ui-text"
          style={{
            fontSize: 13,
          }}
        >
          尚未隐藏任何照片，关闭会清空当前选择。
        </p>
      </Dialog>
      <Dialog
        open={!!preview}
        onClose={() => setPreview(null)}
        title={
          preview
            ? `原图 · ${preview.current_title || preview.post_title}`
            : "原图"
        }
        size="large"
      >
        {preview && (
          <img
            src={preview.image_url}
            alt="用于比较的原图"
            style={{
              maxHeight: "75vh",
            }}
          />
        )}
      </Dialog>
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
    <RecordDialog
      onClose={onClose}
      title="读取说明"
      icon={Info}
      total={issues.data?.total}
      page={page}
      pageSize={15}
      onPageChange={setPage}
    >
      {issues.isPending ? (
        <Loading />
      ) : issues.error ? (
        <ErrorState error={issues.error} retry={() => issues.refetch()} />
      ) : (
        <div
          className="ui-stack"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {!!issues.data?.data.length && (
            <p
              className={"ui-text " + "record-dialog-note"}
              style={{
                fontSize: 13,
                color: "var(--muted)",
              }}
            >
              以下图片未能进行完整的画面比较；相同链接或已读取的文件内容仍会参与比较。修正地址或启用远程读取后可重新扫描。
            </p>
          )}
          {issues.data?.data.length ? (
            issues.data.data.map((item) => (
              <article key={item.image_id} className="photo-record-row">
                <span className="photo-record-icon" aria-hidden="true">
                  <ImageOff size={18} />
                </span>
                <div className="photo-record-copy">
                  <p
                    className="ui-text"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {item.post_title}
                  </p>
                  <p
                    className="ui-text"
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      marginTop: 5,
                    }}
                  >
                    照片 #{item.image_id}
                  </p>
                  <p
                    className={"ui-text " + "photo-record-detail"}
                    style={{
                      fontSize: 13,
                      color: "var(--muted)",
                      marginTop: 10,
                    }}
                  >
                    {item.reason}
                  </p>
                </div>
                <div className="photo-record-action">
                  <Button
                    href={adminHref(`/posts/${item.post_id}`)}
                    size="small"
                    variant="secondary"
                  >
                    查看帖子
                    {<ArrowUpRight size={14} />}
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <RecordEmpty
              icon={CheckCircle2}
              title="没有需要说明的图片"
              description="如有照片未能完整比较，会列在这里。"
            />
          )}
        </div>
      )}
    </RecordDialog>
  );
}
