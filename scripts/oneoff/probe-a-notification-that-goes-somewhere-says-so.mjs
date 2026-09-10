// A NOTIFICATION THAT GOES SOMEWHERE MUST SAY SO — and one that goes nowhere must not claim to.
//
// `NotifPanel` derived the destination TWICE: an if/else chain for the CLICK, and a separate
// `tappable` boolean for the AFFORDANCE (the → chevron and the cursor). They disagreed --
//
//     const tappable = n.climberId!=null || !!n.tab || !!n.route || !!n.group;
//
// -- omitting `recap` and `goto`, both of which the click chain right beside it handled. So a
// recap notification NAVIGATED on tap while rendering no chevron and `cursor:"default"`: a row
// that works and signposts itself as inert.
//
// FOUND BY READING A CI CAPTURE, not by a scan. In `Home:Unfinished-business-9` every ACTIVITY row
// is followed by "→" except one -- "Did your crew make Schoolroom on May 24? Mark who showed" --
// which is the seed's only `recap` notification.
//
// The rule is `notifTarget()` now, LIFTED FROM SOURCE here rather than retyped, and it drives both
// the affordance and the dispatch so the two cannot disagree again. Section 3 asserts that: a
// merge that keeps the helper and re-derives `tappable` beside it restores the defect with every
// execution assertion still green.
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

// Balance braces from the declaration, so a comment written beside the helper cannot read as
// ANCHOR LOST -- a probe refusing to run because somebody documented the thing it checks.
const lift = (name) => {
  const decl = "function " + name + "(";
  const at = core.indexOf(decl);
  if (at < 0 || core.indexOf(decl, at + 1) >= 0)
    dead("`" + decl + "` is not in ClimbMatchCore.jsx exactly once — ANCHOR LOST");
  let depth = 0, q = null;
  for (let j = core.indexOf("{", at); j < core.length; j++) {
    const ch = core[j];
    if (q) { if (ch === "\\") j++; else if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { q = ch; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (!depth) return core.slice(at, j + 1); }
  }
  dead("`" + decl + "` does not close — ANCHOR LOST");
};
const { notifTarget } = new Function(lift("notifTarget") + "\nreturn {notifTarget};")();

console.log("\n1. every kind the click chain handles has a target\n");

const KINDS = [
  ["group", { id: "n1", group: "group_wasatch_trad" }, "go"],
  ["recap", { id: "n2", recap: "crew_seed_past" }, "go"],
  ["goto", { id: "n3", goto: "crews" }, "go"],
  ["route", { id: "n4", route: "kings_hf" }, "go"],
  ["climberId", { id: "n5", climberId: 2 }, "profile"],
  ["tab", { id: "n6", tab: "me" }, "go"],
];
for (const [name, n, kind] of KINDS) {
  const t = notifTarget(n);
  if (t && t.kind === kind) ok(`a \`${name}\` notification has a ${kind} target`);
  else fail(`a \`${name}\` notification resolved to ${JSON.stringify(t)} — it would render as inert`);
}

// The two the old boolean omitted, named so the defect cannot quietly return.
if (notifTarget({ id: "x", recap: "crew_seed_past" }) && notifTarget({ id: "y", goto: "crews" }))
  ok("...including `recap` and `goto`, the two the old affordance test left out");
else fail("recap/goto still have no target — this is the shipped defect");

console.log("\n2. ...and one that goes nowhere has none\n");

if (notifTarget({ id: "z", text: "just a message" }) === null)
  ok("a notification with no destination resolves to null, so it is not announced as a control");
else fail("a destination-less notification claims a target — it would be an inert button");

if (notifTarget(null) === null && notifTarget(undefined) === null)
  ok("a missing notification does not throw");
else fail("notifTarget throws on a missing row");

console.log("\n3. ONE derivation drives both the affordance and the click (SOURCE)\n");

const SITES = [
  ["the affordance is derived from the rule, not a second list",
    "const _t=notifTarget(n);const tappable=!!_t;"],
  ["...and the OLD hand-written list is gone",
    "const tappable=n.climberId!=null||!!n.tab||!!n.route||!!n.group;", true],
  ["the click dispatches from the same value",
    'if(_t.kind==="profile"){const c=CLIMBERS.find(x=>x.id===_t.climberId);if(c)onOpenProfile(c);}else{onGo(_t.to);}'],
  ["the spread is CONDITIONAL, so a target-less row is not announced as a control",
    "{...(_t?clickable("],
];
for (const [what, needle, mustBeAbsent] of SITES) {
  const n = core.split(needle).length - 1;
  // "[wiring]" so a failure never reads as its own pass -- see the injection suite's clean-run
  // refusal, which can only be exact if the two texts differ.
  if (mustBeAbsent) {
    if (n === 0) ok(what);
    else fail(`[wiring] ${what} — the second derivation is still there (${n})`);
  } else if (n === 1) ok(what);
  else fail(`[wiring] ${what} — matched ${n} times`);
}

console.log("\n4. Home's third chain, and why it is left alone\n");

// Home derives the same destination a third time. It is safe ONLY because it ends in a fallback
// that opens the panel -- not because its list of kinds is complete. If that fallback ever goes,
// Home inherits exactly the defect this probe exists for, so it is pinned rather than assumed.
// COUNT, anchored to Home's OWN chain. `setNotifOpen(true);}` occurs twice in the file, so a bare
// includes() is satisfied by the OTHER occurrence -- the injection case reported MISSED against a
// deleted fallback, which is this probe's own "matched N times, so the assertion is about an
// unknown site" trap arriving in the one assertion that did not guard against it.
const HOME_FALLBACK = 'if(n.lbtab)setLogbookTab(n.lbtab);return;}setNotifOpen(true);}';
if (app.split(HOME_FALLBACK).length - 1 === 1) ok("Home's alerts chain still ends in the open-the-panel fallback");
else fail("Home's fallback is gone — its rows are now tappable on an INCOMPLETE list of kinds");

if (app.split("if(n.recap){setRecapId(n.recap);return;}").length - 1 === 1)
  ok("...and it still handles recap, so the two chains agree on the seed's one recap alert");
else fail("Home stopped handling recap while NotifPanel still does");

console.log("");
if (bad) { console.log(`${bad} assertion(s) failed.`); process.exit(1); }
console.log("ok — a notification that goes somewhere says so, and one that does not is not a control.");
