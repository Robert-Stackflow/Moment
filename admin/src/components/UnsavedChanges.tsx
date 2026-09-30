import { usePendingChanges } from "./PendingChanges";
import { useBlocker } from "react-router-dom";
import { Button, Group, Modal, Text } from "@mantine/core";

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
    <Modal
      opened={blocker.state === "blocked"}
      onClose={() => blocker.state === "blocked" && blocker.reset()}
      title="离开当前页面？"
      centered
    >
      <Text size="sm">
        {message ||
          (uploading
            ? "照片正在上传，离开会取消上传。"
            : "当前修改尚未保存，离开后将丢失这些修改。")}
      </Text>
      <Group justify="flex-end" mt="xl">
        <Button
          variant="default"
          onClick={() => blocker.state === "blocked" && blocker.reset()}
        >
          继续编辑
        </Button>
        <Button
          color="red"
          onClick={() => blocker.state === "blocked" && blocker.proceed()}
        >
          离开页面
        </Button>
      </Group>
    </Modal>
  );
}
