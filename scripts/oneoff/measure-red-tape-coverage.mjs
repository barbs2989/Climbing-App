// What does the catalog actually know about PERMITS, FEES and LAND MANAGEMENT per route, and
// how much of it is populated? Asked before proposing a "Red Tape" section, so the proposal
// rests on measured coverage rather than on the fact that other sites have one.
//
// Scoped by the Washington area subtree, never `id like 'wa_%'`.
import { selectAll } from "../lib/supabase-env.mjs";

const wa = await selectAll("areas", "id,name,path", "name=eq.Washington&area_type=eq.state", { pageSize: 10 });
if (!wa.length) { console.log("FAIL: no Washington state area"); process.exit(1); }
const kids = await selectAll("areas", "id", `path=cd.${wa[0].path}`, { pageSize: 1000 });
const set = new Set([wa[0].id, ...kids.map(a => a.id)]);

const all = await selectAll("routes", "id,area_id,discipline,permit,access,bivy,seasonal_hazards", "", { pageSize: 1000 });
if (!all.length) { console.log("FAIL: read no routes"); process.exit(1); }
const rows = all.filter(r => set.has(r.area_id));
const alp = rows.filter(r => ["alpine", "mountaineering", "scrambling"].includes(r.discipline));
console.log(`WA routes: ${rows.length}; alpine/mountaineering/scrambling: ${alp.length}\n`);

const nonEmpty = v => v != null && String(v).trim() !== "";
const pct = (n, d) => `${n} (${Math.round(n / d * 100)}%)`;

const has = (arr, f) => arr.filter(f).length;
for (const [label, pool] of [["ALL WA", rows], ["alpine scope", alp]]) {
  const d = pool.length;
  console.log(`== ${label} (${d} routes)`);
  console.log(`   permit populated:            ${pct(has(pool, r => nonEmpty(r.permit)), d)}`);
  console.log(`   access populated:            ${pct(has(pool, r => r.access && Object.keys(r.access).length), d)}`);
  console.log(`   access.land_manager:         ${pct(has(pool, r => r.access && nonEmpty(r.access.land_manager || r.access.landManager)), d)}`);
  console.log(`   access.fees:                 ${pct(has(pool, r => r.access && nonEmpty(r.access.fees)), d)}`);
  console.log(`   access.permits:              ${pct(has(pool, r => r.access && nonEmpty(r.access.permits)), d)}`);
  console.log(`   bivy (camping, just shipped):${pct(has(pool, r => Array.isArray(r.bivy) && r.bivy.length), d)}`);
  console.log("");
}

// What KEYS does access actually carry, and how often? The column is jsonb, so the shape is
// not guaranteed and a proposal built on an assumed key would be built on sand.
const keyCount = new Map();
for (const r of rows) for (const k of Object.keys(r.access || {})) keyCount.set(k, (keyCount.get(k) || 0) + 1);
console.log("access keys across WA routes, by frequency:");
[...keyCount.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`   ${String(n).padStart(5)}  ${k}`));

// A sample, because a populated column is not a useful one.
const sample = rows.filter(r => r.access && nonEmpty(r.access.land_manager || r.access.landManager)).slice(0, 4);
console.log("\nsample land_manager / permit values:");
for (const r of sample) {
  console.log(`   ${r.id}`);
  console.log(`      land_manager: ${JSON.stringify(r.access.land_manager || r.access.landManager)}`);
  console.log(`      permit:       ${JSON.stringify(String(r.permit || "").slice(0, 120))}`);
}
