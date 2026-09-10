// The rest of the four-peak camp file, split per row — the half deliberately deferred last time.
//
// Five routes carried a byte-identical seven-entry bivy array across four peaks and four trailheads.
// Mutchler was repaired first and the other four were left with a stated reason: "the splits are NOT
// symmetric and cannot be done by one rule ... doing those from the same reasoning without reading
// each row is how a zone file gets replaced by four wrong zone files." This is that reading.
//
// THE RULE APPLIED, and it is the narrowest one the entries support: an entry that DECLARES ITSELF
// the base for a different peak does not belong on this route. Nothing here rests on distance, on a
// trailhead comparison, or on my judgement about which basin serves which climb.
//
//   [1] "Cyclone Lake"          "THE BASE CAMP FOR SNOWKING MOUNTAIN AND MUTCHLER PEAK"
//   [3] "Head of Kindy Creek"   "THE GROUND THAT PUTS MOUNT BUCKINDY IN RANGE"
//   [5] "Enjar and Hamar Lakes" "The working camps on the western side of SNOWKING MOUNTAIN"
//   [6] "Jug Lake"              "THE BASE FOR MOUNT CHAVAL"
//
// So each row loses exactly the declared-elsewhere entries that do not name its own peak:
//
//   wa_snowking_mountain_standard   drop [3] Buckindy, [6] Chaval
//   wa_east_ridge_2   (Snowking)    drop [3] Buckindy, [6] Chaval
//   wa_mount_buckindy_scramble      drop [1] Snowking+Mutchler, [5] Snowking west, [6] Chaval
//   wa_mount_chaval_scramble        drop [1] Snowking+Mutchler, [3] Buckindy, [5] Snowking west
//
// THE TWO SNOWKING ROWS KEEP THEIR WESTERN CAMPS, and that is the asymmetry the deferral was about.
// Both approach from FR-1570 on the EAST, so by the trailhead argument that split North Gardner they
// would lose Slide Lake and the Enjar/Hamar camps on the west. They keep them because the catalog
// holds no western Snowking route for those camps to move to, and deleting a peak's own camps from
// the only rows that describe that peak would lose them entirely. A camp on the far side of your own
// mountain is a worse fit than one at your own trailhead; it is not a camp for a different climb.
//
// THE UNDECLARED ENTRIES ARE ALL KEPT — [0] Found Lake, [2] the Kindy Ridge crest camps, [4] Slide
// Lake. They describe ground rather than announcing an objective, and this drainage genuinely is
// shared: the Kindy Ridge crest runs toward the head of Kindy Creek, which is Buckindy's own camp.
// Guessing which of those a Chaval party would use is exactly the reasoning that produced the zone
// file in the first place.
//
// Every row keeps at least four entries, which is the test this class has to pass: a real list, not
// an emptied field.
//
// Nothing that stays is retyped: `drop` removes by index after asserting each index's own name, so a
// reordered or edited array is refused rather than losing the wrong element.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const BUCKINDY = { i: 3, name: "Head of Kindy Creek and the Kindy-Buck Creek pass" };
const CHAVAL   = { i: 6, name: "Jug Lake" };
const CYCLONE  = { i: 1, name: "Cyclone Lake and the lakes just north of it" };
const SNOW_W   = { i: 5, name: "Enjar Lake and Hamar Lake" };

const REPAIRS = [
  { kind: "drop", route: "wa_snowking_mountain_standard", path: "bivy", expect: "cd47f062665f33ac",
    drop: [BUCKINDY, CHAVAL],
    why: "one camp declaring itself Buckindy's base and one declaring itself Chaval's" },
  { kind: "drop", route: "wa_east_ridge_2", path: "bivy", expect: "cd47f062665f33ac",
    drop: [BUCKINDY, CHAVAL],
    why: "the same two, on Snowking's other route" },
  { kind: "drop", route: "wa_mount_buckindy_scramble", path: "bivy", expect: "cd47f062665f33ac",
    drop: [CYCLONE, SNOW_W, CHAVAL],
    why: "Snowking's own base camp, Snowking's west-side camps, and Chaval's base" },
  { kind: "drop", route: "wa_mount_chaval_scramble", path: "bivy", expect: "cd47f062665f33ac",
    drop: [CYCLONE, BUCKINDY, SNOW_W],
    why: "Snowking's own base camp, Buckindy's ground, and Snowking's west-side camps" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,bivy",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
