// Snow on the ground near a route, from the NRCS SNOTEL network (AWDB REST API; Access-Control-Allow-
// Origin: *, checked 2026-10-07). One station is ONE POINT, usually well below the route, so the card
// always says how far away and how much lower it is -- the research's own caution ("a station's
// elevation rarely matches the route you plan to climb").
const BASE = "https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1";
const KEY = "climbmatch-snotel-stations";
const ST_TTL = 30 * 864e5;
let _st = null;

/* Every active station in every state (919 on 2026-10-07: ~400 KB once, ~50 KB kept), cached on this
   device for 30 days -- the network changes yearly, not daily. All states rather than the route's own:
   a route's state is not on the row (its id is named after the route, not the place), and a climb near
   a border can sit closer to the next state's station. A failure is not cached. */
export function fetchSnotelStations() {
  try { const c = JSON.parse(localStorage.getItem(KEY) || "null"); if (c && c.at > Date.now() - ST_TTL && Array.isArray(c.s)) return Promise.resolve(c.s.map(unslim)); } catch (e) { /* blocked or junk: fetch */ }
  if (!_st) _st = fetch(BASE + "/stations?stationTriplets=*:*:SNTL&returnForecastPointMetadata=false&returnReservoirMetadata=false&returnStationElements=false&activeOnly=true").then(function (r) { if (!r.ok) throw new Error("snotel " + r.status); return r.json(); }).then(function (j) {
    if (!Array.isArray(j)) throw new Error("no data");
    const s = j.filter(function (x) { return x && x.stationTriplet && typeof x.latitude === "number" && typeof x.longitude === "number"; })
      .map(function (x) { return [x.stationTriplet, x.name, x.elevation, Math.round(x.latitude * 1e4) / 1e4, Math.round(x.longitude * 1e4) / 1e4]; });
    try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), s: s })); } catch (e) { /* full or blocked */ }
    return s.map(unslim);
  }).catch(function (e) { _st = null; throw e; });
  return _st;
}
function unslim(a) { return { id: a[0], name: a[1], elevFt: a[2], lat: a[3], lng: a[4] }; }

export function kmBetween(a, b, c, d) {
  const R = 6371, r = Math.PI / 180, dLat = (c - a) * r, dLng = (d - b) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// The nearest station within `maxKm` (30 km: past that a station describes another range).
export function nearestStation(stations, lat, lng, maxKm) {
  let best = null;
  (stations || []).forEach(function (s) { const km = kmBetween(lat, lng, s.lat, s.lng); if (km <= (maxKm || 30) && (!best || km < best.km)) best = Object.assign({ km: km }, s); });
  return best;
}

// Daily snow depth (SNWD, inches) for the last 8 days.
export function fetchSnotelDepth(triplet) {
  const end = new Date().toISOString().slice(0, 10), begin = new Date(Date.now() - 8 * 864e5).toISOString().slice(0, 10);
  return fetch(BASE + "/data?stationTriplets=" + encodeURIComponent(triplet) + "&elements=SNWD&duration=DAILY&beginDate=" + begin + "&endDate=" + end).then(function (r) { if (!r.ok) throw new Error("snotel data " + r.status); return r.json(); }).then(function (j) {
    if (!Array.isArray(j)) throw new Error("no data");
    const el = j[0] && Array.isArray(j[0].data) ? j[0].data.find(function (d) { return d.stationElement && d.stationElement.elementCode === "SNWD"; }) : null;
    // A station that answers with no SNWD series has not reported: an empty list, which the card
    // words as "has not reported this week" -- not a throw, which it would word as a failed read.
    if (!el) return [];
    if (!Array.isArray(el.values)) throw new Error("no data");
    return el.values.filter(function (v) { return typeof v.value === "number"; });
  });
}
// Latest depth and its change over 1 and 7 days. null where the station has not reported.
export function snowReading(values) {
  if (!values || !values.length) return null;
  const last = values[values.length - 1], prev = values[values.length - 2], week = values[0];
  return { date: last.date, depth: last.value, d24: prev ? last.value - prev.value : null, d7: values.length >= 7 ? last.value - week.value : null };
}
