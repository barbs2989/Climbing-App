// How many routes carry avalanche ratings that the panel's gate hides?
//
// The AVALANCHE FORECAST panel is gated `mountain && mountain.avyZone && avyRelevant` and prints
// `mountain.avyZone` — the AREA's zone, from areas.avy_zone. The route's own
// seasonal_hazards.avalanche.zone is read by NOTHING (check:contrib-fields caught that when the
// zone was offered as a contribute field).
//
// So the gate and the content come from different records: a route can carry per-month avalanche
// ratings of its own and show none of them, because the AREA it hangs under has no zone string.
// That is not a cosmetic gap — the hidden content is a month-by-month avalanche rating on a
// mountaineering route.
//
// This counts it before anything is changed, because the fix depends on the number: if it is zero
// the gate is harmless and the route-level zone is merely redundant.

import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,discipline,seasonal_hazards,area_id", "seasonal_hazards=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("empty read."); process.exit(1); }

const areaIds = [...new Set(rows.map((r) => r.area_id).filter(Boolean))];
const areas = {};
// Chunked so the `in` list cannot outgrow a URL.
for (let i = 0; i < areaIds.length; i += 150) {
  const chunk = areaIds.slice(i, i + 150);
  const got = await selectAll("areas", "id,name,avy_zone", `id=in.(${chunk.join(",")})`, { pageSize: 200 });
  for (const a of got) areas[a.id] = a;
}

let withRatings = 0, areaHasZone = 0, hiddenByGate = 0, routeZoneOnly = 0;
const examples = [];
for (const r of rows) {
  const avy = r.seasonal_hazards && r.seasonal_hazards.avalanche;
  const months = avy && avy.byMonth && typeof avy.byMonth === "object" ? Object.keys(avy.byMonth) : [];
  // A rating of "N/A" on every month is a declaration that avalanche is not a concern, not content.
  const real = months.filter((m) => !/^n\/?a$/i.test(String(avy.byMonth[m] || "").trim()));
  if (!real.length) continue;
  /* THE PANEL'S OTHER GATE, which the first run of this script left out and so overstated the
     impact: avyRelevant is
       ["ice","mixed","alpine","mountaineering"].includes(cat) && routeTerrain(route).avalanche!=="no"
     so a scramble never shows this panel however its ratings read. Discipline is checkable here;
     the terrain half is not (it needs the classifier), so this is an UPPER bound on the affected
     set and says so. Ask what a count is a count OF. */
  if (!["ice", "mixed", "alpine", "mountaineering"].includes(String(r.discipline || "").toLowerCase())) continue;
  withRatings++;
  const az = areas[r.area_id] && areas[r.area_id].avy_zone;
  if (az) { areaHasZone++; continue; }
  hiddenByGate++;
  if (avy.zone && !/^n\/?a\b/i.test(String(avy.zone))) routeZoneOnly++;
  if (examples.length < 8) examples.push(`${r.id}  [${r.discipline}]  area="${(areas[r.area_id] || {}).name || "?"}"  routeZone="${String(avy.zone || "").slice(0, 46)}"  months=${real.length}`);
}

console.log(`${rows.length} routes carry seasonal_hazards`);
console.log('  (counting only ice/mixed/alpine/mountaineering — the disciplines avyRelevant admits)');
console.log(`  ${withRatings} carry REAL per-month avalanche ratings (not all N/A)`);
console.log(`  ${areaHasZone} of those have an area avy_zone, so the panel can render`);
console.log(`  ${hiddenByGate} are HIDDEN by the gate — ratings on file, no panel`);
console.log(`  ${routeZoneOnly} of the hidden ones name a zone on the ROUTE that nothing reads\n`);
for (const e of examples) console.log("  " + e);
