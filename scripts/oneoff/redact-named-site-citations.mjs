// The 56 values that name a WEBSITE OR FORUM, made visible by #1494 widening the audit's
// deny-list. CascadeClimbers, NWHikers, TrailCatJim, SuperTopo, SpokAlpine, SkiSickness,
// stephabegg.com, onehikeaweek.com, thepeakoftheweek.com — none of them was in `NAMED`, so none
// had ever been reported.
//
// The transform is the one this sweep has used throughout: REPLACE THE PUBLISHER WITH THE
// CATEGORY. "a 2005 CascadeClimbers trip report describes" becomes "a 2005 trip report describes"
// — the reader learns the same thing and the sentence no longer cites anybody.
//
// FIVE VALUES ARE NOT TOUCHED, AND THEY ARE THE REASON THIS COULD NOT BE A SWEEP. **Steph Abegg
// is a FIRST ASCENSIONIST in this catalog as well as a cited trip-report author.**
//
//     wa_energizer_bunny.fa                 "Jon Pobst and Steph Abegg, June 14, 2015"
//     wa_energizer_bunny.overview           "a probable first ascent by Jon Pobst and Steph Abegg"
//     wa_east_twin_needle_thread_of_ice.fa  "Steph Abegg and Wayne Wallace, June 27, 2009"
//     wa_east_twin_needle_thread_of_ice.beta "established as a first ascent by Steph Abegg and..."
//     wa_little_sister_south_couloir.fa     a suspected first WINTER ascent by a named party
//
// Those are people credited with a climb, which is content — the same call #1462 made for
// "called the best climb I've ever done in the North Cascades BY ONE OF ITS FIRST ASCENSIONISTS".
// A pattern-driven sweep on the name would have deleted four first-ascent credits. They are
// ASSERTED after the write rather than merely skipped.
//
// A PARTY'S OWN PRACTICE IS KEPT; ONLY WHOSE PARTY IT WAS GOES. "Steph Abegg's party made 7
// double-rope rappels" becomes "one party made 7 double-rope rappels" — the count is the beta and
// the name is not. Same for rope choices, timings and conditions.
//
// A QUOTATION CANNOT SURVIVE ITS SPEAKER: where the publisher spoke, the quote marks come off
// with the name and the sentence becomes the page's own. Leaving them cites nobody and turns a
// report into scare quotes.
//
// HEDGES, NEGATIVES AND SAFETY CONTENT ALL SURVIVE, and several are asserted below: "not a
// generic guess", "flagged as inferred rather than directly confirmed", "four people injured on
// this route", "became cliffed out", "status as true FA unconfirmed".
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const Q = "'";
const CQ = "’";     // curly apostrophe
const LQ = "“";     // curly open quote
const RQ = "”";     // curly close quote
const DASH = "—";

const EDITS = [
  // ---- forums and sites named as the evidence ----
  { id: "wa_cathedral_peak_pasayten_se_buttress", col: "crowds",
    find: "on forums (CascadeClimbers, StephAbegg, spokalpine)", repl: "on climbing forums" },
  { id: "wa_south_spur", col: "crowds",
    find: "A documented 4-day trip (trailcatjim.com) encountered", repl: "A documented 4-day trip encountered" },
  { id: "wa_south_ridge_3", col: "detailed_rack",
    find: "including solo ascents (nwhikers.net, 7/8/2017)", repl: "including a solo ascent reported in July 2017" },
  { id: "wa_bear_mountain_chilliwack_north_buttress", col: "crowds",
    find: "multiple trip-report/forum sources (CascadeClimbers, SkiSickness, SpokAlpine) describe",
    repl: "multiple trip reports and forum accounts describe" },
  { id: "wa_bear_mountain_chilliwack_north_buttress", col: "detailed_rack",
    find: "a route-focused trip report/gear list (stephabegg.com), not a generic guess",
    repl: "a route-focused trip report and gear list, not a generic guess",
    note: "the hedge 'not a generic guess' is the point of the sentence and stays" },
  { id: "wa_mount_baker_coleman_headwall", col: "watch_out",
    find: "Monitor cascadeclimbers.com for current conditions", repl: "Check recent trip reports for current conditions" },
  { id: "wa_chiwawa_mountain_southwest", col: "pro_tips",
    find: "a 2005 CascadeClimbers trip report describes", repl: "a 2005 trip report describes" },
  { id: "wa_foggy_peak_scramble", col: "crowds",
    find: "was located (Jim Brisbine" + Q + "s, via trailcatjim.com), versus", repl: "was located, versus" },
  { id: "wa_mushroom_tower_standard", col: "crowds",
    find: "(e.g. one CascadeClimbers TR from 2010)", repl: "(one trip report from 2010)" },
  { id: "wa_mount_fury_east_mongo_ridge", col: "crowds",
    find: "available trip reports (e.g. AAC Publications, CascadeClimbers.com) suggest", repl: "the available trip reports suggest" },
  { id: "wa_dumbell_mountain_west", col: "pro_tips",
    find: "(see the 2008 CascadeClimbers TR " + Q + "Two Dumbells on Dumbell" + Q + ")", repl: "(reported in a 2008 trip report)" },
  { id: "wa_north_ridge_2", col: "seasonal_hazards",
    find: "reported in places (CascadeClimbers trip reports)", repl: "reported in places in trip reports" },
  { id: "wa_ephemeral", col: "watch_out",
    find: "check NWAC/CascadeClimbers reports before approach", repl: "check NWAC and recent trip reports before approach",
    note: "NWAC is an AGENCY forecast and stays - the same rule that keeps ranger contacts" },
  { id: "wa_the_triad_east_peak", col: "partner_requirements",
    find: "documented trip reports (Jeff Hebert" + Q + "s TR and a CascadeClimbers.com TR) both climb it",
    repl: "two documented trip reports both climb it" },
  { id: "wa_lichtenberg_mountain_west_face", col: "pro_tips",
    find: "Read the original 2002 CascadeClimbers thread before you go " + DASH + " it is the only real beta that exists for this line",
    repl: "The only real beta for this line is a single 2002 forum thread",
    note: "a DOCUMENTED NEGATIVE - that almost nothing exists - and it stays" },
  { id: "wa_jack_mountain_north_ridge", col: "approach",
    find: "read the 2006 CascadeClimbers report before committing", repl: "read the 2006 trip report before committing" },
  { id: "wa_jack_mountain_north_ridge", col: "pro_tips",
    find: "Read the 2006 CascadeClimbers trip report", repl: "Read the 2006 trip report" },
  { id: "wa_jack_mountain_northeast_glacier", col: "descent_text",
    find: "(a 2006 CascadeClimbers trip ascended the North Ridge and descended the East Ridge)",
    repl: "(a 2006 party ascended the North Ridge and descended the East Ridge)" },
  { id: "wa_jack_mountain_east_ridge", col: "pro_tips",
    find: "Read both CascadeClimbers trip reports (2006, up the North Ridge and down this ridge; and July 2025)",
    repl: "Read both published trip reports (2006, up the North Ridge and down this ridge; and July 2025)" },
  { id: "wa_mount_persis_the_hexorcist", col: "pro_tips",
    find: "contact the North Cascades new-routing/local climbing community (e.g., the Cascade Climbers forum) for",
    repl: "contact the North Cascades new-routing and local climbing community for" },
  { id: "wa_amphitheater_mountain_finger_of_fatwa", col: "rope_note",
    find: "(the one CascadeClimbers.com TR that logs a Finger of Fatwa ascent returned a 403 and could not be read)",
    repl: "(the one trip report that logs a Finger of Fatwa ascent could not be read)",
    note: "'flagged as inferred rather than directly confirmed' later in the same value is the hedge and stays" },
  { id: "wa_abernathy_peak_north_ridge", col: "detailed_rack",
    find: "Cross-referenced trip reports (Country Highpoints, NWHikers forum, Steven" + Q + "s Peak-bagging Journey, hike2hike) consistently describe",
    repl: "Cross-referenced trip reports consistently describe" },

  // ---- topo publishers ----
  { id: "wa_liberty_traverse", col: "pitch_detail",
    find: "consult SuperTopo/Cascade Climbers for pitch-by-pitch", repl: "consult a published topo for pitch-by-pitch", all: true,
    note: "appears on TWO pitch entries in one column" },
  { id: "wa_flycatcher_buttress", col: "gear",
    find: " (per SuperTopo)", repl: "" },
  { id: "wa_flycatcher_buttress", col: "detailed_rack",
    find: "SuperTopo suggests an optional #5", repl: "Published beta suggests an optional #5" },
  { id: "wa_complete_south_buttress", col: "itinerary",
    find: "(Supertopo shows up to 22 pitches)", repl: "(published topos show up to 22 pitches)" },
  { id: "wa_big_kangaroo_kearney_thomas", col: "pro_tips",
    find: "Consult Herrington" + Q + "s " + Q + "Cascades Rock" + Q + " or Nicholson" + Q + "s Washington Pass supertopo for the published topo before attempting the route.",
    repl: "Consult a published topo before attempting the route." },
  { id: "wa_oval_peak_scramble", col: "pitch_detail",
    find: "~1,295 ft per a Cascade Climbers/Lemke Climbs trip report; Southwest Ridge scramble from the basin lake to the summit ~1,850 ft per Best Hikes BC)",
    repl: "~1,295 ft per one trip report; Southwest Ridge scramble from the basin lake to the summit ~1,850 ft per another)" },

  // ---- a party's practice: keep the practice, drop whose party ----
  { id: "wa_north_ridge_3", col: "rope_note",
    find: "Verified via SpokAlpine: " + Q + "60m rope minimum." + Q, repl: "A trip report gives a 60 m rope as the minimum.",
    note: "a quotation cannot survive its speaker; unquoted it becomes the page's own sentence" },
  { id: "wa_complete_south_buttress", col: "rope_note",
    find: "Verified via SpokAlpine trip report: 70m 9.2mm rope.", repl: "A trip report records a 70 m 9.2 mm rope." },
  { id: "wa_dragontail_peak_backbone_ridge", col: "emergency",
    find: "A spokalpine trip report notes the author personally knows four people injured on this route",
    repl: "One trip report notes the author personally knows four people injured on this route",
    note: "an INJURY record in an EMERGENCY field - the fact is untouched" },
  { id: "wa_southern_man", col: "gear",
    find: "a route-specific trip report (StephAbegg) describes Southern Man as taking " + Q + "a lot of wide gear," + Q,
    repl: "a route-specific trip report describes Southern Man as taking a lot of wide gear," },
  { id: "wa_soviet_route", col: "rope_note",
    find: "Modern ascent (Steph Abegg party) used", repl: "One modern ascent used" },
  { id: "wa_the_scoop_2", col: "rappel_count_note",
    find: "Steph Abegg" + CQ + "s party did exactly that", repl: "one party did exactly that" },
  { id: "wa_little_sister_south_couloir", col: "rappels",
    find: "Steph Abegg" + Q + "s party made a double-60 m rappel", repl: "One party made a double-60 m rappel" },
  { id: "wa_little_sister_south_couloir", col: "pitch_detail",
    find: "Steph Abegg" + Q + "s winter party climbed this ground unroped", repl: "A winter party climbed this ground unroped" },
  { id: "wa_little_sister_south_couloir", col: "climate",
    find: "Steph Abegg" + Q + "s party did it on 31 January 2015", repl: "One party did it on 31 January 2015" },
  { id: "wa_south_face_5", col: "itinerary",
    find: "Steph Abegg" + Q + "s party clocked this at about 6.5 hours", repl: "One party clocked this at about 6.5 hours" },
  { id: "wa_south_face_5", col: "itinerary",
    find: "Steph Abegg" + Q + "s party made 7 double-rope rappels total", repl: "one party made 7 double-rope rappels total" },
  { id: "wa_south_face_5", col: "crowds",
    find: "(CascadeClimbers trip reports dated 8/10/2005, 9/2/2018, 7/14/2024)",
    repl: "(trip reports dated 8/10/2005, 9/2/2018, 7/14/2024)" },
  { id: "wa_nw_ridge_2", col: "pro_tips",
    find: "Steph Abegg" + Q + "s party took about 12 hours car to car", repl: "One party took about 12 hours car to car" },
  { id: "wa_nw_ridge_2", col: "rope_note",
    find: "a Steph Abegg trip report describes a single 25m rappel", repl: "a trip report describes a single 25m rappel" },
  { id: "wa_ottohorn_west_ridge", col: "pro_tips",
    find: "Steph Abegg" + Q + "s party reached the Ottohorn-Himmelhorn col", repl: "One party reached the Ottohorn-Himmelhorn col" },
  { id: "wa_johannesburg_mountain_northeast_buttress", col: "itinerary",
    find: "Matches Spokalpine" + Q + "s NE Rib push timing on the same flank.", repl: "Matches a documented NE Rib push timing on the same flank." },
  { id: "wa_berdeen_peak_scramble", col: "detailed_rack",
    find: "The only detailed trip report of an actual Berdeen Peak ascent (Steph Abegg" + Q + "s Mystery Ridge Enchainment, approaching via Porkbelly Ridge and the east side/NW slopes) describes",
    repl: "The only detailed trip report of an actual Berdeen Peak ascent (a Mystery Ridge enchainment approaching via Porkbelly Ridge and the east side/NW slopes) describes" },
  { id: "wa_little_big_chief_mountain_northeast_face", col: "descent_text",
    find: "a first-hand account of this east-side face (Brisbine, trailcatjim.com) descended",
    repl: "a first-hand account of this east-side face descended",
    note: "the party CLIFFED OUT - the warning is the whole point and is untouched" },
  { id: "wa_burgundy_spire_north_face", col: "rope_note",
    find: "(~40/55/55/40/60m per thepeakoftheweek.com" + Q + "s firsthand account). StephAbegg" + Q + "s trip report confirms",
    repl: "(~40/55/55/40/60m per a firsthand account). Another trip report confirms" },
  { id: "wa_bacon_peak_diobsud", col: "detailed_rack",
    find: "Multiple trip reports (Steph Abegg, One Hike A Week, trailcatjim.com/Jim Brisbine) describe",
    repl: "Multiple trip reports describe" },
  { id: "wa_bacon_peak_diobsud", col: "pro_needs",
    find: "(onehikeaweek.com: " + Q + "no visible crevasses... probing for crevasses" + Q + " as a precaution; Jason Hummel" + Q + "s account of a nearby route mentions crossing a moat), while a Steph Abegg report from a slightly later-season visit specifically notes",
    repl: "(one report describes no visible crevasses but probing for them as a precaution, and an account of a nearby route mentions crossing a moat), while a report from a slightly later-season visit specifically notes",
    note: "the CREVASSE hazard and both observations survive; only who wrote them goes" },
  { id: "wa_gunrunner", col: "rope_note",
    find: "Confirmed via CascadeClimbers.com trip report (FA by Blake Herrington and Dan Hilden).",
    repl: "Confirmed via a trip report (FA by Blake Herrington and Dan Hilden).",
    note: "the FIRST ASCENSIONISTS are people and stay; only the site goes" },
];

// These must come through untouched. Steph Abegg is a first ascensionist here, not a source.
const PROTECTED = [
  ["wa_energizer_bunny", "fa", "Steph Abegg"],
  ["wa_energizer_bunny", "overview", "Jon Pobst and Steph Abegg"],
  ["wa_east_twin_needle_thread_of_ice", "fa", "Steph Abegg and Wayne Wallace"],
  ["wa_east_twin_needle_thread_of_ice", "beta", "Steph Abegg and Wayne Wallace"],
  ["wa_little_sister_south_couloir", "fa", "Steph Abegg"],
];
// Content that must survive the rewrites around it.
const KEEP = [
  ["wa_bear_mountain_chilliwack_north_buttress", "detailed_rack", "not a generic guess"],
  ["wa_amphitheater_mountain_finger_of_fatwa", "rope_note", "flagged as inferred rather than directly confirmed"],
  ["wa_dragontail_peak_backbone_ridge", "emergency", "four people injured on this route"],
  ["wa_little_big_chief_mountain_northeast_face", "descent_text", "cliffed out"],
  ["wa_gunrunner", "rope_note", "Blake Herrington and Dan Hilden"],
  ["wa_ephemeral", "watch_out", "NWAC"],
  ["wa_bacon_peak_diobsud", "pro_needs", "crevasse-rescue"],
  ["wa_lichtenberg_mountain_west_face", "pro_tips", "only real beta"],
];

const IDS = [...new Set([...EDITS.map((e) => e.id), ...PROTECTED.map((p) => p[0]), ...KEEP.map((k) => k[0])])];
const COLS = [...new Set([...EDITS.map((e) => e.col), ...PROTECTED.map((p) => p[1]), ...KEEP.map((k) => k[1])])];

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
  const want = e.all ? null : 1;
  if (want === null ? n < 1 : n !== 1) {
    refusals.push(`${e.id} ${e.col}: found ${n} occurrence(s) of ${JSON.stringify(e.find.slice(0, 70))}, expected ${e.all ? ">=1" : "exactly 1"}`);
    continue;
  }
  s.value = replaceIn(s.value, e.find, e.repl);
  s.edits.push(e);
}
for (const [id, col, needle] of [...PROTECTED, ...KEEP]) {
  if (!leaves(byId.get(id)[col]).join(" ").includes(needle)) {
    refusals.push(`${id}.${col}: does not currently contain ${JSON.stringify(needle)} - the declared state has moved`);
  }
}
if (refusals.length) {
  console.error(`REFUSED - ${refusals.length} problem(s):\n  ` + refusals.join("\n  "));
  process.exit(1);
}

// Print the WHOLE resulting leaf: a cut strands a connective or a capital, and that is invisible
// from the find/repl pair alone.
for (const s of staged.values()) {
  console.log(`\n### ${s.id}  ${s.col}`);
  for (const e of s.edits) if (e.note) console.log(`   why: ${e.note}`);
  const before = new Set(leaves(byId.get(s.id)[s.col]));
  for (const l of leaves(s.value)) if (!before.has(l)) console.log(`   => ${l.length > 420 ? l.slice(0, 420) + " ..." : l}`);
}
console.log(`\n${EDITS.length} edit(s) across ${staged.size} value(s) on ${IDS.length} route(s).`);
console.log(`${PROTECTED.length} first-ascent credit(s) and ${KEEP.length} piece(s) of content asserted, not edited.`);

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
for (const [id, col, needle] of [...PROTECTED, ...KEEP]) {
  if (!leaves(after.get(id)[col]).join(" ").includes(needle)) {
    console.error(`CONTENT LOST: ${id}.${col} no longer says "${needle}"`); bad++;
  }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${EDITS.length} edit(s) clean; every FA credit and hedge intact.`);
process.exit(bad ? 1 : 0);
