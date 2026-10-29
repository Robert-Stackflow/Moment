import {
  Badge,
  Button,
  Card,
  Dialog,
  Input,
  Menu,
  Pagination,
} from "@robert-stackflow/oneui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  ExternalLink,
  Link2,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api, json, notifyError, notifySuccess } from "../api";
import { Empty, ErrorState, Loading, PageTitle } from "../components/Common";
import { useDebouncedValue, useInterval } from "../hooks";
import { adminHref, badgeTone } from "../ui-data";
export interface Share {
  id: number;
  token: string;
  title: string;
  description: string;
  password_required: boolean;
  expires_at: number | null;
  revoked: boolean;
  revision: number;
  post_count: number;
}
export function shareDate(value: number) {
  return new Date(value * 1000).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
  });
}
export default function Shares() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [q] = useDebouncedValue(search, 250);
  const [page, setPage] = useState(1);
  const [clock, setClock] = useState(Date.now());
  useInterval(() => setClock(Date.now()), 10000, { autoInvoke: true });
  const [action, setAction] = useState<{
    share: Share;
    kind: "revoke" | "resume" | "rotate" | "delete";
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copyLink, setCopyLink] = useState("");
  const list = useQuery({
    queryKey: ["shares", q, page],
    queryFn: () =>
      api<Share[]>(
        `/shares?${new URLSearchParams({
          q,
          page: String(page),
          page_size: "12",
        })}`,
      ),
    staleTime: 0,
  });
  async function copy(share: Share) {
    const url = `${location.origin}/share/${share.token}`;
    try {
      await navigator.clipboard.writeText(url);
      notifySuccess("分享链接已复制");
    } catch {
      setCopyLink(url);
    }
  }
  async function confirm() {
    if (!action || busy) return;
    setBusy(true);
    try {
      await api(
        `/shares/${action.share.id}/action`,
        json("POST", { action: action.kind, revision: action.share.revision }),
      );
      setAction(null);
      await client.invalidateQueries({ queryKey: ["shares"] });
      notifySuccess();
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy(false);
    }
  }
  const labels = {
    revoke: "撤销分享",
    resume: "恢复分享",
    rotate: "更换链接",
    delete: "删除相册",
  };
  return (
    <>
      <PageTitle title="分享相册">
        <Button href={adminHref("/shares/new")} variant="primary">
          {<Plus size={17} />}
          新建相册
        </Button>
      </PageTitle>
      <div
        style={{
          marginBottom: 32,
          maxWidth: 440,
        }}
      >
        <Input
          aria-label="搜索分享相册"
          placeholder="搜索相册名称"
          leading={<Search size={17} />}
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            setPage(1);
          }}
        />
      </div>
      {list.isLoading ? (
        <Loading />
      ) : list.isError ? (
        <ErrorState error={list.error} retry={list.refetch} />
      ) : !list.data?.data.length ? (
        <Empty
          title="还没有分享相册"
          description={q ? "没有找到匹配的相册。" : undefined}
        />
      ) : (
        <>
          <div className="share-grid">
            {list.data.data.map((share) => {
              const expired =
                share.expires_at !== null && share.expires_at * 1000 <= clock;
              const active = !share.revoked && !expired;
              return (
                <Card key={share.id} className={"moment-panel " + "share-card"}>
                  <div
                    className="ui-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 10,
                      justifyContent: "space-between",
                    }}
                  >
                    <span className="share-card-icon">
                      <Link2 size={21} />
                    </span>
                    <Badge
                      tone={badgeTone(
                        share.revoked ? "gray" : expired ? "orange" : "green",
                      )}
                    >
                      {share.revoked ? "已撤销" : expired ? "已到期" : "分享中"}
                    </Badge>
                  </div>
                  <Link to={`/shares/${share.id}`} className="share-card-title">
                    {share.title}
                  </Link>
                  <p
                    className="ui-text"
                    style={{
                      fontSize: 13,
                      color: "var(--muted)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      minHeight: 42,
                    }}
                  >
                    {share.description || `${share.post_count} 篇帖子`}
                  </p>
                  <div
                    className="ui-stack"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 7,
                      marginTop: 24,
                      marginBottom: 24,
                    }}
                  >
                    <div
                      className="ui-row"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 7,
                      }}
                    >
                      <LockKeyhole size={14} />
                      <p
                        className="ui-text"
                        style={{
                          fontSize: 12,
                        }}
                      >
                        {share.password_required ? "需要密码" : "持链接可访问"}
                      </p>
                    </div>
                    <p
                      className="ui-text"
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      {share.expires_at
                        ? `${shareDate(share.expires_at)} 到期`
                        : "长期有效"}
                    </p>
                  </div>
                  <div
                    className={"ui-row " + "share-card-actions"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 10,
                      justifyContent: "space-between",
                    }}
                  >
                    <Button
                      size="small"
                      disabled={!active}
                      onClick={() => void copy(share)}
                      variant="secondary"
                    >
                      {<Copy size={14} />}
                      复制链接
                    </Button>
                    <div
                      className="ui-row"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 4,
                      }}
                    >
                      <Button
                        href={adminHref(`/shares/${share.id}`)}
                        aria-label={`编辑 ${share.title}`}
                        variant="ghost"
                      >
                        <Pencil size={17} />
                      </Button>
                      {active && (
                        <Button
                          href={`/share/${share.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`打开 ${share.title}`}
                          variant="ghost"
                        >
                          <ExternalLink size={17} />
                        </Button>
                      )}
                      <Menu
                        label={"\u5206\u4EAB\u64CD\u4F5C"}
                        items={[
                          {
                            label: share.revoked ? "恢复分享" : "停用分享",
                            icon: <ShieldOff size={15} />,
                            action: () =>
                              setAction({
                                share,
                                kind: share.revoked ? "resume" : "revoke",
                              }),
                          },
                          {
                            label: "\u66F4\u6362\u94FE\u63A5",
                            icon: <RefreshCw size={15} />,
                            action: () => setAction({ share, kind: "rotate" }),
                          },
                          {
                            label: "\u5220\u9664\u76F8\u518C",
                            icon: <Trash2 size={15} />,
                            action: () => setAction({ share, kind: "delete" }),
                            danger: true,
                          },
                        ]}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          {(list.data.total || 0) > 12 && (
            <div
              style={{
                marginTop: 32,
              }}
            >
              <Pagination
                page={page}
                onPageChange={setPage}
                total={Math.ceil((list.data.total || 0) / 12)}
                pageSize={1}
                summary={null}
              />
            </div>
          )}
        </>
      )}
      <Dialog
        open={!!action}
        onClose={() => !busy && setAction(null)}
        title={action ? `${labels[action.kind]}？` : ""}
      >
        <p
          className="ui-text"
          style={{
            fontSize: 13,
          }}
        >
          {action?.kind === "delete"
            ? "仅删除分享相册和访问授权，原帖子与照片保留。"
            : action?.kind === "rotate"
              ? "旧链接将立即失效，已解锁的访客需要使用新链接重新访问。"
              : action?.kind === "revoke"
                ? "链接和图片入口立即停止接受新请求。已经下载的照片无法收回。"
                : "重新启用当前链接。有密码的访客需要重新解锁。"}
        </p>
        <div
          className="ui-row"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 32,
          }}
        >
          <Button
            disabled={busy}
            onClick={() => setAction(null)}
            variant="secondary"
          >
            取消
          </Button>
          <Button
            loading={busy}
            onClick={() => void confirm()}
            variant="primary"
          >
            {action ? labels[action.kind] : "确认"}
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={!!copyLink}
        onClose={() => setCopyLink("")}
        title="复制分享链接"
      >
        <Input
          readOnly
          value={copyLink}
          aria-label="分享链接"
          onFocus={(e) => e.currentTarget.select()}
          data-autofocus
        />
      </Dialog>
    </>
  );
}
