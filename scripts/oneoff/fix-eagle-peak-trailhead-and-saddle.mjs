// Eagle Peak: two of three pins are in places the trail never goes.
//
// THIS IS THE FIRST REPAIR IN THIS SWEEP TO WRITE AN EXTERNALLY-SOURCED COORDINATE RATHER THAN
// NULL ONE, so the evidence is set out in full. Every other coordinate repair here either nulled a
// refuted pin or copied a donor row; wa_scramble_route is the ONLY route on wa_eagle_peak and no WA
// row holds a pin within 300 m of either replacement point, so no donor exists. Nulling would leave
// the row with no trailhead coordinate at all — no map pin and no Directions button — on a route
// whose own prose describes the walk in detail.
//
// WHAT IS STORED, AND WHAT THE GROUND SAYS (USGS 3DEP, sampled in session):
//   wp[0] "Eagle Peak Saddle"     46.737,-121.795     stored 5,720 ft | ground 4,023 ft | -1,697
//   wp[1] "Eagle Peak Trailhead"  46.7575,-121.8057   stored 2,760 ft | ground 2,965 ft |   +205
//   wp[2] "Eagle Peak" (summit)   46.7557,-121.7792   stored 5,958 ft | ground 5,961 ft |     +3
//
// The summit is the control and it is excellent: +3 ft, and 6 m from GNIS 1519051. So the
// instrument agrees with this row where its coordinate is known good, which is what licenses
// reading anything into the other two.
//
// THE DECISIVE FACT NEEDS NO ARGUMENT ABOUT WHICH BANK OF THE NISQUALLY ANYTHING IS ON. The whole
// mapped Eagle Peak Trail — four ways (187893450, 1210342571, 1210342570, 954440239), 201 nodes,
// every one tagged name="Eagle Peak Trail" and operator="National Park Service", chaining
// end-to-end — has a CLOSEST APPROACH of 1,026 m to the stored trailhead pin and 911 m to the
// stored saddle pin. Read from the OSM API itself (api.openstreetmap.org/api/0.6/way/<id>/full.json),
// not from a summary. Neither stored pin is on, near, or plausibly related to the trail.
//
// FIVE INDEPENDENT RECORDS AGREE ON THE REPLACEMENTS, and they share no input:
//   1. OSM geometry. Trail start 46.748383,-121.8077866; terminus 46.7542305,-121.7790705.
//   2. THE ROW'S OWN NOTES, written by a different pass. The saddle note says "High point of the
//      maintained trail" — which is the terminus by definition. The trailhead note says "across the
//      Nisqually Suspension Bridge; trailhead is just over the bridge", and OSM way 96323614
//      (bridge=yes, wikipedia="fr:Longmire Suspension Bridge") ends 52 m from the trail start.
//   3. THE GROUND, at coordinates the row did not produce. Terminus 5,755 ft against the row's
//      stated 5,720 (35 ft); trail start 2,812 ft against its stated 2,760 (52 ft).
//   4. LENGTH. The mapped trail is 3.27 mi one way; the row's own distMi for the saddle is 3.5;
//      NPS publishes 7.2 mi round trip (3.60 mi one way). Three records inside 0.33 mi.
//   5. GEOMETRY OF THE SCRAMBLE. The replacement saddle sits 164 m from the summit pin, matching
//      every description of a short scramble from where the trail ends. The stored saddle is
//      2.4 km away, which is not a scramble.
//
// THE ELEVATIONS ARE KEPT, as everywhere in this sweep: they are the sound half, and 2,760 in
// particular is Longmire village's own published figure (2,761 ft) — an inherited value that is
// ~50 ft low for the real trailhead, which is well inside this catalog's ordinary slop and not
// worth replacing with a DEM reading.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  { kind: "set", route: "wa_scramble_route", path: "waypoints.0.lat",
    expect: "ae5b1f6ad9987b8c", value: 46.7542305,
    why: "the saddle is pinned 2.27 km from where the maintained trail ends, on ground 1,697 ft below its own stated elevation" },
  { kind: "set", route: "wa_scramble_route", path: "waypoints.0.lng",
    expect: "c42a699c7fe73165", value: -121.7790705,
    why: "the longitude half of the same pin" },

  { kind: "set", route: "wa_scramble_route", path: "waypoints.1.lat",
    expect: "23e8e0e4557d5350", value: 46.748383,
    why: "no node of the mapped NPS trail comes within 1,026 m of the stored trailhead pin" },
  { kind: "set", route: "wa_scramble_route", path: "waypoints.1.lng",
    expect: "7df309f48f91a9ac", value: -121.8077866,
    why: "the longitude half of the same pin" },

  // The gpx is [[saddle],[trailhead],[summit]] — literally the three waypoints joined, in an order
  // that is not the route (it starts at the saddle). It is a synthetic line by trackIsJustTheWaypoints'
  // own test, it carries nothing the waypoints do not, and two of its three vertices are the pins
  // being corrected here. Correcting it would preserve a "track" that was never a recording; leaving
  // it would leave the map drawing a line to two places the repair has just established are wrong.
  { kind: "set", route: "wa_scramble_route", path: "gpx",
    expect: "20e9256742da7214", value: null,
    why: "a 3-vertex synthetic line whose only content is the waypoints, two of them corrected here" },

  // alpine_grade "III" is ruled out and the row already holds the defensible value in its own
  // commitment field, so this copies rather than types. A 5.5-hour class-3 scramble with 0 pitches
  // is not NCCS III; every comparable WA row (wa_guye_peak_r2, wa_honeymoon_route, both
  // wa_mount_seattle_*) stores I in both fields, and rows storing III at 5-6 hours are technical
  // rock. The page prints "Commitment II" beside "Alpine III" on one row, so the contradiction is
  // on screen. No source assigns an NCCS grade at all, so the replacement is the row's own II
  // rather than the I its siblings use — the minimum change that removes an unsupportable claim.
  { kind: "copy", route: "wa_scramble_route", path: "alpine_grade",
    expect: "399dbc8659309a24", from: "commitment",
    why: "III is unsupportable for a 5.5-hour class-3 scramble, and the row's own commitment already says II" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,waypoints,gpx,alpine_grade,commitment",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
