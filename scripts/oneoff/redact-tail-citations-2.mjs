// The last of the Mountain Project family, plus the small tails.
//
// TWO ANCHOR DISAGREEMENTS ARE HANDLED HERE RATHER THAN LEFT. wa_kangaroo_temple_north_face was
// deliberately skipped in an earlier batch because one source describes the rappel anchor as
// three bolts with no chains and another as chains — "so expect that it may have been rebuilt and
// judge what is actually there". Two sources disagreeing about an ANCHOR is the whole content, and
// it survives without either name: "one published description gives ..., another ...". The
// instruction to judge what is actually there is untouched.
//
// A STAR RATING IS A WEBSITE'S SCORE (the page-views-are-not-ascents class) and goes. But
// wa_himmelhorn_wild_hair_crack's "called 'the best climb I've ever done in the North Cascades' by
// ONE OF ITS FIRST ASCENSIONISTS" is a person speaking about their own route — that is content,
// not a publisher, and it stays.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const Q = "'";
const DASH = "—";

const EDITS = [
  // ---- disagreements: the contrast is the content ----
  { id: "wa_kangaroo_temple_north_face", col: "rappel_detail",
    find: "The Mountaineers describe it as three good bolts with hangers and no chains, Mountain Project as chains atop the North Face",
    repl: "One published description gives three good bolts with hangers and no chains, another chains atop the North Face",
    note: "an ANCHOR disagreement, skipped in an earlier batch as unsweepable. It survives without either name, and 'judge what is actually there' is untouched." },
  { id: "wa_colchuck_peak_northeast_couloir", col: "best_season",
    find: "Mountain Project lists late May-early June as the classic timing",
    repl: "one published account gives late May-early June as the classic timing",
    note: "the value opens 'accounts disagree on the ideal window' and contrasts it with other route notes. Both halves kept." },
  { id: "wa_little_sister_north_face", col: "pitch_detail",
    find: "describe the full wall as nearly 1,000 ft top to bottom versus Mountain Project's 600 ft figure for the roped section alone",
    repl: "describe the full wall as nearly 1,000 ft top to bottom versus the published 600 ft figure for the roped section alone" },

  // ---- quotations: a quote cannot survive its speaker ----
  { id: "wa_fantasy_falls", col: "best_season",
    find: "Mountain Project notes plainly that the route " + Q + "doesn't always form." + Q,
    repl: "it is noted plainly that the route does not always form." },
  { id: "wa_inner_constance_northwest_buttress", col: "best_season",
    find: "Mountain Project's note that " + Q + "cloud cover like always in the Olympics makes viewing the route very difficult" + Q + " is the single most useful piece of beta on the page",
    repl: "the most useful piece of beta on record is that cloud cover, as always in the Olympics, makes viewing the route very difficult" },
  { id: "wa_you_moss_be_joking", col: "watch_out",
    find: "Described on Mountain Project as " + Q + "crappy" + Q + " climbing on a scrubby line",
    repl: "Described as crappy climbing on a scrubby line" },
  { id: "wa_the_horn_scramble", col: "pitch_detail",
    find: "Mountain Project: " + Q + "an impressive powering mass of stone" + Q + " - don't let",
    repl: "An impressive powering mass of stone - don't let" },
  { id: "wa_northeast_face_direct", col: "seasonal_hazards",
    find: "the standard descent via the South Route involves " + Q + "constant exposure and loose rock" + Q + " and has been the scene of at least one fatality per Mountain Project",
    repl: "the standard descent via the South Route involves constant exposure and loose rock and has been the scene of at least one fatality",
    note: "a FATALITY is recorded here. The fact and the exposure both stand without the publisher." },
  { id: "wa_northeast_face_direct", col: "partner_requirements",
    find: "which Mountain Project separately notes has " + Q + "difficult route finding, constant exposure and loose rock" + Q,
    repl: "which is separately recorded as having difficult route finding, constant exposure and loose rock" },

  // ---- a star rating is a website's score; a first ascensionist is a person ----
  { id: "wa_himmelhorn_wild_hair_crack", col: "pro_tips",
    find: "Rated 3.4-3.5 stars on Mountain Project and called",
    repl: "Highly rated, and called",
    note: "the star score goes; 'called the best climb I have ever done in the North Cascades BY ONE OF ITS FIRST ASCENSIONISTS' stays - that is a person speaking about their own route." },
  { id: "wa_unnamed_4", col: "pro_tips",
    find: " (rated 3 stars on Mountain Project)",
    repl: "" },

  // ---- nothing is published online: the finding stays, the title goes ----
  { id: "wa_andersons_thumb_standard", col: "pro_tips",
    find: "Not documented on Mountain Project or SummitPost - " + Q + "Olympic Mountains: A Climbing Guide" + Q + " (Olympic Mountain Rescue) is the best source for a confirmed technical grade",
    repl: "Not documented online - a printed climbing guide is the best source for a confirmed technical grade" },
  { id: "wa_the_perfect_crime_with_variations", col: "pro_tips",
    find: "Carry Blake Herrington's Cascades Rock topo, since the wall's many variations aren't fully documented on Mountain Project.",
    repl: "Carry a printed topo, since the wall's many variations aren't fully documented online." },

  // ---- the attribution IS the verb ----
  { id: "wa_cordwood", col: "pro_tips",
    find: "The Mountain Project entry for this route was posted specifically as a hazard alert",
    repl: "The published entry for this route was posted specifically as a hazard alert" },
  { id: "wa_ingalls_peak_east_ne_ridge_route", col: "pitch_detail",
    find: "Mountain Project explicitly flags this as unsuitable for an average 5.6 leader.",
    repl: "this is explicitly flagged as unsuitable for an average 5.6 leader." },
  { id: "wa_lone_wolf", col: "pro_tips",
    find: "Mountain Project's area description specifically flags sharp, loose rock",
    repl: "the published area description specifically flags sharp, loose rock" },
  { id: "wa_the_brothers_traverse", col: "pro_tips",
    find: "Mountain Project recommends doing the traverse north-to-south",
    repl: "Published beta recommends doing the traverse north-to-south" },
  { id: "wa_don_t_climb_that_she_said", col: "partner_requirements",
    find: "(per Mountain Project's route description: a gaston with the left hand",
    repl: "(per the published route description: a gaston with the left hand" },

  // ---- separable tag ----
  { id: "wa_hottentot", col: "pitch_detail",
    find: "reported as not freed as of 2015 per Mountain Project.",
    repl: "reported as not freed as of 2015." },
  { id: "wa_mount_daniel_lynch_glacier", col: "pitch_detail",
    find: "Total length ~1,500 ft per Mountain Project;",
    repl: "Total length ~1,500 ft as published;" },
  { id: "wa_little_sister_north_face", col: "pitch_detail",
    find: "(matches Mountain Project's 600 ft/4-pitch total)",
    repl: "(matches the published 600 ft/4-pitch total)" },
  { id: "wa_milk_n_honey", col: "pitch_detail",
    find: "the four described pitches and Mountain Project's 1,200 ft total",
    repl: "the four described pitches and the published 1,200 ft total" },
  { id: "wa_the_tipping_point", col: "pitch_detail",
    find: "so the pitch total matches Mountain Project's 1,000 ft route length",
    repl: "so the pitch total matches the published 1,000 ft route length",
    note: "the value ends 'the individual figure is not separately sourced' - an honest limit, untouched." },
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
// The anchor disagreement, the fatality and the first ascensionist's words are the reasons these
// sentences exist. Assert them rather than trusting the rewrites around them.
for (const [id, col, needle] of [
  ["wa_kangaroo_temple_north_face", "rappel_detail", "judge what is actually there"],
  ["wa_northeast_face_direct", "seasonal_hazards", "at least one fatality"],
  ["wa_himmelhorn_wild_hair_crack", "pro_tips", "first ascensionists"],
  ["wa_colchuck_peak_northeast_couloir", "best_season", "accounts disagree on the ideal window"],
  ["wa_the_tipping_point", "pitch_detail", "not separately sourced"],
]) {
  if (!leaves(after.get(id)[col]).join(" ").includes(needle)) {
    console.error(`CONTENT LOST: ${id}.${col} no longer says "${needle}"`); bad++;
  }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${EDITS.length} edit(s) clean; the anchor disagreement, the fatality and the FA's words intact.`);
process.exit(bad ? 1 : 0);
