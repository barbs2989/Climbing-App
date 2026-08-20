// Two places decide whether a waypoint has a coordinate, and they use DIFFERENT tests:
//
//   WaypointList (RouteDetail.jsx)  placed = wp.lat!=null && wp.lng!=null
//                                            && Number.isFinite(Number(wp.lat))
//                                            && Number.isFinite(Number(wp.lng))
//   GPXMap        (per its own note) skips   wp.lat == null
//
// They disagree on any value that is neither null nor a number. The dangerous one is the EMPTY
// STRING: `"" == null` is FALSE so the map does not skip it, and `Number("")` is 0 which IS
// finite, so the list calls it placed too — and the pin is drawn at latitude 0, in the Gulf of
// Guinea. That is exactly the `Number(null) === 0` trap `audit:map-pins` already records, where a
// missing blob coordinate produced a 12,215 km "disagreement".
//
// The opposite direction is quieter and also wrong: a non-numeric string ("n/a", "unknown") is not
// == null, so the map tries to draw it and gets NaN, while the list correctly says unplaced — the
// row explains itself while the map silently drops it, which is the honest outcome by luck.
//
// MEASUREMENT ONLY. Nothing is written.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,name,waypoints", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read zero routes; a broken scan, not a clean catalog."); process.exit(1); }

/* The app's two tests, transcribed rather than reinterpreted. */
const listPlaced = (w) => w.lat != null && w.lng != null && Number.isFinite(Number(w.lat)) && Number.isFinite(Number(w.lng));
const mapDraws = (w) => !(w.lat == null) && !(w.lng == null);

const buckets = { agreePlaced: 0, agreeUnplaced: 0, listPlacedMapSkips: [], mapDrawsListSays: [], atNullIsland: [] };
const kinds = {};
let total = 0;
for (const r of rows) {
  for (const w of (Array.isArray(r.waypoints) ? r.waypoints : [])) {
    if (!w) continue;
    total++;
    const L = listPlaced(w), M = mapDraws(w);
    /* Record the SHAPE of every lat that is not a plain number — that is what decides which way
       the two tests fall, and a count with no vocabulary behind it cannot be acted on. */
    if (typeof w.lat !== "number") {
      const k = w.lat === null ? "null" : w.lat === undefined ? "undefined" : w.lat === "" ? '"" (empty string)' : typeof w.lat === "string" ? (Number.isFinite(Number(w.lat)) ? "numeric string" : `non-numeric string: ${JSON.stringify(String(w.lat).slice(0, 24))}`) : typeof w.lat;
      kinds[k] = (kinds[k] || 0) + 1;
    }
    if (L && M) { buckets.agreePlaced++; if (Number(w.lat) === 0 || Number(w.lng) === 0) buckets.atNullIsland.push({ id: r.id, name: w.name, lat: w.lat, lng: w.lng }); continue; }
    if (!L && !M) { buckets.agreeUnplaced++; continue; }
    if (L && !M) buckets.listPlacedMapSkips.push({ id: r.id, name: w.name, lat: w.lat, lng: w.lng });
    else buckets.mapDrawsListSays.push({ id: r.id, name: w.name, lat: w.lat, lng: w.lng });
  }
}

console.log(`${total} waypoints across ${rows.length} WA routes\n`);
console.log(`  agree PLACED             ${buckets.agreePlaced}`);
console.log(`  agree UNPLACED           ${buckets.agreeUnplaced}`);
console.log(`  list says placed, map SKIPS it     ${buckets.listPlacedMapSkips.length}   <- row offers a tap that pans to nothing`);
console.log(`  map DRAWS it, list says unplaced   ${buckets.mapDrawsListSays.length}   <- row says "not on the map" while a pin sits there`);
console.log(`  drawn at latitude or longitude 0   ${buckets.atNullIsland.length}   <- Gulf of Guinea`);

console.log(`\n--- shapes of a non-number lat (what decides which way the tests fall) ---`);
const ks = Object.entries(kinds).sort((a, b) => b[1] - a[1]);
if (!ks.length) console.log(`  (every lat is a plain number)`);
for (const [k, n] of ks) console.log(`  ${String(n).padStart(5)}  ${k}`);

for (const [label, arr] of [["list placed / map skips", buckets.listPlacedMapSkips], ["map draws / list says unplaced", buckets.mapDrawsListSays], ["at null island", buckets.atNullIsland]]) {
  if (!arr.length) continue;
  console.log(`\n--- ${label} (${arr.length}) ---`);
  for (const x of arr.slice(0, 15)) console.log(`  ${x.id.padEnd(48)} "${x.name}"  lat=${JSON.stringify(x.lat)} lng=${JSON.stringify(x.lng)}`);
  if (arr.length > 15) console.log(`  … ${arr.length - 15} more`);
}
