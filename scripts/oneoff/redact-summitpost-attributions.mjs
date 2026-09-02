// Batch 10: the SummitPost family.
//
// ONE OF THESE CARRIES A PHONE NUMBER, which is the class this catalog deliberately KEEPS.
// wa_chianti_spire_lichen_bouquet's emergency field reads "SummitPost also lists the older
// district number 509-996-2266" — the attribution is a citation and the number is the single
// most actionable thing in the value. The repair drops the publisher and keeps the number.
// Getting that backwards would delete a ranger district's phone number from an emergency field,
// which is the failure mode the 589 kept land-manager references exist to prevent.
//
// LEFT ALONE:
//   * wa_mount_worthington_standard — "a GPS track or Mountaineers/SummitPost beta is strongly
//     advised" tells a climber where to go and get beta. Open decision 5, a human's call.
//   * wa_chianti_spire_lichen_bouquet's pro_tips names four sources DISAGREEING about the grade
//     and the commitment grade, ending "do not be surprised if the guidebook you carry differs".
//     The disagreement is the content and the rewrite needs the whole value read, not a clause.
//
// A NOTE ON THE DAVIS PEAK CLUSTER. Four values describe what one party did — camped at the
// saddle, fitted two tents on a snow ledge, used ice-axe belays, got up "through careful map
// study and blind luck". These are FIELD OBSERVATIONS, and they keep their force without naming
// who made them: "one January party", "one party camped". What must not happen is promoting them
// to the page's own voice, because a single party's choice is not a recommendation.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const Q = "'";

// CAPITALS. Five repls below are deliberately lowercase. The publisher was the FIRST WORD of
// its clause, and those clauses sit after a semicolon or a dash — so a naturally-capitalised
// replacement lands mid-sentence. This has happened in four consecutive batches now; it is a
// property of the shape (attributive prefix opening a clause), not bad luck, and it is invisible
// from the find/repl pair. The applier printing the whole resulting value is what catches it.
const EDITS = [
  // ---- the operational half is the phone number, and it stays ----
  {
    id: "wa_chianti_spire_lichen_bouquet", col: "emergency",
    find: "SummitPost also lists the older district number",
    repl: "An older district number on file is",
    note: "the PHONE NUMBER is kept - it is the actionable line in an emergency field, and the same class as the 589 land-manager references this catalog keeps. Only the publisher goes.",
  },

  // ---- one party's field observations: reported, never promoted to the page's voice ----
  {
    id: "wa_davis_peak_nc_south_slope_and_ridge", col: "rappels",
    find: "SummitPost's January party used ice-axe belays",
    repl: "one January party used ice-axe belays",
  },
  {
    id: "wa_davis_peak_nc_south_slope_and_ridge", col: "itinerary",
    find: "SummitPost's round-trip figure for the direct line is 6.2 miles.",
    repl: "The round-trip figure on file for the direct line is 6.2 miles.",
  },
  {
    id: "wa_davis_peak_nc_south_slope_and_ridge", col: "itinerary",
    find: "Overnight: SummitPost's party camped at the 5,720+ ft saddle",
    repl: "Overnight: one party camped at the 5,720+ ft saddle",
  },
  {
    id: "wa_davis_peak_nc_south_slope_and_ridge", col: "pitch_detail",
    find: "SummitPost's party fitted two tents on a snow ledge near it.",
    repl: "one party fitted two tents on a snow ledge near it.",
  },
  {
    id: "wa_davis_peak_nc_south_slope_and_ridge", col: "pro_tips",
    find: "SummitPost's party made it up without backtracking",
    repl: "one party made it up without backtracking",
  },
  {
    id: "wa_lichtenberg_mountain_west_face", col: "watch_out",
    find: "SummitPost's climbers' log records a party being repelled",
    repl: "a climbers' log records a party being repelled",
  },

  // ---- the attribution IS the verb ----
  {
    id: "wa_mount_appleton_standard", col: "descent",
    find: "SummitPost notes that dropping into the heather/talus basin",
    repl: "Dropping into the heather/talus basin",
  },
  {
    id: "wa_cannon_mountain_northeast_ridge", col: "best_season",
    find: "SummitPost notes an early-season variation that drops",
    repl: "An early-season variation drops",
  },
  {
    id: "wa_cannon_mountain_northeast_ridge", col: "pro_tips",
    find: "Do the loop in the direction SummitPost recommends",
    repl: "Do the loop in the recommended direction",
  },
  {
    id: "wa_cannon_mountain_northeast_ridge", col: "pro_tips",
    find: "SummitPost describes the full NE Ridge-plus-Prusik-Pass loop as at least a 12-hour day.",
    repl: "the full NE Ridge-plus-Prusik-Pass loop is described as at least a 12-hour day.",
  },
  {
    id: "wa_chair_peak_east_face", col: "best_season",
    find: "SummitPost puts the peak's summer rock routes at May through October.",
    repl: "the peak's summer rock routes run May through October.",
  },
  {
    id: "wa_chianti_spire_lichen_bouquet", col: "best_season",
    find: "SummitPost lists the spire's seasons as summer and fall.",
    repl: "The spire's seasons are summer and fall.",
  },
  {
    id: "wa_jack_mountain_southwest_ridge", col: "best_season",
    find: "SummitPost advises waiting until the snow has melted",
    repl: "wait until the snow has melted",
  },
  {
    id: "wa_jack_mountain_southwest_ridge", col: "pro_tips",
    find: "SummitPost calls this the shortest approach to Jack but warns the Little Jack traverse takes",
    repl: "This is the shortest approach to Jack, but the Little Jack traverse takes",
  },
  {
    id: "wa_jack_mountain_southwest_ridge", col: "emergency",
    find: "SummitPost notes the chances of encountering a ranger on this ridge are minimal",
    repl: "The chances of encountering a ranger on this ridge are minimal",
  },
  {
    id: "wa_bedal_peak_standard", col: "pitch_detail",
    find: "described by SummitPost as an easy Class 2-3 finish",
    repl: "described as an easy Class 2-3 finish",
  },

  // ---- avalanche warning: publisher out, warning untouched ----
  {
    id: "wa_guye_peak_southeast_gully", col: "best_season",
    find: "SummitPost's Guye Peak page warns explicitly that avalanches are common",
    repl: "avalanches are explicitly reported to be common",
    note: "the NWAC forecast reference earlier in the same value is a LIVE reference and stays; only the SummitPost attribution goes, and the warning itself is untouched.",
  },
  {
    id: "wa_guye_peak_southeast_gully", col: "pro_tips",
    find: "SummitPost's page for this peak warns outright that avalanches are common here",
    repl: "Avalanches are reported to be common here",
  },

  // ---- a list of sites, inside a claim that survives without it ----
  {
    id: "wa_lemah_mountain_east_route", col: "crowds",
    find: "trip reports (SummitPost, CascadeClimbers, WTA, NWHikers) consistently describe Lemah as " + Q + "infrequently visited" + Q,
    repl: "trip reports consistently describe Lemah as infrequently visited",
    note: "the site list goes and the quotation is unquoted - with its speaker removed the quote marks cite nobody.",
  },
  {
    id: "wa_ruby_mountain_south_ridge", col: "best_season",
    find: "per SummitPost trip reports.",
    repl: "per trip reports.",
  },
  {
    id: "wa_dome_peak_dome_glacier", col: "itinerary",
    find: "SummitPost and trip reports agree this round trip",
    repl: "Trip reports agree this round trip",
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
  console.error("\nNothing was written. Re-read the live value before changing the declaration.");
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
// The phone number is the point of one of these edits, so assert it survived rather than
// trusting that a find/replace elsewhere in the value left it alone.
const phone = leaves(after.get("wa_chianti_spire_lichen_bouquet").emergency).join(" ");
if (!phone.includes("509-996-2266")) { console.error("PHONE NUMBER LOST from wa_chianti_spire_lichen_bouquet.emergency"); bad++; }
else console.log("ranger district number 509-996-2266 still present.");
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${EDITS.length} edit(s) re-read clean.`);
process.exit(bad ? 1 : 0);
