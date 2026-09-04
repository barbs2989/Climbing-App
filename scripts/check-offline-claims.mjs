#!/usr/bin/env node
/* A ROUTE IS NEVER ON THE DEVICE. ONLY A DOWNLOADED STATE IS.
 *
 * The app has TWO things called "offline" and only one of them is real:
 *
 *   1. downloadStateOffline() in lib/offline.js writes a state's whole areas+routes subtree into
 *      IndexedDB, and four lib/db.js hooks fall back to its readers when the network fails. That
 *      is a genuine offline catalog, reached from the Manage areas screen.
 *   2. `offline` in ClimbMatch.jsx is `useState([])` -- a list of route ids, never persisted.
 *      ClimbMatch.jsx contains no localStorage, no sessionStorage and no indexedDB. The sign-in
 *      reset clears it. It is a FLAG on a route, and nothing about that route is stored.
 *
 * Five surfaces render (2), and on 2026-09-03 four of them described it as (1):
 *
 *      "Saved for offline — works with no signal"                          (toast, on tap)
 *      "Download" / "Save offline for no-signal days"                      (header button)
 *      "Save to offline" / "Work without cell service"                     (Overview sidebar)
 *      "N routes bundled — descriptions, topos & tracks ready with no signal."   (Profile)
 *      "...tap Save to offline ... to bundle the description, topo, gear, GPX and a
 *       conditions snapshot for the backcountry."                          (empty state, x2)
 *
 * THE FIFTH SURFACE WAS ALREADY CORRECT, which is what makes this a class rather than a typo.
 * The Plan tab says, in as many words: "Nothing here is cached on your device yet — the app still
 * needs a signal. Capture what you need before you go: tap Download GPX and open it in a
 * dedicated GPS/mapping app." Somebody fixed ONE surface and left four. That is the
 * "an instance fixed by hand is not a class closed" shape this repo records throughout.
 *
 * IT IS SAFETY-ADJACENT AND IT IS THE DANGEROUS DIRECTION. A climber taps a button labelled
 * Download, is told the description, topo, gear, GPX and conditions are bundled for the
 * backcountry, and may therefore NOT download the state -- the one thing that would have worked.
 * They find out at the trailhead. Over-claiming availability is worse than offering nothing.
 *
 * A BUILD GATE RATHER THAN A PROBE, for the reason check:topo-outage-copy, check:policy-claims
 * and check:profile-claims were each promoted: the repair changes STRINGS and no NAME, and
 * audit:silent-reverts says in its own closing caveat that it cannot see that. A stale-base
 * squash could restore all twelve claims with every existing gate green.
 *
 * SECTION 2 IS THE LOAD-BEARING HALF. A guard that only ever REMOVES claims is satisfied by
 * deleting the real feature's copy too -- so the state-download surfaces must keep saying the
 * catalog works with no signal, because for them it is TRUE. Injection case `killreal` pins it.
 *
 * SCOPED STRUCTURALLY, MATCHED BY PHRASE. The regions come from the AST -- the innermost function
 * or JSX element enclosing a reference to the trip-pack state -- so this asks about the feature's
 * own surfaces rather than about the whole file. The needles inside those regions are a
 * DENY-LIST and will be short again one day; that is stated rather than hidden. What keeps it
 * honest is that it fires on an ASSERTION only: a negated sentence ("Nothing here is cached",
 * "not cached") is correct copy, and a sentence naming Manage areas is about feature (1).
 */

import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* Identifiers that mean "the route-level trip-pack flag". `offline`/`setOffline` are the state in
 * ClimbMatch.jsx; `offlineSaved`/`onToggleOffline` are the props RouteDetail.jsx receives. */
const TRIGGERS = new Set(["offline", "setOffline", "offlineSaved", "onToggleOffline"]);

/* A claim that THIS ROUTE's content is on the device. Every one of these is a phrase that shipped. */
const CLAIMS = [
  [/\boffline\b/i, "says a route is “offline”"],
  [/\bbundled?\b/i, "says content is bundled"],
  [/\bcached\b/i, "says content is cached"],
  [/without cell service/i, "claims it works without cell service"],
  [/with(?:out)? no signal/i, "claims it works with no signal"],
  [/no[- ]signal days/i, "claims it works on no-signal days"],
];

/* A negated sentence is not a claim -- "Nothing here is cached on your device yet" is the correct
 * copy this guard exists to protect. The same rule audit:trailhead-road needed six times over. */
const NEGATED = /\b(?:not|no|nothing|never|isn’t|isn't|doesn’t|doesn't|still needs)\b/i;
/* ...and a sentence naming the REAL feature is about the state download, not about this route. */
const POINTS_AT_REAL = /manage areas/i;

function regionsFor(src) {
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: false });
  const ranges = [];
  traverse(ast, {
    Identifier(p) {
      if (!TRIGGERS.has(p.node.name)) return;
      // A destructured prop or a declaration is not a surface.
      if (p.parentPath.isObjectProperty() && p.parentPath.parentPath.isObjectPattern()) return;
      if (p.parentPath.isVariableDeclarator()) return;
      // Innermost enclosing function OR JSX element -- whichever comes first walking up. Taking the
      // JSX element unconditionally would land on <RouteDetail/>, one element carrying 59 props.
      const host = p.findParent(
        (a) => a.isJSXElement() || a.isArrowFunctionExpression() || a.isFunctionExpression()
      );
      if (!host || host.node.start == null) return;
      ranges.push([host.node.start, host.node.end]);
    },
  });
  // Collect the strings those regions render.
  const strings = [];
  traverse(ast, {
    "StringLiteral|JSXText"(p) {
      const n = p.node;
      if (n.start == null) return;
      const v = (n.value || "").trim();
      if (v.length < 4) return;
      if (ranges.some(([a, b]) => n.start >= a && n.end <= b)) strings.push({ v, at: n.start });
    },
  });
  return { ranges, strings };
}

/* PER FILE, never a global total. A global floor is satisfied by the OTHER file: renaming the
 * trigger in RouteDetail.jsx alone leaves ClimbMatch's 15 regions standing, so the guard would
 * report a clean sweep having inspected one file of two. That is the check:control-names defect
 * exactly -- its floor was "at least one" and a PARTIAL restyle left it checking 1 of 9. Measured
 * 2026-09-03: ClimbMatch 15 regions / 143 strings, RouteDetail 23 / 45. A blinded file yields 0. */
const FLOOR = { regions: 6, strings: 15 };

let regions = 0, examined = 0;
const findings = [];
const perFile = {};

for (const f of ["ClimbMatch.jsx", "RouteDetail.jsx"]) {
  let src;
  try { src = read(f); } catch (e) {
    console.error("FAIL: could not read " + f + " — nothing was checked. " + e.message);
    process.exit(1);
  }
  let got;
  try { got = regionsFor(src); } catch (e) {
    console.error("FAIL: could not parse " + f + " — nothing was checked. " + e.message);
    process.exit(1);
  }
  regions += got.ranges.length;
  perFile[f] = { regions: got.ranges.length, strings: got.strings.length };
  for (const s of got.strings) {
    examined++;
    // Split into sentences so one honest clause cannot excuse a claim beside it, and one claim
    // cannot be excused by a "not" belonging to a different sentence.
    for (const sentence of s.v.split(/(?<=[.!?])\s+|\s+[—–]\s+/)) {
      if (NEGATED.test(sentence) || POINTS_AT_REAL.test(sentence)) continue;
      for (const [re, why] of CLAIMS) {
        if (re.test(sentence)) {
          findings.push({ f, at: s.at, why, sentence: sentence.trim() });
          break;
        }
      }
    }
  }
}

/* Fail closed, PER FILE. Every one of these prints identically to a clean app. */
for (const [f, got] of Object.entries(perFile)) {
  if (got.regions < FLOOR.regions || got.strings < FLOOR.strings) {
    console.error("FAIL: " + f + " yielded only " + got.regions + " trip-pack region(s) and "
      + got.strings + " string(s) (floor " + FLOOR.regions + "/" + FLOOR.strings + ").\n"
      + "  The trip-pack state was renamed in that file, or the scan broke. Its surfaces went\n"
      + "  UNCHECKED — and the other file's regions would otherwise have carried the run to a pass.");
    process.exit(1);
  }
}

/* SECTION 2 — the REAL feature must still say it works with no signal. Without this, deleting the
 * state-download copy satisfies section 1 and makes the guard argue for removing a true statement. */
const cm = read("ClimbMatch.jsx");
const REAL = [
  ["the Manage areas promise", /is saved on this device and keeps working with no signal/],
  ["the state-download toast", /showToast\("Saved for offline — "\+r\.routeCount/],
];
const lost = REAL.filter(([, re]) => !re.test(cm)).map(([n]) => n);

if (findings.length || lost.length) {
  if (findings.length) {
    console.error("A route-level surface claims the route is on the device. It is not: `offline` is\n"
      + "useState([]), never persisted — ClimbMatch.jsx has no localStorage, sessionStorage or\n"
      + "indexedDB. Only a state downloaded from Manage areas is really on the device.\n");
    for (const x of findings) {
      console.error("  " + x.f + " @" + x.at + " — " + x.why);
      console.error("      “" + x.sentence.slice(0, 120) + "”");
    }
    console.error("\n  The app's own honest wording for this feature is on the Plan tab:\n"
      + "  “Trip pack ... Nothing here is cached on your device yet — the app still needs a signal.”");
  }
  if (lost.length) {
    console.error((findings.length ? "\n" : "")
      + "The REAL offline feature stopped saying it works with no signal: " + lost.join(", ") + ".\n"
      + "  A downloaded state IS on the device — that claim is true and must not be removed to\n"
      + "  satisfy the rule above.");
  }
  process.exit(1);
}

console.log("ok — no route-level surface claims the route is cached ("
  + regions + " trip-pack regions, " + examined + " strings), and the state download still says it works with no signal");
