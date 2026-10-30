import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toAMap, fromAMap } from '../src/lib/coordinates.js'

test('GPS coordinates round trip through the map display coordinate system', () => {
  for (const point of [
    [116.397128, 39.916527],
    [120.1, 30.2],
    [121.4737, 31.2304],
    [114.0579, 22.5431],
  ]) {
    const display = toAMap(point)
    assert.ok(Math.abs(display[0] - point[0]) > 0.001)
    const result = fromAMap(display)
    assert.ok(result.every((value, index) => Math.abs(value - point[index]) < 0.0000001))
  }
  for (const point of [
    [-122.4194, 37.7749],
    [2.3522, 48.8566],
    [151.2093, -33.8688],
  ])
    assert.deepEqual(toAMap(point), point)
})
