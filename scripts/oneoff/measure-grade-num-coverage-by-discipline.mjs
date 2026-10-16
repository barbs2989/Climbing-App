// Report-only: for each discipline, how many routes carry a readable grade_num, and its range.
// A grade-range filter in the route finder drops every route whose grade_num is NULL (the RPC's
// `grade_num >= min_grade` is NULL for them), so this is the share a range would silently hide.
// It also prints sample grades whose number sits outside the discipline's own scale, which is how
// a column that mixes scales shows itself.
import { requireServiceKey, selectAll } from "../lib/supabase-env.mjs";
const key = requireServiceKey();
const rows = await selectAll("routes", "id,discipline,grade,grade_num", "", { pageSize: 1000, key });
if (rows.length < 100000 || new Set(rows.map(r => r.id)).size !== rows.length) { console.error("FAIL: " + rows.length + " rows, not all distinct — refusing to report"); process.exit(1); }
const CAP = { bouldering: [-1, 17], ice: [1, 7], mixed: [1, 14], aid: [0, 5], scrambling: [1, 5] };
const by = {};
for (const r of rows) {
  const d = r.discipline || "(none)"; const b = by[d] || (by[d] = { n: 0, g: 0, vals: [], odd: [] });
  b.n++;
  if (r.grade_num != null) { b.g++; b.vals.push(+r.grade_num); const c = CAP[d]; if (c && (r.grade_num < c[0] || r.grade_num > c[1])) b.odd.push(r.grade + " -> " + r.grade_num); }
}
console.log("routes read: " + rows.length + " (all distinct)");
for (const [d, b] of Object.entries(by).sort((a, z) => z[1].n - a[1].n)) {
  b.vals.sort((a, z) => a - z); const q = p => b.vals.length ? b.vals[Math.floor(p * (b.vals.length - 1))] : "-";
  console.log(d.padEnd(15) + String(b.n).padStart(7) + "  graded " + (100 * b.g / b.n).toFixed(1).padStart(5) + "%  min " + q(0) + " p10 " + q(.1) + " p50 " + q(.5) + " p90 " + q(.9) + " max " + q(1) + (b.odd.length ? "  OUT-OF-SCALE " + b.odd.length + ": " + [...new Set(b.odd)].slice(0, 4).join(" | ") : ""));
}
