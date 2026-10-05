// Batch 9: the Mountain Project family, minus the classes that are not attributions.
//
// LEFT ALONE, DELIBERATELY:
//
//   * LIVE REFERENCES (open decision 5) - wa_alice_in_wonderland's "check current GPX
//     tracks/photos on Mountain Project before heading down" sends a climber to look for
//     themselves, the same shape as the land-manager alert pages this catalog keeps.
//
//   * DISAGREEMENTS where the contrast is safety-critical - wa_kangaroo_temple_north_face
//     records that one source describes the rappel anchor as three bolts with no chains and
//     another as chains, "so expect that it may have been rebuilt and judge what is actually
//     there". Two sources disagreeing about an ANCHOR is the whole content; a rewrite that
//     picked one would be worse than the citation.
//
//   * wa_mount_bigelow_tribute_to_richard's namesake warning, which is real and useful (MP's
//     "Mount Bigelow" page is the Arizona peak) but is phrased as an instruction to a pipeline
//     - "Do not import Mountain Project beta" - rather than to a climber. That is a
//     working-language leak as much as a citation, and it wants an editorial decision, not a
//     find/replace.
//
// A NOTE ON THE ROPE AND PROTECTION CLAIMS. "A 30 m rope is stated as sufficient by Mountain
// Project" must NOT become "A 30 m rope is sufficient": dropping the attribution would turn a
// reported claim into the page's own assertion, and a rope that does not reach is the worst
// thing in this dataset to get wrong. Those keep an explicit hedge ("is reported sufficient")
// so the cut removes the publisher without strengthening the claim.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const DASH = "—";
const Q = "'";
const DQ = '"';

const EDITS = [
  // ---- rope / protection claims: publisher out, hedge preserved ----
  {
    id: "wa_classic_route_2", col: "rappels",
    find: "A 30 m rope is stated as sufficient by Mountain Project",
    repl: "A 30 m rope is reported sufficient",
    note: "ROPE CLAIM. The hedge is kept deliberately - without it this becomes the page asserting a rope length, and a rope that does not reach is the worst thing here to get wrong.",
  },
  {
    id: "wa_the_roof", col: "rappels",
    find: "Mountain Project: a 40 m rope is plenty.",
    repl: "A 40 m rope is reported to be plenty.",
    note: "ROPE CLAIM, same reasoning.",
  },
  {
    id: "wa_junior_s_farm", col: "rappels",
    find: "(Mountain Project describes ~5 raps down the wall base from below P6",
    repl: "(~5 raps are described down the wall base from below P6",
  },
  {
    id: "wa_mount_pugh_pika_slab", col: "rappels",
    find: "Mountain Project's descent is to downclimb class 3 terrain",
    repl: "The described descent is to downclimb class 3 terrain",
  },
  {
    id: "wa_mount_pugh_pika_slab", col: "pitch_detail",
    find: "Mountain Project lists protection as " + DQ + "None" + DQ + ", which is",
    repl: "which is",
    note: "the sentence already opens 'No protection is placeable', so restating it duplicated the claim and put a capital mid-sentence. The preview is what showed it.",
  },
  {
    id: "wa_mount_pugh_pika_slab", col: "rappels",
    find: "No fixed anchors are listed on the route page,",
    repl: "No fixed anchors are recorded,",
    note: "EXPOSED BY THE EDIT ABOVE. Once 'Mountain Project's descent' became 'the described descent', 'the route page' was left pointing at a publisher the sentence no longer names - a dangling reference that reads as a broken cross-link.",
  },
  {
    id: "wa_the_tempest", col: "rappels",
    find: "Mountain Project describes the finish as simulclimbing",
    repl: "The finish is described as simulclimbing",
  },
  {
    id: "wa_mount_torment_torment_forbidden_traverse", col: "rappel_count_note",
    find: "Mountain Project gives " + Q + "five or six single rope rappels" + Q + " for the rock rib",
    repl: "five or six single-rope rappels are described for the rock rib",
    note: "a quotation cannot survive its speaker; unquoted it becomes the page's own sentence, and the count stays reported rather than asserted.",
  },

  // ---- the attribution IS the verb ----
  {
    id: "wa_cathedral_rock_northeast_ridge_2003_variation", col: "watch_out",
    find: "Mountain Project's PG13 rating means falls",
    repl: "The PG13 rating means falls",
  },
  {
    id: "wa_south_ridge_2", col: "best_season",
    find: "Mountain Project's early-season ice/mixed (M1) rating reflects",
    repl: "The early-season ice/mixed (M1) rating reflects",
  },
  {
    id: "wa_south_face_of_the_mole", col: "best_season",
    find: "Mountain Project notes crampons and an ice axe are worth carrying",
    repl: "Crampons and an ice axe are worth carrying",
  },
  {
    id: "wa_north_ridge_2", col: "partner_requirements",
    find: "Mountain Project stresses staying on the ridge crest",
    repl: "Staying on the ridge crest matters",
  },
  {
    id: "wa_you_moss_be_joking", col: "pro_tips",
    find: "Mountain Project frames this route as a practical way",
    repl: "This route is best seen as a practical way",
  },
  {
    id: "wa_dolphin_chimney", col: "seasonal_hazards",
    find: "Mountain Project's own description attributes the route's low traffic to this protection gap",
    repl: "The route's low traffic is attributed to this protection gap",
  },
  {
    id: "wa_amphitheater_mountain_north_buttress", col: "watch_out",
    find: "Mountain Project still tags this route as Aid",
    repl: "This route is still catalogued as Aid",
    note: "a DISAGREEMENT worth keeping - the point is that the listed grade is stale, which stays true without naming who lists it.",
  },
  {
    id: "wa_wild_wild_west", col: "best_season",
    find: "a Mountain Project forum thread from June 2020 reported snow lingering",
    repl: "a June 2020 report noted snow lingering",
  },

  // ---- separable tag ----
  {
    id: "wa_castle_peak_tatoosh_la_villa", col: "pitch_detail",
    find: ", per Mountain Project.",
    repl: ".",
  },
  {
    id: "wa_alice_in_wonderland", col: "gear",
    find: " (Mountain Project lists it as a sport route)",
    repl: " (it is a sport route)",
  },
  {
    id: "wa_caravan", col: "gear",
    find: "Mountain Project lists this as an alpine sport crag",
    repl: "this is an alpine sport crag",
  },
  {
    id: "wa_chitlins_con_carne", col: "gear",
    find: "Mountain Project lists this as a bolted sport route at Summertime Crag",
    repl: "this is a bolted sport route at Summertime Crag",
  },
  {
    id: "wa_der_dihedral", col: "gear",
    find: " " + DASH + " route-specific protection note from Mountain Project's page for Der Dihedral",
    repl: " " + DASH + " a route-specific protection note, not a generic rack",
    note: "the clause was saying the rack is specific to this line rather than boilerplate, which is worth keeping.",
  },
  {
    id: "wa_chair_bryant_traverse", col: "best_season",
    find: "the same " + Q + "Summer-Fall" + Q + " window Mountain Project lists for Chair Peak's other rock routes",
    repl: "the same summer-fall window listed for Chair Peak's other rock routes",
  },

  // ---- the METRIC is the source ----
  {
    id: "wa_zool_patch", col: "watch_out",
    find: ", with only a single Mountain Project rating and no photos/comments on file",
    repl: ", with almost nothing on record about it",
    note: "rating and comment counts are a website's engagement figures. The claim they supported - that it is barely documented - survives.",
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
console.log(bad ? `\nVERIFY FAILED: ${bad} edit(s) did not land.` : `\nverified: all ${EDITS.length} edit(s) re-read clean.`);
process.exit(bad ? 1 : 0);
