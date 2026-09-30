import { lazy, Suspense, useState } from "react";
import {
  Button,
  Collapse,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { ChevronDown, MapPin } from "lucide-react";
import type { Discovery } from "../types";
const MapPicker = lazy(() => import("./MapPicker"));
const dropdown = {
  floatingStrategy: "fixed" as const,
  transitionProps: { transition: "fade-down" as const, duration: 160 },
};
export const defaultDiscovery = (image: boolean): Discovery => ({
  latitude: null,
  longitude: null,
  precision: image ? "inherit" : "private",
  timeline: image ? "inherit" : "show",
});

export function DiscoveryEditor({
  value,
  onChange,
  image = false,
}: {
  value?: Discovery;
  onChange: (value: Discovery) => void;
  image?: boolean;
}) {
  const data = value || defaultDiscovery(image);
  const [open, setOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  function field<K extends keyof Discovery>(key: K, next: Discovery[K]) {
    onChange({ ...data, [key]: next });
  }
  const inherit = image ? [{ value: "inherit", label: "沿用帖子" }] : [];
  return (
    <div className="discovery-editor">
      <button
        type="button"
        className="discovery-heading"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <MapPin size={16} />
        <span>地图与时间线</span>
        <ChevronDown
          size={16}
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>
      <Collapse in={open}>
        <Stack gap="md" pt="md">
          <Select
            label="地图位置"
            comboboxProps={dropdown}
            value={data.precision}
            onChange={(v) => field("precision", v as Discovery["precision"])}
            data={[
              ...inherit,
              { value: "private", label: "不公开" },
              { value: "approximate", label: "模糊位置" },
              { value: "exact", label: "精确位置" },
            ]}
            allowDeselect={false}
          />
          {data.precision !== "inherit" && (
            <>
              <Group grow align="start" gap="xs">
                <NumberInput
                  label="纬度"
                  value={data.latitude ?? ""}
                  min={-90}
                  max={90}
                  decimalScale={6}
                  hideControls
                  onChange={(v) =>
                    field("latitude", typeof v === "number" ? v : null)
                  }
                  placeholder="−90 至 90"
                />
                <NumberInput
                  label="经度"
                  value={data.longitude ?? ""}
                  min={-180}
                  max={180}
                  decimalScale={6}
                  hideControls
                  onChange={(v) =>
                    field("longitude", typeof v === "number" ? v : null)
                  }
                  placeholder="−180 至 180"
                />
              </Group>
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<MapPin size={14} />}
                  onClick={() => setMapOpen(true)}
                >
                  在地图上选点
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  disabled={data.latitude === null && data.longitude === null}
                  onClick={() =>
                    onChange({ ...data, latitude: null, longitude: null })
                  }
                >
                  清空坐标
                </Button>
              </Group>
              <Text size="xs" c="dimmed">
                {data.precision === "private"
                  ? "坐标仅保存在后台，不会出现在公开地图。"
                  : data.precision === "approximate"
                  ? "公开坐标四舍五入至 0.1°，纬度约 11 公里一格，不代表精确拍摄点。"
                  : "访客能够查看精确坐标。"}{" "}
                使用 WGS84 坐标；文字地点与原始照片中的 EXIF 不会被此设置删除。
              </Text>
            </>
          )}
          <Select
            label="时间线"
            comboboxProps={dropdown}
            value={data.timeline}
            onChange={(v) => field("timeline", v as Discovery["timeline"])}
            data={[
              ...inherit,
              { value: "show", label: "在时间线中显示" },
              { value: "hide", label: "从时间线排除" },
            ]}
            allowDeselect={false}
          />
          <Text size="xs" c="dimmed">
            仅影响浏览入口；照片墙与大图仍按原有设置显示拍摄时间。没有时间的照片归入「日期未记录」。
          </Text>
        </Stack>
      </Collapse>
      <Modal
        opened={mapOpen}
        onClose={() => setMapOpen(false)}
        title="选择拍摄位置"
        size="xl"
      >
        <Suspense fallback={<Text size="sm">正在打开地图…</Text>}>
          <MapPicker
            latitude={data.latitude}
            longitude={data.longitude}
            onApply={(latitude, longitude) => {
              onChange({ ...data, latitude, longitude });
              setMapOpen(false);
            }}
          />
        </Suspense>
      </Modal>
    </div>
  );
}
