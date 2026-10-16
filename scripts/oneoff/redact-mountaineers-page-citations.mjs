// "The Mountaineers" — 34 values, and only EIGHT are citations. This is the family CLAUDE.md
// warns hardest about, and reading all 34 is what the warning asks for.
//
// The 26 that stay, by kind:
//
//   THE ASCENDING PARTY (9)   `fa` credits — "Lorenz A. Nelson party (The Mountaineers), Aug 13,
//                             1907", "1921 — The Mountaineers (first recorded ascent)". A club
//                             that made the first ascent is the climbing party, exactly like a
//                             named first ascensionist.
//   THE TRIP OPERATOR (13)    "The Mountaineers run it as an official Alpine Scramble (Strenuous
//                             5/Technical 4)", "when The Mountaineers or other clubs run
//                             scheduled trips", "their guided trips require crevasse-rescue
//                             proficiency". These are facts about WHO CLIMBS THE PEAK and when
//                             it is busy — the rule this repo already applies to clubs.
//   A NAMED GRADING SCALE (4) "T4, approaching T5 on the Mountaineers' scramble scale",
//                             "classified as an 'Intermediate Alpine Climb'". A grade is
//                             meaningless without the scale it is on, so the scale's name is
//                             part of the fact rather than an attribution for it.
//
// THE EIGHT THAT GO ARE THE CLUB'S WEB PAGE QUOTED AS THE SOURCE OF A FACT — a rappel sequence,
// a crevasse condition, a slope angle, an itinerary. Three of them are RAPPEL COUNTS, which is
// the highest-stakes column in this catalog, and in all three the count, the correction it
// records and the anchor warning survive untouched.
//
// A QUOTATION CANNOT SURVIVE ITS SPEAKER, so three long quoted rappel sequences become the page's
// own prose. Nothing about the sequence changes; only the marks and the masthead go.
//
// WHAT THIS BATCH DOES NOT DO is decide the harder half. `audit:prose-citations` will still report
// the 26, because "The Mountaineers" is one string doing three different jobs and no pattern can
// separate them. That is the audit working as a reading list, which is what it is for.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const Q = "'";
const DQ = '"';
const DASH = "—";

const EDITS = [
  { id: "wa_sherpa_peak_east_ridge", col: "rappel_count_note",
    find: "The Mountaineers West Ridge page: " + DQ + "Two single rope rappels from the top leads to a scramble to another single rope rappel followed by a final double rope rappel" + DQ + ", and notes",
    repl: "A published West Ridge description gives two single-rope rappels from the top leading to a scramble, then another single-rope rappel followed by a final double-rope rappel, and notes",
    note: "a RAPPEL SEQUENCE. Every station and the 2-versus-4 correction above it are unchanged." },
  { id: "wa_sharkfin_tower_southeast_ridge", col: "rappel_count_note",
    find: "The Mountaineers route page: " + DQ + "Descend by rappelling and downclimbing the route (about five rappels)." + DQ,
    repl: "A published route description gives about five rappels, descending by rappelling and downclimbing the route.",
    note: "the two-rope party's three measured stations and the 'blocky and inconsistent anchors' warning both stay" },
  { id: "wa_big_snagtooth_west_ridge", col: "rappel_count_note",
    find: "The Mountaineers route page describes both: " + DQ + "Rappel from just below the summit back to the base of the boulder move then scramble back to the first pitch, locate the rappel anchor and rappel. Both rappels can be done on a 30m rope." + DQ,
    repl: "A published route description gives both: rappel from just below the summit back to the base of the boulder move, then scramble back to the first pitch, locate the rappel anchor and rappel. Both rappels can be done on a 30 m rope.",
    note: "the rope length and the loose-boulder anchor warning are the safety content and stay" },
  { id: "wa_glacier_peak_disappointment_peak_cleaver", col: "gear",
    find: "keeps open crevasses through the season per the Mountaineers" + Q + " route page",
    repl: "keeps open crevasses through the season per the published route description",
    note: "a CREVASSE condition driving a rope-and-harness call" },
  { id: "wa_jack_mountain_nohokomeen_headwall", col: "pitch_detail",
    find: "The Mountaineers cite slopes up to 60 degrees.", repl: "published accounts cite slopes up to 60 degrees.",
    note: "a SLOPE ANGLE; the snow-quality range after it is untouched. LOWERCASE: the clause sits mid-sentence after a dash, and the capital was only correct while the subject was a proper noun - the ninth batch running where that is invisible from the find/repl pair" },
  { id: "wa_witches_tower_southwest_corner", col: "itinerary",
    find: "the Mountaineers guide recommends two days", repl: "published beta recommends two days" },
  { id: "wa_mount_constance_west_arete", col: "itinerary",
    find: "matches The Mountaineers" + Q + " own " + Q + "two days hiking, one day climbing" + Q + " plan for this route.",
    repl: "matches the published two-days-hiking, one-day-climbing plan for this route." },
  { id: "wa_the_temple_south_ridge", col: "face",
    find: "(documented by The Mountaineers as the " + Q + "West Side" + Q + " route; the only detailed guidebook-quality line to the true summit)",
    repl: "(documented as the West Side route; the only detailed line to the true summit on record)" },
];

const KEEP = [
  ["wa_sherpa_peak_east_ridge", "rappel_count_note", "the 4 stations are the full West Ridge line"],
  ["wa_sharkfin_tower_southeast_ridge", "rappel_count_note", "blocky and inconsistent"],
  ["wa_sharkfin_tower_southeast_ridge", "rappel_count_note", "Corrected from 2"],
  ["wa_big_snagtooth_west_ridge", "rappel_count_note", "back it up"],
  ["wa_glacier_peak_disappointment_peak_cleaver", "gear", "roped glacier travel"],
  ["wa_jack_mountain_nohokomeen_headwall", "pitch_detail", "deep sugary snow over thin crusts"],
];

// These must come through untouched: the club as ascending party, as trip operator, as a scale.
const PROTECTED = [
  ["wa_mount_olympus_blue_glacier", "fa", "The Mountaineers"],
  ["wa_cloudy_peak_southwest_slopes", "fa", "The Mountaineers"],
  ["wa_mount_daniel_lynch_glacier", "fa", "The Mountaineers"],
  ["wa_whitehorse_mountain_nw_shoulder", "crowds", "The Mountaineers"],
  ["wa_lewis_creek_route", "crowds", "Mountaineers"],
  ["wa_fortune_peak_standard_route", "watch_out", "Mountaineers"],
  ["wa_mount_thomson_west_ridge", "partner_requirements", "The Mountaineers"],
];

const IDS = [...new Set([...EDITS.map((e) => e.id), ...KEEP.map((k) => k[0]), ...PROTECTED.map((p) => p[0])])];
const COLS = [...new Set([...EDITS.map((e) => e.col), ...KEEP.map((k) => k[1]), ...PROTECTED.map((p) => p[1])])];

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
for (const [id, col, needle] of [...KEEP, ...PROTECTED]) {
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
  for (const l of leaves(s.value)) if (!before.has(l)) console.log(`   => ${l.length > 460 ? l.slice(0, 460) + " ..." : l}`);
}
console.log(`\n${EDITS.length} edit(s) across ${staged.size} value(s) on ${IDS.length} route(s).`);
console.log(`${PROTECTED.length} club-as-party/operator/scale value(s) asserted UNCHANGED; 26 of the 34 deliberately left.`);

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
for (const [id, col, needle] of [...KEEP, ...PROTECTED]) {
  if (!leaves(after.get(id)[col]).join(" ").includes(needle)) {
    console.error(`CONTENT LOST: ${id}.${col} no longer says "${needle}"`); bad++;
  }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${EDITS.length} edit(s) clean; every rappel count, anchor warning, FA credit and club trip reference intact.`);
process.exit(bad ? 1 : 0);
