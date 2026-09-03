// What are the 101 remaining citation findings, exactly?
//
// The narrowing decision turns on the split between two shapes that both trip ACT and neither of
// which names a publisher:
//   A. "per trip reports" — names a KIND OF EVIDENCE. The word "source" never appears.
//   B. "sources differ", "no source gives a season" — an ADMISSION ABOUT THE RECORD, and it puts
//      the word "source" in front of a climber, which is the thing the no-sources rule is about.
// Classified by running the audit's OWN needles, lifted with ANCHOR LOST.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = fs.readFileSync(path.join(ROOT, "scripts/audit-prose-citations.mjs"), "utf8");
const lift = (n) => {
  const m = src.match(new RegExp("^const " + n + " ?= ?(/.*/[a-z]*);$", "m"));
  if (!m) { console.error("ANCHOR LOST: " + n); process.exit(1); }
  return eval(m[1]);
};
const NAMED = lift("NAMED"), ACT = lift("ACT"), CREDIT_FIELD = lift("CREDIT_FIELD");
const CN = lift("COMMON_NOUN");
const de = (t) => t.replace(CN, (m) => "x".repeat(m.length));
const pcm = src.match(/const PROSE_COLS = \[[\s\S]*?\];/);
const PROSE = eval(pcm[0].replace("const PROSE_COLS =", "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/;\s*$/, ""));

const rows = await selectAll("routes", "id," + PROSE.join(","), "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — 0 routes."); process.exit(1); }
const leaves = (v, out) => {
  if (v == null) return out;
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (typeof v === "object") { for (const k of Object.keys(v)) leaves(v[k], out); return out; }
  return out;
};
const values = [];
for (const r of rows) for (const f of PROSE) for (const t of leaves(r[f], [])) values.push({ id: r.id, field: f, text: t });

const TRIP = /\bper (?:recent )?trip reports?\b|\breported by trip\b/i;
const buckets = { publisher: [], trip: [], record: [], other: [] };
for (const v of values) {
  const t = de(v.text);
  const named = NAMED.test(t), act = ACT.test(t);
  // Mirror the audit's OWN verdict, including #1537's credit-field scoping. A copy of that rule
  // drifted 6 findings apart from the audit before this was lifted.
  const isCredit = CREDIT_FIELD.test(v.field);
  if (!(isCredit ? act : (named || act))) continue;
  if (named && !isCredit) { buckets.publisher.push(v); continue; }
  // ACT only. Which shape?
  if (TRIP.test(t) && !/\bsources?\b/i.test(t)) buckets.trip.push(v);
  else if (/\bsources?\b/i.test(t)) buckets.record.push(v);
  else buckets.other.push(v);
}
const n = (k) => buckets[k].length;
console.log(`total flagged: ${n("publisher") + n("trip") + n("record") + n("other")}`);
console.log(`  A. names a PUBLISHER (NAMED fires)                : ${n("publisher")}`);
console.log(`  B. "per trip reports" only, word "source" ABSENT  : ${n("trip")}`);
console.log(`  C. says the word "source" to a climber            : ${n("record")}`);
console.log(`  D. ACT-only, neither                              : ${n("other")}\n`);

for (const k of ["publisher", "other"]) {
  console.log(`--- ${k} (${n(k)}) ---`);
  for (const v of buckets[k].slice(0, 12)) {
    const m = v.text.match(NAMED) || v.text.match(ACT);
    console.log(`  ${v.id} ${v.field}\n     ${JSON.stringify(m && m[0])}  …${v.text.trim().slice(0, 130)}…`);
  }
  console.log("");
}
console.log(`--- C sample (${n("record")}) ---`);
for (const v of buckets.record.slice(0, 8)) {
  const m = v.text.match(ACT);
  console.log(`  ${v.id} ${v.field}  ${JSON.stringify(m && m[0])}`);
}
