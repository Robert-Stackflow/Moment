import {
  Button,
  Dialog,
  FormField,
  Input,
  Select,
} from "@robert-stackflow/oneui";
import { ChevronDown, MapPin } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import type { Discovery } from "../types";
import { selectOptions } from "../ui-data";
const MapPicker = lazy(() => import("./MapPicker"));
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
      <Button
        variant="ghost"
        className="discovery-heading"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <MapPin size={16} />
        <span>地图与时间线</span>
        <ChevronDown
          size={16}
          style={{
            ...{ transform: open ? "rotate(180deg)" : undefined },
          }}
        />
      </Button>
      <div hidden={!open}>
        <div
          className="ui-stack"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            paddingTop: 16,
          }}
        >
          <FormField label={"地图位置"}>
            <Select
              label="地图位置"
              onChange={(v) => field("precision", v as Discovery["precision"])}
              options={selectOptions([
                ...inherit,
                { value: "private", label: "不公开" },
                { value: "approximate", label: "模糊位置" },
                { value: "exact", label: "精确位置" },
              ])}
              value={data.precision ?? ""}
            />
          </FormField>
          {data.precision !== "inherit" && (
            <>
              <div
                className="ui-row"
                style={{
                  display: "flex",
                  alignItems: "start",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <FormField label={"纬度"}>
                  <Input
                    label="纬度"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={-90}
                    max={90}
                    onChange={(event) =>
                      field(
                        "latitude",
                        event.currentTarget.value === ""
                          ? null
                          : Number(event.currentTarget.value),
                      )
                    }
                    value={data.latitude ?? ""}
                  />
                </FormField>
                <FormField label={"经度"}>
                  <Input
                    label="经度"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={-180}
                    max={180}
                    onChange={(event) =>
                      field(
                        "longitude",
                        event.currentTarget.value === ""
                          ? null
                          : Number(event.currentTarget.value),
                      )
                    }
                    value={data.longitude ?? ""}
                  />
                </FormField>
              </div>
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
                  onClick={() => setMapOpen(true)}
                  variant="secondary"
                >
                  {<MapPin size={14} />}
                  在地图上选点
                </Button>
                <Button
                  size="small"
                  disabled={data.latitude === null && data.longitude === null}
                  onClick={() =>
                    onChange({ ...data, latitude: null, longitude: null })
                  }
                  variant="ghost"
                >
                  清空坐标
                </Button>
              </div>
              <p
                className="ui-text"
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                }}
              >
                {data.precision === "private"
                  ? "坐标仅保存在后台，不会出现在公开地图。"
                  : data.precision === "approximate"
                    ? "公开坐标四舍五入至 0.1°，纬度约 11 公里一格，不代表精确拍摄点。"
                    : "访客能够查看精确坐标。"}{" "}
                使用 WGS84 坐标；文字地点与原始照片中的 EXIF 不会被此设置删除。
              </p>
            </>
          )}
          <FormField label={"时间线"}>
            <Select
              label="时间线"
              onChange={(v) => field("timeline", v as Discovery["timeline"])}
              options={selectOptions([
                ...inherit,
                { value: "show", label: "在时间线中显示" },
                { value: "hide", label: "从时间线排除" },
              ])}
              value={data.timeline ?? ""}
            />
          </FormField>
          <p
            className="ui-text"
            style={{
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            仅影响浏览入口；照片墙与大图仍按原有设置显示拍摄时间。没有时间的照片归入「日期未记录」。
          </p>
        </div>
      </div>
      <Dialog
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        title="选择拍摄位置"
        size="large"
      >
        <Suspense
          fallback={
            <p
              className="ui-text"
              style={{
                fontSize: 13,
              }}
            >
              正在打开地图…
            </p>
          }
        >
          <MapPicker
            latitude={data.latitude}
            longitude={data.longitude}
            onApply={(latitude, longitude) => {
              onChange({ ...data, latitude, longitude });
              setMapOpen(false);
            }}
          />
        </Suspense>
      </Dialog>
    </div>
  );
}
