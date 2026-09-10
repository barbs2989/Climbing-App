// Does moving the route page's distance arithmetic into lib/outing.js change what any route shows?
//
// The reference is a VERBATIM copy of the pre-move expressions — correct here, because the
// originals are gone and a copy is the only second opinion available. The function UNDER TEST is
// IMPORTED from the shipped module, because a copy of that would agree with itself whatever the
// app did. Same split #1215's equivalence probe used.
//
// It also asserts the one thing the move ADDS: the snake-case fallback, which exists so the area
// browser's RAW PostgREST rows resolve. That can only add rows — the camel spelling still wins
// wherever it is present — and the synthetic cases below pin both directions.
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";
import { effDistKm } from "../../lib/outing.js";

// --- the pre-move expressions, verbatim -------------------------------------------------------
const recShapeOf = (route) => (route && (route.outingShape || route.outing_shape)) || null;
const itinTotalMi = (route) => { const days = route && route.itinerary && route.itinerary.days; return (days && days.length) ? days.reduce((a, d) => a + (d.miles || 0), 0) : null; };
const oldWhole = (route) => { const sh = recShapeOf(route); return !!itinTotalMi(route) && (sh === "loop" || sh === "point"); };
const oldEff = (route) => { const totMi = itinTotalMi(route); if (!totMi) return route && route.distKm; return oldWhole(route) ? totMi * 1.60934 : (totMi * 1.60934) / 2; };

let fails = 0;
const ok = (c, m) => { console.log((c ? "  ok   " : "  FAIL ") + m); if (!c) fails++; };

const rows = await selectAll("routes", "id,dist_km,itinerary,outing_shape", "", { pageSize: 1000, key: requireServiceKey() });
const wa = rows.filter((r) => String(r.id).startsWith("wa_"));
if (wa.length < 1000) { console.error(`REFUSING - only ${wa.length} WA rows read; every comparison below would be about almost nothing.`); process.exit(1); }

// The route page's object comes through dbRouteToCamel, which sets `distKm`. Build that shape.
let differ = 0, resolved = 0;
for (const r of wa) {
  const camel = { ...r, distKm: r.dist_km };
  const a = oldEff(camel), b = effDistKm(camel);
  if (a != null) resolved++;
  const same = (a == null && b == null) || (a != null && b != null && Math.abs(a - b) < 1e-9);
  if (!same && differ++ < 10) console.log(`  DIFFERS ${r.id}  before ${a}  after ${b}`);
}
console.log(`\n${wa.length} WA routes compared; ${resolved} resolve to a distance at all.`);
ok(differ === 0, `${differ} differ on the shape the route page hands it`);

// --- what the move ADDS -----------------------------------------------------------------------
console.log("\nthe snake-case fallback (raw PostgREST rows, which the area browser holds):");
ok(effDistKm({ dist_km: 8 }) === 8, "a raw row with only dist_km resolves (the old expression returned undefined)");
ok(oldEff({ dist_km: 8 }) === undefined, "...and the old expression really did not (else the assertion above is vacuous)");
ok(effDistKm({ distKm: 3, dist_km: 99 }) === 3, "the camel spelling still WINS where both are present");
ok(effDistKm({ dist_km: null }) == null, "a null column stays null rather than becoming 0");
ok(effDistKm(null) == null, "a missing route is not an exception");
const itin = { itinerary: { days: [{ miles: 6 }, { miles: 4 }] } };
ok(Math.abs(effDistKm(itin) - (10 * 1.60934) / 2) < 1e-9, "an itinerary with no recorded shape is halved, as an out-and-back");
ok(Math.abs(effDistKm({ ...itin, outing_shape: "loop" }) - 10 * 1.60934) < 1e-9, "a recorded loop is NOT halved");
ok(effDistKm({ ...itin, dist_km: 99 }) !== 99, "the itinerary beats the stored column, which is the whole point");

console.log(fails ? `\n${fails} FAILED` : `\nequivalent on every live row, and the fallback only adds.`);
process.exit(fails ? 1 : 0);
