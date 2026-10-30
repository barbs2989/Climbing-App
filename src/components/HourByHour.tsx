import { localDays, localHour, LIMITS, windChillF } from "../../lib/alpineConditions.js";
import { useState } from "react";
import { C, uElev, uTemp, uWind, uSnowfall, uPrecip, uImp, uTempDelta } from "../../ClimbMatchCore.jsx";
import { floorQ, groundFt, BOX, clockOf, visText } from "../../lib/alpineConditionsShared.js";
import DayHead from "./DayHead.tsx";
import type { DayHeadNav } from "./DayHead.tsx";
import { HourStepper, clockHr, spanEnding, TileGroup, Tile, NOT_MEASURED, compass } from "../../lib/HourTiles.jsx";

/** The forecast read: Open-Meteo hourly series keyed by name, `time` in unix seconds. */
export interface HourByHourFc {
  hourly: { time: number[]; is_day?: number[] } & Record<string, number[]>;
  elevation?: number;
}
export interface HourByHourKeyTime { at: number; label: string; tone: string; after?: string }
export interface HourByHourProps {
  fc: HourByHourFc;
  /** The selected day: its sunrise, sunset, start, snow-soften hour and first thunder hour, all unix seconds. */
  day: {
    date: string;
    sunrise: number | null;
    sunset: number | null;
    start: { at: number };
    daysEarly: number;
    softAt?: number | null;
    noFreeze?: boolean;
    thunder?: { at: number; likely?: boolean } | null;
  };
  dayLabel: string;
  nav: DayHeadNav | null;
  pt: { elevFt?: number | null };
  /** The lowest snow the route crosses, in feet; null when it has no snow legs. */
  floor: { ft: number } | null;
  legs: { floor: boolean; fromCamp: boolean };
  snowLegs: boolean;
}
export default function HourByHour({ fc, day, dayLabel, nav, pt, floor, legs, snowLegs }: HourByHourProps) {
  const h = fc.hourly;
  const found = localDays(fc).find(function (d) { return d.date === day.date; });
  const endT = day.sunset != null ? day.sunset + 3600 : null;
  const idx = (found ? found.hours : []).filter(function (i: number) { return localHour(fc, i) >= 3 && (endT == null ? localHour(fc, i) <= 21 : h.time[i] <= endT); });
  const [sel, setSel] = useState<number | null>(null);
  if (!idx.length) return null;
  const kt: HourByHourKeyTime[] = [];
  if (day.sunrise != null) kt.push({ at: day.sunrise, label: "Sunrise", tone: C.yellow });
  // No start key time when the start box says the push is too long for one day (2+ days early): one count, day.daysEarly.
  const startOn = day.start && !(legs && legs.floor) && !(day.daysEarly >= 2);
  if (startOn) kt.push({ at: floorQ(day.start.at), label: (legs.fromCamp ? "Leave camp by" : "Start by"), after: day.daysEarly === 1 ? " (the night before)" : "", tone: C.green });
  if (snowLegs && day.softAt != null && !day.noFreeze) kt.push({ at: day.softAt, label: (floor ? "Snow at " + uElev(floor.ft) : "Snow") + " starts to soften", tone: C.amber });
  if (day.thunder) kt.push({ at: day.thunder.at, label: day.thunder.likely ? "Thunderstorms in the forecast from" : "Thunderstorms possible from", tone: C.red });
  if (day.sunset != null) kt.push({ at: day.sunset, label: "Sunset", tone: C.yellow });
  kt.sort(function (a, b) { return a.at - b.at; });
  const marksIn = function (T: number) { return kt.filter(function (k) { return k.at >= T && k.at < T + 3600; }); };
  const startI = startOn ? idx.find(function (i: number) { const st = floorQ(day.start.at); return st >= h.time[i] && st < h.time[i] + 3600; }) : null;
  const firstDay = idx.find(function (i: number) { return !h.is_day || h.is_day[i] === 1; });
  const cur = sel != null && idx.indexOf(sel) >= 0 ? sel : (startI != null ? startI : (firstDay != null ? firstDay : idx[0]));
  const v = function (k: string, i: number) { return h[k] && typeof h[k][i] === "number" && isFinite(h[k][i]) ? h[k][i] : null; } as (k: string, i: number) => number;
  const sev = function (i: number) {
    const g = v("wind_gusts_10m", i), code = v("weather_code", i);
    if ((g != null && g >= LIMITS.gustWarn) || (code != null && code >= 95)) return C.red;
    if ((g != null && g >= LIMITS.gustCaution) || (day.thunder && h.time[i] >= day.thunder.at && h.time[i] < day.thunder.at + 3600)) return C.amber;
    return null;
  };
  const T = h.time[cur], hr = localHour(fc, cur), t = v("temperature_2m", cur), w = v("wind_speed_10m", cur), g = v("wind_gusts_10m", cur), dir = v("wind_direction_10m", cur);
  const vis = v("visibility", cur), lowc = v("cloud_cover_low", cur);
  const pop = v("precipitation_probability", cur), pr = v("precipitation", cur), sn = v("snowfall", cur), fl = v("freezing_level_height", cur), cl = v("cloud_cover", cur), code = v("weather_code", cur);
  const wc = t != null && w != null ? windChillF(t, w) : null, chilled = wc != null && t != null && t - wc >= 5;
  const tops = pt.elevFt != null ? pt.elevFt : groundFt(fc);
  const marks = marksIn(T);
  return <div style={BOX}>
    <DayHead title="HOUR BY HOUR" dayLabel={dayLabel} nav={nav} />
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>{kt.map(function (k, j) { return <span key={j} style={{ fontSize: 12, fontWeight: 700, color: C.text, background: C.surface, border: "1px solid " + k.tone + "99", borderRadius: 20, padding: "4px 10px", lineHeight: 1.3 }}>{k.label + " " + clockOf(fc, k.at) + (k.after || "")}</span>; })}</div>
    <div style={{ marginBottom: 8 }}><HourStepper index={idx.indexOf(cur)} count={idx.length} onPick={function (j: number) { setSel(idx[j]); }} label={function (j: number) { return clockHr(localHour(fc, idx[j])); }}>{idx.map(function (i: number) {
      const on = i === cur, sv = sev(i), mk = marksIn(h.time[i]).length;
      return <button key={h.time[i]} onClick={function () { setSel(i); }} aria-pressed={on} aria-label={clockHr(localHour(fc, i)) + (sv === C.red ? ", strong wind or thunderstorm in the forecast" : sv ? ", caution" : "") + (mk ? ", a key time falls in this hour" : "")} style={{ flex: "0 0 auto", minWidth: 58, minHeight: 44, boxSizing: "border-box", padding: "8px 8px 6px", borderRadius: 8, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : "transparent", color: on ? C.onSolid : C.textSub, fontSize: 12, fontWeight: on ? 800 : 600, cursor: "pointer" }}>
        {clockHr(localHour(fc, i))}
        <span style={{ display: "block", height: 8, lineHeight: "8px", marginTop: 2 }}>{sv ? <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: sv, margin: "0 1.5px" }} /> : null}{mk ? <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 2, background: C.blue, margin: "0 1.5px" }} /> : null}</span>
      </button>;
    })}</HourStepper></div>
    <div>
      <div aria-live="polite" style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{dayLabel + " · " + clockHr(hr)}{cl != null ? <span style={{ fontSize: 12, fontWeight: 600, color: C.textMuted }}>{"  ·  cloud " + Math.round(cl) + "%"}</span> : null}</div>
      {marks.length ? <div style={{ fontSize: 12, color: C.text, marginTop: 3 }}>{marks.map(function (k) { return k.label + " " + clockOf(fc, k.at) + (k.after || ""); }).join(" · ")}</div> : null}
      {code != null && code >= 95 ? <div style={{ fontSize: 12.5, fontWeight: 700, color: C.red, marginTop: 3 }}>Thunderstorms in the forecast this hour</div> : null}
      <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, margin: "3px 0 8px" }}>{"Temperature, wind and the freezing level are the reading at " + clockHr(hr) + ". Gusts, rain, snow and chance of precipitation cover the hour before it, " + spanEnding(hr) + "."}</div>
      <TileGroup title="Temperature"><Tile label="Temperature" when={"at " + clockHr(hr)} value={t != null ? uTemp(t) : NOT_MEASURED} sub={chilled ? "Wind chill " + uTemp(wc) : null} tone={wc != null && wc <= LIMITS.windChillWarn ? C.red : null} /></TileGroup>
        <TileGroup title="Wind"><Tile label="Wind" when={"at " + clockHr(hr)} value={w != null ? uWind(w) : NOT_MEASURED} sub={dir != null ? "from the " + compass(dir) : null} />
        <Tile label="Gusts" when={spanEnding(hr)} value={g != null ? uWind(g) : NOT_MEASURED} tone={g != null && g >= LIMITS.gustWarn ? C.red : g != null && g >= LIMITS.gustCaution ? C.amber : null} sub={g == null ? null : g >= LIMITS.gustWarn ? "past the " + uWind(LIMITS.gustWarn) + " warning line" : g >= LIMITS.gustCaution ? "past the " + uWind(LIMITS.gustCaution) + " caution line" : "strongest moment in that hour"} /></TileGroup>
        <TileGroup title="Precipitation and sky"><Tile label={sn != null && sn > 0 ? "Snow" : "Rain"} when={spanEnding(hr)} value={sn != null && sn > 0 ? uSnowfall(sn) : pr == null ? NOT_MEASURED : pr === 0 ? "None" : uPrecip(pr)} tone={(sn > 0 || pr > 0) ? C.blue : null} sub={pop != null ? pop + "% chance of precipitation" : null} />
        <Tile label="Visibility" when={"at " + clockHr(hr)} value={vis != null ? visText(vis) : NOT_MEASURED} tone={vis != null && vis < LIMITS.fogM ? C.amber : null} sub={vis == null ? null : vis < LIMITS.fogM ? "Fog: under " + visText(LIMITS.fogM) : vis < 2000 ? "Mist range (about " + visText(LIMITS.fogM) + " to " + visText(2000) + ")" : null} />
        <Tile label="Low cloud" when={"at " + clockHr(hr)} value={lowc != null ? Math.round(lowc) + "%" : NOT_MEASURED} sub={lowc == null ? null : "cloud in the layers up to about " + (uImp() ? "10,000 ft" : "3 km") + " up; the route may sit in or above them"} />
        <Tile label="Freezing level" when={"at " + clockHr(hr)} value={fl != null ? uElev(Math.round(fl / 100) * 100) : NOT_MEASURED} sub={fl == null || tops == null ? null : "Air at " + uElev(tops) + " is " + (fl > tops ? "above" : "below") + " 0 °C" + (snowLegs && floor ? "; at the lowest snow you cross (" + uElev(floor.ft) + ") it is " + (fl > floor.ft ? "above" : "below") + " 0 °C" : "")} wide /></TileGroup>
    </div>
    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, marginTop: 8 }}>Temperatures are modelled for the height named above: checked against mountain weather stations, an hour’s value was typically off by {uTempDelta(3)}–{uTempDelta(5)}°, and in winter by up to {uTempDelta(9)}°, most often reading too cold.</div>
  </div>;
}
