// Waypoint elevations with a definite answer, and three coordinates that are provably wrong
// with nothing to replace them. Every claim re-checked against the live rows here.
//
// Dry run by default; --hashes prints the constants (donors included); --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

// ---------------------------------------------------------------------------------------------
// ONE TRAILHEAD, FIVE RECORDS, TWO ANSWERS. All five Cutthroat rows store the byte-identical
// coordinate 48.5144,-120.6902 for the climbers' trail pullout: three say 4,900 ft and two say
// 4,947. The ground reads 4,987 — 40 ft from 4,947 and 87 ft from 4,900 — so the three low ones
// move. Note this is NOT settled by the count: 3-2 favours the WRONG value, and it is the ground
// that decides. Copied from a named sibling rather than typed, so the five end up byte-identical
// rather than merely close.

const REPAIRS = [
  // -------------------------------------------------------------------------------------------
  // wa_mount_olson_standard.waypoints[4] "Lake Sundown" — stored 4,030 ft. The lake is 3,810 ft,
  // below the 4,124 ft Sundown Pass which this row's OWN wp[3] stores as 4,125. Two records
  // sharing no input agree: a published description gives 3,810, and 3DEP at the stored
  // coordinate reads 3,825.5 — within 16 ft. The coordinate is fine; only the number moves.
  { kind: "set", route: "wa_mount_olson_standard", path: "waypoints.4.elev",
    expect: "54a9075c64e82a30", value: 3810,
    why: "a lake stored 220 ft too high, 95 ft below its own pass pin instead of 314 ft below it" },

  // -------------------------------------------------------------------------------------------
  // wa_mount_blum_north_ridge.waypoints[1] "Blum Lakes" — stored 4,900 ft. The ground under this
  // row's own pin reads 5,021, and the South Ridge sibling stores 5,003 at a pin 13 m away. So
  // the ground agrees with the sibling to 18 ft and disagrees with this row by 121 ft. Blum
  // Lakes is a GROUP, and the sibling's other pin (490 m away) legitimately stores 4,900 for a
  // different lake — which is why the donor is the one 13 m from this pin, not merely the one
  // with the same name.
  { kind: "copyRow", route: "wa_mount_blum_north_ridge", path: "waypoints.1.elev",
    expect: "0ec89b31a9f42dec",
    from: { route: "wa_mount_blum_south_ridge", path: "waypoints.5.elev", expect: "5ca452a03e3d5c2d" },
    why: "the ground agrees with the sibling pin 13 m away to 18 ft and disagrees with this row by 121 ft" },

  { kind: "copyRow", route: "wa_cutthroat_peak_northeast_face", path: "waypoints.0.elev",
    expect: "0ec89b31a9f42dec",
    from: { route: "wa_north_ridge_3", path: "waypoints.0.elev", expect: "47dbf29fa3c12260" },
    why: "one trailhead on five rows at the identical coordinate with two elevations; the ground favours 4,947" },
  { kind: "copyRow", route: "wa_cutthroat_peak_cauthorn_wilson_couloir", path: "waypoints.0.elev",
    expect: "0ec89b31a9f42dec",
    from: { route: "wa_north_ridge_3", path: "waypoints.0.elev", expect: "47dbf29fa3c12260" },
    why: "one trailhead on five rows at the identical coordinate with two elevations; the ground favours 4,947" },
  { kind: "copyRow", route: "wa_cutthroat_peak_southeast_buttress", path: "waypoints.0.elev",
    expect: "0ec89b31a9f42dec",
    from: { route: "wa_north_ridge_3", path: "waypoints.0.elev", expect: "47dbf29fa3c12260" },
    why: "one trailhead on five rows at the identical coordinate with two elevations; the ground favours 4,947" },

  // -------------------------------------------------------------------------------------------
  // wa_ottohorn_southeast_route.waypoints[6] "Ottohorn-Himmelhorn col" — the pin is out in the
  // basin rather than on the col between the two horns. Its elevation is about right (the ground
  // at the real col reads 7,505 against a stored 7,400), so only the coordinate goes. NOT
  // replaced: the position the research derived is the midpoint between two published summit
  // coordinates, and writing a midpoint is precisely the interpolation defect this catalog
  // already carries hundreds of.
  { kind: "set", route: "wa_ottohorn_southeast_route", path: "waypoints.6.lat",
    expect: "7aac9a29c6366b38", value: null,
    why: "the col pin sits down in the basin; no observed replacement exists and a midpoint would be fabricated" },
  { kind: "set", route: "wa_ottohorn_southeast_route", path: "waypoints.6.lng",
    expect: "dccfeb751c81c32f", value: null, why: "the longitude half of the same pin" },

  // -------------------------------------------------------------------------------------------
  // wa_mount_terror_north_face.waypoints[6] "5.7 crux chimney/dihedral" — sits 290 m WEST and
  // 18 m south of this row's own summit pin, i.e. on the West Ridge, which is the line the row's
  // own descent_text sends parties DOWN. A crux on the north face cannot be on the descent ridge.
  { kind: "set", route: "wa_mount_terror_north_face", path: "waypoints.6.lat",
    expect: "732d005768297eb8", value: null,
    why: "a north-face crux pinned on the West Ridge, which the row's own descent_text descends" },
  { kind: "set", route: "wa_mount_terror_north_face", path: "waypoints.6.lng",
    expect: "ef7eaa20beee7ce9", value: null, why: "the longitude half of the same pin" },

  // -------------------------------------------------------------------------------------------
  // wa_chockstone_route.waypoints[1] "Spire col (gully base)" — its coordinate is BYTE-IDENTICAL
  // to this row's own waypoints[3] summit pin (48.51291,-120.65557), which itself sits 8 m from
  // the peak's `areas` coordinate and is therefore the correct record. The col pin is the summit
  // coordinate reused for an intermediate point, so it is not a position at all.
  //
  // waypoints[2] "Chockstone crux" sits 50 m from the summit and is left alone: near a summit is
  // where a chockstone crux belongs, and 50 m is not evidence of reuse the way 0 m is.
  { kind: "set", route: "wa_chockstone_route", path: "waypoints.1.lat",
    expect: "69f121b95ce07861", value: null,
    why: "byte-identical to this row's own summit pin — the summit coordinate reused for the col" },
  { kind: "set", route: "wa_chockstone_route", path: "waypoints.1.lng",
    expect: "c29bbc6ed4f8aa40", value: null, why: "the longitude half of the reused coordinate" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,waypoints",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
