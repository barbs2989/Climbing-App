// wa_south_twin_sister_scramble: dist_km holds a ROUND TRIP in a one-way column, and unlike its
// 49 lookalikes this row is NOT shadowed - it has no itinerary day miles, so effDistKm() returns
// the raw column and RouteDetail doubles it again for the round-trip line.
//
// Evidence that 20.1 is the round trip, and that halving it is the right value:
//   * 20.1 km = 12.49 mi, and batch 58 research found a trip report giving ~12.5 mi ROUND TRIP.
//   * halved = 10.05 km = 6.25 mi one-way, matching that same source's ~6.25 mi one-way.
// The row's own waypoint ladder says 7.45 mi one-way (11.99 km) and is NOT used here: it
// overstates the source by 19%, and this audit has repeatedly found the enrichment-derived
// mileage ladder to be the weaker record. The written value is the row's own number halved.
//
// Gated on the column still holding 20.1 AND on the row still having no itinerary - if an
// itinerary is ever added, effDistKm shadows the column and this repair is unnecessary.
import { selectAll, patchRow } from "../lib/supabase-env.mjs";

const ID = "wa_south_twin_sister_scramble";
const EXPECT = 20.1, WRITE = 10.05;
const APPLY = process.argv.includes("--apply");

const [r] = await selectAll("routes", "id,dist_km,itinerary,outing_shape,corrections", `id=eq.${ID}`, { pageSize: 5 });
if (!r) throw new Error("route not found - refusing");
if (r.dist_km !== EXPECT) throw new Error(`REFUSING: dist_km is ${r.dist_km}, expected ${EXPECT}`);
const days = r.itinerary && r.itinerary.days;
const totMi = (days && days.length) ? days.reduce((a, x) => a + (x.miles || 0), 0) : null;
if (totMi) throw new Error(`REFUSING: the row now has itinerary miles (${totMi}), so effDistKm shadows dist_km and this repair is moot.`);

console.log(`dist_km ${r.dist_km} -> ${WRITE}   (itinerary miles: none, so the column is read raw)`);
console.log(`  page currently shows round trip ${(r.dist_km * 2).toFixed(1)} km = ${(r.dist_km * 2 * 0.621371).toFixed(1)} mi`);
console.log(`  page will show round trip      ${(WRITE * 2).toFixed(1)} km = ${(WRITE * 2 * 0.621371).toFixed(1)} mi`);

if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); }
else {
  const note = ` 2026-08-27: dist_km 20.1 -> 10.05 - 20.1 km is the ROUND TRIP (12.5 mi, matching a published trip report), stored in a column the route page treats as one-way and doubles. This row has no itinerary, so effDistKm() does not shadow the column and the page was showing ~25 mi round trip. Halved value agrees with the same source's ~6.25 mi one-way.`;
  const out = await patchRow("routes", ID, { dist_km: WRITE, corrections: String(r.corrections || "") + note });
  console.log("\nWROTE. re-read dist_km =", out.dist_km);
  if (out.dist_km !== WRITE) throw new Error("VERIFY FAILED");
  console.log("verified.");
}
