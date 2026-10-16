// Gain from the trailhead is ARITHMETIC on two stored elevations, not research: it is
// site.elev - trailhead.elev. That makes it cheap to compute and easy to ship wrong, because it
// inherits every defect in the two numbers it subtracts — and this catalog has a documented
// history of manufactured pins (audit:synthetic-waypoints: 199 routes) and wrong heights
// (audit:waypoint-elevations).
//
// So before rendering it: what does the distribution actually look like? A negative gain, or one
// larger than the mountain, is the tell that the inputs are junk. Read-only, anon key, fails
// closed on an empty read.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const H = headers(anonKey());
async function q(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: H });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
  return r.json();
}
const rows = await q("routes?select=id,name,bivy,waypoints,high_point_ft,gain_ft&bivy=not.is.null&limit=1000");
if (!rows.length) { console.log("FAIL: read nothing"); process.exit(1); }

const arr = (v) => (Array.isArray(v) ? v : []);
const has = (v) => v != null && String(v).trim() !== "";
const ft = (o) => (o && has(o.elev) ? Number(o.elev) : o && has(o.elevM) ? Number(o.elevM) * 3.28084 : null);
const wpType = (w) => String((w && (w.type || w.kind)) || "").trim().toLowerCase();
const isTrailhead = (w) => /trailhead|trail head/.test(wpType(w));
const isCamp = (w) => /camp|bivy|bivouac/.test(wpType(w));

let pairs = 0, neg = 0, zero = 0, absurd = 0, aboveHigh = 0;
const gains = [];
const oddities = [];

for (const r of rows) {
  const ws = arr(r.waypoints);
  const th = ws.find(isTrailhead);
  const thFt = ft(th);
  if (thFt == null) continue;
  const sites = arr(r.bivy).map((b) => ({ name: b && b.name, ft: ft(b) }))
    .concat(ws.filter(isCamp).map((w) => ({ name: w && w.name, ft: ft(w) })));
  for (const s of sites) {
    if (s.ft == null) continue;
    pairs++;
    const g = s.ft - thFt;
    gains.push(g);
    if (g < 0) { neg++; if (oddities.length < 8) oddities.push(`NEGATIVE ${Math.round(g)} ft  ${r.id}  "${s.name}" ${Math.round(s.ft)} ft vs trailhead ${Math.round(thFt)} ft`); }
    else if (g === 0) zero++;
    if (g > 12000) { absurd++; if (oddities.length < 8) oddities.push(`ABSURD   +${Math.round(g)} ft  ${r.id}  "${s.name}"`); }
    if (has(r.high_point_ft) && s.ft > Number(r.high_point_ft) + 200) {
      aboveHigh++;
      if (oddities.length < 8) oddities.push(`ABOVE SUMMIT ${r.id} "${s.name}" camp ${Math.round(s.ft)} ft > high point ${r.high_point_ft} ft`);
    }
  }
}
gains.sort((a, b) => a - b);
const pct = (p) => (gains.length ? Math.round(gains[Math.floor((gains.length - 1) * p)]) : 0);

console.log(`== derivable (site, trailhead) elevation pairs: ${pairs}\n`);
console.log(`   p05 ${String(pct(0.05)).padStart(6)} ft`);
console.log(`   p50 ${String(pct(0.5)).padStart(6)} ft`);
console.log(`   p95 ${String(pct(0.95)).padStart(6)} ft`);
console.log(`   max ${String(pct(1)).padStart(6)} ft\n`);
console.log(`   NEGATIVE gain (camp below trailhead) : ${neg} (${pairs ? Math.round((neg / pairs) * 100) : 0}%)`);
console.log(`   exactly zero                          : ${zero}`);
console.log(`   over 12,000 ft (impossible in WA)     : ${absurd}`);
console.log(`   camp ABOVE the route's own high point : ${aboveHigh}`);
if (oddities.length) { console.log(`\n   examples:`); oddities.forEach((o) => console.log(`      ${o}`)); }
