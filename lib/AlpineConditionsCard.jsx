// The Conditions tab for alpine, mountaineering, scrambling, ice and mixed routes: route-aware FLAGS
// and a start time, never a score (owner decision 2026-10-07). The judgement lives in
// lib/alpineConditions.js; this file only fetches, picks the day and words the flags in the
// climber's own units. The crag score (ConditionsScoreCard) is a different card for different
// disciplines -- the two never render on one route.
import { useState, useEffect, useMemo } from "react";
import { C, CardHead, uTemp, uTempDelta, uWind, uSnowfall, uPrecip, uElev, wpIs, wpPlaced, catOf } from "../ClimbMatchCore.jsx";
import { fetchAlpineForecast } from "./forecast.js";
import { condKind, hasSnowLegs, localDays, dayFlags, daySummary, todayOf, snowFloorFt, LIMITS } from "./alpineConditions.js";
import { routeTerrain } from "./terrain.js";
import { planTimes } from "./planTimes.js";
import { isMultiDayOuting } from "./outing.js";

const _alpWx = {};

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
    case "no-refreeze": return "No overnight freeze at " + uElev(v.ft) + " — the snow starts soft and bridges are weak";
    case "fl-above-night": return "Freezing level above the summit all night";
    case "fl-above": return "Freezing level " + uElev(Math.round(v.above / 100) * 100) + " above the summit by afternoon — expect rock and ice fall";
    case "verglas": return "Wet, then below freezing on the route — ice or snow on the holds";
    case "wet-rock": return uPrecip(v.inch) + " of rain in the last two days — wet rock climbs harder than its grade";
    case "showers": return v.pct + "% chance of rain — retreating or rappelling wet is where things go wrong";
    case "new-snow": return uSnowfall(v.inch) + " of new snow at the summit" + (v.scramble ? " — a snowed-up scramble is a winter climb" : "");
    case "wind": return "Summit gusts to " + uWind(v.gust);
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

export default function AlpineConditionsCard({ route, mtn, calc }) {
  const terrain = useMemo(function () { return routeTerrain(route); }, [route]);
  const kind = condKind(route, terrain, catOf(route));
  const pt = useMemo(function () { return forecastPoint(route, mtn); }, [route, mtn]);
  const ck = pt ? pt.lat.toFixed(3) + "," + pt.lng.toFixed(3) + "@" + (pt.elevFt != null ? Math.round(pt.elevFt) : "") : "";
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
      const r = dayFlags(fc, days, k, { kind, terrain, highFt: pt.elevFt, snowFt: floor ? floor.ft : null, legs });
      out.push(Object.assign({ date: d.date, sum: daySummary(fc, d) }, r));
    });
    return { fc, days: out.slice(0, 7) };
  }, [wx, kind, ck, floor && floor.ft, legs.up, legs.down, legs.floor, legs.fromCamp]);

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
          <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5, marginTop: 2 }}>{why + ". Times are the Plan tab’s estimate at its own fitness and pack."}</div>
        </div>;
    } else if (snowLegs && floor && day.softAt == null) {
      startEl = <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>{"The snow at " + uElev(floor.ft) + " stays below freezing all day — no softening deadline from the forecast."}</div>;
    }
  }

  const s = day.sum;
  const readout = [["High / low", s.hi != null ? uTemp(s.hi) + " / " + uTemp(s.lo) : "—"], ["Freezing level", s.flLo != null ? uElev(Math.round(s.flLo / 100) * 100) + "–" + uElev(Math.round(s.flHi / 100) * 100) : "—"], ["Gusts", s.gust != null ? uWind(s.gust) : "—"], ["New snow", uSnowfall(s.snow)]];
  return <div style={box}>
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
  </div>;
}
