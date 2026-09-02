// The four RACK columns, which #1422 brought into the citation audit for the first time.
//
// `sling_rack`, `detailed_rack`, `pro_needs` and `rope_note` had never been scanned, so nothing
// had ever asked whether a rack note names its publisher. They do, ~100 times, and the values are
// longer and more careful than the prose columns — several are explicit about the LIMITS of what
// is published:
//
//     "no exact sizes/counts are published"
//     "nobody has published what that slab actually takes in dry conditions"
//     "this is an inference from grade/terrain, not a verified rack list"
//
// Those admissions are the most useful sentences in the column and every one is preserved. A rack
// list a climber cannot rely on is a rack list they need warning about.
//
// SAME TRANSFORM AS THE GUIDEBOOK FAMILY: the publisher becomes the category. "Mountain Project's
// protection entry for Pika Slab reads 'None'" -> "The published protection entry ... reads
// 'None'". The claim, the quotation marks around the published word, and the R-rating that
// follows from it are untouched.
//
// NOT TOUCHED: wa_chimney_peak_the_chimney's what_to_bring entry "Green Trails / CalTopo map and
// compass" names a MAP THE CLIMBER CARRIES, which is a tool rather than a source — the same class
// as the topo references kept in the guidebook batches.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const Q = "'";
const DQ = '"';

const EDITS = [
  // ---- values that also state the LIMITS of what is published: admissions preserved ----
  { id: "wa_mount_pugh_pika_slab", col: "detailed_rack",
    find: "Mountain Project's protection entry for Pika Slab reads " + DQ + "None" + DQ,
    repl: "The published protection entry for Pika Slab reads " + DQ + "None" + DQ,
    note: "the R rating follows from this entry, so the claim has to survive intact - only the publisher goes." },
  { id: "wa_amphitheater_mountain_middle_finger_buttress_right_side", col: "detailed_rack",
    find: "Mountain Project's only protection note for this Grade III, 5.9, 7-pitch route",
    repl: "The only published protection note for this Grade III, 5.9, 7-pitch route",
    note: "the sentence goes on to say no exact sizes are published. That admission is the point." },
  { id: "wa_andersons_thumb_standard", col: "detailed_rack",
    find: "No trip-report or guidebook source could be found describing this specific route's gear.",
    repl: "No trip report or published description could be found describing this specific route's gear.",
    note: "a DOCUMENTED NEGATIVE, and the value ends 'this is an inference from grade/terrain, not a verified rack list'." },
  { id: "wa_davis_peak_nc_south_slope_and_ridge", col: "detailed_rack",
    find: "SummitPost's winter party carried no rock protection",
    repl: "One winter party carried no rock protection" },
  { id: "wa_davis_peak_nc_south_slope_and_ridge", col: "detailed_rack",
    find: "the SummitPost author explicitly asks for that information",
    repl: "the author of that account explicitly asks for that information",
    note: "'nobody has published what that slab actually takes' is the useful half and stays." },

  // ---- the attribution IS the verb ----
  { id: "wa_amphitheater_mountain_north_buttress", col: "detailed_rack",
    find: "Mountain Project's rack note is simply a " + Q + "wide range of nuts and cams" + Q,
    repl: "The published rack note is simply a " + Q + "wide range of nuts and cams" + Q },
  { id: "wa_amphitheater_mountain_north_ridge", col: "detailed_rack",
    find: "Mountain Project describes the rack simply as",
    repl: "Published descriptions give the rack simply as" },
  { id: "wa_ingalls_peak_east_ne_ridge_route", col: "detailed_rack",
    find: "Mountain Project notes the crux pitch offers almost no protection",
    repl: "published notes say the crux pitch offers almost no protection" },
  { id: "wa_cathedral_rock_northeast_ridge_2003_variation", col: "detailed_rack",
    find: "Mountain Project specifies medium rock protection up to 4+ inches",
    repl: "Published descriptions specify medium rock protection up to 4+ inches" },
  { id: "wa_baring_mountain_south_route", col: "rope_note",
    find: "Mountain Project lists protection as " + Q + "None" + Q,
    repl: "published descriptions list protection as " + Q + "None" + Q },
  { id: "wa_lundin_peak_west_ridge", col: "detailed_rack",
    find: "Mountain Project lists helmet as optional",
    repl: "published descriptions list helmet as optional" },
  { id: "wa_e_se_face", col: "rope_note",
    find: "Mountain Project lists Witches Tower's east-facing route",
    repl: "Published descriptions list Witches Tower's east-facing route" },
  { id: "wa_mount_fury_east_north_buttress", col: "detailed_rack",
    find: "Mountain Project's short version is " + Q + "trad rack, picket or two" + Q,
    repl: "The published short version is " + Q + "trad rack, picket or two" + Q },
  { id: "wa_mount_berge_east_ridge", col: "detailed_rack",
    find: "SummitPost specifically calls for a " + Q + "rock rack to 2 in." + Q,
    repl: "published descriptions specifically call for a " + Q + "rock rack to 2 in." + Q },
  { id: "wa_northwest_arete", col: "detailed_rack",
    find: "Beckey's guide lists the route as 6-8 pitches",
    repl: "Published descriptions list the route as 6-8 pitches" },
  { id: "wa_hagan_mountain_south", col: "rope_note",
    find: "SummitPost: " + Q + "standard glacier gear and a small rock climbing rack" + Q + " for the final",
    repl: "Published beta calls for standard glacier gear and a small rock climbing rack for the final" },

  // ---- separable tag ----
  { id: "wa_the_brothers_traverse", col: "detailed_rack",
    find: "A light alpine rock rack plus snow pickets, per Mountain Project.",
    repl: "A light alpine rock rack plus snow pickets." },
  { id: "wa_der_dihedral", col: "detailed_rack",
    find: "Standard rack to 3 inches (per Mountain Project);",
    repl: "Standard rack to 3 inches;" },
  { id: "wa_mount_terror_stoddard_buttress", col: "detailed_rack",
    find: "per Mountain Project beta, some parties have also carried a machete",
    repl: "per published beta, some parties have also carried a machete" },
  { id: "wa_mcmillan_spire_west_southwest_ridge", col: "detailed_rack",
    find: "Matches the Mountain Project route page.",
    repl: "Matches the published route description." },
  { id: "wa_liberty_bell_independence_route", col: "gear",
    find: "this is the rack Mountain Project's route page gives for the full route",
    repl: "this is the published rack for the full route" },
  { id: "wa_north_ridge_7", col: "detailed_rack",
    find: "(Mountain Project calls it 4th class, ~50-60ft; other sources describe it as up to 5.5)",
    repl: "(published descriptions call it 4th class, ~50-60ft; others describe it as up to 5.5)" },
  { id: "wa_hoodoo_peak_sawtooth_scramble", col: "rope_note",
    find: "per SummitPost/trip reports",
    repl: "per trip reports" },

  // ---- "confirmed on <publisher>" is the research act as much as a citation ----
  { id: "wa_south_ridge", col: "rope_note",
    find: "Confirmed on Mountain Project: Gunsight Range South Peak",
    repl: "Confirmed: Gunsight Range South Peak" },
  { id: "wa_mcmillan_spire_west_southwest_ridge", col: "rope_note",
    find: "Confirmed on Mountain Project: West McMillan Spire",
    repl: "Confirmed: West McMillan Spire" },
  { id: "wa_cordwood", col: "rope_note",
    find: "; confirmed as Sport on Mountain Project's official area page.",
    repl: ".",
    note: "the value already opens \"Single-pitch bolted sport route\", so a replacement clause restated it. The preview is what showed the redundancy." },

  // ---- a list of the sites somebody searched ----
  { id: "wa_arrowhead_mountain_south_route", col: "detailed_rack",
    find: "Every trip report reviewed (Mountaineers, WTA, SummitPost, CascadeClimbers, Wenatchee Outdoors) describes it as unroped",
    repl: "Every trip report reviewed describes it as unroped" },
  { id: "wa_big_craggy_peak_scramble", col: "rope_note",
    find: "No rope used in trip reports (Mountaineers, WTA, trailcatjim.com).",
    repl: "No rope used in trip reports." },

  // ---- two published descriptions agreeing is worth keeping AS agreement ----
  { id: "wa_american_border_peak_southeast_face", col: "detailed_rack",
    find: "the SummitPost route page for this exact line and The Mountaineers' route description both independently describe the gear as",
    repl: "two independent published descriptions both give the gear as",
    note: "that they agree INDEPENDENTLY is the reason to trust the rack, so the agreement is kept and only the names go." },
  { id: "wa_american_border_peak_southeast_face", col: "rope_note",
    find: "The SummitPost route page for this exact line (" + Q + "South Ridge 5.4" + Q + ") describes the standard descent",
    repl: "The published route description for this line (" + Q + "South Ridge 5.4" + Q + ") gives the standard descent" },
  { id: "wa_american_border_peak_southeast_face", col: "rope_note",
    find: "A Mountaineers trip report on the same route mentions",
    repl: "One trip report on the same route mentions",
    note: "the value goes on to read that report as one party choosing redundancy rather than as evidence the route needs double ropes. That reading survives." },
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
// The admissions about what is NOT published are the most useful lines in these columns.
const kept = [
  ["wa_amphitheater_mountain_middle_finger_buttress_right_side", "detailed_rack", "no exact sizes/counts are published"],
  ["wa_andersons_thumb_standard", "detailed_rack", "not a verified rack list"],
  ["wa_davis_peak_nc_south_slope_and_ridge", "detailed_rack", "nobody has published what that slab actually takes"],
  ["wa_mount_pugh_pika_slab", "detailed_rack", "R rating precisely because nothing goes in"],
  ["wa_american_border_peak_southeast_face", "rope_note", "not a requirement"],
];
for (const [id, col, needle] of kept) {
  if (!leaves(after.get(id)[col]).join(" ").includes(needle)) {
    console.error(`ADMISSION LOST: ${id}.${col} no longer says "${needle}"`); bad++;
  }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${EDITS.length} edit(s) clean; every "what is not published" admission still stands.`);
process.exit(bad ? 1 : 0);
