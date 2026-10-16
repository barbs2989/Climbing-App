/* Does FEATURE_TAGS cover the `features` vocabulary the catalog actually uses?
   A value with no entry still renders — as a grey bullet with an EMPTY blurb — so this
   degrades quietly and no gate can see it. Report-only, read-only, anon key. */
import { anonKey, selectAll } from "../lib/supabase-env.mjs";
import { FEATURE_TAGS } from "../../lib/routeTags.js";
const key = anonKey();
const rows = await selectAll("routes", "id,features", "features=not.is.null", { pageSize: 1000, key });
if (!rows.length) throw new Error("fail-closed: empty read — zero routes makes every value look covered");
const counts = {}; let carrying = 0;
for (const r of rows) {
  const f = Array.isArray(r.features) ? r.features : [];
  if (f.length) carrying++;
  for (const x of f) counts[x] = (counts[x] || 0) + 1;
}
if (!Object.keys(counts).length) throw new Error("fail-closed: no feature values parsed");
const known = new Set(Object.keys(FEATURE_TAGS));
const uncovered = Object.entries(counts).filter(([k]) => !known.has(k)).sort((a, b) => b[1] - a[1]);
const stale = [...known].filter(k => !counts[k]);
const inst = n => Object.entries(counts).filter(([k]) => (n ? known.has(k) : !known.has(k))).reduce((a, x) => a + x[1], 0);
console.log(`routes carrying features: ${carrying}   distinct values: ${Object.keys(counts).length}`);
console.log(`covered   ${Object.keys(counts).filter(k => known.has(k)).length} value(s), ${inst(1)} chip instance(s)`);
console.log(`UNCOVERED ${uncovered.length} value(s), ${inst(0)} chip instance(s) — each renders as a grey bullet with no blurb`);
for (const [k, v] of uncovered) console.log(`   ${String(v).padStart(4)}  ${k}`);
// A FEATURE_TAGS entry no route uses is not a defect — the vocabulary may simply not have
// reached this state's catalog yet — but it is worth seeing, since it is also how a typo looks.
console.log(`FEATURE_TAGS entries no route uses: ${stale.length ? stale.join(", ") : "none"}`);
