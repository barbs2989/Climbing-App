// STREAM FLOW near a route's approach, from USGS real-time gauges (waterservices.usgs.gov, open to the
// browser with CORS *, no key). The card shows what a gauge MEASURED and when, and never a verdict.
//
// WHAT A GAUGE CANNOT SAY (USGS, and the wading literature, 2026-10-08):
//  - It records STAGE continuously; discharge is computed from a rating curve fitted to measurements made
//    only every 6-8 weeks, so high flows are often extrapolated. Readings are PROVISIONAL until reviewed.
//  - It senses the cross-section at the gauge, not the ford. Whether a person can stand in a crossing turns
//    on the depth and the speed THERE: lab tests find adults lose their footing at depth x speed of about
//    10 to 20 ft^2/s (1 to 2 m^2/s; Abt et al. 1989, reviewed since). No discharge cut is universal: the
//    same flow is shin-deep in a wide reach and impassable in a narrow one.
//  - Snow- and glacier-fed streams rise in the warm hours and fall overnight, so the same crossing is
//    easier early. This module reports the last 24 h's own high and low rather than predicting it.
//  - The nearest gauge can be on another stream. Its distance is always stated.
const KM = 6371.0088;
export function haversineKm(a, b, c, d) {
  const r = Math.PI / 180, dLat = (c - a) * r, dLng = (d - b) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLng / 2) ** 2;
  return 2 * KM * Math.asin(Math.sqrt(h));
}

/* The site list is tab-separated "rdb" text: comment lines start with #, then a header row, then a row of
   field widths ("5s 15s ..."), then one row per site. */
export function parseSites(rdb) {
  const out = [];
  const lines = String(rdb || "").split("\n").filter(function (l) { return l && l[0] !== "#"; });
  if (lines.length < 3) return out;
  const head = lines[0].split("\t");
  const ix = function (n) { return head.indexOf(n); };
  const iNo = ix("site_no"), iNm = ix("station_nm"), iLat = ix("dec_lat_va"), iLng = ix("dec_long_va");
  if (iNo < 0 || iLat < 0 || iLng < 0) return out;
  lines.slice(2).forEach(function (l) {
    const c = l.split("\t"), lat = parseFloat(c[iLat]), lng = parseFloat(c[iLng]);
    if (c[iNo] && isFinite(lat) && isFinite(lng)) out.push({ no: c[iNo], name: c[iNm] || c[iNo], lat: lat, lng: lng });
  });
  return out;
}
// The nearest site within maxKm, with its distance, or null. Never "the nearest regardless of distance".
export function nearestGauge(sites, lat, lng, maxKm) {
  let best = null;
  (sites || []).forEach(function (s) {
    const d = haversineKm(lat, lng, s.lat, s.lng);
    if (d <= maxKm && (!best || d < best.km)) best = { no: s.no, name: s.name, km: d };
  });
  return best;
}

// USGS qualifier codes that mean the number is not a plain measurement. Named in plain words on screen.
/* A gauge's times are shown in the GAUGE's own local time, which its timestamp carries ("...T16:00:00.000-07:00"):
   the viewer's device zone would put a Pacific gauge's afternoon peak at the wrong hour for a climber who
   planned the day in the gauge's zone. */
export function clockOfStamp(s) {
  const m = /T(\d\d):(\d\d)/.exec(String(s || "")); if (!m) return null;
  const hr = +m[1], h12 = hr % 12 || 12;
  return h12 + ":" + m[2] + (hr < 12 ? " AM" : " PM");
}
export function dayWord(s, nowS) {
  const a = String(s || "").slice(0, 10), b = String(nowS || "").slice(0, 10);
  if (a === b) return "today";
  return Math.round((Date.parse(b) - Date.parse(a)) / 864e5) === 1 ? "yesterday" : a;
}
export const FLAG_WORDS = { Ice: "ice-affected", Eqp: "equipment malfunction", Mnt: "equipment under maintenance", Dis: "discontinued", Bkw: "backwater", Zfl: "zero flow", Dry: "dry", Ssn: "seasonal", Rat: "rating being developed", Fld: "flood damage" };
export const STEADY_PCT = 10; // ours: a change under 10% over 3 h reads "steady". No published cut exists.

/* One gauge's last 24 h. `json` is the instantaneous-values response for parameters 00060 (discharge,
   ft3/s) and 00065 (stage, ft). Discharge is preferred; a gauge with only stage reports stage. Returns
   {name, kind: "discharge"|"stage", now:{v,at}, ago3:{v,at}|null, hi:{v,at}, lo:{v,at}, trend, pct, flags, provisional}
   or null when it holds no usable number -- never a zero. USGS's no-data value (-999999) is not a reading. */
export function flowReading(json) {
  const ts = (json && json.value && json.value.timeSeries) || [];
  const pickSeries = function (code) { return ts.find(function (t) { return t.variable && t.variable.variableCode && t.variable.variableCode[0] && t.variable.variableCode[0].value === code; }); };
  const s = pickSeries("00060") || pickSeries("00065");
  if (!s) return null;
  const nod = s.variable.noDataValue;
  const pts = ((s.values && s.values[0] && s.values[0].value) || []).map(function (p) {
    return { v: parseFloat(p.value), at: Date.parse(p.dateTime), q: p.qualifiers || [], s: String(p.dateTime || "") };
  }).filter(function (p) { return isFinite(p.v) && isFinite(p.at) && p.v !== nod && p.v > -999990; }).sort(function (a, b) { return a.at - b.at; });
  if (!pts.length) return null;
  const now = pts[pts.length - 1];
  const want = now.at - 3 * 3600e3;
  const ago = pts.filter(function (p) { return p.at <= want; }).pop() || null;
  let hi = pts[0], lo = pts[0];
  pts.forEach(function (p) { if (p.v > hi.v) hi = p; if (p.v < lo.v) lo = p; });
  const pct = ago && ago.v > 0 ? (now.v - ago.v) / ago.v * 100 : null;
  const trend = pct == null ? null : Math.abs(pct) < STEADY_PCT ? "steady" : pct > 0 ? "rising" : "falling";
  const flags = [];
  now.q.forEach(function (q) { if (FLAG_WORDS[q] && flags.indexOf(FLAG_WORDS[q]) < 0) flags.push(FLAG_WORDS[q]); });
  const si = s.sourceInfo || {};
  return { name: si.siteName || null, kind: s.variable.variableCode[0].value === "00060" ? "discharge" : "stage",
    now: { v: now.v, at: now.at, clock: clockOfStamp(now.s), day: "today" },
    ago3: ago ? { v: ago.v, at: ago.at } : null,
    hi: { v: hi.v, at: hi.at, clock: clockOfStamp(hi.s), day: dayWord(hi.s, now.s) }, lo: { v: lo.v, at: lo.at, clock: clockOfStamp(lo.s), day: dayWord(lo.s, now.s) },
    trend: trend, pct: pct, flags: flags, provisional: now.q.indexOf("P") >= 0 };
}
