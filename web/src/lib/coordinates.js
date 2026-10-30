// The database and route URLs retain GPS/WGS84 coordinates. Only the AMap
// display adapter uses GCJ-02; inverse iteration avoids shifting saved locations.
const pi = Math.PI,
  a = 6378245,
  ee = 0.006693421622965943
export function toAMap([lng, lat]) {
  if (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) return [lng, lat]
  const x = lng - 105,
    y = lat - 35
  let dy = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  dy += ((20 * Math.sin(6 * x * pi) + 20 * Math.sin(2 * x * pi)) * 2) / 3
  dy += ((20 * Math.sin(y * pi) + 40 * Math.sin((y * pi) / 3)) * 2) / 3
  dy += ((160 * Math.sin((y * pi) / 12) + 320 * Math.sin((y * pi) / 30)) * 2) / 3
  let dx = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  dx += ((20 * Math.sin(6 * x * pi) + 20 * Math.sin(2 * x * pi)) * 2) / 3
  dx += ((20 * Math.sin(x * pi) + 40 * Math.sin((x * pi) / 3)) * 2) / 3
  dx += ((150 * Math.sin((x * pi) / 12) + 300 * Math.sin((x * pi) / 30)) * 2) / 3
  const rad = (lat * pi) / 180,
    magic = 1 - ee * Math.sin(rad) ** 2,
    root = Math.sqrt(magic)
  return [
    lng + (dx * 180) / ((a / root) * Math.cos(rad) * pi),
    lat + (dy * 180) / (((a * (1 - ee)) / (magic * root)) * pi),
  ]
}
export function fromAMap(position) {
  let result = [...position]
  for (let i = 0; i < 5; i++) {
    const converted = toAMap(result)
    result = result.map((v, axis) => v + position[axis] - converted[axis])
  }
  return result
}
