// Broken English left behind by this sweep's own earlier batches.
//
//     "Three several accounts put the start of the first pitch about 150 FEET UP..."
//     "corroborated by three several accounts"
//     "Two several accounts both put it at 7,200 ft"
//     "a few multiple sources note that when the summit-block heather is wet..."
//
// A redaction replaced a list of named publishers with a category — "several accounts", "multiple
// sources" — and left the COUNT WORD standing in front of it. Nobody wrote these sentences; a
// find/replace did, and the pair it was written as looked fine.
//
// THE COUNT IS THE INFORMATIVE HALF AND IT STAYS. "Three accounts put the start at 150 ft up" is
// a stronger statement than "several accounts" — it says how much agreement there is — so the
// redundant category word is what goes, not the number.
//
// FOUND BY SCANNING FOR GRAMMATICAL DAMAGE RATHER THAN FOR CITATIONS, which is a different
// question and needed a different needle. The first two attempts were noise and are worth
// recording so they are not rebuilt:
//
//   "stacked quantifiers" (any two in a row)   126 hits, ~all correct English: "many other
//                                              parties", "multiple independent lines", "the
//                                              other four areas".
//   "doubled word" (\b(\w+)\s+\1\b)            230 hits, dominated by HAMMA HAMMA — a real river,
//                                              on 8 values of one route.
//   a DIGIT before several/multiple             7 of 13 hits were "a pullout on US 2 several
//                                              miles lower" — a highway number and a distance.
//
// Narrowed to a SPELLED-OUT count immediately before several/multiple/various/numerous, which is
// never grammatical, it is exactly 4 and all 4 are real. A detector that fires on correct prose
// is one people learn to ignore; this one fires on nothing else in 8,365 routes.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

const EDITS = [
  { id: "wa_cathedral_peak_pasayten_se_buttress", col: "approach_variants",
    find: "Three several accounts put the start", repl: "Three accounts put the start" },
  { id: "wa_crater_mountain_standard_route", col: "approach_variants",
    find: "corroborated by three several accounts", repl: "corroborated by three accounts" },
  { id: "wa_clark_mountain_west_ridge", col: "approach_variants",
    find: "Two several accounts both put it at 7,200 ft", repl: "Two accounts both put it at 7,200 ft" },
  { id: "wa_baring_mountain_south_route", col: "detailed_rack",
    find: "and a few multiple sources note that", repl: "and several sources note that",
    note: "no count survives here - 'a few' and 'multiple' are both vague, so one of them simply goes" },
];

function countIn(v, find) {
  if (typeof v === "string") return v.split(find).length - 1;
  if (Array.isArray(v)) return v.reduce((n, x) => n + countIn(x, find), 0);
  if (v && typeof v === "object") return Object.values(v).reduce((n, x) => n + countIn(x, find), 0);
  return 0;
}
function replaceIn(v, find, repl) {
  if (typeof v === "string") return v.split(find).join(repl);
  if (Array.isArray(v)) return v.map((x) => replaceIn(x, find, repl));
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, x] of Object.entries(v)) o[k] = replaceIn(x, find, repl);
    return o;
  }
  return v;
}
function leaves(v, out = []) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => leaves(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => leaves(x, out));
  return out;
}

// The shape this exists to remove, re-derived at run time rather than trusted from the table:
// a spelled-out count immediately before a vague-quantity word.
const BROKEN = /\b(?:a few|a couple of|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:several|multiple|various|numerous)\b/i;

const IDS = [...new Set(EDITS.map((e) => e.id))];
const COLS = [...new Set(EDITS.map((e) => e.col))];
const KEY = APPLY ? requireServiceKey() : anonKey();
const url = `${SUPABASE_URL}/rest/v1/routes?id=in.(${IDS.join(",")})&select=id,${COLS.join(",")}`;
const r = await fetch(url, { headers: headers(KEY) });
if (!r.ok) { console.error(`read failed: ${r.status} ${await r.text()}`); process.exit(1); }
const rows = await r.json();
if (rows.length !== IDS.length) { console.error(`read ${rows.length} row(s) for ${IDS.length} id(s) - refusing`); process.exit(1); }
const byId = new Map(rows.map((x) => [x.id, x]));

const staged = new Map();
const refusals = [];
for (const e of EDITS) {
  const key = `${e.id}\x00${e.col}`;
  if (!staged.has(key)) staged.set(key, { id: e.id, col: e.col, value: byId.get(e.id)[e.col], edits: [] });
  const s = staged.get(key);
  if (countIn(s.value, e.find) !== 1) {
    refusals.push(`${e.id} ${e.col}: ${JSON.stringify(e.find)} does not appear exactly once`);
    continue;
  }
  if (!BROKEN.test(e.find)) refusals.push(`${e.id} ${e.col}: the declared find is not the broken shape this fixes`);
  if (BROKEN.test(e.repl)) refusals.push(`${e.id} ${e.col}: the replacement STILL matches the broken shape`);
  s.value = replaceIn(s.value, e.find, e.repl);
  s.edits.push(e);
}
if (refusals.length) {
  console.error(`REFUSED - ${refusals.length} problem(s):\n  ` + refusals.join("\n  "));
  process.exit(1);
}

for (const s of staged.values()) {
  console.log(`\n### ${s.id}  ${s.col}`);
  for (const e of s.edits) if (e.note) console.log(`   why: ${e.note}`);
  const before = new Set(leaves(byId.get(s.id)[s.col]));
  for (const l of leaves(s.value)) if (!before.has(l)) console.log(`   => ${l.length > 300 ? l.slice(0, 300) + " ..." : l}`);
}
console.log(`\n${EDITS.length} edit(s) across ${staged.size} value(s) on ${IDS.length} route(s).`);

if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exit(0); }

let wrote = 0;
for (const s of staged.values()) { await patchRow("routes", s.id, { [s.col]: s.value }); wrote++; }
console.log(`\nwrote ${wrote} value(s).`);

const v = await fetch(url, { headers: headers(KEY) });
const after = new Map((await v.json()).map((x) => [x.id, x]));
let bad = 0;
for (const e of EDITS) {
  if (countIn(after.get(e.id)[e.col], e.find) !== 0) {
    console.error(`NOT APPLIED: ${e.id} ${e.col} still contains ${JSON.stringify(e.find)}`); bad++;
  }
  // and the broken SHAPE must be gone from the value entirely, not merely this instance of it
  for (const l of leaves(after.get(e.id)[e.col])) if (BROKEN.test(l)) {
    console.error(`STILL BROKEN: ${e.id} ${e.col} matches ${JSON.stringify(l.match(BROKEN)[0])}`); bad++;
  }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${EDITS.length} edit(s) clean, and no value still matches the broken shape.`);
process.exit(bad ? 1 : 0);
