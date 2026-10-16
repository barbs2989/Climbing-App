// Rack columns, batch 3 — the last of them.
//
// Four more Dikes routes with the redundant "confirmed as Sport ... on Mountain Project's
// official area page" clause, plus eight one-offs. After this the four columns #1422 exposed
// carry one flagged value, and it is deliberate: wa_chimney_peak_the_chimney's what_to_bring
// entry "Green Trails / CalTopo map and compass" names a MAP THE CLIMBER CARRIES.
//
// THE HONEST NEGATIVES ARE THE BEST WRITING IN THESE COLUMNS and every one is kept:
// "no published rack or pitch-by-pitch beta found", "doesn't state rope length explicitly",
// "no indexed route-specific gear list found online". A rack note that says what it does not
// know is worth more than one that guesses.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const Q = "'";

const DIKES = [
  ["wa_red_zinger", ""], ["wa_unknown_climb_up_the_castle", ""],
  ["wa_redtail_arete", ", 2.5-star,"], ["wa_safety_dance", ", 1-star,"],
].map(([id, stars]) => ({
  id, col: "rope_note",
  find: "; confirmed as Sport" + stars + " on Mountain Project's official area page.",
  repl: ".",
}));

const EDITS = [
  ...DIKES,

  // ---- documented negatives: the finding stays, the title and the research act go ----
  {
    id: "wa_remmel_mountain_nw_ridge", col: "rope_note",
    find: "No indexed route-specific gear list found online (guidebook coverage is Beckey's Cascade Alpine Guide Vol. 3, not available via web search).",
    repl: "No indexed route-specific gear list could be found online, and the published coverage for this peak is not available digitally.",
    note: "a named title AND 'via web search', which dates the claim to when somebody looked. The finding - nothing is online - survives, and so does the inference caveat after it.",
  },
  {
    id: "wa_south_face", col: "rope_note",
    find: "Confirmed on Mountain Project as Trad 5.6 at Vasiliki Tower",
    repl: "Confirmed as Trad 5.6 at Vasiliki Tower",
    note: "the value continues 'but no published rack or pitch-by-pitch beta found' - untouched.",
  },
  {
    id: "wa_the_west_face", col: "rope_note",
    find: "Mountain Project doesn't state rope length explicitly",
    repl: "Published descriptions do not state rope length explicitly",
  },

  // ---- the attribution IS the verb ----
  {
    id: "wa_ride_the_lightning_2", col: "rope_note",
    find: "Mountain Project: " + Q + "Single rack and a dozen draws and some longer slings should do it." + Q,
    repl: "Published beta calls for a single rack, a dozen draws and some longer slings.",
    note: "a quotation cannot survive its speaker; unquoted it becomes the page's own sentence.",
  },
  {
    id: "wa_washington_ellinor_traverse_ridge", col: "rope_note",
    find: "Grade II alpine trad/snow route per Mountain Project; page explicitly states " + Q + "rock is horrible, protection is problematic" + Q,
    repl: "Grade II alpine trad/snow route; published descriptions explicitly state that the rock is horrible and the protection problematic",
    note: "'page explicitly states' would have been a STRANDED REFERENCE once the publisher went - the page belongs to a publisher the value no longer names. Rewritten in one edit rather than left for the preview to catch.",
  },
  {
    id: "wa_summit_chief_mountain_south_route", col: "rope_note",
    find: "SummitPost's dedicated " + Q + "Standard South Route" + Q + " page and Mazamas trip logs describe the SE Ridge line",
    repl: "Published descriptions and trip logs describe the SE Ridge line",
  },

  // ---- separable tag ----
  {
    id: "wa_scramble_route", col: "rope_note",
    find: "Class 3/4 rock scramble per Mountaineers/SummitPost.",
    repl: "Class 3/4 rock scramble per published descriptions.",
  },
  {
    id: "wa_south_face_center", col: "rope_note",
    find: "Verified via Mountain Project: climbable in one ~220ft (67m) pitch",
    repl: "Verified: climbable in one ~220ft (67m) pitch",
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
  ["wa_south_face", "rope_note", "no published rack or pitch-by-pitch beta found"],
  ["wa_remmel_mountain_nw_ridge", "rope_note", "many parties simul-climb or solo"],
  ["wa_washington_ellinor_traverse_ridge", "rope_note", "protection problematic"],
  ["wa_the_west_face", "rope_note", "70m practical for full pitch lengths"],
]) {
  if (!leaves(after.get(id)[col]).join(" ").includes(needle)) {
    console.error(`CONTENT LOST: ${id}.${col} no longer says "${needle}"`); bad++;
  }
}
let ropes = 0;
for (const e of DIKES) {
  if (/\b70m\b/.test(leaves(after.get(e.id).rope_note).join(" "))) ropes++;
  else { console.error(`ROPE ADVICE LOST from ${e.id}.rope_note`); bad++; }
}
console.log(`rope advice still present on ${ropes} of ${DIKES.length} Dikes routes.`);
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${EDITS.length} edit(s) clean; every honest negative still stands.`);
process.exit(bad ? 1 : 0);
