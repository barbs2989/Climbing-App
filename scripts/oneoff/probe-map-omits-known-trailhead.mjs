// Does the route map actually leave a climber with NO trailhead marker?
//
// FIRST DRAFT OF THIS PROBE OVERSTATED THE PROBLEM, and the correction is the useful part. It
// counted every route whose trailhead coordinate lives only in `approach_logistics`, on the
// assumption that GPXMap therefore draws no trailhead. GPXMap has TWO other ways to mark one:
//
//   1. a `Trailhead` WAYPOINT is drawn as a coloured pin via WP_STYLE / `wc[wpType(wp)]`
//   2. `endpointLabels` marks the TRACK'S FIRST POINT green and labels it "Trailhead" — passed
//      whenever catOf(route) is alpine or mountaineering
//
// So a route with a gpx track already shows a trailhead marker, and the honest question is
// narrower: which routes have NEITHER a Trailhead pin NOR a track to label?
//
// The track-start marker is worth one caveat rather than full credit: `trackCoverage()` reports 62
// WA routes whose line starts more than 2 km from the trailhead, so "the track starts here" and
// "the trailhead is here" are not the same claim. That is a separate, already-captioned defect.
import { selectAll } from "../lib/supabase-env.mjs";

const num = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null);
// Mirrors catOf(): only these get endpointLabels at the GPXMap call sites in RouteDetail.
const ENDPOINT_DISCS = new Set(["alpine", "mountaineering"]);

const rows = await selectAll("routes", "id,name,area_id,discipline,waypoints,approach_logistics,gpx", "", { pageSize: 1000 });
const areas = new Map((await selectAll("areas", "id,path", "", { pageSize: 1000 })).map(a => [a.id, a]));
const inWa = r => { const a = areas.get(r.area_id); return a && String(a.path || "").split(".").includes("washington"); };

let logisticsOnly = 0, hasTrackMarker = 0, noMapAtAll = 0;
const bare = [];
for (const r of rows) {
  if (!inWa(r)) continue;
  const al = r.approach_logistics || {};
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  if (num(al.trailheadLat) === null || num(al.trailheadLng) === null) continue;
  if (wps.some(w => w && String(w.type || "").toLowerCase() === "trailhead" && num(w.lat) !== null)) continue; // pin exists
  logisticsOnly++;

  const track = Array.isArray(r.gpx) && r.gpx.length > 1;
  const labelled = track && ENDPOINT_DISCS.has(String(r.discipline || "").toLowerCase());
  const otherPins = wps.filter(w => w && num(w.lat) !== null).length;

  if (labelled) { hasTrackMarker++; continue; }          // the track start is already marked "Trailhead"
  if (!track && !otherPins) { noMapAtAll++; continue; }  // no map renders, nothing is missing from view
  bare.push({ id: r.id, disc: r.discipline, pins: otherPins, track: track ? r.gpx.length : 0, th: al.trailhead });
}

console.log(`WA routes whose trailhead coordinate lives ONLY in approach_logistics : ${logisticsOnly}`);
console.log(`   already marked — a track start labelled "Trailhead" by endpointLabels : ${hasTrackMarker}`);
console.log(`   no map renders at all, so nothing is missing from view               : ${noMapAtAll}`);
console.log(`   MAP RENDERS AND CARRIES NO TRAILHEAD MARKER                          : ${bare.length}\n`);
for (const b of bare) console.log(`   ${b.id.padEnd(46)} ${String(b.disc).padEnd(14)} ${String(b.pins).padStart(2)} pin(s), ${String(b.track).padStart(4)} track pt(s)   "${String(b.th).slice(0, 30)}"`);
