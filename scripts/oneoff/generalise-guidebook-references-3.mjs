// The `guidebook` family, batch 3 — including the plural. Same transform throughout:
//
//     guidebook / guidebooks  ->  published description(s)
//
// A category rather than a source, so it is correct whether the sentence attributes to the book
// or warns about it. Batches 1 and 2 took the family 167 -> 65; this closes most of the rest.
//
// ONE SENTENCE APPEARS ON SIX ROUTES. "The approach that made it popular no longer exists, and
// the story is worth getting right rather than repeating old guidebook mileage" is the same
// warning about a vanished approach, written once and carried across Glacier Peak's neighbours.
// Six identical edits, and the sentence is worth keeping in full: it tells a climber the mileage
// in their book is for a road that is gone.
//
// NAMED TITLES STILL GO. "Beckey's 5.8 guidebook grade", "featured in guidebooks/Selected
// Climbs", "older guidebooks (Beckey)". A title is a citation however the sentence is framed —
// but note that "run as a Mountaineers Intermediate Ice/Alpine Climb" in the same value STAYS,
// because a club running a course on the route is a fact about who climbs it.
//
// A MAP PUBLISHER IS NOT A GUIDEBOOK. wa_mount_thomson_west_ridge records that the peak is
// "spelled 'Thompson' in most guidebooks, 'Thomson' on USGS/Green Trails maps" — the USGS half
// is the naming AUTHORITY, which is why the sentence is informative at all, so only the
// guidebook half changes.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const Q = "'";

// The vanished-approach sentence, identical on six routes.
const MILEAGE = ["wa_buck_mountain_south_ridge", "wa_chalangin_peak_little_giant_pass_luahna_col",
  "wa_glacier_peak_cool_glacier_gerdine", "wa_glacier_peak_kennedy_glacier",
  "wa_helmet_butte_standard_route"].map((id) => ({
    id, col: "bivy",
    find: "rather than repeating old guidebook mileage",
    repl: "rather than repeating old published mileage",
  }));

const EDITS = [
  ...MILEAGE,

  // ---- warnings that the published grade or time is optimistic ----
  { id: "wa_three_queens_standard", col: "approach",
    find: "guidebook descriptions of this section as " + Q + "class 3" + Q + " are considered generous",
    repl: "published descriptions of this section as " + Q + "class 3" + Q + " are considered generous" },
  { id: "wa_three_queens_standard", col: "climbing_route",
    find: "guidebook descriptions of this section as " + Q + "class 3" + Q + " are considered generous",
    repl: "published descriptions of this section as " + Q + "class 3" + Q + " are considered generous" },
  { id: "wa_three_queens_standard", col: "approach_variants",
    find: "harder than the guidebook grade suggests",
    repl: "harder than the published grade suggests" },
  { id: "wa_three_queens_standard", col: "approach_variants",
    find: "Guidebook descriptions calling this section class 3 are considered generous",
    repl: "Published descriptions calling this section class 3 are considered generous" },
  { id: "wa_cascade_peak_east_ridge", col: "pitch_detail",
    find: "treat Beckey's 5.8 guidebook grade as optimistic.",
    repl: "treat the published 5.8 grade as optimistic." },
  { id: "wa_cascade_peak_east_ridge", col: "pitch_detail",
    find: "5.8 (guidebook;",
    repl: "5.8 (published;" },
  { id: "wa_cascade_peak_east_ridge", col: "hazards",
    find: "worse than the 5.8 guidebook grade suggests",
    repl: "worse than the published 5.8 grade suggests" },
  { id: "wa_sharkfin_tower_southeast_ridge", col: "pitch_detail",
    find: "Guidebooks call it 5.4/5.0+ but several parties feel it climbs harder",
    repl: "Published descriptions call it 5.4/5.0+ but several parties feel it climbs harder" },
  { id: "wa_north_ridge_2", col: "itinerary",
    find: "more time than the guidebook suggests",
    repl: "more time than the published description suggests" },
  { id: "wa_traverse_of_mount_index", col: "rappels",
    find: "more rappels than guidebooks suggest",
    repl: "more rappels than published descriptions suggest" },
  { id: "wa_se_ridge_aka_shield_wall", col: "beta",
    find: "despite what older guidebooks suggest",
    repl: "despite what older published descriptions suggest" },
  { id: "wa_se_ridge_aka_shield_wall", col: "approach_variants",
    find: "despite what older guidebooks suggest",
    repl: "despite what older published descriptions suggest" },
  { id: "wa_mount_anderson_eel_glacier", col: "watch_out",
    find: "than older guidebooks describe",
    repl: "than older published descriptions describe" },
  { id: "wa_dome_peak_dome_glacier", col: "pro_tips",
    find: "described in older guidebooks",
    repl: "described in older published descriptions" },

  // ---- the old approach no longer exists, and the book still describes it ----
  { id: "wa_whitehorse_mountain_nw_shoulder", col: "approach",
    find: "beyond what older guidebook mileages state",
    repl: "beyond what older published mileages state" },
  { id: "wa_whitehorse_mountain_nw_shoulder", col: "approach_variants",
    find: "that older guidebook figures do not include",
    repl: "that older published figures do not include" },
  { id: "wa_dark_peak_dark_glacier_route", col: "approach",
    find: "not the route most guidebooks still describe as standard",
    repl: "not the route most published descriptions still describe as standard" },
  { id: "wa_dark_peak_dark_glacier_route", col: "pro_tips",
    find: "that most guidebooks still describe as standard",
    repl: "that most published descriptions still describe as standard" },
  { id: "wa_berdeen_peak_scramble", col: "itinerary",
    find: "despite guidebook mentions of one",
    repl: "despite published mentions of one" },

  // ---- plain attributions ----
  { id: "wa_agnes_mountain_south_ridge", col: "climbing_route",
    find: "The classic guidebook line gains",
    repl: "The classic published line gains" },
  { id: "wa_berdeen_peak_scramble", col: "climbing_route",
    find: "Guidebook spur-ridge bypass (avoids the top)",
    repl: "Published spur-ridge bypass (avoids the top)" },
  { id: "wa_berdeen_peak_scramble", col: "climbing_route",
    find: "The guidebook line contours around the summit",
    repl: "The published line contours around the summit" },
  { id: "wa_mount_carrie_se_route", col: "itinerary",
    find: "Guidebook time to the summit is 5 hr",
    repl: "The published time to the summit is 5 hr" },
  { id: "wa_mount_carrie_se_route", col: "itinerary",
    find: "(guidebook time is 5 hr from camp",
    repl: "(the published time is 5 hr from camp" },
  { id: "wa_mount_lawson_standard", col: "itinerary",
    find: "Guidebook lists June-Aug as the nominal season",
    repl: "Published descriptions list June-Aug as the nominal season" },
  { id: "wa_dome_peak_dome_glacier", col: "bivy",
    find: "since the guidebook figure from the ridge to the summit",
    repl: "since the published figure from the ridge to the summit" },
  { id: "wa_inner_constance_standard", col: "descent",
    find: "Guidebooks note this line (Route 2A) as a workable descent",
    repl: "Published descriptions note this line (Route 2A) as a workable descent" },
  { id: "wa_mount_constance_terrible_traverse", col: "overview",
    find: "guidebooks recommend carrying and placing 2-3 pickets",
    repl: "published descriptions recommend carrying and placing 2-3 pickets" },
  { id: "wa_whatcom_peak_southwest_route", col: "itinerary",
    find: "(guidebooks warn this gets tricky late season",
    repl: "(published descriptions warn this gets tricky late season" },
  { id: "wa_north_ridge_3", col: "pitch_detail",
    find: "guidebooks and trip reports agree this is the technical and psychological crux",
    repl: "published descriptions and trip reports agree this is the technical and psychological crux" },
  { id: "wa_lemah_mountain_east_route", col: "approach_variants",
    find: "called a chute in the guidebooks",
    repl: "called a chute in published descriptions" },
  { id: "wa_goode_mountain_northeast_face", col: "overview",
    find: "rather than standard guidebooks",
    repl: "rather than standard published descriptions" },
  { id: "wa_bald_eagle_peak_scramble", col: "crowds",
    find: "not a maintained trail or guidebook-standard trade route",
    repl: "not a maintained trail or a standard trade route" },

  // ---- a NAME the peak is known by, which is content rather than attribution ----
  { id: "wa_mount_la_crosse_scramble", col: "overview",
    find: "part of what local guidebooks call the " + Q + "Dosewallips Group." + Q,
    repl: "part of what is locally called the " + Q + "Dosewallips Group." + Q },
  { id: "wa_switchback_mountain_scramble", col: "overview",
    find: "commonly called Cooney Peak in guidebooks",
    repl: "commonly called Cooney Peak in published descriptions" },
  { id: "wa_mount_thomson_west_ridge", col: "overview",
    find: "spelled " + Q + "Thompson" + Q + " in most guidebooks",
    repl: "spelled " + Q + "Thompson" + Q + " in most published descriptions",
    note: "the USGS/Green Trails half of this sentence STAYS - that is the naming authority, and it is why the sentence is informative." },
  { id: "wa_neve_glacier_west_ridge", col: "overview",
    find: "since older guidebooks (Beckey) treat it as the named route",
    repl: "since older published descriptions treat it as the named route" },

  // ---- a topo in the hand ----
  { id: "wa_white_slabs", col: "approach_variants",
    find: "against a current guidebook rather than assuming",
    repl: "against a current topo rather than assuming" },
  { id: "wa_yellow_bird", col: "approach_variants",
    find: "identify it against a guidebook topo from the left end of the wall.",
    repl: "identify it against a topo from the left end of the wall." },

  // ---- a named title, beside a club that STAYS ----
  { id: "wa_chair_peak_north_face", col: "crowds",
    find: "when the route is featured in guidebooks/Selected Climbs and run as",
    repl: "when the route is a well-known objective and run as",
    note: "'Selected Climbs' is a title and goes; 'run as a Mountaineers Intermediate Ice/Alpine Climb' in the same clause STAYS - a club running a course is a fact about who climbs it." },
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
const kept = [
  ["wa_cascade_peak_east_ridge", "pitch_detail", "optimistic"],
  ["wa_three_queens_standard", "approach", "considered generous"],
  ["wa_traverse_of_mount_index", "rappels", "more rappels than"],
  ["wa_mount_thomson_west_ridge", "overview", "USGS/Green Trails"],
  ["wa_chair_peak_north_face", "crowds", "Mountaineers Intermediate"],
];
for (const [id, col, needle] of kept) {
  if (!leaves(after.get(id)[col]).join(" ").includes(needle)) {
    console.error(`KEPT CONTENT LOST: ${id}.${col} no longer says "${needle}"`); bad++;
  }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${EDITS.length} edit(s) clean; warnings, the naming authority and the club reference all intact.`);
process.exit(bad ? 1 : 0);
