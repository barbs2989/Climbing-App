#!/usr/bin/env node
/* AN OFFLINE CLAIM MUST BE BACKED BY THE MECHANISM THAT MAKES IT TRUE.
 *
 * This guard used to assert the opposite of what it asserts now, and the reversal is the point.
 * Its subject was "A ROUTE IS NEVER ON THE DEVICE. ONLY A DOWNLOADED STATE IS", because the app
 * had two things called "offline" and only one was real:
 *
 *   1. downloadStateOffline() writes a state's whole areas+routes subtree into IndexedDB, and
 *      lib/db.js hooks fall back to its readers when the network fails. A genuine offline
 *      catalog, reached from Manage areas.
 *   2. `offline` in ClimbMatch.jsx was `useState([])` -- a list of route ids, never persisted,
 *      cleared by the sign-in reset. A FLAG on a route, with nothing about that route stored.
 *
 * Five surfaces rendered (2) and four described it as (1), so #1585 rewrote twelve strings to say
 * so and this guard held the line. THE TRIP PACK IS NOW A REAL DOWNLOAD: packRouteOffline() puts
 * the route's own row -- description, pitch-by-pitch, gear, hazards, waypoints, GPX -- into an
 * IndexedDB `pack` store, and useRoutesByIds reads it back through orOffline. So the copy the old
 * guard protected has become FALSE IN THE OTHER DIRECTION, and a guard still forbidding those
 * claims would be forbidding the fix. Same shape as check:policy-claims' §3, where gating a
 * control made a policy sentence true and un-gating it made the replacement false again: A
 * PROMISE IS ONLY TRUE RELATIVE TO A BUILD, and a guard pinning one has to move with it.
 *
 * WHAT DOES NOT CHANGE IS THE CLASS. Over-claiming availability is still the dangerous direction:
 * a climber who is told the beta is on their phone and finds out at the trailhead had no way to
 * check. So the assertions are now POSITIVE -- the write exists, the read exists, the list
 * survives a reload -- which is check:outage's own design rule, and needs no vocabulary of
 * absence. Delete any link in that chain and every copy assertion still passes while the pack
 * silently empties again.
 *
 * TWO OF THE OLD GUARD'S SIX NEEDLES WERE DEAD, and it is worth recording because a dead branch
 * in a guard reads as coverage. It excused any sentence matching
 * /\b(?:not|no|nothing|never|...)\b/ as negated -- and its own `with no signal` and `no-signal
 * days` needles CANNOT match a sentence that does not contain the word "no". Every claim phrased
 * the most natural way was therefore skipped, for the entire life of the rule, and a clean run
 * looked identical. Section 5 below strips the no-signal idioms before testing for negation, so
 * the same trap cannot return.
 *
 * A BUILD GATE, for the reason check:topo-outage-copy, check:policy-claims and
 * check:profile-claims were each promoted: the wiring here is a handful of CALLS and one prop,
 * so a stale-base squash could take the whole mechanism out while moving no NAME --
 * audit:silent-reverts says in its own closing caveat that it cannot see that.
 */

import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

let ran = 0, bad = 0;
const ok = (m) => { ran++; console.log("  ok   " + m); };
const fail = (m) => { ran++; bad++; console.log("  FAIL " + m); };
const dead = (m) => { console.error("FAIL: " + m); process.exit(1); };

let cm, rd, db, off;
try {
  cm = read("ClimbMatch.jsx"); rd = read("RouteDetail.jsx");
  db = read("lib/db.js"); off = read("lib/offline.js");
} catch (e) { dead("could not read a source file — nothing was checked. " + e.message); }

/* Comments are stripped before every source test. Three checkers in this repo have been fooled by
 * the comment written to explain the fix they were checking, and this file's own prose names
 * every symbol below. Block comments only for the wiring tests: a `//` strip has already eaten
 * real code here once (check:dead-flag-gates) and these are single-expression matches. */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ");
const cmS = strip(cm), rdS = strip(rd), dbS = strip(db), offS = strip(off);

/* ── 1. THE WRITE: packing a route really puts its row on the device. ────────────────────────
 * Without this the pack is back to being a list of ids, and every sentence promising the beta is
 * saved is a lie a climber can only discover somewhere they cannot check. */
console.log("1. THE WRITE — packing a climb stores its row:");
if (/export async function packRouteOffline\s*\(/.test(offS)) ok("lib/offline.js defines packRouteOffline()");
else fail("lib/offline.js no longer defines packRouteOffline() — nothing writes a route to the device");
if (/idbPutAll\("pack",/.test(offS)) ok("...and it writes into the `pack` object store");
else fail("packRouteOffline() writes into no `pack` store — the route is not saved anywhere");
if (/export async function unpackRouteOffline\s*\(/.test(offS) && /idbDelete\("pack",/.test(offS))
  ok("...and unpackRouteOffline() takes it back off, so the storage is reclaimable");
else fail("unpackRouteOffline() is gone or no longer deletes — a packed route could never be removed");
/* WORD-BOUNDED, and the injection is what found this: `unpackRouteOffline(` CONTAINS the string
 * `packRouteOffline(`, so a bare substring test could never fail while the removal path existed.
 * The `write-gone` case deleted the write and the guard reported it green. A needle that one of
 * its own siblings satisfies is a dead branch, and dead branches here read as coverage. */
if (/(?<![A-Za-z0-9_$])packRouteOffline\(/.test(cmS)) ok("ClimbMatch.jsx calls it when a climb is packed");
else fail("ClimbMatch.jsx never calls packRouteOffline() — the pack button writes nothing again");
if (/unpackRouteOffline\(/.test(cmS)) ok("...and calls unpackRouteOffline() when one is removed");
else fail("ClimbMatch.jsx never calls unpackRouteOffline() — removing leaves the row on the device");

/* ── 2. THE READ: the stored row reaches the screen. ─────────────────────────────────────────
 * THE SILENT HALF. Every route the pack, the wishlist and the logbook resolve comes through
 * useRoutesByIds; with no signal that query fails, dbRouteById is empty, and routeById() returns
 * undefined for every packed climb. The rows would be sitting in IndexedDB, correctly written,
 * reachable by nothing — a pack that empties at the trailhead with the write path intact and
 * every copy assertion still green. */
console.log("\n2. THE READ — useRoutesByIds falls back to what is on the device:");
const hook = dbS.match(/export function useRoutesByIds[\s\S]*?\n}/);
if (!hook) dead("ANCHOR LOST: useRoutesByIds is gone from lib/db.js — the pack's read path is unchecked");
if (/orOffline\(/.test(hook[0])) ok("useRoutesByIds is wrapped in orOffline()");
else fail("useRoutesByIds is NOT wrapped in orOffline() — with no signal it throws and the pack renders empty");
if (/offlineRoutesByIds\(/.test(hook[0])) ok("...with offlineRoutesByIds as its fallback");
else fail("useRoutesByIds' fallback is not offlineRoutesByIds — packed rows are written and never read");
if (/export async function offlineRoutesByIds\s*\(/.test(offS)) ok("...which lib/offline.js still defines");
else fail("lib/offline.js no longer defines offlineRoutesByIds()");

/* ── 3. THE HYDRATION, AND ITS ORDER. ────────────────────────────────────────────────────────
 * The pack list is a mirror of the store, so without this read it is empty on every load and the
 * write is invisible however well it worked. The ORDER is asserted separately and is the half
 * that would break silently: effects run in declaration order, and the sign-in reset clears
 * `offline` on every uid transition — so a hydration declared ABOVE it fills the list and is
 * wiped microseconds later, leaving a signed-in climber with an empty pack that is on disk.
 * That is exactly the defect check:verification-fallback exists for, and no render can see it. */
console.log("\n3. THE HYDRATION — the pack survives a reload, and is not wiped by the sign-in reset:");
const hyd = cmS.indexOf("packedRouteIds(");
if (hyd >= 0) ok("ClimbMatch.jsx hydrates the pack from packedRouteIds()");
else fail("ClimbMatch.jsx never calls packedRouteIds() — the pack is empty after every reload");
const reset = cmS.indexOf("setOffline([])");
/* A FAILURE, not a fatal, and the distinction is load-bearing: only the ORDERING claim below is
 * unchecked when this anchor moves, so exiting here would take §5's per-file floors with it —
 * and §5 is what catches the trip-pack vocabulary being renamed wholesale. Measured: the
 * `renamed-cm` injection died on THIS line and never reached the floor it was written to pin, so
 * the guard's right answer arrived by the wrong route. Whichever block exits first is the only
 * one anyone reads, which this repo records for check:clickable and check:field-renders. */
if (reset < 0) fail("ANCHOR LOST: the sign-in reset no longer clears `offline`. The ordering rule below\n"
  + "       could not be checked — a hydration wiped by the reset would now be invisible.");
else if (hyd >= 0 && hyd > reset) ok("...and that hydration is declared BELOW the sign-in reset, so it is not wiped");
else if (hyd >= 0 && reset >= 0) fail("the pack hydration is declared ABOVE the sign-in reset that clears `offline`.\n"
  + "       Effects run in declaration order, so it fills the list and the reset empties it on the\n"
  + "       same uid transition. The screen shows an empty pack while the routes are on disk.");
if (/export async function packedRouteIds\s*\(/.test(offS)) ok("...and lib/offline.js still defines packedRouteIds()");
else fail("lib/offline.js no longer defines packedRouteIds()");

/* ── 4. WHAT IS NOT SAVED IS STILL SAID. ─────────────────────────────────────────────────────
 * THE LOAD-BEARING COUNTERWEIGHT, and the reason sections 1-3 cannot stand alone: a guard that
 * only ever demands the mechanism exists is satisfied by claiming EVERYTHING is on the device.
 * The route row is; photos and topo images live in `contributions`/`topos` plus storage, other
 * climbers' condition reports live in `contributions`/`climb_logs`, and map tiles are
 * cross-origin and deliberately not touched by the service worker. None of those is packed, so
 * the surface that promises the rest must keep saying which. Positive form, so it needs no
 * vocabulary of absence — check:outage's own design rule. */
console.log("\n4. THE DISCLAIMER — the surfaces still name what is NOT on the device:");
if (/Photos, topo images and other climbers’ reports are not/.test(rdS))
  ok("the Plan-tab pack card still names photos, topo images and others' reports as not saved");
else fail("the Plan-tab pack card no longer says what is NOT saved. Packing stores the route's own\n"
  + "       row and nothing else — a card listing what you have with no mention of what you do not\n"
  + "       is the over-claim this guard has always existed to prevent, in its new form.");
if (/neither are map tiles/.test(rdS)) ok("...and that map tiles are not cached either");
else fail("the pack card stopped saying map tiles are not cached — the map is blank with no signal");

/* ── 5. A NARROW, LIVE DENY-LIST. ────────────────────────────────────────────────────────────
 * Scoped structurally, as before: the regions are the innermost function or JSX element around a
 * reference to the trip-pack state, so this asks about the feature's own surfaces rather than
 * about the file. What it forbids is now only the things that are genuinely still NOT stored —
 * photos, topo images, other climbers' reports. "works with no signal" is a TRUE claim about a
 * packed route today and is deliberately not a needle any more.
 *
 * It is a deny-list and will be short again one day; that is stated rather than hidden. Its
 * shelf life is tied to §4, which is the positive assertion doing the real work. */
const TRIGGERS = new Set(["offline", "setOffline", "offlineSaved", "onToggleOffline", "packBusy", "offlinePending"]);
const NOT_STORED = /\b(?:photos?|topo images?|conditions snapshot|trip reports?|other climbers)\b/i;
/* `to this device` as well as `on this device`: the natural way to write this claim is
 * "Saves the beta and every photo TO this device", and a needle wanting only `on` missed it —
 * caught by the `claims-photos` injection, not by reading the rule. A deny-list is beaten by one
 * more preposition just as readily as by one more adjective. */
const STORED = /\b(?:cached|saved (?:to|on) (?:this|your) device|(?:on|to) (?:this|your) device|bundled|downloaded|offline)\b/i;
/* Strip the no-signal idioms BEFORE testing for negation. Leaving them in is what made two of the
 * old guard's six needles unreachable: "works with no signal" contains the word "no", so every
 * sentence the rule most wanted to catch excused itself. */
const NEGATED = /\b(?:not|no|nothing|never|isn’t|isn't|doesn’t|doesn't|still need|still needs)\b/i;
const deIdiom = (s) => s.replace(/\bno[- ](?:signal|service|cell|reception)\b/gi, " ");

function regionsFor(src) {
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: false });
  const ranges = [];
  traverse(ast, {
    Identifier(p) {
      if (!TRIGGERS.has(p.node.name)) return;
      if (p.parentPath.isObjectProperty() && p.parentPath.parentPath.isObjectPattern()) return;
      if (p.parentPath.isVariableDeclarator()) return;
      // Innermost enclosing function OR JSX element -- whichever comes first walking up. Taking
      // the JSX element unconditionally lands on <RouteDetail/>, one element carrying 59 props.
      const host = p.findParent((a) => a.isJSXElement() || a.isArrowFunctionExpression() || a.isFunctionExpression());
      if (!host || host.node.start == null) return;
      ranges.push([host.node.start, host.node.end]);
    },
  });
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
 * trigger in RouteDetail.jsx alone leaves ClimbMatch's regions standing, so the guard would
 * report a clean sweep having inspected one file of two — the check:control-names defect, whose
 * floor was "at least one" and which a PARTIAL restyle left checking 1 of 9. */
const FLOOR = { regions: 6, strings: 15 };
console.log("\n5. NO SURFACE CLAIMS THE THINGS THAT ARE STILL NOT STORED:");
let regions = 0, examined = 0;
const findings = [];
for (const [f, src] of [["ClimbMatch.jsx", cm], ["RouteDetail.jsx", rd]]) {
  let got;
  try { got = regionsFor(src); } catch (e) { dead("could not parse " + f + " — nothing was checked. " + e.message); }
  if (got.ranges.length < FLOOR.regions || got.strings.length < FLOOR.strings)
    dead(f + " yielded only " + got.ranges.length + " trip-pack region(s) and " + got.strings.length
      + " string(s) (floor " + FLOOR.regions + "/" + FLOOR.strings + ").\n"
      + "  The trip-pack state was renamed in that file, or the scan broke. Its surfaces went\n"
      + "  UNCHECKED — and the other file's regions would otherwise have carried the run to a pass.");
  regions += got.ranges.length;
  for (const s of got.strings) {
    examined++;
    for (const raw of s.v.split(/(?<=[.!?])\s+|\s+[—–]\s+/)) {
      const sentence = deIdiom(raw);
      if (NEGATED.test(sentence)) continue;
      if (NOT_STORED.test(sentence) && STORED.test(sentence))
        findings.push({ f, at: s.at, sentence: raw.trim() });
    }
  }
}
if (findings.length) {
  for (const x of findings)
    fail(x.f + " @" + x.at + " claims something is on the device that packing does not store:\n       “"
      + x.sentence.slice(0, 130) + "”");
} else ok("no trip-pack surface claims photos, topo images or others' reports are stored ("
  + regions + " regions, " + examined + " strings)");

/* ── 6. THE STATE DOWNLOAD'S OWN CLAIMS SURVIVE. ─────────────────────────────────────────────
 * Kept verbatim from the old guard. A downloaded state IS on the device, so that promise is true
 * and must not be deleted to satisfy anything above. */
console.log("\n6. THE STATE DOWNLOAD still says it works with no signal:");
const REAL = [
  ["the Manage areas promise", /is saved on this device and keeps working with no signal/],
  ["the state-download toast", /showToast\("Saved for offline — "\+r\.routeCount/],
];
for (const [name, re] of REAL) {
  if (re.test(cm)) ok(name + " is intact");
  else fail(name + " is gone. A downloaded state IS on the device — that claim is true, and\n"
    + "       deleting it to satisfy a rule about routes would remove a true statement.");
}

/* ── 7. SAVED AREAS PERSIST. ─────────────────────────────────────────────────────────────────
 * The same defect one list over: bookmarks were a useState written nowhere, so Home's
 * "Saved areas · N areas" tile read 0 after every reload however many you had saved. */
console.log("\n7. SAVED AREAS survive a reload:");
if (/saveAreaIds\(/.test(cmS)) ok("ClimbMatch.jsx writes saved areas through saveAreaIds()");
else fail("nothing calls saveAreaIds() — bookmarks are back to being lost on every reload");
if (/savedAreaIds\(/.test(cmS)) ok("...and reads them back through savedAreaIds()");
else fail("nothing calls savedAreaIds() — saved areas are written and never read back");

/* ── 8. SEARCH, NOT JUST BROWSE. ─────────────────────────────────────────────────────────────
 * The browse chain (states -> children -> an area's own routes) has worked offline since the
 * state download shipped. SEARCH went through three RPCs and had no fallback at all, so with no
 * signal you could drill down through a downloaded catalog and never look anything up — "View
 * all N", the in-area route finder and the area filter box each threw.
 *
 * THIS IS §2's SILENT HALF AGAIN, one feature over, and it is why the assertion lives here
 * rather than only in the probe. probe-offline-subtree-search proves the READERS: 29 assertions
 * that the offline filters admit exactly the rows the SQL admits. It says nothing about whether
 * lib/db.js still CALLS them. Drop one `orOfflineExact` wrapper and the readers stay correct,
 * every probe assertion stays green, no identifier moves — and the finder goes back to throwing
 * at the trailhead. audit:silent-reverts says in its own closing caveat it cannot see that.
 *
 * orOfflineExact rather than orOffline, deliberately: these are FILTERED queries, so "no route
 * matched" and "this area was never downloaded" are different facts. orOffline treats an empty
 * result as absence — right for a route list, wrong here, and wrong twice for the COUNT, where
 * the honest answer 0 is falsy and would rethrow every time. */
console.log("\n8. SEARCH — the in-area finder and the area filter box read the device:");
const SEARCH = [
  ["useSubtreeRoutes", "offlineSubtreeRoutes", "the “View all N” finder"],
  ["useSubtreeRouteCount", "offlineSubtreeRouteCount", "the finder's result count"],
  ["useAreaSearch", "offlineAreaSearch", "the area filter box"],
];
if (/async function orOfflineExact\s*\(/.test(dbS)) ok("lib/db.js defines orOfflineExact()");
else fail("lib/db.js no longer defines orOfflineExact() — the search hooks have no fallback helper");
for (const [hookName, reader, what] of SEARCH) {
  const body = dbS.match(new RegExp("export function " + hookName + "[\\s\\S]*?\\n}"));
  if (!body) { dead("ANCHOR LOST: " + hookName + " is gone from lib/db.js — " + what + "'s offline path is unchecked"); continue; }
  if (/orOfflineExact\(/.test(body[0])) ok(hookName + " is wrapped in orOfflineExact()");
  else fail(hookName + " is NOT wrapped in orOfflineExact() — with no signal " + what + " throws again,\n"
    + "       on a catalog that is sitting on the device.");
  if (new RegExp(reader + "\\(").test(body[0])) ok("...with " + reader + " as its fallback");
  else fail(hookName + "'s fallback is not " + reader + " — " + what + " reads nothing local");
  if (new RegExp("export async function " + reader + "\\s*\\(").test(offS)) ok("...which lib/offline.js still defines");
  else fail("lib/offline.js no longer defines " + reader + "()");
}

/* Fail closed on a run that quietly stopped asking. Raise this when you add an assertion; never
 * lower it to make a run pass. */
const EXPECTED = 28;
if (ran < EXPECTED)
  dead("only " + ran + " assertion(s) RAN, expected " + EXPECTED
    + " — this guard stopped asking half its questions and still exited 0.");

if (bad) {
  console.error("\ncheck:offline-claims: " + bad + " failure(s) — an offline promise is not backed by the\n"
    + "mechanism that makes it true. Either restore the wiring, or change the copy to match what\n"
    + "the app actually stores. Over-claiming is the direction a climber cannot check.");
  process.exit(1);
}
console.log("\ncheck:offline-claims: ok — the trip pack really writes, reads and survives a reload, a\n"
  + "downloaded state is searchable as well as browsable (" + ran + " assertions), and the surfaces\n"
  + "still say what is NOT on the device.");
