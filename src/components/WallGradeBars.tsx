import type { C as Palette } from "../../ClimbMatchCore.jsx";

/** One row of `area_children_grade_counts` (0402): climbs on one grade system in one whole-number bucket. */
export interface WallGradeRow {
  sys: string;
  bucket: number | string;
  n: number | string;
}

export interface WallGradeBarsProps {
  /** The child's rows from `useAreaChildrenGradeCounts`; absent or empty draws nothing. */
  rows: WallGradeRow[] | null | undefined;
  /** The card's name, for the chart's accessible name ("Grades on Castle Rock: …"). */
  name: string;
  /** The child's stored climb count, so the chart can say how many of them it bands. */
  total: number;
  C: typeof Palette;
}

interface Band { label: string; lo: number; hi: number }
// Five bands per grading scale, lowest first. A bucket is GRADE SPREAD's whole-number bucket
// (floor(grade_num) within grade_system): 10 is 5.10 on yds, -1 is VB on the V scale.
const BANDS: Record<string, Band[]> = {
  yds: [{ label: "≤5.7", lo: -Infinity, hi: 7 }, { label: "5.8–9", lo: 8, hi: 9 }, { label: "5.10", lo: 10, hi: 10 }, { label: "5.11", lo: 11, hi: 11 }, { label: "5.12+", lo: 12, hi: Infinity }],
  v: [{ label: "VB–1", lo: -Infinity, hi: 1 }, { label: "V2–3", lo: 2, hi: 3 }, { label: "V4–5", lo: 4, hi: 5 }, { label: "V6–8", lo: 6, hi: 8 }, { label: "V9+", lo: 9, hi: Infinity }],
  wi: [{ label: "≤WI2", lo: -Infinity, hi: 2 }, { label: "WI3", lo: 3, hi: 3 }, { label: "WI4", lo: 4, hi: 4 }, { label: "WI5", lo: 5, hi: 5 }, { label: "WI6+", lo: 6, hi: Infinity }],
  m: [{ label: "≤M3", lo: -Infinity, hi: 3 }, { label: "M4–5", lo: 4, hi: 5 }, { label: "M6–7", lo: 6, hi: 7 }, { label: "M8–9", lo: 8, hi: 9 }, { label: "M10+", lo: 10, hi: Infinity }],
  aid: [{ label: "A0", lo: -Infinity, hi: 0 }, { label: "A1", lo: 1, hi: 1 }, { label: "A2", lo: 2, hi: 2 }, { label: "A3", lo: 3, hi: 3 }, { label: "A4+", lo: 4, hi: Infinity }],
  class: [{ label: "Cl 1", lo: -Infinity, hi: 1 }, { label: "Cl 2", lo: 2, hi: 2 }, { label: "Cl 3", lo: 3, hi: 3 }, { label: "Cl 4", lo: 4, hi: 4 }, { label: "Cl 5", lo: 5, hi: Infinity }],
};
const SYS_NAME: Record<string, string> = { yds: "rock grades", v: "V grades", wi: "ice grades", m: "mixed grades", aid: "aid grades", class: "class grades" };

/** The five bars for one child, on its main scale; null when nothing there is graded on a scale the chart bands. */
export function wallGradeBands(rows: WallGradeRow[] | null | undefined): { sys: string; bars: { label: string; n: number }[]; graded: number } | null {
  const list = (rows || []).filter(r => r && BANDS[r.sys] && Number(r.n) > 0);
  if (!list.length) return null;
  const bySys: Record<string, number> = {};
  for (const r of list) bySys[r.sys] = (bySys[r.sys] || 0) + Number(r.n);
  const sys = Object.keys(bySys).sort((a, b) => bySys[b] - bySys[a])[0];
  const bars = BANDS[sys].map(b => ({ label: b.label, n: list.filter(r => r.sys === sys && Number(r.bucket) >= b.lo && Number(r.bucket) <= b.hi).reduce((a, r) => a + Number(r.n), 0) }));
  return { sys, bars, graded: bySys[sys] };
}

/**
 * The five-bar mini grade chart on a wall card (competitor review item 13, 2026-11-04): at a glance,
 * which wall under this area suits your grade. Bands the whole-number buckets `area_children_grade_counts`
 * (0402) counts, on the child's main scale (the one most of its graded climbs use), lowest band to the
 * left; a bar's height is its share of the tallest. Drawn on the website only, beside the card's climb
 * count. Climbs with no readable grade are not in any bar, and the chart's name says how many it bands.
 */
export default function WallGradeBars({ rows, name, total, C }: WallGradeBarsProps) {
  const banded = wallGradeBands(rows);
  if (!banded) return null;
  const { sys, bars, graded } = banded;
  const max = Math.max(...bars.map(b => b.n));
  const colors = [C.green, C.teal, C.blue, C.amber, C.red];
  const W = 150, H = 26, gap = 3, bw = (W - gap * 4) / 5;
  const desc = bars.map(b => b.label + ": " + b.n).join(", ");
  const label = "Grades on " + name + " (" + (SYS_NAME[sys] || sys) + ", " + graded.toLocaleString() + " of " + total.toLocaleString() + " graded): " + desc;
  return (
    <div role="img" aria-label={label} title={label} style={{ width: W, flexShrink: 0 }}>
      <svg viewBox={"0 0 " + W + " " + H} width={W} height={H} aria-hidden="true" style={{ display: "block" }}>
        {bars.map((b, i) => { const h = max ? Math.max(b.n ? 2 : 0, b.n / max * (H - 1)) : 0; return <rect key={b.label} x={i * (bw + gap)} y={H - h} width={bw} height={h} rx={1.5} fill={b.n ? colors[i] : C.border} opacity={b.n ? 1 : 0.6} />; })}
      </svg>
      <div aria-hidden="true" style={{ display: "flex", gap: gap + "px", marginTop: 2 }}>
        {bars.map(b => <div key={b.label} style={{ width: bw, textAlign: "center", fontSize: 8.5, lineHeight: 1.2, color: C.textMuted, whiteSpace: "nowrap", overflow: "hidden" }}>{b.label}</div>)}
      </div>
    </div>
  );
}
