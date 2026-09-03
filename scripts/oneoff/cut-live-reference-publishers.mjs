// Open decision 5, answered by the user 2026-09-02: "i don't want citations".
//
// These are the values the sweep had been PARKING — prose that tells a climber to go and check
// something for themselves, naming a publisher while it does so. The precedent pointed at
// keeping them (the catalog keeps 589 land-manager alert pages and ranger phone numbers on
// exactly that reasoning) and it was a judgement with a human's name on it. The human has now
// made it.
//
// THE CUT IS THE PUBLISHER, NOT THE INSTRUCTION. "Check recent trip reports before a
// shoulder-season attempt" is good climbing advice and it survives; who publishes them does not.
// A log crossing that washed out this spring is exactly when a climber should go and look.
//
// AN AGENCY IS NOT A PUBLISHER AND STAYS: NWAC, the Forest Service, ranger districts and their
// phone numbers are contact details for the body that CLOSES THE ROAD, not a claim about where
// our data came from. "USFS" is expanded to "Forest Service" rather than cut.
//
// NOT TOUCHED, and flagged rather than assumed: wa_warrior_peak_standard's "(Mountaineers-
// affiliated basic alpine climbs and independent parties)" names a club as the OPERATOR of
// trips on the route - a fact about who climbs it, like the WTA-maintained trail elsewhere.
// That is not a citation under any reading, so changing it would be over-reading the decision.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const DASH = "—";
const DQ = '"';

const EDITS = [
  // ---- the instruction survives verbatim; only the masthead goes ----
  {
    id: "wa_tailgunner_peak_w_route", col: "watch_out",
    find: "check recent trip reports/WTA before you go",
    repl: "check recent trip reports before you go",
  },
  {
    id: "wa_mount_townsend_standard", col: "itinerary",
    find: "check recent WTA trip reports before an early-season attempt.",
    repl: "check recent trip reports before an early-season attempt.",
  },
  {
    id: "wa_mount_pilchuck_standard_route", col: "pro_tips",
    find: "Check recent WTA trip reports before a shoulder-season attempt",
    repl: "Check recent trip reports before a shoulder-season attempt",
  },
  {
    id: "wa_mount_washington_olympic_standard", col: "pro_tips",
    find: "Check recent Mountaineers/WTA/CascadeClimbers trip reports before going in shoulder season",
    repl: "Check recent trip reports before going in shoulder season",
  },
  {
    id: "wa_magic_mountain_south_ridge", col: "pro_tips",
    find: "check recent trip reports (Mountaineers, CascadeClimbers, WTA) before deciding",
    repl: "check recent trip reports before deciding",
  },
  {
    id: "wa_alice_in_wonderland", col: "pro_tips",
    find: "check current GPX tracks/photos on Mountain Project before heading down.",
    repl: "check current GPX tracks and photos before heading down.",
  },

  // ---- the agency stays, the publisher goes ----
  {
    id: "wa_table_mountain_standard_scramble", col: "pro_tips",
    find: "Check the NWAC forecast and recent WTA trip reports",
    repl: "Check the NWAC forecast and recent trip reports",
    note: "NWAC is the avalanche centre - an agency, and the actionable half. Only WTA goes.",
  },
  {
    id: "wa_mount_ann_scramble", col: "itinerary",
    find: "check current WTA/Forest Service alerts before planning a start time.",
    repl: "check current Forest Service alerts before planning a start time.",
  },
  {
    id: "wa_earl_peak_southwest_ridge", col: "itinerary",
    find: "WTA reported the Beverly Turnpike/Bean Creek trail closed indefinitely due to Labor Mountain Fire damage as of the most recent trip report on file -- check current WTA/USFS status before planning.",
    repl: "The Beverly Turnpike/Bean Creek trail is closed indefinitely due to Labor Mountain Fire damage as of the most recent trip report -- check current Forest Service status before planning.",
    note: "three defects in one sentence: an attributive subject, the record-keeping 'on file', and a publisher inside the instruction. The closure and the instruction both survive.",
  },

  // ---- a book recommendation is a citation; the fact behind it is that nothing is online ----
  {
    id: "wa_chimney_peak_standard", col: "pro_tips",
    find: "For a detailed route topo, see Olympic Mountain Rescue's guidebook " + DQ + "Climber's Guide to the Olympic Mountains" + DQ + " (Mountaineers Books).",
    repl: "No detailed route topo is published online " + DASH + " expect to work the line out on the ground.",
    note: "the actionable content was 'do not expect to find a topo', which survives. Naming the book is the citation.",
  },
  {
    id: "wa_mcmillan_spire_west_southwest_ridge", col: "pro_tips",
    find: "consult Fred Beckey's Cascade Alpine Guide for the actual route description before attempting it, as Mountain Project itself defers to that guidebook.",
    repl: "get a detailed route description before attempting it.",
    note: "names two publishers to make one point: the online description is not enough. That point is ALREADY MADE by the clause before it (\"Online beta for this route is sparse\"), which the preview showed - restating it duplicated the sentence.",
  },
];

const IDS = [...new Set(EDITS.map((e) => e.id))];
const COLS = [...new Set(EDITS.map((e) => e.col))];

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
if (rows.length !== IDS.length) {
  console.error(`read returned ${rows.length} row(s) for ${IDS.length} id(s) - refusing`);
  process.exit(1);
}
const byId = new Map(rows.map((x) => [x.id, x]));

const staged = new Map();
const refusals = [];
for (const e of EDITS) {
  const key = `${e.id} ${e.col}`;
  if (!staged.has(key)) staged.set(key, { id: e.id, col: e.col, value: byId.get(e.id)[e.col], edits: [] });
  const s = staged.get(key);
  const n = countIn(s.value, e.find);
  if (n !== 1) {
    refusals.push(`${e.id} ${e.col}: found ${n} occurrence(s) of ${JSON.stringify(e.find)}, expected exactly 1`);
    continue;
  }
  s.value = replaceIn(s.value, e.find, e.repl);
  s.edits.push(e);
}
if (refusals.length) {
  console.error(`REFUSED - ${refusals.length} edit(s) did not match exactly once:\n  ` + refusals.join("\n  "));
  process.exit(1);
}

for (const s of staged.values()) {
  console.log(`\n### ${s.id}  ${s.col}`);
  for (const e of s.edits) if (e.note) console.log(`   why: ${e.note}`);
  const before = new Set(leaves(byId.get(s.id)[s.col]));
  for (const l of leaves(s.value)) if (!before.has(l)) console.log(`   => ${l}`);
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
    console.error(`NOT APPLIED: ${e.id} ${e.col} still contains ${JSON.stringify(e.find)}`);
    bad++;
  }
}
// The whole point is that the INSTRUCTION survives. Assert it rather than assume it.
const kept = [
  ["wa_tailgunner_peak_w_route", "watch_out", "check recent trip reports before you go"],
  ["wa_table_mountain_standard_scramble", "pro_tips", "NWAC forecast"],
  ["wa_mount_ann_scramble", "itinerary", "Forest Service alerts"],
  ["wa_earl_peak_southwest_ridge", "itinerary", "Forest Service status"],
];
for (const [id, col, needle] of kept) {
  if (!leaves(after.get(id)[col]).join(" ").includes(needle)) {
    console.error(`INSTRUCTION LOST: ${id}.${col} no longer says "${needle}"`); bad++;
  }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${EDITS.length} edit(s) clean; every "go and check" instruction still stands.`);
process.exit(bad ? 1 : 0);
