// Five hard routes whose own rows say the climbing is the easy part.
//
// difficulty.technical is a 1-5 score rendered in the DiffRadar. Measured across the 8,002 WA rows
// that carry both it and a grade_num, the column is well populated and strongly diagonal:
//
//   grade band     t=1    t=2    t=3    t=4    t=5
//   class          955   1062     38      1      0
//   5.0-5.7         14    832    528      1     11
//   5.8-5.10         3      9   1385   1583     11
//   5.11+            2      1      1    974    591
//
// So 1 means "no technical climbing" — 955 class-terrain walk-ups say so — and the off-diagonal
// cells are tiny. Five rows at 5.10 or harder score 2 or less. The MIRROR IS EMPTY: no class-terrain
// route is scored 4 or 5. The class runs one way only, and it is the direction that tells a climber
// a 5.11+ is technically easy.
//
// EVERY ONE IS SETTLED INSIDE ITS OWN ROW OR AGAINST ITS OWN PEAK, with no external source:
//
//   wa_prusik_peak_der_sportsman     5.11+, technical 1. Every Prusik route at 5.9+ or harder scores
//                                    4 — solid_gold (5.11a), stanley_burgner (5.10a),
//                                    boving_christensen (5.10), energizer_bunny (5.10+ C1),
//                                    burgner_stanley (5.9+). It is the HARDEST route on the peak and
//                                    the lowest technical score on it, by three.
//   wa_south_early_winter_spire_direct_east_buttress   technical 1 while free_mojo and the_hitchhiker
//                                    sit at the IDENTICAL grade_num of 11 on the same spire and score
//                                    4. Same formation, same number, scores 4 and 1.
//   wa_mount_stuart_girth_pillar     5.11-, technical 2 — the same score this peak gives its 5.8
//                                    (south_headwall). Its gn=11 sibling gorillas_direct scores 4.
//   wa_goode_mountain_megalodon_ridge  5.10, technical 2 — the same score this peak gives its 5.5
//                                    northeast buttress, five grades easier.
//   wa_east_twin_needle_south_route  5.10a, technical 2. The only route on its peak, so no sibling
//                                    comparison; it rests on the band and on the row itself.
//
// AND IN ALL FIVE, technical IS THE LOWEST OF THE ROW'S OWN FIVE SUB-SCORES. der_sportsman reads
// exposure 4, physical 5, commitment 4, routefinding 4 — and technical 1. A row that scores everything
// about a climb as hard except the climbing is contradicting itself, on the one axis its grade
// measures directly.
//
// THE REPLACEMENT IS NOT A GUESS. 4 is the modal value of the 5.11+ band (974 against 591 at 5), it is
// what the same-grade sibling on the same peak already stores for three of the five, and it is
// consistent with each row's own remaining sub-scores. Nothing is pushed to 5: that would claim these
// are the hardest climbing in the catalog, which nothing here establishes.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  // wa_prusik_peak_der_sportsman — difficulty {"exposure":4,"physical":5,"technical":1,"commitment":4,"routefinding":4}
  { kind: "set", route: "wa_prusik_peak_der_sportsman", path: "difficulty.technical",
    expect: "6b86b273ff34fce1", value: 4,
    why: "5.11+ scored 1 while every Prusik route at 5.9+ or harder scores 4" },
  // wa_south_early_winter_spire_direct_east_buttress — difficulty {"exposure":4,"physical":5,"technical":1,"commitment":4,"routefinding":4}
  { kind: "set", route: "wa_south_early_winter_spire_direct_east_buttress", path: "difficulty.technical",
    expect: "6b86b273ff34fce1", value: 4,
    why: "scored 1 while two siblings at the IDENTICAL grade_num 11 on the same spire score 4" },
  // wa_mount_stuart_girth_pillar — difficulty {"exposure":3,"physical":5,"technical":2,"commitment":5,"routefinding":4}
  { kind: "set", route: "wa_mount_stuart_girth_pillar", path: "difficulty.technical",
    expect: "d4735e3a265e16ee", value: 4,
    why: "5.11- scored 2, the same as this peak's 5.8; its gn=11 sibling scores 4" },
  // wa_goode_mountain_megalodon_ridge — difficulty {"exposure":4,"physical":4,"technical":2,"commitment":5,"routefinding":5}
  { kind: "set", route: "wa_goode_mountain_megalodon_ridge", path: "difficulty.technical",
    expect: "d4735e3a265e16ee", value: 4,
    why: "5.10 scored 2, the same as this peak's 5.5 route" },
  // wa_east_twin_needle_south_route — difficulty {"exposure":4,"physical":4,"technical":2,"commitment":3,"routefinding":5}
  { kind: "set", route: "wa_east_twin_needle_south_route", path: "difficulty.technical",
    expect: "d4735e3a265e16ee", value: 4,
    why: "5.10a scored 2; the lowest of its own five sub-scores" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,difficulty,grade,grade_num",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
