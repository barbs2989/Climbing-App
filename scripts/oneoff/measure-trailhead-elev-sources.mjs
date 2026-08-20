// The derived gain needs a TRAILHEAD elevation. The waypoint store supplies one on 86% of routes
// carrying camping. Does approach_logistics carry a second source that would raise that, or is
// the waypoint the only record? Asking before building, because a second source that disagrees
// with the first is the documented trailhead-agreement trap and would make the gain depend on
// which record happened to be read.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const H = headers(anonKey());
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,bivy,waypoints,approach_logistics&bivy=not.is.null&limit=1000`, { headers: H });
if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
const rows = await r.json();
if (!rows.length) { console.log("FAIL: read nothing"); process.exit(1); }

const arr = (v) => (Array.isArray(v) ? v : []);
const has = (v) => v != null && String(v).trim() !== "";
const wpType = (w) => String((w && (w.type || w.kind)) || "").trim().toLowerCase();
const isTrailhead = (w) => /trailhead|trail head/.test(wpType(w));

const alKeys = new Map();
let withAl = 0, wpOnly = 0, alOnly = 0, both = 0, neither = 0, disagree = 0;
const disagreements = [];

for (const row of rows) {
  const al = row.approach_logistics && typeof row.approach_logistics === "object" ? row.approach_logistics : null;
  if (al) { withAl++; for (const k of Object.keys(al)) alKeys.set(k, (alKeys.get(k) || 0) + 1); }
  const th = arr(row.waypoints).find(isTrailhead);
  const wpFt = th && has(th.elev) ? Number(th.elev) : th && has(th.elevM) ? Number(th.elevM) * 3.28084 : null;
  // Any elevation-ish key on the logistics blob, under any spelling.
  let alFt = null;
  if (al) for (const [k, v] of Object.entries(al)) {
    if (/elev|altitude|feet|ft$/i.test(k) && has(v) && !isNaN(Number(v))) { alFt = Number(v); break; }
  }
  if (wpFt != null && alFt != null) {
    both++;
    if (Math.abs(wpFt - alFt) > 200) { disagree++; if (disagreements.length < 6) disagreements.push(`${row.id}  waypoint ${Math.round(wpFt)} ft vs logistics ${Math.round(alFt)} ft`); }
  } else if (wpFt != null) wpOnly++;
  else if (alFt != null) alOnly++;
  else neither++;
}

console.log(`== routes carrying bivy: ${rows.length}, with an approach_logistics blob: ${withAl}\n`);
console.log(`   approach_logistics keys:`);
[...alKeys.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([k, n]) =>
  console.log(`      ${k.padEnd(24)} ${String(n).padStart(4)}`));

console.log(`\n== TRAILHEAD ELEVATION, by source`);
console.log(`   waypoint only      : ${wpOnly}`);
console.log(`   logistics only     : ${alOnly}   <- would RAISE coverage if non-zero`);
console.log(`   both               : ${both}`);
console.log(`   neither            : ${neither}`);
if (both) {
  console.log(`   of "both", disagree by >200 ft: ${disagree} (${Math.round((disagree / both) * 100)}%)`);
  disagreements.forEach((d) => console.log(`      ${d}`));
}
console.log(alOnly === 0
  ? `\n   -> the WAYPOINT is the only trailhead-elevation record. One source, no agreement problem.`
  : `\n   -> a second source exists; reconcile before using either.`);
