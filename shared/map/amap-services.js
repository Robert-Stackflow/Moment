import { loadAMap } from "./amap-sdk.js";
import { toAMap, fromAMap } from "./coordinates.js";
let configuration;
export async function getMapConfig() {
  if (configuration) return configuration;
  const response = await fetch("/api/v1/visitor/maps/config");
  if (!response.ok) throw new Error("地图配置暂时无法加载");
  configuration = (await response.json()).data;
  return configuration;
}
async function sdk(plugin) {
  const config = await getMapConfig();
  if (config.provider !== "amap") return null;
  const AMap = await loadAMap(config);
  if (plugin)
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("地点服务暂时无法加载")),
        12000,
      );
      AMap.plugin(plugin, () => {
        clearTimeout(timer);
        resolve();
      });
    });
  return AMap;
}
function request(run) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("地点查询超时，请重试")),
      12000,
    );
    run((status, result) => {
      clearTimeout(timer);
      if (status === "complete") resolve(result);
      else if (status === "no_data") resolve(null);
      else
        reject(
          new Error(
            `地点查询暂时不可用：${String(status).slice(0, 30)} ${String(
              typeof result === "string" ? result : result?.info || "",
            )
              .replace(/[^a-zA-Z0-9_]/g, "")
              .slice(0, 70)}`,
          ),
        );
    });
  });
}
function position(location) {
  if (!location) return null;
  const pair =
    typeof location === "string"
      ? location.split(",")
      : Array.isArray(location)
        ? location
        : null;
  const lng = Number(pair ? pair[0] : (location.lng ?? location.getLng?.())),
    lat = Number(pair ? pair[1] : (location.lat ?? location.getLat?.()));
  return Number.isFinite(lng) && Number.isFinite(lat)
    ? fromAMap([lng, lat])
    : null;
}
function place(id, label, description, coordinates) {
  return {
    id,
    label,
    description: typeof description === "string" ? description : "",
    longitude: +coordinates[0].toFixed(6),
    latitude: +coordinates[1].toFixed(6),
  };
}
export async function nearbyPlaces(latitude, longitude) {
  const AMap = await sdk("AMap.Geocoder");
  if (!AMap) return [];
  const result = await request((cb) =>
    new AMap.Geocoder({ radius: 1000, extensions: "all" }).getAddress(
      toAMap([longitude, latitude]),
      cb,
    ),
  );
  const address = result?.regeocode;
  if (!address) return [];
  const choices = [];
  if (address.formattedAddress)
    choices.push(
      place("address", address.formattedAddress, "所选位置", [
        longitude,
        latitude,
      ]),
    );
  for (const item of [
    ...(address.pois || []).slice(0, 5),
    ...(address.roads || []).slice(0, 2),
  ]) {
    const coordinates = position(item.location);
    if (item.name && coordinates)
      choices.push(
        place(
          item.id || `road-${item.name}`,
          item.name,
          item.address,
          coordinates,
        ),
      );
  }
  return choices
    .filter(
      (item, index, all) =>
        all.findIndex((other) => other.label === item.label) === index,
    )
    .slice(0, 8);
}
export async function searchPlaces(query, signal) {
  if (!query.trim()) return [];
  const AMap = await sdk("AMap.AutoComplete");
  if (!AMap || signal?.aborted) return [];
  const result = await request((cb) =>
    new AMap.AutoComplete({ datatype: "poi" }).search(query.trim(), cb),
  );
  if (signal?.aborted) return [];
  return (result?.tips || [])
    .flatMap((item) => {
      const coordinates = position(item.location);
      return item.name && coordinates
        ? [
            place(
              item.id || item.name,
              item.name,
              `${item.district || ""}${typeof item.address === "string" ? item.address : ""}`,
              coordinates,
            ),
          ]
        : [];
    })
    .slice(0, 10);
}
export async function createPickerMap(host, config, initial, onPoint) {
  const AMap = await loadAMap(config);
  const map = new AMap.Map(host, {
    center: initial ? toAMap([initial[1], initial[0]]) : [105, 35],
    zoom: initial ? 14 : 4,
    zooms: [2, 18],
    mapStyle: config.style,
    features: ["bg", "road", "point"],
    viewMode: "2D",
    rotateEnable: false,
    pitchEnable: false,
    animateEnable: !matchMedia("(prefers-reduced-motion: reduce)").matches,
  });
  const marker = new AMap.Marker({ anchor: "bottom-center" });
  function show(latitude, longitude, center = false) {
    const point = toAMap([longitude, latitude]);
    marker.setPosition(point);
    marker.setMap(map);
    if (center) map.setCenter(point);
  }
  if (initial) show(...initial);
  map.on("click", (event) => {
    const [longitude, latitude] = fromAMap([
      event.lnglat.lng,
      event.lnglat.lat,
    ]);
    show(latitude, longitude);
    onPoint(+latitude.toFixed(6), +longitude.toFixed(6));
  });
  const resize = new ResizeObserver(() => map.resize());
  resize.observe(host);
  return {
    show,
    zoomIn: () => map.zoomIn(),
    zoomOut: () => map.zoomOut(),
    destroy: () => {
      resize.disconnect();
      map.destroy();
    },
  };
}
