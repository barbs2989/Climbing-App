// check:crew — guards the crew "Ready" calculation.
//
// A crew reaching Ready is the signal that day, time and place are locked in for
// EVERYONE — it's what tells a climber their partners are committed to an alpine
// start. Getting it wrong is safety-adjacent, not cosmetic.
//
// It broke once already: useMyCrews fetches crew_members(*) and crew_day_acks(*),
// but the hydration discarded both — members was hardcoded to [{climberId:0}] and
// only the current user's acks were kept. That made need=[0] and dayAcks=[0], so
// datesAgreed() returned true unconditionally: every DB-backed crew reported Ready
// on the creator's ack alone (fixed in #414). datesAgreed itself was always correct;
// only its input was wrong, which is why a unit test on the function alone would
// have missed it. This checks the hydration AND the calculation together.
//
// Both are extracted from the real ClimbMatch.jsx source rather than reimplemented,
// so this fails if either is edited into a wrong shape.
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("../ClimbMatch.jsx", import.meta.url), "utf8");

function extractBraced(marker) {
  const i = SRC.indexOf(marker);
  if (i < 0) throw new Error(`could not find ${marker} in ClimbMatch.jsx`);
  let depth = 0, start = SRC.indexOf("{", i);
  for (let k = start; k < SRC.length; k++) {
    if (SRC[k] === "{") depth++;
    else if (SRC[k] === "}" && --depth === 0) return SRC.slice(i, k + 1);
  }
  throw new Error(`unbalanced braces after ${marker}`);
}

// the crew-row -> app-crew mapping inside the useMyCrews effect
const hStart = SRC.indexOf("var mid=function(u)");
const hEnd = SRC.indexOf("dismissed:!!row.dismissed};", hStart);
if (hStart < 0 || hEnd < 0) {
  console.error("check:crew FAILED — could not locate the crew hydration block.");
  console.error("If it was intentionally restructured, update this script's markers.");
  process.exit(1);
}
const hydrationBody = SRC.slice(hStart, hEnd + "dismissed:!!row.dismissed};".length);

const mod = new Function(
  "row", "uid",
  `${extractBraced("function datesAgreed(c)")}
   const __c = (function(){ ${hydrationBody} })();
   return { crew: __c, ready: datesAgreed(__c) };`
);

const UID = "me-uuid-0000", PARTNER = "partner-uuid-1111";
const base = {
  id: "crew1", route_id: "wa_x", cap: 4, dates: ["2026-08-01"], dismissed: false,
  meet_place: "Trailhead", meet_time: "Dawn", float_plan: null,
  crew_members: [
    { user_id: UID, status: "confirmed", note: "" },
    { user_id: PARTNER, status: "confirmed", note: "" },
  ],
  crew_day_acks: [{ user_id: UID, date: "2026-08-01" }],
};

const cases = [
  ["confirmed partner has NOT acked -> NOT ready", base, false],
  ["partner acks the same day -> ready",
    { ...base, crew_day_acks: [...base.crew_day_acks, { user_id: PARTNER, date: "2026-08-01" }] }, true],
  ["each acked a DIFFERENT day -> NOT ready",
    { ...base, dates: ["2026-08-01", "2026-08-02"],
      crew_day_acks: [{ user_id: UID, date: "2026-08-01" }, { user_id: PARTNER, date: "2026-08-02" }] }, false],
  ["partner still 'invited' -> ready on my ack alone",
    { ...base, crew_members: [{ user_id: UID, status: "confirmed" }, { user_id: PARTNER, status: "invited" }] }, true],
  ["solo crew -> ready on my ack", { ...base, crew_members: [{ user_id: UID, status: "confirmed" }] }, true],
];

const failures = [];
for (const [name, row, want] of cases) {
  let got;
  try { got = mod(row, UID).ready; }
  catch (e) { failures.push(`${name} — threw: ${e.message}`); continue; }
  if (got !== want) failures.push(`${name} — got ${got}, want ${want}`);
  console.log(`  ${got === want ? "ok  " : "FAIL"}  ${name}`);
}

// the hydration must carry every member through, not just the current user
const { crew } = mod(base, UID);
if (crew.members.length !== 2) failures.push(`hydration dropped members — got ${crew.members.length}, want 2`);
if (!crew.members.some(m => m.climberId === 0)) failures.push("current user not mapped to climberId 0");
if (!crew.members.some(m => m.climberId === PARTNER)) failures.push("partner not carried through hydration");
console.log(`  ${crew.members.length === 2 ? "ok  " : "FAIL"}  hydration carries all crew_members`);

if (failures.length) {
  console.error(`\n${failures.length} crew-ready check failure(s):\n`);
  failures.forEach(f => console.error("  - " + f));
  console.error("\nA crew must not report Ready until every CONFIRMED member has acked the same day.");
  process.exit(1);
}
console.log("\ncrew Ready calculation: ok");
