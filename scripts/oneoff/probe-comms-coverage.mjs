// commsCoverage() reads a coverage level off a route's `comms` prose for the Safety tab's badge.
// A wrong GREEN badge is the dangerous failure ("No reliable cell coverage" once read as "good"),
// so these cases are taken from real `routes.comms` rows (2026-11-11). Run: node scripts/oneoff/probe-comms-coverage.mjs
import { commsCoverage } from "../../lib/commsCoverage.js";

const cases = [
  ["No cell service at the trailhead or on route.", "none"],
  ["Spotty Verizon on the ridge, none in the basin.", "spotty"],
  ["Good cell coverage throughout; LTE works on the summit.", "good"],
  ["No signal in the canyon, good service on the summit.", "spotty"],
  ["Satellite messenger required.", "none"],
  ["Carry a satellite messenger.", null],
  ["Coverage is reliable from the parking lot.", "good"],
  ["Intermittent AT&T near the col.", "spotty"],
  ["", null],
  [null, null],
  // real rows
  ["No cell coverage.", "none"],
  ["No reliable cell coverage on the peak.", "spotty"],
  ["No documented cell coverage; sources consistently describe the Gunsight Range as among the most remote lower-48 climbing areas — carry a satellite communicator.", null],
  ["No cell coverage on the East Bank Trail, on the north flank, or on the summit. A satellite messenger or PLB is essential, and sky view is limited in the trees.", "none"],
  ["Cell phone service unreliable or absent in Barclay Lake area and Wild Sky Wilderness.", "none"],
  ["Satellite communicator recommended due to poor cell coverage in area.", "spotty"],
  ["Cell coverage is rare in this part of Olympic National Park.", "spotty"],
  ["The route sits above the pass, so cell service is usually available on the ridge.", "good"],
  ["Cell service is unreliable at the trailhead and throughout the wilderness.", "spotty"],
  ["No dependable cell coverage from the trailhead onward. Carry a satellite messenger.", "spotty"],
  ["This is a remote Pasayten Wilderness drainage; don't count on cell coverage at Crater Lake or on the summit ridge.", "spotty"],
  // negation guards: a negated good phrase never reads as good
  ["Coverage is not reliable above treeline.", "spotty"],
  ["Rarely good signal anywhere on route.", null],
  ["Lacks good cell service; bring a sat device.", null],
  ["Good service at the trailhead. No reliable signal on the glacier.", "spotty"],
];

let bad = 0;
for (const [t, want] of cases) {
  const got = commsCoverage(t);
  if (got !== want) { bad++; console.log("FAIL", JSON.stringify(t), "got", got, "want", want); }
}
// GOOD is a global regex; repeated calls must not carry lastIndex state between them.
for (let i = 0; i < 3; i++) if (commsCoverage("Good cell coverage throughout.") !== "good") { bad++; console.log("FAIL repeated call", i); }
console.log(bad ? bad + " failing" : "all " + (cases.length + 3) + " pass");
process.exit(bad ? 1 : 0);
