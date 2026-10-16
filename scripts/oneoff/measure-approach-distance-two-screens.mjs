// The peak page and the route page stated different approach distances for the same climb.
//
// `SummitBriefing`'s Approach row read `dist_km` raw. `RouteDetail` has always read `effDistKm`,
// which PREFERS the route's own itinerary — the sum of its days' miles — and halves it unless the
// trip is recorded as a loop or point-to-point. Where those disagree, one route has two approach
// distances depending on which screen you are on: the #1203 shape, across two surfaces.
//
// This is the measurement behind the fix, and re-running it is how to check the fix is still in
// place: with lib/outing.js wired into both readers the "would MOVE" count is what the change was
// worth, not what is still wrong.
//
// Read-only. Fails closed on a short read.
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";
import { effDistKm } from "../../lib/outing.js";

const rows = await selectAll("routes", "id,name,area_id,discipline,dist_km,itinerary,outing_shape", "", { pageSize: 1000, key: requireServiceKey() });
const wa = rows.filter((r) => String(r.id).startsWith("wa_"));
if (wa.length < 1000) { console.error(`FAIL - only ${wa.length} WA rows read. A short read reports a clean catalog.`); process.exit(1); }

const ALPINE = ["alpine", "mountaineering", "scrambling", "ice", "mixed"];
const span = (rs, pick) => {
  const v = rs.map((r) => Number(pick(r))).filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  return v.length ? { lo: v[0], hi: v[v.length - 1], n: v.length } : null;
};
const mi = (km) => (km * 0.621371).toFixed(1);

// ── per route: how often do the two readings disagree at all?
let withItin = 0, routeDiff = 0;
for (const r of wa) {
  if (!(r.itinerary && Array.isArray(r.itinerary.days) && r.itinerary.days.length)) continue;
  const stored = Number(r.dist_km);
  if (!Number.isFinite(stored) || stored <= 0) continue;
  withItin++;
  const eff = Number(effDistKm(r));
  if (Math.abs(eff - stored) / Math.max(eff, stored) > 0.15) routeDiff++;
}

// ── per PANEL: would the Approach row move?
const byArea = new Map();
for (const r of wa) { if (!byArea.has(r.area_id)) byArea.set(r.area_id, []); byArea.get(r.area_id).push(r); }
let panels = 0, moved = 0; const worst = [];
for (const [id, rs] of byArea) {
  if (rs.length < 2) continue;
  const fam = rs.filter((r) => ALPINE.includes(r.discipline));
  if (fam.length * 2 < rs.length) continue;           // the panel's own gate
  panels++;
  const a = span(rs, (r) => r.dist_km), b = span(rs, effDistKm);
  if (!a || !b) { if (a || b) { moved++; worst.push({ id, a, b, d: Infinity }); } continue; }
  const d = Math.max(Math.abs(+mi(a.lo) - +mi(b.lo)), Math.abs(+mi(a.hi) - +mi(b.hi)));
  if (d > 0.3) { moved++; worst.push({ id, a, b, d }); }
}
worst.sort((x, y) => y.d - x.d);

console.log(`WA routes carrying dist_km AND itinerary day-miles : ${withItin}`);
console.log(`  where the two readings differ by more than 15%   : ${routeDiff}`);
console.log(`peak pages rendering the panel                      : ${panels}`);
console.log(`  where the Approach row differs between the two    : ${moved}\n`);
for (const x of worst.slice(0, 20))
  console.log(`  ${x.id.padEnd(42)} dist_km ${x.a ? mi(x.a.lo) + "-" + mi(x.a.hi) : "-"} mi   effDistKm ${x.b ? mi(x.b.lo) + "-" + mi(x.b.hi) : "-"} mi`);
