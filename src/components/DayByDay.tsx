import { C, DLOCALE, uTemp, uElev, uWind, uSnowfall, uPrecip } from "../../ClimbMatchCore.jsx";
import { BOX, clockOf, floorQ, hrSpan } from "../../lib/alpineConditionsShared.js";
import CardHead from "./CardHead.tsx";
import type { daySummary } from "../../lib/alpineConditions.js";
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

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
   thunderstorms, so "possible" is the strongest word a CAPE hour gets and nothing here says "safe".
   Only the one heading line ("Tue · 2 PM") is aria-live: wrapping every tile in it read the whole grid out again on
   each tap. */
/* DAY BY DAY (owner, 2026-10-24: "we have hour by hour, but not day to day conditions ... look at how we do sport,
   trad and bouldering routes"). The seven days in one list, as the crag card's Day by day and Mountain-Forecast's
   daily summit table lay them out: each row is the day's flag count, high / low, freezing level and gusts at the
   forecast's own height, plus new snow and the start. It adds NO judgement -- every number is the day's own
   daySummary, every count the flags the card already raised, and the start the same one the card's start box
   shows (none past a one-day push or on a minimum estimate). Tapping a day opens it in every section.
   SIDE BY SIDE (owner, 2026-11-14: "dont stack them on top of eachother day by day, have them scroll to the right"):
   each day is a card in one row that scrolls sideways, as the Weather forecast's day tiles do. The scrollbar stays
   visible so a mouse can reach day 7, and stepping the day from another section's ‹ › brings its card into view. */
export interface DayByDayDay {
  date: string;
  start?: { at: number } | null;
  daysEarly: number;
  /** The day's daySummary figures. */
  sum: ReturnType<typeof daySummary>;
}
export interface DayByDayProps<D extends DayByDayDay = DayByDayDay> {
  days: D[];
  /** Index of the selected day. */
  di: number;
  pick: (i: number) => void;
  dayName: (d: D, i: number) => string;
  nWarn: (d: D) => number;
  nCaution: (d: D) => number;
  fc: object;
  legs: { floor: boolean; fromCamp: boolean };
  /** False on kinds that show no start (waterfall, mixed). */
  startOn: boolean;
}
export default function DayByDay<D extends DayByDayDay>({ days, di, pick, dayName, nWarn, nCaution, fc, legs, startOn }: DayByDayProps<D>) {
  const cell: CSSProperties = { borderLeft: "1px solid " + C.borderLight, padding: "1px 0 1px 8px", display: "block", minWidth: 0 };
  const lbl: CSSProperties = { display: "block", fontSize: 10.5, color: C.textMuted, fontWeight: 700 };
  // Values WRAP (a freezing level "8,200 ft–10,900 ft" breaks after its dash): at 390px a one-line clip cut it to "8,200 ft–1…" on every day.
  const val: CSSProperties = { display: "block", fontSize: 12.5, color: C.text, fontWeight: 700, lineHeight: 1.3, overflowWrap: "anywhere" };
  const rowRef = useRef<HTMLDivElement | null>(null);
  // Keep the selected card in view when the day is stepped from elsewhere; scrollLeft only, so the page never jumps.
  useEffect(function () { const row = rowRef.current; const card = row && (row.children[di] as HTMLElement | undefined); if (!row || !card) return; const l = card.offsetLeft - row.offsetLeft, r = l + card.offsetWidth; if (l < row.scrollLeft) row.scrollLeft = Math.max(0, l - 14); else if (r > row.scrollLeft + row.clientWidth) row.scrollLeft = r - row.clientWidth + 14; }, [di]);
  const date = function (d: DayByDayDay) { return new Date(d.date + "T12:00:00Z").toLocaleDateString(DLOCALE, { month: "short", day: "numeric", timeZone: "UTC" }); };
  return <div style={BOX}>
    <CardHead style={{ marginBottom: 8 }}>DAY BY DAY</CardHead>
    <div ref={rowRef} data-day-table="1" style={{ display: "flex", gap: 8, overflowX: "auto", margin: "0 -14px", padding: "0 14px 6px", scrollSnapType: "x proximity" }}>
    {days.map(function (d: D, i: number) {
      const on = i === di, w = nWarn(d), c = nCaution(d), s = d.sum;
      const flagWord = w + c === 0 ? "No flags" : [w ? w + " warning" + (w === 1 ? "" : "s") : null, c ? c + " caution" + (c === 1 ? "" : "s") : null].filter(Boolean).join(" · ");
      const temp = s.hi != null ? uTemp(s.hi) + " / " + uTemp(s.lo) : "—";
      const fl = s.flLo != null ? uElev(Math.round(s.flLo / 100) * 100) + "–" + uElev(Math.round(s.flHi / 100) * 100) : "—";
      const gust = s.gust != null ? uWind(s.gust) : "—";
      const start = startOn && !legs.floor && d.start && d.daysEarly < 2 ? (legs.fromCamp ? "Leave camp by " : "Start by ") + clockOf(fc, floorQ(d.start.at)) + (d.daysEarly === 1 ? " the night before" : "") : null;
      const extra = [s.snow != null ? uSnowfall(s.snow) + " new snow" : null, start].filter(Boolean).join(" · ");
      // The AMOUNT, its hours and its window, with the chance beneath -- never the chance alone (owner's note, 2026-10-28).
      const rain = s.precip == null ? "—" : s.precip === 0 ? "None" : uPrecip(s.precip);
      const rainSub = [s.precipHrs ? s.precipHrs + " h" + (s.precipFrom != null ? ", " + hrSpan(fc, s.precipFrom, s.precipTo) : "") : null, s.popMax ? "hourly chance up to " + Math.round(s.popMax) + "%" : null, s.snow ? "snow melted in" : null].filter(Boolean).join(" · ");
      return <button key={d.date} onClick={function () { pick(i); }} aria-pressed={on} aria-label={dayName(d, i) + " " + date(d) + ", " + flagWord + ". High / low " + temp + ". Freezing level " + fl + ". " + (s.snow ? "Precipitation " : "Rain ") + rain + (rainSub ? ", " + rainSub : "") + ". Gusts " + gust + "." + (extra ? " " + extra + "." : "")} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-start", flexShrink: 0, width: 220, textAlign: "left", padding: "10px 11px", margin: 0, border: "1px solid " + (on ? C.blue : C.border), borderRadius: 10, background: on ? C.blueBg : "transparent", boxShadow: on ? "inset 0 3px 0 " + C.blue : "none", color: C.text, cursor: "pointer", font: "inherit", scrollSnapAlign: "start" }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}><span style={{ fontSize: 12.5, fontWeight: 800 }}>{dayName(d, i)}</span>{" "}<span style={{ fontSize: 11.5, color: C.textMuted }}>{date(d)}</span>{" "}<span style={{ fontSize: 12, fontWeight: 700, color: w ? C.red : c ? C.amber : C.textSub }}>{flagWord}</span></span>{" "}
        <span style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 5 }}>
          {/* Name and rows in ONE order -- day, date, flags, high/low, freezing level, rain, gusts, notes -- because a voice-control user reads the row and says those words (WCAG 2.5.3). The spaces render nothing between these blocks; they keep the words apart. */}<span style={cell}><span style={lbl}>High / low</span>{" "}<span style={val}>{temp}</span></span>{" "}
          <span style={cell}><span style={lbl}>Freezing level</span>{" "}<span style={val}>{fl}</span></span>{" "}
          <span style={cell}><span style={lbl}>{s.snow ? "Precipitation" : "Rain"}</span>{" "}<span style={Object.assign({}, val, { color: s.precip > 0 ? C.blue : C.text })}>{rain}</span>{rainSub ? " " : null}{rainSub ? <span style={{ display: "block", fontSize: 10.5, color: C.textMuted, lineHeight: 1.35 }}>{rainSub}</span> : null}</span>
{" "}
          <span style={cell}><span style={lbl}>Gusts</span>{" "}<span style={val}>{gust}</span></span>
        </span>{" "}
        <span style={{ display: "block", fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, marginTop: 4 }}>{extra}</span>
      </button>;
    })}
    </div>
  </div>;
}
