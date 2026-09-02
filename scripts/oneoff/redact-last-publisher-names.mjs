// The last six values in the WA catalog that name a publisher.
//
// A WORKING-LANGUAGE LEAK IN AN EMERGENCY FIELD, which is the worst placement found in this
// sweep. wa_golden_age's `emergency` reads:
//
//     "Cell coverage is unreliable at Washington Pass; always call 911 first. Route not in the
//      original given route list — added because it is a well-documented, distinct named line on
//      the same wall (Mountain Project + American Alpine Club coverage)."
//
// The second sentence is a note about why the ROW exists, written to whoever was building the
// catalog, sitting in the field a climber reads when something has gone wrong. It goes; the
// 911 instruction is untouched.
//
// AND THE FOUR-SOURCE DISAGREEMENT I PARKED TWO BATCHES AGO. Chianti Spire's pro_tips records
// that accounts disagree about the first-ascent partners AND about the commitment grade, ending
// "do not be surprised if the guidebook you carry differs". The disagreement is the content, the
// climbers' NAMES are content (people, not publishers), and "the guidebook you carry" is the
// book in the reader's hands. Only the four mastheads go.
//
// NOT TOUCHED, and it is the one flagged value left in WA: wa_chimney_peak_the_chimney's
// what_to_bring entry "Green Trails / CalTopo map and compass". This is a GEAR ITEM naming which
// map to carry, and the generic form loses something real — Green Trails is the standard
// Washington series, and "map and compass" does not tell a climber which map to buy. That is the
// test applied when the map-app WARNINGS were cut: the generic form lost nothing there, and
// loses something here.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const Q = "'";
const DASH = "—";

const EDITS = [
  {
    id: "wa_golden_age", col: "emergency",
    find: " Route not in the original given route list " + DASH + " added because it is a well-documented, distinct named line on the same wall (Mountain Project + American Alpine Club coverage).",
    repl: "",
    note: "WORKING LANGUAGE in an EMERGENCY field - a note about why the row exists, addressed to whoever built the catalog. 'Cell coverage is unreliable at Washington Pass; always call 911 first' is untouched.",
  },
  {
    id: "wa_chianti_spire_lichen_bouquet", col: "pro_tips",
    find: "Sources disagree on the first-ascent partners (AAJ: Kearney, Culberson and Kelley; Beckey/SummitPost: Kearney and Houston)",
    repl: "Accounts disagree on the first-ascent partners (Kearney, Culberson and Kelley in one, Kearney and Houston in another)",
    note: "the DISAGREEMENT is the content and the climbers' names are people rather than publishers. 'do not be surprised if the guidebook you carry differs' also stays - that is the book in the reader's hands.",
  },
  {
    id: "wa_east_ridge_3", col: "partner_requirements",
    find: "Mountain Project's own route notes state plainly " + Q + "if you think you need more specific beta, this is likely not the route for you." + Q,
    repl: "the published route notes state plainly that if you think you need more specific beta, this is likely not the route for you.",
    note: "a quotation cannot survive its speaker; unquoted it becomes the page's own sentence and the warning is unchanged.",
  },

  // ---- the last of the web analytics ----
  {
    id: "wa_free_mojo", col: "crowds",
    find: "; lowest Mountain Project monthly views (~24) among the SEWS technical routes researched",
    repl: "",
    note: "page views AND 'researched', which dates the claim to when somebody looked. The firsthand 2016 estimate of about five ascents - a real observation - stands.",
  },
  {
    id: "wa_north_ridge_3", col: "crowds",
    find: "Moderate-low (24 Mountain Project votes, ~82 monthly page views " + DASH + " roughly 1/4–1/5 the engagement of the standard South Buttress)",
    repl: "Moderate-low " + DASH + " noticeably quieter than the standard South Buttress",
    note: "votes and page views are a website's engagement figures. The comparison they supported survives.",
  },
  {
    id: "wa_ruth_icy_traverse", col: "crowds",
    find: " (~23 Mountain Project monthly views, ~10 ratings)",
    repl: "",
  },
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
for (const [id, col, needle] of [
  ["wa_golden_age", "emergency", "always call 911 first"],
  ["wa_chianti_spire_lichen_bouquet", "pro_tips", "the guidebook you carry differs"],
  ["wa_east_ridge_3", "partner_requirements", "not the route for you"],
  ["wa_free_mojo", "crowds", "about 5 ascents to date"],
]) {
  if (!leaves(after.get(id)[col]).join(" ").includes(needle)) {
    console.error(`CONTENT LOST: ${id}.${col} no longer says "${needle}"`); bad++;
  }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${EDITS.length} edit(s) clean; the 911 instruction, the disagreement and both warnings intact.`);
process.exit(bad ? 1 : 0);
