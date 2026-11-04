import { useState, useEffect, useMemo } from "react";
import { fetchAlpineForecast, fetchAlpineSpread, fetchCragAir, fetchPointAlerts } from "../../lib/forecast.js";
import { planTimes } from "../../lib/planTimes.js";
import { isMultiDayOuting } from "../../lib/outing.js";
import { wholeDayLegs, hasSnowLegs, snowFloorFt, localDays, todayOf, dayFlags, modelSpread, daySummary, alertsForDay, normAlerts, alertLevel, fogHours, airDay, smokeFlag, localAt, LIMITS } from "../../lib/alpineConditions.js";
import { sunFace, groundFt, windowLabel, clockOf, floorQ, KIND_LABEL, flagText } from "../../lib/alpineConditionsShared.js";
import { catOf, C, ROUTE_GAP, DLOCALE, uElev, uTemp, uWind, uSnowfall } from "../../ClimbMatchCore.jsx";
import { shadeGrid, gridPx, highestNear, SUMMIT_SNAP_M, faceSunBands } from "../../lib/terrainShade.js";
import { loadTerrain } from "../../lib/ShadeMap.jsx";
import CardHead from "./CardHead.tsx";
import type { HourByHourFc } from "./HourByHour.tsx";
import LoadingRows from "./LoadingRows.tsx";
import DayHead from "./DayHead.tsx";
import RangeLine from "./RangeLine.tsx";
import DayByDay from "./DayByDay.tsx";
import AlertsSection from "./AlertsSection.tsx";
import HourByHour from "./HourByHour.tsx";
import SnowfallSection from "./SnowfallSection.tsx";
import AirSection from "./AirSection.tsx";
import SunShadeSection from "./SunShadeSection.tsx";

/** One flag on a day: `level` is "warn" or "caution"; `v` carries the figures flagText prints. */
export interface ForecastBoxFlag { key: string; level: string; v?: object }
/** The day sun-on-the-face read (lib/terrainShade.js faceSunBands), per date: busy, failed, or banded. */
export interface ForecastBoxFaceSun { busy?: boolean; error?: boolean; bands?: { ft: number; at: number }[]; topFt?: number; fromFt?: number }
/** One forecast day with its flags, start and summary, as the card builds it. */
export interface ForecastBoxDay {
  date: string;
  sum: ReturnType<typeof daySummary>;
  sunrise: number | null;
  sunset: number | null;
  aqi: { max: number; at: number; pm: number | null } | null;
  flags: ForecastBoxFlag[];
  /** The start counted back from the forecast; every reader tests it before reading. */
  start: { at: number; why: string; backBy: number; forecast?: { at: number } | null; sun: { ft: number; sunAt: number } };
  daysEarly: number;
  softAt: number;
  noFreeze?: boolean;
  thunder?: { at: number; likely?: boolean } | null;
  sun?: { ft: number; sunAt: number } | null;
  sunCold?: boolean;
}
/** One alert as normAlerts shapes it. */
export interface ForecastBoxAlert { event: string; severity: string; start: number | null; end: number | null }
/** A read that is loading (null), failed (`error`), or done (`data`). */
export type ForecastBoxRead<T> = { data: T; error?: undefined } | { error: true; data?: undefined };
const _alpWx: Record<string, HourByHourFc> = {}, _alpSp: Record<string, object> = {}, _alpAir: Record<string, object> = {}, _alpAlerts: Record<string, { at: number; data: { outside?: boolean } }> = {};
const ALERT_TTL = 10 * 60 * 1000; // alerts are issued and cancelled within the hour: a session-long cache would hide a new one
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
const hrs = (h: number) => (Math.round(h * 2) / 2).toFixed(1).replace(/\.0$/, "") + " h";
export interface ForecastBoxProps {
  route: { id: string; timing?: { recommendedStart?: unknown } | null };
  /** The Planner's inputs (fitness, pack weight...), passed straight to planTimes. */
  calc?: Parameters<typeof planTimes>[1] | null;
  /** The alpine condition kind (lib/alpineConditions.js condKind); null when the climb gets no card. */
  kind: keyof typeof KIND_LABEL | null;
  terrain: Parameters<typeof hasSnowLegs>[1];
  /** The forecast point: the climb's own pin, else its area's. Falsy when neither has a location (tested before every read below). */
  pt: { lat: number; lng: number; elevFt?: number | null; campFt?: number | null; pinned?: boolean; name: string };
}
export default function ForecastBox({ route, calc, kind, terrain, pt }: ForecastBoxProps) {
  const ck =pt ? pt.lat.toFixed(3) + "," + pt.lng.toFixed(3) + "@" + (pt.elevFt != null ? Math.round(pt.elevFt) : "") : "";
  const [wx, setWx] = useState<ForecastBoxRead<HourByHourFc> | null>(function () { return ck && _alpWx[ck] ? { data: _alpWx[ck] } : null; });
  const [tries, setTries] = useState(0);
  const [dayI, setDayI] = useState(0);
  useEffect(function () {
    if (!pt || !kind) return;
    if (_alpWx[ck]) { setWx({ data: _alpWx[ck] }); return; }
    let live = true; setWx(null);
    fetchAlpineForecast(pt.lat, pt.lng, pt.elevFt).then(function (j) { _alpWx[ck] = j; if (live) setWx({ data: j }); }, function () { if (live) setWx({ error: true }); });
    return function () { live = false; };
  }, [ck, tries, kind]); // eslint-disable-line react-hooks/exhaustive-deps -- refetch only when the point key (ck) changes; pt is a fresh object each render and ck already encodes it
  // The models' spread: a second, optional read. Failing, it adds nothing -- never "they agree".
  const [sp, setSp] = useState<object | null>(function () { return ck && _alpSp[ck] ? _alpSp[ck] : null; });
  useEffect(function () {
    if (!pt || !kind) return;
    if (_alpSp[ck]) { setSp(_alpSp[ck]); return; }
    let live = true; setSp(null);
    fetchAlpineSpread(pt.lat, pt.lng, pt.elevFt).then(function (j) { _alpSp[ck] = j; if (live) setSp(j); }, function () { if (live) setSp(null); });
    return function () { live = false; };
  }, [ck, kind]); // eslint-disable-line react-hooks/exhaustive-deps -- refetch only when the point key (ck) changes; pt is a fresh object each render and ck already encodes it
  // Air quality: a third, optional read. A failed one is "not measured" -- never "clean air".
  const [air, setAir] = useState<ForecastBoxRead<object> | null>(function () { return ck && _alpAir[ck] ? { data: _alpAir[ck] } : null; });
  const [airTries, setAirTries] = useState(0);
  useEffect(function () {
    if (!pt || !kind) return;
    if (_alpAir[ck]) { setAir({ data: _alpAir[ck] }); return; }
    let live = true; setAir(null);
    fetchCragAir(pt.lat, pt.lng).then(function (j) { _alpAir[ck] = j; if (live) setAir({ data: j }); }, function () { if (live) setAir({ error: true }); });
    return function () { live = false; };
  }, [ck, kind, airTries]); // eslint-disable-line react-hooks/exhaustive-deps -- refetch only when the point key (ck) changes; pt is a fresh object each render and ck already encodes it
  // Weather alerts: another optional read, US only. Outside it, or failed, says so -- never "no alerts".
  const [alerts, setAlerts] = useState<ForecastBoxRead<{ outside?: boolean }> | null>(function () { const c = ck && _alpAlerts[ck]; return c && Date.now() - c.at < ALERT_TTL ? { data: c.data } : null; });
  const [alertTries, setAlertTries] = useState(0);
  useEffect(function () {
    if (!pt || !kind) return;
    const c = _alpAlerts[ck];
    if (c && Date.now() - c.at < ALERT_TTL) { setAlerts({ data: c.data }); return; }
    let live = true; setAlerts(null);
    fetchPointAlerts(pt.lat, pt.lng).then(function (j) { _alpAlerts[ck] = { at: Date.now(), data: j }; if (live) setAlerts({ data: j }); }, function () { if (live) setAlerts({ error: true }); });
    return function () { live = false; };
  }, [ck, kind, alertTries]); // eslint-disable-line react-hooks/exhaustive-deps -- refetch only when the point key (ck) changes; pt is a fresh object each render and ck already encodes it
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
  const floor = (snowLegs ? snowFloorFt(route, pt && pt.campFt) : null) as { ft: number; basis: string };

  /* SUN ON THE FACE for the selected day (lib/terrainShade.js faceSunBands), so the start can count
     back from it: glacier and alpine ice, with a summit pin, a one-direction aspect and a height the
     push starts from. Read for the day on screen only — the start is shown for no other. */
  const face = useMemo(function () { return sunFace(route, kind, pt, fromCamp); }, [route, kind, pt, fromCamp]);
  const [faceSun, setFaceSun] = useState<Record<string, ForecastBoxFaceSun>>({});
  useEffect(function () { setFaceSun({}); }, [route.id]);

  const model = useMemo(function () {
    if (!wx || !wx.data || !kind) return null;
    const fc = wx.data, days = localDays(fc), today = todayOf(fc);
    const out: ForecastBoxDay[] = [];
    days.forEach(function (d, k) {
      if (d.date < today) return;
      const fs = faceSun[d.date];
      let r = dayFlags(fc, days, k, { kind, rockToo: kind === "glacier" && catOf(route) === "alpine", terrain, highFt: pt.elevFt != null ? pt.elevFt : groundFt(fc), snowFt: floor ? floor.ft : null, legs, sun: fs && fs.bands ? fs : null });
      const ms = sp ? modelSpread(sp, d.date, null, daySummary(fc, d).precip) : null;
      if (ms && ms.over.length) r = Object.assign({}, r, { flags: r.flags.concat([{ key: "models-disagree", level: "caution", v: ms }]) });
      const al = alerts && alerts.data && !alerts.data.outside ? alertsForDay(normAlerts(alerts.data), d.date, fc) : [];
      if (al.length) r = Object.assign({}, r, { flags: r.flags.concat(al.map(function (a: ForecastBoxAlert) { return { key: "alert", level: alertLevel(a), v: { event: a.event, severity: a.severity, when: windowLabel(fc, a) } }; })) });
      const fg = fogHours(fc, d);
      if (fg) r = Object.assign({}, r, { flags: r.flags.concat([{ key: "fog", level: "caution", v: { hours: fg.hours, from: clockOf(fc, fg.first) } }]) });
      const aq = air && air.data ? airDay(air.data, d.date) : null, sf = smokeFlag(aq);
      if (sf) r = Object.assign({}, r, { flags: r.flags.concat([sf]) });
      /* How many days before this one the start falls, counted ONCE here: the start box and the hour-by-hour
         key times both read it, and two counts let the hour strip say "Start by 7 PM (the night before)" under
         a box that said the push is too long for one day (#2342). */
      const daysEarly = (r.start ? Math.round((Date.parse(d.date) - Date.parse(localAt(fc, floorQ(r.start.at)).date)) / 864e5) : null) as number;
      out.push(Object.assign({ date: d.date, sum: daySummary(fc, d), sunrise: d.sunrise, sunset: d.sunset, aqi: aq }, r, { daysEarly: daysEarly }));
    });
    return { fc, days: out.slice(0, 7) };
  }, [wx, sp, air, alerts, kind, ck, floor && floor.ft, legs.up, legs.down, legs.floor, legs.fromCamp, legs.tech, legs.hike, faceSun]); // eslint-disable-line react-hooks/exhaustive-deps -- legs is rebuilt every render, so its fields are listed; route/terrain/pt.elevFt are covered by ck, kind and the weather reads
  const selDay = model && model.days.length ? model.days[Math.min(dayI, model.days.length - 1)] : null;
  useEffect(function () {
    if (!face || face.missing || legs.floor || !selDay || selDay.sunrise == null || selDay.sunset == null || faceSun[selDay.date]) return;
    const date = selDay.date, rise = selDay.sunrise * 1000, set = selDay.sunset * 1000, grid = shadeGrid(face.ctr.lat, face.ctr.lng);
    let live = true, done = false, tm = 0;
    const put = function (v: ForecastBoxFaceSun) { done = true; setFaceSun(function (m) { const n = Object.assign({}, m); n[date] = v; return n; }); };
    setFaceSun(function (m) { const n = Object.assign({}, m); n[date] = { busy: true }; return n; });
    loadTerrain(grid).then(function (T: Awaited<ReturnType<typeof loadTerrain>>) {
      if (!live) return;
      // A tick later, so the card paints first: ~0.5 s of arithmetic on a phone.
      tm = setTimeout(function () {
        if (!live) return;
        const px = gridPx(grid, face.top.lat, face.top.lng), top = px && highestNear(T.E, grid.W, grid.H, px, Math.round(SUMMIT_SNAP_M / grid.pxM));
        const b = top ? faceSunBands(T, grid, top, face.deg, face.top.lat, face.top.lng, rise, set, 10, face.fromFt / 3.28084) : null;
        put(b ? { bands: b.map(function (x) { return { ft: x.e * 3.28084, at: Math.round(x.at / 1000) }; }), topFt: T.E[top.r * grid.W + top.c] * 3.28084, fromFt: face.fromFt } : { error: true });
      }, 30);
    }, function () { if (live) put({ error: true }); });
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- the key is the selected date, dropped so a cancelled read can run again
    return function () { live = false; clearTimeout(tm); if (!done) setFaceSun(function (m) { if (!m[date] || !m[date].busy) return m; const n = Object.assign({}, m); delete n[date]; return n; }); };
  }, [face, legs.floor, selDay && selDay.date]); // eslint-disable-line react-hooks/exhaustive-deps -- faceSun is written by this effect (would loop); runs per selected day, selDay is a fresh object

  if (!kind) return null;
  const box = { background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "12px 14px", marginBottom: ROUTE_GAP };
  const head = <CardHead style={{ marginBottom: 8 }}>{"CONDITIONS · " + KIND_LABEL[kind].toUpperCase()}</CardHead>;
  if (!pt) return <div style={box}>{head}<div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.55 }}>No conditions for this climb: neither it nor the area it is on has a location on file, so there is no forecast to read.</div></div>;
  if (wx && wx.error) return <div style={box}>{head}<div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.55, marginBottom: 8 }}>Couldn’t load the forecast, so no flags are shown. This is not a reading of the conditions.</div><button onClick={function () { setTries(tries + 1); }} style={{ background: C.surface, color: C.blue, border: "1px solid " + C.border, borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Try again</button></div>;
  if (!model) return <div style={box} aria-busy="true">{head}<LoadingRows C={C} label="Loading the forecast…"/></div>;
  const days = model.days, fc = model.fc;
  if (!days.length) return <div style={box}>{head}<div style={{ fontSize: 12.5, color: C.textSub }}>The forecast came back with no days ahead to read.</div></div>;
  const day = days[Math.min(dayI, days.length - 1)];
  const dayName = function (d: ForecastBoxDay, i: number) { return i === 0 ? "Today" : new Date(d.date + "T12:00:00Z").toLocaleDateString(DLOCALE, { weekday: "short", timeZone: "UTC" }); };
  const nWarn = function (d: ForecastBoxDay) { return d.flags.filter(function (f: ForecastBoxFlag) { return f.level === "warn"; }).length; };
  const nCaution = function (d: ForecastBoxDay) { return d.flags.filter(function (f: ForecastBoxFlag) { return f.level === "caution"; }).length; };
  const dot = function (col: string) { return <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: col, margin: "0 1.5px" }} />; };

  let startEl = null, sunEl = null;
  const faceDir = face && !face.missing ? ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(face.deg / 45) % 8] : "";
  /* What the start did with the sun on the face, said every time: it counted it, or why it could not.
     A deadline counted from a model must carry the model's limits (research 2026-10-08). */
  if (face && !legs.floor) {
    const fs = faceSun[day.date], noFrz = day.noFreeze || day.flags.some(function (f: ForecastBoxFlag) { return f.key === "fl-above-night"; });
    const MISSING: Record<string, string> = { ridge: "it climbs a ridge, and what sheds off either side falls away from the crest", summit: "the route has no summit pin on file", aspect: "its aspect on file isn’t one direction", from: legs.fromCamp ? "no camp height is on file" : "no trailhead height is on file" };
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
      const st = floorQ(day.start.at), daysEarly = day.daysEarly;
      const offBy = clockOf(fc, day.start.at + legs.up * 3600), storm = day.thunder && day.thunder.likely ? "forecast" : "possible";
      const why = day.start.why === "snow"
        ? (legs.wholeDay ? "to do the " + hrs(legs.wholeDay) + " day and be back down by " : legs.fromCamp ? "to climb " + hrs(legs.up) + " from camp and be back down by " : "to climb " + hrs(legs.up) + " and walk " + hrs(legs.down) + " back down by ") + clockOf(fc, day.softAt) + ", when the snow at " + uElev(floor.ft) + " starts to soften"
        : day.start.why === "snow-noon" ? (legs.wholeDay ? "to do the " + hrs(legs.wholeDay) + " day and be back down by " : legs.fromCamp ? "to climb " + hrs(legs.up) + " from camp and be back there by " : "to climb " + hrs(legs.up) + " and walk " + hrs(legs.down) + " back down by ") + clockOf(fc, day.start.backBy) + ": parties on glaciers start in the dark and plan to be off the snow by midday, while the night’s freeze still holds and before the sun softens it and weakens the bridges"
          + (day.start.forecast ? ". The forecast alone would allow a start as late as " + clockOf(fc, floorQ(day.start.forecast.at)) + ", but that has no margin" : ". The forecast sets no earlier deadline today")
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
  /* SWITCHING DAY WITHOUT SCROLLING BACK UP (owner, 2026-10-16: "you have to scroll up every time to switch the
     day ... make it easier to switch the day on each section"). The strip says in words which day every section
     below shows, and each day section's heading (alerts, hour by hour, snowfall, air) carries its own ‹ › to step
     the SAME day for all of them. NOT a sticky strip: #appscroll is overflow:auto but grows to its content (the
     document scrolls), so a sticky child binds to a box that never scrolls and rides away with the page --
     measured live 2026-10-21. */
  const di = Math.min(dayI, days.length - 1);
  const nav = { prev: di > 0 ? { go: function () { setDayI(di - 1); }, name: dayName(days[di - 1], di - 1) } : null, next: di < days.length - 1 ? { go: function () { setDayI(di + 1); }, name: dayName(days[di + 1], di + 1) } : null };
  // The route's own published start (timing.recommendedStart, free prose: "2:30 AM from camp"), beside the one
  // counted from the forecast -- the Plan tab shows it too. Shown only where the card gives a start box.
  const pubStart = route.timing && typeof route.timing.recommendedStart === "string" && route.timing.recommendedStart.trim() ? route.timing.recommendedStart.trim() : null;
  const fullDay = new Date(day.date + "T12:00:00Z").toLocaleDateString(DLOCALE, { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
  return <div><div style={{ padding: "2px 0 4px", marginBottom: 6 }}>
    <div aria-live="polite" style={{ fontSize: 12, color: C.textSub, marginBottom: 5 }}>{"Showing "}<b style={{ color: C.text }}>{(Math.min(dayI, days.length - 1) === 0 ? "today, " : "") + fullDay}</b>{" — every section below is for this day."}</div>
    <div role="group" aria-label="Day" style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 4 }}>{days.map(function (d: ForecastBoxDay, i: number) {
      const on = i === Math.min(dayI, days.length - 1), w = nWarn(d), c = nCaution(d);
      return <button key={d.date} onClick={function () { setDayI(i); }} aria-pressed={on} aria-label={dayName(d, i) + ", " + (w + c === 0 ? "no flags" : (w ? w + " warning" + (w === 1 ? "" : "s") : "") + (w && c ? " and " : "") + (c ? c + " caution" + (c === 1 ? "" : "s") : ""))} style={{ flex: "0 0 58px", width: 58, boxSizing: "border-box", minHeight: 58, padding: "6px 2px", borderRadius: 9, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : "transparent", color: C.text, cursor: "pointer", textAlign: "center" }}>
        <div style={{ fontSize: 11.5, fontWeight: 700 }}>{dayName(d, i)}</div>
        <div style={{ minHeight: 10, lineHeight: "10px" }}>{Array.from({ length: Math.min(w, 3) }, function (_, j) { return <span key={"w" + j}>{dot(C.red)}</span>; })}{Array.from({ length: Math.min(c, 3) }, function (_, j) { return <span key={"c" + j}>{dot(C.amber)}</span>; })}</div>
        <div style={{ fontSize: 10.5, color: C.textMuted }}>{d.sum.hi != null ? uTemp(d.sum.hi) + "/" + uTemp(d.sum.lo) : ""}</div>
      </button>;
    })}</div></div>
    <div style={box}>
    <DayHead title={"CONDITIONS · " + KIND_LABEL[kind].toUpperCase()} dayLabel={dayName(day, di)} nav={nav} />
    {startEl || sunEl ? <div style={{ background: C.surface, borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>{startEl}{pubStart ? <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, marginTop: 6 }}><b>{"This route’s usual start: "}</b>{pubStart}</div> : null}{sunEl}</div> : null}
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
      {day.flags.length ? day.flags.map(function (f: ForecastBoxFlag, i: number) { const col = f.level === "warn" ? C.red : C.amber; return <div key={f.key + i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: C.text, lineHeight: 1.45 }}><span aria-hidden="true" style={{ flexShrink: 0, marginTop: 5, width: 8, height: 8, borderRadius: "50%", background: col }} /><span><b style={{ color: col }}>{f.level === "warn" ? "Warning: " : "Caution: "}</b>{flagText(f, fc)}</span></div>; })
        : <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>Nothing in the forecast flags this day.</div>}
    </div>
    <RangeLine route={route} sum={day.sum} />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>{readout.map(function (r) { return <div key={r[0]} style={{ background: C.surface, borderRadius: 8, padding: "6px 8px" }}><div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 700 }}>{r[0]}</div><div style={{ fontSize: 12.5, color: C.text, fontWeight: 700 }}>{r[1]}</div>{r[2] ? <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{r[2]}</div> : null}</div>; })}</div>
    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>
      {"Read at " + (pt.elevFt != null ? uElev(pt.elevFt) : groundFt(fc) != null ? uElev(Math.round(groundFt(fc) / 10) * 10) + ", the ground height at the map point" : "the area’s height") + (pt.pinned ? " at " + pt.name : " over " + pt.name) + "." + (floor && floor.basis === "halfway" ? " Snow is assumed to reach down to " + uElev(floor.ft) + ", halfway up the climb." : floor && floor.basis === "camp" ? " Snow is read down to high camp, " + uElev(floor.ft) + "." : "") + " Flags are rules of thumb, not a go/no-go. " + BLIND[kind]}
    </div>
  </div>
  <DayByDay days={days} di={di} pick={setDayI} dayName={dayName} nWarn={nWarn} nCaution={nCaution} fc={fc} legs={legs} startOn={kind !== "waterfall" && kind !== "cragmixed"} />
  <AlertsSection day={day} dayLabel={dayName(day, Math.min(dayI, days.length - 1))} nav={nav} alerts={alerts} fc={fc} onRetry={function () { setAlertTries(alertTries + 1); }} />
  <HourByHour key={day.date} fc={fc} day={day} dayLabel={dayName(day, Math.min(dayI, days.length - 1))} nav={nav} pt={pt} floor={floor} legs={legs} snowLegs={snowLegs} />
  <SnowfallSection fc={fc} day={day} dayLabel={dayName(day, Math.min(dayI, days.length - 1))} nav={nav} />
  <AirSection day={day} dayLabel={dayName(day, Math.min(dayI, days.length - 1))} nav={nav} air={air} onRetry={function () { setAirTries(airTries + 1); }} />
  <SunShadeSection route={route} kind={kind} terrain={terrain} pt={pt} fc={fc} day={day} isToday={di === 0} dayLabel={dayName(day, di)} nav={nav} />
  </div>;
}
