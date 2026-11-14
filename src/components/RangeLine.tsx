import { useCondPrefs, scopeForDiscipline, CondPrefsControls } from "../../lib/CondPrefs.jsx";
import { useState } from "react";
import { catOf, uTemp, C } from "../../ClimbMatchCore.jsx";
import { rangeNote } from "../../lib/alpineConditions.js";

/* "Your range": ONE plain line saying whether the day's forecast temperatures fall inside the range the
   climber set for alpine, or for ice and mixed. Neutral colour on purpose: it is a preference, not a
   hazard, so it never reads like a warning and never feeds the flags above it (rangeNote). Without a
   range it shows only the way to set one. */
export interface RangeLineProps {
  route: Parameters<typeof catOf>[0];
  /** The day's daySummary: only the high and low are read. */
  sum: { hi: number | null; lo: number | null };
}
export default function RangeLine({ route, sum }: RangeLineProps) {
  const p = useCondPrefs();
  const [open, setOpen] = useState(false);
  const disc = catOf(route), scope = scopeForDiscipline(disc);
  const range = p.temp[scope] || null;
  const n = range && sum ? rangeNote(range, sum.hi, sum.lo) : null;
  const r = range ? uTemp(range[0]) + "–" + uTemp(range[1]) : "";
  const text = !n ? null : n.rel === "within" ? "Inside your " + r + " range for the whole day (" + uTemp(sum.lo) + " to " + uTemp(sum.hi) + ")."
    : n.rel === "below" ? "Colder than your " + r + " range for the whole day (high " + uTemp(sum.hi) + ")."
    : n.rel === "above" ? "Warmer than your " + r + " range for the whole day (low " + uTemp(sum.lo) + ")."
    : n.rel === "partly-below" ? "Part of the day is colder than your " + r + " range (down to " + uTemp(sum.lo) + ")."
    : n.rel === "partly-above" ? "Part of the day is warmer than your " + r + " range (up to " + uTemp(sum.hi) + ")."
    : "Both colder and warmer than your " + r + " range at times (" + uTemp(sum.lo) + " to " + uTemp(sum.hi) + ").";
  return <div style={{ marginBottom: 10 }}>
    {text ? <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5, marginBottom: 4 }}>{text}</div> : null}
    <button onClick={function () { setOpen(!open); }} aria-expanded={open} style={{ background: "none", border: "none", padding: "5px 0", minHeight: 44, color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{open ? "Hide your temperature range" : range ? "Change your temperature range" : "Set a temperature range you like"}</button>
    {open ? <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 10, padding: "10px 12px", marginTop: 6 }}><CondPrefsControls disc={disc} only="temp" /></div> : null}
  </div>;
}
