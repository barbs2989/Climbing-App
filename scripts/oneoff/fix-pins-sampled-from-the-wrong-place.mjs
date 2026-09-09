// Three waypoint repairs, every claim re-measured here rather than taken from the research.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

// ---------------------------------------------------------------------------------------------
// wa_chimney_rock_west_face — FOUR upper pins were sampled from the wrong part of a shared GPS
// track, and the ground says so unambiguously. Measured here against USGS 3DEP and against the
// peak's own `areas` coordinate, which is a record neither the pins nor the track derive from:
//
//   wp[4] Sunrise Knob        stored 4,650 ft | ground 6,361 ft | 0.32 km from the peak
//   wp[5] glacier/moat        stored 6,500 ft | ground 5,079 ft | 1.32 km from the peak
//   wp[6] Notch between summits stored 7,000 ft | ground 3,381 ft | 2.23 km from the peak
//   wp[7] South Summit        stored 7,440 ft | ground 3,308 ft | 2.88 km from the peak
//
// The last three walk progressively AWAY from the mountain while their stored elevations climb.
// A summit pin standing on 3,308 ft of ground, 2.9 km from the peak, is not a summit pin. They
// also lie on a sibling row's track at indices 170/187/212/219 with offsets of 22/15/3/0 m, i.e.
// sampled off the tail of that track rather than observed.
//
// The COORDINATES go; the elevations stay. They climb sensibly and are the sound half — and
// where a coordinate is wrong, the ground beneath it is a reading about the wrong place and says
// nothing about the elevation.
//
// NOT touched: wp[2] "PCT Junction near Lemah Meadows", whose ground reads 938 ft above its
// stored value. That pin is stored at the published Lemah Meadow coordinate on two routes and is
// already recorded as correct; the discrepancy is terrain beside a meadow, not a misplaced pin.

// ---------------------------------------------------------------------------------------------
// wa_colchuck_peak_northeast_couloir.waypoints[1] — Colchuck Lake is 615 m east of where every
// sibling puts it. A majority is NOT evidence on its own, since agreeing rows can be one
// enrichment pass counted many times — so what decides it is this row's OWN 451-point recorded
// track, which passes 829 m from this row's pin and 255 m from the siblings' point. The row's
// own track agrees with the siblings against the row. Copied from a NAMED donor on the same
// peak; no coordinate is typed here, and the donor's value is declared by hash too.

// ---------------------------------------------------------------------------------------------
// wa_mount_terror_north_face.waypoints[4] "Terror Basin bivy" — the coordinate fails three ways
// (the ground under it reads 591 ft above the camp's published elevation, which a 10 m DEM
// cannot explain on the flat gravel a basin camp sits on; it lies 1.26 km SOUTH of this row's
// own notch pin, i.e. back down the approach, while the row's own text puts the camp "about 400
// ft below and beyond the saddle"). No replacement is established, so it is nulled rather than
// moved. The 5,800 ft elevation is the published figure and stays.

const REPAIRS = [
  { kind: "set", route: "wa_chimney_rock_west_face", path: "waypoints.4.lat",
    expect: "3a46ce5d294a832a", value: null,
    why: "Sunrise Knob: ground 6,361 ft against a stored 4,650, and 0.32 km from the peak" },
  { kind: "set", route: "wa_chimney_rock_west_face", path: "waypoints.4.lng",
    expect: "6772ebea05ea2449", value: null, why: "the longitude half of wp[4]" },
  { kind: "set", route: "wa_chimney_rock_west_face", path: "waypoints.5.lat",
    expect: "d205000c299a22e2", value: null,
    why: "glacier/moat: ground 5,079 ft against a stored 6,500, 1.32 km from the peak" },
  { kind: "set", route: "wa_chimney_rock_west_face", path: "waypoints.5.lng",
    expect: "89f4c5680e1ae4b4", value: null, why: "the longitude half of wp[5]" },
  { kind: "set", route: "wa_chimney_rock_west_face", path: "waypoints.6.lat",
    expect: "db9706b4b7292ec6", value: null,
    why: "notch between the summits: ground 3,381 ft against a stored 7,000, 2.23 km from the peak" },
  { kind: "set", route: "wa_chimney_rock_west_face", path: "waypoints.6.lng",
    expect: "78cd91947b1d4874", value: null, why: "the longitude half of wp[6]" },
  { kind: "set", route: "wa_chimney_rock_west_face", path: "waypoints.7.lat",
    expect: "8f225aca64319803", value: null,
    why: "South Summit: ground 3,308 ft against a stored 7,440, 2.88 km from the peak" },
  { kind: "set", route: "wa_chimney_rock_west_face", path: "waypoints.7.lng",
    expect: "93672e33d2b3f633", value: null, why: "the longitude half of wp[7]" },

  { kind: "copyRow", route: "wa_colchuck_peak_northeast_couloir", path: "waypoints.1.lat",
    expect: "93a1f7d6fcecccf7",
    from: { route: "wa_colchuck_peak_east_ridge", path: "waypoints.1.lat", expect: "375c28cf973b104b" },
    why: "615 m east of where every sibling puts the lake, and this row's OWN track agrees with the siblings" },
  { kind: "copyRow", route: "wa_colchuck_peak_northeast_couloir", path: "waypoints.1.lng",
    expect: "e21f10423c54f239",
    from: { route: "wa_colchuck_peak_east_ridge", path: "waypoints.1.lng", expect: "a9580c289b7f060c" },
    why: "the longitude half of the same copy" },

  { kind: "set", route: "wa_mount_terror_north_face", path: "waypoints.4.lat",
    expect: "4706322bdebf8b0b", value: null,
    why: "1.26 km back down the approach from the row's own notch pin, on ground 591 ft above the camp's elevation" },
  { kind: "set", route: "wa_mount_terror_north_face", path: "waypoints.4.lng",
    expect: "3489c2cd4e19a236", value: null, why: "the longitude half of the same pin" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  // every path here is under `waypoints`, and a select of "*" over the whole WA catalog is
  // enough to hit the statement timeout on a loaded project - which reads as a broken script
  // rather than a busy database.
  select: "id,waypoints",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
