// The `guidebook` family, batch 1 — and the transform that makes it sweepable at all.
//
// This family was recorded as READ, NEVER SWEEP, because a regex cannot tell an attribution
// ("per the guidebook") from a WARNING ("the guidebook is wrong"), and three attempts to
// classify it failed. That classification problem is real and still unsolved.
//
// It also turns out not to matter, because ONE TRANSFORM SERVES BOTH:
//
//     guidebook  ->  published description
//
// "the guidebook's 'Class 3' rating undersells two short sections that are genuinely Class 4-5"
// becomes "the published 'Class 3' rating undersells..." — the warning survives completely, and
// "published description" is a CATEGORY rather than a source, exactly like "trip reports". So the
// family never needed sorting; it needed a rewrite that is correct for either kind.
//
// WHAT THIS PROTECTS. A large part of this family warns the reader that the book in their pack is
// wrong — "notoriously vague", "reportedly mis-locates this route", "glacier recession has
// steepened it well beyond the older figure ... the book is old". Deleting those sentences, which
// is what a sweep on the word would do, removes the most useful thing on the page for somebody
// carrying that book. Every one of them is preserved here.
//
// NAMED PUBLICATIONS GO. "Beckey's own guidebook description", "the Snoqualmie Rock guidebook",
// "the guidebook Cascades Rock", "the Olympic Mountain Rescue guidebook" — a title is a citation
// however the sentence is framed.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const DASH = "—";
const Q = "'";
const DQ = '"';

const EDITS = [
  // ---- warnings that the published description is WRONG: the whole point is kept ----
  { id: "wa_garfield_mountain_scramble", col: "beta",
    find: "Beckey's own guidebook description is famously terse",
    repl: "the published description is famously terse",
    note: "a warning about the book, not an attribution to it. Naming Beckey is the citation." },
  { id: "wa_glacier_view_palace", col: "beta",
    find: "the Snoqualmie Rock guidebook reportedly mis-locates this route",
    repl: "published descriptions reportedly mis-locate this route" },
  { id: "wa_fortress_mountain_northeast_face", col: "watch_out",
    find: "Reported to be inaccurately described in Beckey's most recent guidebook",
    repl: "Reported to be inaccurately described in published accounts" },
  { id: "wa_mount_clark_standard", col: "beta",
    find: "guidebook descriptions are described by multiple parties as sketchy",
    repl: "published descriptions are described by multiple parties as sketchy" },
  { id: "wa_mount_index_north_peak_traverse", col: "rappels",
    find: "more rappels than guidebook descriptions suggest",
    repl: "more rappels than published descriptions suggest" },
  { id: "wa_inner_constance_northwest_buttress", col: "approach_variants",
    find: "The guidebook description for this line is thin",
    repl: "The published description for this line is thin" },
  { id: "wa_huckleberry_mountain_south_face", col: "watch_out",
    find: "may only loosely match older guidebook notes",
    repl: "may only loosely match older published notes" },
  { id: "wa_south_ridge", col: "descent",
    find: "a long-standing guidebook description sends parties to the second col",
    repl: "a long-standing published description sends parties to the second col" },
  { id: "wa_the_west_face", col: "rappel_detail",
    find: "guidebook descriptions written before the face was bolted",
    repl: "descriptions written before the face was bolted" },
  { id: "wa_project_crack", col: "pro_tips",
    find: "the bolts mentioned in older guidebook text",
    repl: "the bolts mentioned in older descriptions" },
  { id: "wa_project_crack", col: "beta",
    find: "Bolts referenced in the Snoqualmie Rock guidebook were not visible to a recent MP contributor",
    repl: "Bolts referenced in older published descriptions were not visible on a recent visit",
    note: "two publishers in one clause. The finding - the bolts are not there - is untouched." },
  { id: "wa_mount_berge_southwest_route", col: "bivy",
    find: "rather than repeating old guidebook mileage",
    repl: "rather than repeating old published mileage" },

  // ---- documented negatives: no published description exists ----
  { id: "wa_andersons_thumb_standard", col: "beta",
    find: "no dedicated guidebook route description or topo",
    repl: "no dedicated published route description or topo" },
  { id: "wa_dumbell_mountain_west", col: "beta",
    find: "no guidebook-level pitch-by-pitch or mileage description could be located",
    repl: "no detailed pitch-by-pitch or mileage description could be located" },
  { id: "wa_rimrock_ridge_scramble", col: "beta",
    find: "No guidebook or online route beta exists",
    repl: "No published or online route beta exists" },
  { id: "wa_fish_whistle", col: "descent_text",
    find: "were found in guidebook or trip-report sources.",
    repl: "were found in any published or trip-report account." },

  // ---- plain attributions ----
  { id: "wa_cathedral_peak_pasayten_se_buttress", col: "beta",
    find: "Guidebook and multiple parties recommend linking",
    repl: "Published descriptions and multiple parties recommend linking" },
  { id: "wa_cathedral_peak_pasayten_se_buttress", col: "approach_variants",
    find: "a gap the guidebook tells you to hop across",
    repl: "a gap the route description tells you to hop across" },
  { id: "wa_magic_mountain_northeast_couloir", col: "beta",
    find: "the guidebook description allows for either rock or snow",
    repl: "the published description allows for either rock or snow" },
  { id: "wa_magic_mountain_northeast_couloir", col: "best_season",
    find: "the guidebook's " + Q + "rock or snow" + Q + " becomes rock",
    repl: "the published " + Q + "rock or snow" + Q + " option becomes rock" },
  { id: "wa_magic_mountain_northeast_couloir", col: "approach_variants",
    find: "The guidebook allows for rock or snow",
    repl: "The published description allows for rock or snow" },
  { id: "wa_magic_mountain_northeast_couloir", col: "climate",
    find: "the finish becomes the guidebook's " + Q + "rock" + Q + " option",
    repl: "the finish becomes the published " + Q + "rock" + Q + " option" },
  { id: "wa_mount_berge_southwest_route", col: "beta",
    find: "guidebook description notes a descending traverse",
    repl: "the published description notes a descending traverse" },
  { id: "wa_glacier_peak_frostbite_ridge", col: "descent_text",
    find: "guidebook-style route notes describe",
    repl: "published route notes describe" },
  { id: "wa_hozomeen_mountain_southwest_buttress", col: "overview",
    find: "guidebook accounts note very few successful ascents",
    repl: "published accounts note very few successful ascents" },
  { id: "wa_jack_mountain_south_face", col: "overview",
    find: "guidebook and modern trip-report sources both note",
    repl: "published and modern trip-report accounts both note" },
  { id: "wa_mount_meany_standard", col: "beta",
    find: "guidebook accounts (Olympic Mountain Rescue / Wikipedia) rate the easiest route Class 3",
    repl: "published accounts rate the easiest route Class 3",
    note: "a DISAGREEMENT - published Class 3 against trip reports describing a 5.2 lead pitch. Both halves kept." },
  { id: "wa_big_four_mountain_dry_creek_route", col: "best_season",
    find: "Guidebook sources warn that the exposed rock is loose",
    repl: "Published descriptions warn that the exposed rock is loose" },
  { id: "wa_big_four_mountain_dry_creek_route", col: "climate",
    find: "though guidebook sources warn the exposed rock is loose",
    repl: "though published descriptions warn the exposed rock is loose" },
  { id: "wa_bye_gulley", col: "best_season",
    find: "Guidebook specifically notes this line is better/safer",
    repl: "Published descriptions specifically note this line is better/safer" },
  { id: "wa_bye_gulley", col: "pro_tips",
    find: "Guidebook/SummitPost explicitly recommend this line",
    repl: "Published descriptions explicitly recommend this line" },
  { id: "wa_bye_gulley", col: "hazards",
    find: Q + "Lots of loose rock in summer" + Q + " " + DASH + " direct guidebook/SummitPost warning for this specific gully.",
    repl: "Lots of loose rock in summer " + DASH + " a direct warning for this specific gully.",
    note: "also unquoted: with its speaker removed the quote marks cite nobody." },
  { id: "wa_bye_gulley", col: "climate",
    find: "Road open but guidebook warns of loose summer rock",
    repl: "Road open but published descriptions warn of loose summer rock" },
  { id: "wa_face_farce", col: "watch_out",
    find: "the local guidebook specifically warns belaying is more dangerous than climbing here",
    repl: "published descriptions specifically warn that belaying is more dangerous than climbing here" },
  { id: "wa_face_farce", col: "what_to_bring",
    find: "Helmet (guidebook: it is more dangerous to belay",
    repl: "Helmet (it is more dangerous to belay" },

  // ---- a named publication is a citation however the sentence is framed ----
  { id: "wa_flight_of_the_falcon", col: "beta",
    find: " (listed among the " + Q + "15 best routes in the Cascades" + Q + " in the guidebook Cascades Rock)",
    repl: " (listed among the 15 best routes in the Cascades)" },
  { id: "wa_mount_duckabush_standard", col: "beta",
    find: "treat any specific class rating as unconfirmed until checked against the Olympic Mountain Rescue guidebook " + Q + "Olympic Mountains: A Climbing Guide," + Q + " which is the definitive source for this peak but was not accessible during this research (its online mirror sits behind a login wall).",
    repl: "treat any specific class rating as unconfirmed - the definitive description for this peak was not available.",
    note: "a named title AND a research-act narration. The caveat a climber needs - the rating is unconfirmed - survives." },
  { id: "wa_mount_duckabush_standard", col: "descent_text",
    find: "which in Olympic-guidebook convention implies",
    repl: "which by Olympic grading convention implies" },
  { id: "wa_cashmere_mountain_west_ridge", col: "descent_text",
    find: "every source describing this line (guidebook-style trip summaries, Mountaineers/Mazamas scramble listings, and personal trip reports) treats it as",
    repl: "every description of this line treats it as" },
  { id: "wa_enchantment_peak_east_ridge", col: "overview",
    find: "The most-traveled, guidebook-standard line",
    repl: "The most-traveled, standard line" },
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
// The warnings are the reason this family was fenced off. Assert the sharpest ones survived
// rather than trusting that a rewrite in the same value left them alone.
const kept = [
  ["wa_fortress_mountain_northeast_face", "watch_out", "expect route-finding uncertainty"],
  ["wa_glacier_view_palace", "beta", "mis-locate this route"],
  ["wa_mount_index_north_peak_traverse", "rappels", "more rappels than"],
  ["wa_project_crack", "beta", "moss ate them"],
  ["wa_face_farce", "watch_out", "more dangerous than climbing here"],
];
for (const [id, col, needle] of kept) {
  if (!leaves(after.get(id)[col]).join(" ").includes(needle)) {
    console.error(`WARNING LOST: ${id}.${col} no longer says "${needle}"`); bad++;
  }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${EDITS.length} edit(s) clean; every "the book is wrong" warning still stands.`);
process.exit(bad ? 1 : 0);
