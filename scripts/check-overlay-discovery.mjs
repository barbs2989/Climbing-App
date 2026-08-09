#!/usr/bin/env node
// check:overlay-discovery — every modal the app declares must be openable by the guards.
//
// The three browser guards (check:zero, check:signed-in, check:overlay-scroll) all walk
// "every overlay", and all three get that list from scripts/lib/overlay-scaffold.mjs. Until
// 2026-08-09 the list came from a NAME shape — `[xOpen,setX]=useState(false)` — and
// audits/OVERLAY-GUARD-COVERAGE-2026-08-09.md counted 28 found against 22 more that carry
// role="dialog" and could not be reached by any of the three: LogAscent (the largest
// component in the app, and where a climber actually records a climb), FullProfile, Resume,
// GiveVouch, LogCatch, ReportModal and the rest.
//
// Nothing reported the omission, and that is the part worth keeping in mind: those guards
// count overlays OPENED, so a modal the regex could not see was never a missing row — it was
// not a row at all. A coverage hole in a guard is invisible BY CONSTRUCTION unless something
// asks the question from outside, which is what this script is.
//
// It is static, so unlike the three guards it runs in `npm run build` on every machine, not
// only in CI on a pull request. The browser walks prove the modals RENDER; this proves they
// can still be REACHED, which is the failure that hides.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { overlayStates, buildOpener, buildRouteDetailOpener, OVERLAY_PAYLOADS, NEEDS_EXTRA_STATE } from "./lib/overlay-scaffold.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// The anchor used by check:signed-in and check:overlay-scroll. check:zero injects at its own
// (it rewrites the source first), but both sit in the same place: the top of App, above every
// overlay declaration. If this one moves, the configs that use it fail loudly with ANCHOR LOST.
const ANCHOR = "  const prevUidRef=useRef(uid);";

let fails = 0;
const fail = (m) => { console.error("  FAIL " + m); fails++; };
const ok = (m) => console.log("  ok   " + m);

const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");

const all = overlayStates(app, core);
const flags = all.filter((s) => s.kind === "flag");
const dialogs = all.filter((s) => s.kind === "dialog");

// A collapse in either shape means the discovery stopped matching the code rather than that
// the app lost half its modals — and a guard that discovers nothing reports a clean sweep.
if (flags.length < 20) fail(`only ${flags.length} boolean-flag overlays discovered — the \`[xOpen,setX]=useState(false)\` pattern has stopped matching`);
else ok(`${flags.length} boolean-flag overlays`);
if (dialogs.length < 15) fail(`only ${dialogs.length} dialog-rendering overlays discovered — the behavioural pattern in dialogOverlays() has stopped matching`);
else ok(`${dialogs.length} dialog-rendering overlays (found by what they render, not by their name)`);

// The real assertion: every dialog either has a payload or records why no flag can reach it.
// buildOpener throws rather than emitting a map with holes in it, because a hole here is
// exactly the silent non-coverage this file exists to prevent.
try {
  const { usable, skipped } = buildOpener(app, ANCHOR, "check:overlay-discovery", core);
  if (skipped.length) fail(`declared below the injection point, so no guard can open them: ${skipped.join(", ")}`);
  else ok(`all ${usable.length} overlays are declared above the opener's injection point`);
} catch (e) {
  fail(e.message);
}

// RouteDetail's own overlays. These were a printed NOTE when this file was written — an App
// level opener cannot set a flag local to another component — and are now openable, because
// RouteDetail gets its own injected opener and App navigates into a route first. The same
// fail-closed rule applies: a component that owns an overlay and has no anchor throws, rather
// than the overlay quietly going unwalked.
const rd = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
let rdCount = 0;
try {
  const { names, states } = buildRouteDetailOpener(rd, "check:overlay-discovery");
  rdCount = names.length;
  const byComp = [...new Set(states.map((s) => s.component))];
  if (!names.length) fail("RouteDetail.jsx declares no overlays — the flag pattern has stopped matching there");
  else ok(`${names.length} overlay(s) in RouteDetail.jsx, all with an injection anchor (${byComp.join(", ")})`);
} catch (e) {
  fail(e.message);
}

// Bookkeeping in both directions. A name listed but no longer real is how an exemption list
// rots into permanent, unexamined non-coverage.
const names = all.map((s) => s.name);
let stale = 0;
for (const n of Object.keys(NEEDS_EXTRA_STATE)) if (!names.includes(n)) { fail(`NEEDS_EXTRA_STATE lists ${JSON.stringify(n)}, which is no longer an overlay state`); stale++; }
for (const n of Object.keys(OVERLAY_PAYLOADS)) if (!names.includes(n)) { fail(`OVERLAY_PAYLOADS lists ${JSON.stringify(n)}, which no longer renders a dialog`); stale++; }
if (!stale) ok("no stale entries in NEEDS_EXTRA_STATE or OVERLAY_PAYLOADS");

console.log(fails
  ? `\ncheck:overlay-discovery: ${fails} failure(s)`
  : `\ncheck:overlay-discovery: ok — ${all.length + rdCount} overlays (${all.length} in App, ${rdCount} in RouteDetail), all reachable by the browser guards.`);
process.exit(fails ? 1 : 0);

// Injection-tested 2026-08-09, five cases:
//
//   1. rename an overlay off the convention (shareOpen -> shareThing) -> must still PASS,
//      still discovered, because discovery is by what it renders. This is the case the old
//      name-shape regex got wrong 22 times, and the reason this file exists.
//   2. add a `useState(null)` rendering role="dialog", with no payload -> FAIL naming it
//   3. delete OVERLAY_PAYLOADS.logModal while LogAscent still renders  -> FAIL naming it
//   4. add a payload entry for a name that is not a dialog state       -> FAIL, stale entry
//   5. neuter dialogOverlays() so it matches nothing                   -> FAIL. A guard that
//      discovers nothing must never read as a clean sweep; that is the exact shape of the
//      hole being closed here, so it is the one case that must not be allowed to pass.
//
// Case 1 also drove a fix. Renaming a `useState(false)` flag off the convention first made
// this demand a payload for it — a boolean does not need one. It is the INITIAL VALUE that
// says how to open a state, and the name that says nothing; see dialogOverlays().
//
// NOT covered here, and deliberately: whether an overlay RENDERS anything once opened. That
// is what the three browser guards do. This file only answers "can they still reach it".
