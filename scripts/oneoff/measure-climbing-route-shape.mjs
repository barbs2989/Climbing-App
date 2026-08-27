// What is in `climbing_route`, and which of its keys is a picker rather than a text box?
//
// This is the column behind the live defect: the CLIMBING ROUTE section carries an edit pencil
// that opens the `pitchDetail` editor — a different column — so a correction lands under ROUTE
// BETA while CLIMBING ROUTE keeps showing the enrichment text it was meant to replace.
//
// Before building the editor: ClimbingRouteTable reads {n, label, class, notes}. `class` looks
// enumerable (a scramble class or a technical grade), and if it is, it should be a picker so three
// climbers can actually agree — the 3-agree gate is unreachable for prose.

import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,climbing_route", "climbing_route=not.is.null", { pageSize: 1000 });
const segs = [];
for (const r of rows) if (Array.isArray(r.climbing_route)) for (const s of r.climbing_route) segs.push(s);
if (!segs.length) { console.error("empty read — nothing to measure."); process.exit(1); }

console.log(`${rows.length} routes carry climbing_route, ${segs.length} sections\n`);

const keyCount = {};
for (const s of segs) for (const k of Object.keys(s || {})) keyCount[k] = (keyCount[k] || 0) + 1;
console.log("keys present:");
for (const [k, n] of Object.entries(keyCount).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(5)}x  ${k}`);
}

for (const k of ["class", "label", "notes"]) {
  const vals = segs.map((s) => s && s[k]).filter((v) => v != null && String(v).trim() !== "").map(String);
  if (!vals.length) continue;
  const norm = vals.map((v) => v.trim().toLowerCase().replace(/\s+/g, " "));
  const counts = {};
  for (const v of norm) counts[v] = (counts[v] || 0) + 1;
  const distinct = Object.keys(counts).length;
  console.log(`\n${k}: ${vals.length} values, ${distinct} distinct (${((distinct / vals.length) * 100).toFixed(0)}% unique)`);
  for (const [v, n] of Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`   ${String(n).padStart(5)}x  ${v.slice(0, 80)}`);
  }
}

const per = {};
for (const r of rows) if (Array.isArray(r.climbing_route)) {
  const n = r.climbing_route.length;
  per[n] = (per[n] || 0) + 1;
}
console.log("\nsections per route:", Object.entries(per).sort((a, b) => +a[0] - +b[0]).map(([k, v]) => `${k}:${v}`).join("  "));
