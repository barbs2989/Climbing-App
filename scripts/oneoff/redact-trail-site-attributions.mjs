// Batch 8 of the prose-citation sweep: the WTA family, minus two classes that are NOT citations.
//
// WHAT THIS DELIBERATELY DOES NOT TOUCH, and it is roughly half the family:
//
//   * LIVE REFERENCES - "check recent WTA trip reports before a shoulder-season attempt",
//     "check current WTA/USFS status before planning". These tell a climber where to go and look
//     FOR THEMSELVES, which is the same shape as the 589 land-manager alert pages and ranger
//     phone numbers this catalog deliberately keeps. Whether they are a citation is a POLICY
//     question with a human's name on it (open decision 5), not a judgement to make in a sweep.
//     Eight of them in this family alone: wa_tailgunner_peak_w_route, wa_earl_peak_southwest_ridge,
//     wa_mount_ann_scramble, wa_mount_townsend_standard, wa_mount_washington_olympic_standard,
//     wa_magic_mountain_south_ridge, wa_mount_pilchuck_standard_route,
//     wa_table_mountain_standard_scramble.
//
//   * WTA AS A TRAIL MAINTAINER - "the WTA-maintained Garfield Ledges viewpoint trail" is a fact
//     about who looks after the trail, not a claim about where our data came from. Same
//     distinction that keeps a club named as the operator of a scramble course.
//
// WHAT SURVIVES A CUT: "trip reports" as a bare category. It is not a publisher, and it says the
// claim rests on parties' accounts rather than on a measurement - so where a sentence reads "WTA
// and trip reports note X", the repair drops the publisher and keeps the category rather than
// leaving the claim unsourced-looking AND unhedged.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const DASH = "—";
const Q = "'";

const EDITS = [
  // ---- the attribution IS the verb: the publisher is the sentence's subject ----
  {
    id: "wa_baring_mountain_northwest_ridge", col: "best_season",
    find: "WTA specifically recommends an ice axe in spring and summer.",
    repl: "An ice axe is specifically recommended in spring and summer.",
  },
  {
    id: "wa_dark_peak_dark_glacier_route", col: "best_season",
    find: "WTA broadly lists Dark Peak as reasonably climbable May through October.",
    repl: "Dark Peak is broadly reckoned reasonably climbable May through October.",
  },
  {
    id: "wa_navaho_peak_south_slopes", col: "itinerary",
    find: "WTA reported the Stafford Creek trailhead access/trail was closed",
    repl: "The Stafford Creek trailhead access/trail was reported closed",
  },
  {
    id: "wa_bulls_tooth_standard", col: "pro_tips",
    find: "WTA counts 24.6 mi RT",
    repl: "it is 24.6 mi RT",
    note: "lowercase deliberately - the clause sits mid-sentence after a dash, and the preview is what showed the capital reading wrong.",
  },
  {
    id: "wa_ruby_mountain_south_ridge", col: "best_season",
    find: "(WTA notes a snow-free climb is " + Q + "normally possible halfway through July" + Q + ")",
    repl: "(a snow-free climb is normally possible about halfway through July)",
    note: "a quotation cannot survive its speaker - unquoted, it becomes the page's own sentence.",
  },
  {
    id: "wa_iron_peak_teanaway_scramble", col: "pitch_detail",
    find: "source (WTA) does not give a formal class rating",
    repl: "no formal class rating is published",
    note: "a NEGATIVE result. The absence is the content, so it is reworded rather than deleted.",
  },

  // ---- separable: the publisher is a tag on a claim that stands without it ----
  {
    id: "wa_mount_teneriffe_standard_route", col: "pitch_detail",
    find: "requires sure footing per WTA",
    repl: "requires sure footing",
  },
  {
    id: "wa_windy_peak_trail", col: "pitch_detail",
    find: "(~8,100 ft per WTA's tracked profile)",
    repl: "(~8,100 ft)",
  },
  {
    id: "wa_east_slope", col: "itinerary",
    find: " (matches WTA's on-file stats)",
    repl: "",
  },
  {
    id: "wa_mount_watson_scramble", col: "itinerary",
    find: "per WTA/Mountaineers trip reports",
    repl: "per trip reports",
  },
  {
    id: "wa_winchester_mountain_south_trail", col: "watch_out",
    find: "Recent (2025) WTA trip reports note",
    repl: "Recent (2025) trip reports note",
  },
  {
    id: "wa_navaho_peak_south_slopes", col: "best_season",
    find: "but WTA and trip reports note snow lingers",
    repl: "but trip reports note snow lingers",
  },
  {
    id: "wa_alta_mountain_scramble", col: "climbing_route",
    find: "WTA and trip reports flag a section",
    repl: "Trip reports flag a section",
  },
  {
    id: "wa_mount_hopper_standard", col: "itinerary",
    find: "WTA and SummitPost both flag genuine route-finding difficulty",
    repl: "Trip reports flag genuine route-finding difficulty",
  },

  // ---- a list of the sites somebody searched, inside a claim that survives without it ----
  {
    id: "wa_alta_mountain_scramble", col: "itinerary",
    find: "Standard trip reports (WTA, Mountaineers, Have Tent Will Travel, trailcatjim.com) all treat this",
    repl: "Standard trip reports all treat this",
  },
  {
    id: "wa_osceola_peak_scramble", col: "crowds",
    find: "most Pasayten trip reports (WTA, Mountaineers, peakbagging blogs) describe",
    repl: "most Pasayten trip reports describe",
  },
  {
    id: "wa_switchback_mountain_scramble", col: "crowds",
    find: "several independent trip reports exist (WTA, SummitPost, Climber Kyle, Mountaineers club outings, trailcatjim) showing",
    repl: "several independent trip reports exist showing",
  },
  {
    id: "wa_north_twin_sister_west_ridge", col: "crowds",
    find: " (Mountaineers Basic Alpine Climb listings, recurring WTA trip reports)",
    repl: "",
  },
  {
    id: "wa_tomyhoi_peak_southeast_ridge", col: "crowds",
    find: "a well-known Mountaineers/WTA-documented scramble objective",
    repl: "a well-known, well-documented scramble objective",
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
  console.error("\nNothing was written. Re-read the live value before changing the declaration.");
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
console.log(bad ? `\nVERIFY FAILED: ${bad} edit(s) did not land.` : `\nverified: all ${EDITS.length} edit(s) re-read clean.`);
process.exit(bad ? 1 : 0);
