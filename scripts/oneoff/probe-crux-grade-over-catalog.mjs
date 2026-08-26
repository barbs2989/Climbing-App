// #1193 fixed the CRUX GRADE tile showing a COMMITMENT grade ("III") where the route's own
// string also carries a technical one ("Grade III, 5.9"). That fix was verified on the route it
// was found on. This asks the stronger question of the whole catalog: over every DISTINCT grade
// string WA holds, does the tile ever still show a commitment grade while a technical grade is
// sitting in the same value?
//
// A commitment-only result is CORRECT when the string carries no technical grade at all — a
// Grade II walk-up has nothing else to show — so the finding is specifically "roman numeral out,
// technical grade available and discarded".
//
// Report-only. Reads `routes`, writes nothing, and imports the app's own function rather than
// re-implementing it (a copy would agree with itself whatever the app does).
import { selectAll } from "../lib/supabase-env.mjs";
import { cruxGrade } from "../../lib/grade.js";

const ROMAN_ONLY = /^(Grade\s+)?[IVX]+(\s*[-/]\s*[IVX]+)?$/i;
// A technical grade anywhere in the string: YDS (5.9, 5.10a), boulder (V4), ice (WI3), mixed
// (M6), aid (A3/C2), Australian/UIAA-ish standalone numbers are deliberately NOT matched —
// they collide with pitch counts and elevations, and a false positive here reports correct code.
const TECHNICAL = /\b(5\.\d+[a-dA-D+-]?|V\d+|WI\s?\d|AI\s?\d|M\d+|[AC][1-5][+-]?)\b/;

const rows = await selectAll("routes", "id,grade", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("read returned nothing — refusing to report a clean catalog"); process.exit(1); }

const byGrade = new Map();
for (const r of rows) {
  const g = (r.grade || "").trim();
  if (!g) continue;
  if (!byGrade.has(g)) byGrade.set(g, []);
  byGrade.get(g).push(r.id);
}
if (!byGrade.size) { console.error("0 populated grades — the column moved or the filter is wrong"); process.exit(1); }

const findings = [];
let commitmentOnlyHonest = 0;
for (const [g, ids] of byGrade) {
  const out = cruxGrade(g);
  if (!ROMAN_ONLY.test(out)) continue;
  if (TECHNICAL.test(g)) findings.push({ g, out, n: ids.length, eg: ids[0] });
  else commitmentOnlyHonest++;
}

console.log(`${rows.length} wa_* routes, ${byGrade.size} distinct grade strings\n`);
console.log(`commitment grade shown with NO technical grade in the string (correct): ${commitmentOnlyHonest}`);
console.log(`commitment grade shown while a technical grade WAS available: ${findings.length}\n`);
for (const f of findings.sort((a, b) => b.n - a.n)) {
  console.log(`  ${f.n.toString().padStart(4)} routes  tile=${JSON.stringify(f.out)}  from ${JSON.stringify(f.g)}  e.g. ${f.eg}`);
}
process.exit(findings.length ? 1 : 0);
