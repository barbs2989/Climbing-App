// A climber who has only ASKED to join is not on the crew -- OUTSIDE CrewCard.
//
// #1554 stated the rule and named four readers. #1647 read that list and found three more. #1664
// read THAT list and found seven. All fourteen were inside CrewCard, because each sweep was scoped
// to its local `roster`. The enumeration stopped at the component and the rule did not: TEN more
// readers in two files ask `crew.members` whole, and every one of them gets it wrong the same way.
//
// Found by READING a fresh `ui-screens` capture rather than diffing one: Partners showed Sam as
// "✓ On crew" for the Octopussy crew while the Crew tab, one tap away, showed Sam as "Asked to
// join". Two screens, one crew, two answers.
//
// The worst is not a count. `analyzeAlignment` raises a CRITICAL flag from a requester's risk
// tolerance -- "Conservative and Aggressive members in same party" -- and gates "Team Ready to
// Climb" on them having answered a questionnaire, so a stranger's request could put a false safety
// warning on your crew and hold its ready state shut. That is the twin of the `risks` fix #1664
// made inside CrewCard, on a different screen through a different variable in a different file.
//
// The helpers are LIFTED FROM SOURCE, never retyped -- a copy would agree with itself whatever the
// app did, which is the whole question. Section 3 asserts every reader as SOURCE beside the
// executed rule, because a merge that keeps the helper and leaves one reader on `crew.members`
// restores that reader's defect with every execution assertion still green. Section 4 is the
// load-bearing half: a fix that only ever moves readers ONTO the helper is satisfied by sweeping
// the deliberate ones too, which would hide a requester from the organiser who has to accept them.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let bad = 0;
const ok = (m) => console.log("  ok   " + m);
const fail = (m) => { bad++; console.log("  FAIL " + m); };
const dead = (m) => { console.error("\nBROKEN PROBE: " + m); process.exit(2); };

const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");

// ---------------------------------------------------------------- 1. the rule itself
// Balance braces from the declaration rather than anchoring on the start and end of a LINE.
// Injection case `SILENT-comment-quotes-the-old-expression` is why: a `^function` anchor makes a
// comment written beside the helper read as ANCHOR LOST, i.e. the probe refusing to run because
// somebody documented the thing it checks. Strings are skipped so a brace inside one cannot
// desynchronise the count.
const lift = (name) => {
  const decl = "function " + name + "(";
  const at = core.indexOf(decl);
  if (at < 0 || core.indexOf(decl, at + 1) >= 0)
    dead("`" + decl + "` is not in ClimbMatchCore.jsx exactly once — ANCHOR LOST. Either it was "
      + "renamed (re-anchor this probe) or a stale-base squash took it (restore it); `git log -S "
      + name + " -- ClimbMatchCore.jsx` says which.");
  let i = core.indexOf("{", at), depth = 0, q = null;
  for (let j = i; j < core.length; j++) {
    const ch = core[j];
    if (q) { if (ch === "\\") j++; else if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { q = ch; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (!depth) return core.slice(at, j + 1); }
  }
  dead("`" + decl + "` does not close — ANCHOR LOST");
};
const HELPERS = ["crewInCrew", "crewSize", "crewAskedToJoin"].map(lift).join("\n");
const { crewInCrew, crewSize, crewAskedToJoin } =
  new Function(HELPERS + "\nreturn {crewInCrew,crewSize,crewAskedToJoin};")();

const M = (climberId, status) => ({ climberId, status });
const you = M(0, "confirmed");

console.log("\n1. the rule, executed\n");

const octo = { members: [you, M(3, "pending")], cap: 3 };   // the live seed crew, verbatim
if (crewInCrew(octo).length === 1)
  ok("you plus one climber who has ASKED to join is a crew of ONE — crew_seed_octo's own shape");
else fail(`expected 1, got ${crewInCrew(octo).length}`);

if (crewInCrew({ members: [you, M(3, "invited")] }).length === 2)
  ok("an INVITED climber still counts — the organiser offered them the seat, so it is held");
else fail("an invited member was dropped; `invited` is the organiser's own ask, not a request");

if (crewAskedToJoin(octo, 3) && !crewAskedToJoin(octo, 0) && !crewAskedToJoin(null, 3))
  ok("crewAskedToJoin names the requester, not the crew, and survives a missing crew");
else fail("crewAskedToJoin does not identify the pending climber");

console.log("\n2. the size counts YOU once, whichever shape the crew is stored in\n");

// `members` carries a climberId 0 row on a DB-hydrated or app-created crew and NOT on three of the
// five seed crews. So `members.length` is one convention and `members.length+1` is the other, and
// each is wrong for half the data. Both shapes must give the same answer.
const withYouRow = { members: [you, M(1, "confirmed")] };
const withoutYouRow = { members: [M(1, "confirmed")] };      // crew_seed_tingey's shape
if (crewSize(withYouRow) === 2 && crewSize(withoutYouRow) === 2)
  ok("a crew of you and one partner is TWO in both stored shapes");
else fail(`with-you-row ${crewSize(withYouRow)}, without ${crewSize(withoutYouRow)} — the two conventions still disagree`);

if (withYouRow.members.length + 1 === 3)
  ok("...whereas `members.length+1` reads THREE for that same two-person crew — the shape the invite prompt shipped");
else fail("the pre-fix expression no longer reproduces the double-count; this case proves nothing");

if (crewSize(octo) === 1 && Math.max(0, octo.cap - crewSize(octo)) === 2)
  ok("the Octopussy crew is 1 of 3 with 2 spots left, which is what the crew card already says");
else fail(`size ${crewSize(octo)} — the two surfaces still disagree about one crew`);

if (crewSize({}) === 1 && crewSize(null) === 1)
  ok("a crew with no members array is still you");
else fail("crewSize throws or miscounts on an empty crew");

console.log("\n3. every reader goes through it (asserted as SOURCE)\n");

const READERS = [
  ["core", "PartnerSearch shared-objective chip says which it is",
    'const asked=crewAskedToJoin(ex,c.id);'],
  ["core", "PartnerSearch invite chip keeps the invite button suppressed for a requester",
    'return asked?<span style={{flexShrink:0,fontSize:11.5,fontWeight:700,color:C.amber,padding:"3px 4px"}}>Asked to join</span>'],
  ["core", "“Invite to your crew” no longer reads a crew as full on spots nobody holds",
    'if(cr.cap&&crewSize(cr)>=cr.cap)return false;'],
  ["core", "the inbox crew-thread preview counts the crew, not the requests",
    'crewSize(t.cr)+" climber"'],
  ["core", "isReady asks the same question",
    'function isReady(c,hasMessages){return !!(c&&crewInCrew(c).filter(m=>m.climberId!==0).every(m=>m.status==="confirmed")'],
  ["app", "the crew-tab quick list denominator",
    'const otherMem=crewInCrew(cr).filter(m=>m.climberId!==0);'],
  ["app", "“Invite X to one of your crews” counts the crew",
    'count:crewSize(cr),max:crewMax(r)'],
  ["app", "the invite prompt's size",
    'const roster=ex?crewSize(ex):0;'],
  ["app", "...and its sentence distinguishes a request from a membership",
    'asked?(pubFirst(c)+" has asked to join your crew for this climb'],
  ["app", "the friend-suggestion shared-climb row",
    'const asked=crewAskedToJoin(ex,c.id);const already=!asked&&ex&&ex.members.some(m=>m.climberId===c.id);'],
  ["app", "THE SAFETY BRIEF — a requester's risk answers no longer reach analyzeAlignment",
    'crewInCrew(safetyCrewObj).filter(m=>m.climberId!==0).map(m=>crewMemberById(m.climberId))'],
  ["app", "the “Crew ready!” celebration",
    'crewInCrew(c).every(function(m){return m.status==="confirmed";})'],
];
for (const [file, what, needle] of READERS) {
  const src = file === "core" ? core : app;
  const n = src.split(needle).length - 1;
  if (n === 1) ok(what);
  else if (n === 0) fail(what + " — reader is NOT going through the rule (or was re-worded; re-anchor)");
  else fail(what + ` — matched ${n} times, so this assertion is about an unknown site`);
}

console.log("\n4. the readers that keep the WHOLE roster, on purpose\n");

// A rule that only ever REMOVES requesters is satisfied by removing them everywhere, and that would
// hide a requester from the organiser who has to accept or decline them. These must not move.
const DELIBERATE = [
  ["core", "the crew card's member LIST still shows the requester",
    'const mem=crew.members.filter(m=>m.climberId!==0).map('],
  ["core", "the invite sheet still refuses to offer somebody who has already asked",
    'const inCrew=id=>crew.members.some(m=>m.climberId===id);'],
  ["core", "...and so does the connections pool beside it",
    'const addable=(connections||[]).filter(c=>!crew.members.some(m=>m.climberId===c.id));'],
  ["app", "the crew's own profile lookups still resolve every roster row",
    '(c.members||[]).forEach(function(m){var id=m&&m.climberId;'],
  ["app", "a join request still surfaces to the organiser",
    'if(m.status==="pending"&&m.climberId!==0)out.push('],
];
for (const [file, what, needle] of DELIBERATE) {
  const src = file === "core" ? core : app;
  const n = src.split(needle).length - 1;
  if (n === 1) ok(what);
  else fail(what + ` — matched ${n} times; a deliberate whole-roster reader has moved or been swept`);
}

console.log("\n5. non-vacuity — the pre-fix expressions still reproduce the defect\n");

if (octo.members.some((m) => m.climberId === 3))
  ok("`members.some(...)` still calls the requester a member, which is what every fixed reader used");
else fail("the pre-fix membership test no longer fires; section 3 would pass against anything");

const stillFull = { members: [you, M(1, "pending"), M(2, "pending")], cap: 3 };
if (stillFull.members.length >= stillFull.cap && crewSize(stillFull) < stillFull.cap)
  ok("a crew of ONE with two unaccepted requests read as “full” before, and does not now");
else fail("the capacity defect no longer reproduces; the cap assertion proves nothing");

console.log("");
if (bad) { console.log(`${bad} assertion(s) failed.`); process.exit(1); }
console.log("ok — a climber who has only asked to join is not on the crew, on any screen.");
