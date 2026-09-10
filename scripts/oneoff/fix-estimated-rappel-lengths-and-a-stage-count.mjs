// Rappel lengths that were inherited from a rope rather than measured — plus a pitch count that
// is really a count of stages.
//
// EVERY ONE OF THESE IS DECIDED BY THE ROW ITSELF. No external source is relied on, which matters
// because the same verdicts also carry guidebook and trip-report evidence I have not read.
//
// ---------------------------------------------------------------------------------------------
// 1. wa_liberty_bell_thin_red_line — four stations, all 55 m, on a row that says they are derived.
//
// Its own rappel_count_note ends: "Per-station distances are not published; the figures given
// assume near-full-length double-rope rappels." That is the table admitting what it is.
//
// The arithmetic finishes it without leaving the row. The rappels start from M&M Ledge, which the
// row's own pitch_detail puts at the top of P9, and P1-P9 sum to 247 m (35+20+25+30+35+22+30+25+25).
// Four rappels of 55 m cover 220 m and leave a party ~27 m above the ground. Four rappels that
// genuinely covered 247 m would need ~62 m each, which exceeds what two 60 m ropes give at all. So
// the stored figure is not merely unmeasured — it is incompatible with the four-rappel count printed
// beside it. Nulled; the count, the bolts and the note stay.
//
// ---------------------------------------------------------------------------------------------
// 2-3. wa_wright_pond and wa_narcos — 30 m stations on a descent the row's own pitches contradict.
//
// This is the dangerous direction: the stored lengths UNDERSTATE the rappels, so a party that
// trusts them could leave the second rope behind and double a single 60 m rope.
//
// wa_wright_pond's own pitch_detail notes BEGIN with the lengths: "55m." on P1, "50m." on P2,
// "50m." on P3, "45m." on P4 — 200 m of climbing that these four rappels reverse. Four stations of
// 30 m cover 120 m, leaving 80 m unaccounted for. The row's own `rappels` says "4 double-rope
// rappels (60m ropes)", and a 30 m rappel needs one 60 m rope doubled, so the second rope the row
// requires would be dead weight. The stored lengths contradict the stored gear on one page.
//
// wa_narcos descends the same Wright-Pond line — its own `rappels` says so — and carries the same
// 30 m on its first and last stations, with the middle two already null. Its rappel_count_note also
// describes data the row does not hold ("all 4 are shown as roughly equal-length"), so that clause
// goes with the numbers.
//
// The lengths are NULLED rather than corrected. Reversing the pitch lengths gives roughly
// 45/50/50/55 m top-down, but assigning those to stations means assuming the rappels land exactly
// on the belays, and this catalog has enough manufactured tables already. What a party needs is on
// the row and stays: four double-rope rappels, two 60 m ropes.
//
// ---------------------------------------------------------------------------------------------
// 4. wa_bears_breast_mountain_southwest_face — a rope's REACH presented as three measurements.
//
// Three stations, all exactly 25 m, which is precisely what a 50 m rope doubled reaches — and the
// row's own station-1 note says "a single 50m rope is sufficient". So 25 is a ceiling inherited
// from the rope, not a measurement. Only stations 1 and 2 are nulled: station 3 is the one the
// record actually supports, and it is left alone rather than swept with the others.
//
// ---------------------------------------------------------------------------------------------
// 5. wa_clark_mountain_west_ridge — `pitches` counts STAGES, and three surfaces read it.
//
// discipline is "mountaineering", `rappels` is "0", and all four pitch_detail entries carry prose
// stage labels with no roped pitch among them: "Approach", "Boulder Basin to Boulder Pass",
// "Walrus Glacier" (grade "Class 3 / glacier travel"), "Summit scramble" (grade "Class 3"). Two
// quantities meaning different things holding the identical number 4 is a derivation, not a
// coincidence.
//
// It is not cosmetic. RouteDetail renders the strap as `route.pitches>0 ? route.pitches+"p · " : ""`,
// so the page prints "4p" for a Class 3 scramble; `techHrs(route.pitches, ...)` adds climbing time
// for four pitches that do not exist; and `retH` takes a different branch entirely on
// `route.pitches>0`. Setting 0 cannot hide the breakdown — isPitched() reads the DISCIPLINE, not
// the count, so these entries already render as stages and continue to.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  { kind: "set", route: "wa_liberty_bell_thin_red_line", path: "rappel_detail.0.lengthM",
    expect: "02d20bbd7e394ad5", value: null,
    why: "four 55 m stations cover 220 m of a 247 m descent the row's own pitches measure" },
  { kind: "set", route: "wa_liberty_bell_thin_red_line", path: "rappel_detail.1.lengthM",
    expect: "02d20bbd7e394ad5", value: null, why: "the same derived 55 m, second station" },
  { kind: "set", route: "wa_liberty_bell_thin_red_line", path: "rappel_detail.2.lengthM",
    expect: "02d20bbd7e394ad5", value: null, why: "the same derived 55 m, third station" },
  { kind: "set", route: "wa_liberty_bell_thin_red_line", path: "rappel_detail.3.lengthM",
    expect: "02d20bbd7e394ad5", value: null, why: "the same derived 55 m, fourth station" },

  { kind: "set", route: "wa_wright_pond", path: "rappel_detail.0.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "30 m against a P1 the row's own note measures at 55 m" },
  { kind: "set", route: "wa_wright_pond", path: "rappel_detail.1.lengthM",
    expect: "624b60c58c9d8bfb", value: null, why: "30 m against a P2 the row's own note measures at 50 m" },
  { kind: "set", route: "wa_wright_pond", path: "rappel_detail.2.lengthM",
    expect: "624b60c58c9d8bfb", value: null, why: "30 m against a P3 the row's own note measures at 50 m" },
  { kind: "set", route: "wa_wright_pond", path: "rappel_detail.3.lengthM",
    expect: "624b60c58c9d8bfb", value: null, why: "30 m against a P4 the row's own note measures at 45 m" },

  { kind: "set", route: "wa_narcos", path: "rappel_detail.0.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "the same 30 m on the same shared Wright-Pond descent line" },
  { kind: "set", route: "wa_narcos", path: "rappel_detail.3.lengthM",
    expect: "624b60c58c9d8bfb", value: null, why: "the same 30 m, final station" },
  { kind: "edit", route: "wa_narcos", path: "rappel_count_note",
    expect: "94413af364a4cad4", count: 1,
    find: "recorded, so all 4 are shown as roughly equal-length doubled-rope rappels — the lengths are estimated rather than station-confirmed.",
    repl: "recorded, and no per-station length is shown.",
    why: "the note described data the row does not hold, and holds less of after this repair" },

  { kind: "set", route: "wa_bears_breast_mountain_southwest_face", path: "rappel_detail.0.lengthM",
    expect: "b7a56873cd771f2c", value: null,
    why: "25 m is what a 50 m rope doubled reaches, which the row's own note calls sufficient" },
  { kind: "set", route: "wa_bears_breast_mountain_southwest_face", path: "rappel_detail.1.lengthM",
    expect: "b7a56873cd771f2c", value: null, why: "the same inherited ceiling, second station" },

  { kind: "set", route: "wa_clark_mountain_west_ridge", path: "pitches",
    expect: "4b227777d4dd1fc6", value: 0,
    why: "4 is the number of prose STAGE entries on a mountaineering route storing 0 rappels" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,rappel_detail,rappel_count_note,pitches",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
