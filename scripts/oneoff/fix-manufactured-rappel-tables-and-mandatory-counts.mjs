// Four rappel records that a party would rack from, each refuted by its own row.
//
// Two shapes here, and they want opposite repairs. A MANUFACTURED TABLE presents a generated
// figure as a survey and has to go; a MANDATORY COUNT presents an optional rappel as required and
// has to be reworded. Both are read off the page before leaving the car.
//
// ---------------------------------------------------------------------------------------------
// 1. wa_mount_index_north_face — THE TABLE IS THE MANUFACTURED HALF, NOT THE NOTE.
//
// Its own rappel_count_note is honest: "Reported as 4-5 rappels of roughly 30-50 ft each ... exact
// station-by-station beta beyond the total count and length range isn't published". Beneath that
// sits a five-station table, and three tells inside the row show it was generated FROM that note:
//   (a) the lengths are 15/10/15/10/15 m, which is precisely the two ENDS of the note's own
//       "30-50 ft" range alternating — 15 m = 49.2 ft, 10 m = 32.8 ft — and nothing between;
//   (b) all five stations carry a byte-identical anchor string, "tree/bush or existing station";
//   (c) station 5's note ("allow about 5 hours for the full descent") restates the row's own
//       descent_text figure rather than describing a station.
// So the page states that no per-station beta is published and then prints per-station beta. The
// note stays; the table goes. Same class as the Lincoln and Nooksack tables already cleared.
//
// ---------------------------------------------------------------------------------------------
// 2. wa_mount_terror_north_face — THE TABLE'S OWN NUMBERS MAKE THE ROW'S OWN ROPE ADVICE FALSE.
//
// Four stations, all exactly 30 m. The row asserts twice — in descent_text and again inside
// station 3's own note — that "a single 50-60m rope is sufficient for every station reported". A
// 50 m rope doubled reaches 25 m, so a party that carries the rope this page recommends and rigs
// for a stated 30 m station is 5 m short, in what the same paragraph calls a narrow, loose,
// rockfall-prone gully with a melted-out moat. Either the lengths are wrong or the advice is; on a
// safety field neither may stand as written.
//
// The lengths are the unsourced half: rappel_count_note already concedes "4 is a representative
// middle count", and 30 m is visibly propagated from the `rappels` prose "West Ridge notch rappels
// (2x ~30m)". Only the lengthM values are nulled — the anchors and the per-station notes are real
// descriptive beta (the chockstone at the top of the gully, the warning not to rappel into the low
// notch north of the Chopping Block) and are kept.
//
// ---------------------------------------------------------------------------------------------
// 3. wa_mount_constance_north_chimney — A BARE "1" AGAINST A ROW THAT DENIES IT FOUR TIMES.
//
// The stored headline is "1". Its own descent_text says: "most parties downclimb this short
// (~60-80 ft) 3rd/4th-class chimney free rather than rope up"; "multiple detailed trip reports
// describe doing the entire route, up and down, with 'zero raps'"; the anchor is there "for parties
// who prefer not to downclimb it"; and, in as many words, "Net rappel count for this route is best
// described as 0-1". The sibling wa_mount_constance_finger_traverse stores "0" for the same summit
// block and the same descent, so one peak carries two different mandatory counts for one anchor.
// The replacement text is drawn from the row's own sentences, not composed.
//
// AND THE SAME PARAGRAPH FAILS THE ROPE ARITHMETIC TWICE. It calls the rappel "roughly 20-25m" and
// then says "any single rope 30m or longer, doubled, is more than sufficient", repeating "one 30m+
// rope" lower down. A rope doubled through an anchor reaches HALF its length: 30 m gives 15 m and
// does not reach 20-25 m. 50 m is the minimum that does, and is what both clauses now say. This is
// the rope-off-the-end shape and it is the worst thing in this dataset to get wrong.
//
// ---------------------------------------------------------------------------------------------
// 4. wa_baring_mountain_south_route — the same bare "1", same treatment.
//
// Its own descent_text calls the rappel "conditional and optional rather than mandatory", rests it
// on one documented spring trip report, and records that "no bolted or fixed anchors exist on this
// route". Its `descent` field says "Reverse the route with possible rappel". And the sibling
// wa_baring_mountain_northwest_ridge — which this row's own approach_variants calls the same
// physical climb — stores "None. This is a walk-and-scramble route with no rappels". Repaired to
// the Stickney wording, which this catalog has already settled on for exactly this shape.
//
// ---------------------------------------------------------------------------------------------
// DELIBERATELY NOT INCLUDED: wa_mount_shuksan_white_salmon_glacier's rope_length_m of 30. It is the
// only 30 among eight Shuksan rows and the three siblings that reach the same 9,131 ft summit all
// store 60, which is suggestive — but 30 m is a perfectly ordinary GLACIER rope and this row's own
// rope_type says exactly that ("single 30m glacier rope"), on a route its overview calls "an easy
// glacier ascent/descent". The case for 60 turns on published anchors in the summit pyramid gully
// being rigged for a 60 m doubled, which is an external claim; nothing in the row asserts a rappel
// there at all. Not settled from the row alone, so not written here.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  { kind: "set", route: "wa_mount_index_north_face", path: "rappel_detail",
    expect: "2f13d33215bcd1ad", value: null,
    why: "five stations generated from the note that says no per-station beta is published" },

  { kind: "set", route: "wa_mount_terror_north_face", path: "rappel_detail.0.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a stated 30 m station cannot be rigged on the 50 m rope this row twice calls sufficient" },
  { kind: "set", route: "wa_mount_terror_north_face", path: "rappel_detail.1.lengthM",
    expect: "624b60c58c9d8bfb", value: null, why: "the same unsourced 30 m, second station" },
  { kind: "set", route: "wa_mount_terror_north_face", path: "rappel_detail.2.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "the same unsourced 30 m, on the station whose OWN note says a 50-60 m rope is sufficient" },
  { kind: "set", route: "wa_mount_terror_north_face", path: "rappel_detail.3.lengthM",
    expect: "624b60c58c9d8bfb", value: null, why: "the same unsourced 30 m, fourth station" },

  { kind: "set", route: "wa_mount_constance_north_chimney", path: "rappels",
    expect: "6b86b273ff34fce1",
    value: "0-1 (optional). Most parties downclimb the short 3rd/4th-class summit chimney free; a natural anchor near the top of the summit block is there for parties who would rather rappel it.",
    why: "a bare 1 asserts a mandatory rappel the row's own descent_text denies four times" },
  // BOTH halved-reach clauses in one guarded edit. "30m" occurs exactly twice in this value and
  // both occurrences are the same error — "any single rope 30m or longer, doubled" and "(natural
  // anchor, one 30m+ rope)" — so count:2 fixes them together and asserts that no third occurrence
  // has appeared. Written as one repair rather than two because the engine stages by (route,
  // column): a second edit to descent_text would declare a hash computed against the pre-edit
  // value and be refused as moved, which is the contract working rather than a limitation.
  { kind: "edit", route: "wa_mount_constance_north_chimney", path: "descent_text",
    expect: "8a8b4c0ce95c2692", count: 2,
    find: "30m",
    repl: "50m",
    why: "a 30 m rope doubled reaches 15 m and does not reach the 20-25 m the same sentence states" },

  { kind: "set", route: "wa_baring_mountain_south_route", path: "rappels",
    expect: "6b86b273ff34fce1",
    value: "0-1, conditional on snowpack and party. Most parties downclimb the notch step; in higher-snow years, or when it is icy, some rig a short rappel off natural anchors. No bolted or fixed anchors exist on this route.",
    why: "a bare 1 against a row whose own descent_text calls the rappel conditional and optional" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,rappels,rappel_detail,descent_text",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
