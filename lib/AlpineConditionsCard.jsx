// The Conditions tab for alpine, mountaineering, scrambling, ice and mixed routes: route-aware FLAGS
// and a start time, never a score (owner decision 2026-10-07). The judgement lives in
// lib/alpineConditions.js; this file only fetches, picks the day and words the flags in the
// climber's own units. The crag score (ConditionsScoreCard) is a different card for different
// disciplines -- the two never render on one route.
import { useState, useEffect, useMemo } from "react";
import { C, DLOCALE, CardHead, uTemp, uTempDelta, uWind, uSnowfall, uPrecip, uElev, uImp, uDistMi, wpIs, wpPlaced, catOf } from "../ClimbMatchCore.jsx";
import { fetchAlpineForecast, fetchAlpineClimate, fetchAlpineSpread, fetchCragAir, fetchPointAlerts, fetchGaugeSites, fetchGaugeFlow } from "./forecast.js";
import { parseSites, nearestGauge, flowReading } from "./streams.js";
import { condKind, hasSnowLegs, localDays, localHour, windChillF, airDay, aqiWord, smokeFlag, normAlerts, alertsForDay, alertLevel, fogHours, snowHistory, snowLevel, dayFlags, daySummary, todayOf, snowFloorFt, LIMITS, modelSpread, wholeDayLegs } from "./alpineConditions.js";
import { Tile, TileGrid, NOT_MEASURED, clockHr, spanEnding, compass } from "./HourTiles.jsx";
import { routeTerrain } from "./terrain.js";
import { planTimes } from "./planTimes.js";
import { isMultiDayOuting } from "./outing.js";
import { fetchAvyMap, zoneFor, fetchAvyProduct, avyReading, DANGER_NAME } from "./avalanche.js";
import { fetchSnotelStations, nearestStation, fetchSnotelDepth, snowReading } from "./snotel.js";
import ShadeMap, { loadTerrain } from "./ShadeMap.jsx";
import { shadeGrid, gridPx, highestNear, SUMMIT_SNAP_M, faceSunBands, faceBearing } from "./terrainShade.js";

const _alpWx = {}, _alpSp = {}, _alpAir = {}, _alpAlerts = {};
const ALERT_TTL = 10 * 60 * 1000; // alerts are issued and cancelled within the hour: a session-long cache would hide a new one
const BOX = { background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "12px 14px", marginBottom: 14 };
const MUTED = { fontSize: 12.5, color: C.textSub, lineHeight: 1.55 };
const RETRY = { marginTop: 6, background: C.surface, color: C.blue, border: "1px solid " + C.border, borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" };

export const KIND_LABEL = { glacier: "Glacier & snow", alpineice: "Alpine ice & mixed", waterfall: "Waterfall ice", cragmixed: "Mixed", scramble: "Scrambling", alpinerock: "Alpine rock" };
// What a forecast cannot see for each kind (research 2026-10-07): said every time, so a day with no
// flags never reads as "it's in" or "it's safe".
const BLIND = {
  glacier: "A forecast can’t see whether bridges are open or a boot track is in — check recent reports.",
  alpineice: "A forecast can’t see whether there is ice on the line, or verglas in the shade — check recent reports.",
  waterfall: "A forecast can’t see whether the ice is in, or still attached — that takes a recent report.",
  cragmixed: "A forecast can’t see whether turf and loose blocks are frozen in — that takes a recent report.",
  scramble: "A forecast can’t see whether the rock is dry or snow lingers in the gullies — check recent reports.",
  alpinerock: "A forecast can’t see seeps, verglas on the pitches or snow in the descent gully — check recent reports.",
};

function clockOf(fc, unixS) {
  const d = new Date(unixS * 1000 + (fc.utc_offset_seconds || 0) * 1000);
  const hr = d.getUTCHours(), mn = d.getUTCMinutes(), h12 = hr % 12 || 12;
  return h12 + ":" + String(mn).padStart(2, "0") + (hr < 12 ? " AM" : " PM");
}
// Visibility in the climber's units: miles to a tenth, or kilometres to a tenth.
// Capped at 10 mi / 16 km: the model can return 200 km, and a number that precise says nothing a climber can use.
function visText(m) { return m >= 16093 ? (uImp() ? "10+ mi" : "16+ km") : uImp() ? (m / 1609.344).toFixed(1) + " mi" : (m / 1000).toFixed(1) + " km"; }
// Stream flow in the climber's units (discharge ft³/s <-> m³/s; stage ft <-> m).
function flowText(v, kind) {
  if (kind === "stage") return uImp() ? v.toFixed(2) + " ft" : (v * 0.3048).toFixed(2) + " m";
  if (uImp()) return Math.round(v).toLocaleString() + " ft³/s";
  const m3 = v * 0.0283168; return m3.toFixed(m3 < 10 ? 2 : 1) + " m³/s";
}
const titleCase = function (s) { return String(s || "").toLowerCase().replace(/\b([a-z])/g, function (m) { return m.toUpperCase(); }); };
// "until Thu 4:00 PM" / "from Thu 12:00 PM until Thu 7:00 PM": an alert's own event window, in the route's local time.
function windowLabel(fc, a) {
  const st = function (ms) { const sh = new Date(ms + (fc.utc_offset_seconds || 0) * 1000); return sh.toLocaleDateString(DLOCALE, { weekday: "short", timeZone: "UTC" }) + " " + clockOf(fc, ms / 1000); };
  const now = Date.now();
  if (a.end == null) return a.start != null && a.start > now ? "from " + st(a.start) : "in effect";
  return (a.start != null && a.start > now ? "from " + st(a.start) + " " : "") + "until " + st(a.end);
}
// Round a start DOWN to the quarter hour: rounding up would start later than the arithmetic says.
const floorQ = (s) => Math.floor(s / 900) * 900;
const hrs = (h) => (Math.round(h * 2) / 2).toFixed(1).replace(/\.0$/, "") + " h";

export function flagText(f) {
  const v = f.v || {};
  switch (f.key) {
    case "ice-warm-night": return "No freeze last night (low " + uTemp(v.low) + ") — warm nights destabilise ice most";
    case "ice-warm-run": return v.days + " days in a row above freezing — a pillar can be undercut and still look solid";
    case "ice-rise": return "Temperature up " + uTempDelta(v.delta) + "° in 48 hours";
    case "ice-drop": return "Temperature falls " + uTempDelta(v.delta) + "° in 6 hours — a sudden cold snap can fracture hanging ice";
    case "ice-rain": return "Rain on the ice — it saturates and delaminates";
    case "ice-not-in": return "Only " + v.cold + " day" + (v.cold === 1 ? "" : "s") + " below freezing in the past week — the ice may not be in";
    case "ice-snow": return uSnowfall(v.inch) + " of new snow — check what is loaded above the gully";
    case "ice-wind": return "Gusts to " + uWind(v.gust) + " — wind loading the slopes above";
    case "mixed-not-frozen": return "Only " + v.frozen + " of the last " + v.of + " days stayed below freezing — loose blocks and turf need weeks of cold to freeze in";
    case "thunder": return v.likely ? "Thunderstorms forecast" : "Thunderstorms possible";
    case "no-refreeze": return "No overnight freeze at " + uElev(v.ft) + " — the snow starts soft" + (v.glacier ? " and bridges are weak" : "");
    case "fl-above-night": return "Freezing level above the summit all night";
    case "fl-above": return "Freezing level " + uElev(Math.round(v.above / 100) * 100) + " above the summit by afternoon — expect rock and ice fall";
    case "verglas": return "Wet, then below freezing on the route — ice or snow on the holds";
    case "wet-rock": return uPrecip(v.inch) + " of rain in the last two days — wet rock climbs harder than its grade";
    case "showers": return v.pct + "% chance of rain — retreating or rappelling wet is where things go wrong";
    case "new-snow": return uSnowfall(v.inch) + " of new snow at the summit" + (v.scramble ? " — a snowed-up scramble is a winter climb" : "");
    case "wind": return "Summit gusts to " + uWind(v.gust) + " in daylight";
    case "alert": return "Weather alert: " + v.event + " (" + String(v.severity).toLowerCase() + " severity), " + v.when + " — covers a whole forecast zone, not just this route";
    case "fog": return "Fog in the forecast: visibility under " + uDistMi(0.621371) + " for " + v.hours + " daylight hour" + (v.hours === 1 ? "" : "s") + " from " + v.from + " — a model estimate whose accuracy in the mountains is unchecked; no fog hour is not a clear day";
    case "smoke": return "Smoke and air quality: US AQI up to " + Math.round(v.aqi) + " (" + aqiWord(v.aqi).toLowerCase() + ") — a forecast for the area, not a reading at the route; smoke aloft or pooled in a valley is not seen";
    case "models-disagree": return "Forecast models disagree on this day (" + [v.over.indexOf("gust") >= 0 ? "gusts " + uWind(v.gust[0]) + "–" + uWind(v.gust[1]) : null, v.over.indexOf("high") >= 0 ? "highs " + uTemp(v.high[0]) + "–" + uTemp(v.high[1]) : null, v.over.indexOf("fl") >= 0 ? "freezing level " + uElev(Math.round(v.fl[0] / 100) * 100) + "–" + uElev(Math.round(v.fl[1] / 100) * 100) : null].filter(Boolean).join(", ") + ") — read its flags as low confidence";
    case "wind-chill": return "Wind chill " + uTemp(v.chill) + " — frostbite on exposed skin in about 30 minutes";
    default: return f.key;
  }
}

/* The forecast point: the route's own summit/top-out pin, else its area's coordinate at the route's
   high point (high_point_ft agrees with the summit pin exactly on 83.5% of rows). */
export function forecastPoint(route, mtn) {
  const wps = (route.waypoints || []).filter(wpPlaced);
  const top = wps.find(function (w) { return wpIs(w, "Summit") || wpIs(w, "Topout"); });
  const area = route._dbArea || mtn || {};
  const camps = wps.filter(function (w) { return wpIs(w, "Campsite") && w.elev != null; });
  const campFt = camps.length ? Math.max.apply(null, camps.map(function (w) { return +w.elev; })) : null;
  const elev = top && top.elev != null ? +top.elev : route.highPointFt != null ? +route.highPointFt : area.elevation != null ? +area.elevation : null;
  const lat = top ? +top.lat : area.lat != null ? +area.lat : mtn && mtn.lat != null ? +mtn.lat : null;
  const lng = top ? +top.lng : area.lng != null ? +area.lng : mtn && mtn.lng != null ? +mtn.lng : null;
  if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) return null;
  return { lat, lng, elevFt: elev != null && isFinite(elev) ? elev : null, campFt, name: top ? (top.name || "the summit") : (area.name || "the area"), pinned: !!top };
}

export default function AlpineConditionsCard({ route, mtn, calc, activity, reportsUnavailable }) {
  const terrain = useMemo(function () { return routeTerrain(route); }, [route]);
  const kind = condKind(route, terrain, catOf(route));
  const pt = useMemo(function () { return forecastPoint(route, mtn); }, [route, mtn]);
  if (!kind) return null;
  /* Avalanche danger unless the route's own data rules avalanche terrain out (terrain.avalanche
     "no": a dry rock scramble). "unknown" still shows it -- suppression needs evidence. */
  const avyOn = terrain.avalanche !== "no";
  const th = pt ? (route.waypoints || []).filter(wpPlaced).find(function (w) { return wpIs(w, "Trailhead"); }) : null;
  const trailhead = th ? { lat: +th.lat, lng: +th.lng, name: th.name || "the trailhead" } : pt ? { lat: pt.lat, lng: pt.lng, name: null } : null;
  return <div>
    <ForecastBox route={route} calc={calc} kind={kind} terrain={terrain} pt={pt} />
    {pt ? <div style={BOX}>
      {avyOn ? <AvalancheSection pt={pt} /> : null}
      <div style={{ marginTop: avyOn ? 14 : 0 }}><SnowSection pt={pt} /></div>
      {kind !== "waterfall" && kind !== "cragmixed" ? <div style={{ marginBottom: 14 }}><StreamsSection pt={pt} base={trailhead} /></div> : null}
      <OutcomesSection activity={activity} />
      <ReportFreshness activity={activity} unavailable={reportsUnavailable} />
      <div style={{ marginTop: 14 }}><SeasonSection pt={pt} /></div>
    </div> : null}
  </div>;
}

function ForecastBox({ route, calc, kind, terrain, pt }) {
  const ck =pt ? pt.lat.toFixed(3) + "," + pt.lng.toFixed(3) + "@" + (pt.elevFt != null ? Math.round(pt.elevFt) : "") : "";
  const [wx, setWx] = useState(function () { return ck && _alpWx[ck] ? { data: _alpWx[ck] } : null; });
  const [tries, setTries] = useState(0);
  const [dayI, setDayI] = useState(0);
  useEffect(function () {
    if (!pt || !kind) return;
    if (_alpWx[ck]) { setWx({ data: _alpWx[ck] }); return; }
    let live = true; setWx(null);
    fetchAlpineForecast(pt.lat, pt.lng, pt.elevFt).then(function (j) { _alpWx[ck] = j; if (live) setWx({ data: j }); }, function () { if (live) setWx({ error: true }); });
    return function () { live = false; };
  }, [ck, tries, kind]);
  // The models' spread: a second, optional read. Failing, it adds nothing -- never "they agree".
  const [sp, setSp] = useState(function () { return ck && _alpSp[ck] ? _alpSp[ck] : null; });
  useEffect(function () {
    if (!pt || !kind) return;
    if (_alpSp[ck]) { setSp(_alpSp[ck]); return; }
    let live = true; setSp(null);
    fetchAlpineSpread(pt.lat, pt.lng, pt.elevFt).then(function (j) { _alpSp[ck] = j; if (live) setSp(j); }, function () { if (live) setSp(null); });
    return function () { live = false; };
  }, [ck, kind]);
  // Air quality: a third, optional read. A failed one is "not measured" -- never "clean air".
  const [air, setAir] = useState(function () { return ck && _alpAir[ck] ? { data: _alpAir[ck] } : null; });
  const [airTries, setAirTries] = useState(0);
  useEffect(function () {
    if (!pt || !kind) return;
    if (_alpAir[ck]) { setAir({ data: _alpAir[ck] }); return; }
    let live = true; setAir(null);
    fetchCragAir(pt.lat, pt.lng).then(function (j) { _alpAir[ck] = j; if (live) setAir({ data: j }); }, function () { if (live) setAir({ error: true }); });
    return function () { live = false; };
  }, [ck, kind, airTries]);
  // Weather alerts: another optional read, US only. Outside it, or failed, says so -- never "no alerts".
  const [alerts, setAlerts] = useState(function () { const c = ck && _alpAlerts[ck]; return c && Date.now() - c.at < ALERT_TTL ? { data: c.data } : null; });
  const [alertTries, setAlertTries] = useState(0);
  useEffect(function () {
    if (!pt || !kind) return;
    const c = _alpAlerts[ck];
    if (c && Date.now() - c.at < ALERT_TTL) { setAlerts({ data: c.data }); return; }
    let live = true; setAlerts(null);
    fetchPointAlerts(pt.lat, pt.lng).then(function (j) { _alpAlerts[ck] = { at: Date.now(), data: j }; if (live) setAlerts({ data: j }); }, function () { if (live) setAlerts({ error: true }); });
    return function () { live = false; };
  }, [ck, kind, alertTries]);
  useEffect(function () { setDayI(0); }, [route.id]);

  /* The legs the start counts back from: the Planner's own estimate, at the Planner's own inputs. A
     multi-day route starts its summit day at camp, so it climbs the summit leg and comes back down
     to camp (0.69 of the way up -- the catalog's own complete rows). */
  const P = planTimes(route, calc || {});
  const fromCamp = isMultiDayOuting(route) && (P.hasPublishedSummitH || P.hasDerivedSummitH);
  /* A route that publishes ONE whole-day time is counted back from that total where the kind allows it
     (wholeDayLegs): a scramble or alpine rock route, on a single day. `wholeDay` carries the total so the
     card says the up/down split is assumed. Every other whole-day row keeps NO start, and says why. */
  const wd = P.publishedIsWholeDay && !fromCamp ? wholeDayLegs(P.techH, kind) : null;
  const legs = wd ? { up: wd.up, down: wd.down, fromCamp: false, floor: false, tech: wd.up, hike: 0, wholeDay: wd.total }
    : { up: fromCamp ? P.techH : P.hikeH + P.techH, down: P.downH, fromCamp, floor: P.legsFloor || P.publishedIsWholeDay, tech: P.techH, hike: fromCamp ? 0 : P.hikeH };
  const snowLegs = hasSnowLegs(kind, terrain);
  const floor = snowLegs ? snowFloorFt(route, pt && pt.campFt) : null;

  /* SUN ON THE FACE for the selected day (lib/terrainShade.js faceSunBands), so the start can count
     back from it: glacier and alpine ice, with a summit pin, a one-direction aspect and a height the
     push starts from. Read for the day on screen only — the start is shown for no other. */
  const face = useMemo(function () { return sunFace(route, kind, pt, fromCamp); }, [route, kind, pt, fromCamp]);
  const [faceSun, setFaceSun] = useState({});
  useEffect(function () { setFaceSun({}); }, [route.id]);

  const model = useMemo(function () {
    if (!wx || !wx.data || !kind) return null;
    const fc = wx.data, days = localDays(fc), today = todayOf(fc);
    const out = [];
    days.forEach(function (d, k) {
      if (d.date < today) return;
      const fs = faceSun[d.date];
      let r = dayFlags(fc, days, k, { kind, rockToo: kind === "glacier" && catOf(route) === "alpine", terrain, highFt: pt.elevFt, snowFt: floor ? floor.ft : null, legs, sun: fs && fs.bands ? fs : null });
      const ms = sp ? modelSpread(sp, d.date) : null;
      if (ms && ms.over.length) r = Object.assign({}, r, { flags: r.flags.concat([{ key: "models-disagree", level: "caution", v: ms }]) });
      const al = alerts && alerts.data && !alerts.data.outside ? alertsForDay(normAlerts(alerts.data), d.date, fc.utc_offset_seconds) : [];
      if (al.length) r = Object.assign({}, r, { flags: r.flags.concat(al.map(function (a) { return { key: "alert", level: alertLevel(a), v: { event: a.event, severity: a.severity, when: windowLabel(fc, a) } }; })) });
      const fg = fogHours(fc, d);
      if (fg) r = Object.assign({}, r, { flags: r.flags.concat([{ key: "fog", level: "caution", v: { hours: fg.hours, from: clockOf(fc, fg.first), minM: fg.minM } }]) });
      const aq = air && air.data ? airDay(air.data, d.date) : null, sf = smokeFlag(aq);
      if (sf) r = Object.assign({}, r, { flags: r.flags.concat([sf]) });
      out.push(Object.assign({ date: d.date, sum: daySummary(fc, d), sunrise: d.sunrise, sunset: d.sunset, aqi: aq }, r));
    });
    return { fc, days: out.slice(0, 7) };
  }, [wx, sp, air, alerts, kind, ck, floor && floor.ft, legs.up, legs.down, legs.floor, legs.fromCamp, legs.tech, legs.hike, faceSun]);
  const selDay = model && model.days.length ? model.days[Math.min(dayI, model.days.length - 1)] : null;
  useEffect(function () {
    if (!face || face.missing || legs.floor || !selDay || selDay.sunrise == null || selDay.sunset == null || faceSun[selDay.date]) return;
    const date = selDay.date, rise = selDay.sunrise * 1000, set = selDay.sunset * 1000, grid = shadeGrid(face.ctr.lat, face.ctr.lng);
    let live = true, done = false, tm = 0;
    const put = function (v) { done = true; setFaceSun(function (m) { const n = Object.assign({}, m); n[date] = v; return n; }); };
    setFaceSun(function (m) { const n = Object.assign({}, m); n[date] = { busy: true }; return n; });
    loadTerrain(grid).then(function (T) {
      if (!live) return;
      // A tick later, so the card paints first: ~0.5 s of arithmetic on a phone.
      tm = setTimeout(function () {
        if (!live) return;
        const px = gridPx(grid, face.top.lat, face.top.lng), top = px && highestNear(T.E, grid.W, grid.H, px, Math.round(SUMMIT_SNAP_M / grid.pxM));
        const b = top ? faceSunBands(T, grid, top, face.deg, face.top.lat, face.top.lng, rise, set, 10, face.fromFt / 3.28084) : null;
        put(b ? { bands: b.map(function (x) { return { ft: x.e * 3.28084, at: Math.round(x.at / 1000) }; }), topFt: T.E[top.r * grid.W + top.c] * 3.28084, fromFt: face.fromFt } : { error: true });
      }, 30);
    }, function () { if (live) put({ error: true }); });
    return function () { live = false; clearTimeout(tm); if (!done) setFaceSun(function (m) { if (!m[date] || !m[date].busy) return m; const n = Object.assign({}, m); delete n[date]; return n; }); };
  }, [face, legs.floor, selDay && selDay.date]);

  if (!kind) return null;
  const box = { background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "12px 14px", marginBottom: 14 };
  const head = <CardHead style={{ marginBottom: 8 }}>{"CONDITIONS · " + KIND_LABEL[kind].toUpperCase()}</CardHead>;
  if (!pt) return <div style={box}>{head}<div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.55 }}>No conditions for this climb: neither it nor the area it is on has a location on file, so there is no forecast to read.</div></div>;
  if (wx && wx.error) return <div style={box}>{head}<div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.55, marginBottom: 8 }}>Couldn’t load the forecast, so no flags are shown. This is not a reading of the conditions.</div><button onClick={function () { setTries(tries + 1); }} style={{ background: C.surface, color: C.blue, border: "1px solid " + C.border, borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Try again</button></div>;
  if (!model) return <div style={box} aria-busy="true">{head}<div style={{ fontSize: 12.5, color: C.textMuted }}>Loading the forecast…</div></div>;
  const days = model.days, fc = model.fc;
  if (!days.length) return <div style={box}>{head}<div style={{ fontSize: 12.5, color: C.textSub }}>The forecast came back with no days ahead to read.</div></div>;
  const day = days[Math.min(dayI, days.length - 1)];
  const dayName = function (d, i) { return i === 0 ? "Today" : new Date(d.date + "T12:00:00Z").toLocaleDateString(DLOCALE, { weekday: "short", timeZone: "UTC" }); };
  const nWarn = function (d) { return d.flags.filter(function (f) { return f.level === "warn"; }).length; };
  const nCaution = function (d) { return d.flags.filter(function (f) { return f.level === "caution"; }).length; };
  const dot = function (col) { return <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: col, margin: "0 1.5px" }} />; };

  let startEl = null, sunEl = null;
  const faceDir = face && !face.missing ? ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(face.deg / 45) % 8] : "";
  /* What the start did with the sun on the face, said every time: it counted it, or why it could not.
     A deadline counted from a model must carry the model's limits (research 2026-10-08). */
  if (face && !legs.floor) {
    const fs = faceSun[day.date], noFrz = day.noFreeze || day.flags.some(function (f) { return f.key === "fl-above-night"; });
    const MISSING = { ridge: "it climbs a ridge, and what sheds off either side falls away from the crest", summit: "the route has no summit pin on file", aspect: "its aspect on file isn’t one direction", from: legs.fromCamp ? "no camp height is on file" : "no trailhead height is on file" };
    const line = face.missing ? "This start doesn’t count in sun on the face: " + MISSING[face.missing] + "."
      : !fs || fs.busy ? "Checking when the sun reaches the face…"
      : fs.error ? "Couldn’t load the terrain, so this start doesn’t count in sun on the face."
      : noFrz ? "The sun gives no deadline today: with nothing frozen overnight, rock, ice and snow can be loose from the start."
      : day.sun && !(day.start && day.start.why === "sun") ? "The sun reaches steep ground shedding onto the line above " + uElev(Math.ceil(day.sun.ft / 50) * 50) + " at " + clockOf(fc, day.sun.sunAt) + "; this start has you above that height by then."
      : day.sunCold ? "The sun reaches steep ground shedding onto the line, but the air there stays below freezing all day — on a cold day the sun alone sets no deadline."
      : !day.sun ? "Under a clear sky the sun doesn’t reach the steep ground shedding onto the line above " + uElev(Math.round(face.fromFt / 100) * 100) + " all day."
      : "";
    const caveat = fs && fs.bands && !noFrz ? "The line is the fall line down the " + faceDir + " side from the summit, not a traced route — on a ridge it reads one flank. Clear-sky terrain shade from heights about 7 m apart: it misses cornices, seracs and narrow walls, and shade isn’t proof the snow is frozen. Rock and ice can start moving minutes or hours after first sun — no lag is counted — and sun can still shed rime on a cold day." + (kind === "glacier" ? " No timing reduces serac fall." : "") : "";
    if (line || caveat) sunEl = <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5, marginTop: startEl ? 6 : 0 }}>{line}{line && caveat ? " " : ""}{caveat}</div>;
  }
  if (kind !== "waterfall" && kind !== "cragmixed") {
    if (legs.floor) {
      startEl = <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>{P.publishedIsWholeDay
        ? (fromCamp ? "No start time: this climb’s published time is one figure for the whole trip, with no summit day from camp to count back from."
          : "No start time: this climb’s published time is one whole-day figure, with no split between the walk in and the climb, and a start for a glacier or ice climb is counted back from those two separately.")
        : "No start time: the Plan tab’s estimate for this climb is only a minimum (part of the approach or the climbing isn’t on file), and a start counted back from a minimum would be too late."}</div>;
    } else if (day.start) {
      const st = floorQ(day.start.at);
      const startDate = new Date(st * 1000 + (fc.utc_offset_seconds || 0) * 1000).toISOString().slice(0, 10);
      const daysEarly = Math.round((Date.parse(day.date) - Date.parse(startDate)) / 864e5);
      const offBy = clockOf(fc, day.start.at + legs.up * 3600), storm = day.thunder && day.thunder.likely ? "forecast" : "possible";
      const why = day.start.why === "snow"
        ? (legs.wholeDay ? "to do the " + hrs(legs.wholeDay) + " day and be back down by " : legs.fromCamp ? "to climb " + hrs(legs.up) + " from camp and be back down by " : "to climb " + hrs(legs.up) + " and walk " + hrs(legs.down) + " back down by ") + clockOf(fc, day.softAt) + ", when the snow at " + uElev(floor.ft) + " starts to soften"
        : day.start.why === "sun" ? (legs.fromCamp ? "to climb " + hrs(legs.up) + " from camp" : "to walk in (" + hrs(legs.hike) + ") and climb " + hrs(legs.tech)) + " and be above " + uElev(Math.ceil(day.start.sun.ft / 50) * 50) + " by " + clockOf(fc, day.start.sun.sunAt) + ", when the sun reaches steep ground that sheds onto the line above that height"
        : day.start.why === "storm-descent" ? "to reach the top" + (legs.wholeDay ? "" : " (" + hrs(legs.up) + ")") + " and start down by " + offBy + ", before the thunderstorms " + storm + " this afternoon"
        : "to be off the summit" + (legs.wholeDay ? "" : " (" + hrs(legs.up) + " up)") + " by " + offBy + ", before the thunderstorms " + storm + " this afternoon";
      startEl = daysEarly >= 2
        ? <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>{"Too long for one push: counting back from the Plan tab’s estimate puts the start " + daysEarly + " days early. Plan a camp — see the Plan tab."}</div>
        : <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{(legs.fromCamp ? "Leave camp by " : "Start by ") + clockOf(fc, st) + (daysEarly === 1 ? " the night before" : "")}</div>
          <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5, marginTop: 2 }}>{why + (legs.wholeDay ? ". The route publishes one whole-day time (" + hrs(legs.wholeDay) + ") with no split, so the way up is counted as " + Math.round(LIMITS.wholeDayUpShare * 100) + "% of it: a rule of thumb that errs early. It is a fit party’s time, so a slower party should start earlier still." : P.legsStored ? ". Times are this route’s published times for a fit party (Plan tab), so a slower party should start earlier." : ". Times are the Plan tab’s estimate at its own fitness and pack.")}</div>
        </div>;
    } else if (day.noFreeze && floor) {
      startEl = <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>{"No start time from the snow: it didn’t freeze overnight at " + uElev(floor.ft) + ", so there is no frozen window to be back down in."}</div>;
    } else if (snowLegs && floor && day.softAt == null) {
      startEl = <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>{"The snow at " + uElev(floor.ft) + " stays below freezing all day — no softening deadline from the forecast."}</div>;
    }
  }

  const s = day.sum;
  const readout = [["High / low", s.hi != null ? uTemp(s.hi) + " / " + uTemp(s.lo) : "—"], ["Freezing level", s.flLo != null ? uElev(Math.round(s.flLo / 100) * 100) + "–" + uElev(Math.round(s.flHi / 100) * 100) : "—"], ["Gusts, any hour", s.gust != null ? uWind(s.gust) : "—", s.gust != null && s.gustDay != null ? "daylight hours: " + uWind(s.gustDay) : null], ["New snow", uSnowfall(s.snow)]];
  return <div><div style={box}>
    {head}
    <div role="group" aria-label="Day" style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 4, marginBottom: 10 }}>{days.map(function (d, i) {
      const on = i === Math.min(dayI, days.length - 1), w = nWarn(d), c = nCaution(d);
      return <button key={d.date} onClick={function () { setDayI(i); }} aria-pressed={on} aria-label={dayName(d, i) + ", " + (w + c === 0 ? "no flags" : (w ? w + " warning" + (w === 1 ? "" : "s") : "") + (w && c ? " and " : "") + (c ? c + " caution" + (c === 1 ? "" : "s") : ""))} style={{ flex: "0 0 auto", minWidth: 52, padding: "6px 4px", borderRadius: 9, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : "transparent", color: C.text, cursor: "pointer", textAlign: "center" }}>
        <div style={{ fontSize: 11.5, fontWeight: 700 }}>{dayName(d, i)}</div>
        <div style={{ minHeight: 10, lineHeight: "10px" }}>{Array.from({ length: Math.min(w, 3) }, function (_, j) { return <span key={"w" + j}>{dot(C.red)}</span>; })}{Array.from({ length: Math.min(c, 3) }, function (_, j) { return <span key={"c" + j}>{dot(C.amber)}</span>; })}</div>
        <div style={{ fontSize: 10.5, color: C.textMuted }}>{d.sum.hi != null ? uTemp(d.sum.hi) + "/" + uTemp(d.sum.lo) : ""}</div>
      </button>;
    })}</div>
    {startEl || sunEl ? <div style={{ background: C.surface, borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>{startEl}{sunEl}</div> : null}
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
      {day.flags.length ? day.flags.map(function (f, i) { const col = f.level === "warn" ? C.red : C.amber; return <div key={f.key + i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: C.text, lineHeight: 1.45 }}><span aria-hidden="true" style={{ flexShrink: 0, marginTop: 5, width: 8, height: 8, borderRadius: "50%", background: col }} /><span><b style={{ color: col }}>{f.level === "warn" ? "Warning: " : "Caution: "}</b>{flagText(f)}</span></div>; })
        : <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>Nothing in the forecast flags this day.</div>}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>{readout.map(function (r) { return <div key={r[0]} style={{ background: C.surface, borderRadius: 8, padding: "6px 8px" }}><div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 700 }}>{r[0]}</div><div style={{ fontSize: 12.5, color: C.text, fontWeight: 700 }}>{r[1]}</div>{r[2] ? <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{r[2]}</div> : null}</div>; })}</div>
    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>
      {"Read at " + (pt.elevFt != null ? uElev(pt.elevFt) : "the area’s height") + (pt.pinned ? " at " + pt.name : " over " + pt.name) + "." + (floor && floor.basis === "halfway" ? " Snow is assumed to reach down to " + uElev(floor.ft) + ", halfway up the climb." : floor && floor.basis === "camp" ? " Snow is read down to high camp, " + uElev(floor.ft) + "." : "") + " Flags are rules of thumb, not a go/no-go. " + BLIND[kind]}
    </div>
  </div>
  <AlertsSection day={day} dayLabel={dayName(day, Math.min(dayI, days.length - 1))} alerts={alerts} fc={fc} onRetry={function () { setAlertTries(alertTries + 1); }} />
  <HourByHour key={day.date} fc={fc} day={day} dayLabel={dayName(day, Math.min(dayI, days.length - 1))} pt={pt} floor={floor} legs={legs} snowLegs={snowLegs} />
  <SnowfallSection fc={fc} day={day} dayLabel={dayName(day, Math.min(dayI, days.length - 1))} />
  <AirSection day={day} dayLabel={dayName(day, Math.min(dayI, days.length - 1))} air={air} onRetry={function () { setAirTries(airTries + 1); }} />
  <SunShadeSection route={route} kind={kind} terrain={terrain} pt={pt} fc={fc} day={day} isToday={Math.min(dayI, days.length - 1) === 0} />
  </div>;
}

/* HOUR BY HOUR for the selected day, at the forecast's own point and height (owner, 2026-10-08: "more of an
   hour by hour breakdown" for alpine, mountaineering and scrambling). It adds NO judgement: every marker
   is a time lib/alpineConditions.js already computed for the day (sunrise, the start, the hour the snow
   softens, the first thunderstorm hour, sunset), and every colour is one of LIMITS' own cuts.
   WHAT EACH BOX MEANS (Open-Meteo docs, verified 2026-10-08): temperature, wind, cloud and the freezing
   level are the reading AT the hour; rain, snow, the chance of precipitation and the 10 m GUST are the
   sum / probability / maximum of the hour BEFORE it. Each box names its own period.
   WHAT IT CANNOT SAY: mountain models run low in strong wind (HRRR over Wyoming and Colorado: large
   negative bias at the strongest speeds), so a quiet hour is not a promise; NWS wind chill assumes wind at
   5 ft and no sun, and is fed the 10 m wind (colder, the safe way); NWS publishes no CAPE cut for
   thunderstorms, so "possible" is the strongest word a CAPE hour gets and nothing here says "safe". */
function HourByHour({ fc, day, dayLabel, pt, floor, legs, snowLegs }) {
  const h = fc.hourly;
  const found = localDays(fc).find(function (d) { return d.date === day.date; });
  const endT = day.sunset != null ? day.sunset + 3600 : null;
  const idx = (found ? found.hours : []).filter(function (i) { return localHour(fc, i) >= 3 && (endT == null ? localHour(fc, i) <= 21 : h.time[i] <= endT); });
  const [sel, setSel] = useState(null);
  if (!idx.length) return null;
  const kt = [];
  if (day.sunrise != null) kt.push({ at: day.sunrise, label: "Sunrise", tone: C.yellow });
  if (day.start && !(legs && legs.floor)) {
    const st = floorQ(day.start.at), sd = new Date(st * 1000 + (fc.utc_offset_seconds || 0) * 1000).toISOString().slice(0, 10);
    kt.push({ at: st, label: (legs.fromCamp ? "Leave camp by" : "Start by"), after: sd !== day.date ? " (the night before)" : "", tone: C.green });
  }
  if (snowLegs && day.softAt != null && !day.noFreeze) kt.push({ at: day.softAt, label: (floor ? "Snow at " + uElev(floor.ft) : "Snow") + " starts to soften", tone: C.amber });
  if (day.thunder) kt.push({ at: day.thunder.at, label: day.thunder.likely ? "Thunderstorms in the forecast from" : "Thunderstorms possible from", tone: C.red });
  if (day.sunset != null) kt.push({ at: day.sunset, label: "Sunset", tone: C.yellow });
  kt.sort(function (a, b) { return a.at - b.at; });
  const marksIn = function (T) { return kt.filter(function (k) { return k.at >= T && k.at < T + 3600; }); };
  const startI = day.start && !(legs && legs.floor) ? idx.find(function (i) { const st = floorQ(day.start.at); return st >= h.time[i] && st < h.time[i] + 3600; }) : null;
  const firstDay = idx.find(function (i) { return !h.is_day || h.is_day[i] === 1; });
  const cur = sel != null && idx.indexOf(sel) >= 0 ? sel : (startI != null ? startI : (firstDay != null ? firstDay : idx[0]));
  const v = function (k, i) { return h[k] && typeof h[k][i] === "number" && isFinite(h[k][i]) ? h[k][i] : null; };
  const sev = function (i) {
    const g = v("wind_gusts_10m", i), code = v("weather_code", i);
    if ((g != null && g >= LIMITS.gustWarn) || (code != null && code >= 95)) return C.red;
    if ((g != null && g >= LIMITS.gustCaution) || (day.thunder && h.time[i] >= day.thunder.at && h.time[i] < day.thunder.at + 3600)) return C.amber;
    return null;
  };
  const T = h.time[cur], hr = localHour(fc, cur), t = v("temperature_2m", cur), w = v("wind_speed_10m", cur), g = v("wind_gusts_10m", cur), dir = v("wind_direction_10m", cur);
  const vis = v("visibility", cur), lowc = v("cloud_cover_low", cur);
  const pop = v("precipitation_probability", cur), pr = v("precipitation", cur), sn = v("snowfall", cur), fl = v("freezing_level_height", cur), cl = v("cloud_cover", cur), code = v("weather_code", cur);
  const wc = t != null && w != null ? windChillF(t, w) : null, chilled = wc != null && t != null && t - wc >= 5;
  const tops = pt.elevFt;
  const marks = marksIn(T);
  return <div style={BOX}>
    <CardHead style={{ marginBottom: 8 }}>{"HOUR BY HOUR · " + dayLabel.toUpperCase()}</CardHead>
    <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5, marginBottom: 8 }}>{"Key times for this day, then each hour at " + (tops != null ? uElev(tops) : "the forecast point") + ". Tap an hour."}</div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>{kt.map(function (k, j) { return <span key={j} style={{ fontSize: 12, fontWeight: 700, color: C.text, background: C.surface, border: "1px solid " + k.tone + "99", borderRadius: 20, padding: "4px 10px", lineHeight: 1.3 }}>{k.label + " " + clockOf(fc, k.at) + (k.after || "")}</span>; })}</div>
    <div role="group" aria-label="Pick an hour" style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 6, marginBottom: 8 }}>{idx.map(function (i) {
      const on = i === cur, sv = sev(i), mk = marksIn(h.time[i]).length;
      return <button key={h.time[i]} onClick={function () { setSel(i); }} aria-pressed={on} aria-label={clockHr(localHour(fc, i)) + (sv === C.red ? ", strong wind or thunderstorm in the forecast" : sv ? ", caution" : "") + (mk ? ", a key time falls in this hour" : "")} style={{ flex: "0 0 auto", minWidth: 58, padding: "8px 8px 6px", borderRadius: 8, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : "transparent", color: on ? C.blue : C.textSub, fontSize: 12, fontWeight: on ? 800 : 600, cursor: "pointer" }}>
        {clockHr(localHour(fc, i))}
        <span style={{ display: "block", height: 8, lineHeight: "8px", marginTop: 2 }}>{sv ? <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: sv, margin: "0 1.5px" }} /> : null}{mk ? <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 2, background: C.blue, margin: "0 1.5px" }} /> : null}</span>
      </button>;
    })}</div>
    <div aria-live="polite">
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{dayLabel + " · " + clockHr(hr)}{cl != null ? <span style={{ fontSize: 12, fontWeight: 600, color: C.textMuted }}>{"  ·  cloud " + Math.round(cl) + "%"}</span> : null}</div>
      {marks.length ? <div style={{ fontSize: 12, color: C.text, marginTop: 3 }}>{marks.map(function (k) { return k.label + " " + clockOf(fc, k.at) + (k.after || ""); }).join(" · ")}</div> : null}
      {code != null && code >= 95 ? <div style={{ fontSize: 12.5, fontWeight: 700, color: C.red, marginTop: 3 }}>Thunderstorms in the forecast this hour</div> : null}
      <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, margin: "3px 0 8px" }}>{"Temperature, wind and the freezing level are the reading at " + clockHr(hr) + ". Gusts, rain, snow and chance of precipitation cover the hour before it, " + spanEnding(hr) + "."}</div>
      <TileGrid>
        <Tile label="Temperature" when={"at " + clockHr(hr)} value={t != null ? uTemp(t) : NOT_MEASURED} sub={chilled ? "Wind chill " + uTemp(wc) : null} tone={wc != null && wc <= LIMITS.windChillWarn ? C.red : null} />
        <Tile label="Wind" when={"at " + clockHr(hr)} value={w != null ? uWind(w) : NOT_MEASURED} sub={dir != null ? "from the " + compass(dir) : null} />
        <Tile label="Gusts" when={spanEnding(hr)} value={g != null ? uWind(g) : NOT_MEASURED} tone={g != null && g >= LIMITS.gustWarn ? C.red : g != null && g >= LIMITS.gustCaution ? C.amber : null} sub={g == null ? null : g >= LIMITS.gustWarn ? "past the " + uWind(LIMITS.gustWarn) + " warning line" : g >= LIMITS.gustCaution ? "past the " + uWind(LIMITS.gustCaution) + " caution line" : "strongest moment in that hour"} />
        <Tile label={sn != null && sn > 0 ? "Snow" : "Rain"} when={spanEnding(hr)} value={sn != null && sn > 0 ? uSnowfall(sn) : pr == null ? NOT_MEASURED : pr === 0 ? "None" : uPrecip(pr)} tone={(sn > 0 || pr > 0) ? C.blue : null} sub={pop != null ? pop + "% chance of precipitation" : null} />
        <Tile label="Visibility" when={"at " + clockHr(hr)} value={vis != null ? visText(vis) : NOT_MEASURED} tone={vis != null && vis < LIMITS.fogM ? C.amber : null} sub={vis == null ? null : vis < LIMITS.fogM ? "Fog: under " + uDistMi(0.621371) : vis < 2000 ? "Mist range (about 1 to 2 km)" : null} />
        <Tile label="Low cloud" when={"at " + clockHr(hr)} value={lowc != null ? Math.round(lowc) + "%" : NOT_MEASURED} sub={lowc == null ? null : "cloud in the layers up to about 3 km up; the route may sit in or above them"} />
        <Tile label="Freezing level" when={"at " + clockHr(hr)} value={fl != null ? uElev(Math.round(fl / 100) * 100) : NOT_MEASURED} sub={fl == null || tops == null ? null : "Air at " + uElev(tops) + " is " + (fl > tops ? "above" : "below") + " 0 °C" + (snowLegs && floor ? "; at the lowest snow you cross (" + uElev(floor.ft) + ") it is " + (fl > floor.ft ? "above" : "below") + " 0 °C" : "")} wide />
      </TileGrid>
    </div>
    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, marginTop: 8 }}>Forecast for the point and height named above, not a reading on the mountain. Mountain forecasts tend to run low in strong wind, so a quiet hour is not a promise. Wind chill uses the 10 m wind and assumes no sun; direct sun can offset it by 10–18 °F. A thunderstorm hour is the forecast’s, and no hour is marked safe.</div>
  </div>;
}

/* SNOWFALL AND SNOW LEVEL for the selected day. History is the forecast model's own past hours at the forecast
   point (modelled, not measured) and flags nothing: no validated "days since snowfall" cut exists, because
   instability depends on the weak layers beneath new snow and can last days to weeks. The snow level is the
   freezing level over the day's wet hours less the 500 to 1500 ft the NWS-cited studies put snow below the
   0 C line; it is a rule of thumb with its range stated, and it needs precipitation to mean anything. */
function SnowfallSection({ fc, day, dayLabel }) {
  /* `day` is the card's per-day SUMMARY (flags, start, sunrise...): it carries no `hours`. The raw local day does, so
     it is looked up by date -- passing the summary to snowLevel() crashed the whole route page (live, 2026-10-08). */
  const raw = localDays(fc).find(function (d) { return d.date === day.date; });
  const hist = snowHistory(fc, todayOf(fc)), lvl = raw ? snowLevel(fc, raw) : null;
  const when = function (n) { return n === 0 ? "today" : n === 1 ? "yesterday" : n + " days ago"; };
  return <div style={BOX}>
    <CardHead style={{ marginBottom: 8 }}>{"SNOWFALL & SNOW LEVEL · " + dayLabel.toUpperCase()}</CardHead>
    <TileGrid min={150}>
      <Tile label="Last measurable snow" when="at the forecast point" value={!hist ? NOT_MEASURED : hist.none ? "None" : when(hist.daysAgo)} sub={!hist ? null : hist.none ? "none of the last " + hist.days + " days reached 0.1 in" : new Date(hist.lastDate + "T12:00:00Z").toLocaleDateString(DLOCALE, { month: "short", day: "numeric", timeZone: "UTC" }) + " · " + uSnowfall(hist.lastIn)} />
      <Tile label={"Snow in " + (hist ? hist.days : 14) + " days"} when="modelled total" value={hist ? uSnowfall(hist.totalIn) : NOT_MEASURED} />
      <Tile label="Snow level this day" when={lvl ? "over " + lvl.wetHours + " wet hour" + (lvl.wetHours === 1 ? "" : "s") : "no precipitation forecast"} value={lvl ? uElev(Math.round(lvl.snowLo / 100) * 100) + " – " + uElev(Math.round(lvl.snowHi / 100) * 100) : "Not applicable"} sub={lvl ? "where precipitation falls as snow, from the freezing level (" + uElev(Math.round(lvl.flLo / 100) * 100) + " – " + uElev(Math.round(lvl.flHi / 100) * 100) + ") less 500 to 1,500 ft" : "a dry day has no snow line to read"} wide />
    </TileGrid>
    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, marginTop: 8 }}>The history is the forecast’s own past hours at the forecast point, not a measurement on the route, and a day counts only at 0.1 in or more (the weather service’s “measurable”). How long ago it snowed does not tell you how stable the snow is: that depends on the layers beneath it, for days to weeks. The snow level is a rule of thumb, lower in heavy precipitation, and falls where it is raining or snowing only.</div>
  </div>;
}

/* STREAM FLOW near the trailhead: what the nearest gauge measured in the last 24 hours, never a verdict.
   (lib/streams.js has the limits: stage vs a fitted discharge, the cross-section at the gauge, the 10 to 20
   ft²/s depth-times-speed range at which adults lose their footing, snowmelt peaking in the warm hours.) */
function StreamsSection({ pt, base }) {
  const [st, setSt] = useState(null), [tries, setTries] = useState(0);
  const at = base || pt;
  useEffect(function () {
    let live = true; setSt(null);
    fetchGaugeSites(at.lat, at.lng).then(function (rdb) {
      const g = nearestGauge(parseSites(rdb), at.lat, at.lng, 25);
      if (!g) return { none: true };
      return fetchGaugeFlow(g.no).then(function (j) { return { g: g, f: flowReading(j) }; });
    }).then(function (r) { if (live) setSt(r); }, function () { if (live) setSt({ error: true }); });
    return function () { live = false; };
  }, [at.lat, at.lng, tries]);
  const where = base && base.name ? base.name : "the forecast point";
  const f = st && st.f;
  return <div>
    <CardHead style={HEAD}>Stream flow near the approach</CardHead>
    {!st ? <div style={{ fontSize: 12.5, color: C.textMuted }}>Loading stream flow…</div>
      : st.error ? <div><div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.5 }}>Couldn’t load stream gauges, so stream flow is not measured. This is not a report that streams are low.</div><button onClick={function () { setTries(tries + 1); }} style={RETRY}>Try again</button></div>
      : st.none ? <div style={MUTED}>{"No stream gauge within " + uDistMi(25 / 1.60934) + " of " + where + ", so stream flow is not measured here. This is not a report that streams are low."}</div>
      : !f ? <div style={MUTED}>{"The nearest gauge, " + titleCase(st.g.name) + " (" + uDistMi(st.g.km / 1.60934) + " away), has no current reading."}</div>
      : <div>
        <div style={{ fontSize: 12.5, color: C.text, marginBottom: 6 }}>{titleCase(st.g.name) + " · " + uDistMi(st.g.km / 1.60934) + " from " + where}</div>
        {f.flags.length ? <div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.5 }}>{"The gauge marks its current reading as " + f.flags.join(", ") + ", so no number is shown."}</div>
          : <TileGrid min={150}>
            <Tile label={f.kind === "stage" ? "Water level now" : "Flow now"} when={"at " + f.now.clock} value={flowText(f.now.v, f.kind)} sub={f.provisional ? "provisional: not yet reviewed" : null} />
            <Tile label="Last 3 hours" when="trend" value={f.trend ? f.trend[0].toUpperCase() + f.trend.slice(1) : NOT_MEASURED} sub={f.pct != null ? (f.pct > 0 ? "+" : "") + Math.round(f.pct) + "% (under " + 10 + "% reads steady)" : null} />
            <Tile label="Highest, last 24 h" when={f.hi.day + " at " + f.hi.clock} value={flowText(f.hi.v, f.kind)} />
            <Tile label="Lowest, last 24 h" when={f.lo.day + " at " + f.lo.clock} value={flowText(f.lo.v, f.kind)} />
          </TileGrid>}
      </div>}
    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, marginTop: 8 }}>{"A gauge reads the stream at the gauge, which may be a different stream from the one you cross, and it cannot see the depth or speed at your crossing. Whether a person can stand in water depends on depth times speed: adults lose their footing at about " + (uImp() ? "10 to 20 ft²/s" : "0.9 to 1.9 m²/s") + ", and no flow figure is safe for every crossing. Streams fed by snow melt rise in the warm hours and drop overnight, so cross early, and check it yourself before you commit."}</div>
  </div>;
}

/* REPORT FRESHNESS: how recent the newest trip report here is. Conditions change, so the age of the latest word
   is itself a fact worth stating. A failed read of the reports is not "no reports". */
export function reportFreshness(activity, nowMs) {
  const now = nowMs != null ? nowMs : Date.now();
  const ds = (activity || []).map(function (a) { return a && a.date ? Date.parse(String(a.date).slice(0, 10) + "T12:00:00Z") : NaN; }).filter(function (t) { return isFinite(t); }).sort(function (a, b) { return b - a; });
  if (!ds.length) return null;
  return { newest: ds[0], daysAgo: Math.max(0, Math.round((now - ds[0]) / 864e5)), last14: ds.filter(function (t) { return t >= now - 14 * 864e5; }).length, total: ds.length };
}
function ReportFreshness({ activity, unavailable }) {
  const fr = reportFreshness(activity);
  return <div style={{ marginTop: 14 }}><CardHead style={HEAD}>How recent the reports are</CardHead>
    {unavailable && !fr ? <div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.5 }}>Couldn’t load the trip reports, so how recent they are is not known. This is not a report that there are none.</div>
      : !fr ? <div style={MUTED}>No trip report is on file for this climb, so nothing recent is known about its conditions.</div>
      : <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>{"Newest report: " + new Date(fr.newest).toLocaleDateString(DLOCALE, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) + " (" + (fr.daysAgo === 0 ? "today" : fr.daysAgo === 1 ? "yesterday" : fr.daysAgo + " days ago") + "). " + fr.last14 + " in the last 14 days, " + fr.total + " on file."}</div>}
  </div>;
}

/* WEATHER ALERTS for the selected day: each alert exactly as issued (its event name, severity and window), and
   its WHAT line verbatim in the units it was issued in -- not paraphrased, because a paraphrase of a wind speed
   is a wrong wind speed. Outside the US nothing is checked, and it says so; a failed read is "not measured";
   a day with no alert says that none is not an all-clear. */
function AlertsSection({ day, dayLabel, alerts, fc, onRetry }) {
  const list = alerts && alerts.data && !alerts.data.outside ? alertsForDay(normAlerts(alerts.data), day.date, fc.utc_offset_seconds) : [];
  return <div style={BOX}>
    <CardHead style={{ marginBottom: 8 }}>{"WEATHER ALERTS · " + dayLabel.toUpperCase()}</CardHead>
    {!alerts ? <div style={{ fontSize: 12.5, color: C.textMuted }}>Loading weather alerts…</div>
      : alerts.error ? <div><div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.5 }}>Couldn’t load weather alerts, so they are not measured. This is not a report of none.</div><button onClick={onRetry} style={RETRY}>Try again</button></div>
      : alerts.data.outside ? <div style={MUTED}>Weather alerts are only checked for places in the United States. Nothing was checked for this route.</div>
      : !list.length ? <div style={MUTED}>{"No weather alert is in effect for this area " + (dayLabel === "Today" ? "today" : "on " + dayLabel) + "."}</div>
      : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{list.map(function (a, i) {
        const col = alertLevel(a) === "warn" ? C.red : C.amber;
        return <div key={a.id + i} style={{ background: C.surface, border: "1px solid " + col + "77", borderRadius: 10, padding: "9px 11px" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: col }}>{a.event}</div>
          <div style={{ fontSize: 12, color: C.text, marginTop: 2 }}>{windowLabel(fc, a)}</div>
          <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>{[a.severity + " severity", a.urgency, a.certainty].filter(Boolean).join(" · ")}</div>
          {a.what ? <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5, marginTop: 5 }}>{"As issued: " + a.what}</div> : null}
        </div>;
      })}</div>}
    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, marginTop: 8 }}>An alert covers a whole forecast zone, which can be much larger than the route and span very different heights, so it may not describe the route itself. Alerts are issued only a day or two ahead: a day with none is not an all-clear.{list.length ? " The wording above is kept in the units it was issued in." : ""}</div>
  </div>;
}

/* AIR QUALITY for the selected day. The crag card has had this since the conditions score; the alpine card
   had none, and wildfire smoke is a first-order reason to change a plan in the West. A day the forecast
   does not reach says so; a failed read says "not measured" and offers a retry, never "clean air". */
function AirSection({ day, dayLabel, air, onRetry }) {
  const a = day.aqi;
  const tone = a ? (a.max > LIMITS.aqiWarn ? C.red : a.max > LIMITS.aqiCaution ? C.amber : a.max > 50 ? C.yellow : C.green) : null;
  return <div style={BOX}>
    <CardHead style={{ marginBottom: 8 }}>{"AIR QUALITY · " + dayLabel.toUpperCase()}</CardHead>
    {!air ? <div style={{ fontSize: 12.5, color: C.textMuted }}>Loading air quality…</div>
      : air.error ? <div><div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.5 }}>Couldn’t load air quality, so smoke is not measured. This is not a clean-air reading.</div><button onClick={onRetry} style={RETRY}>Try again</button></div>
      : !a ? <div style={MUTED}>The air-quality forecast does not reach this day (it runs about five days), so smoke is not measured for it.</div>
      : <TileGrid>
        <Tile label="Worst hour's US AQI" when={"around " + clockOf({ utc_offset_seconds: air.data.utc_offset_seconds || 0 }, a.at)} value={Math.round(a.max)} tone={tone} sub={aqiWord(a.max)} />
        <Tile label="Fine smoke (PM2.5)" when="at that hour" value={a.pm != null ? Math.round(a.pm) + " µg/m³" : NOT_MEASURED} sub={a.pm != null ? "24-hour average basis" : null} />
      </TileGrid>}
    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, marginTop: 8 }}>A forecast for the whole area on a coarse grid (about 45 km, 11 km in Europe), not a reading at the route: smoke pooled in a valley or drifting above the route is not seen. Particles are averaged over the preceding 24 hours, so a plume’s arrival and clearing show up late. Look at the sky and a local air-quality station before you go. Flagged above AQI 100 (EPA: unhealthy for sensitive groups) and 150 (unhealthy for everyone).</div>
  </div>;
}

/* SUN AND SHADE — when the sun reaches the route's own pins, from the terrain (lib/terrainShade.js).
   Research, 2026-10-08: rockfall, icefall and wet slides start when the sun reaches the slopes ABOVE
   a party, so the advice everywhere is to work back from sun arrival (Torreys Peak couloir accident,
   AAC; Mont Blanc's Goûter couloir monitoring, where the safe hour is specific to each couloir;
   Portland Mountain Rescue; a Devil's Kitchen report where rime let go as the sun hit the walls).
   Wet loose snow follows the sun round the aspects — east first, west in the warm afternoon — and
   centres put the slope that lets go at about 35° (STEEP_DEG). What the sun does differs by kind,
   so each gets its own line; every one is a rule of thumb. Not scored, and it moves no start time:
   the start stays the Planner's, counted back from the snow and the storms. */
const SUN_NOTE = {
  glacier: "Rock, ice and wet snow start to move once the sun reaches the slopes above you, not just where you stand — be past steep sunlit ground before the sun gets to it.",
  alpineice: "Ice and rock let go once the sun reaches the face and the slopes above it — be off the line before the sun gets there.",
  waterfall: "Sun on the ice, or on snow above it, loosens both — even while you climb in shade.",
  cragmixed: "Sun strips rime and softens turf; mixed ground in shade keeps its ice longer.",
  scramble: "Sun dries wet rock and melts thin ice; rock in shade stays wet or icy longer.",
  alpinerock: "On a cold day a face in sun is warmer to climb; one in shade stays cold, and keeps any verglas.",
};
const SUN_PINS = [["Summit", "Summit"], ["Topout", "Top"], ["Base", "Base"], ["Campsite", "High camp"]];
export function sunPins(route) {
  const wps = (route.waypoints || []).filter(wpPlaced), out = [];
  SUN_PINS.forEach(function (sp) {
    let ws = wps.filter(function (w) { return wpIs(w, sp[0]); });
    if (!ws.length) return;
    // The highest camp is the one a summit day leaves from.
    if (sp[0] === "Campsite") ws = ws.slice().sort(function (a, b) { return (+b.elev || 0) - (+a.elev || 0); });
    if (sp[0] === "Topout" && out.some(function (p) { return p.key === "Summit"; })) return;
    // A summit is read at the terrain's own high point beside the pin (lib/terrainShade.js highestNear).
    out.push({ key: sp[0], label: sp[1], lat: +ws[0].lat, lng: +ws[0].lng, top: sp[0] === "Summit" });
  });
  return out;
}
/* What the start needs to count in sun on the face: the summit (or top-out) pin, the way the face
   looks (`aspect`, one direction), and the height the push starts from (the highest camp on a
   multi-day route, else the trailhead's, which errs early). `missing` names what isn't on file — measured 2026-10-08,
   1 of ~935 snow/ice routes has a base pin, so the face is read from the top. Glacier and alpine ice
   only; null for every other kind. */
const SUN_FACE = /\b(face|couloir|gully|chute|glacier|headwall|wall|bowl|icefall|ice ?fall|gulch|chimney|slabs?)\b/i, SUN_RIDGE = /\b(ridge|ar[eê]te|buttress|spur|cleaver|traverse)\b/i;
export function sunFace(route, kind, pt, fromCamp) {
  if (kind !== "glacier" && kind !== "alpineice") return null;
  const pins = sunPins(route), top = pins.find(function (p) { return p.key === "Summit" || p.key === "Topout"; });
  const deg = faceBearing(route.aspect);
  const ht = function (t) { return (route.waypoints || []).filter(function (w) { return wpIs(w, t) && w.elev != null && w.elev !== "" && isFinite(+w.elev); }).map(function (w) { return +w.elev; }); };
  const thFt = ht("Trailhead").length ? ht("Trailhead")[0] : null, camps = ht("Campsite");
  // A camp's height, placed or not; with none on file, the trailhead's: LOWER, so the start errs early.
  const fromFt = fromCamp && camps.length ? Math.max.apply(null, camps) : thFt;
  if (!top) return { missing: "summit" };
  // A RIDGE has almost nothing draining onto its crest: what sheds off either flank falls away from
  // it, so the fall line down one side is not the route (78 of the 325 routes with a summit pin and
  // an aspect, 2026-10-08). A name that also says face, couloir, gully or glacier is read as that.
  if (SUN_RIDGE.test(route.name || "") && !SUN_FACE.test(route.name || "")) return { missing: "ridge" };
  if (deg == null) return { missing: "aspect" };
  if (fromFt == null) return { missing: "from" };
  return { top: top, deg: deg, fromFt: fromFt, ctr: pins.find(function (p) { return p.key === "Base"; }) || top };
}
function SunShadeSection({ route, kind, terrain, pt, fc, day, isToday }) {
  const pins = useMemo(function () { return sunPins(route); }, [route]);
  if (!pt || !day || day.sunrise == null || day.sunset == null) return null;
  // The terrain is centred on the CLIMB: its base, else its top, else the forecast point.
  const ctr = pins.find(function (p) { return p.key === "Base"; }) || pins.find(function (p) { return p.key === "Summit" || p.key === "Topout"; }) || pt;
  const rise = day.sunrise * 1000, set = day.sunset * 1000, now = Date.now();
  const at0 = isToday && now >= rise && now <= set ? now : Math.min(set, rise + 3 * 3600e3);
  const steep = kind === "glacier" || kind === "alpineice" || kind === "waterfall" || kind === "cragmixed" || hasSnowLegs(kind, terrain);
  return <div style={BOX}>
    <CardHead style={{ marginBottom: 6 }}>SUN AND SHADE</CardHead>
    <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5, marginBottom: 8 }}>{SUN_NOTE[kind] + " A rule of thumb."}</div>
    <ShadeMap lat={ctr.lat} lng={ctr.lng} pins={pins.length ? pins : null} steep={steep} place={pins.length ? "climb" : "area"} rise={rise} set={set} at0={at0} dayKey={day.date} clock={function (u) { return clockOf(fc, Math.round(u / 1000)); }} C={C} />
  </div>;
}

const HEAD = { marginBottom: 6 };
const dangerCol = function (d) { return d >= 4 ? C.red : d === 3 ? C.orange : d === 2 ? C.yellow : C.green; };

/* AVALANCHE TODAY. Off season, no rating published, outside every zone and a failed read are four
   different answers and none of them is "low": each says which it is. The centre is not named (no
   source credits on screen); the zone is, and its full forecast is one tap away. */
function AvalancheSection({ pt }) {
  const [st, setSt] = useState(null), [tries, setTries] = useState(0);
  useEffect(function () {
    let live = true; setSt(null);
    fetchAvyMap().then(function (map) {
      const z = zoneFor(map, pt.lat, pt.lng);
      if (!z) return avyReading(null, null);
      // The zone's band forecast failing still leaves the map's own overall rating to read.
      return fetchAvyProduct(z.properties.center_id, z.id).then(function (p) { return avyReading(z, p); }, function () { return avyReading(z, null); });
    }).then(function (r) { if (live) setSt({ r }); }, function () { if (live) setSt({ error: true }); });
    return function () { live = false; };
  }, [pt.lat, pt.lng, tries]);
  const head = <CardHead style={HEAD}>Avalanche today</CardHead>;
  if (!st) return <div aria-busy="true">{head}<div style={{ ...MUTED, color: C.textMuted }}>Loading the avalanche forecast…</div></div>;
  if (st.error) return <div>{head}<div style={{ ...MUTED, color: C.amber }}>Couldn’t load the avalanche forecast. This is not a rating.</div><button onClick={function () { setTries(tries + 1); }} style={RETRY}>Try again</button></div>;
  const r = st.r, link = r.link ? <a href={r.link} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 4, color: C.blue, fontSize: 12, fontWeight: 700 }}>Full avalanche forecast ↗</a> : null;
  if (r.kind === "outside") return <div>{head}<div style={MUTED}>This climb is outside the avalanche forecast zones the app reads. That is not a rating — check the local forecast before you go.</div></div>;
  if (r.kind === "off") return <div>{head}<div style={MUTED}>{"No avalanche forecast is being issued for " + (r.zone || "this zone") + " right now (off season). That is not a rating — snow can still slide."}</div>{link}</div>;
  if (r.kind === "none") return <div>{head}<div style={MUTED}>{"No danger rating is published for " + (r.zone || "this zone") + " today. That is not a rating."}</div>{link}</div>;
  const pill = function (lbl, d) { return <div key={lbl} style={{ background: C.surface, borderRadius: 8, padding: "6px 8px" }}><div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 700 }}>{lbl}</div><div style={{ fontSize: 12.5, fontWeight: 800, color: d ? dangerCol(d) : C.textMuted }}>{d ? d + " · " + DANGER_NAME[d] : "—"}</div></div>; };
  return <div>{head}
    <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5, marginBottom: 6 }}><b style={{ color: dangerCol(r.max) }}>{(r.max >= 3 ? "Warning: " : "") + "Up to " + DANGER_NAME[r.max]}</b>{" in " + (r.zone || "this zone") + " today" + (r.kind === "bands" ? " — the highest of the three elevation bands, since a climb usually crosses them." : ".")}</div>
    {r.kind === "bands" ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 2 }}>{pill("Above treeline", r.today.upper)}{pill("Near treeline", r.today.middle)}{pill("Below treeline", r.today.lower)}</div> : null}
    {link}
  </div>;
}

/* SNOW ON THE GROUND at the nearest snow station within 30 km. One point, usually far below the
   route -- the section says how far away and how much lower, every time. */
function SnowSection({ pt }) {
  const [st, setSt] = useState(null), [tries, setTries] = useState(0);
  useEffect(function () {
    let live = true; setSt(null);
    fetchSnotelStations().then(function (s) {
      const n = nearestStation(s, pt.lat, pt.lng, 30);
      if (!n) return { none: true };
      return fetchSnotelDepth(n.id).then(function (v) { return { st: n, r: snowReading(v) }; });
    }).then(function (x) { if (live) setSt(x); }, function () { if (live) setSt({ error: true }); });
    return function () { live = false; };
  }, [pt.lat, pt.lng, tries]);
  const head = <CardHead style={HEAD}>Snow on the ground</CardHead>;
  if (!st) return <div aria-busy="true">{head}<div style={{ ...MUTED, color: C.textMuted }}>Loading the nearest snow station…</div></div>;
  if (st.error) return <div>{head}<div style={{ ...MUTED, color: C.amber }}>Couldn’t load the snow station. This says nothing about the snow.</div><button onClick={function () { setTries(tries + 1); }} style={RETRY}>Try again</button></div>;
  if (st.none) return <div>{head}<div style={MUTED}>No snow station within 30 km of this climb.</div></div>;
  const s = st.st, r = st.r, below = pt.elevFt != null && s.elevFt != null ? pt.elevFt - s.elevFt : null;
  const where = "Snow station " + (s.km < 1 ? "under 1 km" : Math.round(s.km) + " km") + " away at " + uElev(s.elevFt) + (below != null && below > 300 ? ", " + uElev(Math.round(below / 100) * 100) + " below the top of this climb" : "");
  if (!r) return <div>{head}<div style={MUTED}>{where + ". It has not reported this week."}</div></div>;
  const ch = function (d, w) { return d == null ? null : (d > 0 ? "+" : d < 0 ? "−" : "±") + uSnowfall(Math.abs(d)) + " " + w; };
  const stale = Date.now() - Date.parse(r.date + "T12:00:00Z") > 2.5 * 864e5;
  return <div>{head}
    <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5 }}><b>{uSnowfall(r.depth) + " on the ground"}</b>{[ch(r.d24, "in a day"), ch(r.d7, "in a week")].filter(Boolean).map(function (x) { return " · " + x; }).join("")}</div>
    <div style={MUTED}>{where + "." + (stale ? " Last reported " + new Date(r.date + "T12:00:00Z").toLocaleDateString(DLOCALE, { month: "short", day: "numeric", timeZone: "UTC" }) + "." : "")}</div>
  </div>;
}

/* SEASON AT THE TOP: five years of monthly averages read at the top of the climb -- high and low,
   and snowfall (or wet days in a month with little snow). A guide to the season, never a forecast,
   and the section says where it was read every time. */
function SeasonSection({ pt }) {
  const [st, setSt] = useState(null), [tries, setTries] = useState(0);
  useEffect(function () {
    let live = true; setSt(null);
    fetchAlpineClimate(pt.lat, pt.lng, pt.elevFt).then(function (m) { if (live) setSt({ m }); }, function () { if (live) setSt({ error: true }); });
    return function () { live = false; };
  }, [pt.lat, pt.lng, pt.elevFt, tries]);
  const head = <CardHead style={HEAD}>Season at the top</CardHead>;
  if (!st) return <div aria-busy="true">{head}<div style={{ ...MUTED, color: C.textMuted }}>Loading the climate at the top…</div></div>;
  if (st.error) return <div>{head}<div style={{ ...MUTED, color: C.amber }}>Couldn’t load the climate. This says nothing about the season.</div><button onClick={function () { setTries(tries + 1); }} style={RETRY}>Try again</button></div>;
  const m = st.m, now = new Date().getMonth();
  const name = function (i) { return new Date(Date.UTC(2026, i, 15)).toLocaleDateString(DLOCALE, { month: "short", timeZone: "UTC" }); };
  return <div>{head}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 4, marginBottom: 6 }}>{m.months.map(function (x, i) {
      const wet = x.snow != null && x.snow >= 1 ? uSnowfall(x.snow) + " snow" : Math.round(x.wetDays) + " wet d";
      return <div key={i} aria-current={i === now ? "date" : undefined} style={{ background: C.surface, border: "1px solid " + (i === now ? C.blue : "transparent"), borderRadius: 7, padding: "5px 4px", textAlign: "center", minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 700 }}>{name(i)}</div>
        <div style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>{uTemp(x.hi)}<span style={{ color: C.textMuted, fontWeight: 500 }}>{"/" + uTemp(x.lo)}</span></div>
        <div style={{ fontSize: 10, color: C.textSub, overflowWrap: "anywhere" }}>{wet}</div>
      </div>;
    })}</div>
    <div style={MUTED}>{"Averages for " + m.years + " at " + (pt.elevFt != null ? uElev(pt.elevFt) + ", the top of this climb" : "the area’s height") + " — a guide to the season, not a forecast."}</div>
  </div>;
}

/* RECENT OUTCOMES: what parties who reported here in the last 60 days did -- summited, attempted or
   turned around, and why, read straight from their reports (tick type, outcome reasons, note).
   Nothing is inferred, and with no such report the section is absent rather than "no one summited". */
export function recentOutcomes(activity, nowMs) {
  const cut = (nowMs != null ? nowMs : Date.now()) - 60 * 864e5;
  return (activity || []).filter(function (a) { return a && /^(Summit|Attempt|Turned around)$/.test(a.tickType || "") && a.date && Date.parse(String(a.date).slice(0, 10) + "T12:00:00Z") >= cut; })
    .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
}
function OutcomesSection({ activity }) {
  const rows = recentOutcomes(activity);
  if (!rows.length) return null;
  const up = rows.filter(function (a) { return a.tickType === "Summit"; }).length;
  return <div style={{ marginTop: 14 }}><CardHead style={HEAD}>Recent outcomes</CardHead>
    <div style={{ fontSize: 12.5, color: C.text, marginBottom: 4 }}>{up + " of " + rows.length + " report" + (rows.length === 1 ? "" : "s") + " in the last 60 days summited."}</div>
    {rows.slice(0, 4).map(function (a, i) {
      const back = a.tickType !== "Summit", why = back && Array.isArray(a.outcomeReasons) && a.outcomeReasons.length ? " — " + a.outcomeReasons.join(", ") : "";
      return <div key={(a._dbId || a.id || "") + "-" + i} style={{ fontSize: 12, color: C.textSub, lineHeight: 1.45 }}>{new Date(String(a.date).slice(0, 10) + "T12:00:00Z").toLocaleDateString(DLOCALE, { month: "short", day: "numeric", timeZone: "UTC" }) + " · "}<b style={{ color: back ? C.amber : C.green }}>{back ? a.tickType : "Summited"}</b>{why}{back && a.outcomeNote ? ": " + String(a.outcomeNote).slice(0, 140) : ""}</div>;
    })}
  </div>;
}
