// A camp file for four peaks, handed whole to a route that can reach three of its seven entries.
//
// THE ZONE FILE IS CONFIRMED BY IDENTITY, not inferred. Five routes carry the byte-identical
// seven-entry bivy array, across FOUR peaks and FOUR different trailheads:
//
//   wa_snowking_mountain_standard   wa_snowking_mountain   FR-1570 (Kindy Creek Road) washout parking
//   wa_east_ridge_2                 wa_snowking_mountain   FR-1570 (Kindy Creek Road) washout parking
//   wa_mount_buckindy_scramble      wa_mount_buckindy      Green Mountain Trailhead
//   wa_mount_chaval_scramble        wa_mount_chaval        Arrow Creek Trailhead
//   wa_mutchler_peak_scramble       wa_mutchler_peak       Cascade River Road
//
// AND THE ENTRIES NAME THEIR OWN OWNERS, in capitals, which is as explicit as this evidence gets:
//   [1] "THE BASE CAMP FOR SNOWKING MOUNTAIN AND MUTCHLER PEAK"     <- names this route, kept
//   [3] "THE GROUND THAT PUTS MOUNT BUCKINDY IN RANGE"              <- another peak
//   [6] "THE BASE FOR MOUNT CHAVAL"                                 <- another peak
//   [5] "The working camps on the western side of Snowking Mountain" <- another peak's far side
//
// [4] SLIDE LAKE GOES WITH THEM ON THE TRAILHEAD ARGUMENT, the same one that split North Gardner
// earlier in this sweep. It calls itself "The western gateway" and is the access for [5] and [6];
// reaching it means driving north from Darrington and up Illabot Creek Road, while this route's own
// approach_logistics says Cascade River Road and its first camp entry describes walking the blocked
// roadbed "from where road 1570 becomes impassable". Different corridor, different side of the massif.
//
// WHAT STAYS IS A REAL LIST, which is the test this class has to pass: Found Lake and the Kindy
// Ridge saddle, Cyclone Lake (the entry that names Mutchler), and the Kindy Ridge crest camps —
// the eastern approach this row actually describes.
//
// ONLY THIS ROW IS REPAIRED, deliberately. The same array sits on four other rows and each needs its
// own split, but the splits are NOT symmetric and cannot be done by one rule: Snowking legitimately
// owns both the eastern Kindy Ridge camps AND the western Slide Lake ones, so for its two rows only
// the Buckindy and Chaval entries are clearly foreign; Buckindy and Chaval each own exactly one
// entry and approach from trailheads this file barely describes. Doing those from the same reasoning
// without reading each row is how a zone file gets replaced by four wrong zone files.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  { kind: "drop", route: "wa_mutchler_peak_scramble", path: "bivy", expect: "cd47f062665f33ac",
    drop: [
      { i: 3, name: "Head of Kindy Creek and the Kindy-Buck Creek pass" },
      { i: 4, name: "Slide Lake" },
      { i: 5, name: "Enjar Lake and Hamar Lake" },
      { i: 6, name: "Jug Lake" },
    ],
    why: "one camp for Buckindy, one for Chaval, one for Snowking's west side, and the western gateway that reaches them" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,bivy",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
