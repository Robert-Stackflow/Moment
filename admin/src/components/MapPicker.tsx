import { useEffect, useRef, useState } from "react";
import { Button, Group, Stack, Text } from "@mantine/core";
import L from "leaflet";
import type { GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";
import land from "../../../shared/map/land.json";

export default function MapPicker({
  latitude,
  longitude,
  onApply,
}: {
  latitude: number | null;
  longitude: number | null;
  onApply: (lat: number, lng: number) => void;
}) {
  const node = useRef<HTMLDivElement>(null);
  const [point, setPoint] = useState<[number, number] | null>(
    latitude !== null && longitude !== null ? [latitude, longitude] : null,
  );
  const [detailed, setDetailed] = useState(false);
  const [error, setError] = useState(false);
  const map = useRef<L.Map | null>(null);
  const initial = useRef(point);
  useEffect(() => {
    if (!node.current) return;
    const m = L.map(node.current, {
      minZoom: 1,
      maxZoom: 18,
      maxBounds: [
        [-85, -180],
        [85, 180],
      ],
      maxBoundsViscosity: 1,
      zoomControl: false,
    }).setView(initial.current || [25, 105], initial.current ? 6 : 2);
    map.current = m;
    L.control
      .zoom({ zoomInTitle: "放大地图", zoomOutTitle: "缩小地图" })
      .addTo(m);
    L.geoJSON(land as unknown as GeoJsonObject, {
      interactive: false,
      style: {
        color: "#667580",
        weight: 1,
        fillColor: "#60737b",
        fillOpacity: 0.24,
      },
    }).addTo(m);
    m.attributionControl.setPrefix(false);
    m.attributionControl.addAttribution(
      '<a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a>',
    );
    let marker: L.CircleMarker | undefined;
    function show(p: [number, number]) {
      marker?.remove();
      marker = L.circleMarker(p, {
        radius: 7,
        color: "#819afa",
        fillColor: "#536fe5",
        fillOpacity: 1,
        weight: 3,
      }).addTo(m);
    }
    if (initial.current) show(initial.current);
    m.on("click", (e) => {
      const p: [number, number] = [
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.wrap().lng.toFixed(6)),
      ];
      setPoint(p);
      show(p);
    });
    const resize = new ResizeObserver(() => m.invalidateSize());
    resize.observe(node.current);
    return () => {
      resize.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!detailed || !map.current) return;
    const tiles = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        noWrap: true,
        referrerPolicy: "strict-origin-when-cross-origin",
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
      },
    ).addTo(map.current);
    tiles.on("tileerror", () => setError(true));
    return () => {
      tiles.remove();
    };
  }, [detailed]);
  return (
    <Stack>
      <Text size="sm" c="dimmed">
        拖动、缩放后点击选点，也可以关闭地图直接填写经纬度。
      </Text>
      <div
        ref={node}
        className="location-map-picker"
        aria-label="拍摄位置地图"
      />
      {!detailed ? (
        <div className="map-network-choice">
          <Text size="xs" c="dimmed">
            加载详细地图会向 OpenStreetMap 发送当前地图区域和网络地址。
          </Text>
          <Button
            variant="light"
            size="xs"
            onClick={() => {
              setDetailed(true);
              setError(false);
            }}
          >
            加载详细地图
          </Button>
        </div>
      ) : (
        <Button variant="subtle" size="xs" onClick={() => setDetailed(false)}>
          仅使用本地轮廓
        </Button>
      )}
      {error && detailed && (
        <Text size="xs" c="orange">
          详细地图加载失败，仍可选点或切回本地轮廓。
        </Text>
      )}
      <Group justify="space-between">
        <Text size="sm">
          {point
            ? `${point[0].toFixed(6)}, ${point[1].toFixed(6)}`
            : "尚未选点"}
        </Text>
        <Button disabled={!point} onClick={() => point && onApply(...point)}>
          使用此位置
        </Button>
      </Group>
    </Stack>
  );
}
