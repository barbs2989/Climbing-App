// The `guidebook` family, batch 4 — the last large tranche. Same transform:
//
//     guidebook  ->  published description
//
// ELEVEN RAINIER ROUTES SHARE ONE SENTENCE, and it is a live reference standing against a
// citation: "Whether it is sound in a given week is conditions-dependent and worth asking the
// CLIMBING RANGERS rather than deciding from a guidebook." The rangers half is exactly what this
// catalog keeps — an agency you can ring — and the contrast is the whole point, so only the
// guidebook half changes. Cutting the sentence would remove "ask the rangers" from eleven routes
// on the most-climbed mountain in the state.
//
// A GEAR LIST IS NOT AN ATTRIBUTION, but a TITLE inside one is. "Guidebook topo (Herrington's
// Cascades Rock or Nicholson's Washington Pass supertopo)" is an item to carry with two
// publications named inside it; the item survives as "Route topo" and the titles go. "Map and
// guidebook" becomes "Map and printed route description" — a guidebook carries approach
// information a topo does not, so it is generalised rather than swapped for "topo".
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const Q = "'";

// One sentence, eleven Rainier routes plus Ptarmigan Ridge.
const RANGERS = ["wa_liberty_cap_ptarmigan_ridge_finish", "wa_mount_rainier_curtis_ridge",
  "wa_mount_rainier_disappointment_cleaver", "wa_mount_rainier_edmunds_headwall",
  "wa_mount_rainier_fuhrer_finger", "wa_mount_rainier_fuhrer_thumb",
  "wa_mount_rainier_gibraltar_ledges", "wa_mount_rainier_kautz_glacier",
  "wa_mount_rainier_kautz_headwall", "wa_mount_rainier_nisqually_icefall",
  "wa_mount_rainier_tahoma_glacier"].map((id) => ({
    id, col: "bivy",
    find: "rather than deciding from a guidebook.",
    repl: "rather than deciding from a published description.",
  }));

// The vanished-approach sentence again, on four more routes.
const MILEAGE = ["wa_luahna_peak_east_slopes", "wa_sitkum_spire_standard",
  "wa_tenpeak_mountain_north_couloir", "wa_tenpeak_mountain_southeast"].map((id) => ({
    id, col: "bivy",
    find: "rather than repeating old guidebook mileage",
    repl: "rather than repeating old published mileage",
  }));

const EDITS = [
  ...RANGERS,
  ...MILEAGE,

  // ---- warnings that the published grade or figure is optimistic ----
  { id: "wa_accendo_lunae_lib_west_face_var", col: "pro_tips",
    find: "Treat the guidebook 5.12- crux as more like 5.11c",
    repl: "Treat the published 5.12- crux as more like 5.11c" },
  { id: "wa_sherpa_peak_west_ridge", col: "pitch_detail",
    find: "guidebook 5.4 but commonly felt as 5.6-5.7",
    repl: "published 5.4 but commonly felt as 5.6-5.7" },
  { id: "wa_mile_high_club", col: "pro_tips",
    find: "easier than the grades suggest in older guidebook editions",
    repl: "easier than the grades suggest in older published descriptions" },
  { id: "wa_wallaby_peak_standard", col: "itinerary",
    find: "slower than the 1-hour guidebook estimate",
    repl: "slower than the 1-hour published estimate" },
  { id: "wa_mount_chaval_north_ridge", col: "pro_tips",
    find: "the guidebook grade assumes clean rock",
    repl: "the published grade assumes clean rock" },
  { id: "wa_little_big_chief_mountain_northeast_face", col: "what_to_bring",
    find: "route-finding through the basin and ridge is fuzzy in guidebook descriptions",
    repl: "route-finding through the basin and ridge is fuzzy in published descriptions" },
  { id: "wa_lemah_mountain_east_route", col: "approach_variants",
    find: "A guidebook sketch puts the line just left of the summit rocks",
    repl: "A published sketch puts the line just left of the summit rocks",
    note: "the sentence goes on to say that following it leads to a difficult top and loose rock - a warning about the sketch, which survives." },

  // ---- plain attributions ----
  { id: "wa_mount_chaval_north_ridge", col: "pitch_detail",
    find: "well-fractured granitic rock per the guidebook;",
    repl: "well-fractured granitic rock per published descriptions;" },
  { id: "wa_dolphin_chimney", col: "gear",
    find: "the size the SEWS guidebook calls for on this pitch",
    repl: "the size published descriptions call for on this pitch" },
  { id: "wa_honeymoon_route", col: "seasonal_guidance",
    find: "guidebook accounts recommend climbing before July 1",
    repl: "published accounts recommend climbing before July 1" },
  { id: "wa_labor_pains", col: "obj_haz",
    find: "PG13 runouts noted by guidebook",
    repl: "PG13 runouts noted in published descriptions" },
  { id: "wa_magic_mountain_southwest_cirque", col: "pitch_detail",
    find: "Length apportioned; the guidebook gives no figure.",
    repl: "Length apportioned; no published figure exists." },
  { id: "wa_black_systems_solar", col: "pro_tips",
    find: "Rated one of the best 5.9s in Washington by the local guidebook page.",
    repl: "Widely rated one of the best 5.9s in Washington." },
  { id: "wa_dome_peak_indian_summer", col: "pro_tips",
    find: "Primary reference is Blake Herrington's " + Q + "Cascades Rock" + Q + " guidebook; expect very little other trip-report beta",
    repl: "Published beta amounts to a single route description; expect very little trip-report beta",
    note: "an author and a title. The point - there is almost nothing to go on - is what a climber needs and it survives." },

  // ---- gear lists: the item stays, the titles go ----
  { id: "wa_big_kangaroo_kearney_thomas", col: "what_to_bring",
    find: "Guidebook topo (Herrington's Cascades Rock or Nicholson's Washington Pass supertopo)",
    repl: "Route topo" },
  { id: "wa_easy_getaway", col: "what_to_bring",
    find: "Guidebook topo (Cascades Rock)",
    repl: "Route topo" },
  { id: "wa_the_perfect_crime_with_variations", col: "what_to_bring",
    find: "Guidebook topo (Blake Herrington's Cascades Rock) or downloaded route beta",
    repl: "Route topo or downloaded route beta" },
  { id: "wa_one_piece_at_a_time", col: "what_to_bring",
    find: "Guidebook topo or downloaded route beta",
    repl: "Route topo or downloaded route beta" },
  { id: "wa_dirty_sanchez", col: "what_to_bring",
    find: "Map and guidebook",
    repl: "Map and printed route description",
    note: "a guidebook carries approach information a topo does not, so this is generalised rather than swapped for 'topo'." },
  { id: "wa_ride_the_lightning_2", col: "what_to_bring",
    find: "Map and guidebook",
    repl: "Map and printed route description" },
  { id: "wa_flycatcher_buttress", col: "pro_tips",
    find: "Documented with a topo in the SuperTopo Washington Pass guidebook - bring it or a copy of the topo.",
    repl: "A published topo exists for this line - bring it or a copy." },
  { id: "wa_gato_negro", col: "pro_tips",
    find: "Bring a good topo or use the SuperTopo guidebook",
    repl: "Bring a good topo or a printed route description" },
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
// "Ask the climbing rangers" is the actionable half of the Rainier sentence and the reason it
// must not be swept. Assert it on every one of the eleven rather than trusting the edit.
let rangers = 0;
for (const e of RANGERS) {
  if (leaves(after.get(e.id).bivy).join(" ").includes("asking the climbing rangers")) rangers++;
  else { console.error(`RANGER REFERENCE LOST from ${e.id}.bivy`); bad++; }
}
console.log(`"ask the climbing rangers" still present on ${rangers} of ${RANGERS.length} routes.`);
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${EDITS.length} edit(s) re-read clean.`);
process.exit(bad ? 1 : 0);
