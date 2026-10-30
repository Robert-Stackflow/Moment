import { Button, Dialog, LoadingState, Select } from "@robert-stackflow/oneui";
import { MapPin } from "lucide-react";
import { useId, useState } from "react";
import type { MapPlace } from "../../../shared/map/amap-services";
import { CoordinateField } from "./CoordinateField";
import { FieldInfo } from "./FieldInfo";
import type { Discovery } from "../types";
import { selectOptions } from "../ui-data";
import MapPicker from "./MapPicker";
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
  onPlace,
}: {
  value?: Discovery;
  onChange: (value: Discovery) => void;
  image?: boolean;
  onPlace?: (place: MapPlace, discovery: Discovery) => void;
}) {
  const data = value || defaultDiscovery(image),
    id = useId();
  const [mapOpen, setMapOpen] = useState(false);
  function field<K extends keyof Discovery>(key: K, next: Discovery[K]) {
    onChange({ ...data, [key]: next });
  }
  const inherit = image ? [{ value: "inherit", label: "沿用帖子" }] : [];
  const privacyInfo =
    data.precision === "inherit"
      ? "使用帖子的地图坐标与公开方式。"
      : `${data.precision === "private" ? "坐标仅保存在后台，不会出现在公开地图。" : data.precision === "approximate" ? "公开坐标四舍五入至 0.1°，纬度约 11 公里一格。" : "访客能够查看精确坐标。"}使用 WGS84 坐标；不会删除地点文字或照片 EXIF。`;
  return (
    <div className="discovery-editor">
      <div className="discovery-field">
        <div className="discovery-label">
          <label htmlFor={id + "-privacy"}>地图位置</label>
          <FieldInfo label="地图位置说明" content={privacyInfo} />
        </div>
        <Select
          id={id + "-privacy"}
          label="地图位置"
          value={data.precision}
          onChange={(value) =>
            field("precision", value as Discovery["precision"])
          }
          options={selectOptions([
            ...inherit,
            { value: "private", label: "不公开" },
            { value: "approximate", label: "模糊位置" },
            { value: "exact", label: "精确位置" },
          ])}
        />
      </div>
      {data.precision !== "inherit" && (
        <>
          <div className="discovery-coordinates">
            <CoordinateField
              label="纬度"
              limit={90}
              value={data.latitude}
              onChange={(value) => field("latitude", value)}
            />
            <CoordinateField
              label="经度"
              limit={180}
              value={data.longitude}
              onChange={(value) => field("longitude", value)}
            />
          </div>
          <div className="discovery-actions">
            <Button
              size="small"
              variant="secondary"
              onClick={() => setMapOpen(true)}
            >
              <MapPin size={14} />
              在地图上选点
            </Button>
            <Button
              size="small"
              variant="ghost"
              disabled={data.latitude === null && data.longitude === null}
              onClick={() =>
                onChange({ ...data, latitude: null, longitude: null })
              }
            >
              清空坐标
            </Button>
          </div>
        </>
      )}
      <div className="discovery-field">
        <div className="discovery-label">
          <label htmlFor={id + "-timeline"}>时间线</label>
          <FieldInfo
            label="时间线说明"
            content="仅控制时间线入口；照片墙与大图仍按原设置显示拍摄时间。没有时间的照片归入「日期未记录」。"
          />
        </div>
        <Select
          id={id + "-timeline"}
          label="时间线"
          value={data.timeline}
          onChange={(value) =>
            field("timeline", value as Discovery["timeline"])
          }
          options={selectOptions([
            ...inherit,
            { value: "show", label: "在时间线中显示" },
            { value: "hide", label: "从时间线排除" },
          ])}
        />
      </div>
      <MapPicker
        open={mapOpen}
        latitude={data.latitude}
        longitude={data.longitude}
        onClose={() => setMapOpen(false)}
        onApply={(latitude, longitude, place) => {
          const next = { ...data, latitude, longitude };
          if (place && onPlace) onPlace(place, next);
          else onChange(next);
          setMapOpen(false);
        }}
      />
    </div>
  );
}
