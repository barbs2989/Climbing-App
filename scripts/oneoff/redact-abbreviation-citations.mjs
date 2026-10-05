// The three MP citations that are WORSE than a citation.
//
// #1679 taught `audit:prose-citations` that "MP" is Mountain Project (and that a milepost is always
// followed by a number, so the abbreviation is safe to match). That surfaced 24 WA values. Twenty-one
// of them are ordinary attributions and belong to the standing READING LIST — a citation is five
// different defects wearing one pattern, and this file's hub records that only ~4% of that backlog
// was ever mechanical. THREE are not ordinary, and each belongs to a class this repo has already
// swept once with a written repair rule:
//
//   ANALYTICS (2) — "MP average ~3.3 stars", "MP notes very low page views". The `crowds` sweep
//   already established that PAGE VIEWS ARE NOT ASCENTS: strip the publisher and a figure that
//   precise still reads as a measurement of the mountain when it measures a WEBSITE. The repair
//   there kept the qualitative verdict and cut the analytics, and that is what happens here.
//
//   PIPELINE VOICE (1) — "retain the #1-3 structured list as primary, add one #4 as optional" is an
//   editor instructing the next editor, rendered into a climber's RACK box. Same class as the
//   `rope_note` revoicing, and the same rule: keep the fact, drop the instruction.
//
// SAME RULE AS EVERY BATCH IN THIS FAMILY: keep the fact AND keep the uncertainty, drop only the
// sourcing. Deleting a hedge makes a record read MORE certain than it is, which is worse than the
// leak — so "Optionally one #4" keeps the optionality the original expressed.
//
// NOT INCLUDED: the other 21. They are attributions welded into sentences that also carry the fact,
// and each needs reading before it needs rewriting. Report, do not sweep.
//
// Contract identical to the record-provenance batches, including the post-condition that every
// rewritten leaf is run back through the audit's OWN needle, lifted by anchor — which now includes
// the MP rule, so a rewrite that merely moved the abbreviation would be refused.
//
// Dry run by default. Pass --apply to write.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const src = fs.readFileSync(path.join(ROOT, "scripts/audit-prose-citations.mjs"), "utf8");
const lift = (n) => {
  const m = src.match(new RegExp("^const " + n + " ?= ?(/.*/[a-z]*);$", "m"));
  if (!m) { console.error("ANCHOR LOST: " + n + " - the audit moved; re-anchor before trusting this run."); process.exit(1); }
  return eval(m[1]);
};
const NAMED = lift("NAMED"), ACT = lift("ACT"), CN = lift("COMMON_NOUN");
const de = (t) => t.replace(CN, (m) => "x".repeat(m.length));
const fires = (t) => { const x = de(t); return NAMED.test(x) || ACT.test(x); };

// The lifted needle must actually know about MP, or this batch's post-condition is vacuous for
// exactly the class it exists for.
if (!NAMED.test("Confirmed on MP: 5.9, sport")) {
  console.error("ANCHOR STALE: the lifted NAMED does not match MP-as-publisher, so the post-condition"
    + " cannot see the defect this batch repairs. Re-check scripts/audit-prose-citations.mjs.");
  process.exit(1);
}
if (NAMED.test("closed at MP 3.7")) {
  console.error("ANCHOR WRONG: the lifted NAMED matches a MILEPOST. Refusing rather than sweeping road prose.");
  process.exit(1);
}

const EDITS = [
  {
    id: "wa_django", col: "pro_tips",
    find: " (MP average ~3.3 stars)",
    repl: "",
    note: "ANALYTICS. 'Highest-rated route at the crag' is the qualitative verdict and survives; the star average is the website's own figure about its own page, and reads as a measurement of the rock.",
  },
  {
    id: "wa_kendall_peak_cliff_north_face", col: "watch_out",
    find: "The route sees minimal traffic (MP notes very low page views), so there's little beta beyond the single route page",
    repl: "The route sees minimal traffic, so there's little beta available",
    note: "ANALYTICS, and the warning is the content. Minimal traffic -> little beta -> route-find carefully all survive; the page-view count and the reference to 'the single route page' are both about a website.",
  },
  {
    id: "wa_rapple_grapple", col: "sling_rack",
    find: "fresh MP source broadens this to 'pro to 4 inches' — retain the #1-3 structured list as primary, add one #4 as optional; no pitons needed",
    repl: "Optionally one #4 to cover pro to 4 inches; no pitons needed",
    note: "PIPELINE VOICE in the RACK box. 'Retain the structured list as primary' is an instruction about how to STORE the row - the structured list is the cams array beside it, which renders anyway. Both climber-facing facts survive: an optional #4 extends cover to 4 inches, and no pitons are needed.",
  },
];

const COLS = [...new Set(EDITS.map((e) => e.col))];
const IDS = [...new Set(EDITS.map((e) => e.id))];

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

const KEY = APPLY ? requireServiceKey() : anonKey();
const url = `${SUPABASE_URL}/rest/v1/routes?id=in.(${IDS.join(",")})&select=id,${COLS.join(",")}`;
const r = await fetch(url, { headers: headers(KEY) });
if (!r.ok) { console.error(`read failed: ${r.status} ${await r.text()}`); process.exit(1); }
const rows = await r.json();
if (rows.length !== IDS.length) { console.error(`read returned ${rows.length} row(s) for ${IDS.length} id(s) - refusing`); process.exit(1); }
const byId = new Map(rows.map((x) => [x.id, x]));

const staged = new Map();
const refusals = [];
for (const e of EDITS) {
  const key = `${e.id} ${e.col}`;
  if (!staged.has(key)) staged.set(key, { id: e.id, col: e.col, value: byId.get(e.id)[e.col], edits: [] });
  const s = staged.get(key);
  const n = countIn(s.value, e.find);
  if (n !== 1) { refusals.push(`${e.id} ${e.col}: found ${n} occurrence(s) of ${JSON.stringify(e.find)}, expected exactly 1`); continue; }
  s.value = replaceIn(s.value, e.find, e.repl);
  s.edits.push(e);
}
if (refusals.length) {
  console.error(`REFUSED - ${refusals.length} edit(s) did not match exactly once:\n  ` + refusals.join("\n  "));
  console.error("\nNothing was written. Re-read the live value before changing the declaration.");
  process.exit(1);
}

const stillFires = [];
for (const s of staged.values()) {
  const before = new Set(leaves(byId.get(s.id)[s.col]));
  for (const l of leaves(s.value)) {
    if (before.has(l)) continue;
    if (fires(l)) stillFires.push(`${s.id} ${s.col}: rewritten leaf STILL fires: ${l.slice(0, 160)}`);
  }
}
if (stillFires.length) {
  console.error(`REFUSED - ${stillFires.length} rewritten value(s) still trip the audit:\n  ` + stillFires.join("\n  "));
  process.exit(1);
}

for (const s of staged.values()) {
  console.log(`\n### ${s.id}  ${s.col}`);
  for (const e of s.edits) {
    console.log(`   - ${JSON.stringify(e.find)}`);
    console.log(`   + ${JSON.stringify(e.repl)}`);
    if (e.note) console.log(`     why: ${e.note}`);
  }
  const before = new Set(leaves(byId.get(s.id)[s.col]));
  for (const l of leaves(s.value)) if (!before.has(l)) console.log(`   => ${l}`);
}
console.log(`\n${EDITS.length} edit(s) across ${staged.size} column(s) on ${IDS.length} route(s).`);
console.log("post-condition: every rewritten leaf re-checked against the audit's own needle - clean.");

if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exit(0); }

let wrote = 0;
for (const s of staged.values()) { await patchRow("routes", s.id, { [s.col]: s.value }); wrote++; }
console.log(`\nwrote ${wrote} column(s).`);
