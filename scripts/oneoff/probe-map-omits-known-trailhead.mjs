// How many routes does the map DRAW without a trailhead pin, while the app knows where the
// trailhead is and the Directions button already sends you there?
//
// TrailheadCard and both "Directions to…" buttons fall back to approach_logistics.trailheadLat/Lng
// when there is no Trailhead waypoint. GPXMap does not — it is passed `route.waypoints` only, so a
// route whose trailhead lives solely in approach_logistics draws every OTHER pin and omits the one
// you start from. Deliberately NOT fixed by writing a waypoint: see
// [[do-not-create-a-trailhead-pin-from-the-logistics-copy]].
import { selectAll } from "../lib/supabase-env.mjs";

const num = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null);
const rows = await selectAll("routes", "id,name,area_id,waypoints,approach_logistics,gpx", "", { pageSize: 1000 });
const areas = new Map((await selectAll("areas", "id,path", "", { pageSize: 1000 })).map(a => [a.id, a]));
const inWa = r => { const a = areas.get(r.area_id); return a && String(a.path || "").split(".").includes("washington"); };

let logisticsOnly = 0, andRendersAMap = 0, alsoNoOtherPins = 0;
const examples = [];
for (const r of rows) {
  if (!inWa(r)) continue;
  const al = r.approach_logistics || {};
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  const thPin = wps.find(w => w && String(w.type || "").toLowerCase() === "trailhead" && num(w.lat) !== null);
  const alLat = num(al.trailheadLat), alLng = num(al.trailheadLng);
  if (alLat === null || alLng === null) continue;   // nothing to draw
  if (thPin) continue;                              // the map already draws one
  logisticsOnly++;
  const placedPins = wps.filter(w => w && num(w.lat) !== null).length;
  const track = Array.isArray(r.gpx) && r.gpx.length > 1;
  if (placedPins || track) {
    andRendersAMap++;
    if (examples.length < 10) examples.push({ id: r.id, pins: placedPins, track: track ? r.gpx.length : 0, th: al.trailhead });
  } else alsoNoOtherPins++;
}
console.log(`WA routes whose trailhead coordinate lives ONLY in approach_logistics : ${logisticsOnly}`);
console.log(`   of those, the route DOES render a map (a track or other placed pins) : ${andRendersAMap}`);
console.log(`   the map draws every other pin and omits the one you start from.`);
console.log(`   the remaining ${alsoNoOtherPins} draw no map at all, so nothing is missing from view.\n`);
for (const e of examples) console.log(`   ${e.id.padEnd(46)} ${String(e.pins).padStart(2)} placed pin(s), ${String(e.track).padStart(4)} track pt(s)   "${String(e.th).slice(0, 34)}"`);
