import {
  Button,
  FormField,
  Input,
  TagInput,
  Textarea,
} from "@robert-stackflow/oneui";
import { Check } from "lucide-react";
import { useState } from "react";
import type { Discovery, Photo, Settings } from "../types";
import { datetime } from "../types";
import { DateTimePicker } from "./DateTimePicker";
import { defaultDiscovery, DiscoveryEditor } from "./DiscoveryEditor";
import { LocationField } from "./LocationField";
import { FocusPicker } from "./FocusPicker";
import { usePendingChanges } from "./PendingChanges";
import { Toggle as Switch } from "./Toggle";
export function PhotoDetails({
  photo,
  inheritedDiscovery,
  settings,
  onApply,
  onCancel,
}: {
  photo: Photo;
  inheritedDiscovery?: Discovery;
  settings: Settings;
  onApply: (photo: Photo) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(photo);
  const [error, setError] = useState("");
  const point = !draft.discovery || draft.discovery.precision === "inherit" ? inheritedDiscovery : draft.discovery;
  const tagError = draft.tags?.some(
    (tag) =>
      !tag.normalize("NFKC").trim() ||
      [...tag.normalize("NFKC").trim()].length > 32 ||
      /\p{Cc}/u.test(tag),
  )
    ? "每个标签须为 1–32 字，不含控制字符"
    : undefined;
  const dirty = JSON.stringify(draft) !== JSON.stringify(photo);
  usePendingChanges(dirty);
  function field<K extends keyof Photo>(key: K, value: Photo[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  return (
    <div
      className={"ui-stack " + "photo-details"}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <FocusPicker
        key={draft.image_url}
        src={draft.image_url}
        x={draft.focus_x}
        y={draft.focus_y}
        onChange={(focus_x, focus_y) =>
          setDraft((current) => ({ ...current, focus_x, focus_y }))
        }
      />
      <p
        className="ui-text"
        style={{
          fontSize: 12,
          color: "var(--muted)",
        }}
      >
        单张图片的文字、地点和时间留空时，沿用帖子信息。
      </p>
      <Input
        label="图片标题"
        maxLength={50}
        value={draft.title || ""}
        onChange={(e) => field("title", e.currentTarget.value)}
      />
      <Textarea
        label="图片描述"
        rows={2}
        value={draft.desc || ""}
        onChange={(e) => field("desc", e.currentTarget.value)}
      />
      <LocationField label="图片地点" latitude={point?.latitude} longitude={point?.longitude} value={draft.location || ""} onChange={value => field("location", value)}
        onPlace={place => setDraft(current => ({...current, location: place.label,
          discovery: {...(current.discovery || defaultDiscovery(true)), latitude: place.latitude, longitude: place.longitude,
            precision: current.discovery?.precision === "inherit" || !current.discovery ? "private" : current.discovery.precision}}))} />
      <DateTimePicker
        label="图片拍摄时间"
        value={datetime(draft.time)}
        onChange={(value) => field("time", value || null)}
        placeholder="沿用帖子时间"
      />
      <Textarea
        label="拍摄参数"
        rows={2}
        value={draft.metadata || ""}
        onChange={(e) => field("metadata", e.currentTarget.value)}
      />
      <DiscoveryEditor
        onPlace={(place, discovery) => setDraft(current => ({...current, location: place.label, discovery}))}
        image
        value={draft.discovery}
        onChange={(value) => field("discovery", value)}
      />
      <FormField label={"图片标签"}>
        <TagInput
          label="图片标签"
          placeholder="输入后按回车添加"
          value={draft.tags || []}
          maxTags={20}
          error={tagError}
          onChange={(values) => field("tags", values)}
          hint={"仅用于后台整理与搜索，最多 20 个，每个不超过 32 字"}
        />
      </FormField>
      <Input
        label="图片地址"
        required
        value={draft.image_url}
        error={error}
        onChange={(e) => field("image_url", e.currentTarget.value)}
      />
      <Switch
        label="在相册中隐藏这张图片"
        checked={draft.is_hidden}
        onChange={(e) => field("is_hidden", e)}
      />
      <div className="photo-detail-actions">
        <p
          className="ui-text"
          style={{
            fontSize: 12,
            color: "var(--muted)",
          }}
        >
          应用后，随帖子一起保存
        </p>
        <div
          className="ui-row"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <Button onClick={onCancel} variant="secondary">
            取消
          </Button>
          <Button
            onClick={() => {
              if (tagError) return;
              if (!/^(https?:\/\/|\/uploads\/)/i.test(draft.image_url.trim())) {
                setError("请输入有效的图片地址");
                return;
              }
              onApply({ ...draft, image_url: draft.image_url.trim() });
            }}
            variant="primary"
          >
            {<Check size={15} />}
            应用修改
          </Button>
        </div>
      </div>
    </div>
  );
}
