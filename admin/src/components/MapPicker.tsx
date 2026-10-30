import {
  Alert,
  Button,
  IconButton,
  LoadingState,
  Dialog,
  MenuItem,
} from "@robert-stackflow/oneui";
import { Crosshair, MapPin, Minus, Plus } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  createPickerMap,
  getMapConfig,
  nearbyPlaces,
  type MapPlace,
  type PickerMap,
} from "../../../shared/map/amap-services";
import { LocationField } from "./LocationField";
const LocalMapPicker = lazy(() => import("./LocalMapPicker"));
export default function MapPicker({
  open,
  latitude,
  longitude,
  onApply,
  onClose,
}: {
  open: boolean;
  latitude: number | null;
  longitude: number | null;
  onApply: (latitude: number, longitude: number, place?: MapPlace) => void;
  onClose(): void;
}) {
  const node = useRef<HTMLDivElement>(null),
    map = useRef<PickerMap | null>(null);
  const [point, setPoint] = useState<[number, number] | null>(null),
    [places, setPlaces] = useState<MapPlace[]>([]);
  const [choice, setChoice] = useState<MapPlace>(),
    [busy, setBusy] = useState(true),
    [lookup, setLookup] = useState(false);
  const [local, setLocal] = useState(false),
    [error, setError] = useState(""),
    [lookupError, setLookupError] = useState("");
  const [retry, setRetry] = useState(0);
  const [lookupRetry, setLookupRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    // Parent coordinates are sampled when a new picker session opens.
    const initial: [number, number] | null =
      latitude !== null && longitude !== null ? [latitude, longitude] : null;
    setPoint(initial);
    setChoice(undefined);
    setPlaces([]);
    setLookup(false);
    setLookupError("");
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
          initial,
          (lat, lng) => {
            setChoice(undefined);
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
  }, [open, retry]);
  useEffect(() => {
    if (!open || !point || busy || local) return;
    let disposed = false;
    setLookup(true);
    setLookupError("");
    const timer = setTimeout(() => {
      void nearbyPlaces(...point)
        .then((items) => {
          if (!disposed) {
            setPlaces(items);
            setChoice((current) => current || items[0]);
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
  }, [open, point, busy, local, lookupRetry]);
  const candidates =
    choice && !places.some((item) => item.id === choice.id)
      ? [choice, ...places]
      : places;
  const coordinates = point
    ? [choice?.latitude ?? point[0], choice?.longitude ?? point[1]]
    : null;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="选择拍摄位置"
      size="large"
      footer={
        !local && (
          <div className="map-picker-footer">
            <div className="map-picker-selection" aria-live="polite">
              {choice && <strong>{choice.label}</strong>}
              <span>
                {coordinates
                  ? `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`
                  : "点击地图或搜索地点"}
              </span>
            </div>
            <div className="map-picker-actions">
              <Button variant="secondary" onClick={onClose}>
                取消
              </Button>
              <Button
                variant="primary"
                disabled={!point || busy || !!error || (lookup && !choice)}
                onClick={() => {
                  if (coordinates)
                    onApply(coordinates[0], coordinates[1], choice);
                }}
              >
                使用此位置
              </Button>
            </div>
          </div>
        )
      }
    >
      {local ? (
        <Suspense fallback={<LoadingState />}>
          {open && (
            <LocalMapPicker
              latitude={latitude}
              longitude={longitude}
              onApply={onApply}
            />
          )}
        </Suspense>
      ) : (
        <div className="map-picker-content">
          <div className="map-picker-search">
            <LocationField
              label="搜索地点"
              placeholder="搜索地点或地址"
              value={choice?.label || ""}
              latitude={choice?.latitude ?? point?.[0]}
              longitude={choice?.longitude ?? point?.[1]}
              allowCustom={false}
              clearable={false}
              disabled={!open || busy || !!error}
              onPlace={(place) => {
                setChoice(place);
                setPlaces([]);
                setPoint([place.latitude, place.longitude]);
                map.current?.show(place.latitude, place.longitude, true, 14);
              }}
            />
          </div>
          {error && (
            <Alert
              tone="warning"
              action={
                <Button
                  size="small"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  重试
                </Button>
              }
            >
              {error}
            </Alert>
          )}
          <div className="map-picker-workspace">
            <div
              className="map-picker-frame"
              data-hide-attribution={
                import.meta.env.VITE_AMAP_HIDE_ATTRIBUTION === "true" ||
                undefined
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
                <div
                  className="map-picker-zoom"
                  role="group"
                  aria-label="地图操作"
                >
                  <IconButton
                    label="放大地图"
                    onClick={() => map.current?.zoomIn()}
                  >
                    <Plus />
                  </IconButton>
                  <IconButton
                    label="缩小地图"
                    onClick={() => map.current?.zoomOut()}
                  >
                    <Minus />
                  </IconButton>
                  {coordinates && (
                    <IconButton
                      label="定位到所选位置"
                      onClick={() =>
                        map.current?.show(coordinates[0], coordinates[1], true)
                      }
                    >
                      <Crosshair />
                    </IconButton>
                  )}
                </div>
              )}
            </div>
            <section className="map-picker-nearby" aria-label="附近地点">
              <h3>附近地点</h3>
              <div className="map-picker-place-list">
                {lookup && !candidates.length ? (
                  <LoadingState label="查找附近地点" />
                ) : (
                  candidates.map((item) => (
                    <MenuItem
                      key={item.id}
                      label={item.label}
                      description={item.description || undefined}
                      icon={<MapPin size={16} />}
                      selection="radio"
                      selected={choice?.id === item.id}
                      aria-pressed={choice?.id === item.id}
                      onClick={() => {
                        setChoice(item);
                        map.current?.show(item.latitude, item.longitude, true);
                      }}
                    />
                  ))
                )}
                {!busy && !lookup && !candidates.length && !lookupError && (
                  <p className="map-picker-empty">
                    {point
                      ? "附近暂无参考地点，可直接使用坐标"
                      : "选择位置后显示附近地点"}
                  </p>
                )}
                {lookupError && (
                  <Alert
                    tone="warning"
                    action={
                      <Button
                        size="small"
                        onClick={() => setLookupRetry((value) => value + 1)}
                      >
                        重试
                      </Button>
                    }
                  >
                    {lookupError}
                  </Alert>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </Dialog>
  );
}
