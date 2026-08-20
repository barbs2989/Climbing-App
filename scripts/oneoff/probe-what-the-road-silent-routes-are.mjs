// WHAT are the 1,371 routes with no road block? Before treating a count as a backlog, ask what it
// is a count OF — this repo has had that reverse three times (audit:terrain, audit:waypoint-order,
// audit:hazard-redundancy all report numbers that are not work).
//
// The suspicion this tests: they qualify as "carrying access apparatus" only because `access` is
// populated, and `access` is where the CRAG-level land-manager blob lives. A sport route at a
// roadside crag inherits an `access` object from its area and has no approach, no waypoints and no
// road of its own — and it does not need one, because there is no drive to describe beyond the
// parking. If that is what these are, the "hole" is a property of the population, not a gap.
//
// Read-only.
import { selectAll } from "../lib/supabase-env.mjs";

function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}
const has = (v) => leaves(v).length > 0;

const rows = await selectAll("routes",
  "id,name,discipline,road,access,approach_logistics,waypoints,approach,dist_km,gain_ft,pitches",
  "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("read 0 routes — broken scan, not a clean catalog"); process.exit(1); }

const silent = rows.filter((r) => {
  const enriched = has(r.access) || has(r.approach_logistics) || has(r.waypoints);
  return enriched && !has(r.road) && !has(r.approach_logistics);
});
const populated = rows.filter((r) => has(r.road) || has(r.approach_logistics));

const tally = (arr, f) => {
  const m = {}; for (const r of arr) { const k = f(r) ?? "(none)"; m[k] = (m[k] || 0) + 1; }
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
};
const pct = (n, d) => (d ? `${(100 * n / d).toFixed(1)}%` : "n/a");

console.log(`\n=== what ARE the road-silent routes? ===`);
console.log(`${silent.length} silent · ${populated.length} carry a road block or logistics\n`);

console.log(`WHY they qualified as "has access apparatus":`);
const viaAccess = silent.filter((r) => has(r.access)).length;
const viaWp = silent.filter((r) => has(r.waypoints)).length;
const viaBoth = silent.filter((r) => has(r.access) && has(r.waypoints)).length;
console.log(`  access populated:    ${viaAccess}  (${pct(viaAccess, silent.length)})`);
console.log(`  waypoints populated: ${viaWp}  (${pct(viaWp, silent.length)})`);
console.log(`  both:                ${viaBoth}`);

console.log(`\nDo they describe a WALK at all?  (a road block describes a drive to a walk)`);
for (const [label, f] of [["approach prose", (r) => has(r.approach)], ["dist_km", (r) => r.dist_km != null], ["gain_ft", (r) => r.gain_ft != null]]) {
  const s = silent.filter(f).length, p = populated.filter(f).length;
  console.log(`  ${label.padEnd(16)} silent ${String(s).padStart(5)} (${pct(s, silent.length).padStart(6)})   populated ${String(p).padStart(5)} (${pct(p, populated.length).padStart(6)})`);
}

console.log(`\ndiscipline mix:`);
const sd = tally(silent, (r) => r.discipline), pd = tally(populated, (r) => r.discipline);
const pdm = Object.fromEntries(pd);
for (const [k, n] of sd.slice(0, 8)) console.log(`  ${String(k).padEnd(16)} silent ${String(n).padStart(5)} (${pct(n, silent.length).padStart(6)})   populated ${String(pdm[k] || 0).padStart(5)} (${pct(pdm[k] || 0, populated.length).padStart(6)})`);

/* The `access` blob is the crag-level land-manager record. If the silent routes share ONE access
   object across many routes, that is the fingerprint of an area-level import rather than per-route
   research — and confirms these are crag rows, not alpine rows missing their drive. */
console.log(`\nis their \`access\` per-route, or one blob shared across a crag?`);
const byAccess = {};
for (const r of silent) { if (!has(r.access)) continue; const k = JSON.stringify(r.access); (byAccess[k] = byAccess[k] || []).push(r.id); }
const groups = Object.values(byAccess).sort((a, b) => b.length - a.length);
const shared = groups.filter((g) => g.length > 1).reduce((a, g) => a + g.length, 0);
console.log(`  ${Object.keys(byAccess).length} distinct access blobs across ${viaAccess} routes`);
console.log(`  ${shared} routes (${pct(shared, viaAccess)}) share their access blob with at least one other route`);
console.log(`  largest groups: ${groups.slice(0, 6).map((g) => g.length).join(", ")}`);

console.log(`\nsample silent routes:`);
for (const r of silent.slice(0, 10)) {
  console.log(`  ${r.id.padEnd(46)} [${String(r.discipline).padEnd(9)}] pitches=${String(r.pitches ?? "-").padStart(3)} approach=${has(r.approach) ? "yes" : "NO "} wp=${has(r.waypoints) ? "yes" : "NO "}`);
}
