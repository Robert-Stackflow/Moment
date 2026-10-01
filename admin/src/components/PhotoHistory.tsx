import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { Check, EyeOff, History, Tags, Undo2 } from "lucide-react";
import { api, json, notifySuccess } from "../api";
import { ErrorState, Loading } from "./Common";
import { photoQueries } from "../lib/photo-actions";
import { RecordDialog, RecordEmpty } from "./RecordDialog";
function errorText(error: unknown) {
  return error instanceof Error ? error.message : "操作未完成，请重试";
}
interface PhotoAction {
  id: string;
  kind: "duplicates_hide" | "tags_add";
  status: "applied" | "undone";
  created_at: string;
  undone_at: string | null;
  changes: { id: number; post_id: number; post_title: string }[];
}
export function PhotoHistory({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [undo, setUndo] = useState<PhotoAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const actions = useQuery({
    queryKey: ["photoActions", page],
    queryFn: () =>
      api<PhotoAction[]>(`/photo-actions?page=${page}&page_size=10`, {
        preserveEditorOnUnauthorized: true,
      }),
    staleTime: 0,
  });
  async function restore() {
    if (!undo || busy) return;
    setBusy(true);
    setError("");
    try {
      await api(`/photo-actions/${undo.id}/undo`, {
        ...json("POST", {}),
        preserveEditorOnUnauthorized: true,
      });
      setUndo(null);
      await Promise.all(
        photoQueries.map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
      notifySuccess("已撤销本次处理");
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <RecordDialog
        onClose={onClose}
        title="处理记录"
        icon={History}
        total={actions.data?.total}
        page={page}
        pageSize={10}
        onPageChange={setPage}
        busy={busy}
      >
        {actions.isPending ? (
          <Loading />
        ) : actions.error ? (
          <ErrorState error={actions.error} retry={() => actions.refetch()} />
        ) : (
          <Stack gap="sm">
            {actions.data?.data.length ? (
              actions.data.data.map((item) => (
                <article className="photo-record-row" key={item.id}>
                  <span className="photo-record-icon" aria-hidden="true">
                    {item.kind === "tags_add" ? (
                      <Tags size={18} />
                    ) : (
                      <EyeOff size={18} />
                    )}
                  </span>
                  <div className="photo-record-copy">
                    <Text fw={600} size="sm">
                      {item.kind === "tags_add"
                        ? `为 ${item.changes.length} 张照片添加标签`
                        : `隐藏 ${item.changes.length} 张重复候选照片`}
                    </Text>
                    <Text size="xs" c="dimmed" mt={5}>
                      {item.created_at}
                    </Text>
                    <Text
                      size="sm"
                      c="dimmed"
                      mt="sm"
                      className="photo-record-detail"
                    >
                      {[
                        ...new Set(
                          item.changes.map((photo) => photo.post_title),
                        ),
                      ]
                        .slice(0, 3)
                        .join("、")}
                    </Text>
                    {item.undone_at && (
                      <Text size="xs" c="dimmed" mt={6}>
                        撤销于 {item.undone_at}
                      </Text>
                    )}
                  </div>
                  <div className="photo-record-action">
                    {item.status === "undone" ? (
                      <Badge color="gray" leftSection={<Check size={12} />}>
                        已撤销
                      </Badge>
                    ) : (
                      <Button
                        size="xs"
                        variant="default"
                        disabled={busy}
                        leftSection={<Undo2 size={14} />}
                        onClick={() => {
                          setUndo(item);
                          setError("");
                        }}
                      >
                        撤销
                      </Button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <RecordEmpty icon={History} title="暂无处理记录" />
            )}
          </Stack>
        )}
      </RecordDialog>
      <Modal
        opened={!!undo}
        onClose={() => !busy && setUndo(null)}
        title={
          undo?.kind === "tags_add" ? "撤销这次标签整理？" : "撤销这次隐藏？"
        }
        centered
      >
        <Text size="sm">
          {undo?.kind === "tags_add"
            ? `本次处理的 ${undo.changes.length} 张照片将恢复整理前的标签。`
            : `本次处理的 ${undo?.changes.length} 张照片将恢复可见。`}
          如果帖子在整理之后已有修改，会保留最新内容并提示你到编辑页处理。
        </Text>
        {error && (
          <Alert color="red" role="alert" mt="md">
            {error}
          </Alert>
        )}
        <Group justify="flex-end" mt="lg">
          <Button
            variant="default"
            disabled={busy}
            onClick={() => setUndo(null)}
          >
            取消
          </Button>
          <Button loading={busy} onClick={() => void restore()}>
            确认撤销
          </Button>
        </Group>
      </Modal>
    </>
  );
}
