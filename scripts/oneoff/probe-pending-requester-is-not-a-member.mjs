// Does a climber who has only ASKED to join count as a member, and take up a spot?
//
// #1554 introduced the third crew status and stated the rule beside `allConfirmed`: "Someone who
// has asked to join is not in the crew yet." It was applied to four readers, enumerated in that
// same comment. THREE more read the roster whole -- the heading count, the amber "N of M
// confirmed" denominator, and `size`, which drives open spots and the "Crew full" state.
//
// The worst of the three is capacity: with enough unaccepted requests a crew reads
// "✓ Crew full — 3/3" while NOBODY has been accepted, which stops other climbers asking.
//
// CrewCard needs a dozen props and lives in core, so this executes the three EXPRESSIONS against
// rosters rather than rendering it, and asserts the WIRING as source beside them -- a merge that
// keeps `inCrew` and leaves one reader on `roster` restores that reader's defect with every
// expression assertion still green. That is the shape that bit #1643's own merge.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let bad = 0;
const ok = (m) => console.log("  ok   " + m);
const fail = (m) => { bad++; console.log("  FAIL " + m); };
const dead = (m) => { console.error("\nBROKEN PROBE: " + m); process.exit(2); };

const src = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");

// The rule, lifted from source rather than retyped -- a copy would agree with itself whatever the
// app did, which is the whole question.
const m = /const inCrew=roster\.filter\(function\(p\)\{return ([^;]+);\}\);/.exec(src);
if (!m) dead("`const inCrew=roster.filter(...)` is not in ClimbMatchCore.jsx — ANCHOR LOST");
const inCrewOf = (roster) => roster.filter(new Function("p", "return " + m[1] + ";"));

console.log("\n1. the rule itself\n");

const P = (id, status) => ({ id, _status: status });
const you = P(0, "confirmed");

const oneAsked = [you, P(1, "pending")];
if (inCrewOf(oneAsked).length === 1)
  ok("you plus one climber who has ASKED to join is a crew of ONE — the CI capture's own case");
else fail(`expected 1, got ${inCrewOf(oneAsked).length}`);

const invited = [you, P(1, "invited")];
if (inCrewOf(invited).length === 2)
  ok("an INVITED climber still counts — the organiser offered them a seat, so it is held");
else fail("an invited member was dropped from the crew; `invited` is the organiser's own ask");

const busy = [you, P(1, "confirmed"), P(2, "pending"), P(3, "pending"), P(4, "pending"), P(5, "pending")];
const cap = 3, size = inCrewOf(busy).length;
if (size === 2 && Math.max(0, cap - size) === 1)
  ok("a crew of 2 with FOUR unaccepted requests and a cap of 3 has 1 spot left, not 0");
else fail(`size ${size}, spots ${Math.max(0, cap - size)} — unaccepted requests are still consuming capacity`);

// The defect, stated as the thing being ruled out. Without this the case above is satisfied by
// any implementation that happens to return 2.
if (busy.length - 3 >= cap)
  ok("...whereas counting the whole roster gives 6 against a cap of 3, i.e. “Crew full” with nobody accepted");
else fail("the pre-fix expression no longer reproduces the defect — this case proves nothing");

console.log("\n2. every reader goes through it\n");

// Source, not execution: a reader left on `roster` shows the old number while the rule above
// stays correct.
const readers = [
  ["the heading count", /"Crew · "\+inCrew\.length/],
  ["the heading's plural", /inCrew\.length===1\?" member":" members"/],
  ["the amber confirmed-of", /" of "\+inCrew\.length\+" confirmed"/],
  ["crew size, which drives spots and “Crew full”", /const size=inCrew\.length;/],
  ["allConfirmed", /const allConfirmed=inCrew\.every\(/],
];
for (const [what, re] of readers) {
  if (re.test(src)) ok(what + " reads inCrew");
  else fail(what + " no longer reads inCrew — it is counting requesters again");
}

// And the requester must still be ON SCREEN: the organiser accepts or declines them there.
if (/\{roster\.map\(function\(p\)\{var conf=/.test(src))
  ok("the roster LIST still maps every row, so a requester is still visible to the organiser");
else fail("the roster list no longer maps `roster` — a requester may have vanished from the screen, " +
          "which is worse than counting them: the organiser cannot accept somebody they cannot see");

// Fail closed: with no pending rows anywhere in the app this is a rule about nothing.
if (/_status[^;]{0,40}"pending"/.test(src)) ok("the `pending` status is still a thing this app has");
else fail("no `pending` status found in core — either #1554 was reverted or this probe is stale");

console.log("\n3. the SEVEN readers #1647 did not name\n");

// Found by reading #1647's own enumeration and looking for what it did NOT name. Source, not
// execution, for the same reason as section 2: a reader left on `roster` shows the old answer
// while every rule assertion above stays green.
const more = [
  ["risk alignment lists the CREW's tolerances", /const risks=tp\.modules\.includes\("align"\)\?inCrew\.map\(/],
  ["the backcountry safety brief's total", /var total=inCrew\.length;var done=inCrew\.filter\(/],
  ["waiting on X to tap a day that works", /var pendDay=inCrew\.filter\(/],
  ["the remove-vote / just-the-two-of-you gate", /\{inCrew\.length>2\?\(remPend\?/],
  ["the collapsed card's Ready-N-climbers", /"Ready · "\+inCrew\.length\+" climber"/],
  ["...and its N-of-M confirmed denominator", /\+"\/"\+inCrew\.length\+" confirmed"/],
  ["usually free for everyone / no weekly slot works for the whole crew", /if\(inCrew\.length&&inCrew\.every\(m=>slotOn\(/],
  ["Nudge N to pick a day", /var _un=inCrew\.filter\(function\(m\)\{return !m\._me/],
];
for (const [what, re] of more) {
  if (re.test(src)) ok(what + " reads inCrew");
  else fail(what + " is back on `roster` — it is counting a climber who only asked to join");
}

console.log("\n4. the two worst, executed\n");

// A backcountry crew that HAS all reviewed the plan must be able to say so. Pre-fix the total was
// the whole roster, so `done>=total` was UNREACHABLE for as long as any request stood -- a
// readiness state a non-member could hold shut indefinitely.
const bc = [you, P(1, "confirmed"), P(2, "pending")];
const safetyDone = [0, 1];
const doneN = inCrewOf(bc).filter((x) => safetyDone.indexOf(x.id) >= 0).length;
if (doneN >= inCrewOf(bc).length)
  ok("a crew whose members have all reviewed the safety plan can say so with a request open");
else fail("“Whole crew has reviewed the safety plan” is still unreachable while somebody is asking to join");
if (!(doneN >= bc.length))
  ok("...and against the whole roster it was not reachable, so this case is not vacuous");
else fail("the pre-fix expression no longer reproduces the defect — this case proves nothing");

// A requester's risk tolerance is not the crew's. Pre-fix it was LISTED as one, and could flip an
// aligned crew to "mixed; talk through your turnaround before you commit." — a false warning on a
// safety surface, and a false warning is how a real one stops being read.
const R = (id, status, riskTolerance) => ({ id, _status: status, riskTolerance });
const rr = [R(0, "confirmed", "Conservative"), R(1, "confirmed", "Conservative"), R(2, "pending", "Aggressive")];
const risksOf = (list) => list.map((x) => x.riskTolerance).filter(Boolean);
if (new Set(risksOf(inCrewOf(rr))).size === 1)
  ok("an aligned crew still reads “aligned” while an unaccepted request stands");
else fail("a requester's risk tolerance is still flipping the crew to “mixed”");
if (new Set(risksOf(rr)).size > 1)
  ok("...and against the whole roster it read “mixed”, so this case is not vacuous");
else fail("the pre-fix expression no longer reproduces the defect — this case proves nothing");

console.log("\n5. what deliberately keeps the whole roster\n");

// The useful enumeration is this one: a NEW `roster` reader that is not one of these is a defect.
// Each of these is right to include a requester, and a fix that swept them would be over-reach.
const keep = [
  ["the weekly-availability GRID ROWS — seeing when a requester is free is how you decide", /\{roster\.map\(m=><div key=\{m\.id\}/],
  ["name resolution in the day chips", /roster\.find\(function\(p\)\{return p\.id===id;\}\)/],
  ["name resolution inside GearTiers", /roster=\{roster\}/],
  ["the itinerary numerator, which counts who HAS one rather than measuring against the crew", /var _n=roster\.filter\(function\(p\)\{var st=_mi\[p\.id\]/],
];
for (const [what, re] of keep) {
  if (re.test(src)) ok(what + " still reads roster");
  else fail(what + " was swept onto inCrew — that is over-reach, not a fix");
}

console.log(bad ? `\nFAILED — ${bad}` : `\nok — a climber who has only asked to join is not counted as a member and holds no spot.\n`);
process.exit(bad ? 1 : 0);
