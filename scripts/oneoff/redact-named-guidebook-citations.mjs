// The named-book family: "Climber's Guide to the Olympic Mountains" and Beckey's "Cascade Alpine
// Guide", added to the deny-list by #1494. 21 values in WA, and they split cleanly in two.
//
// THIS BATCH IS THE HALF WHERE THE BOOK IS CITED AS THE SOURCE OF A FACT — a season window, a
// grade, a protection claim, a rappel count, an avalanche record. 12 values. Those are citations
// under any reading, and the fact survives the cut in every one.
//
// THE OTHER NINE ARE LEFT, AND DELIBERATELY. They name a book the climber is told to CARRY or
// consult, which is the class this repo has twice decided to keep:
//
//     wa_garfield_mountain_south_route.what_to_bring
//         "Beckey's Cascade Alpine Guide Vol. 1 sketch and a GPS track"
//     wa_sews_sw_rib.pro_tips
//         "Beckey's Cascade Alpine Guide (Rainy Pass to Fraser River) has a good topo."
//     wa_mcmillan_spire_west_southwest_ridge.pro_tips
//         "the traditional reference most parties carry for this line's pitch-by-pitch detail"
//     wa_warrior_peak_standard.approach
//         "(also called Route 1 from Olympic Climbers Guide)"   <- a route's PUBLISHED NAME
//
// The `what_to_bring` one is exactly the "Green Trails / CalTopo map and compass" case already
// documented as a keep: a GEAR LINE naming which item to buy, where the generic form loses the
// actionable part. The rest are the same shape one step out. That distinction is a product call
// the user has ruled on twice and it is not mine to widen unilaterally, so they stay on the
// reading list rather than being swept in with the citations.
//
// A WARNING THAT THE BOOK IS WRONG IS THE MOST VALUABLE THING IN THIS FAMILY and survives here
// intact: "harder than the Cascade Alpine Guide's 'Class 3' rating suggests" becomes "harder than
// the published Class 3 rating suggests". CLAUDE.md warns at length against sweeping that family
// on the word alone; reading each one and choosing the wording is what it asks for instead.
//
// wa_mount_steel_standard.face IS THE SHARPEST VALUE IN THE WHOLE SWEEP and loses a whole
// sentence rather than a phrase: "Source: Climbers Guide to the Olympic Mountains route
// description, consistent with the route's own aspect field." That is a literal "Source:" label,
// a named book, AND the catalog naming one of its own columns, in a field that renders as its own
// card. The first clause — which way the route faces — is the entire content and is untouched.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const Q = "'";

const EDITS = [
  { id: "wa_mount_steel_standard", col: "face",
    find: " Source: Climbers Guide to the Olympic Mountains route description, consistent with the route" + Q + "s own aspect field.",
    repl: "",
    note: "a literal Source:, a named book, and the catalog naming its own column - all in one sentence, on a field that renders as its own card" },
  { id: "wa_mount_seattle_south", col: "pro_needs",
    find: "with no glacier travel per the Climber" + Q + "s Guide to the Olympic Mountains.",
    repl: "with no glacier travel per the published route description.",
    note: "'No technical protection is documented' is the hedge and stays" },
  { id: "wa_mount_seattle_noyes_basin", col: "best_season",
    find: "June through August per the Climber" + Q + "s Guide to the Olympic Mountains;",
    repl: "June through August per the published description;" },
  { id: "wa_mount_seattle_seattle_creek", col: "best_season",
    find: "June through August per the Climber" + Q + "s Guide to the Olympic Mountains;",
    repl: "June through August per the published description;" },
  { id: "wa_mount_olson_standard", col: "itinerary",
    find: "rated class 3 in the Olympic Mountain Climbers Guide)", repl: "rated class 3 in the published description)" },
  { id: "wa_garfield_mountain_scramble", col: "best_season",
    find: "July–August most reliable per Beckey" + Q + "s Cascade Alpine Guide;",
    repl: "July–August most reliable per published accounts;" },
  { id: "wa_whitehorse_mountain_r1", col: "hazards",
    find: "A 1970 wet-slab release documented in Beckey" + Q + "s Cascade Alpine Guide narrowly missed",
    repl: "A documented 1970 wet-slab release narrowly missed",
    note: "an AVALANCHE record - the year, the near miss and the terrain trap all stay" },
  { id: "wa_dumbell_mountain_west", col: "pro_needs",
    find: "(per Beckey" + Q + "s Cascade Alpine Guide) but are not required",
    repl: "(per the published description) but are not required" },
  { id: "wa_mount_terror_southeast_face", col: "pitch_detail",
    find: "though the standard (Cascade Alpine Guide) rating for the climb is III-IV, 5.6.",
    repl: "though the standard published rating for the climb is III-IV, 5.6.",
    note: "a GRADE DISAGREEMENT - 'at least one party rated this section a stout 5.8' is the content and stays" },
  { id: "wa_nooksack_tower_south_face", col: "rappel_count_note",
    find: "Beckey" + Q + "s Cascade Alpine Guide (via independent secondary sourcing) states the descent " + Q + "may require ten or more rappels" + Q + " via the Beckey-Schmidtke line;",
    repl: "A published description states the descent may require ten or more rappels via the Beckey-Schmidtke line;",
    note: "a RAPPEL claim: the count, the floor and both hedges stay, and Beckey-Schmidtke is a ROUTE NAME (its first ascensionists) rather than a publisher. '(via independent secondary sourcing)' was pipeline voice." },
  { id: "wa_spire_mountain_scramble", col: "hazards",
    find: "harder than the Cascade Alpine Guide" + Q + "s " + Q + "Class 3" + Q + " rating suggests",
    repl: "harder than the published Class 3 rating suggests",
    note: "a WARNING THAT THE BOOK IS WRONG - the most valuable shape in this family, and the warning is unchanged" },
  { id: "wa_cathedral_rock_northeast_ridge_2003_variation", col: "pitch_detail",
    find: "see Beckey" + Q + "s Cascade Alpine Guide for the original approach and start.",
    repl: "consult a published description for the original approach and start." },
];

const KEEP = [
  ["wa_mount_steel_standard", "face", "climbs the amphitheater on the west side of the peak"],
  ["wa_mount_seattle_south", "pro_needs", "No technical protection is documented"],
  ["wa_whitehorse_mountain_r1", "hazards", "terrain trap below the upper mountain"],
  ["wa_mount_terror_southeast_face", "pitch_detail", "a stout 5.8"],
  ["wa_nooksack_tower_south_face", "rappel_count_note", "Beckey-Schmidtke line"],
  ["wa_nooksack_tower_south_face", "rappel_count_note", "not individually documented"],
  ["wa_spire_mountain_scramble", "hazards", "Exposed ~10 ft Class 5 mantle step"],
  ["wa_garfield_mountain_scramble", "best_season", "window closes with the first autumn rain/snow"],
];

const IDS = [...new Set([...EDITS.map((e) => e.id), ...KEEP.map((k) => k[0])])];
const COLS = [...new Set([...EDITS.map((e) => e.col), ...KEEP.map((k) => k[1])])];

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
if (rows.length !== IDS.length) { console.error(`read ${rows.length} row(s) for ${IDS.length} id(s) - refusing`); process.exit(1); }
const byId = new Map(rows.map((x) => [x.id, x]));

const staged = new Map();
const refusals = [];
for (const e of EDITS) {
  const key = `${e.id}\x00${e.col}`;
  if (!staged.has(key)) staged.set(key, { id: e.id, col: e.col, value: byId.get(e.id)[e.col], edits: [] });
  const s = staged.get(key);
  const n = countIn(s.value, e.find);
  if (n !== 1) {
    refusals.push(`${e.id} ${e.col}: found ${n} occurrence(s) of ${JSON.stringify(e.find.slice(0, 70))}, expected exactly 1`);
    continue;
  }
  s.value = replaceIn(s.value, e.find, e.repl);
  s.edits.push(e);
}
for (const [id, col, needle] of KEEP) {
  if (!leaves(byId.get(id)[col]).join(" ").includes(needle)) {
    refusals.push(`${id}.${col}: does not currently contain ${JSON.stringify(needle)} - declared state has moved`);
  }
}
if (refusals.length) {
  console.error(`REFUSED - ${refusals.length} problem(s):\n  ` + refusals.join("\n  "));
  process.exit(1);
}

for (const s of staged.values()) {
  console.log(`\n### ${s.id}  ${s.col}`);
  for (const e of s.edits) if (e.note) console.log(`   why: ${e.note}`);
  const before = new Set(leaves(byId.get(s.id)[s.col]));
  for (const l of leaves(s.value)) if (!before.has(l)) console.log(`   => ${l.length > 400 ? l.slice(0, 400) + " ..." : l}`);
}
console.log(`\n${EDITS.length} edit(s) across ${staged.size} value(s) on ${IDS.length} route(s).`);
console.log(`${KEEP.length} piece(s) of content asserted; 9 "which book to carry" values deliberately left.`);

if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exit(0); }

let wrote = 0;
for (const s of staged.values()) { await patchRow("routes", s.id, { [s.col]: s.value }); wrote++; }
console.log(`\nwrote ${wrote} value(s).`);

const v = await fetch(url, { headers: headers(KEY) });
const after = new Map((await v.json()).map((x) => [x.id, x]));
let bad = 0;
for (const e of EDITS) {
  if (countIn(after.get(e.id)[e.col], e.find) !== 0) {
    console.error(`NOT APPLIED: ${e.id} ${e.col} still contains ${JSON.stringify(e.find.slice(0, 50))}`); bad++;
  }
}
for (const [id, col, needle] of KEEP) {
  if (!leaves(after.get(id)[col]).join(" ").includes(needle)) {
    console.error(`CONTENT LOST: ${id}.${col} no longer says "${needle}"`); bad++;
  }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${EDITS.length} edit(s) clean; the avalanche record, the grade disagreement, the rappel hedges and the book-is-wrong warning all intact.`);
process.exit(bad ? 1 : 0);
