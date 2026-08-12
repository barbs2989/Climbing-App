#!/usr/bin/env node
/* Most parties carry ONE rope. lib/rappels.js therefore leads with the single-rope count when
   the row states one and it exceeds the documented station list — otherwise a route whose
   station list is the TWO-rope sequence understates the descent for almost everyone reading it.
   Forbidden Peak's West Ridge is the case: 3 stations documented, ~5 on a single rope.

   Extracting that from prose is the risky part, and it fails in the direction that matters —
   a wrong number here is printed as the headline. So the extractor is pinned by cases, and
   the negatives are as important as the positives: a LENGTH must never become a count.

   Static, no DB, no browser. */
import { rappelSingleRope, rappelHeaderLabel, rappelNumbersIn } from "../lib/rappels.js";

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

console.log("\nrappelNumbersIn still bounded");
eq("a year is not a rappel count", rappelNumbersIn("bolted in 2023, 4 rappels").join(","), "4");

console.log(fail ? `\ncheck:rappel-single-rope: ${fail} FAILURE(S)` : "\ncheck:rappel-single-rope: ok — the headline count cannot come from a length or an unstated rope setup.");
process.exit(fail ? 1 : 0);
