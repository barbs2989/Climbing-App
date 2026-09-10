// Fifteen sortable grades that take the high end of their own range while the catalog takes the low.
//
// grade_num is the SORTABLE grade: both finder RPCs (0018/0019) rank and filter on it, so a wrong
// value is invisible — the route simply sits in the wrong place in a list nobody cross-checks.
// check:grade-parser pins lib/grade.js as the ONE place it is derived; audit:grade-num-drift asks
// whether the stored value still agrees with that parser, and puts these rows in its class F,
// "plain grade, plain disagreement — these are where a genuinely wrong stored value lives".
//
// MEASURED AGAINST THE ROWS IN ITS OWN SYSTEM THAT AGREE, which is the method that settled
// wa_shock_and_awe and which audit:grade-num-drift's own closing line demands:
//
//   150 WA rows have a grade of the form "Class N-M" and store a grade_num
//   130 (87%) store the LOW end — which is exactly what lib/grade.js returns
//    16 store the HIGH end
//     4 store neither
//
// So this is not one convention against another: it is the parser that now owns the column, plus
// seven-eighths of the population, against sixteen rows. Any future re-derivation would change them.
//
// ONE OF THE SIXTEEN IS NOT A DEFECT AND IS EXCLUDED. wa_guye_peak_r2's grade reads "Class 3-4
// scramble (NCCS Grade I, optional 5.4 step)" and the parser returns 4 for it — because it picks up
// the 5.4, not because it took the high end of the class range. Stored and parsed agree, so there is
// no drift. A rule keyed on "stores the high end" alone would have rewritten a correct row; the
// filter is stored !== parsed.
//
// THE PARSER IS NOT SELF-CONSISTENT ACROSS PHRASINGS, and that is worth recording rather than
// glossing, because it bounds how far this repair generalises:
//
//     "Class 3-4"      -> 3      (the low end)
//     "3rd-4th class"  -> 4      (the high end)
//
// Both are the same grade written two ways, and lib/grade.js answers differently. So "agree with the
// parser" is NOT a universal principle for this column, and audit:grade-num-drift's class F contains
// rows failing in BOTH directions — wa_classic_route_3 stores 3 for "3rd-4th class" where the parser
// says 4. This repair is scoped to the "Class N-M" phrasing only, where the parser and the population
// agree with each other. The ordinal phrasing is a separate question and is not touched.
//
// Nothing else in class F is swept either: it holds 52 rows of several different shapes — "Easy 5th"
// stored as 2 against a parsed 5, "Class 5.6" stored as 4 against 6, roman-plus-YDS strings where the
// row stored the wrong half. Those need reading per row.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  // wa_copper_peak_south_route — grade "Class 3-4"
  { kind: "set", route: "wa_copper_peak_south_route", path: "grade_num",
    expect: "4b227777d4dd1fc6", value: 3,
    why: "stores the HIGH end of its own Class 3-4; lib/grade.js and 87% of the population take the low" },
  // wa_east_ridge_2 — grade "Class 2-3"
  { kind: "set", route: "wa_east_ridge_2", path: "grade_num",
    expect: "4e07408562bedb8b", value: 2,
    why: "stores the HIGH end of its own Class 2-3; lib/grade.js and 87% of the population take the low" },
  // wa_east_ridge_6 — grade "Class 3-4"
  { kind: "set", route: "wa_east_ridge_6", path: "grade_num",
    expect: "4b227777d4dd1fc6", value: 3,
    why: "stores the HIGH end of its own Class 3-4; lib/grade.js and 87% of the population take the low" },
  // wa_foggy_peak_scramble — grade "Class 3-4"
  { kind: "set", route: "wa_foggy_peak_scramble", path: "grade_num",
    expect: "4b227777d4dd1fc6", value: 3,
    why: "stores the HIGH end of its own Class 3-4; lib/grade.js and 87% of the population take the low" },
  // wa_mount_chaval_scramble — grade "Class 2-3"
  { kind: "set", route: "wa_mount_chaval_scramble", path: "grade_num",
    expect: "4e07408562bedb8b", value: 2,
    why: "stores the HIGH end of its own Class 2-3; lib/grade.js and 87% of the population take the low" },
  // wa_mount_fernow_southeast_face — grade "Class 3-4"
  { kind: "set", route: "wa_mount_fernow_southeast_face", path: "grade_num",
    expect: "4b227777d4dd1fc6", value: 3,
    why: "stores the HIGH end of its own Class 3-4; lib/grade.js and 87% of the population take the low" },
  // wa_mount_mystery_standard — grade "Class 3-4"
  { kind: "set", route: "wa_mount_mystery_standard", path: "grade_num",
    expect: "4b227777d4dd1fc6", value: 3,
    why: "stores the HIGH end of its own Class 3-4; lib/grade.js and 87% of the population take the low" },
  // wa_mount_pershing_standard — grade "Class 3-4 (steep snow early season)"
  { kind: "set", route: "wa_mount_pershing_standard", path: "grade_num",
    expect: "4b227777d4dd1fc6", value: 3,
    why: "stores the HIGH end of its own Class 3-4; lib/grade.js and 87% of the population take the low" },
  // wa_red_mountain_snoqualmie_standard — grade "Class 2-3"
  { kind: "set", route: "wa_red_mountain_snoqualmie_standard", path: "grade_num",
    expect: "4e07408562bedb8b", value: 2,
    why: "stores the HIGH end of its own Class 2-3; lib/grade.js and 87% of the population take the low" },
  // wa_reynolds_peak_scramble — grade "Class 3-4"
  { kind: "set", route: "wa_reynolds_peak_scramble", path: "grade_num",
    expect: "4b227777d4dd1fc6", value: 3,
    why: "stores the HIGH end of its own Class 3-4; lib/grade.js and 87% of the population take the low" },
  // wa_skookum_peak_twinsisters_scramble — grade "Class 3-4"
  { kind: "set", route: "wa_skookum_peak_twinsisters_scramble", path: "grade_num",
    expect: "4b227777d4dd1fc6", value: 3,
    why: "stores the HIGH end of its own Class 3-4; lib/grade.js and 87% of the population take the low" },
  // wa_sperry_peak_standard — grade "Class 2-3"
  { kind: "set", route: "wa_sperry_peak_standard", path: "grade_num",
    expect: "4e07408562bedb8b", value: 2,
    why: "stores the HIGH end of its own Class 2-3; lib/grade.js and 87% of the population take the low" },
  // wa_three_queens_standard — grade "Class 3-4"
  { kind: "set", route: "wa_three_queens_standard", path: "grade_num",
    expect: "4b227777d4dd1fc6", value: 3,
    why: "stores the HIGH end of its own Class 3-4; lib/grade.js and 87% of the population take the low" },
  // wa_tower_mountain_southwest_route — grade "Class 3-4"
  { kind: "set", route: "wa_tower_mountain_southwest_route", path: "grade_num",
    expect: "4b227777d4dd1fc6", value: 3,
    why: "stores the HIGH end of its own Class 3-4; lib/grade.js and 87% of the population take the low" },
  // wa_wallaby_peak_standard — grade "Class 2-3"
  { kind: "set", route: "wa_wallaby_peak_standard", path: "grade_num",
    expect: "4e07408562bedb8b", value: 2,
    why: "stores the HIGH end of its own Class 2-3; lib/grade.js and 87% of the population take the low" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,grade,grade_num,grade_system",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
