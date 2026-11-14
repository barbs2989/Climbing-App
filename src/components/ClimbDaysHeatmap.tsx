import { DLOCALE } from "../../ClimbMatchCore.jsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

export interface ClimbDaysHeatmapProps {
  /** The dates climbed, YYYY-MM-DD (a log's `date`); repeats count as more climbs that day. */
  dates: ReadonlyArray<string | null | undefined>;
  C: typeof Palette;
  /** Whose days these are, for the picture's name: "your" or a first name. */
  whose?: string;
}

/* CLIMBING DAYS, the last 52 weeks (competitor review batch B, item 18, owner 2026-11-04; Strava's and
   GitHub's year grid). One cell per day, columns are weeks, rows Sunday→Saturday; a cell's shade is how
   many climbs were logged that day (0 / 1 / 2 / 3+). Read off the logs' own dates, nothing computed
   from them: a day with no log is blank, and the caption counts DAYS, not climbs. Month labels and the
   cell titles go through the climber's date preference (check:date-locale). The grid is one picture to
   a screen reader, named with the day count — 364 cells would be noise — and the caption repeats it. */
const DAY = 86400000;
const key = (d: Date) => d.toISOString().slice(0, 10);

export default function ClimbDaysHeatmap({ dates, C, whose }: ClimbDaysHeatmapProps) {
  const counts: Record<string, number> = {};
  for (const d of dates) { const k = String(d || "").slice(0, 10); if (/^\d{4}-\d{2}-\d{2}$/.test(k)) counts[k] = (counts[k] || 0) + 1; }
  const today = new Date(); const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  // The grid ends on today's week (Saturday) and starts 52 weeks earlier, on a Sunday.
  const end = new Date(todayUtc.getTime() + (6 - todayUtc.getUTCDay()) * DAY);
  const start = new Date(end.getTime() - (52 * 7 - 1) * DAY);
  const weeks: Date[][] = [];
  for (let w = 0; w < 52; w++) { const col: Date[] = []; for (let d = 0; d < 7; d++) col.push(new Date(start.getTime() + (w * 7 + d) * DAY)); weeks.push(col); }
  let days = 0, climbs = 0;
  for (const k in counts) { const t = new Date(k + "T00:00:00Z").getTime(); if (t >= start.getTime() && t <= end.getTime()) { days++; climbs += counts[k]; } }
  const shade = (n: number) => n <= 0 ? C.surface : n === 1 ? C.blueDim : n === 2 ? C.blue : C.blueSolid;
  const monthOf = (d: Date) => d.toLocaleDateString(DLOCALE, { month: "short", timeZone: "UTC" });
  const dayLabel = (d: Date) => d.toLocaleDateString(DLOCALE, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  // A month label over the first week whose first day starts a new month.
  const labels = weeks.map((col, i) => { const m = col[0].getUTCMonth(); const prev = i ? weeks[i - 1][0].getUTCMonth() : -1; return m !== prev && (i === 0 ? col[0].getUTCDate() <= 7 : true) ? monthOf(col[0]) : ""; });
  const name = (whose || "Your") + " climbing days in the last year: " + days + (days === 1 ? " day" : " days") + (climbs > days ? ", " + climbs + " climbs" : "");
  const cell = 11, gap = 2;
  return <div>
    {/* 52 weeks are wider than the column, so the grid scrolls sideways; a scrollable region must take keyboard
        focus (axe scrollable-region-focusable) so the arrow keys can reach the far end without a mouse. */}
    <div role="img" aria-label={name} tabIndex={0} style={{ overflowX: "auto", paddingBottom: 2 }}>
      <div style={{ display: "flex", gap, marginLeft: 0, marginBottom: 3, minWidth: 52 * (cell + gap) }}>{labels.map((l, i) => <div key={i} style={{ width: cell, flexShrink: 0, fontSize: 9.5, color: C.textMuted, whiteSpace: "nowrap", overflow: "visible" }}>{l}</div>)}</div>
      <div style={{ display: "flex", gap, minWidth: 52 * (cell + gap) }}>{weeks.map((col, i) => <div key={i} style={{ display: "flex", flexDirection: "column", gap }}>{col.map(d => { const n = counts[key(d)] || 0; const future = d.getTime() > todayUtc.getTime(); return <div key={key(d)} title={future ? undefined : dayLabel(d) + (n ? ": " + n + (n === 1 ? " climb" : " climbs") : "")} style={{ width: cell, height: cell, borderRadius: 2, background: future ? "transparent" : shade(n), border: future ? "1px dashed " + C.border : "1px solid " + (n ? "transparent" : C.border), boxSizing: "border-box" }} /> })}</div>)}</div>
    </div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 6, fontSize: 11.5, color: C.textMuted }}>
      <span>{days + (days === 1 ? " day" : " days") + " on rock, snow or ice in the last 52 weeks" + (climbs > days ? " · " + climbs + " climbs" : "")}</span>
      <span aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>Less{[0, 1, 2, 3].map(n => <span key={n} style={{ width: 9, height: 9, borderRadius: 2, background: shade(n), border: "1px solid " + (n ? "transparent" : C.border), boxSizing: "border-box", display: "inline-block" }} />)}More</span>
    </div>
  </div>;
}
