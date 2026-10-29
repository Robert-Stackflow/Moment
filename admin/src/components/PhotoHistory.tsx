import { Alert, Badge, Button, Dialog } from "@robert-stackflow/oneui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, EyeOff, History, Tags, Undo2 } from "lucide-react";
import { useState } from "react";
import { api, json, notifySuccess } from "../api";
import { photoQueries } from "../lib/photo-actions";
import { badgeTone, tone } from "../ui-data";
import { ErrorState, Loading } from "./Common";
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
  changes: {
    id: number;
    post_id: number;
    post_title: string;
  }[];
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
          <div
            className="ui-stack"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
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
                    <p
                      className="ui-text"
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      {item.kind === "tags_add"
                        ? `为 ${item.changes.length} 张照片添加标签`
                        : `隐藏 ${item.changes.length} 张重复候选照片`}
                    </p>
                    <p
                      className="ui-text"
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        marginTop: 5,
                      }}
                    >
                      {item.created_at}
                    </p>
                    <p
                      className={"ui-text " + "photo-record-detail"}
                      style={{
                        fontSize: 13,
                        color: "var(--muted)",
                        marginTop: 10,
                      }}
                    >
                      {[
                        ...new Set(
                          item.changes.map((photo) => photo.post_title),
                        ),
                      ]
                        .slice(0, 3)
                        .join("、")}
                    </p>
                    {item.undone_at && (
                      <p
                        className="ui-text"
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          marginTop: 6,
                        }}
                      >
                        撤销于 {item.undone_at}
                      </p>
                    )}
                  </div>
                  <div className="photo-record-action">
                    {item.status === "undone" ? (
                      <Badge tone={badgeTone("gray")}>
                        {<Check size={12} />}
                        已撤销
                      </Badge>
                    ) : (
                      <Button
                        size="small"
                        disabled={busy}
                        onClick={() => {
                          setUndo(item);
                          setError("");
                        }}
                        variant="secondary"
                      >
                        {<Undo2 size={14} />}
                        撤销
                      </Button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <RecordEmpty icon={History} title="暂无处理记录" />
            )}
          </div>
        )}
      </RecordDialog>
      <Dialog
        open={!!undo}
        onClose={() => !busy && setUndo(null)}
        title={
          undo?.kind === "tags_add" ? "撤销这次标签整理？" : "撤销这次隐藏？"
        }
        footer={
          <>
            <Button
              disabled={busy}
              onClick={() => setUndo(null)}
              variant="secondary"
            >
              取消
            </Button>
            <Button
              loading={busy}
              onClick={() => void restore()}
              variant="primary"
            >
              确认撤销
            </Button>
          </>
        }
        busy={!!busy}
        variant="default"
      >
        <p
          className="ui-text"
          style={{
            fontSize: 13,
          }}
        >
          {undo?.kind === "tags_add"
            ? `本次处理的 ${undo.changes.length} 张照片将恢复整理前的标签。`
            : `本次处理的 ${undo?.changes.length} 张照片将恢复可见。`}
          如果帖子在整理之后已有修改，会保留最新内容并提示你到编辑页处理。
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
    </>
  );
}
