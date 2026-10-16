// The area page's new sections (2026-10-15): ABOUT, AREA FACTS, CLIMBS HERE (the chart), GRADE
// SPREAD, the pending-edits banner and the month strip. Mounted by AreaPage in DbAreaBrowser.jsx;
// GETTING THERE and TOP RATED live there too (one needs the browser's Directions gate literal,
// the other its RouteRow). `C` arrives as a prop — this file must not import ClimbMatchCore.
//
// Honesty rules these sections keep:
//   - a fact that is not stored is not printed (no "Unknown", no zero posing as a value);
//   - the chart's headline is the SUM OF ITS BARS, and a remainder the bars do not show is
//     said in words ("+N not typed") rather than hidden in the headline;
//   - the grade spread names how many climbs it left out ("12 of 15 list a grade").
import { AREA_EDIT_FIELDS, MONTH_ABBR, monthsLabel, myPendingAreaEdits } from "./areaFields";
import { DISC_COLORS } from "./disciplines";
import { DISC_LABELS as DL, DISC_SHORT as DS } from "./discLabels";
import { EditIconButton } from "./areaChrome";

const card = C => ({ background: C.card, borderRadius: 12, padding: "12px 14px", border: "1px solid " + C.border, marginBottom: 12 });
const headRow = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 };
const Head = ({ children, C }) => <div role="heading" aria-level={3} style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: 0.4, textTransform: "uppercase" }}>{children}</div>;

// ── ABOUT ──
export function AboutCard({ area, C, onEdit }) {
  const blurb = area.blurb && String(area.blurb).trim();
  return <div style={card(C)}>
    <div style={headRow}><Head C={C}>About</Head>{onEdit ? <EditIconButton C={C} onClick={() => onEdit("blurb")} title={"Edit the description of " + area.name} /> : null}</div>
    {blurb
      ? blurb.split(/\n{2,}/).map((p, i) => <div key={i} style={{ fontSize: 13, color: C.textSub, lineHeight: 1.6, marginTop: i ? 8 : 0 }}>{p}</div>)
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

// ── AREA FACTS ──
export function AreaFactsCard({ area, C, uElev, onEdit }) {
  const facts = [];
  if (area.rock) facts.push(["Rock", String(area.rock).replace(/^./, s => s.toUpperCase()), "rock"]);
  if (area.aspect) facts.push(["Faces", area.aspect === "varies" ? "Varies" : area.aspect, "aspect"]);
  if (area.elevation_ft) facts.push(["Elevation", uElev ? uElev(area.elevation_ft) : area.elevation_ft.toLocaleString() + " ft", null]);
  if (area.approach_min != null && area.approach_min > 0) facts.push(["Walk-in", "about " + area.approach_min + " min", "approach_min"]);
  if (area.parking_name && area.parking_name !== "Trailhead") facts.push(["Parking", area.parking_name, null]);
  const season = Array.isArray(area.season_months) && area.season_months.length ? area.season_months : null;
  if (!facts.length && !season) {
    return <div style={card(C)}>
      <div style={headRow}><Head C={C}>Area facts</Head>{onEdit ? <EditIconButton C={C} onClick={() => onEdit("rock")} title={"Add facts about " + area.name} /> : null}</div>
      <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>{"Nothing on file yet — rock, which way it faces, the walk-in, the season. Know it? Add it."}</div>
    </div>;
  }
  return <div style={card(C)}>
    <div style={headRow}><Head C={C}>Area facts</Head>{onEdit ? <EditIconButton C={C} onClick={() => onEdit(facts.find(f => f[2]) ? facts.find(f => f[2])[2] : "rock")} title={"Edit the facts about " + area.name} /> : null}</div>
    {facts.length ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
      {facts.map(([l, v]) => <div key={l} style={{ minWidth: 0 }}><div style={{ fontSize: 10.5, fontWeight: 700, color: C.textMuted, letterSpacing: 0.3, textTransform: "uppercase" }}>{l}</div><div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, lineHeight: 1.35, overflowWrap: "anywhere" }}>{v}</div></div>)}
    </div> : null}
    {season ? <div style={{ marginTop: facts.length ? 10 : 0 }}><div style={{ fontSize: 10.5, fontWeight: 700, color: C.textMuted, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 5 }}>{"Season · " + monthsLabel(season)}</div><MonthStrip months={season} C={C} /></div> : null}
  </div>;
}

// ── CLIMBS HERE — one bar per discipline, over the subtree ──
// Each bar is a BUTTON that opens the Route finder on that discipline (when the finder can
// filter on it); the bar's own label and count sit beside it, so identity never rests on the
// colour alone. Headline = sum of the bars; anything the bars cannot show is said under them.
export function ClimbsChart({ stats, loading, error, C, discOptions, onDisc, children }) {
  const rows = stats && Array.isArray(stats.by_disc) ? stats.by_disc.filter(d => d && d.n > 0) : [];
  const sum = rows.reduce((a, d) => a + Number(d.n), 0);
  const total = stats ? Number(stats.total) || 0 : 0;
  const max = rows.length ? Math.max(...rows.map(d => Number(d.n))) : 0;
  const can = disc => !!(onDisc && discOptions && discOptions.includes(disc));
  return <div style={card(C)}>
    <div style={headRow}><Head C={C}>Climbs here</Head>{rows.length ? <span style={{ fontSize: 12.5, color: C.textSub, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{sum.toLocaleString() + " climb" + (sum !== 1 ? "s" : "")}</span> : null}</div>
    {loading && !stats ? <div style={{ fontSize: 12, color: C.textMuted }}>Counting…</div> : null}
    {error && !stats ? <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>Couldn't count the climbs here just now — check your connection and try again.</div> : null}
    {stats && !rows.length ? <div style={{ fontSize: 12.5, color: C.textMuted }}>No climbs filed here yet.</div> : null}
    {rows.map(d => {
      const label = DS[d.disc] || DL[d.disc] || d.disc, n = Number(d.n), pct = max ? Math.max(2, Math.round(n / max * 100)) : 0, col = DISC_COLORS[d.disc] || C.blue;
      const inner = <>
        <span style={{ width: 92, flexShrink: 0, fontSize: 12.5, fontWeight: 600, color: C.text, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
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

// ── GRADE SPREAD — columns over the area's main grading scale ──
const SYS_LABEL = { yds: "5.x", v: "V", wi: "WI", m: "M", aid: "A/C", class: "Class", snow: "Snow" };
const SYS_NAME = { yds: "rock grades", v: "V grades", wi: "ice grades", m: "mixed grades", aid: "aid grades", class: "class grades", snow: "snow grades" };
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
export function GradeSpread({ stats, C }) {
  const rows = stats && Array.isArray(stats.by_grade) ? stats.by_grade.filter(g => g && g.n > 0 && g.sys) : [];
  if (!rows.length) return null;
  const bySys = {};
  for (const g of rows) bySys[g.sys] = (bySys[g.sys] || 0) + Number(g.n);
  const sys = Object.keys(bySys).sort((a, b) => bySys[b] - bySys[a])[0];
  const cols = rows.filter(g => g.sys === sys).map(g => ({ b: Number(g.bucket), n: Number(g.n) })).sort((a, b) => a.b - b.b);
  if (!cols.length) return null;
  // Fill the gaps so the axis is a scale, not a list of whatever happened to exist.
  const lo = cols[0].b, hi = cols[cols.length - 1].b, full = [];
  for (let b = lo; b <= hi; b++) { const f = cols.find(c => c.b === b); full.push({ b, n: f ? f.n : 0 }); }
  const max = Math.max(...full.map(c => c.n));
  const shown = full.reduce((a, c) => a + c.n, 0), total = stats ? Number(stats.total) || 0 : 0;
  const other = Object.keys(bySys).filter(s => s !== sys).reduce((a, s) => a + bySys[s], 0);
  const W = 100, H = 56, gap = 2, bw = (W - gap * (full.length - 1)) / full.length, every = full.length > 9 ? 2 : 1;
  const label = c => bucketLabel(sys, c.b);
  const desc = full.filter(c => c.n).map(c => label(c) + ": " + c.n).join(", ");
  return <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid " + C.border }}>
    <div style={{ ...headRow, marginBottom: 6 }}><Head C={C}>Grade spread</Head><span style={{ fontSize: 11.5, color: C.textMuted }}>{SYS_NAME[sys] || sys}</span></div>
    <svg role="img" aria-label={"Climbs by grade (" + (SYS_NAME[sys] || sys) + "): " + desc} viewBox={"0 0 " + W + " " + H} preserveAspectRatio="none" style={{ width: "100%", height: 56, display: "block" }}>
      {full.map((c, i) => { const h = max ? Math.max(c.n ? 1.5 : 0, c.n / max * (H - 2)) : 0; return <rect key={c.b} x={i * (bw + gap)} y={H - h} width={bw} height={h} rx={0} fill={C.blueSolid} />; })}
    </svg>
    <div style={{ display: "flex", gap: gap + "px", marginTop: 3 }}>
      {full.map((c, i) => <div key={c.b} style={{ flex: 1, minWidth: 0, textAlign: "center", fontSize: 9.5, color: C.textMuted, whiteSpace: "nowrap", overflow: "visible" }}>{i % every === 0 || i === full.length - 1 ? label(c) : ""}</div>)}
    </div>
    {total > shown ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 5 }}>{shown.toLocaleString() + " of " + total.toLocaleString() + " list a " + (SYS_LABEL[sys] || sys) + " grade" + (other ? " · " + other.toLocaleString() + " on other scales" : "")}</div> : null}
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
