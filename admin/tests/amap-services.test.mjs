import assert from "node:assert/strict";
import { test } from "node:test";
import {
  nearbyPlaces,
  searchPlaces,
  locationSuggestions,
  createPickerMap,
} from "../../shared/map/amap-services.js";
import { toAMap } from "../../shared/map/coordinates.js";
let result,
  status = "complete",
  lastPoint;
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({ data: { provider: "amap" } }),
});
globalThis.window = {
  AMap: {
    Map: class {},
    plugin: (_name, ready) => ready(),
    Geocoder: class {
      getAddress(point, done) {
        lastPoint = point;
        done(status, result);
      }
    },
    AutoComplete: class {
      search(_query, done) {
        done(status, result);
      }
    },
  },
};
test("reverse geocoding keeps clicked address and converts nearby POIs/roads back to WGS84", async () => {
  const gps = [116.397, 39.908],
    gcj = toAMap(gps);
  result = {
    regeocode: {
      formattedAddress: "北京市东城区",
      pois: [
        {
          id: "poi",
          name: "天安门",
          address: "东长安街",
          location: { lng: gcj[0], lat: gcj[1] },
        },
      ],
      roads: [{ id: "road", name: "东长安街", location: gcj.join(",") }],
    },
  };
  const places = await nearbyPlaces(gps[1], gps[0]);
  assert.deepEqual(lastPoint, gcj);
  assert.equal(places.length, 3);
  for (const place of places) {
    assert.ok(Math.abs(place.longitude - gps[0]) < 0.000002);
    assert.ok(Math.abs(place.latitude - gps[1]) < 0.000002);
  }
});
test("autocomplete skips district-only tips, preserves descriptions and respects cancellation", async () => {
  result = {
    tips: [
      {
        id: "one",
        name: "天安门",
        district: "北京市",
        address: "东长安街",
        location: { lng: 116.4, lat: 39.9 },
      },
      { name: "北京", location: [] },
    ],
  };
  assert.equal((await searchPlaces("天安门")).length, 1);
  const abort = new AbortController();
  abort.abort();
  assert.deepEqual(await searchPlaces("北京", abort.signal), []);
});
test("empty results and provider errors do not manufacture coordinates", async () => {
  status = "no_data";
  assert.deepEqual(await nearbyPlaces(40, 116), []);
  status = "error";
  await assert.rejects(searchPlaces("北京"), /地点查询/);
});

test("opening location dropdown recommends nearby places; typed results prefer the current point", async () => {
  status = "complete";
  const gps = [120.3, 36.1],
    gcj = toAMap(gps);
  result = {
    regeocode: {
      formattedAddress: "青岛市",
      pois: [
        {
          id: "local",
          name: "附近公园",
          location: { lng: gcj[0], lat: gcj[1] },
        },
      ],
    },
    tips: [
      {
        id: "far",
        name: "公园",
        district: "北京",
        location: { lng: 116.4, lat: 39.9 },
      },
      { id: "local", name: "附近公园", location: { lng: gcj[0], lat: gcj[1] } },
    ],
  };
  const point = { latitude: gps[1], longitude: gps[0] };
  assert.equal((await locationSuggestions("", point))[1].id, "local");
  const places = await locationSuggestions("公园", point);
  assert.deepEqual(
    places.map((place) => place.id),
    ["local", "far"],
  );
  assert.deepEqual(await locationSuggestions("", null), []);
});

test("map search can center a WGS84 candidate and zoom to street level", async () => {
  let center,
    zoom,
    disposed = false;
  const saved = window.AMap.Map;
  window.AMap.Map = class {
    setCenter(value) {
      center = value;
    }
    setZoom(value) {
      zoom = value;
    }
    on() {}
    resize() {}
    destroy() {
      disposed = true;
    }
  };
  window.AMap.Marker = class {
    setPosition() {}
    setMap() {}
  };
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  const map = await createPickerMap({}, { style: "fresh" }, null, () => {});
  map.show(36.05, 120.348, true, 14);
  assert.deepEqual(center, toAMap([120.348, 36.05]));
  assert.equal(zoom, 14);
  map.destroy();
  assert.equal(disposed, true);
  window.AMap.Map = saved;
});
