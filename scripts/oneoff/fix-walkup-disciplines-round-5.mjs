// ROUND 5 of the walk-up audit (rounds 1-4: fix-walkup-and-scramble-disciplines.mjs and
// fix-walkup-disciplines-round-{2,3,4}.mjs). Deep online research on the rows earlier rounds left
// open found one more misfile and four wrong peak labels.
//
// 1. The Incisor (Olympic Needles): its only route is "Route 1, Grade II, Class 5.4 via the knife
//    edge ridge" (Climbers Guide to the Olympic Mountains) — no Class 3-4 alternative exists, so
//    the generic "The Needles Scramble" placeholder stands for a required roped 5.4 climb.
// 2. PEAK LABELS. The label sync in rounds 2-4 breaks a tie between a peak's routes alphabetically,
//    like the DB function does. That labelled Little Annapurna and Hoodoo "alpine" off a rarely
//    climbed 5.6 / 5.7 when their STANDARD routes are Class 2 walk-ups, and Storm King and Trapper
//    "mountaineering" off a seldom-done north face / snow couloir when their standard routes are
//    Class 3-4 scrambles. A peak's label follows its standard route.
//
// Also researched and deliberately NOT changed here: Duckabush, Mount Maude "Nothing Couloir"
// (a real Mountain Project route), Lyall, Massie, Skookum, Rimrock Ridge, Cosho (the Kimtah Glacier
// is an optional shortcut), Storm King North Face (no grade exists online).
// NOT DONE, needs the owner: wa_bonanza_peak_west_ridge and wa_little_sister_scramble describe
// routes no source documents and duplicate real routes already on those peaks (Mary Green Glacier;
// Southeast Ridge 5.3). Nothing references either row, but deleting them is left to the owner.
//
// Assert-then-set, read back. --dry writes nothing.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");
const ROUTES = [
  { id: "wa_the_incisor_scramble", from: "scrambling", to: "alpine" },
];
const LABELS = [
  { id: "wa_the_incisor", from: "scrambling", to: "alpine", why: "its only route is now alpine" },
  { id: "wa_little_annapurna", from: "alpine", to: "mountaineering", why: "standard North Slopes is a Class 2 walk-up; the other route is a rarely climbed 5.6" },
  { id: "wa_hoodoo_peak_sawtooth", from: "alpine", to: "mountaineering", why: "standard route is a Class 2 walk-up; the other is the 5.7 Raven Ridge Traverse" },
  { id: "wa_storm_king", from: "mountaineering", to: "scrambling", why: "standard route is the Class 3-4 Southwest Scramble" },
  { id: "wa_trapper_mountain", from: "mountaineering", to: "scrambling", why: "standard route is the Class 3 South Slopes" },
];

const key = requireServiceKey();
const apply = async (table, col, list) => {
  const rows = await selectAll(table, `id,${col}`, `id=in.(${list.map(x => x.id).join(",")})`, { key, pageSize: 20 });
  for (const x of list) {
    const r = rows.find(y => y.id === x.id);
    if (!r) { console.log(`FAIL: ${x.id} missing`); process.exit(1); }
    if (r[col] === x.to) { console.log(`  already ${x.to}: ${x.id}`); continue; }
    if (r[col] !== x.from) { console.log(`  SKIP ${x.id} — is ${r[col]}, not ${x.from}`); continue; }
    console.log(`${DRY ? "would set" : "setting"} ${table}.${col} ${x.id} ${x.from} -> ${x.to}${x.why ? `  (${x.why})` : ""}`);
    if (!DRY) await patchRow(table, x.id, { [col]: x.to });
  }
  const after = await selectAll(table, `id,${col}`, `id=in.(${list.map(x => x.id).join(",")})`, { key, pageSize: 20 });
  return list.filter(x => after.find(y => y.id === x.id)?.[col] !== x.to).length;
};
const bad = (await apply("routes", "discipline", ROUTES)) + (await apply("areas", "dominant_discipline", LABELS));
if (DRY) process.exit(0);
console.log(bad ? `FAIL: ${bad} value(s) did not take` : `verified — ${ROUTES.length} route and ${LABELS.length} peak label(s) stored`);
process.exit(bad ? 1 : 0);
