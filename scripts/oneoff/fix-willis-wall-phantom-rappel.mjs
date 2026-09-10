// A rappel count resting on a cross-reference that points at nothing — and a rack that cannot make
// the rappel its own row describes.
//
// -------------------------------------------------------------------------------------------------
// wa_mount_rainier_willis_wall — "the Curtis Ridge rock step noted above" IS NOT NOTED ABOVE.
//
// The row stores rappels "1", and its own descent_text explains that count as follows:
//
//   "This is a walk-off/downclimb on established glacier route, not a rappel descent — no fixed
//    rappels are used on the Emmons-Winthrop line. The one rappel some parties do on this route
//    happens on the ascent (the Curtis Ridge rock step noted above), not the descent."
//
// I searched all 196 string leaves of the row. "Curtis Ridge" appears fourteen times and every one is
// the APPROACH ridge — a camp on it, the traverse under it, "the rib you came around to get here".
// "rock step" appears EXACTLY ONCE in the whole row: inside the sentence that says it was noted
// above. The cross-reference has no referent, and the stored count of 1 rests entirely on it.
//
// So the sentence goes and the count is reworded from what the row DOES establish. Everything else in
// descent_text is correct and useful — that there is no way back down the wall, that parties descend
// the Emmons-Winthrop to Camp Schurman, that no fixed rappels are used on that line — and stays.
//
// THE NEW COUNT DOES NOT SAY ZERO FULL STOP, and that restraint is deliberate. The row's rope_note
// states "the route requires rappels off ice cliffs (e.g. ~75ft) using doubled strands off a single
// rope", so the row does assert rappelling ON THE WALL. What it cannot support is a count of one
// attributed to a feature it never describes. The replacement says 0 for the descent, which
// descent_text establishes, and points at the ropework note for the wall, which rope_note
// establishes. Nothing is invented and nothing true is dropped.
//
// NOT REPAIRED HERE, and worth stating because a verdict proposes it: that rope_note's ~75 ft figure
// and its "extra sling used at one rappel anchor" were also imported from the neighbouring Curtis
// Ridge route. That rests on reading Curtis Ridge's own published description, which I did not fetch
// in this session, and the arithmetic gives no help — a 60 m rope doubled reaches 98 ft, so a 75 ft
// rappel on it is perfectly possible. Left alone.
//
// -------------------------------------------------------------------------------------------------
// wa_concerto_in_c_for_drill_and_hammer — a rack that cannot make the rappel the row states.
//
// Its `rappels` reads "Rappel the line of ascent on its fixed Fixe chain anchors; some rappels are a
// full 60 m", and its rappel_count_note is careful and honest about the count. But the gear list asks
// only for "60m rope(s) for rappels". A rope doubled through an anchor reaches HALF its length, so a
// full 60 m rappel cannot be made on one 60 m rope — it needs two, or one plus a tag line. The row
// states the rappel and does not state the rope to make it.
//
// This is arithmetic on the row's own two fields, so no source is needed. The wording avoids the word
// "single" beside "rope" on purpose: check:rappel-lengths' needle reads that as a claim that the
// route IS single-rope, and this repo has already had one of its own repairs trip that guard by
// phrasing a negation as "a single rope will not complete it".
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  { kind: "edit", route: "wa_mount_rainier_willis_wall", path: "descent_text",
    expect: "09447d6d303c9674", count: 1,
    find: " The one rappel some parties do on this route happens on the ascent (the Curtis Ridge rock step noted above), not the descent.",
    repl: "",
    why: "a cross-reference to a rock step this row never describes anywhere in 196 string leaves" },
  { kind: "set", route: "wa_mount_rainier_willis_wall", path: "rappels",
    expect: "6b86b273ff34fce1",
    value: "0 on the descent — the Emmons-Winthrop walk-off uses no fixed rappels. Rappelling on this route is on the wall itself, off ice; see the ropework note.",
    why: "a count of 1 that rested entirely on the phantom cross-reference removed above" },

  { kind: "set", route: "wa_concerto_in_c_for_drill_and_hammer", path: "gear.3",
    expect: "aae6f106e8867128",
    value: "Two 60 m ropes for the rappels — one 60 m rope doubled reaches only 30 m, and this route's own rappel line includes full 60 m stations",
    why: "the row states 60 m rappels and asks for a rack that cannot make them" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,rappels,descent_text,gear",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
