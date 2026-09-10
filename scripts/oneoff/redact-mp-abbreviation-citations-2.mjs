// Batch 2 of the MP-abbreviation family: the remaining 30 leaves, read one at a time.
//
// #1679 made `audit:prose-citations` able to see "MP"; #1680 repaired the three that were worse
// than citations (two analytics, one editor's note) and left the rest, on the standing rule that a
// citation is five different defects wearing one pattern and only ~4% of this backlog was ever
// mechanical. THAT RULE FORBIDS A SWEEP, NOT A REVIEWED BATCH — the hub records the ~30 genuine
// ones from earlier rounds being closed exactly this way: read each value, write its own
// replacement, declare it as an exact find->replace that refuses unless it matches once live.
//
// All 30 were dumped in FULL and read. They fall into five shapes, each with a rule already
// written down in CLAUDE.md:
//
//   ATTRIBUTION AS THE VERB (12) — the publisher is the sentence's SUBJECT ("MP states the route
//   shares...", "MP notes ~4 hours trailhead-to-base"). Re-make the clause around the fact. This
//   is why the class is not a tag-strip: there is no trailing tag to lift.
//
//   A SOURCING-ACT PREFIX (7) — "Confirmed on MP: 5.9, sport, single pitch". Dropping "Confirmed"
//   makes the record read exactly as certain as it is, which is the correct direction; the
//   opposite shape (below) must NOT lose its hedge.
//
//   DOCUMENTED NEGATIVES (6) — "Not explicit on MP; inferred standard...", "MP does not publish a
//   separate elevation figure", "no route-specific beta found beyond MP grade listing". THE
//   ADMISSION IS THE CONTENT. Deleting it makes the record read MORE certain than it is, so every
//   one keeps its hedge and loses only the publisher.
//
//   SAFETY WARNINGS CARRYING AN ATTRIBUTION (4) — the rappels running off the rope ends, a 70m
//   rope being barely long enough, bolts in bad shape. The warning is the whole content and
//   survives without the publisher. A QUOTATION CANNOT SURVIVE ITS SPEAKER: leaving the quote
//   marks behind cites nobody and turns a report into scare quotes, so the quoted phrases are
//   unquoted rather than orphaned.
//
//   ANALYTICS (3) — "MP records only a single vote", "single-digit MP ratings/photos", and two
//   trailing star ratings. #1680 established the direction on `wa_django`: keep the qualitative
//   verdict ("Lightly-trafficked line", "the route's low traffic"), cut the website's figure.
//
// ONE VALUE ALSO CARRIED PIPELINE VOICE and is fixed with it: wa_unnamed_4's "(task lists 5.10b)"
// refers to the ENRICHMENT TASK, not to anything a climber has. It becomes a plain statement that
// the grade is sometimes given as 5.10b, which is the fact underneath.
//
// Contract identical to batch 1, including the anchor assertions that the lifted needle DOES match
// MP-as-publisher and DOES NOT match a milepost — without those the post-condition is vacuous for
// exactly the class this repairs.
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

if (!NAMED.test("Confirmed on MP: 5.9, sport")) {
  console.error("ANCHOR STALE: the lifted NAMED does not match MP-as-publisher, so the post-condition"
    + " cannot see the class this batch repairs. Re-check scripts/audit-prose-citations.mjs.");
  process.exit(1);
}
if (NAMED.test("closed at MP 3.7")) {
  console.error("ANCHOR WRONG: the lifted NAMED matches a MILEPOST. Refusing rather than sweeping road prose.");
  process.exit(1);
}

const EDITS = [
  // ---- DOCUMENTED NEGATIVES: the admission is the content; keep the hedge, drop the publisher.
  { id: "wa_accidental_discharge_east_face", col: "rope_note",
    find: "Not individually confirmed on MP; inferred",
    repl: "Not individually confirmed on file; inferred",
    note: "DOCUMENTED NEGATIVE. The whole value is a hedge — the naming pattern is INFERRED from neighbouring peaks — so the admission must survive." },
  { id: "wa_ez_way", col: "sling_rack",
    find: "no route-specific beta found beyond MP grade listing",
    repl: "no route-specific beta on file beyond a grade listing",
    note: "DOCUMENTED NEGATIVE. 'Beyond a grade listing' says how thin the record is, which is the useful part." },
  { id: "wa_first_amendment", col: "rope_note",
    find: "Not explicitly stated on MP; 9-pitch",
    repl: "Rope length is not recorded on file; 9-pitch",
    note: "DOCUMENTED NEGATIVE, and naming WHAT is unstated (this is rope_note) is clearer than the original." },
  { id: "wa_liberty_traverse", col: "rope_note",
    find: "Not explicit on MP; inferred standard",
    repl: "Not recorded on file; inferred standard",
    note: "DOCUMENTED NEGATIVE + explicit inference; both survive." },
  { id: "wa_nw_face_var_remsberg_variation", col: "rope_note",
    find: "Not explicit on MP; inferred standard",
    repl: "Not recorded on file; inferred standard",
    note: "DOCUMENTED NEGATIVE + explicit inference; both survive." },
  { id: "wa_lone_wolf", col: "waypoints",
    find: ", per MP's own text) — MP does not publish a separate elevation figure for this formation.",
    repl: ") — no separate elevation figure is published for this formation.",
    note: "TWO publishers in one leaf. The closing clause is a DOCUMENTED NEGATIVE explaining why the elevation is an estimate, and it is the reason the reader should not trust the number precisely." },

  // ---- ATTRIBUTION AS THE VERB: the publisher is the subject; re-make the clause around the fact.
  { id: "wa_artic_rose", col: "rope_note",
    find: "(~85ft or less per MP area page)",
    repl: "(~85ft or less)",
    note: "the length is the fact; the page it came from is not." },
  { id: "wa_flycatcher_buttress", col: "waypoints",
    find: "MP route text explicitly names the Hairpin as the start point.",
    repl: "The Hairpin is the start point.",
    note: "the note already says NOT Blue Lake TH; this sentence says which start it IS." },
  { id: "wa_southern_man", col: "waypoints",
    find: "MP states the route shares",
    repl: "The route shares",
    note: "publisher as subject; the shared-pitches fact is the content." },
  { id: "wa_top_gun", col: "waypoints",
    find: "MP describes Top Gun as a toprope reached",
    repl: "Top Gun is a toprope reached",
    note: "publisher as subject. The point of the note is that this is the SAME base approach, not a separate trailhead." },
  { id: "wa_western_dihedral", col: "waypoints",
    find: "MP notes ~4 hours trailhead-to-base",
    repl: "~4 hours trailhead-to-base",
    note: "a time and a scramble grade; both are facts about the ground." },
  { id: "wa_sidewinder_4", col: "waypoints",
    find: "MP route page notes the approach trail is 'extremely steep and loose.'",
    repl: "the approach trail is extremely steep and loose.",
    note: "publisher as subject, and the quotation is unquoted rather than orphaned — a quote cannot survive its speaker." },
  { id: "wa_north_face_of_the_mole", col: "rope_note",
    find: "MP notes 'gear to 3 inches' and a 3-rappel descent",
    repl: "gear to 3 inches, and a 3-rappel descent",
    note: "publisher as subject plus a quotation. Lowercase because it follows a semicolon in the original." },
  { id: "wa_the_perfect_crime_with_variations", col: "fa",
    find: "MP notes variation pitches were likely climbed",
    repl: "the variation pitches were likely climbed",
    note: "an `fa` value carrying a sourcing ACT, which is the shape #1537 deliberately kept reportable. 'Likely' is the hedge and stays." },
  { id: "wa_complete_south_buttress", col: "descent_text",
    find: "expect these to need backup or replacement webbing, as MP route notes flag them as dated.",
    repl: "expect these to need backup or replacement webbing; the tat is dated.",
    note: "SAFETY-adjacent (fixed tat anchors). The instruction and the reason both survive." },
  { id: "wa_luna_glacier", col: "sling_rack",
    find: "per MP route description: 'runners and a few pieces of gear'",
    repl: "Runners and a few pieces of gear",
    note: "the whole leaf was a citation wrapper around a quotation; the rack itself is the content." },

  // ---- A SOURCING-ACT PREFIX: dropping it makes the record read exactly as certain as it is.
  { id: "wa_blood_sport", col: "rope_note",
    find: "Confirmed on MP: Guye Peak, 5.11b",
    repl: "Guye Peak, 5.11b",
    note: "'Confirmed' is a confidence marker, not a hedge — unlike the documented negatives above, dropping it does not make the record read more certain than it is." },
  { id: "wa_south_gully_south_spur", col: "rope_note",
    find: "Confirmed on MP: Guye Peak",
    repl: "Guye Peak",
    note: "sourcing-act prefix." },
  { id: "wa_south_rib", col: "rope_note",
    find: "Confirmed on MP: Guye Peak",
    repl: "Guye Peak",
    note: "sourcing-act prefix." },
  { id: "wa_unnamed_2", col: "rope_note",
    find: "Confirmed on MP: 5.9, sport",
    repl: "Recorded as 5.9, sport",
    note: "sourcing-act prefix; 'Recorded as' keeps the sentence readable without naming anybody." },
  { id: "wa_unnamed_3", col: "rope_note",
    find: "Confirmed on MP: 5.10, sport",
    repl: "Recorded as 5.10, sport",
    note: "sourcing-act prefix." },
  { id: "wa_unnamed_5", col: "rope_note",
    find: "Confirmed on MP: 5.8+, TRAD",
    repl: "Recorded as 5.8+, TRAD",
    note: "sourcing-act prefix. The 'only trad route in this otherwise-bolted cluster' warning is the useful part and is untouched." },

  // ---- ANALYTICS: keep the qualitative verdict, cut the website's figure (the #1680 direction).
  { id: "wa_alice_in_wonderland", col: "hazards",
    find: " (MP records only a single vote)",
    repl: "",
    note: "ANALYTICS. 'Lightly-trafficked line' is the verdict and survives; a vote count measures a website. The bolt/anchor warning is untouched." },
  { id: "wa_mcmillan_spire_west_southwest_ridge", col: "hazards",
    find: " (single-digit MP ratings/photos)",
    repl: "",
    note: "ANALYTICS. 'the route's low traffic' is the verdict; ratings and photo counts measure a website." },
  { id: "wa_unnamed_4", col: "rope_note",
    find: "Confirmed on MP: 5.10 (task lists 5.10b), sport, single pitch, 3-star.",
    repl: "Recorded as 5.10, sometimes given as 5.10b; sport, single pitch.",
    note: "THREE defects in one leaf: a sourcing-act prefix, PIPELINE VOICE ('task lists 5.10b' refers to the enrichment task, not to anything a climber has), and a trailing star rating, which is the same analytics class as #1680's 'MP average ~3.3 stars'." },
  { id: "wa_unnamed_6", col: "rope_note",
    find: "Confirmed on MP: 5.8, sport, single pitch, 2.5-star.",
    repl: "Recorded as 5.8, sport, single pitch.",
    note: "sourcing-act prefix plus a trailing star rating — analytics, per #1680." },

  // ---- SAFETY WARNINGS: the warning is the content and survives without the publisher.
  { id: "wa_bowling_alley_aka_regular_route", col: "descent_text",
    find: "Tie stopper knots in the rope ends — MP's route notes for this line explicitly warn that the rappels can run the ends off the rock.",
    repl: "Tie stopper knots in the rope ends — the rappels can otherwise run the ends off the rock.",
    note: "SAFETY. A rope running off its ends on rappel is the worst outcome in this dataset; the instruction and its reason both survive." },
  { id: "wa_cobbles_101", col: "descent_text",
    find: "Tie stopper knots in the rope ends — MP's route notes for this line explicitly warn climbers to knot the ends or risk running them off the rock.",
    repl: "Tie stopper knots in the rope ends — the rappels can otherwise run the ends off the rock.",
    note: "SAFETY, same formation and the same warning worded differently. Both routes end up saying the same thing, which they should." },
  { id: "wa_lady_slipper", col: "descent_text",
    find: "but MP beta specifically warns it's tight (\"barely\")",
    repl: "but that is barely enough",
    note: "SAFETY. The quoted 'barely' is unquoted rather than orphaned — a quotation cannot survive its speaker. The stopper-knot instruction and the 60m alternative are untouched." },
  { id: "wa_the_pillar_under_pale_streaks", col: "detailed_rack",
    find: "and MP notes those bolts were 'in really bad shape' as of a 2024 report.",
    repl: "and those bolts were in really bad shape as of a 2024 report.",
    note: "SAFETY — bolt condition on a fully-bolted route. 'as of a 2024 report' KEEPS the date and the second-hand nature: 'a report' is a category, which this audit deliberately does not treat as a source." },
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
    if (fires(l)) stillFires.push(`${s.id} ${s.col}: rewritten leaf STILL fires: ${l.slice(0, 200)}`);
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
