import { useMemo, useState } from "react";
import { C, CAT, DLOCALE, ME, MOUNTAINS, catOf, challengeStats, pubFirst } from "../../ClimbMatchCore.jsx";
import { FONT_DISPLAY } from "../../lib/fonts.js";
import { shortGrade } from "../../lib/grade.js";
import { POP_CLOSE } from "../../lib/popupChrome.js";
import ClimbDaysHeatmap from "./ClimbDaysHeatmap.tsx";

/* YEAR IN CLIMBING (audit, owner's note 2026-11-26: "Does it actually work? Is there anything else that we could add?").
   The recap used to do its own arithmetic, inline in App, and disagreed with the Challenges block that counts the same
   year: "Climbs logged" counted attempts and conditions-only scouting, "Peaks summited" counted only the old Summit tick
   (a Lead that topped out -- summitedLog -- was not a summit) and counted the same peak twice, the hardest send read a
   5.x regex off any grade string (so a follow counted, an alpine "III 5.6" read as 5.6, and a boulderer or ice climber
   had none), "home turf" said "most days" while counting logs, the discipline chips spelled "Toprope", the year grid
   showed the last 52 weeks whatever the year, and in January the recap of a year with nothing in it was all there was.
   Every count now comes from challengeStats(), the one engine the Challenges block reads, so the two cannot disagree. */

/** A log row as the recap reads it: App's `logs`. */
export interface RecapLog {
  routeId: string | number;
  date?: string | null;
  tickType?: string | null;
  scoutOnly?: boolean | null;
  summited?: boolean | null;
  partners?: ReadonlyArray<string> | null;
  [k: string]: unknown;
}
/** A route as `routeById` resolves it (seed or DB, via dbRouteToCamel). */
export interface RecapRoute {
  id: string | number;
  name?: string | null;
  grade?: string | null;
  mountainId?: string | number | null;
  _dbArea?: { name?: string | null } | null;
  [k: string]: unknown;
}
export interface YearInClimbingProps {
  logs: ReadonlyArray<RecapLog>;
  routeById: (id: string | number) => RecapRoute | null | undefined;
  onClose: () => void;
  showToast: (msg: string) => void;
  /** The climbs the logs name are still being read: totals may rise. */
  routesLoading?: boolean;
  /** ...or that read failed: totals may be short. */
  routesFailed?: boolean;
}

/** The three fields that date a log and say whether it is a climb. */
interface DatedLog { date?: string | null; tickType?: string | null; scoutOnly?: boolean | null }
/** A log the stats count: what challengeStats counts (not a conditions-only report). */
const recapCounted = <T extends DatedLog>(l: T | null | undefined): l is T => !!l && !l.scoutOnly && l.tickType !== "Conditions";
const yearOf = (l: DatedLog) => String(l.date || "").slice(0, 4);
/** Every year a climb is logged in, newest first. */
export function recapYears(logs: ReadonlyArray<DatedLog> | null | undefined): number[] {
  const s: Record<string, 1> = {};
  (logs || []).forEach(l => { if (!recapCounted(l)) return; const y = yearOf(l); if (/^\d{4}$/.test(y)) s[y] = 1; });
  return Object.keys(s).map(Number).sort((a, b) => b - a);
}
/** The year the recap opens on: the most recent one with a climb in it -- so in January, before the first climb of the
    new year, it is last year's (Strava's Year in Sport runs December to late January for the same reason). */
export function recapYear(logs: ReadonlyArray<DatedLog> | null | undefined): number | null {
  const ys = recapYears(logs);
  return ys.length ? ys[0] : null;
}
const RECAP_MONTHS = Array.from({ length: 12 }, (_, i) => i);
const GRADED: Array<[string, string]> = [["sport", "sport"], ["trad", "trad"], ["toprope", "toprope"], ["bouldering", "bouldering"], ["ice", "ice"], ["mixed", "mixed"]];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
const labelOf = (c: string) => ((CAT as Record<string, { label?: string } | undefined>)[c] || {}).label || c;
const monthName = (m: number, len: "short" | "long") => new Date(Date.UTC(2000, m, 1)).toLocaleDateString(DLOCALE, { month: len, timeZone: "UTC" });
const dayName = (d: string) => new Date(d.slice(0, 10) + "T00:00:00Z").toLocaleDateString(DLOCALE, { month: "short", day: "numeric", timeZone: "UTC" });
const recapAreaName = (r: RecapRoute | null | undefined): string | null => {
  if (!r) return null;
  const m = r.mountainId != null ? MOUNTAINS.find((x: { id: string }) => x.id === r.mountainId) : null;
  /* A DB route's mountainId is an `areas` id, never in the seed MOUNTAINS: its name rides on _dbArea. No default -- the
     old one was the literal "the Wasatch", so a climber whose only ascent was on Mount Baker was told it was in Utah. */
  return (m && m.name) || (r._dbArea && r._dbArea.name) || null;
};

export interface Recap {
  year: number; days: number; routes: number; pitches: number; summits: number; areas: number; states: number; partners: number;
  prev: { days: number; routes: number; pitches: number; summits: number; areas: number; partners: number } | null;
  best: Array<{ disc: string; label: string; grade: string; isNew: boolean }>;
  byDisc: Array<{ disc: string; label: string; n: number }>;
  months: number[]; busiest: number | null;
  homeTurf: { name: string; days: number } | null;
  newAreas: number;
  topPartner: { name: string; days: number } | null;
  first: { name: string; date: string } | null; last: { name: string; date: string } | null;
}
/** Everything the recap draws for one calendar year: pure, so it can be read without rendering. */
export function buildRecap(logs: ReadonlyArray<RecapLog>, routeById: (id: string | number) => RecapRoute | null | undefined, year: number): Recap {
  const y = String(year);
  const st = challengeStats(logs, routeById, { year: y });
  const pv = challengeStats(logs, routeById, { year: String(year - 1) });
  const prior = challengeStats(logs, routeById, { before: y });
  const yl = logs.filter(l => recapCounted(l) && yearOf(l) === y);
  const best = GRADED.filter(([d]) => st.best[d]).map(([d]) => { const b = st.best[d], p = prior.best[d]; return { disc: d, label: labelOf(d), grade: shortGrade(b.grade) || b.grade, isNew: !!p && b.n > p.n }; });
  const disc: Record<string, Record<string, 1>> = {};
  const monthDays: Array<Record<string, 1>> = RECAP_MONTHS.map(() => ({}));
  const areaDays: Record<string, Record<string, 1>> = {};
  const partnerDays: Record<string, { name: string; days: Record<string, 1> }> = {};
  yl.forEach(l => {
    const day = String(l.date || "").slice(0, 10), r = routeById(l.routeId);
    const m = parseInt(day.slice(5, 7), 10) - 1; if (m >= 0 && m < 12) monthDays[m][day] = 1;
    if (r) { const c = catOf(r); (disc[c] = disc[c] || {})[String(r.id)] = 1; const an = recapAreaName(r); if (an) (areaDays[an] = areaDays[an] || {})[day] = 1; }
    (l.partners || []).forEach(p => { const n = String(p || "").trim(); if (!n || UUID.test(n)) return; const k = n.toLowerCase(); (partnerDays[k] = partnerDays[k] || { name: n, days: {} }).days[day] = 1; });
  });
  const months = monthDays.map(o => Object.keys(o).length);
  const top = Math.max(0, ...months);
  let homeTurf: Recap["homeTurf"] = null;
  Object.keys(areaDays).forEach(k => { const n = Object.keys(areaDays[k]).length; if (!homeTurf || n > homeTurf.days) homeTurf = { name: k, days: n }; });
  let topPartner: Recap["topPartner"] = null;
  Object.keys(partnerDays).forEach(k => { const n = Object.keys(partnerDays[k].days).length; if (!topPartner || n > topPartner.days) topPartner = { name: partnerDays[k].name, days: n }; });
  /* New places: an area first climbed in this year, keyed as challengeStats keys areas (the route's area id). */
  const before: Record<string, 1> = {};
  logs.forEach(l => { if (!recapCounted(l) || !(yearOf(l) && yearOf(l) < y)) return; const r = routeById(l.routeId); if (r && r.mountainId != null) before[String(r.mountainId)] = 1; });
  const mine: Record<string, 1> = {};
  yl.forEach(l => { const r = routeById(l.routeId); if (r && r.mountainId != null && !before[String(r.mountainId)]) mine[String(r.mountainId)] = 1; });
  const sorted = yl.filter(l => l.date).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const named = (l: RecapLog | undefined) => { if (!l) return null; const r = routeById(l.routeId); return { name: (r && r.name) || "A climb", date: String(l.date) }; };
  return {
    year, days: st.days, routes: st.routes, pitches: st.pitches, summits: st.by.summit || 0, areas: st.areas, states: st.states, partners: st.partners,
    prev: pv.climbs ? { days: pv.days, routes: pv.routes, pitches: pv.pitches, summits: pv.by.summit || 0, areas: pv.areas, partners: pv.partners } : null,
    best,
    byDisc: Object.keys(disc).map(d => ({ disc: d, label: labelOf(d), n: Object.keys(disc[d]).length })).sort((a, b) => b.n - a.n),
    /* A busiest month only when one month stands out: four months of one day each have none. */
    months, busiest: top && months.filter(n => n === top).length === 1 ? months.indexOf(top) : null,
    homeTurf, newAreas: Object.keys(mine).length, topPartner,
    first: named(sorted[0]), last: sorted.length > 1 ? named(sorted[sorted.length - 1]) : null,
  };
}

type TileKey = "days" | "routes" | "pitches" | "summits" | "areas" | "partners";
const TILES: Array<[TileKey, string, string]> = [["days", "Days out", "Day out"], ["routes", "Climbs finished", "Climb finished"], ["pitches", "Pitches", "Pitch"], ["summits", "Summits", "Summit"], ["areas", "Crags & areas", "Crag or area"], ["partners", "Partners", "Partner"]];
/** The tiles worth showing: a zero is left out (a sport climber is not told "0 summits"), but days always shows. */
const tilesOf = (r: Recap) => TILES.filter(([k]) => k === "days" || r[k] > 0);
/** The lines a shared recap carries -- numbers only, never a partner's name: they did not choose to be posted. */
export function recapText(r: Recap, who: string): string {
  return [who + "’s " + r.year + " in climbing (ClimbMatch)"]
    .concat(tilesOf(r).map(([k, many, one]) => (r[k] === 1 ? one : many) + ": " + r[k]))
    .concat(r.best.map(b => "Hardest " + b.label.toLowerCase() + ": " + b.grade + (b.isNew ? " (new best)" : "")))
    .concat(r.homeTurf ? ["Home turf: " + r.homeTurf.name] : [])
    .join("\n");
}

/** The recap as a 1080x1350 picture (the portrait shape Instagram and Strava share), drawn on a canvas in the app's own palette. */
function drawCard(r: Recap, who: string): Promise<Blob | null> {
  return new Promise(resolve => {
    const W = 1080, H = 1350, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const g = cv.getContext("2d"); if (!g) { resolve(null); return; }
    const sans = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    g.fillStyle = C.brand; g.fillRect(0, 0, W, 14);
    g.textBaseline = "top";
    g.fillStyle = C.blue; g.font = "700 34px " + sans; g.fillText("YEAR IN CLIMBING", 80, 90);
    g.fillStyle = C.text; g.font = "800 88px " + sans; g.fillText(who + "’s " + r.year, 80, 140, W - 160);
    const tiles = tilesOf(r).slice(0, 6);
    tiles.forEach(([k, many, one], i) => {
      const x = 80 + (i % 2) * 470, y = 300 + Math.floor(i / 2) * 210;
      g.fillStyle = C.card; g.fillRect(x, y, 450, 185); g.strokeStyle = C.border; g.lineWidth = 2; g.strokeRect(x, y, 450, 185);
      g.fillStyle = C.text; g.font = "800 80px " + sans; g.fillText(String(r[k]), x + 32, y + 26, 390);
      g.fillStyle = C.textSub; g.font = "600 32px " + sans; g.fillText(r[k] === 1 ? one : many, x + 32, y + 124, 390);
    });
    let y = 300 + Math.ceil(tiles.length / 2) * 210 + 20;
    if (r.best.length) {
      g.fillStyle = C.blue; g.font = "700 30px " + sans; g.fillText("HARDEST", 80, y); y += 48;
      g.fillStyle = C.text; g.font = "700 40px " + sans; g.fillText(r.best.slice(0, 4).map(b => b.label + " " + b.grade).join("  ·  "), 80, y, W - 160); y += 76;
    }
    if (r.homeTurf && y < H - 200) {
      g.fillStyle = C.blue; g.font = "700 30px " + sans; g.fillText("HOME TURF", 80, y); y += 48;
      g.fillStyle = C.text; g.font = "700 40px " + sans; g.fillText(r.homeTurf.name, 80, y, W - 160);
    }
    g.fillStyle = C.brand; g.font = "800 40px " + sans; g.fillText("ClimbMatch", 80, H - 110);
    cv.toBlob(b => resolve(b), "image/png");
  });
}

export default function YearInClimbing({ logs, routeById, onClose, showToast, routesLoading, routesFailed }: YearInClimbingProps) {
  const years = recapYears(logs);
  const [pick, setPick] = useState<number | null>(null);
  const year = pick != null && years.indexOf(pick) >= 0 ? pick : (years[0] || new Date().getFullYear());
  // eslint-disable-next-line react-hooks/exhaustive-deps -- routeById is rebuilt by App every render; the recap is keyed on the logs, the year and whether the climbs have loaded
  const r = useMemo(() => buildRecap(logs, routeById, year), [logs, year, routesLoading, routesFailed]);
  const who = pubFirst(ME) || "Your";
  const [busy, setBusy] = useState(false);
  const any = r.days > 0;
  const tiles = tilesOf(r);
  const H = (t: string) => <div style={{ fontSize: 12, color: C.blue, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{t}</div>;
  const box = { background: "rgba(255,255,255,0.05)", border: "1px solid " + C.border, borderRadius: 13, padding: "12px 13px", marginBottom: 12 } as const;
  const btn = { flex: 1, minHeight: 44, padding: "10px 6px", borderRadius: 10, border: "1px solid " + C.border, background: "rgba(255,255,255,0.06)", color: C.text, fontSize: 12, fontWeight: 700, cursor: "pointer" } as const;
  const delta = (k: TileKey) => { if (!r.prev) return null; const d = r[k] - r.prev[k]; return d === 0 ? "same as " + (year - 1) : (d > 0 ? "+" : "−") + Math.abs(d) + " vs " + (year - 1); };
  const txt = recapText(r, who);
  const no = () => showToast("Couldn’t copy — your browser blocked clipboard access");
  const copy = () => { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => showToast("Year copied"), no); else no(); };
  const image = (share: boolean) => {
    if (busy) return; setBusy(true);
    drawCard(r, who).then(b => {
      setBusy(false);
      if (!b) { showToast("Couldn’t draw the picture on this device"); return; }
      const name = "climbmatch-" + r.year + ".png";
      const file = typeof File !== "undefined" ? new File([b], name, { type: "image/png" }) : null;
      if (share && file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], text: txt }).catch(() => { /* the climber closed the sheet */ }); return; }
      if (share && navigator.share) { navigator.share({ text: txt }).catch(() => { /* the climber closed the sheet */ }); return; }
      const url = URL.createObjectURL(b); const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
      showToast("Picture saved");
    }, () => { setBusy(false); showToast("Couldn’t draw the picture on this device"); });
  };
  const top = Math.max(1, ...r.months);
  return <div onClick={onClose} tabIndex={-1} onKeyDown={e => { if (e.key === "Escape") onClose(); }} role="dialog" aria-modal="true" aria-label="Year in review" style={{ position: "fixed", inset: 0, background: C.scrim, zIndex: 155, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}><div onClick={e => e.stopPropagation()} style={{ background: C.bg, width: "100%", maxWidth: 460, maxHeight: "88vh", overflowY: "auto", overscrollBehavior: "contain", borderRadius: 20, border: "1px solid " + C.blueDim, padding: "22px 20px", boxSizing: "border-box" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}><div style={{ fontSize: 12, fontWeight: 700, color: C.blue, letterSpacing: 1, textTransform: "uppercase" }}>Year in Climbing</div><button onClick={onClose} aria-label="Close" style={POP_CLOSE}>✕</button></div>
    <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 2, color: C.text }}>{who + "’s " + year}</div>
    <div style={{ fontSize: 12.5, color: C.textSub, marginBottom: years.length > 1 ? 10 : 16, lineHeight: 1.5 }}>{any ? "Your year on rock, snow and ice — here’s how it added up." : "Nothing logged in " + year + " yet."}</div>
    {years.length > 1 ? <div className="cm-hscroll" style={{ display: "flex", gap: 7, overflowX: "auto", marginBottom: 14, paddingBottom: 2 }}>{years.map(y => { const on = y === year; return <button key={y} onClick={() => setPick(y)} aria-pressed={on} style={{ flexShrink: 0, minHeight: 36, padding: "7px 14px", borderRadius: 18, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? C.text : C.textSub, fontSize: 13, fontWeight: on ? 800 : 600, cursor: "pointer" }}>{String(y)}</button>; })}</div> : null}
    {routesLoading ? <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>Still loading some of your climbs — these numbers may rise.</div> : routesFailed ? <div style={{ fontSize: 12, color: C.amber, marginBottom: 10 }}>Some of your climbs couldn’t load, so these totals may be short.</div> : null}
    {/* CLIMBING DAYS (batch B, item 18): the same grid as Completed, for THIS calendar year (it showed the last 52 weeks whatever the year). */}
    <div style={{ marginBottom: 16 }}><ClimbDaysHeatmap C={C} year={year} dates={logs.filter(recapCounted).map(l => l.date)} /></div>
    {any ? <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>{tiles.map(([k, many, one]) => { const d = delta(k); return <div key={k} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid " + C.border, borderRadius: 13, padding: "13px 12px" }}><div style={{ fontSize: 26, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>{r[k]}</div><div style={{ fontSize: 11.5, color: C.textSub, marginTop: 3 }}>{r[k] === 1 ? one : many}</div>{d ? <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{d}</div> : null}</div>; })}</div>
      {r.best.length ? <div style={box}>{H("Hardest in " + year)}{r.best.map(b => <div key={b.disc} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 13, color: C.text, padding: "3px 0" }}><span>{b.label}</span><span style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 800 }}>{b.isNew ? <span style={{ fontSize: 10.5, fontWeight: 800, color: C.amber, border: "1px solid " + C.amber, borderRadius: 6, padding: "1px 6px" }}>New best</span> : null}{b.grade}</span></div>)}<div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, lineHeight: 1.4 }}>Climbs you finished, by their catalog grade. A new best beats every year before it.</div></div> : null}
      <div style={box}>{H("Month by month")}<div role="img" aria-label={"Climbing days per month in " + year + ": " + RECAP_MONTHS.map(m => monthName(m, "short") + " " + r.months[m]).join(", ")} style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 70 }}>{RECAP_MONTHS.map(m => <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}><div style={{ width: "100%", height: Math.round((r.months[m] / top) * 50), minHeight: r.months[m] ? 3 : 1, background: r.months[m] ? (m === r.busiest ? C.brand : C.blue) : C.border, borderRadius: 2 }} /><div aria-hidden="true" style={{ fontSize: 9.5, color: C.textMuted }}>{monthName(m, "short").slice(0, 1)}</div></div>)}</div>{r.busiest != null ? <div style={{ fontSize: 12, color: C.textSub, marginTop: 6 }}>{"Busiest month: " + monthName(r.busiest, "long") + " · " + r.months[r.busiest] + (r.months[r.busiest] === 1 ? " day" : " days")}</div> : null}</div>
      {r.homeTurf ? <div style={{ background: C.blueBg, border: "1px solid " + C.blueDim, borderRadius: 13, padding: "13px 14px", marginBottom: 12 }}><div style={{ fontSize: 12, color: C.text, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Your home turf</div><div style={{ fontSize: 14.5, fontWeight: 700, color: C.text }}>{r.homeTurf.name}</div><div style={{ fontSize: 11.5, color: C.textSub, marginTop: 2 }}>{"Where you climbed on the most days: " + r.homeTurf.days + (r.homeTurf.days === 1 ? " day" : " days") + "."}{r.newAreas ? " " + r.newAreas + (r.newAreas === 1 ? " crag or area" : " crags and areas") + " you climbed at for the first time." : ""}</div></div> : null}
      {r.topPartner ? <div style={box}>{H("Most days out with")}<div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{r.topPartner.name}</div><div style={{ fontSize: 11.5, color: C.textSub, marginTop: 2 }}>{r.topPartner.days + (r.topPartner.days === 1 ? " day" : " days") + " together. Only you see this; it is left out of what you share."}</div></div> : null}
      {r.byDisc.length ? <div style={{ marginBottom: 12 }}>{H("Logged, by discipline")}<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{r.byDisc.map(d => <span key={d.disc} style={{ fontSize: 11.5, fontWeight: 700, color: C.textSub, background: "rgba(255,255,255,0.06)", border: "1px solid " + C.border, borderRadius: 8, padding: "4px 10px" }}>{d.label + " " + d.n}</span>)}</div></div> : null}
      {r.first ? <div style={box}>{H(r.last ? "First and last climb" : "Your climb in " + year)}{[r.first, r.last].filter((x): x is { name: string; date: string } => !!x).map((x, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5, color: C.text, padding: "4px 0" }}><span style={{ overflowWrap: "anywhere" }}>{x.name}</span><span style={{ color: C.textMuted, flexShrink: 0, fontSize: 12 }}>{dayName(x.date)}</span></div>)}</div> : null}
    </> : null}
    <div style={{ borderTop: "1px solid " + C.border, paddingTop: 13 }}>{any ? <>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, lineHeight: 1.15, color: C.text, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>Share your year</div>
      {/* One picture (the portrait card Strava's Year in Sport shares), the native share sheet where the browser has one, and
          a copy that really writes to the clipboard. Numbers only: no partner's name leaves the app. */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => image(false)} disabled={busy} style={btn}>{busy ? "Drawing…" : "Save image"}</button>
        <button onClick={copy} style={btn}>Copy my year</button>
        {typeof navigator !== "undefined" && "share" in navigator ? <button onClick={() => image(true)} disabled={busy} style={btn}>↗ Share…</button> : null}
      </div></> : /* An all-zero recap is not something to post; offering the buttons invites sharing a blank year. */<div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>Log a climb this year and your recap becomes something worth sharing.</div>}</div>
  </div></div>;
}
