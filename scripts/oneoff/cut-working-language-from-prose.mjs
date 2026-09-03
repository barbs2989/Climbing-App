// Prose addressed to whoever BUILDS the page rather than to whoever climbs the route.
//
// This is a different defect from a citation and in places a worse one: it does not merely say
// where a fact came from, it exposes the CATALOG to the climber.
//
//     "April-June is the most common window (matches this record's own `season` field)"
//     "the same standard mountaineering line as the Corkscrew Route (routeId wa_sloan_peak_corkscrew)"
//     "precise round-trip mileage/hours not confirmed in this research pass"
//
// The first names a DATABASE COLUMN at a climber, the second a primary key. Neither means
// anything to a person standing at a trailhead.
//
// MEASURED FIRST: 24 candidates across 8,365 WA routes, of which SEVEN ARE FALSE POSITIVES and
// are deliberately left alone. "don't use it as a descent shortcut", "do not reuse any old
// rappel webbing/tat found at the notch", "verify before departure", "verify before relying on
// the BC approach" are instructions to a CLIMBER and good ones; "NWAC forecasts ... do not apply
// to this Jul-Sep climbing season" is a fact about the forecast. And wa_concord_tower_north_face's
// "This entry gully is frequently snow-filled" is not record-keeping voice at all — an ENTRY
// GULLY is the gully you enter the route by, ordinary climbing English. A sweep on the pattern
// would have mangled a correct sentence.
//
// DOCUMENTED NEGATIVES ARE KEPT, only their voice changes. Four routes say "no published
// approach, pitch-by-pitch, or gear beta was found beyond this record" — CLAUDE.md is explicit
// that a recorded failure to find something is EVIDENCE and writing over one is fabrication. The
// finding survives; "beyond this record" does not.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const DASH = "—";
const Q = "'";
const BT = "`";

const EDITS = [
  // ---- the catalog's own schema, on a climber's screen ----
  {
    id: "wa_whitehorse_mountain_nw_shoulder", col: "best_season",
    find: " (matches this record's own " + BT + "season" + BT + " field)",
    repl: "",
    note: "names a DATABASE COLUMN at a climber. Nothing survives the cut because nothing was said.",
  },
  // ORDER MATTERS: this column holds two leaves, one a prefix of the other. The longer find must
  // run first or neither matches exactly once.
  {
    id: "wa_whitehorse_mountain_nw_shoulder", col: "seasonal_guidance",
    find: "Prime window per this record's own season field " + DASH,
    repl: "Prime window " + DASH,
  },
  {
    id: "wa_whitehorse_mountain_nw_shoulder", col: "seasonal_guidance",
    find: "Prime window per this record's own season field",
    repl: "Prime window",
  },
  {
    id: "wa_sloan_peak_r1", col: "beta",
    find: "This entry corresponds to the same standard mountaineering line as the Corkscrew Route (routeId wa_sloan_peak_corkscrew)",
    repl: "This is the same standard mountaineering line as the Corkscrew Route",
    note: "exposes a PRIMARY KEY. `routeId wa_sloan_peak_corkscrew` is not a thing a climber can use.",
  },
  // CAUGHT BY THE PREVIEW, and it is the stranded-reference shape one PR after I recorded it:
  // fixing the opening clause left "this entry's grade" and "the given grade/discipline data"
  // standing further down the SAME value.
  {
    id: "wa_sloan_peak_r1", col: "beta",
    find: "this entry's grade (Grade II, glacier/snow + Class 3 scramble) matches",
    repl: "this route's grade (Grade II, glacier/snow + Class 3 scramble) matches",
  },
  {
    id: "wa_sloan_peak_r1", col: "beta",
    find: "a distinct, much harder climb not reflected in the given grade/discipline data.",
    repl: "a distinct, much harder climb than the grade shown here.",
  },
  {
    id: "wa_carne_mountain_trail_route", col: "descent_text",
    find: " matching this route's on-file stats",
    repl: "",
  },
  {
    id: "wa_carne_mountain_trail_route", col: "descent_text",
    find: "rather than the default descent for this entry.",
    repl: "rather than the default descent.",
  },

  // ---- "this entry" as the subject: the catalog talking about itself ----
  {
    id: "wa_mount_fricaba_standard", col: "overview",
    find: "This entry covers the standard approach",
    repl: "This route takes the standard approach",
  },
  {
    id: "wa_half_moon_southwest_slopes", col: "overview",
    find: "This entry covers the Southwest Ridge",
    repl: "This route takes the Southwest Ridge",
  },
  {
    id: "wa_north_twin_sister_scramble", col: "beta",
    find: "This entry is treated as the general scrambling description of that same route",
    repl: "This is the general scrambling description of that same route",
  },
  {
    id: "wa_north_twin_sister_scramble", col: "beta",
    find: "while the sibling " + Q + "West Ridge" + Q + " entry carries the more technical framing",
    repl: "while the separate " + Q + "West Ridge" + Q + " route carries the more technical framing",
  },

  // ---- documented negatives: the finding stays, the record-keeping voice goes ----
  {
    id: "wa_ignorant_bliss", col: "overview",
    find: "gear beta was found beyond this record.",
    repl: "gear beta could be found.",
    note: "a DOCUMENTED NEGATIVE. Writing over one is fabrication, so only the voice changes.",
  },
  { id: "wa_spoil_ill", col: "overview", find: "gear beta was found beyond this record.", repl: "gear beta could be found." },
  { id: "wa_commandho_pillar", col: "overview", find: "gear beta was found beyond this record.", repl: "gear beta could be found." },
  { id: "wa_bowl_packer", col: "overview", find: "gear beta was found beyond this record.", repl: "gear beta could be found." },
  {
    id: "wa_ultramega_ok", col: "rappel_count_note",
    find: "not published in any account read for this entry.",
    repl: "not published in any available account.",
  },

  // ---- the research act, narrated to the climber ----
  {
    id: "wa_old_snowy_mountain_r1", col: "partner_requirements",
    find: "not confirmed in this research pass",
    repl: "not confirmed",
  },
  {
    id: "wa_earl_peak_standup_creek_route", col: "approach",
    find: "NOTE: as of this research date, Standup Creek Trail",
    repl: "Standup Creek Trail",
    note: "the value states its own closure order dates (May 20-Dec 31, 2026) and gives the Cle Elum Ranger District number, so nothing that lets a reader judge it is lost. The RANGER NUMBER STAYS - a district phone line is contact detail, not a source.",
  },
  {
    id: "wa_kololo_peaks_standard", col: "climate",
    find: "multiple trip reports researched for this route noted rain",
    repl: "multiple trip reports noted rain",
  },

  // ---- an instruction to the PIPELINE, carrying a real namesake warning inside it ----
  {
    id: "wa_mount_bigelow_tribute_to_richard", col: "pro_tips",
    find: "Do not import Mountain Project beta for " + Q + "Mount Bigelow" + Q + " " + DASH + " MP's page of that name is the Arizona peak above Tucson and has nothing to do with this route.",
    repl: "Do not confuse this peak with the Mount Bigelow above Tucson, Arizona - a different mountain that shares the name.",
    note: "BOTH defects in one sentence: an instruction addressed to an enrichment pass, and a publisher. The namesake warning is real and this catalog keeps paying for that exact class, so it survives in a form aimed at a climber.",
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
// The four documented negatives must still SAY that nothing was found, and the Earl Peak value
// must still carry its ranger number. Assert both rather than trusting the edits nearby.
for (const id of ["wa_ignorant_bliss", "wa_spoil_ill", "wa_commandho_pillar", "wa_bowl_packer"]) {
  if (!leaves(after.get(id).overview).join(" ").includes("could be found")) {
    console.error(`DOCUMENTED NEGATIVE LOST from ${id}.overview`); bad++;
  }
}
if (!leaves(after.get("wa_earl_peak_standup_creek_route").approach).join(" ").includes("509-852-1100")) {
  console.error("RANGER DISTRICT NUMBER LOST from wa_earl_peak_standup_creek_route.approach"); bad++;
} else console.log("ranger district number 509-852-1100 still present; all four documented negatives intact.");
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${EDITS.length} edit(s) re-read clean.`);
process.exit(bad ? 1 : 0);
