// Undoing two of my own writes from fix-na-closures-hiding-a-real-one.mjs.
//
// That script cleared a placeholder "N/A" in access.closures so the || chain would fall through to the
// real closure the row already held. Before writing, it checked that each revealed closure fitted the
// route geographically — BUT IT CHECKED THE AREA PATH, which is far too coarse. Every route in that
// group sits under `usa.washington.wa_northwest.wa_hwy20_ncnp.wa_north_cascades`, so "Cascade River
// Road" passed for peaks that are nowhere near it.
//
// The right test is the one the route itself answers: does its OWN road block name that road? Applying
// it afterwards, 27 WA routes now display the Cascade River Road closure and 10 use a different road —
// of which TWO are mine:
//
//   wa_north_ridge_4  (Primus Peak)  road.name "North Cascades Highway (SR 20) to Colonial Creek
//                                    Campground / Thunder Creek Trailhead"
//   wa_south_ridge_3  (Black Peak)   road.name "North Cascades Highway (SR 20)", trailhead the Rainy
//                                    Pass Picnic Area at milepost ~157.5
//
// The other eight were already displaying it and are a pre-existing copied-block defect, reported
// rather than swept: which peaks legitimately take Cascade River Road is a per-peak judgement.
//
// RESTORING "N/A" LOSES NOTHING HERE, and that is checked rather than assumed: both rows carry the
// correct winter closure in their own road.seasonalGate — Primus "SR-20 gates near Ross Dam/Silver Star
// close the highway", Black Peak "Gates near Ross Dam/Diablo Lake and Mazama close SR 20 for winter" —
// and the GETTING THERE panel renders that separately. So the true closure still reaches the climber;
// only the foreign one stops.
//
// The premise is re-asserted at apply time: each row must currently hold no access.closures and the
// exact Cascade River Road seasonal text, i.e. be in the state my write left it in. If either has moved
// since, this refuses rather than writing.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const CRR = /cascade river road/i;
const TARGETS = ["wa_north_ridge_4", "wa_south_ridge_3"];

const rows = await selectAll("routes", "id,access,road,approach_logistics", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }
const R = new Map(rows.map(r => [r.id, r]));

const plan = [];
for (const id of TARGETS) {
  const r = R.get(id);
  if (!r) { console.error(`REFUSING: ${id} not found`); process.exit(1); }
  const a = r.access || {};
  if (a.closures != null) { console.log(`  SKIP ${id}: access.closures is no longer absent — the row has moved on`); continue; }
  if (typeof a.seasonal !== "string" || !CRR.test(a.seasonal)) { console.log(`  SKIP ${id}: access.seasonal no longer names Cascade River Road`); continue; }
  // and re-assert the reason: this route's own road really does name a different road
  const own = [r.road && r.road.name, r.road && r.road.driveNote,
               r.approach_logistics && r.approach_logistics.trailheadDirection].filter(v => typeof v === "string").join(" | ");
  if (CRR.test(own)) { console.log(`  SKIP ${id}: its own road DOES name Cascade River Road — the revert's premise is gone`); continue; }
  plan.push({ id, road: String(r.road?.name || "").slice(0, 90), gate: String(r.road?.seasonalGate || "").slice(0, 90), premise: a });
}
console.log(`\nrows to revert to the "N/A" placeholder: ${plan.length}\n`);
for (const p of plan) {
  console.log(`  ${p.id}`);
  console.log(`      its own road   : ${JSON.stringify(p.road)}`);
  console.log(`      its own gate   : ${JSON.stringify(p.gate)}`);
  console.log(`      stops showing  : "Cascade River Road (the access road for these trailheads)…"`);
}
if (!plan.length) { console.log("nothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

let wrote = 0;
for (const p of plan) { await patchRow("routes", p.id, { access: { ...p.premise, closures: "N/A" } }); wrote++; }
console.log(`\nwrote ${wrote}`);
const after = new Map((await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
let ok = 0;
for (const p of plan) {
  const a = after.get(p.id)?.access || {};
  const shows = a.closures || a.closure || a.seasonal;
  if (a.closures === "N/A" && !CRR.test(String(shows))) ok++;
  else console.log(`  NOT APPLIED: ${p.id}`);
}
console.log(`verified ${ok} of ${plan.length} — neither now shows a closure for a road it does not use`);
