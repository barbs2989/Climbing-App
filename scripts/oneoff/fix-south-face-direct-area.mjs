// wa_south_face_direct is a Vasiliki Tower trad route (Wine Spires, Washington Pass) filed on
// wa_art_building — a University of Washington campus crag holding four boulder problems. Move it.
//
// FOUND BY THE ROAD WORK, AND THAT IS NOT INCIDENTAL: this route is one of three that
// `audit:road-coverage` files under RE-HOMING, and the reason no donor could be found for it is
// that its area has no routes at Washington Pass to donate one. A missing road block was the
// symptom; the area is the defect.
//
// THE STRUCTURE IS THE SAFETY PROPERTY, lifted from `fix-road-blocks-from-a-named-sibling`: this
// script declares a TARGET AREA ID that must already hold the route this row calls itself a
// variation of. No coordinate, no area name and no path is typed anywhere, so a repair needing a
// place the catalog does not already hold cannot be expressed.
//
// WHY A MOVE AND NOT A PROSE CLEAR. `wa_true_grit` is the recorded case where the PROSE was the
// contaminated half, and five prose fields agreeing with each other is one claim counted five times
// — a contaminating write lands in several text columns at once. The discriminator is the non-prose
// columns, which a prose contamination would not have touched:
//     discipline = trad     while all four of its area-siblings are bouldering
//     dist_km    = 4.8      while its own approach says "roughly 3 miles to Burgundy Col" (4.83 km)
// Both agree with the prose and disagree with the area, so the area is the wrong half.
//
// AND A MOVE, NOT A DEDUP: Vasiliki holds no row of this name, so nothing is being duplicated.
// "South Face Direct" exists in seven states — a name is not an identity.
//
// --apply to write. Dry by default.
import { selectAll, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

const PLAN = {
  target: "wa_south_face_direct",
  toArea: "wa_vasiliki_tower",
  /* Re-asserted against the live row before any write, so the gate holds at apply time and not
     merely at the time somebody read the data. */
  evidence: "col between Vasiliki Tower and Burgundy Spire",
  /* The destination is required to already hold the climb this row calls itself a variation of.
     That makes the target area a fact about the catalog rather than a name somebody typed. */
  anchorName: "South Face",
};

const t = (await selectAll("routes", "id,name,area_id,discipline,dist_km,approach,beta,overview", `id=eq.${PLAN.target}`, { pageSize: 5 }))[0];
if (!t) { console.error(`FAIL — ${PLAN.target} returned no row. A name-shaped id is not an identity; nothing was written.`); process.exit(1); }

const dest = (await selectAll("areas", "id,name,path,area_type,route_count", `id=eq.${PLAN.toArea}`, { pageSize: 5 }))[0];
const from = (await selectAll("areas", "id,name,path,area_type,route_count", `id=eq.${t.area_id}`, { pageSize: 5 }))[0];
if (!dest || !from) { console.error("FAIL — could not read both areas."); process.exit(1); }

const destRoutes = await selectAll("routes", "id,name,discipline", `area_id=eq.${PLAN.toArea}`, { pageSize: 200 });
const prose = [t.approach, t.beta, t.overview].filter((x) => typeof x === "string").join("\n");

const problems = [];
if (t.area_id === PLAN.toArea) { console.log(`${PLAN.target} is already on ${PLAN.toArea} — already applied, nothing to do.`); process.exit(0); }
if (!prose.includes(PLAN.evidence)) problems.push(`target prose no longer contains the evidence quote "${PLAN.evidence}"`);
if (!destRoutes.some((x) => x.name === PLAN.anchorName)) problems.push(`destination does not hold a route named "${PLAN.anchorName}" — the anchor this row calls itself a variation of is missing, so the destination is unproven`);
if (destRoutes.some((x) => String(x.name).toLowerCase() === String(t.name).toLowerCase())) problems.push(`destination ALREADY holds a route named "${t.name}" — this is a dedup question, not a move`);
if (dest.area_type !== "crag" && dest.area_type !== "peak") problems.push(`destination area_type is ${dest.area_type}; routes belong on a leaf`);

console.log(`${PLAN.target}  "${t.name}"  [${t.discipline}]  dist_km=${t.dist_km}`);
console.log(`   FROM  ${from.id} "${from.name}" (${from.area_type}, route_count=${from.route_count})`);
console.log(`         ${from.path}`);
console.log(`   TO    ${dest.id} "${dest.name}" (${dest.area_type}, route_count=${dest.route_count})`);
console.log(`         ${dest.path}`);
console.log(`   anchor "${PLAN.anchorName}" present at destination: ${destRoutes.some((x) => x.name === PLAN.anchorName)}`);
console.log(`   evidence "${PLAN.evidence}"`);
for (const p of problems) console.log(`   REFUSED: ${p}`);
if (problems.length) process.exit(1);

if (!APPLY) { console.log(`\nDry run — nothing written. Re-run with --apply.`); process.exit(0); }

await patchRow("routes", PLAN.target, { area_id: PLAN.toArea });
console.log(`\nwrote ${PLAN.target}`);

/* Re-read and reconcile. A 200 is not evidence the data changed — the split-credentials trap
   returns 200 with an empty array when RLS rejects every row, and patchRow's single-row assertion
   proves a row was touched, not that it now holds the value. */
const after = (await selectAll("routes", "id,area_id", `id=eq.${PLAN.target}`, { pageSize: 5 }))[0];
if (!after || after.area_id !== PLAN.toArea) { console.error(`VERIFY FAILED — ${PLAN.target} reads area_id=${after ? after.area_id : "(gone)"}`); process.exit(1); }
console.log(`verified ${PLAN.target} -> ${after.area_id}`);

/* route_count is trigger-maintained on route moves, but nothing maintains it when an AREA moves —
   `check:counts` exists because that has drifted three times. Print both sides so a trigger that
   did not fire is visible here rather than a day later in the nightly audit. */
const [fa, da] = [
  (await selectAll("areas", "id,name,route_count", `id=eq.${from.id}`, { pageSize: 5 }))[0],
  (await selectAll("areas", "id,name,route_count", `id=eq.${dest.id}`, { pageSize: 5 }))[0],
];
console.log(`\nroute_count  ${from.id}: ${from.route_count} -> ${fa.route_count}   (expected ${from.route_count - 1})`);
console.log(`route_count  ${dest.id}: ${dest.route_count} -> ${da.route_count}   (expected ${dest.route_count + 1})`);
if (fa.route_count !== from.route_count - 1 || da.route_count !== dest.route_count + 1) {
  console.error(`\nWARNING — route_count did not move as expected on one or both areas. Run: npm run check:counts`);
  process.exit(1);
}
console.log(`\nBoth counts moved as expected. Ancestors are aggregates of the same subtree change — run npm run check:counts to confirm the tree above.`);
