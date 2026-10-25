// Mount Robson's seven routes stored NO waypoints and NO approach_logistics, so their ROUTE TRACK
// drew one hollow "peak location" marker and nothing else — no trailhead, no line, no waypoint
// list — where every WA alpine route draws trailhead → camps → summit (owner's note, 2026-10-24:
// "Waypoints for Mount Robson on route track doesn't fit other alpine routes maps").
//
// Every coordinate here is a mapped place, nothing interpolated:
//   - Berg Lake Trailhead, Kinney Lake / Whitehorn / Berg Lake campgrounds: OpenStreetMap
//     (parking way 1185166549, camp_site nodes 1894927872, 1894927875, 3056357732).
//   - Summit: the peak's own OSM node (2699332830), 3,954 m — the current official height, so the
//     area's older 12,989 ft (3,959 m) is replaced too (owner rule: the most recent figure wins).
//   - Elevations of the trail pins: SRTM 30 m at those coordinates. Trail distances: BC Parks'
//     published campground distances (Kinney 7 km, Whitehorn 11 km, Berg Lake ~19.6 km).
// The Ralph Forster Hut has no coordinate any source agrees on, so it is listed WITHOUT one (the
// waypoint list says so) rather than pinned somewhere invented.
//
// Which way in: the north-side routes (North Face, Kain Face, Emperor Ridge) leave the Berg Lake
// Trail at Berg Lake; the Wishbone and the South Face leave it near Kinney Lake. Patterson Couloir and
// the Roof Glacier by-pass get the trailhead and summit only — nothing found says where they leave
// the trail, and a camp they do not use would be a wrong claim.
//
// Berg Lake is typed Junction, not Campsite, on the north routes: it is where the route LEAVES the
// trail, and waypointLinePins (lib/track.js) drops a camp that detours from the straight
// trailhead-to-summit line — which, on a route that walks round to the far side of the peak, would
// draw the line straight through the mountain.
//
// Writes only rows whose waypoints are still NULL, and re-reads every row after. Rollback: set
// waypoints and approach_logistics back to NULL on the seven ids, and areas.elevation_ft to 12989
// and area_type to 'crag' on bc_mount_robson.
//   node scripts/oneoff/robson-waypoints-2026-10-24.mjs --dry
import { patchRow, selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");
const PEAK = { lat: 53.11036, lng: -119.15568, elevFt: 12972 };
const TH = {
  lat: 53.04984, lng: -119.21545, elev: 2782, name: "Berg Lake Trailhead", type: "Trailhead", distMi: 0,
  directions: "Turn north off Highway 16 at the Mount Robson Visitor Centre, about 18 km east of the Highway 5 junction near Tête Jaune Cache, onto Kinney Lake Road. Follow it about 2 km to its end, where the Berg Lake Trail starts at about 2,800 ft. Overnight trips need a backcountry permit.",
};
const KINNEY = {
  lat: 53.08718, lng: -119.19537, elev: 3209, name: "Kinney Lake Campground", type: "Campsite", distMi: 4.3,
  directions: "Follow the Berg Lake Trail along the Robson River and the east shore of Kinney Lake to the campground at the head of the lake, about 7 km from the trailhead. Bikes are allowed this far.",
};
const WHITEHORN = {
  lat: 53.10933, lng: -119.21157, elev: 3671, name: "Whitehorn Campground", type: "Campsite", distMi: 6.8,
  directions: "Continue up the valley past Kinney Lake to Whitehorn Campground, about 11 km from the trailhead.",
};
const BERG = {
  lat: 53.15514, lng: -119.15404, elev: 5430, name: "Berg Lake Campground", type: "Junction", distMi: 12.2,
  directions: "Climb past Emperor Falls to Berg Lake and follow its shore to Berg Lake Campground, about 19.6 km from the trailhead. The climb leaves the hiking trail here.",
};
const summit = (directions) => ({ lat: PEAK.lat, lng: PEAK.lng, elev: PEAK.elevFt, name: "Mount Robson Summit", type: "Summit", distMi: null, ...(directions ? { directions } : {}) });
const NORTH = "Via the Berg Lake Trail, from the north side of the peak";
const SOUTH = "Via the Berg Lake Trail, from the south side of the peak";

const ROUTES = {
  bc_mount_robson_the_north_face: [[TH, KINNEY, WHITEHORN, BERG, summit("Ford the Robson River above Berg Lake, or walk up and cross where the Robson Glacier ends, then step onto the Berg Glacier near its toe and climb the small icefall into the bowl under the face. Cross the bergschrund and climb 14 to 18 pitches of snow and ice to the Emperor Ridge and the summit.")], NORTH],
  bc_mount_robson_kain_face: [[TH, KINNEY, WHITEHORN, BERG, summit("From Berg Lake, go up the Robson Glacier to the foot of the Kain Face, then climb its snow and ice to easier slopes and the ice gargoyles below the summit.")], NORTH],
  bc_mount_robson_emperor_ridge: [[TH, KINNEY, WHITEHORN, BERG, summit("From Berg Lake, go up the Mist Glacier to the foot of the ridge. The lower rock leads to the Black Towers, passed by a chimney on the left; vertical steps and close to a mile of snow gargoyles lead on to the summit.")], NORTH],
  bc_mount_robson_wishbone_arete: [[TH, KINNEY, summit("Near Kinney Lake, leave the Berg Lake Trail on the climbers' trail toward the toe of the Wishbone. The arête is a long ridge of loose rock, snow and ice to the summit.")], SOUTH],
  bc_mount_robson_south_face_schwartz_ledges: [[TH, KINNEY,
    { lat: null, lng: null, elev: null, name: "Ralph Forster Hut", type: "Campsite", distMi: null,
      directions: "Near Kinney Lake, leave the Berg Lake Trail on the steep, rough climbers' trail up the south side of the peak to the hut. It is exposed in places and has one short pitch of easy fifth-class rock." },
    summit("From the hut, climb about 1,400 m of ledges and short walls by the Schwartz Ledges to the summit.")], SOUTH],
  bc_mount_robson_patterson_couloir: [[TH, summit(null)], SOUTH],
  bc_mount_robson_roof_glacier_hourglass_by_pass_couloir: [[TH, summit(null)], SOUTH],
};

requireServiceKey();
const ids = Object.keys(ROUTES);
const before = await selectAll("routes", "id,area_id,waypoints,approach_logistics", `id=in.(${ids.join(",")})`);
if (before.length !== ids.length) throw new Error(`expected ${ids.length} routes, read ${before.length}`);
for (const r of before) {
  if (r.area_id !== "bc_mount_robson") throw new Error(`${r.id} is filed on ${r.area_id}, not bc_mount_robson`);
  if (r.waypoints != null && r.waypoints.length) throw new Error(`${r.id} already has waypoints — refusing to overwrite`);
}
for (const [id, [wps, dir]] of Object.entries(ROUTES)) {
  const al = { peakLat: PEAK.lat, peakLng: PEAK.lng, trailhead: TH.name, trailheadLat: TH.lat, trailheadLng: TH.lng, trailheadDirection: dir };
  console.log(id, wps.map((w) => w.name).join(" → "));
  if (!DRY) await patchRow("routes", id, { waypoints: wps, approach_logistics: al });
}
// Mount Robson is a PEAK. Filed as a crag, the route page's "How far am I from the base?" pointed a
// climber at the summit coordinate as "the crag's location", the one thing RouteDetail says it must
// never do for a peak.
if (!DRY) await patchRow("areas", "bc_mount_robson", { area_type: "peak", elevation_ft: PEAK.elevFt });

const after = await selectAll("routes", "id,waypoints,approach_logistics", `id=in.(${ids.join(",")})`, { key: requireServiceKey() });
for (const r of after) console.log("read back", r.id, (r.waypoints || []).length, "waypoints", r.approach_logistics ? "+ logistics" : "NO LOGISTICS");
