import { Button, Dialog } from "@robert-stackflow/oneui";
import { useBlocker } from "react-router-dom";
import { usePendingChanges } from "./PendingChanges";
export function UnsavedChanges({
  dirty,
  uploading = false,
  message,
}: {
  dirty: boolean;
  uploading?: boolean;
  message?: string;
}) {
  const blocker = useBlocker(dirty || uploading);
  usePendingChanges(dirty || uploading);
  return (
    <Dialog
      open={blocker.state === "blocked"}
      onClose={() => blocker.state === "blocked" && blocker.reset()}
      title="离开当前页面？"
    >
      <p
        className="ui-text"
        style={{
          fontSize: 13,
        }}
      >
        {message ||
          (uploading
            ? "照片正在上传，离开会取消上传。"
            : "当前修改尚未保存，离开后将丢失这些修改。")}
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
          data-autofocus
          onClick={() => blocker.state === "blocked" && blocker.reset()}
          variant="secondary"
        >
          继续编辑
        </Button>
        <Button
          onClick={() => blocker.state === "blocked" && blocker.proceed()}
          variant="danger"
        >
          离开页面
        </Button>
      </div>
    </Dialog>
  );
}
