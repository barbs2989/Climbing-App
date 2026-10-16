#!/usr/bin/env node
/* Most parties carry ONE rope. lib/rappels.js therefore leads with the single-rope count when
   the row states one and it exceeds the documented station list — otherwise a route whose
   station list is the TWO-rope sequence understates the descent for almost everyone reading it.
   Forbidden Peak's West Ridge is the case: 3 stations documented, ~5 on a single rope.

   Extracting that from prose is the risky part, and it fails in the direction that matters —
   a wrong number here is printed as the headline. So the extractor is pinned by cases, and
   the negatives are as important as the positives: a LENGTH must never become a count.

   Static, no DB, no browser. */
import { rappelSingleRope, rappelHeaderLabel, rappelNumbersIn, rappelRopeNeed, rappelSingleRopeWarning } from "../lib/rappels.js";

let fail = 0;
const eq = (label, got, want) => {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};
const R = (rappels, note) => ({ rappels, rappelCountNote: note, rappelDetail: null });

console.log("single-rope count — positives");
eq("~5 single-rope raps", rappelSingleRope(R("Variable — downclimb/short rappels on West Ridge itself, or ~5 single-rope raps via East Ledges/NE Face")), 5);
eq("range takes the TOP end", rappelSingleRope(R(null, "as many as 6-7 sequential single-rope rappels down the full couloir")), 7);
eq("N raps on a single 60 m rope", rappelSingleRope(R("Rappel the route: about 4 rappels on a 60m rope from the 3-bolt summit anchor.")), 4);
eq("'with a single 60 m rope it is four'", rappelSingleRope(R(null, "With a single 60 m rope it is four.")), 4);

console.log("\nsingle-rope count — negatives (must NOT invent one)");
eq("a length, not a count", rappelSingleRope(R("a 50m rappel was used to bypass an icy moat")), null);
eq("double-rope only", rappelSingleRope(R("2 raps off summit bolts on two 60 m ropes")), null);
eq("no rope setup named", rappelSingleRope(R("Roughly 2 rappels back through the moat to the glacier")), null);
eq("empty", rappelSingleRope(R(null, null)), null);

console.log("\nheader label");
const forbidden = { rappelDetail: [1, 2, 3], rappels: "Variable — or ~5 single-rope raps via East Ledges/NE Face", rappelCountNote: null };
eq("single rope leads when it exceeds the station list", rappelHeaderLabel(forbidden), "RAPPELS · ~5 on a single rope · 3 stations documented");
/* A span, not the top end. Forbidden's West Ridge says both "~5 single-rope raps" and "as many
   as 6-7" in dry late season; headlining 7 alone overstates the ordinary day and headlining 5
   alone hides the bad one. */
const span = { rappelDetail: [1, 2, 3], rappels: "or ~5 single-rope raps via East Ledges", rappelCountNote: "as many as 6-7 sequential single-rope rappels in late-season dry conditions" };
eq("span is shown, not just the max", rappelHeaderLabel(span), "RAPPELS · ~5–7 on a single rope · 3 stations documented");
const plain = { rappelDetail: [1, 2, 3], rappels: "3", rappelCountNote: null };
eq("plain agreement is unchanged", rappelHeaderLabel(plain), "RAPPELS · 3 rappels");
const reported = { rappelDetail: [1, 2, 3], rappels: null, rappelCountNote: "parties report up to 7 rappels in dry conditions" };
eq("reported-max wording preserved", rappelHeaderLabel(reported), "RAPPELS · 3 documented · up to 7 reported");
eq("no station list -> no label", rappelHeaderLabel({ rappelDetail: null, rappels: "~5 single-rope raps" }), null);

/* The arithmetic half. A rappel reaches HALF the rope, so a station longer than ~32 m is not
   happening on a single 60 — that table is the two-rope sequence no matter what the prose says.
   42 of 156 catalog station lists are in that position, so the boundary is load-bearing: get it
   wrong and the app either cries wolf on every route or stays silent on all of them. */
const T = (...lens) => ({ rappelDetail: lens.map((lengthM, i) => ({ n: i + 1, lengthM })) });
console.log("\nrope needed, from station lengths");
eq("30 m stations fit a single 60", rappelRopeNeed(T(30, 30, 25)).needs, "single60");
eq("32 m is still a single 60 (boundary)", rappelRopeNeed(T(32)).needs, "single60");
eq("35 m needs a single 70", rappelRopeNeed(T(35, 30)).needs, "single70");
eq("55 m needs two ropes", rappelRopeNeed(T(55, 30)).needs, "double");
eq("longest station is what counts", rappelRopeNeed(T(20, 20, 60)).max, 60);
eq("no lengths -> no verdict", rappelRopeNeed({ rappelDetail: [{ n: 1 }] }), null);
eq("no table -> no verdict", rappelRopeNeed({ rappelDetail: null }), null);

console.log("\nsingle-rope warning fires only when it must");
eq("warns on a two-rope station list", /does not reach the longest station here \(55 m\)/.test(rappelSingleRopeWarning(T(55, 30)) || ""), true);
eq("silent when one rope reaches", rappelSingleRopeWarning(T(30, 28)), null);
eq("header says two ropes", rappelHeaderLabel(T(55, 30)), "RAPPELS · 2 stations · two ropes (longest 55 m)");

/* STATED, not measured. The length rule above is silent when a row's recorded lengths fit one
   rope, and a row can say outright that they do not. wa_east_face_2 is the catalog case: two
   stations, lengths [35, null] -> "single70" -> no warning at all, on a row whose own note says
   "a single rope does not link the stations" and whose station pull note repeats it. Its lengths
   are also disclaimed in the same sentence as estimates that "should not be planned around", so
   the length rule was resting on a number the row tells you not to plan around.

   THE NEGATIVES ARE THE POINT HERE. "Double-rope rappel (or two single-rope rappels)" is not a
   requirement — one rope works and costs one extra rappel — and seven catalog rows are that
   shape. A false rope warning is how a real one stops being read. */
const S = (text, ...lens) => ({
  rappelDetail: (lens.length ? lens : [30]).map((lengthM, i) => ({ n: i + 1, lengthM, notes: i === 0 ? text : null })),
});
console.log("\nrope needed, STATED rather than measured");
eq("station note stating one rope will not link", rappelRopeNeed(S("Two 60 m ropes are the standard kit and a single rope will not link these two stations.", 35)).needs, "double");
eq("...and it carries NO metre figure", rappelRopeNeed(S("a single rope will not link these two stations.", 35)).max, null);
eq("count note stating it", rappelRopeNeed({ rappelDetail: [{ n: 1, lengthM: 30 }], rappelCountNote: "This descent requires two ropes." }).needs, "double");
eq("'must carry two ropes'", rappelRopeNeed(S("Parties must carry two ropes for this descent.", 30)).needs, "double");

console.log("\n...and must NOT invent one (a false rope warning is worse than none)");
eq("'or two single-rope rappels' is not a requirement", rappelRopeNeed(S("Double-rope rappel (or two single-rope rappels) into the notch.", 30)).needs, "single60");
eq("'or split into two' is not a requirement", rappelRopeNeed(S("Can be done as one double-rope rappel, or split into two single-rope raps.", 30)).needs, "single60");
eq("a bare 'double-rope rappel' is not a requirement", rappelRopeNeed(S("Second double-rope rappel reaching easier snow.", 30)).needs, "single60");
eq("two ropes merely recommended is not a requirement", rappelRopeNeed(S("Two 60 m ropes are recommended to save time.", 30)).needs, "single60");
/* Per SENTENCE, not per row: a row may state the requirement in one place and offer the
   one-rope alternative about a different station. The escape must not reach across. */
eq("escape does not cross a sentence boundary", rappelRopeNeed(S("A single rope will not link these stations. Elsewhere, or two single-rope rappels work.", 30)).needs, "double");

console.log("\nstated requirement reaches the reader without a metre figure");
eq("warning names no distance it does not have", /states that a single 60 m rope will not link its stations/.test(rappelSingleRopeWarning(S("a single rope will not link these two stations.", 30)) || ""), true);
eq("warning invents no metres", /\(\d+ m\)/.test(rappelSingleRopeWarning(S("a single rope will not link these two stations.", 30)) || ""), false);
eq("header omits the distance too", rappelHeaderLabel(S("a single rope will not link these two stations.", 30)), "RAPPELS \u00b7 1 station \u00b7 two ropes");
eq("measured rows keep their distance", rappelHeaderLabel(T(55, 30)), "RAPPELS \u00b7 2 stations \u00b7 two ropes (longest 55 m)");

console.log("\nrappelNumbersIn still bounded");
eq("a year is not a rappel count", rappelNumbersIn("bolted in 2023, 4 rappels").join(","), "4");

console.log(fail ? `\ncheck:rappel-single-rope: ${fail} FAILURE(S)` : "\ncheck:rappel-single-rope: ok — the headline count cannot come from a length or an unstated rope setup.");
process.exit(fail ? 1 : 0);
