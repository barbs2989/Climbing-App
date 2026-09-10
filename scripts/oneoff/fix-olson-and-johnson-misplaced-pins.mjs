// Five pins their own rows' controls refuse — and one verdict OVERTURNED, recorded below.
//
// wa_mount_olson_standard HAS THE BEST CONTROL SEEN IN THIS SWEEP and half its pins are wrong.
// Sampled against USGS 3DEP in this session:
//
//   Sundown Pass   stored 4,125 | ground 4,126  (+1 ft)
//   Lake Sundown   stored 3,810 | ground 3,826  (+16 ft)
//   Mount Olson    stored 5,292 | ground 5,256  (-36 ft)
//
// A row whose pass reads to a foot is a row where a four-figure gap is the pin. Then:
//
//   wp[1] "South Fork Skokomish River ford"   stored 1,450 | ground 1,149  (-301 ft)
//   wp[2] "Olympic National Park boundary"    stored 2,500 | ground 1,187  (-1,313 ft)
//   wp[5] "Six Ridge crest / boot-path"       stored 4,650 | ground 2,971  (-1,679 ft)
//   wp[6] "Tarn below Olson's summit block"   stored 5,100 | ground 3,562  (-1,538 ft)
//
// THE FORD IS REFUTED TWICE OVER AND THE SECOND WAY NEEDS NO DEM AT ALL. It claims distMi 2.4 and
// sits 0.43 mi from the trailhead on a bearing of 150 degrees — south-EAST, i.e. DOWNSTREAM. The
// route runs north-west and upstream toward Sundown Pass, so a ford 2.4 trail miles up the valley
// cannot be a quarter of a mile downstream of the car, and it cannot be 149 ft BELOW the trailhead's
// own valley floor. wp[2] fails the same way: it claims 5.1 mi and sits 0.2 mi out.
//
// wa_mount_johnson_standard's control is equally good — trailhead -6 ft, Royal Lake +17, summit +1 —
// and its Royal Creek Camp pin reads +330 ft. What settles it is not the DEM but the row's OWN note,
// which says fires are "allowed only here": the campfire line in Royal Basin is 3,500 ft, the pin's
// stated elevation is 3,500, and the ground under the pin is 3,830. The pin sits ABOVE the rule its
// own note depends on. Its elev and distMi are both corroborated and are kept.
//
// TWO PINS ON THAT ROW WERE CHECKED AND DELIBERATELY LEFT, because a 16-digit coordinate is not
// automatically a computed one. wp[4] stores 47.831319199999996 — which is IEEE-754 noise on a clean
// 7-decimal 47.8313192, not the repeating tail of a division (contrast 48.75060666666667 elsewhere in
// this sweep, whose 666... IS a residue). It and the Clark-Johnson col read +243 and +220 ft, which is
// ordinary hand-placement slop on steep ground. Reading the decimals as a fingerprint without asking
// WHICH kind of tail they carry would have condemned two sound pins.
//
// -------------------------------------------------------------------------------------------------
// A VERDICT OVERTURNED: wa_ottohorn's peak coordinate is NOT repaired here, and the reason matters.
//
// Half of it is confirmed. The stored Ottohorn point (48.7764,-121.3125) is 30 m from Wikipedia's
// Twin Needles and 22 m from this catalog's OWN wa_west_twin_needle area (48.7766,-121.3125), and the
// ground under it reads 7,899 ft against Twin Needles' published 7,936 and Ottohorn's 7,640. So the
// peak really does carry its neighbour's coordinate.
//
// The proposed replacement does not survive the ground. The verdict cites peakery's Ottohorn as
// 48.770706,-121.317940 and claims 3DEP reads 7,654 ft there; measured in this session it reads
// 5,848 ft — 1,792 ft BELOW the summit it is meant to be. The verdict then states its "CORRECT VALUE"
// as 48.77706,-121.31794, which is a DIFFERENT point 670 m away. One of those two is a transcription
// error and nothing in the verdict says which. Writing either would move a peak onto ground that
// cannot hold it, and it would propagate: the same coordinate is on both Ottohorn route rows and on
// the areas row, which is what anchors audit:coord-origin.
//
// What IS repaired is the one Ottohorn pin the ground refuses on its own terms — see the sibling
// script for the col, which reads 5,918 ft against a claimed 7,400 and sits out in Crescent Creek
// Basin rather than in the notch.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  { kind: "set", route: "wa_mount_johnson_standard", path: "waypoints.2.lat",
    expect: "468dfc30009d9d18", value: null,
    why: "Royal Creek Camp is pinned at 3,830 ft, above the 3,500 ft campfire line its own note relies on" },
  { kind: "set", route: "wa_mount_johnson_standard", path: "waypoints.2.lng",
    expect: "0de37112b447c4ea", value: null, why: "the longitude half of the same pin" },

  { kind: "set", route: "wa_mount_olson_standard", path: "waypoints.1.lat",
    expect: "61df30d5645851c5", value: null,
    why: "a ford claiming 2.4 mi upstream, pinned 0.43 mi DOWNSTREAM and 149 ft below the trailhead" },
  { kind: "set", route: "wa_mount_olson_standard", path: "waypoints.1.lng",
    expect: "8152718296b0e2a4", value: null, why: "the longitude half of the same pin" },
  { kind: "set", route: "wa_mount_olson_standard", path: "waypoints.2.lat",
    expect: "1c2a33c083274349", value: null,
    why: "a boundary claiming 5.1 mi, pinned 0.2 mi out and 1,313 ft below its own elevation" },
  { kind: "set", route: "wa_mount_olson_standard", path: "waypoints.2.lng",
    expect: "0701fd6340eaa4be", value: null, why: "the longitude half of the same pin" },
  { kind: "set", route: "wa_mount_olson_standard", path: "waypoints.5.lat",
    expect: "bbced8ccaebc83ae", value: null,
    why: "a ridge crest pinned 1,679 ft below itself, on a row whose pass reads the ground to a foot" },
  { kind: "set", route: "wa_mount_olson_standard", path: "waypoints.5.lng",
    expect: "32aeb27d4a0d60ef", value: null, why: "the longitude half of the same pin" },
  { kind: "set", route: "wa_mount_olson_standard", path: "waypoints.6.lat",
    expect: "a0c794678c6b851e", value: null,
    why: "a tarn below the summit block pinned 1,538 ft below its own elevation" },
  { kind: "set", route: "wa_mount_olson_standard", path: "waypoints.6.lng",
    expect: "5ef46b2e30524557", value: null, why: "the longitude half of the same pin" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,waypoints",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
