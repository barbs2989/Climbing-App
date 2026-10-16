// The catalog explaining ITSELF to a climber, in the columns a climber actually reads.
//
//     "WHY THIS ENTRY IS THINNER THAN ITS NEIGHBOURS, SAID PLAINLY: Swiss Peak carries one route
//      in the catalog and no first-ascent record, the area it is filed under has NO STORED
//      COORDINATE AT ALL, and nothing published locates a feature at the foot of the southwest
//      face."
//
// That is a missing database field described to somebody deciding whether to climb a mountain.
// Others are milder — "the most important line IN THIS ENTRY", "the mistake this entry exists to
// prevent", "the south-facing snow line THIS CATALOG FILES as the Southeast Face" — but they are
// all the same move: the page talking about the page.
//
// THE CONTENT IS GOOD IN EVERY ONE AND ONLY THE FRAME IS WRONG, which is why none of these is a
// deletion. "WHY THIS ENTRY DOES NOT NAME A FLAKE OR A CRACK AT THE TOE: nothing published locates
// one" is telling a climber something genuinely useful — stop looking for a landmark that is not
// recorded. It becomes "THERE IS NO NAMED FLAKE OR CRACK AT THE TOE", which says the same thing
// about the ROUTE rather than about our record of it.
//
// "FILED UNDER" IS MOSTLY NOT THIS DEFECT, and that is the precision rule. Nine hits read
// "this route is NOT on Eldorado Peak itself, despite being filed under the same area" (Austera,
// Tepeh Towers, Klawatti) or "THIS ROUTE IS FILED UNDER THE MOUNTAIN" (Bread Loaf, a roadside
// boulder listed under Rainier). Those explain what the reader is LOOKING AT — a route sitting in
// a list under a peak it is not on — and a climber who ignores them goes up the wrong mountain.
// They stay. So does "This entry gully is frequently snow-filled": an entry gully is climbing
// English, not bookkeeping.
//
// SCOPED TO COLUMNS THAT RENDER. `access._raw` was also swept for this and turned out to be a
// NON-finding: 166 WA routes carry that key, nothing in the app reads it (the only mentions in
// source are the contribute merge preserving it and a comment saying so), so its contents cannot
// reach anybody. Two `_raw` bookkeeping blocks were dropped in the previous batch; that was
// harmless tidying rather than a fix, a third survives on wa_south_rib, and all three are inert.
// Do not read "166" as a backlog.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const DASH = "—";

const EDITS = [
  // ---- the catalog naming itself ----
  { id: "wa_swiss_peak_standard_route", col: "approach_variants",
    find: "WHY THIS ENTRY IS THINNER THAN ITS NEIGHBOURS, SAID PLAINLY: Swiss Peak carries one route in the catalog and no first-ascent record, the area it is filed under has NO STORED COORDINATE AT ALL, and nothing published locates a feature at the foot of the southwest face.",
    repl: "WHY THERE IS SO LITTLE HERE, SAID PLAINLY: Swiss Peak has one described route and no first-ascent record, the peak itself is not precisely located, and nothing published locates a feature at the foot of the southwest face.",
    note: "the worst of them - a missing coordinate COLUMN described to a climber. Every fact survives; only the database framing goes." },
  { id: "wa_swiss_peak_standard_route", col: "approach_variants",
    find: "No stored coordinate for the peak and very little published route detail",
    repl: "Very little published route detail, and the peak itself is imprecisely located" },
  { id: "wa_klawatti_peak_sw_buttress", col: "approach_variants",
    find: "THE SOUTH-FACING SNOW LINE THIS CATALOG FILES AS THE SOUTHEAST FACE",
    repl: "THE SOUTH-FACING SNOW LINE KNOWN AS THE SOUTHEAST FACE" },
  { id: "wa_south_face_12", col: "approach_variants",
    find: "this catalog's stored approach text for this route describes it as though it were the route",
    repl: "the approach description on this route describes it as though it were the route",
    note: "a warning that ANOTHER FIELD on the same page is misleading. The warning is real and stays; only 'this catalog's stored' goes." },
  { id: "wa_mount_ann_scramble", col: "approach_variants",
    find: "This catalog has already had one route carrying the wrong Lake Ann's trailhead.",
    repl: "One route has already been recorded with the wrong Lake Ann's trailhead.",
    note: "two Lake Anns really do get confused - the warning is the content." },
  { id: "wa_mount_ann_scramble", col: "approach_variants",
    find: "one of which has already misplaced a trailhead in this catalog",
    repl: "and one of them has already been given the wrong trailhead" },
  { id: "wa_north_ridge_7", col: "approach_variants",
    find: "a coincidence worth being clear about rather than a filing error.",
    repl: "a coincidence worth being clear about rather than a mistake." },
  { id: "wa_chimney_rock_west_face", col: "rope_note",
    find: "The West Face/South Summit line described in the route list has limited independent documentation " + DASH + " gear sized comparably to the East Face standard route as the closest analog.",
    repl: "The West Face/South Summit line has limited independent documentation " + DASH + " the rack here is sized by comparison with the East Face standard route, as the closest analog.",
    note: "a RACK claim, so the hedge must survive: 'limited independent documentation' and 'closest analog' both stay. Only 'the route list' - our import - goes." },

  // ---- "this entry" as the subject ----
  { id: "wa_ruth_mountain_south_slopes", col: "approach_variants",
    find: "WHICH IS THE POINT THIS ENTRY MOST WANTS TO MAKE.",
    repl: "AND THAT IS THE MOST IMPORTANT THING ON THIS ROUTE." },
  { id: "wa_ottohorn_southeast_route", col: "approach_variants",
    find: "THE MOST IMPORTANT LINE IN THIS ENTRY:",
    repl: "THE MOST IMPORTANT LINE HERE:" },
  { id: "wa_cathedral_rock_northeast_buttress", col: "approach_variants",
    find: "WHICH IS THE MOST USEFUL THING IN THIS ENTRY:",
    repl: "WHICH IS THE MOST USEFUL THING TO KNOW ABOUT THIS ROUTE:" },
  { id: "wa_himmelhorn_stonehenge", col: "approach_variants",
    find: "WHY THIS ENTRY IS SHORTER THAN ITS NEIGHBOURS:",
    repl: "WHY THERE IS SO LITTLE DETAIL ABOVE THE COL:",
    note: "one recorded ascent and a description that stops at the col is a real statement about how much is KNOWN. It survives without comparing entries." },
  { id: "wa_witches_tower_southwest_corner", col: "approach_variants",
    find: "What separates this entry from the south face one is",
    repl: "What separates this route from the south face one is" },
  { id: "wa_mcmillan_spire_west_southwest_ridge", col: "approach_variants",
    find: "WHY THIS ENTRY DOES NOT NAME A FLAKE OR A CRACK AT THE TOE:",
    repl: "THERE IS NO NAMED FLAKE OR CRACK AT THE TOE:" },
  { id: "wa_cutthroat_peak_northeast_face", col: "approach_variants",
    find: "WHY THIS ENTRY DOES NOT NAME A CRACK OR A FLAKE AT THE START: no per-route detail beyond this shared approach is on file for this line",
    repl: "THERE IS NO NAMED CRACK OR FLAKE AT THE START: no per-route detail beyond this shared approach is published for this line" },
  { id: "wa_mount_stuart_the_gendarme", col: "approach_variants",
    find: "What this entry is for is the decision made at its base",
    repl: "What matters at the Gendarme is the decision made at its base" },
  { id: "wa_boving_christensen", col: "approach_variants",
    find: "it is the reason this entry is worth having",
    repl: "it is what makes the start findable" },
  { id: "wa_e_se_face", col: "approach_variants",
    find: "HONEST LIMIT ON THIS ENTRY:",
    repl: "HONEST LIMIT:" },
  { id: "wa_east_ridge_4", col: "approach_variants",
    find: "WHY THIS ENTRY IS HONEST ABOUT ITS LIMITS:",
    repl: "WHAT IS NOT KNOWN:" },
  { id: "wa_goode_mountain_southwest_couloir", col: "approach_variants",
    find: "an unmarked scramble straight into a gully is not this entry.",
    repl: "an unmarked scramble straight into a gully is not this route." },
  { id: "wa_southeast_ridge_se_corner", col: "approach_variants",
    find: "and it is the mistake this entry exists to prevent:",
    repl: "and it is the mistake to avoid:" },
  { id: "wa_summit_chief_mountain_north_face", col: "approach_variants",
    find: "There is no published discriminating feature at ground level beyond the ramp, and this entry does not invent one.",
    repl: "There is no published discriminating feature at ground level beyond the ramp, and there is nothing else to look for.",
    note: "a DOCUMENTED NEGATIVE. The reframe keeps it and turns it into an instruction: stop searching." },
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

// Accumulate per (id, col) so two edits on one value both land. Composite key built ONE way, as
// the escape \x00 rather than a literal NUL - git renders a file holding one as binary and nobody
// can read the diff.
const staged = new Map();
const refusals = [];
for (const e of EDITS) {
  const key = `${e.id}\x00${e.col}`;
  if (!staged.has(key)) staged.set(key, { id: e.id, col: e.col, value: byId.get(e.id)[e.col], edits: [] });
  const s = staged.get(key);
  const n = countIn(s.value, e.find);
  if (n !== 1) {
    refusals.push(`${e.id} ${e.col}: found ${n} occurrence(s) of ${JSON.stringify(e.find.slice(0, 60))}, expected exactly 1`);
    continue;
  }
  s.value = replaceIn(s.value, e.find, e.repl);
  s.edits.push(e);
}
if (refusals.length) {
  console.error(`REFUSED - ${refusals.length} edit(s) did not match exactly once:\n  ` + refusals.join("\n  "));
  process.exit(1);
}

// Print the WHOLE resulting leaf, never the find/repl pair: cutting or reframing a clause strands
// a capital or a connective that is invisible from the pair alone, and that has been caught by
// reading the output in seven consecutive batches.
for (const s of staged.values()) {
  console.log(`\n### ${s.id}  ${s.col}`);
  for (const e of s.edits) if (e.note) console.log(`   why: ${e.note}`);
  const before = new Set(leaves(byId.get(s.id)[s.col]));
  for (const l of leaves(s.value)) if (!before.has(l)) console.log(`   => ${l.length > 500 ? l.slice(0, 500) + " ..." : l}`);
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
    console.error(`NOT APPLIED: ${e.id} ${e.col} still contains ${JSON.stringify(e.find.slice(0, 50))}`);
    bad++;
  }
}
// The reason several of these values exist is the thing they admit. Assert the findings rather
// than trusting the rewrites around them.
for (const [id, col, needle] of [
  ["wa_swiss_peak_standard_route", "approach_variants", "no first-ascent record"],
  ["wa_summit_chief_mountain_north_face", "approach_variants", "nothing else to look for"],
  ["wa_himmelhorn_stonehenge", "approach_variants", "one recorded ascent"],
  ["wa_chimney_rock_west_face", "rope_note", "limited independent documentation"],
  ["wa_mcmillan_spire_west_southwest_ridge", "approach_variants", "nothing published locates one"],
  ["wa_east_ridge_4", "approach_variants", "nothing published names the col"],
  ["wa_mount_ann_scramble", "approach_variants", "wrong Lake Ann"],
]) {
  if (!leaves(after.get(id)[col]).join(" ").includes(needle)) {
    console.error(`CONTENT LOST: ${id}.${col} no longer says "${needle}"`); bad++;
  }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${EDITS.length} edit(s) clean; every documented negative and hedge intact.`);
process.exit(bad ? 1 : 0);
