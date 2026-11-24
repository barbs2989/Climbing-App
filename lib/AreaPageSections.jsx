// The area page's new sections (2026-10-15): ABOUT, AREA FACTS, CLIMBS HERE (the chart), GRADE
// SPREAD, the pending-edits banner and the month strip. Mounted by AreaPage in DbAreaBrowser.jsx;
// GETTING THERE and TOP RATED live there too (one needs the browser's Directions gate literal,
// the other its RouteRow). `C` arrives as a prop — this file must not import ClimbMatchCore.
//
// Honesty rules these sections keep:
//   - a fact that is not stored is not printed (no "Unknown", no zero posing as a value);
//   - the chart's headline is the SUM OF ITS BARS, and a remainder the bars do not show is
//     said in words ("+N not typed") rather than hidden in the headline;
//   - the grade spread draws ONE discipline on ONE scale at a time, and offers every discipline the area
//     has as a chip (and every scale that discipline is really graded on there: one holding under 5% of
//     the discipline's graded climbs is a filing stray and gets no chip, see SCALE_MIN_SHARE).
import { useState } from "react";
import { AREA_EDIT_FIELDS, MONTH_ABBR, monthsLabel, myPendingAreaEdits } from "./areaFields";
import { DISC_COLORS } from "./disciplines";
import { DISC_LABELS as DL, DISC_SHORT as DS } from "./discLabels";
import { EditIconButton } from "./areaChrome";
import { CHIP } from "./buttonStyles.js";
import ActionIcon from "../src/components/ActionIcon.tsx";
import EmptyState from "../src/components/EmptyState.tsx";

const card = C => ({ background: C.card, borderRadius: 12, padding: "12px 14px", border: "1px solid " + C.border, marginBottom: 12 });
// THE AREA SHEET (owner, 2026-11-11: "create borders between each section so it reads nicely"): the area page's
// top sections sit in ONE bordered sheet, split by 1px rules, instead of a stack of floating cards with 12px gaps
// between them -- the gaps and card padding were most of the height you scrolled past to reach the areas below.
export const areaSheet = C => ({ background: C.card, borderRadius: 12, border: "1px solid " + C.border, marginBottom: 14, overflow: "hidden" });
export const areaSection = (C, first) => ({ padding: "12px 14px", borderTop: first ? "none" : "1px solid " + C.border });
const headRow = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 };
const Head = ({ children, C }) => <div role="heading" aria-level={3} style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: 0.4, textTransform: "uppercase" }}>{children}</div>;

// ── ABOUT ──
// A long description opens at about nine lines with a Read more (owner's note, 2026-10-28: "expand each section
// with more detail and not take too much screen space") -- the route page's comment clamp, ClampText, is the
// model. A short one renders whole, with no button.
// In the area sheet (`flat`) it opens at about four lines, fading out, with Show more (owner, 2026-11-11: "a
// dropdown after a certain amount of text").
const ABOUT_CLAMP_CHARS = 600, ABOUT_CLAMP_PX = 188, ABOUT_FLAT_CHARS = 260, ABOUT_FLAT_PX = 86;
export function AboutCard({ area, C, onEdit, flat, first }) {
  const [open, setOpen] = useState(false);
  const blurb = area.blurb && String(area.blurb).trim();
  const long = !!blurb && blurb.length > (flat ? ABOUT_FLAT_CHARS : ABOUT_CLAMP_CHARS);
  const clampPx = flat ? ABOUT_FLAT_PX : ABOUT_CLAMP_PX;
  return <div style={flat ? areaSection(C, first) : card(C)}>
    <div style={headRow}><Head C={C}>{flat ? "Description" : "About"}</Head>{onEdit ? <EditIconButton C={C} onClick={() => onEdit("blurb")} title={"Edit the description of " + area.name} /> : null}</div>
    {blurb
      ? <>
        <div style={long && !open ? { maxHeight: clampPx, overflow: "hidden", WebkitMaskImage: "linear-gradient(to bottom, #000 70%, transparent)", maskImage: "linear-gradient(to bottom, #000 70%, transparent)" } : null}>
          {blurb.split(/\n{2,}/).map((p, i) => <div key={i} style={{ fontSize: 13, color: C.textSub, lineHeight: 1.6, marginTop: i ? 8 : 0, overflowWrap: "anywhere" }}>{p}</div>)}
        </div>
        {long ? <button onClick={() => setOpen(!open)} aria-expanded={open} style={{minHeight:44, background: "none", border: "none", padding: "6px 0 0", color: C.blue, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{open ? "Show less" : flat ? "Show more" : "Read more"}</button> : null}
      </>
      : <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>{"No description yet. Climbed here? "}{onEdit ? <button onClick={() => onEdit("blurb")} style={{ background: "none", border: "none", padding: 0, color: C.blue, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Tell people what it is like</button> : "Tell people what it is like"}{"."}</div>}
  </div>;
}

// ── Month strip ──
export function MonthStrip({ months, C, compact }) {
  const on = new Set((months || []).map(Number));
  return <div role="img" aria-label={"Season: " + monthsLabel(months)} style={{ display: "flex", gap: 2 }}>
    {MONTH_ABBR.map((m, i) => <div key={m} style={{ flex: 1, textAlign: "center" }}>
      <div style={{ height: compact ? 6 : 8, borderRadius: 3, background: on.has(i + 1) ? C.green : "rgba(255,255,255,0.08)" }} />
      {compact ? null : <div style={{ fontSize: 9.5, color: on.has(i + 1) ? C.text : C.textMuted, marginTop: 3, fontWeight: on.has(i + 1) ? 700 : 500 }}>{m[0]}</div>}
    </div>)}
  </div>;
}

// ── MOST LOGGED HERE — twelve bars, the month's share of the busiest month ──
// Counts from area_logged_months (0403): what climbers actually logged under this area, by calendar
// month. Drawn only when something was logged; the label names the months at half the peak or more.
export function LoggedMonthStrip({ counts, C }) {
  const max = Math.max(...counts);
  const desc = MONTH_ABBR.map((m, i) => m + " " + counts[i]).join(", ");
  return <div role="img" aria-label={"Logged climbs by month: " + desc} style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
    {MONTH_ABBR.map((m, i) => <div key={m} style={{ flex: 1, textAlign: "center" }}>
      <div style={{ height: 22, display: "flex", alignItems: "flex-end" }}><div style={{ width: "100%", height: counts[i] ? Math.max(2, Math.round(counts[i] / max * 22)) : 2, borderRadius: 2, background: counts[i] ? C.blue : "rgba(255,255,255,0.08)" }} /></div>
      <div style={{ fontSize: 9.5, color: counts[i] === max ? C.text : C.textMuted, marginTop: 3, fontWeight: counts[i] === max ? 700 : 500 }}>{m[0]}</div>
    </div>)}
  </div>;
}
export function loggedTopMonths(counts) {
  const max = Math.max(...counts);
  return max > 0 ? counts.map((n, i) => (n >= max / 2 ? i + 1 : 0)).filter(Boolean) : [];
}

// ── AREA FACTS ──
// Each fact is a tile: an icon in a tinted square, the label, then the value (owner, 2026-11-23: "make the area facts
// look nicer"). The icon and tint are keyed by the label and are decoration only -- the label still says what it is.
// `loggedMonths`: the twelve counts from useAreaLoggedMonths, or null to draw no MOST LOGGED strip.
const FACT_LOOK = { Rock: ["rock", "orange"], Faces: ["explore", "teal"], Elevation: ["mountain", "purple"], "Walk-in": ["clock", "green"], Parking: ["car", "amber"] };
const factLbl = C => ({ fontSize: 10.5, fontWeight: 700, color: C.label, letterSpacing: 0.3, textTransform: "uppercase" });
function FactTile({ label, value, C }) {
  const [icon, tone] = FACT_LOOK[label] || ["info", "teal"];
  // A long value (a parking lot described in a sentence) takes the whole row rather than wrapping into a tall, thin tile.
  const wide = String(value).length > 22;
  return <div style={{ gridColumn: wide ? "1 / -1" : undefined, display: "flex", alignItems: "center", gap: 10, minWidth: 0, padding: "9px 10px", borderRadius: 10, background: C.surface, border: "1px solid " + C.borderLight }}>
    <span aria-hidden="true" style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: C[tone + "Bg"] }}><ActionIcon name={icon} size={17} color={C[tone]} /></span>
    <div style={{ minWidth: 0 }}><div style={factLbl(C)}>{label}</div><div style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.3, overflowWrap: "anywhere" }}>{value}</div></div>
  </div>;
}
// A month strip with its heading on the left and what it says on the right, on the inset surface the tiles use.
function MonthBlock({ title, summary, tone, first, children, C }) {
  return <div style={{ marginTop: first ? 0 : 10, padding: "10px 12px", borderRadius: 10, background: C.surface, border: "1px solid " + C.borderLight }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 7 }}><span style={factLbl(C)}>{title}</span><span style={{ fontSize: 12.5, fontWeight: 700, color: C[tone] }}>{summary}</span></div>
    {children}
  </div>;
}
export function AreaFactsCard({ area, C, uElev, onEdit, loggedMonths }) {
  const facts = [];
  const logged = Array.isArray(loggedMonths) && loggedMonths.length === 12 && loggedMonths.some(n => Number(n) > 0) ? loggedMonths.map(Number) : null;
  const loggedTotal = logged ? logged.reduce((a, n) => a + n, 0) : 0;
  if (area.rock) facts.push(["Rock", String(area.rock).replace(/^./, s => s.toUpperCase()), "rock"]);
  if (area.aspect) facts.push(["Faces", area.aspect === "varies" ? "Varies" : area.aspect, "aspect"]);
  if (area.elevation_ft) facts.push(["Elevation", uElev ? uElev(area.elevation_ft) : area.elevation_ft.toLocaleString() + " ft", null]);
  if (area.approach_min != null && area.approach_min > 0) facts.push(["Walk-in", "about " + area.approach_min + " min", "approach_min"]);
  if (area.parking_name && area.parking_name !== "Trailhead") facts.push(["Parking", area.parking_name, null]);
  const season = Array.isArray(area.season_months) && area.season_months.length ? area.season_months : null;
  // Nothing stored and nothing logged: the invitation, never an empty grid (check:area-page-honest reads this gate).
  if (!facts.length && !season) if (!logged) {
    return <div style={card(C)}>
      <div style={headRow}><Head C={C}>Area facts</Head>{onEdit ? <EditIconButton C={C} onClick={() => onEdit("rock")} title={"Add facts about " + area.name} /> : null}</div>
      <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>{"Nothing on file yet — rock, which way it faces, the walk-in, the season. Know it? Add it."}</div>
    </div>;
  }
  return <div style={card(C)}>
    <div style={headRow}><Head C={C}>Area facts</Head>{onEdit ? <EditIconButton C={C} onClick={() => onEdit(facts.find(f => f[2]) ? facts.find(f => f[2])[2] : "rock")} title={"Edit the facts about " + area.name} /> : null}</div>
    {facts.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
      {facts.map(([l, v]) => <FactTile key={l} label={l} value={v} C={C} />)}
    </div> : null}
    {season ? <MonthBlock title="Season" summary={monthsLabel(season)} tone="green" first={!facts.length} C={C}><MonthStrip months={season} C={C} /></MonthBlock> : null}
    {logged ? <MonthBlock title="Most logged here" summary={monthsLabel(loggedTopMonths(logged)) + " · " + loggedTotal.toLocaleString() + " log" + (loggedTotal !== 1 ? "s" : "")} tone="blue" first={!facts.length && !season} C={C}><LoggedMonthStrip counts={logged} C={C} /></MonthBlock> : null}
  </div>;
}

// ── CLIMBS HERE — one bar per discipline, over the subtree ──
// Each bar is a BUTTON that opens the Route finder on that discipline (when the finder can
// filter on it); the bar's own label and count sit beside it, so identity never rests on the
// colour alone. Headline = sum of the bars; anything the bars cannot show is said under them.
// `bare`: drawn inside the grade-spread disclosure (no card of its own, no repeated heading).
export function ClimbsChart({ stats, loading, error, C, discOptions, onDisc, children, bare }) {
  const rows = stats && Array.isArray(stats.by_disc) ? stats.by_disc.filter(d => d && d.n > 0) : [];
  const sum = rows.reduce((a, d) => a + Number(d.n), 0);
  const total = stats ? Number(stats.total) || 0 : 0;
  const max = rows.length ? Math.max(...rows.map(d => Number(d.n))) : 0;
  const can = disc => !!(onDisc && discOptions && discOptions.includes(disc));
  return <div style={bare ? { marginTop: 8 } : card(C)}>
    <div style={headRow}><Head C={C}>{bare ? "By type" : "Climbs here"}</Head>{rows.length ? <span style={{ fontSize: 12.5, color: C.textSub, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{sum.toLocaleString() + " climb" + (sum !== 1 ? "s" : "")}</span> : null}</div>
    {loading && !stats ? <div style={{ fontSize: 12, color: C.textMuted }}>Counting…</div> : null}
    {error && !stats ? <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>Couldn't count the climbs here just now — check your connection and try again.</div> : null}
    {stats && !rows.length ? <EmptyState C={C} icon="chart" style={{ padding: "12px 14px 6px" }}>No climbs filed here yet.</EmptyState> : null}
    {rows.map(d => {
      const label = DS[d.disc] || DL[d.disc] || d.disc, n = Number(d.n), pct = max ? Math.max(2, Math.round(n / max * 100)) : 0, col = DISC_COLORS[d.disc] || C.blue;
      const inner = <>
        <span style={{ width: 92, flexShrink: 0, fontSize: 12.5, fontWeight: 600, color: C.text, textAlign: "left", overflowWrap: "anywhere" }}>{label}</span>
        <span aria-hidden="true" style={{ flex: 1, minWidth: 0, height: 12, display: "flex", alignItems: "center" }}><span style={{ width: pct + "%", height: 12, borderRadius: "0 4px 4px 0", background: col }} /></span>
        <span style={{ width: 54, flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: C.textSub, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{n.toLocaleString()}</span>
      </>;
      const st = { display: "flex", alignItems: "center", gap: 8, width: "100%", minHeight: 30, padding: "2px 0", background: "none", border: "none", cursor: can(d.disc) ? "pointer" : "default", textAlign: "left" };
      return can(d.disc)
        ? <button key={d.disc} onClick={() => onDisc(d.disc)} aria-label={label + " — " + n.toLocaleString() + " climb" + (n !== 1 ? "s" : "") + ", open in Route finder"} style={st}>{inner}</button>
        : <div key={d.disc} role="img" aria-label={label + " — " + n.toLocaleString() + " climb" + (n !== 1 ? "s" : "")} style={st}>{inner}</div>;
    })}
    {stats && total > sum ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 4 }}>{"+" + (total - sum).toLocaleString() + " filed with no type"}</div> : null}
    {children}
  </div>;
}

// ── GRADE SPREAD — columns over one discipline's grades ──
// THE DISCIPLINE PICKER (owner, 2026-11-18: "grade spread needs to have trad, sport, top rope be it's own
// discipline. Make sure every dicipline is its own chip if there's that type of climbing in that area"): one
// chip per DISCIPLINE with a graded climb here (area_climb_stats.by_grade_disc, 0476), in this order. It was one
// chip per grading scale, which drew trad, sport and top rope as a single "Rock". A discipline graded on more
// than one scale here (alpine: 5.x and Class) gets a second chip row for the scale.
// A SLIVER IS NOT A SCALE (owner, 2026-11-18, "do what you recommend"): Washington's Sport chip offered
// "5.x · Class" for 3 climbs filed on a Class grade out of 4,938, and Bouldering "5.x · V" for a handful, so
// nearly every chip grew a second row and the chart moved down for nothing. A scale holding less than this share
// of the picked discipline's graded climbs here gets no chip. Those few climbs are then on no chart; they are
// still counted under "Climbs here by type" and listed in the Route finder.
const SCALE_MIN_SHARE = 0.05;
const DISC_ORDER = ["trad", "sport", "toprope", "bouldering", "alpine", "ice", "mixed", "aid", "mountaineering", "scrambling", "hiking"];
const ROPED_ROCK = ["trad", "sport", "toprope"];
const SYS_ORDER = ["yds", "v", "wi", "m", "aid", "class", "snow"];
const SYS_PICK = { yds: "5.x", v: "V", wi: "WI", m: "M", aid: "Aid", class: "Class", snow: "Snow" };
const SYS_NAME = { yds: "rock grades", v: "V grades", wi: "ice grades", m: "mixed grades", aid: "aid grades", class: "class grades", snow: "snow grades" };
const discName = d => d ? (DL[d] || d) : "No type";
// The chart's rows, one per (discipline, scale, bucket). A response cached from before 0476 has no
// by_grade_disc: its by_grade rows are drawn with no discipline, so the scale chips alone remain.
function spreadRows(stats) {
  const src = stats && Array.isArray(stats.by_grade_disc) ? stats.by_grade_disc : stats && Array.isArray(stats.by_grade) ? stats.by_grade : [];
  return src.filter(g => g && g.n > 0 && g.sys).map(g => ({ disc: g.disc || "", sys: g.sys, b: Number(g.bucket), n: Number(g.n) }));
}
export function bucketLabel(sys, b) {
  b = Number(b);
  if (sys === "yds") return "5." + b;
  if (sys === "v") return b < 0 ? "VB" : "V" + b;
  if (sys === "wi") return "WI" + b;
  if (sys === "m") return "M" + b;
  if (sys === "aid") return "A" + b;
  if (sys === "class") return "Class " + b;
  return String(b);
}
// THE COUNT AXIS (owner, 2026-11-18: "there should be a number on the y axis to give context to how many
// climbs"): the tick values up the left of the chart, 0 first. The top tick is the first round number at or
// above the tallest column, in at most four steps of 1, 2 or 5 times a power of ten, so every tick is a whole
// number of climbs and the bars are drawn against the top tick, not against the tallest column.
const Y_AXIS_W = 24, Y_GAP = 5;
export function countAxis(max) {
  max = Math.max(1, Math.ceil(Number(max) || 0));
  for (let p = 1; ; p *= 10) for (const m of [1, 2, 5]) {
    const step = m * p, n = Math.ceil(max / step);
    if (n <= 4) return Array.from({ length: n + 1 }, (_, i) => i * step);
  }
}
const countTick = t => t >= 1000 ? (t / 1000) + "k" : String(t);
// Whether GradeSpread would draw anything: the area page lays the two charts side by side on the
// website only when both exist.
export function hasGradeSpread(stats) {
  return spreadRows(stats).length > 0;
}
// `standalone` draws it as its own card (beside CLIMBS HERE on the website) instead of a ruled
// section under the discipline bars.
// `bare`: no wrapper (the disclosure draws the section). `onGrade(sys, bucket, disc)`: each column is a button
// that opens the Route finder on that grade and discipline -- the chart is the way into the finder, not a picture
// beside it.
export function GradeSpread({ stats, C, standalone, bare, onGrade }) {
  const [picked, setPicked] = useState(null);
  const [pickedSys, setPickedSys] = useState(null);
  const rows = spreadRows(stats);
  if (!rows.length) return null;
  const byDisc = {};
  for (const g of rows) byDisc[g.disc] = (byDisc[g.disc] || 0) + g.n;
  // Every discipline with a graded climb is a chip; climbs filed with no type come last. It opens on the biggest
  // of trad, sport and top rope (the owner's "start with the default as rock"), else the biggest discipline.
  const discs = [...DISC_ORDER.filter(k => byDisc[k]), ...Object.keys(byDisc).filter(k => k && !DISC_ORDER.includes(k)), ...(byDisc[""] ? [""] : [])];
  const biggest = list => list.slice().sort((x, y) => byDisc[y] - byDisc[x])[0];
  const disc = picked !== null && byDisc[picked] ? picked : biggest(discs.some(k => ROPED_ROCK.includes(k)) ? discs.filter(k => ROPED_ROCK.includes(k)) : discs);
  const mine = rows.filter(g => g.disc === disc);
  const bySys = {};
  for (const g of mine) bySys[g.sys] = (bySys[g.sys] || 0) + g.n;
  // Every scale the picked discipline is graded on is a chip too, a sliver aside (SCALE_MIN_SHARE; the biggest of
  // at most seven scales always clears 5%); it opens on the one with the most climbs. With no discipline (climbs
  // filed with no type, or an answer from before 0476) a small scale is a whole discipline, not a stray: all stay.
  const scales = [...SYS_ORDER.filter(k => bySys[k]), ...Object.keys(bySys).filter(k => !SYS_ORDER.includes(k))].filter(k => !disc || bySys[k] >= byDisc[disc] * SCALE_MIN_SHARE);
  const sys = pickedSys && bySys[pickedSys] ? pickedSys : scales.slice().sort((x, y) => bySys[y] - bySys[x])[0];
  const cols = mine.filter(g => g.sys === sys).map(g => ({ b: g.b, n: g.n })).sort((x, y) => x.b - y.b);
  if (!cols.length) return null;
  // Fill the gaps so the axis is a scale, not a list of whatever happened to exist.
  const lo = cols[0].b, hi = cols[cols.length - 1].b, full = [];
  for (let b = lo; b <= hi; b++) { const f = cols.find(c => c.b === b); full.push({ b, n: f ? f.n : 0 }); }
  const max = Math.max(...full.map(c => c.n));
  const axis = countAxis(max), top = axis[axis.length - 1];
  const W = 100, H = 56, gap = 2, bw = (W - gap * (full.length - 1)) / full.length, every = full.length > 9 ? 2 : 1;
  const label = c => bucketLabel(sys, c.b);
  // Every other grade is named when there are many, and always the last. When the last is not on that stride the
  // one before it stays blank: side by side on a phone the two ran together ("5.145.15", seen at 390 and 320px).
  const last = full.length - 1, showLabel = i => i === last || (i % every === 0 && !(every > 1 && last % every !== 0 && i === last - 1));
  const desc = full.filter(c => c.n).map(c => label(c) + ": " + c.n).join(", ");
  const named = discs.some(k => k);
  const chip = on => ({ ...CHIP, flexShrink: 0, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? "#fff" : C.textSub });
  const chipRow = { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 3, marginBottom: 8 };
  return <div style={bare ? null : standalone ? card(C) : { marginTop: 12, paddingTop: 10, borderTop: "1px solid " + C.border }}>
    <div style={{ ...headRow, marginBottom: 6 }}><Head C={C}>Grade spread</Head>{scales.length > 1 ? null : <span style={{ fontSize: 11.5, color: C.textMuted }}>{SYS_NAME[sys] || sys}</span>}</div>
    {named ? <div role="group" aria-label="Grade spread discipline" className="cm-hscroll" style={chipRow}>
      {discs.map(k => <button key={k || "none"} onClick={() => { setPicked(k); setPickedSys(null); }} aria-pressed={k === disc} style={chip(k === disc)}>{discName(k)}</button>)}
    </div> : null}
    {scales.length > 1 ? <div role="group" aria-label="Grade spread grading scale" className="cm-hscroll" style={chipRow}>
      {scales.map(k => <button key={k} onClick={() => setPickedSys(k)} aria-pressed={k === sys} aria-label={SYS_NAME[k] || k} style={chip(k === sys)}>{SYS_PICK[k] || k}</button>)}
    </div> : null}
    <div style={{ display: "flex", gap: Y_GAP }}>
    <div aria-hidden="true" style={{ position: "relative", width: Y_AXIS_W, flexShrink: 0, height: 56 }}>
      {axis.map(t => <span key={t} style={{ position: "absolute", right: 0, bottom: (t / top * 100) + "%", transform: "translateY(50%)", fontSize: 9.5, lineHeight: 1, color: C.textMuted, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{countTick(t)}</span>)}
    </div>
    <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
    <svg role="img" aria-label={(disc ? discName(disc) + " climbs" : "Climbs") + " by grade (" + (SYS_NAME[sys] || sys) + "): " + desc} viewBox={"0 0 " + W + " " + H} preserveAspectRatio="none" style={{ width: "100%", height: 56, display: "block" }}>
      {axis.map(t => t ? <line key={"t" + t} x1={0} x2={W} y1={H - t / top * H} y2={H - t / top * H} stroke={C.border} strokeWidth={1} vectorEffect="non-scaling-stroke" /> : null)}
      {full.map((c, i) => { const h = Math.max(c.n ? 1.5 : 0, c.n / top * H); return <rect key={c.b} x={i * (bw + gap)} y={H - h} width={bw} height={h} rx={0} fill={C.blueSolid} />; })}
    </svg>
    {onGrade && gradeFinderRange(sys, lo) ? <div style={{ position: "absolute", inset: 0, display: "flex", gap: gap + "px" }}>
      {full.map(c => c.n ? <button key={c.b} onClick={() => onGrade(sys, c.b, disc)} aria-label={label(c) + ": " + c.n.toLocaleString() + " climb" + (c.n !== 1 ? "s" : "") + ", open in Route finder"} style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", padding: 0, cursor: "pointer" }} /> : <span key={c.b} aria-hidden="true" style={{ flex: 1, minWidth: 0 }} />)}
    </div> : null}
    </div>
    </div>
    <div style={{ display: "flex", gap: gap + "px", marginTop: 3, marginLeft: Y_AXIS_W + Y_GAP }}>
      {full.map((c, i) => <div key={c.b} style={{ flex: 1, minWidth: 0, textAlign: "center", fontSize: 9.5, color: C.textMuted, whiteSpace: "nowrap", overflow: "visible" }}>{showLabel(i) ? label(c) : ""}</div>)}
    </div>
  </div>;
}

// The Route finder filter a grade column opens: that bucket on the finder's own scale labels
// (RouteFinderPanel GRADE_SCALES), with the disciplines graded on that scale. null = not offered.
const SYS_DISCS = { yds: ["sport", "trad", "toprope"], v: ["bouldering"], wi: ["ice"], m: ["mixed"], aid: ["aid"], class: ["scrambling"] };
export function gradeFinderRange(sys, b) {
  b = Number(b);
  if (!SYS_DISCS[sys] || !isFinite(b)) return null;
  if (sys === "yds") return b >= 10 ? ["5." + b + "a", "5." + b + "d"] : ["5." + b, "5." + b];
  if (sys === "v") return b < 0 ? ["VB", "VB"] : ["V" + b, "V" + b];
  if (sys === "aid") return ["A" + b + "/C" + b, "A" + b + "/C" + b];
  const l = bucketLabel(sys, b);
  return [l, l];
}
// `disc`: the discipline chip the column was drawn under. The caller passes it only when the finder can filter
// that discipline on that scale; without it the finder opens on every discipline graded on the scale.
export function gradeFinderFilters(sys, b, stats, disc) {
  const r = gradeFinderRange(sys, b);
  if (!r) return null;
  if (disc) return { discs: [disc], gSys: sys, gLo: r[0], gHi: r[1], sortBy: "lr" };
  const here = stats && Array.isArray(stats.by_disc) ? stats.by_disc.filter(d => d && d.n > 0).map(d => d.disc) : [];
  const discs = SYS_DISCS[sys].filter(d => here.includes(d));
  return { discs: discs.length ? discs : SYS_DISCS[sys], gSys: sys, gLo: r[0], gHi: r[1], sortBy: "lr" };
}

// ── GRADE SPREAD, with CLIMBS HERE behind a dropdown (owner, 2026-11-11: "Just show grade spread and allow
// them to dropdown to view the climbs here chart") ──
// The first section of the area sheet. With no grade spread to draw, the dropdown alone remains.
// The open/closed choice is remembered on this device (a convenience, so storage failing is fine).
const TYPES_OPEN_KEY = "cm.area.typesOpen";
function readTypesOpen() { try { return typeof localStorage !== "undefined" && localStorage.getItem(TYPES_OPEN_KEY) === "1"; } catch { return false; } }
const SKELETON_BARS = [28, 52, 70, 86, 64, 52, 42, 34, 26, 18, 12, 8];
export function GradeSpreadDisclosure({ stats, loading, error, C, discOptions, onDisc, onGrade, first }) {
  const [open, setOpenRaw] = useState(readTypesOpen);
  const setOpen = v => { setOpenRaw(v); try { localStorage.setItem(TYPES_OPEN_KEY, v ? "1" : "0"); } catch { /* storage off: still toggles */ } };
  const rows = stats && Array.isArray(stats.by_disc) ? stats.by_disc.filter(d => d && d.n > 0) : [];
  const typed = rows.reduce((a, d) => a + Number(d.n), 0);
  const spread = hasGradeSpread(stats);
  return <div style={areaSection(C, first)}>
    {spread ? <GradeSpread stats={stats} C={C} bare onGrade={onGrade} /> : null}
    {/* LOADING HOLDS THE LOADED SHAPE (2026-11-18): faint bars where the chart will be and "Counting…" where
        "Climbs here by type" will be, about as tall as both (145-178px measured), so every card under it does not
        drop ~150px when the counts arrive. */}
    {loading && !stats ? <div aria-busy="true">
      <div aria-hidden="true" style={{ height: 105, display: "flex", alignItems: "flex-end", gap: 4, paddingBottom: 18, boxSizing: "border-box" }}>{SKELETON_BARS.map((h, i) => <span key={i} style={{ flex: 1, height: h + "%", background: C.border, borderRadius: 2, opacity: 0.6 }} />)}</div>
      <div style={{ marginTop: 8, minHeight: 44, display: "flex", alignItems: "center", borderTop: "1px dashed " + C.border, fontSize: 12.5, color: C.textMuted }}>Counting…</div>
    </div> : null}
    {error && !stats ? <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>Couldn't count the climbs here just now — check your connection and try again.</div> : null}
    {rows.length ? <button onClick={() => setOpen(!open)} aria-expanded={open} style={{ marginTop: spread ? 8 : 0, width: "100%", textAlign: "left", minHeight: 44, display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", borderTop: spread ? "1px dashed " + C.border : "none", padding: "8px 0 0", cursor: "pointer", color: C.text }}>
      <span style={{ flex: 1, textAlign: "left", fontSize: 12.5, fontWeight: 700 }}>{"Climbs here by type"}</span>
      {open ? null : <span style={{ fontSize: 12.5, color: C.textSub, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{typed.toLocaleString() + " climb" + (typed !== 1 ? "s" : "")}</span>}
      <span aria-hidden="true" style={{ display: "inline-block", color: C.blue, fontSize: 12, transform: open ? "rotate(180deg)" : "none" }}>{"▾"}</span>
    </button> : stats && !spread ? <EmptyState C={C} icon="chart" style={{ padding: "12px 14px 6px" }}>No climbs filed here yet.</EmptyState> : null}
    {open && rows.length ? <ClimbsChart stats={stats} loading={loading} error={error} C={C} discOptions={discOptions} onDisc={onDisc} bare>{null}</ClimbsChart> : null}
  </div>;
}

// ── Awaiting review ──
// The caller's OWN edits that the owner has not checked yet (0319): "Awaiting review: Rock —
// limestone". Other climbers' pending rows are not shown; approved rows are already in the
// columns and rejected ones reach the climber through their notices.
export function PendingAreaEdits({ rows, C, myId }) {
  const mine = myPendingAreaEdits(rows, myId);
  if (!mine.length) return null;
  const latest = new Map();
  for (const r of mine) { const f = AREA_EDIT_FIELDS.find(x => x.k === r.field); if (!f) continue; if (!latest.has(r.field) || r.created_at > latest.get(r.field).created_at) latest.set(r.field, r); }
  if (!latest.size) return null;
  return <div style={{ background: C.amberBg, border: "1px solid " + C.amber + "55", borderRadius: 11, padding: "9px 11px", marginBottom: 12 }}>
    {[...latest.values()].map(r => {
      const f = AREA_EDIT_FIELDS.find(x => x.k === r.field);
      const shown = f.type === "months" ? monthsLabel(r.value) : f.type === "int" ? String(r.value) + " min" : String(r.value);
      return <div key={r.id || r.field} style={{ fontSize: 12, color: C.text, lineHeight: 1.4, minHeight: 24, display: "flex", alignItems: "center" }}>
        <span style={{ minWidth: 0 }}>{"Awaiting review: " + f.label.toLowerCase() + " — "}<b style={{ overflowWrap: "anywhere" }}>{shown}</b></span>
      </div>;
    })}
  </div>;
}
