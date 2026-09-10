#!/usr/bin/env node
// DOES `routes.approach` HOLD A BUCKET KEY?
//
// Add-a-climb's Approach control is four chips writing an opaque key — "u1" / "1to3" / "3to6" /
// "6plus" — into the proposal as `approach`, and `approve_new_route` (0135) inserts
// `v->>'approach'` straight into `routes.approach`. That column is PROSE: it holds the walk-in
// narrative the Planner renders, and it is the column audit:approach-scope and the whole
// climbing_route re-homing work are about.
//
// So an approved contribution would render its APPROACH section as the literal text "3to6".
//
// Read-only, anon key. Reports; changes nothing.
import { selectAll, SUPABASE_URL } from "../lib/supabase-env.mjs";

const KEYS = ["u1", "1to3", "3to6", "6plus"];

// An anon count on an RLS-protected table returns 0 with a 200 whatever the table holds, so this
// says so rather than claiming a clean catalog. `routes` is publicly readable, which is why anon
// is enough here — but the caveat is printed rather than assumed.
console.log(`project: ${String(SUPABASE_URL || "").replace(/^https:\/\//, "")}`);

let rows;
try {
  rows = await selectAll("routes", "id,area_id,approach", `approach=in.(${KEYS.join(",")})`, { pageSize: 1000 });
} catch (e) {
  console.error("FAIL: the read did not complete — this is NOT evidence the column is clean.");
  console.error("  " + (e && e.message));
  process.exit(1);
}

if (!rows) { console.error("FAIL: no result at all — a failed read must not read as an empty one."); process.exit(1); }

console.log(`\nrows whose approach is exactly a bucket key: ${rows.length}`);
for (const r of rows.slice(0, 20)) console.log(`  ${r.id}  (${r.area_id})  approach=${JSON.stringify(r.approach)}`);

// A SECOND, WIDER QUESTION: a very short `approach` is prose-shaped-wrong even if it is not one of
// the four keys — the same defect from a different writer.
let shortOnes = [];
try {
  const sample = await selectAll("routes", "id,approach", "approach=not.is.null", { pageSize: 1000 });
  shortOnes = (sample || []).filter((r) => typeof r.approach === "string" && r.approach.trim().length <= 8);
  console.log(`\n${sample ? sample.length : 0} routes carry an approach; ${shortOnes.length} are 8 characters or shorter`);
  for (const r of shortOnes.slice(0, 15)) console.log(`  ${r.id}  ${JSON.stringify(r.approach)}`);
} catch (e) {
  console.log("\n(the wider short-approach scan did not complete: " + (e && e.message) + ")");
}

console.log(rows.length
  ? "\nFOUND: the prose column holds a control's bucket key."
  : "\nNone today — which is what makes this the moment to fix the writer: the column is unguarded\nby construction until the first contributed route is approved.");
