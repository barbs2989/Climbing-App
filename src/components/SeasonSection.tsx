import { useState, useEffect } from "react";
import { fetchAlpineClimate } from "../../lib/forecast.js";
import CardHead from "./CardHead.tsx";
import { HEAD, MUTED, RETRY } from "../../lib/alpineConditionsShared.js";
import LoadingRows from "./LoadingRows.tsx";
import { C, DLOCALE, uSnowfall, uTemp, uElev } from "../../ClimbMatchCore.jsx";

/* SEASON AT THE TOP: five years of monthly averages read at the top of the climb -- high and low,
   and snowfall (or wet days in a month with little snow). A guide to the season, never a forecast,
   and the section says where it was read every time. */
export interface SeasonSectionProps {
  /** The forecast point; elevFt is the top of the climb, when known. */
  pt: { lat: number; lng: number; elevFt: number | null };
}
type SeasonSectionState = { m: Awaited<ReturnType<typeof fetchAlpineClimate>>; error?: undefined } | { error: true; m?: undefined };
export default function SeasonSection({ pt }: SeasonSectionProps) {
  const [st, setSt] = useState<SeasonSectionState | null>(null), [tries, setTries] = useState(0);
  useEffect(function () {
    let live = true; setSt(null);
    fetchAlpineClimate(pt.lat, pt.lng, pt.elevFt).then(function (m) { if (live) setSt({ m }); }, function () { if (live) setSt({ error: true }); });
    return function () { live = false; };
  }, [pt.lat, pt.lng, pt.elevFt, tries]);
  const head = <CardHead style={HEAD}>Season at the top</CardHead>;
  if (!st) return <div aria-busy="true">{head}<LoadingRows C={C} label="Loading the climate at the top…"/></div>;
  if (st.error) return <div>{head}<div style={{ ...MUTED, color: C.amber }}>Couldn’t load the climate. This says nothing about the season.</div><button onClick={function () { setTries(tries + 1); }} style={RETRY}>Try again</button></div>;
  const m = st.m, now = new Date().getMonth();
  const name = function (i: number) { return new Date(Date.UTC(2026, i, 15)).toLocaleDateString(DLOCALE, { month: "short", timeZone: "UTC" }); };
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
