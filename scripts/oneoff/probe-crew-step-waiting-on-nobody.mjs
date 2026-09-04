#!/usr/bin/env node
// The crew readiness step must not say "Waiting on  to confirm." — with nobody named.
//
// #1554 gave crew_members a THIRD status: `invited` is the organiser's ask, `pending` is the
// climber's own request to join. It excluded `pending` from FOUR readers — `pendCrew` and the
// three "Remind all N who haven't confirmed" expressions — and NOT from `allConfirmed`:
//
//     allConfirmed = roster.every(p => p._status === "confirmed")           // counts pending
//     pendCrew     = roster.filter(p => p._status !== "confirmed"
//                                    && p._status !== "pending")            // excludes it
//
// So a roster of you (confirmed) plus one climber who has ASKED to join makes allConfirmed false
// while pendCrew is EMPTY, and `"Waiting on "+_nm([])+" to confirm."` renders with a hole in it.
// Captured on CI's demo walk:
//
//     STEPS TO GET READY  0 / 3
//     1  Crew
//        Waiting on to confirm.
//     CREW · 2 MEMBERS · 1 OF 2 CONFIRMED
//     You  Organizer  In
//     Sam  Asked to join
//
// Someone who has asked to join is not in the crew yet — the organiser accepts or declines them
// in the block above — so readiness is about the people who ARE in it.
//
// THE EXPRESSIONS ARE LIFTED FROM SOURCE, not re-typed: a copy would agree with itself whatever
// the app did, and that is the whole question. CrewCard itself needs a query provider and a route
// lookup to render, which is far more than this asks.
//
//   node scripts/oneoff/probe-crew-step-waiting-on-nobody.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");

let bad = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); bad++; };
const die = (m) => { console.error("ANCHOR LOST: " + m + " — nothing below is meaningful."); process.exit(1); };

// Lift the balanced expression that starts at `anchor`, ending when every bracket opened inside it
// has closed and the next char is the terminator. Strings are skipped so a brace or a semicolon
// inside one cannot end it early — `pendCrew`'s predicate contains a `;`, so a naive indexOf(";")
// cuts it in half.
function liftFrom(anchor, terminator) {
  if (src.split(anchor).length - 1 !== 1) die(`\`${anchor}\` is not present exactly once`);
  let i = src.indexOf(anchor) + anchor.length;
  let depth = 0, q = null;
  const start = i;
  for (; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === "\\") i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    // TERMINATOR FIRST. `]` is also a closing bracket, so decrementing before the terminator
    // check means the `]` that ends the expression is consumed as a close and the lift runs away —
    // it took 410,854 characters of the file before this order was fixed.
    if (c === terminator && depth === 0) break;
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) depth--;
  }
  const out = src.slice(start, i);
  if (out.length < 20) die(`the expression after \`${anchor}\` lifted short (${out.length} chars)`);
  return out;
}

const allConfExpr = liftFrom("const allConfirmed=", ";");
const pendCrewExpr = liftFrom("var pendCrew=", ";");
const nmExpr = liftFrom("var _nm=", ";");
const labelExpr = liftFrom('["Crew",allConfirmed,', "]");

ok(`lifted allConfirmed (${allConfExpr.length}), pendCrew (${pendCrewExpr.length}), _nm (${nmExpr.length}), label (${labelExpr.length})`);

const step = new Function("roster", `
  const allConfirmed=${allConfExpr};
  const pendCrew=${pendCrewExpr};
  const _nm=${nmExpr};
  return { allConfirmed, pending: pendCrew.length, label: (${labelExpr}) };
`);

const me = { _me: true, name: "You", _status: "confirmed" };
const inv = (n) => ({ name: n, _status: "invited" });
const req = (n) => ({ name: n, _status: "pending" });
const conf = (n) => ({ name: n, _status: "confirmed" });

// ---- 1. THE DEFECT: you plus somebody who only asked to join.
const r1 = step([me, req("Sam Rivera")]);
if (/Waiting on\s{2,}to confirm|Waiting on to confirm/.test(r1.label))
  fail(`the step still renders with nobody named: ${JSON.stringify(r1.label)}`);
else ok(`a pending join request no longer leaves a hole: ${JSON.stringify(r1.label)}`);

if (r1.allConfirmed) ok("...because a request to join is not counted as an outstanding member");
else fail("allConfirmed is still false when the only non-confirmed row is a join request");

// ---- 2. AN INVITE IS STILL OUTSTANDING, or this silences a real waiting state. This is the
// load-bearing control: excluding too much would make every crew read as ready.
const r2 = step([me, inv("Robin Belay")]);
if (/Waiting on Robin to confirm\./.test(r2.label)) ok(`an INVITED climber is still named: ${JSON.stringify(r2.label)}`);
else fail(`an invited climber is no longer waited on: ${JSON.stringify(r2.label)}`);
if (!r2.allConfirmed) ok("...and the crew does not read as fully confirmed");
else fail("a crew with an outstanding invite reads as fully confirmed");

// ---- 3. Both at once: the invite is named, the request is ignored.
const r3 = step([me, inv("Robin Belay"), req("Sam Rivera")]);
if (/Waiting on Robin to confirm\./.test(r3.label) && !/Sam/.test(r3.label))
  ok("with one invite and one request, only the invited climber is named");
else fail(`mixed roster reads wrong: ${JSON.stringify(r3.label)}`);

// ---- 4. Everyone confirmed still says so.
const r4 = step([me, conf("Robin Belay")]);
if (r4.allConfirmed && /Everyone has confirmed/.test(r4.label)) ok("a fully confirmed crew still says so");
else fail(`a fully confirmed crew reads wrong: ${JSON.stringify(r4.label)}`);

// ---- 5. Two outstanding invites keep the conjunction #1554's sibling comment exists for
// ("you, Robin" read as ADDRESSING Robin rather than listing them).
const r5 = step([me, inv("Robin Belay"), inv("Alex Torres")]);
if (/Robin and Alex/.test(r5.label)) ok(`two invites are joined with "and": ${JSON.stringify(r5.label)}`);
else fail(`the conjunction was lost: ${JSON.stringify(r5.label)}`);

// ---- 6. The label can NEVER render with an empty name list, whatever the statuses. This is the
// general form of the defect: allConfirmed and pendCrew must agree about who counts.
for (const roster of [[me], [me, req("A")], [me, req("A"), req("B")], [me, conf("B"), req("A")]]) {
  const r = step(roster);
  if (!r.allConfirmed && r.pending === 0) {
    fail(`allConfirmed=false with an EMPTY pendCrew for ${JSON.stringify(roster.map((p) => p._status))} — the hole is back`);
    break;
  }
}
if (!bad) ok("across every roster shape, a false allConfirmed always has somebody to name");

console.log(bad ? `\n${bad} problem(s).` : "\nall assertions passed");
process.exit(bad ? 1 : 0);
