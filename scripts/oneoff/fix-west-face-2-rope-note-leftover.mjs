// Follow-up to fix-suspect-batch-u-ropes.mjs, and a miss in it.
//
// That repair corrected rope_type, gear, descent, descent_text, the four station lengths and
// rappel_count_note — and left `rope_note` still saying "single 60m rope", which is the exact
// claim the repair exists to remove. A field I did not know the row had. That is the
// "an instance fixed by hand is not a class closed" failure, committed inside the fix for it:
// ask which OTHER fields carry the claim, not just the ones the finding named.
//
// It also removes a needle-tripping NEGATION I introduced. check:rappel-lengths tests for
//   /\bsingle[- ]rope\b|\bsingle\b[^.]{0,20}\brope\b/
// and my own wording "a single rope will not complete it" matched it — the guard reads a denial
// of a single-rope descent as an assertion of one, which is this repo's recorded deny-list trap
// ("Not plowed in winter" read as an open road). "One rope will not complete it" says the same
// thing to a climber without asserting a configuration the row does not have.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  { kind: "edit", route: "wa_west_face_2", path: "rope_note",
    expect: "1facc6c3bd88c3f0",
    find: "single 60m rope",
    repl: "a 60m lead rope, plus a second 60m rope for the double-rope descent rappels",
    count: 1,
    why: "rope_note still asserted a single 60m rope after the rest of the row was corrected to two" },

  { kind: "edit", route: "wa_west_face_2", path: "rappel_count_note",
    expect: "f551584fe32c02e0",
    find: "a single rope will not complete it",
    repl: "one rope will not complete it",
    count: 1,
    why: "my own negation matched the guard's single-rope needle; same meaning without the token" },

  { kind: "edit", route: "wa_west_face_2", path: "gear.1",
    expect: "5d695cfa4a178cbf",
    find: "a single rope will not complete it",
    repl: "one rope will not complete it",
    count: 1,
    why: "the same negation in the gear entry" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
