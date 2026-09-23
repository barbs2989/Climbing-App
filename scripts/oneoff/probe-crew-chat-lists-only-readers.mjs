// Does the crew chat's participant strip name only climbers who can actually READ it?
//
// THE CHAT HEADER AND THE CHIP ROW ARE A CLAIM ABOUT WHO SEES WHAT YOU TYPE. Both were built
// from the raw roster -- `activeCrewMembers` was `activeCrew.members.map(...)` and
// `activeCrewOthers` the same minus your own row -- so a climber who had merely ASKED to join
// was announced as a participant. On the seeded demo that is live: `crew_seed_octo` is
// `[{climberId:0,confirmed},{climberId:3,PENDING}]`, so the header read "You + 1 climber ·
// group chat" and the chip row printed that requester's first name.
//
// THE RULE IS THE DATABASE'S, NOT THE APP'S, AND IT IS STRICTER THAN `crewInCrew`.
// `crews_messages` carries its own SELECT policy in 0042 -- a CONFIRMED member, or the crew's
// creator -- so an INVITED member cannot read the chat either, where `crewInCrew` (non-pending)
// admits them. That is why this is a separate helper rather than a third caller of `crewInCrew`:
// being on the trip and being able to read the chat are different questions.
//
// No browser, no database. The two helpers are LIFTED from ClimbMatchCore.jsx and executed --
// a retyped copy would agree with itself whatever the app did, which is the whole question --
// and the wiring is asserted as SOURCE beside them, because executing a helper proves the rule
// and not that the chat still calls it.
import { readFileSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url);
const CORE = readFileSync(new URL("ClimbMatchCore.jsx", ROOT), "utf8");
const APP_RAW = readFileSync(new URL("ClimbMatch.jsx", ROOT), "utf8");

let pass = 0;
const fails = [];
function ok(label) { pass++; console.log("ok    " + label); }
function must(cond, label) { if (cond) ok(label); else { fails.push(label); console.log("FAIL  " + label); } }
function dead(why) { console.log("- BROKEN: " + why); console.log("\nThis run proved NOTHING."); process.exit(1); }

// ---------------------------------------------------------------- lift ------
// Balance braces from the declaration, skipping string and template contents so
// a brace inside a literal cannot desynchronise the walk. The anchor deliberately stops at the
// opening paren: including the parameter name would make renaming a local ANCHOR LOST, which
// reports a correct refactor as a broken probe -- found by the injection suite, not by reading.
function lift(src, decl) {
  const i = src.indexOf(decl);
  if (i < 0) dead("ANCHOR LOST: `" + decl + "` is not in ClimbMatchCore.jsx");
  if (src.indexOf(decl, i + 1) >= 0) dead("`" + decl + "` is declared more than once; this probe cannot say which one runs");
  let k = src.indexOf("{", i + decl.length), depth = 0, q = null;
  for (; k < src.length; k++) {
    const ch = src[k], prev = src[k - 1];
    if (q) { if (ch === q && prev !== "\\") q = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { q = ch; continue; }
    if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return src.slice(i, k + 1);
  }
  dead("unbalanced braces after `" + decl + "`");
}

const readersSrc = lift(CORE, "function crewChatReaders(");
const lineSrc = lift(CORE, "function crewChatParticipantLine(");
if (readersSrc.length < 80) dead("crewChatReaders lifted only " + readersSrc.length + " chars");
if (lineSrc.length < 80) dead("crewChatParticipantLine lifted only " + lineSrc.length + " chars");

const crewChatReaders = new Function("return (" + readersSrc + ")")();
const crewChatParticipantLine = new Function("return (" + lineSrc + ")")();

// -------------------------------------------------------------- fixtures ----
const ids = (c) => crewChatReaders(c).map((m) => m.climberId).sort((a, b) => a - b);

// The seeded demo crew, verbatim in shape: you (confirmed) plus one requester.
const octo = { _organizerId: 0, members: [{ climberId: 0, status: "confirmed" }, { climberId: 3, status: "pending" }] };
// A crew where somebody was invited and has not answered.
const invited = { _organizerId: 0, members: [{ climberId: 0, status: "confirmed" }, { climberId: 7, status: "invited" }] };
// A healthy crew of three.
const full = { _organizerId: 0, members: [{ climberId: 0, status: "confirmed" }, { climberId: 1, status: "confirmed" }, { climberId: 2, status: "confirmed" }] };
// Somebody ELSE created it and your own row is only invited -- the creator still reads, per 0042.
const theirs = { _organizerId: 5, members: [{ climberId: 5, status: "invited" }, { climberId: 0, status: "confirmed" }] };
// A seed crew with no climberId 0 row at all (crew_seed_tingey's shape).
const noMeRow = { members: [{ climberId: 1, status: "confirmed" }] };

console.log("=== 1. who reads the chat ===");
must(ids(octo).join() === "0", "a climber who only ASKED to join is not a chat participant");
must(ids(invited).join() === "0", "an INVITED member is not one either -- 0042 wants confirmed");
must(ids(full).join() === "0,1,2", "every confirmed member IS listed");
must(crewChatReaders(theirs).some((m) => m.climberId === 5), "the CREATOR reads even when their own member row is not confirmed");
must(ids(noMeRow).join() === "1", "a seed crew with no climberId 0 row is unchanged");
must(crewChatReaders(null).length === 0 && crewChatReaders({}).length === 0, "a missing crew yields nobody rather than throwing");

// NON-VACUITY. "nobody is listed" is equally true of a helper that returns [] always, so the
// full crew above has to keep all three -- and it does, asserted separately.
must(crewChatReaders(full).length === 3, "...and the rule is not simply emptying the strip");

console.log("\n=== 2. the line it renders ===");
const two = crewChatParticipantLine(2), one = crewChatParticipantLine(1), none = crewChatParticipantLine(0);
must(two === "You + 2 climbers · group chat", "the populated line is unchanged: " + JSON.stringify(two));
must(one === "You + 1 climber · group chat", "and still singular at one: " + JSON.stringify(one));
must(!/\b0 climbers?\b/.test(none), "at zero it does NOT read 'You + 0 climbers'");
must(!/group chat/.test(none), "...and does not call a chat of one a group");
must(/you/i.test(none) && none.length > 12, "...while still saying something -- a rule that only forbids is satisfied by an empty string");
must(/read|reach|see/i.test(none), "...specifically, that nothing typed here reaches anybody yet: " + JSON.stringify(none));

// ------------------------------------------------------------- the wiring ---
// Comments are stripped FIRST. The fix's own explanation names `crewChatReaders`, so a raw
// source test would pass on the strength of the documentation -- the trap this repo records for
// check:ci-cancel and check:correction-readers. `://` is protected so a URL is not read as a
// line comment.
function strip(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/([^:])\/\/[^\n]*/g, "$1");
}
const APP = strip(APP_RAW);
if (APP.length < 200000) dead("the stripped app source is only " + APP.length + " chars; the stripper ate real code");

console.log("\n=== 3. the chat actually calls it ===");
const wired = (APP.match(/crewChatReaders\(activeCrew\)/g) || []).length;
must(wired === 2, "both chat arrays resolve through crewChatReaders (found " + wired + ", want 2 - the avatar stack and the chip row)");
must((APP.match(/crewChatParticipantLine\(activeCrewOthers\.length\)/g) || []).length === 1, "the header renders the participant line helper");
must(!/activeCrew\.members\.map\(/.test(APP), "the avatar stack no longer maps the raw roster");
must(!/activeCrew\.members\.filter\(function\(m\)\{return m\.climberId!==0;\}\)/.test(APP), "nor does the chip row");

console.log("\n=== 4. the TRIP roster is deliberately NOT swept ===");
// The load-bearing negative. A change that pointed everything at the stricter rule would hide an
// invited member from the organiser who has to chase them, and hide a requester from the
// organiser who has to accept them. Being on the trip is `crewInCrew`; reading the chat is not.
must(/function crewInCrew\(c\)/.test(CORE), "crewInCrew still exists");
must((strip(CORE).match(/crewInCrew\(/g) || []).length >= 3, "...and is still what the roster, the size and the readiness test read");
must(/m\.status!=="pending"/.test(CORE), "...on the non-pending rule, which is wider than the chat's");

console.log("");
if (fails.length) {
  console.log("FAILED " + fails.length + " of " + (fails.length + pass) + ":");
  fails.forEach((f) => console.log("  - " + f));
  process.exit(1);
}
if (pass < 18) dead("only " + pass + " assertions ran; this probe is asking less than it claims");
console.log("ok — the crew chat names only climbers 0042 lets read it (" + pass + " assertions)");
