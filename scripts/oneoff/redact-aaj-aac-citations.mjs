// The AAJ / AAC family — 35 values, also invisible until #1494 added them to the deny-list.
// `NAMED` listed Mountain Project, SummitPost, WTA and Wikipedia and had never known about the
// American Alpine Journal or the American Alpine Club, which are the two most-cited publishers in
// an alpine catalog.
//
// Same transform: REPLACE THE PUBLISHER WITH THE CATEGORY. "the AAJ records 9.5 hours from low on
// the glacier" becomes "the published account records 9.5 hours from low on the glacier".
//
// SEVEN OF THESE ARE ACCIDENT OR FATALITY RECORDS, and the fact is exactly what must survive:
//
//     "AAC-documented fatal accident, 1993: an unroped fall near Snow Dome"
//     "(AAC Accidents in North American Mountaineering, 1976)"
//     "documented fatal fall, AAC 1980"
//     "AAC-documented accident, July 2020: a climber was struck by rockfall..."
//
// #1462 already set this precedent one publisher over — "has been the scene of at least one
// fatality per Mountain Project" became "...at least one fatality", and the note recorded that
// "the fact and the exposure both stand without the publisher". The attribution says the accident
// is a PUBLISHED record rather than hearsay, and "Documented fatal accident, 1993" says that
// without naming anyone. Every one of the seven is asserted after the write.
//
// FIRST ASCENSIONISTS STAY, as they did in #1496. "The AAC Publications first-ascent note (Scott
// Bennett & Blake Herrington, 2012)" keeps the climbers and loses the publisher; the 1959 second
// ascent keeps Josendal, Sharpe and Spickard. People credited with a climb are content.
//
// A QUOTATION CANNOT SURVIVE ITS SPEAKER. Three Chianti Spire pitch entries were direct quotes
// whose ONLY attribution was "(AAJ 1990)", so the marks come off with the tag and the sentences
// become the page's own. Leaving them would cite nobody and read as scare quotes.
//
// DOCUMENTED NEGATIVES SURVIVE and are asserted: "No source publishes a footage figure", "No
// pitch lengths are published for this route", "no modern topo and effectively no repeat beta",
// "a reasoned inference from route character rather than a direct source", "Not stated in the
// published account".
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const Q = "'";
const DQ = '"';
const DASH = "—";

const EDITS = [
  // ---- accident and fatality records: the FACT is the content ----
  { id: "wa_olympus_blue_glacier_east_ramps", col: "hazards",
    find: "AAC-documented fatal accident, 1993:", repl: "Documented fatal accident, 1993:",
    note: "a FATALITY. #1462's precedent: the fact stands without the publisher." },
  { id: "wa_forbidden_peak_east_ledges", col: "hazards",
    find: " (AAC Accidents in North American Mountaineering, 1976)", repl: "",
    note: "a FATALITY, with the date, the party's error and the terrain all kept." },
  { id: "wa_spontaneity_arete", col: "hazards",
    find: "AAC-documented accident (2018):", repl: "Documented accident (2018):" },
  { id: "wa_the_direct_north_ridge_w_gendarme", col: "hazards",
    find: "AAC-documented accident, July 2020:", repl: "Documented accident, July 2020:" },
  { id: "wa_lundin_peak_west_ridge", col: "hazards",
    find: "(documented fatal fall, AAC 1980)", repl: "(documented fatal fall, 1980)" },
  { id: "wa_lundin_peak_west_ridge", col: "emergency",
    find: "an AAC-published fatality (Oct 1980) occurred", repl: "a fatality (Oct 1980) occurred",
    note: "NOT 'a documented fatality' - the sentence already opens 'a documented accident history', and the doubled word was only visible by printing the whole value" },
  { id: "wa_lundin_peak_south_face_left", col: "hazards",
    find: "a fatal fall on descent is documented (AAC, 1980).", repl: "a fatal fall on descent is documented (1980)." },
  { id: "wa_cathedral_rock_northwest_couloir", col: "hazards",
    find: "the American Alpine Club" + Q + "s report notes rock " + Q + "that seems solid breaks off easily" + Q + " in this couloir",
    repl: "the accident report notes rock that seems solid breaks off easily in this couloir",
    note: "an INJURY record; the quote loses its marks with its speaker" },

  // ---- first ascensionists stay; the publisher goes ----
  { id: "wa_amphitheater_mountain_finger_of_fatwa", col: "detailed_rack",
    find: "The AAC Publications first-ascent note (Scott Bennett & Blake Herrington, 2012) describes",
    repl: "The first-ascent note (Scott Bennett & Blake Herrington, 2012) describes",
    note: "the FA party are people and stay" },
  { id: "wa_phantom_peak_south_route", col: "rappel_count_note",
    find: "from the 1959 AAJ second-ascent account (Josendal, Sharpe, Spickard)",
    repl: "from the 1959 second-ascent account (Josendal, Sharpe, Spickard)" },
  { id: "wa_south_face_5", col: "partner_requirements",
    find: "per the FA party" + Q + "s 1970 AAJ account", repl: "per the FA party" + Q + "s 1970 account" },
  { id: "wa_burnt_boot_peak_north_route", col: "rope_note",
    find: "(per AAC North Ridge FA account:", repl: "(per the North Ridge first-ascent account:" },
  { id: "wa_mount_terror_stoddard_buttress", col: "pitch_detail",
    find: "crux 5.8+ per the AAC account of the 1985 extension", repl: "crux 5.8+ per the published account of the 1985 extension" },

  // ---- quotations: the marks come off with the speaker ----
  { id: "wa_chianti_spire_lichen_bouquet", col: "pitch_detail",
    find: "an offwidth crack (AAJ 1990).", repl: "an offwidth crack." },
  { id: "wa_chianti_spire_lichen_bouquet", col: "pitch_detail",
    find: DQ + "Three more pitches led up, crossing Rebel Yell, and finally gained the notch between Burgundy Spire and Chianti" + DQ + " (AAJ 1990).",
    repl: "Three more pitches lead up, crossing Rebel Yell, and finally gain the notch between Burgundy Spire and Chianti." },
  { id: "wa_chianti_spire_lichen_bouquet", col: "pitch_detail",
    find: DQ + "A short pitch led to the summit up the normal route" + DQ + " (AAJ 1990) - i.e.",
    repl: "A short pitch leads to the summit up the normal route - i.e." },
  { id: "wa_chianti_spire_north_face", col: "pitch_detail",
    find: "the 1990 AAJ account of a neighbouring east-face line describes the finish from this notch as " + DQ + "a short pitch" + DQ + " up " + DQ + "the normal route." + DQ,
    repl: "a 1990 account of a neighbouring east-face line describes the finish from this notch as a short pitch up the normal route.",
    note: "the value ends 'No source publishes a footage figure' - the documented negative stays" },
  { id: "wa_crooked_thumb_peak_south_route", col: "face",
    find: "AAJ (1963) describes it as a " + Q + "diagonal gully and chimney system to the first notch north of the summit," + Q + " then",
    repl: "a 1963 account describes it as a diagonal gully and chimney system to the first notch north of the summit, then" },
  { id: "wa_baring_mountain_r1", col: "detailed_rack",
    find: "(the AAC first-ascent account describes it only as", repl: "(the first-ascent account describes it only as",
    note: "'a reasoned inference from route character rather than a direct source' is the hedge and stays" },
  { id: "wa_northwest_ridge_2", col: "detailed_rack",
    find: "the AAC account describes the rock as", repl: "the first-ascent account describes the rock as" },

  // ---- plain attribution ----
  { id: "wa_baring_mountain_r1", col: "itinerary",
    find: "since the AAC account describes relying on a nearby snow patch",
    repl: "since the first-ascent account describes relying on a nearby snow patch" },
  { id: "wa_big_snow_mountain_east_buttress", col: "pro_tips",
    find: "bring the original AAC route description/beta", repl: "bring the original route description and beta" },
  { id: "wa_marvin_s_ear", col: "face",
    find: " (skirts the north face in the upper pitches, per AAC)", repl: " (skirts the north face in the upper pitches)" },
  { id: "wa_jack_mountain_east_ridge", col: "descent_text",
    find: "the AAJ figure of 9.5 hours from low on the glacier", repl: "the published figure of 9.5 hours from low on the glacier" },
  { id: "wa_jack_mountain_east_ridge", col: "itinerary",
    find: "the AAJ records 9.5 hours from low on the glacier", repl: "the published account records 9.5 hours from low on the glacier" },
  { id: "wa_jack_mountain_east_ridge", col: "detailed_rack",
    find: "the glacier approach the AAJ account implies", repl: "the glacier approach the published account implies" },
  { id: "wa_little_sister_south_couloir", col: "pitch_detail",
    find: "per the AAJ description of the Twin Sister High Route", repl: "per the published description of the Twin Sister High Route" },
  { id: "wa_little_sister_south_couloir", col: "pitch_detail",
    find: "mixed rock described in the AAJ.", repl: "mixed rock described in the published account." },
  { id: "wa_little_sister_south_couloir", col: "pitch_detail",
    find: "The AAJ" + Q + "s 100+ m figure is split here", repl: "The published 100+ m figure is split here",
    note: "'the sources give the section as a continuous 100+ m' later in the same value is the hedge and stays" },
  { id: "wa_baring_mountain_oatmeal_man", col: "pitch_detail",
    find: "the AAJ note gives only the grade, the pitch count and the face height",
    repl: "the first-ascent note gives only the grade, the pitch count and the face height",
    note: "'No published pitch-by-pitch topo exists' is the documented negative and stays" },
  { id: "wa_baring_mountain_oatmeal_man", col: "pro_tips",
    find: "the AAJ note is the primary source", repl: "the original first-ascent note is the only account",
    note: "'no modern topo and effectively no repeat beta' stays" },
  { id: "wa_cathedral_peak_last_rites", col: "pro_tips",
    find: "the AAJ description is the only written beta", repl: "a single published description is the only written beta" },
  { id: "wa_the_rake_traverse_route", col: "rope_note",
    find: "AAC-published equipment list specifies", repl: "The published equipment list specifies" },
  { id: "wa_hozomeen_mountain_west_face", col: "beta",
    find: "rather than the AAJ" + Q + "s IV 5.9", repl: "rather than the published IV 5.9",
    note: "the R/X disagreement is a SAFETY claim and both grades stay" },
  { id: "wa_hozomeen_mountain_south_peak_southeast_buttress", col: "descent",
    find: "Not stated in the American Alpine Journal account.", repl: "Not stated in the published account.",
    note: "a DOCUMENTED NEGATIVE - the whole value" },
];

const KEEP = [
  ["wa_olympus_blue_glacier_east_ramps", "hazards", "fatal accident, 1993"],
  ["wa_forbidden_peak_east_ledges", "hazards", "to his death here on July 13, 1975"],
  ["wa_spontaneity_arete", "hazards", "helicopter evacuation"],
  ["wa_the_direct_north_ridge_w_gendarme", "hazards", "struck by rockfall"],
  ["wa_lundin_peak_west_ridge", "hazards", "fatal fall"],
  ["wa_lundin_peak_west_ridge", "emergency", "fatality (Oct 1980)"],
  ["wa_lundin_peak_south_face_left", "hazards", "fatal fall on descent is documented"],
  ["wa_cathedral_rock_northwest_couloir", "hazards", "chipped tooth"],
  ["wa_amphitheater_mountain_finger_of_fatwa", "detailed_rack", "Scott Bennett & Blake Herrington, 2012"],
  ["wa_phantom_peak_south_route", "rappel_count_note", "Josendal, Sharpe, Spickard"],
  ["wa_chianti_spire_north_face", "pitch_detail", "No source publishes a footage figure"],
  ["wa_chianti_spire_lichen_bouquet", "pitch_detail", "No pitch lengths are published for this route"],
  ["wa_baring_mountain_r1", "detailed_rack", "rather than a direct source"],
  ["wa_baring_mountain_oatmeal_man", "pro_tips", "no modern topo and effectively no repeat beta"],
  ["wa_hozomeen_mountain_west_face", "beta", "R/X reflects reality better than the number does"],
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
console.log(`${KEEP.length} piece(s) of content asserted, including 7 accident/fatality records.`);

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
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${EDITS.length} edit(s) clean; every accident record, FA credit and hedge intact.`);
process.exit(bad ? 1 : 0);
