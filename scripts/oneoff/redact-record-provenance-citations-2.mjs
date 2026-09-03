// Batch 2 of the record-provenance family: the same class OUTSIDE `PROSE_COLS`.
//
// `audit:prose-citations` reports road/access and waypoint notes in their own sections, and the
// route-prose batch could not reach them. All four here are the same shape it closed - a statement
// about OUR RECORD ("depending on the source", "(sources vary)", "not documented in any source
// found") rather than about the mountain.
//
// SAME RULE: keep the fact AND keep the uncertainty, drop only the sourcing. In three of the four
// the uncertainty is a RANGE, and a range says the same thing without the sourcing - "~8.5-13.5mi
// past Hwy 101/Brinnon" is exactly as hedged as "~8.5-13.5mi (sources vary) past Hwy 101/Brinnon".
// The fourth is a documented NEGATIVE, which is evidence and survives as one.
//
// NOT INCLUDED: wa_witches_tower_southwest_corner access.permit, which cites a guidebook for a
// PERMIT RULE ("max party size 8 for this route per the Mountaineers guide"). Dropping the
// attribution would assert a regulation in our own voice, and asserting a rule we did not verify
// with the land manager is worse than naming where it came from. That belongs with the road/access
// research, not with a text sweep.
//
// Contract identical to batch 1, including the post-condition that every rewritten leaf is run back
// through the audit's OWN needle, lifted by anchor.
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

const EDITS = [
  {
    id: "wa_mount_constance_finger_traverse", col: "waypoints",
    find: "~8.5-13.5mi (sources vary) past Hwy 101/Brinnon",
    repl: "~8.5-13.5mi past Hwy 101/Brinnon",
    note: "the RANGE is the uncertainty; a 5-mile spread already tells a driver not to trust one figure.",
  },
  {
    id: "wa_mount_persis_the_hexorcist", col: "road",
    find: "is not documented in any source found.",
    repl: "is not documented anywhere on file.",
    note: "a documented NEGATIVE - it is the whole content of the clause and survives as one.",
  },
  {
    id: "wa_mount_pugh_pika_slab", col: "road",
    find: "roughly 12.5-14 miles from Darrington depending on the source.",
    repl: "roughly 12.5-14 miles from Darrington.",
    note: "the RANGE is the uncertainty. The 'trip reports say' clause later in this value names no third party and is untouched.",
  },
  {
    id: "wa_mount_triumph_west_route", col: "road",
    find: "specific Triumph Pass trailhead/road not documented in sources checked",
    repl: "specific Triumph Pass trailhead/road not documented on file",
    note: "a documented NEGATIVE. Separately, this value is a SENTENCE sitting in road.name, which renders as a label - reported, not fixed here, because repairing it means deciding what the road is called.",
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

const v = await fetch(url, { headers: headers(KEY) });
const after = new Map((await v.json()).map((x) => [x.id, x]));
let bad = 0;
for (const e of EDITS) {
  const n = countIn(after.get(e.id)[e.col], e.find);
  if (n !== 0) { console.error(`NOT APPLIED: ${e.id} ${e.col} still contains ${JSON.stringify(e.find)}`); bad++; }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} edit(s) did not land.` : `\nverified: all ${EDITS.length} edit(s) re-read clean.`);
process.exit(bad ? 1 : 0);
