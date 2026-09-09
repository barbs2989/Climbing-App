// Guye Peak's summit is stored on four rows with THREE different coordinates, and one of them is
// right. Verified against the federal gazetteer in this session rather than second-hand: GNIS
// layer 5 (Landforms) returns "Guye Peak", King County, at 47.44203827,-121.40876757.
//
//   wa_guye_peak_r1               47.44203,-121.40875     ~2 m from GNIS   <- and its own note
//                                 says "True summit (5,168 ft); small register"
//   wa_guye_peak_improbable_...   47.4415013,-121.4092611  70 m from GNIS
//   wa_guye_peak_southeast_gully  47.442945,-121.409145   ~101 m from GNIS
//   wa_guye_peak_r2               (no coordinate — "north summit")
//
// So the repair is NOT to type the gazetteer value in: a sibling already holds it, so the two
// stray rows are copied from that sibling. No coordinate appears in this file, the donor is
// declared by hash, and the three rows end up byte-identical rather than merely close.
//
// ON THE "SOUTH SUMMIT" NAMING, which is what made this worth checking twice: the traverse row
// calls its pin "south summit, has the summit register". That reads like a DIFFERENT point from
// r1's "true summit" — and if it were, moving it would be wrong. It is not: both rows store the
// same 5,168 ft, both claim the register, and Guye's north peak is the lower one. The south
// summit IS the true summit here, so the two rows describe one place with coordinates 70 m apart.
//
// NOT DONE HERE, and recorded rather than fixed: the peak's own `areas` coordinate is
// 47.442945,-121.409145 — the same value as the southeast_gully pin, ~101 m from GNIS. Whether
// the PEAK is where the catalog says it is belongs to audit:peak-coords, not to a waypoint
// repair, and moving the area under a route is a wider change than this batch.
//
// Dry run by default; --hashes prints the constants (donors included); --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  { kind: "copyRow", route: "wa_guye_peak_improbable_traverse", path: "waypoints.3.lat",
    expect: "72ea38e06febc400",
    from: { route: "wa_guye_peak_r1", path: "waypoints.5.lat", expect: "63bc23d49a0dba30" },
    why: "70 m from the GNIS summit; the sibling's pin matches the gazetteer to ~2 m and says so in its own note" },
  { kind: "copyRow", route: "wa_guye_peak_improbable_traverse", path: "waypoints.3.lng",
    expect: "ac6b79b2d42fd5de",
    from: { route: "wa_guye_peak_r1", path: "waypoints.5.lng", expect: "c0eb4a2f45e22d48" },
    why: "the longitude half of the same copy" },

  { kind: "copyRow", route: "wa_guye_peak_southeast_gully", path: "waypoints.1.lat",
    expect: "e4dd2e379fac3440",
    from: { route: "wa_guye_peak_r1", path: "waypoints.5.lat", expect: "63bc23d49a0dba30" },
    why: "~101 m from the GNIS summit, and identical to the peak's own area coordinate rather than to the summit" },
  { kind: "copyRow", route: "wa_guye_peak_southeast_gully", path: "waypoints.1.lng",
    expect: "d159369eeba7d7e8",
    from: { route: "wa_guye_peak_r1", path: "waypoints.5.lng", expect: "c0eb4a2f45e22d48" },
    why: "the longitude half of the same copy" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,waypoints",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
