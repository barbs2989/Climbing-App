// Batch 5 of the prose-citation sweep: the "per <publisher>" family.
//
// This is the largest single shape left in `audit:prose-citations` - a fact stated in the
// route's own voice with the publisher welded on as a trailing tag ("...higher up per
// Mountain Project"). In most of them the attribution is separable and the sentence reads
// unchanged without it. Where it is NOT separable the edit is a REWRITE, and each of those
// carries a note naming which of the five recorded kinds it is.
//
// Safety contract, same as every repair script here:
//   * every edit declares the EXACT text it expects to find; nothing is invented
//   * a `find` that does not match EXACTLY ONCE across the column's string leaves is refused
//   * all-or-nothing: one refusal aborts the whole run before any write
//   * writes go through patchRow (throws unless exactly one row came back)
//   * every written value is re-read and re-checked afterwards
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

const DASH = "—"; // em dash, as the catalog writes it
const RSQUO = "'";

// { id, col, find, repl, note? }   note = why this is a rewrite rather than a deletion.
const EDITS = [
  // ---- separable trailing tag: the sentence is unchanged without the attribution ----
  { id: "wa_alta_mountain_scramble", col: "what_to_bring", find: " (per WTA guidance)", repl: "" },
  { id: "wa_burnt_boot_peak_north_route", col: "pro_tips", find: ", per Beckey's guide)", repl: ")" },
  { id: "wa_bye_gulley", col: "climate", find: ", per guidebook's winter recommendation", repl: "" },
  { id: "wa_bye_gulley", col: "watch_out", find: " per the guidebook description", repl: "" },
  { id: "wa_cashmere_mountain_northeast_ridge", col: "watch_out", find: " per Mountain Project", repl: "" },
  { id: "wa_chair_peak_northwest_ridge", col: "best_season", find: ", per Mountain Project's listed season,", repl: "," },
  { id: "wa_cheap_beer", col: "emergency", find: " per guidebook author", repl: "" },
  { id: "wa_chikamin_peak_southeast_slopes", col: "climate", find: ", per WTA trip reports", repl: "" },
  { id: "wa_czech_it_out", col: "emergency", find: " per guidebook author", repl: "" },
  { id: "wa_dolphin_chimney", col: "hazards", find: " per Mountain Project's own route description", repl: "" },
  { id: "wa_goat_mountain_south_ridge", col: "crowds", find: " per WTA reports", repl: "" },
  { id: "wa_groove_thang", col: "emergency", find: " per guidebook author", repl: "" },
  { id: "wa_heinous_thing", col: "emergency", find: " per guidebook author", repl: "" },
  { id: "wa_hozomeen_mountain_west_face", col: "watch_out", find: " per guidebook description", repl: "" },
  { id: "wa_huckleberry_mountain_west_route", col: "hazards", find: " (per SummitPost)", repl: "" },
  { id: "wa_joe_s_route", col: "pro_tips", find: " per Mountain Project", repl: "" },
  { id: "wa_liberty_traverse", col: "partner_requirements", find: ", per Mountain Project)", repl: ")" },
  { id: "wa_little_sister_north_face", col: "pro_tips", find: " per Mountain Project's route description", repl: "" },
  { id: "wa_moe", col: "emergency", find: " per guidebook author", repl: "" },
  { id: "wa_mount_angeles_standard", col: "best_season", find: ", per WTA trip reports", repl: "" },
  { id: "wa_mount_ann_scramble", col: "best_season", find: " (per WTA)", repl: "" },
  { id: "wa_mount_ann_scramble", col: "partner_requirements", find: " per WTA, plus additional", repl: ", plus additional" },
  { id: "wa_mount_appleton_standard", col: "pro_tips", find: " (per WTA trip reports)", repl: "" },
  { id: "wa_mount_appleton_standard", col: "pro_tips", find: " (per SummitPost)", repl: "" },
  { id: "wa_mount_cruiser_nw_face_corner", col: "itinerary", find: " per SummitPost", repl: "" },
  { id: "wa_mount_ferry_standard", col: "best_season", find: " per WTA/Mountaineers trip reports", repl: "" },
  { id: "wa_mount_hardy_snow_scramble", col: "best_season", find: ", per SummitPost and trip reports", repl: "" },
  { id: "wa_mount_hopper_standard", col: "best_season", find: " (per WTA and trip reports)", repl: "" },
  { id: "wa_mount_persis_west_ridge", col: "itinerary", find: " per SummitPost)", repl: ")" },
  { id: "wa_mount_pugh_stujack", col: "hazards", find: " (per WTA trip notes)", repl: "" },
  { id: "wa_mount_washington_olympic_standard", col: "itinerary", find: " per Mountaineers.org.", repl: "." },
  { id: "wa_north_star_mountain_east_route", col: "itinerary", find: " per WTA - confirm", repl: " - confirm" },
  { id: "wa_northeast_ridge_1963_route", col: "partner_requirements", find: " per Mountain Project", repl: "" },
  { id: "wa_northwest_face_2", col: "pitch_detail", find: " per Beckey's guide)", repl: ")" },
  { id: "wa_prusik_peak_der_sportsman", col: "gear", find: ", per Mountain Project's protection note for this line", repl: "" },
  { id: "wa_redtail_arete", col: "emergency", find: " per guidebook author", repl: "" },
  { id: "wa_rock_mountain_west_route", col: "crowds", find: " per WTA trip reports", repl: "" },
  { id: "wa_safety_dance", col: "emergency", find: " per guidebook author", repl: "" },
  { id: "wa_south_ridge_2", col: "hazards", find: " per Mountain Project", repl: "" },
  { id: "wa_sperry_peak_upper_south_ridge", col: "best_season", find: ", per SummitPost's route data", repl: "" },
  { id: "wa_unknown_climb_up_the_castle", col: "emergency", find: " per guidebook author", repl: "" },
  { id: "wa_e_se_face", col: "partner_requirements", find: " per Mountain Project)", repl: ")" },
  { id: "wa_hozomeen_mountain_southwest_buttress", col: "watch_out", find: " per guidebook description " + DASH, repl: " " + DASH },
  { id: "wa_liberty_bell_freedom_rider", col: "hazards", find: " per Mountain Project " + DASH, repl: " " + DASH },
  { id: "wa_mount_baker_cockscomb_ridge", col: "best_season", find: DASH + " per Mountain Project, the", repl: DASH + " the" },
  { id: "wa_mount_rainier_kautz_glacier", col: "gear", find: ", per Mountain Project's route note " + DASH + " trip", repl: " " + DASH + " trip" },
  { id: "wa_southern_man", col: "hazards", find: " per Mountain Project " + DASH, repl: " " + DASH },
  { id: "wa_southern_man", col: "partner_requirements", find: " per Mountain Project " + DASH, repl: " " + DASH },

  // ---- REWRITES: the attribution is load-bearing, so the clause is re-made ----
  {
    id: "wa_east_face_6", col: "crowds",
    find: "Per Mountain Project, this is the most-documented and commonly climbed line on the peak (more trip reports/route votes than the alternatives), but",
    repl: "This is the most commonly climbed line on the peak, but",
    note: "the METRIC is the source. Trip-report and vote counts are a publisher's traffic figures, not a fact about the rock. The qualitative claim survives on its own.",
  },
  {
    id: "wa_forbidden_peak_east_ledges", col: "descent_text",
    find: "Per the Nelson/Potterfield guidebook, " + RSQUO + "there is no easy way off Forbidden Peak" + RSQUO + " - this line",
    repl: "There is no easy way off Forbidden Peak - this line",
    note: "the attribution IS the verb. A quotation cannot stand unattributed, so it becomes the page's own sentence.",
  },
  {
    id: "wa_ingalls_peak_east_ne_ridge_route", col: "watch_out",
    find: RSQUO + "could have fatal consequences" + RSQUO + " per Mountain Project",
    repl: "could have fatal consequences",
    note: "the attribution IS the verb. Quoted phrasing becomes plain assertion.",
  },
  {
    id: "wa_liberty_cap_liberty_ridge_finish", col: "gear",
    find: ", per Mountain Project's stated rack for Liberty Ridge",
    repl: ", matching the standard Liberty Ridge rack",
    note: "the attribution IS the verb. 'A publisher's stated rack' becomes 'the standard rack', which is the fact a climber needs.",
  },
  {
    id: "wa_mount_chaval_north_ridge", col: "hazards",
    find: "Solid granitic rock per the guidebook, but frequently vegetated/mossy in practice",
    repl: "Solid granitic rock on paper, but frequently vegetated/mossy in practice",
    note: "a DISAGREEMENT between records. The contrast between the written rock quality and what parties find is the whole point, so it is kept and the publisher dropped.",
  },
  {
    id: "wa_mount_cruiser_nw_face_corner", col: "pro_tips",
    find: "only two catalogued technical lines (per Mountain Project) " + DASH,
    repl: "only two established technical lines " + DASH,
    note: "the attribution IS the verb. 'Catalogued' is a claim about a database; 'established' is a claim about the mountain.",
  },
  {
    id: "wa_mount_herman_standard_scramble", col: "crowds",
    find: "(" + RSQUO + "seldom done" + RSQUO + " per SummitPost)",
    repl: "(seldom done)",
    note: "the attribution IS the verb. Quoted phrasing becomes plain assertion.",
  },
  {
    id: "wa_northeast_face_direct", col: "seasonal_hazards",
    find: "Mountain Project's general area notes mention an early-season cornice hazard there",
    repl: "an early-season cornice hazard is noted for the area",
    note: "the attribution IS the verb. The sentence's subject was the publisher, so the clause is re-made around the hazard.",
  },
  {
    id: "wa_rapple_grapple", col: "seasonal_guidance",
    find: "the most heavily used month per Mountain Project traffic",
    repl: "the busiest month",
    note: "the METRIC is the source. Page traffic is a publisher's figure; the qualitative claim survives.",
  },
  {
    id: "wa_southwest_scramble", col: "pro_tips",
    find: "Rock " + RSQUO + "goes from almost solid to pretty awful" + RSQUO + " per SummitPost " + DASH,
    repl: "Rock goes from almost solid to pretty awful " + DASH,
    note: "the attribution IS the verb. Quoted phrasing becomes plain assertion.",
  },
  // Quotation marks whose speaker this batch removes. Leaving them would quote nobody -
  // and a bare quoted phrase reads as scare quotes, which changes what the sentence means.
  {
    id: "wa_cashmere_mountain_northeast_ridge", col: "watch_out",
    find: RSQUO + "mediocre" + RSQUO, repl: "mediocre",
    note: "the attribution IS the verb. Its publisher is dropped above, so the quotation marks now cite nobody.",
  },
  {
    id: "wa_liberty_bell_freedom_rider", col: "hazards",
    find: RSQUO + "often poor" + RSQUO, repl: "often poor",
    note: "the attribution IS the verb. Its publisher is dropped above, so the quotation marks now cite nobody.",
  },
  {
    id: "wa_e_se_face", col: "seasonal_hazards",
    find: "a WTA trip report documents avalanche debris at the pass base",
    repl: "avalanche debris has been recorded at the pass base",
    note: "the attribution IS the verb. The sentence's subject was the report, so the clause is re-made around the debris.",
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

// Accumulate per (id, col): two edits on one column must BOTH land, so each builds on the
// previous edit's result rather than on a fresh copy of the original. An earlier batch in
// this sweep lost 2 of 11 edits to exactly that bug, and only the verify re-read caught it.
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

// Print the RESULTING sentence, not just the edit. A deletion can leave a dangling
// connective or a doubled space, and neither is visible from the find/repl pair alone -
// an earlier sweep in this series stranded an "and that" clause exactly that way.
function leaves(v, out = []) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => leaves(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => leaves(x, out));
  return out;
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

if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exit(0); }

let wrote = 0;
for (const s of staged.values()) { await patchRow("routes", s.id, { [s.col]: s.value }); wrote++; }
console.log(`\nwrote ${wrote} column(s).`);

// Verify by re-reading: a 200 is not evidence the data changed.
const v = await fetch(url, { headers: headers(KEY) });
const after = new Map((await v.json()).map((x) => [x.id, x]));
let bad = 0;
for (const e of EDITS) {
  const n = countIn(after.get(e.id)[e.col], e.find);
  if (n !== 0) { console.error(`NOT APPLIED: ${e.id} ${e.col} still contains ${JSON.stringify(e.find)}`); bad++; }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} edit(s) did not land.` : `\nverified: all ${EDITS.length} edit(s) re-read clean.`);
process.exit(bad ? 1 : 0);
