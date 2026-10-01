import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue, useInterval } from "@mantine/hooks";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Menu,
  Modal,
  Pagination,
  Paper,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { Link } from "react-router-dom";
import {
  Copy,
  ExternalLink,
  Link2,
  LockKeyhole,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldOff,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { api, json, notifyError, notifySuccess } from "../api";
import { Empty, ErrorState, Loading, PageTitle } from "../components/Common";

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
        <Button
          component={Link}
          to="/shares/new"
          leftSection={<Plus size={17} />}
        >
          新建相册
        </Button>
      </PageTitle>
      <TextInput
        mb="xl"
        maw={440}
        aria-label="搜索分享相册"
        placeholder="搜索相册名称"
        leftSection={<Search size={17} />}
        value={search}
        onChange={(e) => {
          setSearch(e.currentTarget.value);
          setPage(1);
        }}
      />
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
                <Paper withBorder p="xl" key={share.id} className="share-card">
                  <Group justify="space-between">
                    <span className="share-card-icon">
                      <Link2 size={21} />
                    </span>
                    <Badge
                      color={
                        share.revoked ? "gray" : expired ? "orange" : "green"
                      }
                      variant="light"
                    >
                      {share.revoked ? "已撤销" : expired ? "已到期" : "分享中"}
                    </Badge>
                  </Group>
                  <Link to={`/shares/${share.id}`} className="share-card-title">
                    {share.title}
                  </Link>
                  <Text size="sm" c="dimmed" lineClamp={2} mih={42}>
                    {share.description || `${share.post_count} 篇帖子`}
                  </Text>
                  <Stack gap={7} my="lg">
                    <Group gap={7}>
                      <LockKeyhole size={14} />
                      <Text size="xs">
                        {share.password_required ? "需要密码" : "持链接可访问"}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {share.expires_at
                        ? `${shareDate(share.expires_at)} 到期`
                        : "长期有效"}
                    </Text>
                  </Stack>
                  <Group justify="space-between" className="share-card-actions">
                    <Button
                      variant="light"
                      size="xs"
                      leftSection={<Copy size={14} />}
                      disabled={!active}
                      onClick={() => void copy(share)}
                    >
                      复制链接
                    </Button>
                    <Group gap={4}>
                      <ActionIcon
                        component={Link}
                        to={`/shares/${share.id}`}
                        variant="subtle"
                        aria-label={`编辑 ${share.title}`}
                      >
                        <Pencil size={17} />
                      </ActionIcon>
                      {active && (
                        <ActionIcon
                          component="a"
                          href={`/share/${share.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="subtle"
                          aria-label={`打开 ${share.title}`}
                        >
                          <ExternalLink size={17} />
                        </ActionIcon>
                      )}
                      <Menu position="bottom-end">
                        <Menu.Target>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            aria-label={`更多操作 ${share.title}`}
                          >
                            <MoreHorizontal size={19} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<ShieldOff size={15} />}
                            onClick={() =>
                              setAction({
                                share,
                                kind: share.revoked ? "resume" : "revoke",
                              })
                            }
                          >
                            {share.revoked ? "恢复分享" : "撤销分享"}
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<RefreshCw size={15} />}
                            onClick={() => setAction({ share, kind: "rotate" })}
                          >
                            更换链接
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            color="red"
                            leftSection={<Trash2 size={15} />}
                            onClick={() => setAction({ share, kind: "delete" })}
                          >
                            删除相册
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Group>
                </Paper>
              );
            })}
          </div>
          {(list.data.total || 0) > 12 && (
            <Pagination
              mt="xl"
              value={page}
              onChange={setPage}
              total={Math.ceil((list.data.total || 0) / 12)}
            />
          )}
        </>
      )}
      <Modal
        opened={!!action}
        onClose={() => !busy && setAction(null)}
        title={action ? `${labels[action.kind]}？` : ""}
        centered
      >
        <Text size="sm">
          {action?.kind === "delete"
            ? "仅删除分享相册和访问授权，原帖子与照片保留。"
            : action?.kind === "rotate"
            ? "旧链接将立即失效，已解锁的访客需要使用新链接重新访问。"
            : action?.kind === "revoke"
            ? "链接和图片入口立即停止接受新请求。已经下载的照片无法收回。"
            : "重新启用当前链接。有密码的访客需要重新解锁。"}
        </Text>
        <Group justify="flex-end" mt="xl">
          <Button
            variant="default"
            disabled={busy}
            onClick={() => setAction(null)}
          >
            取消
          </Button>
          <Button
            color={
              action?.kind === "delete" || action?.kind === "revoke"
                ? "red"
                : undefined
            }
            loading={busy}
            onClick={() => void confirm()}
          >
            {action ? labels[action.kind] : "确认"}
          </Button>
        </Group>
      </Modal>
      <Modal
        opened={!!copyLink}
        onClose={() => setCopyLink("")}
        title="复制分享链接"
        centered
      >
        <TextInput
          readOnly
          value={copyLink}
          aria-label="分享链接"
          onFocus={(e) => e.currentTarget.select()}
          data-autofocus
        />
      </Modal>
    </>
  );
}
