import {
  Alert,
  Button,
  IconButton,
  LoadingState,
  RadioGroup,
} from "@robert-stackflow/oneui";
import { Minus, Plus } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  createPickerMap,
  getMapConfig,
  nearbyPlaces,
  type MapPlace,
  type PickerMap,
} from "../../../shared/map/amap-services";
const LocalMapPicker = lazy(() => import("./LocalMapPicker"));
export default function MapPicker({
  latitude,
  longitude,
  onApply,
}: {
  latitude: number | null;
  longitude: number | null;
  onApply: (latitude: number, longitude: number, place?: MapPlace) => void;
}) {
  const node = useRef<HTMLDivElement>(null),
    map = useRef<PickerMap | null>(null);
  const initial = useRef<[number, number] | null>(
    latitude !== null && longitude !== null ? [latitude, longitude] : null,
  );
  const [point, setPoint] = useState(initial.current),
    [places, setPlaces] = useState<MapPlace[]>([]);
  const [selected, setSelected] = useState(""),
    [busy, setBusy] = useState(true),
    [lookup, setLookup] = useState(false);
  const [local, setLocal] = useState(false),
    [error, setError] = useState(""),
    [lookupError, setLookupError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let disposed = false,
      controller: PickerMap | undefined;
    setBusy(true);
    setError("");
    void getMapConfig()
      .then(async (config) => {
        if (disposed) return;
        if (config.provider !== "amap") {
          setLocal(true);
          setBusy(false);
          return;
        }
        controller = await createPickerMap(
          node.current!,
          config,
          initial.current,
          (lat, lng) => {
            setSelected("");
            setPlaces([]);
            setPoint([lat, lng]);
          },
        );
        if (disposed) controller.destroy();
        else {
          map.current = controller;
          setBusy(false);
        }
      })
      .catch(() => {
        if (!disposed) {
          setError("地图暂时无法加载");
          setBusy(false);
        }
      });
    return () => {
      disposed = true;
      controller?.destroy();
      map.current = null;
    };
  }, [retry]);
  useEffect(() => {
    if (!point || busy || local) return;
    let disposed = false;
    setLookup(true);
    setLookupError("");
    const timer = setTimeout(() => {
      void nearbyPlaces(...point)
        .then((items) => {
          if (!disposed) {
            setPlaces(items);
            setSelected(items[0]?.id || "");
          }
        })
        .catch(() => {
          if (!disposed)
            setLookupError("附近地点查询失败，仍可使用坐标或手动填写地点。");
        })
        .finally(() => {
          if (!disposed) setLookup(false);
        });
    }, 250);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [point, busy, local]);
  if (local)
    return (
      <Suspense fallback={<LoadingState />}>
        <LocalMapPicker
          latitude={latitude}
          longitude={longitude}
          onApply={onApply}
        />
      </Suspense>
    );
  const choice = places.find((item) => item.id === selected);
  return (
    <div className="map-picker-content">
      <div
        className="map-picker-frame"
        data-hide-attribution={
          import.meta.env.VITE_AMAP_HIDE_ATTRIBUTION === "true" || undefined
        }
      >
        <div
          ref={node}
          className="location-map-picker"
          aria-label="拍摄位置地图"
        />
        {busy && (
          <div className="map-picker-loading">
            <LoadingState label="加载地图" />
          </div>
        )}
        {!busy && !error && (
          <div className="map-picker-zoom" role="group" aria-label="地图缩放">
            <IconButton label="放大地图" onClick={() => map.current?.zoomIn()}>
              <Plus />
            </IconButton>
            <IconButton label="缩小地图" onClick={() => map.current?.zoomOut()}>
              <Minus />
            </IconButton>
          </div>
        )}
      </div>
      {error && (
        <Alert
          tone="warning"
          action={
            <Button size="small" onClick={() => setRetry((v) => v + 1)}>
              重试
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      {lookup ? (
        <LoadingState label="查找附近地点" />
      ) : (
        places.length > 0 && (
          <RadioGroup
            label="参考地点"
            orientation="vertical"
            value={selected}
            onChange={(id) => {
              setSelected(id);
              const item = places.find((place) => place.id === id);
              if (item) map.current?.show(item.latitude, item.longitude, true);
            }}
            options={places.map((item) => ({
              value: item.id,
              label: item.label,
            }))}
          />
        )
      )}
      {lookupError && <Alert tone="warning">{lookupError}</Alert>}
      <div className="map-picker-footer">
        <span>
          {point
            ? `${(choice?.latitude ?? point[0]).toFixed(6)}, ${(choice?.longitude ?? point[1]).toFixed(6)}`
            : "点击地图选择拍摄位置"}
        </span>
        <Button
          variant="primary"
          disabled={!point || busy || !!error || lookup}
          onClick={() => {
            if (point)
              onApply(
                choice?.latitude ?? point[0],
                choice?.longitude ?? point[1],
                choice,
              );
          }}
        >
          使用此位置
        </Button>
      </div>
    </div>
  );
}
