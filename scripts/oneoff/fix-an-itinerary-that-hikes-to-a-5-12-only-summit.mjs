// wa_the_balanced_rock's itinerary invites a hiker to a summit that can only be reached by
// multi-pitch 5.11/5.12 climbing, and the row's OWN approach field says so in as many words.
//
// WHAT THE ITINERARY SAYS:
//   title      "Hike/scramble to the famous balanced boulder"
//   note       "NOT A ROPED CLIMB -- hike to Colchuck Lake, continue up into the basin below the
//               peak, and scramble to the perched boulder that gives the formation its name.
//               A GREAT NON-TECHNICAL OBJECTIVE with big views down to the lake."
//   totalNote  "A single day, roughly 9-10 hrs round trip; A LONG HIKE WITH A SCRAMBLE FINISH
//               RATHER THAN TECHNICAL CLIMBING."
//   schedule   5:00 AM leave trailhead -> 6:45 Colchuck Lake -> 8:00 the basin -> 8:45 AT THE
//               BALANCED ROCK ("Boulder problem and photos at ~8,240 ft") -> 2:30 PM back at car
//
// WHAT THE SAME ROW'S `approach` SAYS:
//   "This is NOT a ground-up approach ... reached ONLY after climbing one of the peak's technical
//    routes to the summit ridge (most commonly the West Face or Let It Burn) ... see those routes
//    for the full trailhead-to-wall approach"
//
// Mountain Project's Location for this problem is simply "On top of CBR"
// (https://www.mountainproject.com/route/121203676/the-balanced-rock). The formation's only
// non-technical entry in this catalog, wa_colchuck_balanced_rock_col_east_lake_side_approch, is an
// APPROACH that terminates at the col below the peak, not at the summit. So no walking line to
// this boulder exists, and the itinerary describes a day nobody can have.
//
// THE SAME FRAMING IS DUPLICATED INTO `timing.sectionBreakdown`, which carries the identical note
// (truncated mid-sentence with an ellipsis) and the identical title as its `fromTo`. That is the
// lossy-copy relationship already recorded between timing.sectionBreakdown and itinerary.days:
// repairing one and leaving the other would put the false claim back on the Planner tab.
//
// WHY THIS IS A DELETION AND NOT A REWRITE. The defect is not the wording, it is the day model:
// the schedule puts a party on an 8,240 ft summit three hours and forty-five minutes after leaving
// the car, and its gainFt (3700) cannot reach that summit from a 3,400 ft trailhead either. Every
// field in the day is downstream of the same false premise. Rewriting the prose would leave a
// schedule that is still impossible, and writing a TRUE schedule would mean inventing times for
// "West Face plus the summit boulder" that no source publishes — the fabrication this audit exists
// to remove. Removing a fabricated plan loses nothing: the row's `approach` already describes the
// real way up, correctly, and points at the routes that carry the climbing beta.
//
// BOTH READERS TREAT ABSENCE CORRECTLY, checked before writing rather than assumed --- the lesson
// from DiffRadar, where an empty object rendered a green 0/5 on every axis. RouteDetail gates the
// itinerary on `route.itinerary && route.itinerary.days && route.itinerary.days.length` and reads
// the other as `Array.isArray(tm.sectionBreakdown) ? tm.sectionBreakdown : []`, so a null renders
// nothing rather than an empty shell.
//
// `timing.totalHrs` (9.5) is deliberately LEFT ALONE and reported instead. It is derived from the
// same false model, but unlike the prose it makes no claim about what KIND of day this is, and
// replacing it needs a figure for climbing the West Face and tagging the boulder that nothing
// publishes.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  { kind: "set", route: "wa_the_balanced_rock", path: "itinerary", expect: "c1253849e79f0be4", value: null,
    why: "a one-day plan calling a 5.11+/5.12-only summit \"a great non-technical objective\", with a schedule reaching it 3h45m after leaving the car" },
  { kind: "set", route: "wa_the_balanced_rock", path: "timing.sectionBreakdown", expect: "ac9266f251c0002a", value: null,
    why: "the same \"not a roped climb / non-technical\" framing, copied into the Planner's timing panel" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,itinerary,timing,approach",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
