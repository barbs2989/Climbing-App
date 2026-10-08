// The Conditions tab for alpine, mountaineering, scrambling, ice and mixed routes: route-aware FLAGS
// and a start time, never a score (owner decision 2026-10-07). The judgement lives in
// lib/alpineConditions.js; this file only fetches, picks the day and words the flags in the
// climber's own units. The crag score (ConditionsScoreCard) is a different card for different
// disciplines -- the two never render on one route.
import { useState, useEffect, useMemo } from "react";
import { C, CardHead, uTemp, uTempDelta, uWind, uSnowfall, uPrecip, uElev, wpIs, wpPlaced, catOf } from "../ClimbMatchCore.jsx";
import { fetchAlpineForecast, fetchAlpineClimate, fetchAlpineSpread } from "./forecast.js";
import { condKind, hasSnowLegs, localDays, dayFlags, daySummary, todayOf, snowFloorFt, LIMITS, modelSpread } from "./alpineConditions.js";
import { routeTerrain } from "./terrain.js";
import { planTimes } from "./planTimes.js";
import { isMultiDayOuting } from "./outing.js";
import { fetchAvyMap, zoneFor, fetchAvyProduct, avyReading, DANGER_NAME } from "./avalanche.js";
import { fetchSnotelStations, nearestStation, fetchSnotelDepth, snowReading } from "./snotel.js";
import ShadeMap from "./ShadeMap.jsx";

const _alpWx = {}, _alpSp = {};
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
    case "wind": return "Summit gusts to " + uWind(v.gust);
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

export default function AlpineConditionsCard({ route, mtn, calc, activity }) {
  const terrain = useMemo(function () { return routeTerrain(route); }, [route]);
  const kind = condKind(route, terrain, catOf(route));
  const pt = useMemo(function () { return forecastPoint(route, mtn); }, [route, mtn]);
  if (!kind) return null;
  /* Avalanche danger unless the route's own data rules avalanche terrain out (terrain.avalanche
     "no": a dry rock scramble). "unknown" still shows it -- suppression needs evidence. */
  const avyOn = terrain.avalanche !== "no";
  return <div>
    <ForecastBox route={route} calc={calc} kind={kind} terrain={terrain} pt={pt} />
    {pt ? <div style={BOX}>
      {avyOn ? <AvalancheSection pt={pt} /> : null}
      <div style={{ marginTop: avyOn ? 14 : 0 }}><SnowSection pt={pt} /></div>
      <OutcomesSection activity={activity} />
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
  useEffect(function () { setDayI(0); }, [route.id]);

  /* The legs the start counts back from: the Planner's own estimate, at the Planner's own inputs. A
     multi-day route starts its summit day at camp, so it climbs the summit leg and comes back down
     to camp (0.69 of the way up -- the catalog's own complete rows). */
  const P = planTimes(route, calc || {});
  const fromCamp = isMultiDayOuting(route) && (P.hasPublishedSummitH || P.hasDerivedSummitH);
  const legs = { up: fromCamp ? P.techH : P.hikeH + P.techH, down: P.downH, fromCamp, floor: P.legsFloor || P.publishedIsWholeDay };
  const snowLegs = hasSnowLegs(kind, terrain);
  const floor = snowLegs ? snowFloorFt(route, pt && pt.campFt) : null;

  const model = useMemo(function () {
    if (!wx || !wx.data || !kind) return null;
    const fc = wx.data, days = localDays(fc), today = todayOf(fc);
    const out = [];
    days.forEach(function (d, k) {
      if (d.date < today) return;
      let r = dayFlags(fc, days, k, { kind, terrain, highFt: pt.elevFt, snowFt: floor ? floor.ft : null, legs });
      const ms = sp ? modelSpread(sp, d.date) : null;
      if (ms && ms.over.length) r = Object.assign({}, r, { flags: r.flags.concat([{ key: "models-disagree", level: "caution", v: ms }]) });
      out.push(Object.assign({ date: d.date, sum: daySummary(fc, d), sunrise: d.sunrise, sunset: d.sunset }, r));
    });
    return { fc, days: out.slice(0, 7) };
  }, [wx, sp, kind, ck, floor && floor.ft, legs.up, legs.down, legs.floor, legs.fromCamp]);

  if (!kind) return null;
  const box = { background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "12px 14px", marginBottom: 14 };
  const head = <CardHead style={{ marginBottom: 8 }}>{"CONDITIONS · " + KIND_LABEL[kind].toUpperCase()}</CardHead>;
  if (!pt) return <div style={box}>{head}<div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.55 }}>No conditions for this climb: neither it nor the area it is on has a location on file, so there is no forecast to read.</div></div>;
  if (wx && wx.error) return <div style={box}>{head}<div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.55, marginBottom: 8 }}>Couldn’t load the forecast, so no flags are shown. This is not a reading of the conditions.</div><button onClick={function () { setTries(tries + 1); }} style={{ background: C.surface, color: C.blue, border: "1px solid " + C.border, borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Try again</button></div>;
  if (!model) return <div style={box} aria-busy="true">{head}<div style={{ fontSize: 12.5, color: C.textMuted }}>Loading the forecast…</div></div>;
  const days = model.days, fc = model.fc;
  if (!days.length) return <div style={box}>{head}<div style={{ fontSize: 12.5, color: C.textSub }}>The forecast came back with no days ahead to read.</div></div>;
  const day = days[Math.min(dayI, days.length - 1)];
  const dayName = function (d, i) { return i === 0 ? "Today" : new Date(d.date + "T12:00:00Z").toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" }); };
  const nWarn = function (d) { return d.flags.filter(function (f) { return f.level === "warn"; }).length; };
  const nCaution = function (d) { return d.flags.filter(function (f) { return f.level === "caution"; }).length; };
  const dot = function (col) { return <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: col, margin: "0 1.5px" }} />; };

  let startEl = null;
  if (kind !== "waterfall" && kind !== "cragmixed") {
    if (legs.floor) {
      startEl = <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>No start time: the Plan tab’s estimate for this climb is only a minimum (part of the approach or the climbing isn’t on file), and a start counted back from a minimum would be too late.</div>;
    } else if (day.start) {
      const st = floorQ(day.start.at);
      const startDate = new Date(st * 1000 + (fc.utc_offset_seconds || 0) * 1000).toISOString().slice(0, 10);
      const daysEarly = Math.round((Date.parse(day.date) - Date.parse(startDate)) / 864e5);
      const offBy = clockOf(fc, day.start.at + legs.up * 3600), storm = day.thunder && day.thunder.likely ? "forecast" : "possible";
      const why = day.start.why === "snow"
        ? (legs.fromCamp ? "to climb " + hrs(legs.up) + " from camp and be back down by " : "to climb " + hrs(legs.up) + " and walk " + hrs(legs.down) + " back down by ") + clockOf(fc, day.softAt) + ", when the snow at " + uElev(floor.ft) + " starts to soften"
        : day.start.why === "storm-descent" ? "to reach the top (" + hrs(legs.up) + ") and start down by " + offBy + ", before the thunderstorms " + storm + " this afternoon"
        : "to be off the summit (" + hrs(legs.up) + " up) by " + offBy + ", before the thunderstorms " + storm + " this afternoon";
      startEl = daysEarly >= 2
        ? <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>{"Too long for one push: counting back from the Plan tab’s estimate puts the start " + daysEarly + " days early. Plan a camp — see the Plan tab."}</div>
        : <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{(legs.fromCamp ? "Leave camp by " : "Start by ") + clockOf(fc, st) + (daysEarly === 1 ? " the night before" : "")}</div>
          <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5, marginTop: 2 }}>{why + (P.legsStored ? ". Times are this route’s published times for a fit party (Plan tab), so a slower party should start earlier." : ". Times are the Plan tab’s estimate at its own fitness and pack.")}</div>
        </div>;
    } else if (day.noFreeze && floor) {
      startEl = <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>{"No start time from the snow: it didn’t freeze overnight at " + uElev(floor.ft) + ", so there is no frozen window to be back down in."}</div>;
    } else if (snowLegs && floor && day.softAt == null) {
      startEl = <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>{"The snow at " + uElev(floor.ft) + " stays below freezing all day — no softening deadline from the forecast."}</div>;
    }
  }

  const s = day.sum;
  const readout = [["High / low", s.hi != null ? uTemp(s.hi) + " / " + uTemp(s.lo) : "—"], ["Freezing level", s.flLo != null ? uElev(Math.round(s.flLo / 100) * 100) + "–" + uElev(Math.round(s.flHi / 100) * 100) : "—"], ["Gusts", s.gust != null ? uWind(s.gust) : "—"], ["New snow", uSnowfall(s.snow)]];
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
    {startEl ? <div style={{ background: C.surface, borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>{startEl}</div> : null}
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
      {day.flags.length ? day.flags.map(function (f, i) { const col = f.level === "warn" ? C.red : C.amber; return <div key={f.key + i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: C.text, lineHeight: 1.45 }}><span aria-hidden="true" style={{ flexShrink: 0, marginTop: 5, width: 8, height: 8, borderRadius: "50%", background: col }} /><span><b style={{ color: col }}>{f.level === "warn" ? "Warning: " : "Caution: "}</b>{flagText(f)}</span></div>; })
        : <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>Nothing in the forecast flags this day.</div>}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>{readout.map(function (r) { return <div key={r[0]} style={{ background: C.surface, borderRadius: 8, padding: "6px 8px" }}><div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 700 }}>{r[0]}</div><div style={{ fontSize: 12.5, color: C.text, fontWeight: 700 }}>{r[1]}</div></div>; })}</div>
    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>
      {"Read at " + (pt.elevFt != null ? uElev(pt.elevFt) : "the area’s height") + (pt.pinned ? " at " + pt.name : " over " + pt.name) + "." + (floor && floor.basis === "halfway" ? " Snow is assumed to reach down to " + uElev(floor.ft) + ", halfway up the climb." : floor && floor.basis === "camp" ? " Snow is read down to high camp, " + uElev(floor.ft) + "." : "") + " Flags are rules of thumb, not a go/no-go. " + BLIND[kind]}
    </div>
  </div>
  <SunShadeSection route={route} kind={kind} terrain={terrain} pt={pt} fc={fc} day={day} isToday={Math.min(dayI, days.length - 1) === 0} />
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
    <div style={MUTED}>{where + "." + (stale ? " Last reported " + new Date(r.date + "T12:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" }) + "." : "")}</div>
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
  const name = function (i) { return new Date(Date.UTC(2026, i, 15)).toLocaleDateString(undefined, { month: "short", timeZone: "UTC" }); };
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
      return <div key={(a._dbId || a.id || "") + "-" + i} style={{ fontSize: 12, color: C.textSub, lineHeight: 1.45 }}>{new Date(String(a.date).slice(0, 10) + "T12:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" }) + " · "}<b style={{ color: back ? C.amber : C.green }}>{back ? a.tickType : "Summited"}</b>{why}{back && a.outcomeNote ? ": " + String(a.outcomeNote).slice(0, 140) : ""}</div>;
    })}
  </div>;
}
