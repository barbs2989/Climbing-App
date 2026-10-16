// The `guidebook` family, batch 2. Same transform as batch 1:  guidebook -> published description.
//
// A category, not a source — so it is correct whether the sentence ATTRIBUTES to the book
// ("guidebook accounts note it is not possible to give a precise pitch count") or WARNS about it
// ("the guidebook's 'Class 3' rating undersells two short sections that are genuinely Class 4-5").
// The family never needed classifying; both halves want the same edit.
//
// TWO SHAPES THIS BATCH ADDS.
//
//   * A TOPO THE CLIMBER IS CARRYING. "confirm it on the ground against a guidebook topo",
//     "identify it against a guidebook on the ledge rather than by guessing from the crack
//     width". These instruct a climber to consult the topo IN THEIR HAND, which is a tool rather
//     than a source — the same class as the Green Trails/CalTopo map in a what_to_bring list. The
//     word "guidebook" adds nothing there, so it simply becomes "a topo" and the instruction is
//     untouched.
//
//   * A NAMED AUTHOR. "Jeff Smoot's Climbing Washington's Mountains guidebook", "Beckey's
//     original guidebook line" — an author and a title are a citation however the sentence is
//     framed, so both go while the advice (climb before July 1; the original line tops out via a
//     notch west of the summit block) stays.
//
// THE ANDERSON CLUSTER IS THE REASON THIS FAMILY WAS FENCED OFF. Four values say glacier
// recession has steepened the Flypaper Pass finger to 40-45 degrees, "well beyond older guidebook
// descriptions ... the book is old". A sweep on the word deletes the warning that the book in the
// climber's pack says 30. All four are preserved and asserted after the write.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const DASH = "—";
const Q = "'";

const EDITS = [
  // ---- the Anderson cluster: the book is out of date and says so ----
  { id: "wa_mount_anderson_eel_glacier", col: "approach",
    find: "steepened this finger considerably beyond older guidebook descriptions",
    repl: "steepened this finger considerably beyond older published descriptions",
    note: "the warning is that the book says 30 degrees and the ground is 40-45. It survives whole." },
  { id: "wa_mount_anderson_eel_glacier", col: "climbing_route",
    find: "steepened it considerably beyond older guidebook descriptions",
    repl: "steepened it considerably beyond older published descriptions" },
  { id: "wa_mount_anderson_eel_glacier", col: "hazards",
    find: "well beyond older guidebook descriptions",
    repl: "well beyond older published descriptions" },
  { id: "wa_mount_anderson_eel_glacier", col: "approach_variants",
    find: "well beyond the older guidebook figure of about 30 degrees",
    repl: "well beyond the older published figure of about 30 degrees" },
  { id: "wa_mount_anderson_eel_glacier", col: "approach_variants",
    find: "has not gone the wrong way " + DASH + " the book is old.",
    repl: "has not gone the wrong way " + DASH + " those descriptions are old.",
    note: "'the book' was the antecedent of the clause just cut; leaving it would strand the reference." },

  // ---- warnings that the published description is wrong or thin ----
  { id: "wa_mount_degenhardt_southwest_route", col: "watch_out",
    find: "Guidebook route description is notoriously vague",
    repl: "The published route description is notoriously vague" },
  { id: "wa_mount_degenhardt_southwest_route", col: "pro_tips",
    find: "the guidebook line is vague",
    repl: "the published line is vague" },
  { id: "wa_spire_mountain_scramble", col: "watch_out",
    find: "The guidebook's " + Q + "Class 3" + Q + " rating undersells",
    repl: "The published " + Q + "Class 3" + Q + " rating undersells" },
  { id: "wa_mount_crowder_northeast_ridge", col: "what_to_bring",
    find: "since guidebook descriptions of this line have been reported as inaccurate",
    repl: "since published descriptions of this line have been reported as inaccurate" },
  { id: "wa_three_fingers_r1", col: "beta",
    find: "easier than some guidebook descriptions suggest",
    repl: "easier than some published descriptions suggest" },
  { id: "wa_hurry_up_peak_south_ridge", col: "approach_variants",
    find: "not all of them match the guidebook.",
    repl: "not all of them match the published description." },
  { id: "wa_hurry_up_peak_south_ridge", col: "climbing_route",
    find: "not all matching guidebook description exactly",
    repl: "not all matching the published description exactly" },
  { id: "wa_mount_maude_r2", col: "approach_variants",
    find: "harder than the old guidebook photograph suggests",
    repl: "harder than the old published photograph suggests" },
  { id: "wa_mount_maude_r2", col: "pro_tips",
    find: "rather than older guidebook pitch counts",
    repl: "rather than older published pitch counts" },
  { id: "wa_luahna_peak_southwest_slope_southeast_ridge", col: "approach_variants",
    find: "A NOTE ON WHAT THE GUIDEBOOK SAYS VERSUS WHAT PARTIES FIND:",
    repl: "A NOTE ON WHAT IS PUBLISHED VERSUS WHAT PARTIES FIND:" },
  { id: "wa_east_face_6", col: "approach_variants",
    find: "rather than the two hundred a guidebook suggests",
    repl: "rather than the two hundred a published description suggests" },
  { id: "wa_the_fin_northeast_face", col: "watch_out",
    find: "the guidebook specifically flags this pitch as good quality",
    repl: "published descriptions specifically flag this pitch as good quality" },

  // ---- the Cascade Peak cluster: a pitch found two grades harder than published ----
  { id: "wa_cascade_peak_nw_chimney", col: "approach_variants",
    find: "nearer 5.10 than the guidebook's 5.8",
    repl: "nearer 5.10 than the published 5.8" },
  { id: "wa_cascade_peak_nw_chimney", col: "approach_variants",
    find: "two grades harder than its guidebook rating",
    repl: "two grades harder than its published rating" },
  { id: "wa_cascade_peak_nw_chimney", col: "approach_variants",
    find: "beyond the guidebook entry and that single 2013 trip report",
    repl: "beyond the published entry and that single 2013 trip report" },
  { id: "wa_cascade_peak_nw_chimney", col: "pitch_detail",
    find: "5.8 guidebook / felt closer to 5.10",
    repl: "5.8 published / felt closer to 5.10" },
  { id: "wa_cascade_peak_nw_chimney", col: "pro_tips",
    find: "Expect the guidebook 5.8 grade to feel harder",
    repl: "Expect the published 5.8 grade to feel harder" },

  // ---- plain attributions ----
  { id: "wa_sherpa_balanced_rock_north_ridge", col: "beta",
    find: "Guidebook accounts note it's not possible",
    repl: "Published accounts note it's not possible" },
  { id: "wa_the_horn_scramble", col: "overview",
    find: "guidebook and route sources agree it is a genuine roped 5th-class trad route",
    repl: "published accounts agree it is a genuine roped 5th-class trad route" },
  { id: "wa_needle_peak_south_route", col: "overview",
    find: "independent trip reports rather than a guidebook.",
    repl: "independent trip reports rather than any published description." },
  { id: "wa_clark_mountain_west_ridge", col: "approach",
    find: "locate what guidebook notes call",
    repl: "locate what published notes call" },
  { id: "wa_clark_mountain_west_ridge", col: "climbing_route",
    find: "locate what guidebook notes call",
    repl: "locate what published notes call" },
  { id: "wa_clark_mountain_west_ridge", col: "approach_variants",
    find: "Guidebook language calls it the one and only easy gully",
    repl: "Published descriptions call it the one and only easy gully" },
  { id: "wa_clark_mountain_west_ridge", col: "bivy",
    find: "rather than repeating old guidebook mileage",
    repl: "rather than repeating old published mileage" },
  { id: "wa_luahna_peak_southwest_slope_southeast_ridge", col: "bivy",
    find: "rather than repeating old guidebook mileage",
    repl: "rather than repeating old published mileage" },
  { id: "wa_mount_skokomish_standard", col: "approach_variants",
    find: "Guidebook and trip-report sources are consistent that",
    repl: "Published and trip-report accounts are consistent that" },
  { id: "wa_mount_skokomish_standard", col: "approach_variants",
    find: "Guidebook and trip-report sources put the standard route on the Putvin side.",
    repl: "Published and trip-report accounts put the standard route on the Putvin side." },
  { id: "wa_mount_washington_olympic_standard", col: "approach_variants",
    find: "the guidebook-level advice on the crux gendarme downclimb",
    repl: "the published advice on the crux gendarme downclimb" },
  { id: "wa_mount_goode_northeast_buttress", col: "approach_variants",
    find: "and one quotes the guidebook doing so.",
    repl: "and one quotes a published description doing so." },
  { id: "wa_the_fin_northeast_face", col: "best_season",
    find: "Guidebook beta notes that snow lingering",
    repl: "Published beta notes that snow lingering" },

  // ---- a topo in the climber's hand is a TOOL, not a source ----
  { id: "wa_century", col: "approach_variants",
    find: "confirm it on the ground against a guidebook topo",
    repl: "confirm it on the ground against a topo",
    note: "instructs a climber to check the topo they are carrying. The word 'guidebook' adds nothing; the instruction is untouched." },
  { id: "wa_dagoba_system", col: "approach_variants",
    find: "confirm against a guidebook topo.",
    repl: "confirm against a topo." },
  { id: "wa_old_gray_mare", col: "approach_variants",
    find: "place it against a guidebook topo from the Saber roof.",
    repl: "place it against a topo from the Saber roof." },
  { id: "wa_sometimes_a_great_notion", col: "approach_variants",
    find: "place it against a guidebook topo from the left end.",
    repl: "place it against a topo from the left end." },
  { id: "wa_crack_of_doom", col: "approach_variants",
    find: "identify it against a guidebook on the ledge",
    repl: "identify it against a topo on the ledge" },

  // ---- a named author or title is a citation however the sentence is framed ----
  { id: "wa_scarface_3", col: "beta",
    find: "P1-2 (per Cascades Rock guidebook): relatively clean",
    repl: "P1-2: relatively clean" },
  { id: "wa_jack_mountain_south_face", col: "pro_tips",
    find: "Beckey's original guidebook line tops out",
    repl: "The original published line tops out" },
  { id: "wa_mount_deception_standard", col: "best_season",
    find: "Jeff Smoot's Climbing Washington's Mountains guidebook specifically recommends climbing before July 1 to avoid what it calls " + Q + "nightmarishly loose rock" + Q + " later in the season.",
    repl: "Published advice specifically recommends climbing before July 1 to avoid nightmarishly loose rock later in the season.",
    note: "an author, a title and a quotation. The advice - go before July 1, the rock rots - is the whole point and survives." },
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
// The warnings are why this family was fenced off. Assert the sharpest survived the write.
const kept = [
  ["wa_mount_anderson_eel_glacier", "hazards", "40-45"],
  ["wa_mount_anderson_eel_glacier", "approach_variants", "those descriptions are old"],
  ["wa_spire_mountain_scramble", "watch_out", "genuinely Class 4-5"],
  ["wa_mount_degenhardt_southwest_route", "watch_out", "notoriously vague"],
  ["wa_cascade_peak_nw_chimney", "pro_tips", "closer to 5.10"],
  ["wa_mount_deception_standard", "best_season", "before July 1"],
];
for (const [id, col, needle] of kept) {
  if (!leaves(after.get(id)[col]).join(" ").includes(needle)) {
    console.error(`WARNING LOST: ${id}.${col} no longer says "${needle}"`); bad++;
  }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${EDITS.length} edit(s) clean; every "the book is wrong" warning still stands.`);
process.exit(bad ? 1 : 0);
