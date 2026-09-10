// The 31st MP leaf — the one an ad-hoc column list could not see.
//
// Batch 2 was built from a dump that carried ITS OWN list of 29 columns, and that dump reported
// "TOTAL remaining MP leaves: 0" after the write. The audit disagreed, and the audit was right:
// `wa_safety_dance.descent` holds one, and my list had `descent_text` but not `descent` — two
// spellings this repo already records as a mirrored pair, which is exactly the kind of near-miss a
// hand-written list gets wrong.
//
// THE LESSON IS THE SCOPE, NOT THE VALUE: a detector's clustering key decides what it can see, and
// so does a repair script's column list. Read `PROSE_COLS` out of the audit rather than restating
// it — a second copy of a vocabulary is how this codebase ended up with four grade parsers, and
// here it produced a confident FALSE ZERO on the very question the batch existed to close.
//
// The value itself is a DOCUMENTED NEGATIVE — "anchor type not specified" is the content, and it
// tells somebody about to lower off exactly what is not known — so it keeps its hedge and loses
// only the publisher.
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

if (!NAMED.test("Confirmed on MP: 5.9, sport")) {
  console.error("ANCHOR STALE: the lifted NAMED does not match MP-as-publisher."); process.exit(1);
}
if (NAMED.test("closed at MP 3.7")) {
  console.error("ANCHOR WRONG: the lifted NAMED matches a MILEPOST."); process.exit(1);
}

// THE COLUMN LIST IS READ FROM THE AUDIT, not restated — this script exists because a restated one
// was short. A parse that finds nothing is fatal rather than a quietly narrower sweep.
const pm = src.match(/^const PROSE_COLS ?= ?\[([\s\S]*?)\];$/m);
if (!pm) { console.error("ANCHOR LOST: PROSE_COLS - cannot confirm the scope this batch closes."); process.exit(1); }
const PROSE_COLS = pm[1].match(/"([a-z_]+)"/g).map((s) => s.replace(/"/g, ""));
if (PROSE_COLS.length < 10) { console.error(`parsed only ${PROSE_COLS.length} prose column(s) - refusing`); process.exit(1); }
if (!PROSE_COLS.includes("descent")) {
  console.error("the audit no longer walks `descent`; this batch's premise has moved."); process.exit(1);
}

const EDITS = [
  { id: "wa_safety_dance", col: "descent",
    find: "(bolted, anchor type not specified on MP)",
    repl: "(bolted, anchor type not recorded)",
    note: "DOCUMENTED NEGATIVE, and a lowering instruction: what the anchor IS matters to somebody about to weight it, and 'not recorded' says the record is thin without naming who published it." },
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
  process.exit(1);
}

const stillFires = [];
for (const s of staged.values()) {
  const before = new Set(leaves(byId.get(s.id)[s.col]));
  for (const l of leaves(s.value)) {
    if (before.has(l)) continue;
    if (fires(l)) stillFires.push(`${s.id} ${s.col}: rewritten leaf STILL fires: ${l.slice(0, 200)}`);
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
console.log(`\n${EDITS.length} edit(s); the audit walks ${PROSE_COLS.length} prose column(s), read from its own list.`);
console.log("post-condition: every rewritten leaf re-checked against the audit's own needle - clean.");

if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exit(0); }

let wrote = 0;
for (const s of staged.values()) { await patchRow("routes", s.id, { [s.col]: s.value }); wrote++; }
console.log(`\nwrote ${wrote} column(s).`);
