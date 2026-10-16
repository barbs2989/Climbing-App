// What is in `approach_variants`, and which of its keys is a picker, a number, or genuinely prose?
//
// It is the second column whose section carries a pencil that edits a DIFFERENT column: the
// APPROACHES panel's pencil opens `setFixOpenSection("approach")`, which is the approach PROSE
// field, so a climber correcting a variant writes into the paragraph instead and the panel keeps
// its old rows. Same shape as CLIMBING ROUTE opening pitchDetail.
//
// ApproachVariants reads {name, season, distMi, gainFt, hours, hazards}. Three of those are
// NUMBERS, which matters for the consensus loop: numbers already cluster with a per-field
// tolerance (NUM_FIELD_TOL), so two climbers who measure 4.8 and 4.9 miles agree. Prose does not
// cluster at all, so a text box for a distance would be strictly worse than a numeric one.

import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,approach_variants", "approach_variants=not.is.null", { pageSize: 1000 });
const vars = [];
for (const r of rows) if (Array.isArray(r.approach_variants)) for (const v of r.approach_variants) vars.push(v);
if (!vars.length) { console.error("empty read — nothing to measure."); process.exit(1); }

console.log(`${rows.length} routes carry approach_variants, ${vars.length} variants\n`);
const keyCount = {}, types = {};
for (const v of vars) for (const [k, val] of Object.entries(v || {})) {
  keyCount[k] = (keyCount[k] || 0) + 1;
  const t = Array.isArray(val) ? "array" : typeof val;
  types[k] = types[k] || {};
  types[k][t] = (types[k][t] || 0) + 1;
}
console.log("keys, with the JS type actually stored:");
for (const [k, n] of Object.entries(keyCount).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}x  ${k.padEnd(16)} ${JSON.stringify(types[k])}`);
}

for (const k of ["name", "season", "hazards", "hours", "distMi", "gainFt"]) {
  const vals = vars.map((v) => v && v[k]).filter((v) => v != null && String(v).trim() !== "");
  if (!vals.length) continue;
  const flat = vals.flatMap((v) => Array.isArray(v) ? v : [v]).map((v) => String(v).trim().toLowerCase().replace(/\s+/g, " "));
  const counts = {};
  for (const v of flat) counts[v] = (counts[v] || 0) + 1;
  const distinct = Object.keys(counts).length;
  console.log(`\n${k}: ${flat.length} values, ${distinct} distinct (${((distinct / flat.length) * 100).toFixed(0)}% unique)`);
  for (const [v, n] of Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6)) {
    console.log(`   ${String(n).padStart(4)}x  ${v.slice(0, 76)}`);
  }
}
