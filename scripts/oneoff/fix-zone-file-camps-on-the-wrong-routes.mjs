// Camps filed on routes that cannot reach them — a zone file handed to every row in a corridor.
//
// This is the class audit:camp-route-fit exists for, and the class the Goat Rocks / Mount St. Helens
// and Mountain Loop repairs already closed for two other corridors. Each entry removed below NAMES
// another peak or another trailhead IN ITS OWN TEXT, which is the internal standard those repairs
// used; nothing here rests on a distance threshold.
//
// -------------------------------------------------------------------------------------------------
// wa_north_gardner_mountain_southwest / wa_north_gardner_mountain_nw_couloir — a TWO-WAY split.
//
// Both rows carry the identical five-entry list. The peak has two approaches from opposite sides and
// the catalog holds one route for each, so the split is decided by each row's OWN trailhead record
// rather than by reading the camps:
//
//   Southwest Slopes / South Ridge   Wolf Creek Trailhead   48.4837,-120.2992  (FS Road 5005, west of Winthrop)
//   Northwest Couloir                Cedar Creek Trailhead  48.5792,-120.4787
//
// Those are about 20 km apart in different valleys, and each route's own approach prose names its
// own trailhead in its first sentence. So "Gardner Meadows, Wolf Creek trail" and the high basin
// above it are the Wolf Creek row's camps, and "Cedar Creek meadow camps above the falls" and the
// "Upper Cedar Creek head basin" — which describes itself as "the western approach camp, and the
// reason to use this side at all" — are the Cedar Creek row's. Neither list is emptied: each row
// keeps two real camps plus the shared road-head campground.
//
// KLIPCHUCK IS DELIBERATELY KEPT ON BOTH, AND ITS NOTE IS A SEPARATE FINDING. It is the corridor's
// only campground with water and a toilet, so it is a genuine option before either climb. But its
// note is written from the Cedar Creek side — "the Cedar Creek trailhead is roughly half a mile
// further along" — and goes on to offer sleeping "at the trailhead" before "the long Wolf Creek or
// Cedar Creek walk at dawn", which is true for Cedar Creek and false for Wolf Creek, 20 km away.
// Dropping it would remove a real option; rewriting it is prose work rather than a mechanical
// repair. Recorded rather than done.
//
// -------------------------------------------------------------------------------------------------
// wa_colchuck_peak_northeast_couloir — three camps in the Enchantments Core, over the wrong pass.
//
// The couloir starts off the Colchuck Glacier, on Colchuck Peak's north side above Colchuck Lake.
// Three of its six entries are Core Enchantment camps reached over AASGARD PASS from that lake — the
// far side of the range — and each names Prusik Peak in its own text:
//   "Perfection Lake and Inspiration Lake basin camps"  "The natural base for Prusik Peak's West Ridge and South Face"
//   "Gnome Tarn"                                        "sits almost directly under Prusik's south side"
//   "Shield Lake, north of Prusik Pass"                 "leaving Prusik's West Ridge within a short reverse approach"
// A party would not cross Aasgard Pass to climb a couloir that starts at the lake they left.
//
// THE FOURTH ENTRY THE VERDICT CALLED FOREIGN IS KEPT, deliberately. "Talus and boulder bivies below
// Dragontail's north side" describes itself as shortening the approach to Backbone Ridge and
// Serpentine Arete, which are Dragontail routes — but that ground is directly across the lake basin
// from Colchuck Peak's north side, close enough that a party on this couloir could plausibly use it.
// Distance is not the test this repair uses, and "the note names another route" is weaker evidence
// than "the camp is over a pass on the wrong side". Left, and flagged.
//
// THE NOTES ON THE TWO KEPT COLCHUCK CAMPS STILL DESCRIBE OTHER OBJECTIVES — the Colchuck Lake entry
// opens "This is the working basecamp for Backbone Ridge, Serpentine Arete and Colchuck Balanced
// Rock" and the Icicle Creek Road entry names the same three. The camps are right for this route;
// the sentences were written for its neighbours. That is the propagation tell surviving the drop,
// and it is a rewrite rather than a deletion.
//
// Nothing that stays is retyped: `drop` removes by index after asserting each index's own name, so a
// reordered or edited array is refused rather than having the wrong element taken out of it.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  { kind: "drop", route: "wa_colchuck_peak_northeast_couloir", path: "bivy", expect: "8e306d948651da39",
    drop: [
      { i: 2, name: "Perfection Lake and Inspiration Lake basin camps" },
      { i: 3, name: "Gnome Tarn" },
      { i: 4, name: "Shield Lake, north of Prusik Pass" },
    ],
    why: "three Enchantments Core camps, over Aasgard Pass from the lake this couloir starts above" },

  { kind: "drop", route: "wa_north_gardner_mountain_southwest", path: "bivy", expect: "1437a475eaec6b2d",
    drop: [
      { i: 3, name: "Cedar Creek meadow camps above the falls" },
      { i: 4, name: "Upper Cedar Creek head basin" },
    ],
    why: "Cedar Creek camps on the Wolf Creek route, whose own trailhead is 20 km away in another valley" },

  { kind: "drop", route: "wa_north_gardner_mountain_nw_couloir", path: "bivy", expect: "1437a475eaec6b2d",
    drop: [
      { i: 1, name: "Gardner Meadows, Wolf Creek trail" },
      { i: 2, name: "High basin camp above Gardner Meadows" },
    ],
    why: "the mirror: Wolf Creek camps on the row whose own name and trailhead are Cedar Creek" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,bivy",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
