// BATCH 108 REPAIRS. Two rows, each settled by the row ITSELF -- no external source is consulted
// and none is needed. Both are the rope/descent family this audit exists for: a party reads the
// packing list before it leaves the car, and the rappel direction on the summit.
//
// 1. wa_inner_constance_seans_route -- `gear` OFFERS A ROPE THAT CANNOT LEAD ANY PITCH ON THE ROUTE.
//    It lists "30m+ rope". The row's own `pitch_detail` is 60 / 50 / 50 / 45 / 100 / 61 m, so the
//    SHORTEST pitch is 45 m and a 30 m rope leads 0 of 6. `rope_length_m` and `rope_note` are null,
//    so nothing else on the row states a length -- "30m+" is the only figure a party would see.
//    It is not literally false (a 60 m rope is "30m+"), which is exactly what makes it dangerous:
//    it reads as a floor, and the floor is 15 m under the shortest pitch. `rappels` compounds it --
//    "double ropes make the descent much less committing", and 30 m doubled is a 15 m rappel.
//    REPAIR: delete the figure, leaving "rope". A DELETION of a false floor, not a substitution --
//    writing "60m" would be research, and CLAUDE.md records four separate attempts to read a rope
//    requirement out of prose, all measured and all rejected. The row keeps a rope in its packing
//    list and stops asserting a length it cannot support; the correct length is recorded as a
//    finding for research.
//
// 2. wa_let_it_burn -- `rappels` PUTS THE SUMMIT RAPPEL ON THE WRONG SIDE OF THE PEAK.
//    It says the anchor is "on the south/southwest face". The row's own `descent` AND `descent_text`
//    both put it EAST ("a slung horn on the east side" / "~30m rappel to the east off a slung horn"),
//    and all three agree on the anchor kind (a slung horn / chickenhead) and the length (30 m). So
//    this is 1 against 2, on the one detail that decides which way a party commits a rappel off a
//    summit. A two-field disagreement is NOT decidable -- CLAUDE.md records that from the Skagit
//    Queen camp -- which is why the third record was looked for before touching anything.
//    The "west" mentions in those fields are "the same walk-off shared by the West Face and The
//    Scoop", i.e. sibling ROUTE NAMES, and correctly do not vote.
//    REPAIR: copy the direction the row's other two records already hold. Minimal and scoped to the
//    face -- the "mushroom-shaped chickenhead" wording may well be right and is left alone.
//
// NOT REPAIRED, recorded so the omissions are not read as oversights:
//   * wa_let_it_burn `rappels` also calls the rappel MANDATORY ("Descent is by a single 30 m
//     rappel") where `descent`/`descent_text` both call it optional and bypassable. Being told a
//     rappel is required when it is optional is the SAFE direction of error, so it stays a finding.
//   * wa_lexington_tower_south_face appears to carry CONCORD Tower's South Face (wa_south_face_3 is
//     a Concord row of the same name, grade and pitch count; this row's `fa` holds two FA records).
//     That is a duplicate-route HYPOTHESIS. CLAUDE.md records a duplicate flag acted on without
//     confirming both halves, which destroyed Triple Couloirs. Not touched.
//   * wa_inner_constance_seans_route `access` names an NPS entrance fee while the row's own
//     `road.driveNote` describes a Forest Service trailhead ($5/day, Northwest Forest Pass). Real,
//     and `access.fees` semantics is an OPEN USER DECISION in memory -- left for that decision.
//   * wa_leche_la_vaca `pitch_detail` holds 4 entries summing 140 m against `pitches` 5 and
//     `length_m` 265. Internal and real, but the missing pitch's data is not in the row, so there is
//     nothing to copy.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const KEY = requireServiceKey();
const S = v => (typeof v === "string" ? v : JSON.stringify(v ?? ""));
const APPLY = process.argv.includes("--apply");

const IDS = ["wa_inner_constance_seans_route", "wa_let_it_burn"];
const rows = await selectAll("routes", "*", `id=in.(${IDS.join(",")})`, { pageSize: 10, key: KEY });
if (rows.length !== IDS.length) { console.error(`SHORT READ: ${rows.length} of ${IDS.length}`); process.exit(1); }
const by = Object.fromEntries(rows.map(r => [r.id, r]));

const plans = [];
const refuse = m => { console.error(`REFUSED: ${m}`); process.exit(1); };

// ---------------------------------------------------------------- 1. Inner Constance rope floor
{
  const r = by.wa_inner_constance_seans_route;
  const OLD = "30m+ rope", NEW = "rope";
  // PREMISES, re-asserted against the LIVE row rather than trusted from the audit.
  const lens = (r.pitch_detail || []).map(p => p.lengthM).filter(Number.isFinite);
  if (lens.length < 5) refuse(`inner constance: only ${lens.length} pitch lengths on file — the "a 30 m rope leads none of them" argument needs the pitch table`);
  const shortest = Math.min(...lens);
  if (shortest <= 30) refuse(`inner constance: shortest pitch is ${shortest} m, so a 30 m rope DOES lead one — the premise is gone`);
  if (r.rope_length_m != null || r.rope_note != null) refuse(`inner constance: the row now states a rope length elsewhere (rope_length_m=${r.rope_length_m}, rope_note set) — re-read before deleting the one in gear`);
  const gear = Array.isArray(r.gear) ? r.gear : null;
  if (!gear) refuse(`inner constance: gear is not an array (${typeof r.gear})`);
  const hits = gear.filter(g => String(g) === OLD).length;
  if (!hits && gear.includes(NEW)) { console.log("  == inner constance: already applied — no-op."); }
  else if (hits !== 1) refuse(`inner constance: gear holds ${hits} entries exactly equal to ${JSON.stringify(OLD)} — expected exactly 1`);
  else plans.push({
    id: r.id, label: `gear: ${JSON.stringify(OLD)} -> ${JSON.stringify(NEW)}  (shortest pitch ${shortest} m; a 30 m rope leads 0 of ${lens.length})`,
    body: { gear: gear.map(g => (String(g) === OLD ? NEW : g)) },
  });
}

// ---------------------------------------------------------------- 2. Let It Burn rappel side
{
  const r = by.wa_let_it_burn;
  const OLD = "on the south/southwest face", NEW = "on the east side";
  const cur = S(r.rappels);
  const east = ["descent", "descent_text"].filter(f => /rappel[^.;]{0,90}\beast\b|\beast\b[^.;]{0,40}rappel/i.test(S(r[f])));
  if (east.length < 2) refuse(`let it burn: only ${east.length} of the two descent fields still put the rappel east (${east.join(", ") || "none"}) — the 1-against-2 argument is gone`);
  if (cur.includes(NEW) && !cur.includes(OLD)) { console.log("  == let it burn: already applied — no-op."); }
  else {
    const hits = cur.split(OLD).length - 1;
    if (hits !== 1) refuse(`let it burn: rappels holds ${hits} copies of ${JSON.stringify(OLD)} — expected exactly 1`);
    plans.push({
      id: r.id, label: `rappels: ${JSON.stringify(OLD)} -> ${JSON.stringify(NEW)}  (descent and descent_text both say east)`,
      body: { rappels: cur.replace(OLD, NEW) },
    });
  }
}

if (!plans.length) { console.log("\nNothing to do."); process.exit(0); }
console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — ${plans.length} edit(s):\n`);
for (const p of plans) {
  console.log(`  -> ${p.id}\n     ${p.label}`);
  // PRINT THE RESULTING VALUE, NOT JUST THE PAIR. A find/replace pair cannot show a stranded
  // connective or a doubled space; I shipped exactly that in batch 107 by trusting the pair.
  for (const [k, v] of Object.entries(p.body)) console.log(`     RESULT ${k} = ${JSON.stringify(S(v)).slice(0, 300)}`);
  console.log("");
}
if (!APPLY) { console.log("Re-run with --apply."); process.exit(0); }

for (const p of plans) { await patchRow("routes", p.id, p.body, { key: KEY }); console.log(`  applied ${p.id}`); }

// VERIFY BY RE-READ. A 200 is not evidence the row changed.
const after = await selectAll("routes", "id,gear,rappels", `id=in.(${IDS.join(",")})`, { pageSize: 10, key: KEY });
const a = Object.fromEntries(after.map(r => [r.id, r]));
let bad = 0;
if (!(a.wa_inner_constance_seans_route.gear || []).includes("rope") ||
     (a.wa_inner_constance_seans_route.gear || []).some(g => String(g) === "30m+ rope")) { console.error("  !! inner constance gear did not take"); bad++; }
if (!S(a.wa_let_it_burn.rappels).includes("on the east side") ||
     S(a.wa_let_it_burn.rappels).includes("south/southwest face")) { console.error("  !! let it burn rappels did not take"); bad++; }
console.log(bad ? `\nVERIFY FAILED on ${bad} row(s).` : "\nVerified by re-read: both edits are live.");
process.exit(bad ? 1 : 0);
