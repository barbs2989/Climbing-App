// Is a crew's readiness derived ONCE, and does it count YOUR confirmation?
//
// "Everyone in this crew has confirmed" was written twice and the two disagreed about whose
// confirmation counts:
//
//   isReady()      crewInCrew(c).filter(m=>m.climberId!==0).every(m=>m.status==="confirmed")
//   the "Crew ready!" celebration in App
//                  crewInCrew(c).every(function(m){return m.status==="confirmed";})
//
// `isReady` filtered YOUR OWN row out before testing. That is reachable exactly when you were
// INVITED to a crew and never answered: `createCrew` writes no `crew_members` row for the
// creator, so the hydration prepends `{climberId:0,"confirmed"}` whenever you have no row --
// which means the only way your row is something else is that somebody invited you. `isReady`
// then called that crew READY on the badge, the profile invite list and the archive test, while
// the celebration correctly withheld.
//
// Both now read `crewAllConfirmed`. Everything ELSE about the two stays separate, and section 3
// is what pins that: a consolidation that swept the date test too would make the celebration fire
// on a FORCED date, i.e. claim "everyone confirmed the day" about a day the organiser locked
// without them.
//
// No browser, no database. Every function is LIFTED from source and executed.
import { readFileSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url);
const CORE = readFileSync(new URL("ClimbMatchCore.jsx", ROOT), "utf8");
const APP_RAW = readFileSync(new URL("ClimbMatch.jsx", ROOT), "utf8");

let pass = 0;
const fails = [];
function ok(l) { pass++; console.log("ok    " + l); }
function must(c, l) { if (c) ok(l); else { fails.push(l); console.log("FAIL  " + l); } }
function dead(w) { console.log("- BROKEN: " + w); console.log("\nThis run proved NOTHING."); process.exit(1); }

function lift(decl) {
  const i = CORE.indexOf(decl);
  if (i < 0) dead("ANCHOR LOST: `" + decl + "` is not in ClimbMatchCore.jsx");
  if (CORE.indexOf(decl, i + 1) >= 0) dead("`" + decl + "` is declared more than once");
  let k = CORE.indexOf("{", i + decl.length), depth = 0, q = null;
  for (; k < CORE.length; k++) {
    const ch = CORE[k], prev = CORE[k - 1];
    if (q) { if (ch === q && prev !== "\\") q = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { q = ch; continue; }
    if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return CORE.slice(i, k + 1);
  }
  dead("unbalanced braces after `" + decl + "`");
}

const parts = ["function crewInCrew(", "function crewAllConfirmed(", "function datesAgreed(", "function isReady("].map(lift);
if (parts.some((p) => p.length < 60)) dead("one of the lifted functions came back too short to be real");
const mod = new Function(parts.join("\n") + "\nreturn {crewInCrew,crewAllConfirmed,datesAgreed,isReady};")();
const { crewAllConfirmed, isReady } = mod;

// ------------------------------------------------------------- fixtures -----
const D = "2026-08-01";
const withDay = (members, acks) => ({ members, dates: [D], dayAcks: { [D]: acks }, meetPlace: "TH", meetTime: "Dawn" });

// You were INVITED and have not answered. The defect: isReady used to skip your row.
const unanswered = withDay([{ climberId: 0, status: "invited" }, { climberId: 1, status: "confirmed" }], [0, 1]);
// The ordinary shape: your row prepended as confirmed.
const healthy = withDay([{ climberId: 0, status: "confirmed" }, { climberId: 1, status: "confirmed" }], [0, 1]);
// Somebody has only ASKED to join -- crewInCrew drops them, so they must not block readiness.
const withRequester = withDay([{ climberId: 0, status: "confirmed" }, { climberId: 1, status: "confirmed" }, { climberId: 9, status: "pending" }], [0, 1]);
// Another member was invited and has not answered.
const otherInvited = withDay([{ climberId: 0, status: "confirmed" }, { climberId: 2, status: "invited" }], [0, 2]);

console.log("=== 1. whose confirmation counts ===");
must(crewAllConfirmed(unanswered) === false, "an invite YOU have not answered is not 'everyone confirmed'");
must(crewAllConfirmed(healthy) === true, "...and an ordinary crew still is -- the rule is not simply always false");
must(crewAllConfirmed(withRequester) === true, "a climber who only ASKED to join does not block it");
must(crewAllConfirmed(otherInvited) === false, "another member's unanswered invite does block it");
must(crewAllConfirmed({ members: [] }) === false, "a crew with nobody in it is not unanimous -- [].every() is vacuously true");
must(crewAllConfirmed({ members: [{ climberId: 3, status: "pending" }] }) === false, "nor is one whose every member is pending");
must(crewAllConfirmed(null) === false, "a missing crew is not ready rather than throwing");

console.log("\n=== 2. and isReady now agrees ===");
must(isReady(unanswered, true) === false, "isReady no longer calls a crew you have not accepted READY");
must(isReady(healthy, true) === true, "...while an ordinary ready crew still reads ready");
must(isReady(withRequester, true) === true, "...and a pending requester does not hold it shut");
must(isReady(healthy, false) === false, "the chat still has to have started");

console.log("\n=== 3. what is deliberately NOT shared ===");
// The load-bearing negative. Sweeping the date test into the shared helper would make the
// celebration fire on a day the organiser forced, which its own copy denies.
const forced = { members: healthy.members, date: D, dateForced: true, meetPlace: "TH", meetTime: "Dawn" };
must(isReady(forced, true) === true, "isReady still accepts a FORCED date");
must(mod.datesAgreed(forced) === false, "...which datesAgreed alone does not, so the two really do differ");

function strip(s) { return s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/([^:])\/\/[^\n]*/g, "$1"); }
const APP = strip(APP_RAW), CORES = strip(CORE);
if (APP.length < 200000) dead("the stripped app source is only " + APP.length + " chars; the stripper ate real code");

console.log("\n=== 4. both derivations call it ===");
// The DECLARATION matches the call pattern too, so subtract it -- counting raw hits reported a
// correctly wired isReady as broken.
const coreCalls = (CORES.match(/crewAllConfirmed\(c\)/g) || []).length - (CORES.match(/function crewAllConfirmed\(c\)/g) || []).length;
must(coreCalls === 1, "isReady resolves through crewAllConfirmed (found " + coreCalls + " call site(s) in core, want 1)");
must((APP.match(/crewAllConfirmed\(c\)/g) || []).length === 1, "and so does the celebration");
must(!/filter\(m=>m\.climberId!==0\)\.every/.test(CORES), "isReady no longer skips your own row");
must(!/crewInCrew\(c\)\.every\(function\(m\)\{return m\.status==="confirmed";\}\)/.test(APP), "the celebration no longer re-derives it");

console.log("\n=== 5. the celebration keeps its own guards ===");
const celeb = APP.slice(APP.indexOf("var rdy="), APP.indexOf("var rdy=") + 400);
must(/datesAgreed\(c\)/.test(celeb) && !/dateForced/.test(celeb), "it still refuses a FORCED date -- its copy claims everyone confirmed the day");
must(/crewMsgs\[c\.id\]/.test(celeb), "...and still requires the chat to have started");

console.log("");
if (fails.length) { console.log("FAILED " + fails.length + " of " + (fails.length + pass) + ":"); fails.forEach((f) => console.log("  - " + f)); process.exit(1); }
if (pass < 17) dead("only " + pass + " assertions ran; this probe is asking less than it claims");
console.log("ok — crew readiness is derived once, and it counts your own confirmation (" + pass + " assertions)");
