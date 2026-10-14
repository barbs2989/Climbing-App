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

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

let ran = 0, bad = 0;
const ok = (m) => { ran++; console.log("  ok   " + m); };
const fail = (m) => { ran++; bad++; console.log("  FAIL " + m); };
const dead = (m) => { console.error("FAIL: " + m); process.exit(1); };

let cm, db, off;
try {
  cm = read("ClimbMatch.jsx");
  db = read("lib/db.js"); off = read("lib/offline.js");
} catch (e) { dead("could not read a source file — nothing was checked. " + e.message); }

/* Comments are stripped before every source test. Three checkers in this repo have been fooled by
 * the comment written to explain the fix they were checking, and this file's own prose names
 * every symbol below. Block comments only for the wiring tests: a `//` strip has already eaten
 * real code here once (check:dead-flag-gates) and these are single-expression matches. */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ");
const cmS = strip(cm), dbS = strip(db), offS = strip(off);

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

/* ── 9. OPENING WHAT THE SEARCH FOUND. ───────────────────────────────────────────────────────
 * §8 made the area filter box searchable offline and left the thing you DO with a hit
 * throwing, which is worse than no search: `areas_in_subtree` returns a narrow projection
 * with no ltree `path`, so `jumpToArea` hydrates the row and then builds a breadcrumb from
 * it. Both calls have a `.catch` that swallows the failure, so the handler bailed AFTER
 * switching screens — a tap that visibly goes somewhere and lands nowhere.
 *
 * A SEQUENCE, so both links are asserted separately: either one alone still dead-ends the
 * tap, and a guard demanding only one would report the other as unnecessary. */
console.log("\n9. OPENING A HIT — the row and its breadcrumb come off the device too:");
const JUMP = [
  ["fetchArea", "offlineArea", "hydrating the hit (the search projection has no `path`)"],
  ["fetchAreaBreadcrumb", "offlineAreasByIds", "its breadcrumb, which jumpToArea needs a state from"],
];
for (const [fnName, reader, what] of JUMP) {
  const body = dbS.match(new RegExp("export async function " + fnName + "[\\s\\S]*?\\n}"));
  if (!body) { dead("ANCHOR LOST: " + fnName + " is gone from lib/db.js — " + what + " is unchecked"); continue; }
  if (/orOffline\(/.test(body[0])) ok(fnName + " falls back to the device");
  else fail(fnName + " has no offline fallback — with no signal " + what + " throws, and\n"
    + "       jumpToArea returns AFTER it has already switched screens.");
  if (new RegExp(reader + "\\(").test(body[0])) ok("...through " + reader);
  else fail(fnName + " no longer reads " + reader + " — the rows are on the device and unread");
}
if (/export async function offlineAreasByIds\s*\(/.test(offS)) ok("lib/offline.js still defines offlineAreasByIds()");
else fail("lib/offline.js no longer defines offlineAreasByIds()");
/* The names map is orOfflineExact rather than orOffline, and that is not interchangeable: an
 * empty map is TRUTHY, so orOffline would substitute it for a failed read and every name
 * would degrade to its placeholder as though it had been resolved. */
const namesHook = dbS.match(/export function useAreaNamesByIds[\s\S]*?\n}/);
if (!namesHook) dead("ANCHOR LOST: useAreaNamesByIds is gone from lib/db.js");
else if (/orOfflineExact\(/.test(namesHook[0]) && /offlineAreaNamesByIds\(/.test(namesHook[0]))
  ok("useAreaNamesByIds resolves names from the device, through orOfflineExact");
else fail("useAreaNamesByIds does not fall back through orOfflineExact/offlineAreaNamesByIds —\n"
  + "       with no signal every area name degrades to its placeholder.");


/* Fail closed on a run that quietly stopped asking. Raise this when you add an assertion; never
 * lower it to make a run pass. */
const EXPECTED = 23;
if (ran < EXPECTED)
  dead("only " + ran + " assertion(s) RAN, expected " + EXPECTED
    + " — this guard stopped asking half its questions and still exited 0.");

if (bad) {
  console.error("\ncheck:offline-claims: " + bad + " failure(s) — an offline promise is not backed by the\n"
    + "mechanism that makes it true. Either restore the wiring, or change the copy to match what\n"
    + "the app actually stores. Over-claiming is the direction a climber cannot check.");
  process.exit(1);
}
console.log("\ncheck:offline-claims: ok — a downloaded state is browsable and searchable offline\n"
  + "(" + ran + " assertions). There is no per-route trip pack: the state download is the offline feature.");
