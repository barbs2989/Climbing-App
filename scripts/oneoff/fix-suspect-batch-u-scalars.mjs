// Suspect-backlog repairs, batch U — the MECHANICAL tier: scalars, explicit nulls, and one
// same-row coordinate copy. Every value here is either a number the evidence states outright,
// a null because the stored value is unsupported or fabricated, or a copy of a value the row
// already holds. Prose repairs from the same batch are a separate script.
//
// Verdicts are recorded in wa-route-audit/findings/resolutions.jsonl, keyed (route, field).
//
// Run with no flag for a dry run; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  // ---- wa_switchback_mountain_scramble.gain_ft ------------------------------------------
  // Settled from the row alone: itinerary days sum 3760 + 1800 = 5560, which is EXACTLY the
  // stored loss_ft, and totalNote says "roughly 5,600 ft". It is a camp-and-return, so gain
  // must equal loss. 5070 matches nothing in the row.
  { kind: "set", route: "wa_switchback_mountain_scramble", path: "gain_ft",
    expect: "739ec77b846ad913", value: 5560,
    why: "5070 matches nothing in its own row; the itinerary sums to 5560 = its own loss_ft" },

  // ---- Lincoln Peak elevation, 9101 -> 9085, on EVERY surface that carries it -----------
  // The row's own `corrections` field records choosing 9,085 BY NAME; the areas row says
  // 9,085; the sibling wilkes_booth row says 9,085; Wikipedia 9,085; AAJ 9,080; every 3DEP
  // sample below 9,085. Nothing supports 9101. Fixing high_point_ft alone would leave the
  // number in a waypoint and three prose strings.
  { kind: "set", route: "wa_lincoln_peak_north_ridge", path: "high_point_ft",
    expect: "74ac6b844cae1e21", value: 9085, why: "9101 unsupported; the row's own corrections field names 9,085" },
  { kind: "set", route: "wa_lincoln_peak_north_ridge", path: "waypoints.7.elev",
    expect: "74ac6b844cae1e21", value: 9085, why: "summit waypoint carried the same wrong elevation" },
  { kind: "jsonedit", route: "wa_lincoln_peak_north_ridge", column: "itinerary",
    expect: "c07781f145701a09", find: "9,101 ft", repl: "9,085 ft", count: 2,
    why: "the wrong elevation is also in two itinerary strings a planner reads" },

  { kind: "set", route: "wa_lincoln_peak_standard", path: "high_point_ft",
    expect: "74ac6b844cae1e21", value: 9085, why: "same peak, same wrong elevation on the sibling route" },
  { kind: "set", route: "wa_lincoln_peak_standard", path: "waypoints.0.elev",
    expect: "74ac6b844cae1e21", value: 9085, why: "summit waypoint" },
  // this waypoint stores the elevation TWICE, under two spellings - the two-convention trap
  { kind: "set", route: "wa_lincoln_peak_standard", path: "waypoints.0.elevFt",
    expect: "74ac6b844cae1e21", value: 9085, why: "the same waypoint carries the elevation again as elevFt" },
  { kind: "jsonedit", route: "wa_lincoln_peak_standard", column: "approach",
    expect: "0e36bc42d8adb6bb", find: "9,101 ft", repl: "9,085 ft", count: 1, why: "approach prose" },
  { kind: "jsonedit", route: "wa_lincoln_peak_standard", column: "climbing_route",
    expect: "37121b593c727b90", find: "9,101 ft", repl: "9,085 ft", count: 1, why: "climbing_route prose" },

  // ---- wa_beyond_redlining -------------------------------------------------------------
  // fa says May 2020, the row's own overview says July 2020, and Mountain Project records
  // July. Both ascents are real; July is the one this route's FA credit belongs to.
  { kind: "edit", route: "wa_beyond_redlining", path: "fa",
    expect: "c0c253e65a638e41", find: "May 2020", repl: "July 2020", count: 1,
    why: "fa contradicts the row's own overview; the external record agrees with the overview" },
  // the trailhead is stored twice, 290 m apart, and the DEM puts the approach_logistics copy
  // ~495 ft above the elevation that same object's own prose states. COPIED from the row's
  // own waypoint - no coordinate is typed here.
  { kind: "copy", route: "wa_beyond_redlining", path: "approach_logistics.trailheadLat",
    expect: "2a739b3c9174aa41", from: "waypoints.0.lat",
    why: "trailhead stored twice 290 m apart; the waypoint is corroborated by the ground and by OSM" },
  { kind: "copy", route: "wa_beyond_redlining", path: "approach_logistics.trailheadLng",
    expect: "02e61eb291c7103b", from: "waypoints.0.lng", why: "the longitude half of the same copy" },

  // ---- unsupported angles --------------------------------------------------------------
  // No published source gives an angle for this route at all; the route page describes
  // "almost-level ridge climbing" with one 4th-class pitch, and there is no snow on it.
  // 50 fits neither half. NULL is the honest value, not a substitute figure.
  { kind: "set", route: "wa_north_ridge_7", path: "max_angle",
    expect: "1a6562590ef19d10", value: null, why: "no source gives an angle; the route is near-level ridge plus one 4th-class pitch" },
  // A first-hand published figure exists and is an upper bound: "did not exceed 40 degrees".
  // The catalog already stores 40 on this peak's sibling east_ridge_2, same line.
  { kind: "set", route: "wa_snowking_mountain_standard", path: "max_angle",
    expect: "1a6562590ef19d10", value: 40, why: "published first-hand bound is 40; the sibling row on the same line already stores 40" },

  // ---- stale / fabricated ---------------------------------------------------------------
  // The correction worries about a name collision with North Early Winter Spire's West Face.
  // The row's area, FA and every geographic field independently confirm the Gunsight route,
  // so the worry is settled and the note is stale bookkeeping.
  { kind: "set", route: "wa_west_face_2", path: "corrections",
    expect: "a3ee04d143ab1383", value: null, why: "stale: the identity worry it records is settled by the row's own area and FA" },
  // peakLat/peakLng is not a record - it sits 0.1 m off the Perfect Pass -> Base chord at
  // exactly t = 1.125, with two other waypoints on the same line at exactly t = 0.25 and 0.75.
  // It is computed, not observed. Removed rather than replaced: no source establishes the
  // pinnacle's coordinate, and minting one is the defect this catalog already carries 346 of.
  { kind: "set", route: "wa_poltergeist_pinnacle_north_route", path: "approach_logistics.peakLat",
    expect: "684c0957f29797d8", value: null, why: "fabricated: extrapolated along the approach chord at exactly t=1.125" },
  { kind: "set", route: "wa_poltergeist_pinnacle_north_route", path: "approach_logistics.peakLng",
    expect: "0ed0f10bb5b39a4f", value: null, why: "the longitude half of the same fabricated point" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
