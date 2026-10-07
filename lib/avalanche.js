// Live avalanche danger for a route, from the avalanche.org public API (both endpoints send
// Access-Control-Allow-Origin: *, checked 2026-10-07):
//   products/map-layer   every US forecast zone as a polygon, with its centre, today's overall rating,
//                        and off_season (a zone off season carries danger_level -1, "no rating");
//   product?type=forecast&center_id=&zone_id=   the zone's forecast, with `danger` by elevation band
//                        (upper = above treeline, middle = near, lower = below) for today and tomorrow.
// A zone off season, a route outside every zone, and a failed read are three DIFFERENT answers, and
// none of them is "low danger": the card says which one it is (check:read-failures' rule).
const MAP_URL = "https://api.avalanche.org/v2/public/products/map-layer";
const PRODUCT_URL = "https://api.avalanche.org/v2/public/product?type=forecast";

export const DANGER_NAME = { 1: "Low", 2: "Moderate", 3: "Considerable", 4: "High", 5: "Extreme" };

let _map = null;
// One map layer per session (84 zones); a failure is not cached, so "Try again" really tries again.
export function fetchAvyMap() {
  if (!_map) _map = fetch(MAP_URL).then(function (r) { if (!r.ok) throw new Error("avy map " + r.status); return r.json(); }).then(function (j) {
    if (!j || !Array.isArray(j.features)) throw new Error("no data");
    return j;
  }).catch(function (e) { _map = null; throw e; });
  return _map;
}

// Ray casting on [lng, lat] rings; a polygon's later rings are holes.
function inRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inPolygon(lng, lat, rings) { if (!rings || !rings.length || !inRing(lng, lat, rings[0])) return false; for (let k = 1; k < rings.length; k++) if (inRing(lng, lat, rings[k])) return false; return true; }
export function inGeometry(lat, lng, g) {
  if (!g) return false;
  if (g.type === "Polygon") return inPolygon(lng, lat, g.coordinates);
  if (g.type === "MultiPolygon") return g.coordinates.some(function (p) { return inPolygon(lng, lat, p); });
  return false;
}
export function zoneFor(map, lat, lng) {
  return (map && map.features || []).find(function (f) { return inGeometry(lat, lng, f.geometry); }) || null;
}

export function fetchAvyProduct(centerId, zoneId) {
  return fetch(PRODUCT_URL + "&center_id=" + encodeURIComponent(centerId) + "&zone_id=" + encodeURIComponent(zoneId)).then(function (r) { if (!r.ok) throw new Error("avy product " + r.status); return r.json(); });
}

/* The zone's name as the card prints it. Two of the 84 zones are named after their forecasting
   centre ("CAIC zone", "Bridgeport Avalanche Center", checked 2026-10-07), and the app names no source
   on screen, so those read as "this zone" (null) instead. */
export function zoneName(p) {
  const n = p && p.name ? String(p.name) : null;
  if (!n) return null;
  if (p.center && n === p.center) return null;
  if (p.center_id && new RegExp("\\b" + String(p.center_id).replace(/[^A-Za-z0-9]/g, "") + "\\b", "i").test(n)) return null;
  if (/avalanche|information cent(er|re)|forecast/i.test(n)) return null;
  return n;
}

/* The reading the card shows. `bands` per day: {upper, middle, lower} as 1-5, or null where the centre
   gave none. `max` is the highest band -- most alpine routes start below treeline and top out above it,
   and a zone's treeline height is not in the data, so the route-relevant number is the highest. */
export function avyReading(feature, product) {
  if (!feature) return { kind: "outside" };
  const p = feature.properties || {};
  const base = { zone: zoneName(p), center: p.center || null, link: p.link || p.center_link || null };
  const days = {};
  (product && Array.isArray(product.danger) ? product.danger : []).forEach(function (d) {
    const v = function (x) { return typeof x === "number" && x >= 1 && x <= 5 ? x : null; };
    days[d.valid_day || "current"] = { upper: v(d.upper), middle: v(d.middle), lower: v(d.lower) };
  });
  const today = days.current || null;
  const max = today ? Math.max.apply(null, [today.upper, today.middle, today.lower].filter(function (x) { return x != null; }).concat([0])) : 0;
  /* In season but no band ratings in this API -- Colorado's single CAIC zone and Mount Shasta both
     come back this way (checked 2026-10-07). Their overall rating, when there is one, is still a
     reading; with neither it is "no rating published", never an empty set of bands that reads as nothing. */
  if (!max) return p.danger_level >= 1 ? Object.assign({ kind: "overall", max: p.danger_level }, base) : Object.assign({ kind: p.off_season ? "off" : "none" }, base);
  return Object.assign({ kind: "bands", today, tomorrow: days.tomorrow || null, max: max }, base);
}
