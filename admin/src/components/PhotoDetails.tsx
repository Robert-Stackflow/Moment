import { Toggle as Switch } from "./Toggle";
import { useState } from "react";
import { usePendingChanges } from "./PendingChanges";
import {
  Button,
  Group,
  Image,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { Check } from "lucide-react";
import { DateTimePicker } from "./DateTimePicker";
import { datetime, thumbnail } from "../types";
import type { Photo, Settings } from "../types";

export function PhotoDetails({
  photo,
  settings,
  onApply,
  onCancel,
}: {
  photo: Photo;
  settings: Settings;
  onApply: (photo: Photo) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(photo);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(photo);
  usePendingChanges(dirty);
  function field<K extends keyof Photo>(key: K, value: Photo[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  return (
    <Stack gap="lg" className="photo-details">
      <Image
        src={thumbnail(photo.image_url, settings)}
        alt={photo.title || "图片预览"}
        className="photo-detail-preview"
        radius="md"
      />
      <Text size="xs" c="dimmed">
        单张图片的文字、地点和时间留空时，沿用帖子信息。
      </Text>
      <TextInput
        label="图片标题"
        maxLength={50}
        value={draft.title || ""}
        onChange={(e) => field("title", e.currentTarget.value)}
      />
      <Textarea
        label="图片描述"
        minRows={2}
        autosize
        value={draft.desc || ""}
        onChange={(e) => field("desc", e.currentTarget.value)}
      />
      <TextInput
        label="图片地点"
        value={draft.location || ""}
        onChange={(e) => field("location", e.currentTarget.value)}
      />
      <DateTimePicker
        label="图片拍摄时间"
        value={datetime(draft.time)}
        onChange={(value) => field("time", value || null)}
        placeholder="沿用帖子时间"
      />
      <Textarea
        label="拍摄参数"
        autosize
        minRows={2}
        value={draft.metadata || ""}
        onChange={(e) => field("metadata", e.currentTarget.value)}
      />
      <TextInput
        label="图片地址"
        required
        value={draft.image_url}
        error={error}
        onChange={(e) => field("image_url", e.currentTarget.value)}
      />
      <Switch
        label="在相册中隐藏这张图片"
        checked={draft.is_hidden}
        onChange={(e) => field("is_hidden", e.currentTarget.checked)}
      />
      <div className="photo-detail-actions">
        <Text size="xs" c="dimmed">
          应用后，随帖子一起保存
        </Text>
        <Group gap={8}>
          <Button variant="default" onClick={onCancel}>
            取消
          </Button>
          <Button
            leftSection={<Check size={15} />}
            onClick={() => {
              if (!/^(https?:\/\/|\/uploads\/)/i.test(draft.image_url.trim())) {
                setError("请输入有效的图片地址");
                return;
              }
              onApply({ ...draft, image_url: draft.image_url.trim() });
            }}
          >
            应用修改
          </Button>
        </Group>
      </div>
    </Stack>
  );
}
