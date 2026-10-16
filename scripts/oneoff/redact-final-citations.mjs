// The last of the citation sweep: Beckey, AllTrails, Mountaineers.org, Gaia, Peakbagger,
// Wikipedia and the odds and ends.
//
// I AM REVERSING MY OWN EARLIER CALL ON THE MAP-APP WARNINGS. I recorded "Do not trust
// AllTrails/Gaia GPX tracks that keep the route on the ridge crest — there's a real gap" as NOT a
// citation, on the grounds that naming which app is wrong is the content. That reasoning was
// sound when the question was open. The user has since said plainly that they do not want
// citations, and the warning survives the cut intact: "Do not trust GPX tracks that keep the
// route on the ridge crest" tells a climber exactly the same thing. Where a generic form loses
// nothing, the broader instruction wins.
//
// AN AGENCY IS STILL AN AGENCY. NOAA/NWS point forecasts, the Northwest Avalanche Center, NPS
// condition updates, USGS elevations and the ranger numbers all stay — those are bodies a
// climber contacts or an authority that settles a fact, not a claim about where our data came
// from. "linked from Peakbagger's Chianti Spire page" goes; the NOAA forecast it points at stays.
//
// TWO FATALITY RECORDS AND ONE PRIVATE-LAND WARNING are in here. All three survive: they are
// facts about the mountain and about access, not claims belonging to a publisher.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const Q = "'";
const DASH = "—";

const EDITS = [
  // ---- map-app warnings: the warning survives generically ----
  { id: "wa_tomyhoi_peak_southeast_ridge", col: "watch_out",
    find: "Do not trust AllTrails/Gaia GPX tracks that keep the route on the ridge crest",
    repl: "Do not trust GPX tracks that keep the route on the ridge crest",
    note: "reversing my own earlier 'keep' - the warning is identical without the app names, and the user has said plainly they do not want citations." },
  { id: "wa_tomyhoi_peak_southeast_ridge", col: "pro_tips",
    find: "some AllTrails/Gaia GPX tracks incorrectly show the route staying on the crest",
    repl: "some GPX tracks incorrectly show the route staying on the crest" },
  { id: "wa_mount_stickney_scramble", col: "approach",
    find: "the Gaia/USGS road overlay is reportedly inaccurate here",
    repl: "the mapped road alignment is reportedly inaccurate here" },
  { id: "wa_mount_stickney_scramble", col: "pro_tips",
    find: "Don't trust the road line on Gaia/Caltopo near Olney Creek Road",
    repl: "Don't trust the mapped road line near Olney Creek Road" },
  { id: "wa_mount_stickney_scramble", col: "hazards",
    find: "Inaccurate mapped road alignment (Gaia/Caltopo) near Olney Creek",
    repl: "Inaccurate mapped road alignment near Olney Creek" },
  { id: "wa_mount_bigelow_tribute_to_richard", col: "itinerary",
    find: "(roughly 2 h 45 min of walking at Gaia's trail estimate)",
    repl: "(roughly 2 h 45 min of walking at the mapped trail estimate)" },

  // ---- review counts are a website's engagement figures ----
  { id: "wa_mount_ellinor_standard", col: "crowds",
    find: " (3,400+ AllTrails reviews for this trail alone)",
    repl: "" },
  { id: "wa_kendall_peak_standard", col: "crowds",
    find: "(thousands of AllTrails/WTA reviews cite it as one of the most popular PCT day hikes near I-90)",
    repl: "(one of the most popular PCT day hikes near I-90)" },
  { id: "wa_mount_townsend_standard", col: "crowds",
    find: " (76+ AllTrails reviews, regularly featured by WTA/Mountaineers)",
    repl: "" },
  { id: "wa_mount_washington_olympic_standard", col: "partner_requirements",
    find: "(accounts vary: AllTrails 3.2 mi/3,169 ft gain, Mountaineers 6.0 mi/3,200 ft gain)",
    repl: "(accounts vary from 3.2 mi/3,169 ft to 6.0 mi/3,200 ft of gain)",
    note: "the DISAGREEMENT between the two figures is the useful part and is kept as a range." },

  // ---- an agency stays; the publisher pointing at it goes ----
  { id: "wa_chianti_spire_lichen_bouquet", col: "climate",
    find: " (linked from Peakbagger's Chianti Spire page)",
    repl: "",
    note: "the NOAA/NWS point forecast and the Northwest Avalanche Center stations in the same sentence STAY - agencies a climber checks." },
  { id: "wa_chianti_spire_north_face", col: "climate",
    find: " (linked from Peakbagger's Chianti Spire page)",
    repl: "" },
  { id: "wa_johannesburg_mountain_cj_couloir", col: "climate",
    find: "rely on recent trip reports and NPS/WTA road and trail condition updates",
    repl: "rely on recent trip reports and NPS road and trail condition updates" },
  { id: "wa_corteo_peak_southwest_ridge", col: "emergency",
    find: "Chelan (per USGS/Wikipedia)",
    repl: "Chelan (per USGS)" },
  { id: "wa_mount_seattle_south", col: "climate",
    find: "per NPS and Wikipedia sources.",
    repl: "per NPS sources." },

  // ---- a fatality record is a fact about the mountain ----
  { id: "wa_mount_pugh_stujack", col: "hazards",
    find: "Wikipedia records two fatal falls on the mountain, in 2022 and 2026",
    repl: "two fatal falls on the mountain are on record, in 2022 and 2026",
    note: "a FATALITY record. The fact stands without a publisher." },

  // ---- a private-land warning ----
  { id: "wa_lichtenberg_mountain_southeast_ridge", col: "descent_text",
    find: "WenatcheeOutdoors also describes a circuit going up one side",
    repl: "Published beta also describes a circuit going up one side",
    note: "the sentence ends with a PRIVATE LAND warning - ask permission before parking. Untouched." },

  // ---- Beckey by name ----
  { id: "wa_garfield_mountain_scramble", col: "itinerary",
    find: "Fred Beckey's guidebook calls 12 hours an absolute minimum",
    repl: "Published descriptions call 12 hours an absolute minimum" },
  { id: "wa_mount_terror_southeast_face", col: "pro_tips",
    find: "Fred Beckey's guide rates the opening pitch 5.6, but several recent trip reports found it notably harder",
    repl: "The published grade for the opening pitch is 5.6, but several recent trip reports found it notably harder",
    note: "a DISAGREEMENT, and a sharp one - 5.6 against 5.8 on the loosest rock in the Pickets. Both halves kept." },
  { id: "wa_mount_crowder_northeast_ridge", col: "watch_out",
    find: "Beckey's guidebook description of this line has been reported by climbers as vague or inaccurate.",
    repl: "The published description of this line has been reported by climbers as vague or inaccurate." },
  { id: "wa_kyes_peak_northeast_ridge", col: "pro_tips",
    find: "Beckey's guide calls this " + Q + "the most direct of the three approaches" + Q,
    repl: "This is described as the most direct of the three approaches" },
  { id: "wa_jack_mountain_south_face", col: "best_season",
    find: "Beckey's guide and multiple trip reports (Aug 11-15, Sept 1, Sept 21-26) all favor this window.",
    repl: "Published descriptions and multiple trip reports (Aug 11-15, Sept 1, Sept 21-26) all favor this window." },
  { id: "wa_jack_mountain_south_face", col: "pro_tips",
    find: "Beckey's guide and multiple trip reports (Aug 11-15, Sept 1, Sept 21-26) all favor this window",
    repl: "Published descriptions and multiple trip reports (Aug 11-15, Sept 1, Sept 21-26) all favor this window" },

  // ---- a club's own grading scale ----
  { id: "wa_lewis_creek_route", col: "partner_requirements",
    find: "Mountaineers.org rates it Strenuous 5 / Technical 4 with Leader rating " + Q + "Challenging" + Q + " -- near the top of their scrambling scale",
    repl: "It is rated Strenuous 5 / Technical 4 with a " + Q + "Challenging" + Q + " leader rating -- near the top of that scrambling scale",
    note: "the GRADE is the useful part and is kept verbatim; only the body that publishes the scale goes." },
  { id: "wa_lizard_mountain_south_route", col: "itinerary",
    find: "Per a Mountaineers.org trip report;",
    repl: "Per one trip report;" },
  { id: "wa_mount_stuart_cascadian_couloir", col: "itinerary",
    find: "over about 12 mi round trip per Mountaineers.org trip reports",
    repl: "over about 12 mi round trip per trip reports" },
  { id: "wa_north_twin_sister_west_ridge", col: "itinerary",
    find: "Mountaineers.org reports roughly 6-7 hours from trailhead to summit",
    repl: "reports give roughly 6-7 hours from trailhead to summit" },
  { id: "wa_mount_hinman_hinman_glacier", col: "itinerary",
    find: "per Mountaineers/Peakbagger trip reports",
    repl: "per trip reports" },
  { id: "wa_union_peak_se_route", col: "crowds",
    find: "(multiple WTA trip reports Dec-Feb)",
    repl: "(multiple trip reports Dec-Feb)" },

  // ---- the last of the generic guidebook adjectives ----
  { id: "wa_chianti_spire_east_face", col: "crowds",
    find: "a known Wine Spires classic (guidebook and NC Mountain Guides praise it)",
    repl: "a known and widely praised Wine Spires classic" },
  { id: "wa_chianti_spire_east_face", col: "partner_requirements",
    find: "given the remote, non-guidebook-trivial approach",
    repl: "given the remote, non-trivial approach" },
  { id: "wa_mount_bigelow_scramble", col: "crowds",
    find: "no guidebook-trade-route volume",
    repl: "no trade-route volume" },
  { id: "wa_north_twin_sister_scramble", col: "partner_requirements",
    find: "without a well-established trail or guidebook consensus",
    repl: "without a well-established trail or published consensus" },
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
// The warnings, the agencies and the fatality record are why these sentences exist.
for (const [id, col, needle] of [
  ["wa_tomyhoi_peak_southeast_ridge", "watch_out", "there's a real gap"],
  ["wa_mount_stickney_scramble", "pro_tips", "near Olney Creek Road"],
  ["wa_chianti_spire_north_face", "climate", "Northwest Avalanche Center"],
  ["wa_chianti_spire_lichen_bouquet", "climate", "NOAA/NWS point forecast"],
  ["wa_mount_pugh_stujack", "hazards", "2022 and 2026"],
  ["wa_lichtenberg_mountain_southeast_ridge", "descent_text", "ask permission before parking"],
  ["wa_mount_terror_southeast_face", "pro_tips", "loosest in the Pickets"],
  ["wa_lewis_creek_route", "partner_requirements", "Strenuous 5 / Technical 4"],
]) {
  if (!leaves(after.get(id)[col]).join(" ").includes(needle)) {
    console.error(`CONTENT LOST: ${id}.${col} no longer says "${needle}"`); bad++;
  }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${EDITS.length} edit(s) clean; warnings, agencies, the fatality record and the private-land note intact.`);
process.exit(bad ? 1 : 0);
