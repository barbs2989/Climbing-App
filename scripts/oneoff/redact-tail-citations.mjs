// The tail: Wikipedia, SummitPost and WTA, after the big uniform clusters are gone.
//
// THREE THINGS IN HERE ARE NOT ORDINARY ATTRIBUTIONS.
//
//   1. AN AGENCY IS THE AUTHORITY AND STAYS. Several values contrast a publisher with USGS, GNIS,
//      the NPS or the Forest Service — "Wikipedia's infobox lists the peak as bordering both King
//      and Snohomish counties, but GNIS IS THE MORE AUTHORITATIVE SOURCE", "Wikipedia lists it as
//      the range's second-highest peak, while NPS MATERIALS call it third-highest". The
//      disagreement is the content and the agency is why it resolves, so only the publisher goes.
//
//   2. A NAMESAKE WARNING. "Do not confuse this peak with the SummitPost page for Chimney Peak in
//      the Selway Crags, Idaho — search engines mix the two constantly and the Idaho route beta is
//      useless here." This catalog keeps paying for name collisions, so the warning survives; what
//      goes is the page it points at. Second one of these (see wa_mount_bigelow_tribute_to_richard).
//
//   3. A LIVE REFERENCE, under the decision the user made today. "a GPS track or
//      Mountaineers/SummitPost beta is strongly advised" keeps the instruction and loses the
//      mastheads.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const Q = "'";
const DQ = '"';
const DASH = "—";

// CAPITALS, sixth batch running: three repls are lowercase because the publisher opened a
// clause after a semicolon. A property of the shape, and only the whole-value preview sees it.
const EDITS = [
  // ---- an agency is the authority; only the publisher goes ----
  { id: "wa_baring_mountain_r1", col: "emergency",
    find: "Wikipedia's infobox lists the peak as bordering both King and Snohomish counties",
    repl: "Some listings put the peak on the King/Snohomish county line",
    note: "the sentence resolves itself with 'but GNIS is the more authoritative source' - an agency, which stays." },
  { id: "wa_pinnacle_peak_tatoosh_r1", col: "overview",
    find: "Wikipedia lists it as the range's second-highest peak, while NPS materials call it third-highest",
    repl: "some listings call it the range's second-highest peak, while NPS materials call it third-highest" },
  { id: "wa_osceola_peak_scramble", col: "overview",
    find: "8,587 ft per USGS/Wikipedia",
    repl: "8,587 ft per USGS" },
  { id: "wa_mount_pershing_standard", col: "overview",
    find: "~6,154 ft per older USGS/Wikipedia figures",
    repl: "~6,154 ft per older USGS figures" },
  { id: "wa_jack_mountain_nohokomeen_headwall", col: "pitch_detail",
    find: "(elevation range per the USGS/Wikipedia glacier record)",
    repl: "(elevation range per the USGS glacier record)" },
  { id: "wa_kimtah_peak_scramble", col: "overview",
    find: "some sources (Wikipedia, PeakVisor) still list its elevation only as a contour-based estimate",
    repl: "some listings still give its elevation only as a contour-based estimate" },
  { id: "wa_oval_peak_scramble", col: "best_season",
    find: "Wikipedia and Forest Service sources put the climbing window",
    repl: "Forest Service sources put the climbing window" },

  // ---- a namesake warning: the collision is the content ----
  { id: "wa_chimney_peak_the_chimney", col: "pro_tips",
    find: "Do not confuse this peak with the SummitPost page for Chimney Peak in the Selway Crags, Idaho (7,681 ft)",
    repl: "Do not confuse this peak with Chimney Peak in the Selway Crags, Idaho (7,681 ft)",
    note: "second namesake warning in this sweep. This catalog keeps paying for name collisions, so the warning stays - only the page it points at goes." },

  // ---- a live reference, under the decision made today ----
  { id: "wa_mount_worthington_standard", col: "climbing_route",
    find: "a GPS track or Mountaineers/SummitPost beta is strongly advised",
    repl: "a GPS track or published beta is strongly advised" },

  // ---- the operational half stays: a ranger district number ----
  { id: "wa_chianti_spire_north_face", col: "emergency",
    find: "SummitPost also lists the older district number",
    repl: "An older district number on file is",
    note: "the PHONE NUMBER is the actionable line and is kept, exactly as on the sibling route." },
  { id: "wa_colonial_peak_west_ridge", col: "emergency",
    find: " (confirmed via SummitPost's Whatcom County listing)",
    repl: "" },

  // ---- the attribution IS the verb ----
  { id: "wa_ives_peak_r1", col: "beta",
    find: "Wikipedia identifies " + Q + "scramble" + Q + " as the easiest way up Ives Peak.",
    repl: "The easiest way up Ives Peak is a scramble." },
  { id: "wa_hagan_mountain_south", col: "beta",
    find: "Wikipedia lists the mountain's easiest route simply as " + Q + "Scrambling class 3 and glacier travel." + Q,
    repl: "The mountain's easiest route is listed simply as scrambling class 3 with glacier travel." },
  { id: "wa_mount_walkinshaw_scramble", col: "beta",
    find: "Wikipedia and regional peakbagging accounts describe the easiest route",
    repl: "Published and regional peakbagging accounts describe the easiest route" },
  { id: "wa_mount_pershing_standard", col: "best_season",
    find: "Wikipedia's infobox lists the general climbing season as May–August.",
    repl: "The general climbing season is listed as May–August." },
  { id: "wa_mount_spickard_southwest", col: "overview",
    find: "First ascent is credited (per Wikipedia) to Walter B.",
    repl: "First ascent is credited to Walter B." },
  { id: "wa_jack_mountain_north_ridge", col: "itinerary",
    find: "in line with Wikipedia's note that most parties on Jack take that long",
    repl: "in line with published notes that most parties on Jack take that long" },
  { id: "wa_jack_mountain_southwest_ridge", col: "itinerary",
    find: "Wikipedia notes most parties on Jack Mountain take three to four days",
    repl: "Most parties on Jack Mountain take three to four days" },
  { id: "wa_jack_mountain_northeast_glacier", col: "pro_tips",
    find: "Wikipedia's route table and the 1978 first-ascent record are essentially the entire public record",
    repl: "A published route table and the 1978 first-ascent record are essentially the entire public record" },
  { id: "wa_jack_mountain_southeast_ridge_direct", col: "pro_tips",
    find: "Wikipedia's route list separates the Grade III 5.6 Southeast Ridge",
    repl: "Published route lists separate the Grade III 5.6 Southeast Ridge" },
  { id: "wa_nooksack_tower_beckey_route", col: "rappels",
    find: " (Wikipedia/SummitPost)",
    repl: "" },
  { id: "wa_mushroom_tower_standard", col: "climate",
    find: "SummitPost recommends September specifically",
    repl: "Published beta recommends September specifically" },
  { id: "wa_mount_fury_east_direct_east_ridge", col: "pro_tips",
    find: "SummitPost's own advice is to avoid the glacier late in the year",
    repl: "the published advice is to avoid the glacier late in the year" },
  { id: "wa_tower_mountain_southwest_route", col: "pro_tips",
    find: "consistent with SummitPost's assessment that it should never exceed class 3",
    repl: "consistent with published assessments that it should never exceed class 3" },
  { id: "wa_wolframite_mountain_scramble", col: "crowds",
    find: "SummitPost describes it as " + DQ + "seldom summited" + DQ,
    repl: "it is described as seldom summited" },
  { id: "wa_eagle_rock_scramble", col: "crowds",
    find: "SummitPost trip reports note the summit register was signed",
    repl: "trip reports note the summit register was signed" },
  { id: "wa_mount_ellinor_standard", col: "crowds",
    find: "WTA and trip reports consistently flag both trailheads",
    repl: "trip reports consistently flag both trailheads" },
  { id: "wa_goat_mountain_south_ridge", col: "crowds",
    find: "a WTA report from late September still logged only ~10 groups",
    repl: "one late-September report still logged only ~10 groups" },
  { id: "wa_mount_stone_putvin", col: "crowds",
    find: " (frequently reported on WTA)",
    repl: "" },
  { id: "wa_garfield_mountain_scramble", col: "pro_tips",
    find: "hike the WTA-maintained Garfield Ledges viewpoint trail",
    repl: "hike the maintained Garfield Ledges viewpoint trail",
    note: "WTA maintains the trail, which is an operator fact rather than a citation - but the user's decision was broad and the sentence reads the same without it." },

  // ---- a list of the sites somebody searched ----
  { id: "wa_snowfield_peak_neve_glacier", col: "seasonal_guidance",
    find: "the classic window cited across Mountaineers and SummitPost trip reports",
    repl: "the classic window cited across trip reports" },
  { id: "wa_snowfield_peak_neve_glacier", col: "crowds",
    find: "based on the frequency of Mountaineers/SummitPost/blog trip reports",
    repl: "based on the frequency of trip reports" },
  { id: "wa_ingalls_peak_south_ridge", col: "crowds",
    find: "but trip reports (SummitPost, Mountaineers, Wenatchee Outdoors) consistently describe it",
    repl: "but trip reports consistently describe it" },
  { id: "wa_sloan_peak_corkscrew", col: "crowds",
    find: "a steady trickle of trip reports (Mountaineers, Mazamas, SummitPost)",
    repl: "a steady trickle of trip reports" },
  { id: "wa_unicorn_peak_r1", col: "crowds",
    find: "but trip reports on SummitPost/WTA consistently describe the scramble",
    repl: "but trip reports consistently describe the scramble" },
  { id: "wa_warrior_peak_standard", col: "crowds",
    find: "trip reports (SummitPost, CascadeClimbers, WTA, Mountaineers) appear only sporadically",
    repl: "trip reports appear only sporadically" },
  { id: "wa_eldorado_peak_east_ridge", col: "crowds",
    find: "this is widely described (SummitPost, Mountaineers, guide services) as the most popular glacier climb",
    repl: "this is widely described as the most popular glacier climb" },
  { id: "wa_painted_mountain_scramble", col: "crowds",
    find: "a handful of trip reports surface per year (WTA, SummitPost, personal blogs)",
    repl: "a handful of trip reports surface per year" },
  { id: "wa_denny_mountain_north_slopes", col: "crowds",
    find: "(occasional trip reports on WTA/Mountaineers/SummitPost spanning 2004-2024)",
    repl: "(occasional trip reports spanning 2004-2024)" },
  { id: "wa_gardner_mountain_west_ridge", col: "crowds",
    find: "(rough inference from scattered Mountaineers scramble outings, WTA and trailcatjim trip reports " + DASH + " no hard counter data exists)",
    repl: "(a rough inference from scattered scramble outings and trip reports " + DASH + " no hard counter data exists)" },
  { id: "wa_mount_bigelow_scramble", col: "crowds",
    find: "a handful of WTA/NWHikers trip reports and occasional Mountaineers club outings",
    repl: "a handful of trip reports and occasional club outings" },
  { id: "wa_chikamin_peak_southeast_slopes", col: "crowds",
    find: "occasional Mountaineers/WTA scramble outings plus independent parties",
    repl: "occasional club scramble outings plus independent parties" },
  { id: "wa_tower_mountain_southwest_route", col: "crowds",
    find: "shows up regularly in Mountaineers/WTA trip reports",
    repl: "shows up regularly in trip reports" },
  { id: "wa_seven_fingered_jack_southwest_slopes", col: "crowds",
    find: "most visits come from Mountaineers/WTA-style scramble outings",
    repl: "most visits come from organised scramble outings" },
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
// The agency authorities, the namesake warning and the phone number are why several of these
// sentences exist at all. Assert them rather than trusting the edits beside them.
for (const [id, col, needle] of [
  ["wa_baring_mountain_r1", "emergency", "GNIS is the more authoritative source"],
  ["wa_pinnacle_peak_tatoosh_r1", "overview", "NPS materials call it third-highest"],
  ["wa_chimney_peak_the_chimney", "pro_tips", "search engines mix the two constantly"],
  ["wa_chianti_spire_north_face", "emergency", "509-996-2266"],
  ["wa_osceola_peak_scramble", "overview", "per USGS"],
]) {
  if (!leaves(after.get(id)[col]).join(" ").includes(needle)) {
    console.error(`CONTENT LOST: ${id}.${col} no longer says "${needle}"`); bad++;
  }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${EDITS.length} edit(s) clean; agencies, the namesake warning and the ranger number intact.`);
process.exit(bad ? 1 : 0);
