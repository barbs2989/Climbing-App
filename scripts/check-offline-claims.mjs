#!/usr/bin/env node
/* AN OFFLINE CLAIM MUST BE BACKED BY THE MECHANISM THAT MAKES IT TRUE.
 *
 * THE STATE DOWNLOAD IS THE OFFLINE FEATURE. downloadStateOffline() writes a state's whole
 * areas+routes subtree into IndexedDB, plus its latest public trip reports, its agreed
 * corrections (never photo rows) and the public names of the people who wrote them, and the
 * lib/db.js hooks fall back to those readers when the network fails. It is reached from Home's
 * Pinned states card and from Manage areas, and the Help screen describes it.
 *
 * This guard has moved three times, and each move is a lesson rather than history:
 *   - It began as "A ROUTE IS NEVER ON THE DEVICE, ONLY A DOWNLOADED STATE IS": `offline` in
 *     ClimbMatch.jsx was a useState list of route ids with nothing stored, so #1585 rewrote twelve
 *     strings and this guard held them.
 *   - The per-route TRIP PACK then became a real download (the row, a reports/corrections
 *     snapshot, a forecast and the approach's map tiles), so the guard reversed: it demanded the
 *     write, the read and the dates, and forbade only what the pack did not store.
 *   - #2368 REMOVED THE TRIP PACK from every screen, and the guard was cut back to the state
 *     download's own sections. That cut went too far: it took with it the assertions the state
 *     download STILL depends on, because the readers the pack introduced (offlinePackReports,
 *     offlinePackContribs, offlinePackProfiles, the `_packedAt` stamp) are the same readers that
 *     serve a downloaded state's reports, corrections and names. §10 restores those, and §4/§5
 *     restore "say what is NOT saved" and "claim nothing that is not", pointed at the screens
 *     that describe the state download.
 * A PROMISE IS ONLY TRUE RELATIVE TO A BUILD, and a guard pinning one has to move with it — but
 * when a feature is removed, ask which of its assertions belonged to the feature and which to the
 * machinery it shared.
 *
 * WHAT DOES NOT CHANGE IS THE CLASS. Over-claiming availability is the dangerous direction: a
 * climber who is told the photos are on their phone finds out at the trailhead, where they cannot
 * check. So the wiring assertions are POSITIVE (the read exists, the copy is dated) — check:outage's
 * own design rule — and the copy assertions name what is NOT stored rather than trusting silence.
 *
 * TWO OF THE ORIGINAL GUARD'S SIX NEEDLES WERE DEAD, and it is worth recording because a dead
 * branch in a guard reads as coverage. It excused any sentence matching
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
import { readAppFile } from "./lib/guard-sources.mjs";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

let ran = 0, bad = 0;
const ok = (m) => { ran++; console.log("  ok   " + m); };
const fail = (m) => { ran++; bad++; console.log("  FAIL " + m); };
const dead = (m) => { console.error("FAIL: " + m); process.exit(1); };

let cm, rd, core, help, db, off, snap;
try {
  cm = readAppFile(path.join(ROOT, "ClimbMatch.jsx")); rd = readAppFile(path.join(ROOT, "RouteDetail.jsx")); core = read("ClimbMatchCore.jsx");
  help = read("lib/Help.jsx");
  db = read("lib/db.js"); off = read("lib/offline.js");
  snap = read("scripts/build-state-snapshots.mjs");
} catch (e) { dead("could not read a source file — nothing was checked. " + e.message); }

/* Comments are stripped before every source test. Three checkers in this repo have been fooled by
 * the comment written to explain the fix they were checking, and this file's own prose names
 * every symbol below. Block comments only for the wiring tests: a `//` strip has already eaten
 * real code here once (check:dead-flag-gates) and these are single-expression matches. */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ");
const cmS = strip(cm), rdS = strip(rd), dbS = strip(db), offS = strip(off);

/* ── 2. THE READ: the stored row reaches the screen. ─────────────────────────────────────────
 * THE SILENT HALF. Every route the wishlist, the logbook and a downloaded state's own lists
 * resolve by id comes through useRoutesByIds; with no signal that query fails, dbRouteById is
 * empty, and routeById() returns undefined for every one of them. The rows would be sitting in
 * IndexedDB, correctly written, reachable by nothing — with the write path intact and every copy
 * assertion still green. */
console.log("\n2. THE READ — useRoutesByIds falls back to what is on the device:");
const hook = dbS.match(/export function useRoutesByIds[\s\S]*?\n}/);
if (!hook) dead("ANCHOR LOST: useRoutesByIds is gone from lib/db.js — the offline read path is unchecked");
if (/orOffline\(/.test(hook[0])) ok("useRoutesByIds is wrapped in orOffline()");
else fail("useRoutesByIds is NOT wrapped in orOffline() — with no signal it throws and every list by id renders empty");
if (/offlineRoutesByIds\(/.test(hook[0])) ok("...with offlineRoutesByIds as its fallback");
else fail("useRoutesByIds' fallback is not offlineRoutesByIds — downloaded rows are written and never read");
if (/export async function offlineRoutesByIds\s*\(/.test(offS)) ok("...which lib/offline.js still defines");
else fail("lib/offline.js no longer defines offlineRoutesByIds()");

/* ── 4. WHAT IS NOT SAVED IS STILL SAID. ─────────────────────────────────────────────────────
 * THE LOAD-BEARING COUNTERWEIGHT: a guard that only ever demands the mechanism exists is
 * satisfied by claiming EVERYTHING is on the device. A state download saves the catalog, the
 * latest public reports, agreed corrections and their authors' names. It does NOT save photos or
 * topo images (storage objects; a photo or topo can be saved one at a time from its own page, which
 * is a different feature) and it does NOT save map tiles. Both Help surfaces that explain the
 * download say so, and must keep saying so.
 *
 * Asserted as a FACT, not as a wording: some sentence on the surface names photos AND map tiles
 * AND is negated. A guard pinned to one phrasing forbids improving it (`disclaimer-reworded` in
 * the injection suite must stay silent). */
console.log("\n4. THE DISCLAIMER — the Help copy still names what a state download does NOT save:");
const NEGATED = /\b(?:not|no|nothing|never|isn’t|isn't|aren’t|aren't|doesn’t|doesn't|won’t|won't|can’t|can't|cannot|still need|still needs)\b/i;
const deIdiom = (s) => s.replace(/\bno[- ](?:signal|service|cell|reception)\b/gi, " ");
const sentencesOf = (v) => v.split(/(?<=[.!?;])\s+|\s+[—–]\s+/);
const statesNotSaved = (strings) => strings.some((v) => sentencesOf(v).some((raw) => {
  const s = deIdiom(raw);
  return NEGATED.test(s) && /\bphotos?\b/i.test(s) && /\bmap tiles?\b/i.test(s);
}));

/* Strings in a region, found structurally. A JSX region is a [start,end) range of the file. */
function stringsIn(ast, ranges) {
  const out = [];
  traverse(ast, {
    "StringLiteral|JSXText"(p) {
      const n = p.node;
      if (n.start == null) return;
      const v = (n.value || "").trim();
      if (v.length < 4) return;
      if (ranges.some(([a, b]) => n.start >= a && n.end <= b)) out.push({ v, at: n.start });
    },
  });
  return out;
}
const parseOr = (f, src) => { try { return parse(src, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: false }); } catch (e) { return dead("could not parse " + f + " — nothing was checked. " + e.message); } };
const helpAst = parseOr("lib/Help.jsx", help), coreAst = parseOr("ClimbMatchCore.jsx", core), cmAst = parseOr("ClimbMatch.jsx", cm);

/* The Help TOUR is the HELP_FEATS table in ClimbMatchCore.jsx; the Help FAQ is lib/Help.jsx, whose
 * every string is on the Help screen. The tour is located by its declarator, so a rename is an
 * ANCHOR LOST rather than an empty region that passes. */
const featRanges = [];
traverse(coreAst, { VariableDeclarator(p) { if (p.node.id && p.node.id.name === "HELP_FEATS" && p.node.init) featRanges.push([p.node.init.start, p.node.init.end]); } });
if (!featRanges.length) dead("ANCHOR LOST: HELP_FEATS (the Help tour) is gone from ClimbMatchCore.jsx — its offline copy is unchecked");
const helpStrings = stringsIn(helpAst, [[0, help.length]]);
const featStrings = stringsIn(coreAst, featRanges);
if (statesNotSaved(helpStrings.map((x) => x.v))) ok("the Help FAQ still says photos and map tiles are not saved by a download");
else fail("the Help FAQ no longer says photos and map tiles are NOT saved. A state download stores the\n"
  + "       catalog, reports and corrections and nothing else — a surface listing what you have with no\n"
  + "       mention of what you do not is the over-claim this guard exists to prevent.");
if (statesNotSaved(featStrings.map((x) => x.v))) ok("...and so does the Help tour (HELP_FEATS)");
else fail("the Help tour (HELP_FEATS) no longer says photos and map tiles are NOT saved by a download");

/* ── 5. A NARROW, LIVE DENY-LIST, ON THE STATE-DOWNLOAD SCREENS. ─────────────────────────────
 * Scoped structurally: Manage areas (the dialog), every region of ClimbMatch.jsx around the
 * state-download state (Home's Pinned states card, the setup checklist's download item, the
 * download/remove/pin handlers and their toasts), the Help FAQ and the Help tour. What it forbids
 * is a sentence that names something a download does NOT store — photos, topo images, map tiles —
 * beside a word saying it is stored. "keeps working with no signal" is a TRUE claim about the
 * catalog and is deliberately not a needle.
 *
 * It is a deny-list and will be short again one day; that is stated rather than hidden. §4 is the
 * positive assertion doing the real work.
 *
 * PER SURFACE, never a global total. A global floor is satisfied by the OTHER surface: renaming
 * the download state in ClimbMatch.jsx alone leaves the Help strings standing, so the guard would
 * report a clean sweep having inspected one surface of three — the check:control-names defect,
 * whose floor was "at least one" and which a PARTIAL restyle left checking 1 of 9. */
const TRIGGERS = new Set(["downloadedStates", "setDownloadedStates", "myPins", "dlBusy", "downloadState", "removeState", "pinState"]);
const DIALOGS = new Set(["Manage areas"]);
const NOT_STORED = /\b(?:photos?|topo images?|topos?|map tiles?|tiles|offline maps?)\b/i;
/* `to this device` as well as `on this device`: the natural way to write this claim is
 * "Saves the beta and every photo TO this device", and a needle wanting only `on` missed it —
 * caught by an injection case, not by reading the rule. A deny-list is beaten by one more
 * preposition just as readily as by one more adjective. */
const STORED = /\b(?:cached|saved (?:to|on) (?:this|your) (?:device|phone)|(?:on|to) (?:this|your) (?:device|phone)|bundled|downloads?|downloaded|saved for offline|offline)\b/i;

let dialogsFound = 0;
function cmRegions(ast) {
  const ranges = [];
  traverse(ast, {
    Identifier(p) {
      if (!TRIGGERS.has(p.node.name)) return;
      if (p.parentPath.isObjectProperty() && p.parentPath.parentPath.isObjectPattern()) return;
      if (p.parentPath.isVariableDeclarator() && p.parentPath.node.id === p.node) return;
      if (p.parentPath.isArrayPattern()) return;
      // Innermost enclosing function OR JSX element -- whichever comes first walking up. Taking
      // the JSX element unconditionally lands on the App's root element, which is every screen.
      const host = p.findParent((a) => a.isJSXElement() || a.isArrowFunctionExpression() || a.isFunctionExpression());
      if (!host || host.node.start == null) return;
      ranges.push([host.node.start, host.node.end]);
    },
    JSXAttribute(p) {
      const n = p.node;
      if (!n.name || n.name.name !== "aria-label" || !n.value || n.value.type !== "StringLiteral" || !DIALOGS.has(n.value.value)) return;
      const el = p.findParent((a) => a.isJSXElement());
      if (el && el.node.start != null) { ranges.push([el.node.start, el.node.end]); dialogsFound++; }
    },
  });
  return ranges;
}
const cmRanges = cmRegions(cmAst);
/* The Manage areas dialog is found by its aria-label, not by a trigger, because its intro paragraph
 * (the longest promise the app makes about the download) references none of the download state. A
 * rename would drop it from the scan while the trigger regions kept the floor satisfied. */
if (dialogsFound !== DIALOGS.size) dead("ANCHOR LOST: found " + dialogsFound + " of " + DIALOGS.size + " state-download dialog(s) by aria-label ("
  + [...DIALOGS].join(", ") + ") in ClimbMatch.jsx — Manage areas' own copy is unchecked");
const SURFACES = [
  /* Floors measured 2026-10-14 (ClimbMatch 31 regions / 202 strings, the FAQ 124 strings, the tour
   * 75) and set well under, so a real edit never trips them and a rename or a broken scan does. */
  { f: "ClimbMatch.jsx (Manage areas, Home's Pinned states, the download handlers)", strings: stringsIn(cmAst, cmRanges), regions: cmRanges.length, floor: { regions: 15, strings: 100 } },
  { f: "lib/Help.jsx (the Help FAQ)", strings: helpStrings, regions: 1, floor: { regions: 1, strings: 60 } },
  { f: "ClimbMatchCore.jsx (the Help tour, HELP_FEATS)", strings: featStrings, regions: featRanges.length, floor: { regions: 1, strings: 40 } },
];
console.log("\n5. NO STATE-DOWNLOAD SCREEN CLAIMS PHOTOS, TOPO IMAGES OR MAP TILES ARE SAVED:");
let examined = 0;
const findings = [];
for (const s of SURFACES) {
  if (s.regions < s.floor.regions || s.strings.length < s.floor.strings)
    dead(s.f + " yielded only " + s.regions + " region(s) and " + s.strings.length
      + " string(s) (floor " + s.floor.regions + "/" + s.floor.strings + ").\n"
      + "  The state-download state or a Help anchor was renamed, or the scan broke. Its surfaces went\n"
      + "  UNCHECKED — and the other surfaces would otherwise have carried the run to a pass.");
  for (const x of s.strings) {
    examined++;
    for (const raw of sentencesOf(x.v)) {
      const sentence = deIdiom(raw);
      if (NEGATED.test(sentence)) continue;
      if (NOT_STORED.test(sentence) && STORED.test(sentence)) findings.push({ f: s.f, at: x.at, sentence: raw.trim() });
    }
  }
}
if (findings.length) {
  for (const x of findings)
    fail(x.f + " @" + x.at + " claims something is on the device that a state download does not store:\n       “"
      + x.sentence.slice(0, 130) + "”");
} else ok("no state-download screen claims photos, topo images or map tiles are stored ("
  + examined + " strings: " + SURFACES.map((s) => s.f.split(" ")[0] + " " + s.regions + "/" + s.strings.length).join(", ") + ")");

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

/* ── 10. WHAT RIDES WITH A DOWNLOADED STATE IS READ BACK, AND DATED. ─────────────────────────
 * A state download stores more than routes: the latest public trip reports, the agreed
 * corrections (never photo rows), the reporters' public names — and the climber's own plans are
 * mirrored per account beside it. Each is a promise the screens make ("plus recent trip reports
 * and corrections"), so each needs the chain §2 demands of the row: READ BACK through the query
 * the page already uses, and SAID TO BE OLD. The third link is the one a render cannot see: drop
 * the stamp and the saved copy renders exactly like a live one, which is the over-claim in its
 * most dangerous form — last Tuesday's "firm snow" read as today's.
 *
 * THESE READERS ARE NAMED FOR THE TRIP PACK AND ARE NOT ITS PROPERTY. offlinePackReports /
 * offlinePackContribs / offlinePackProfiles and the `_packedAt` stamp serve a downloaded state's
 * copy too (lib/offline.js savedForRoute picks the fresher of the two). #2368 deleted this
 * section with the pack and left them unguarded; it is restored minus the pack's own links (the
 * snapshot write, its photo filter, the forecast snapshot and the map). */
console.log("\n10. THE SAVED COPY — reports, corrections, names and your plan are read back, and dated:");
const hookBody = (name) => { const m = dbS.match(new RegExp("export function " + name + "[\\s\\S]*?\\n}")); if (!m) dead("ANCHOR LOST: " + name + " is gone from lib/db.js"); return m[0]; };
const contribsLive = offS.match(/_stateExtras\.contribsInWindow\([^\n]*/);
const SAVED = [
  [/offlinePackReports\(/.test(hookBody("useRouteTripReports")) && /structuralSharing:\s*false/.test(hookBody("useRouteTripReports")),
    "useRouteTripReports falls back to the saved reports, with the `_packedAt` stamp kept",
    "useRouteTripReports lost its device fallback or its structuralSharing:false — reports vanish offline, or render undated"],
  [/offlinePackContribs\(/.test(hookBody("useRouteContributions")) && /structuralSharing:\s*false/.test(hookBody("useRouteContributions")),
    "useRouteContributions falls back to the saved corrections, with the stamp kept",
    "useRouteContributions lost its device fallback or its structuralSharing:false — agreed corrections silently revert offline"],
  [/offlinePackProfiles\(/.test(hookBody("useProfilesByIds")),
    "useProfilesByIds names the saved reports' authors from the device",
    "useProfilesByIds has no device fallback — every saved report reads as an anonymous climber offline"],
  [/cacheItineraries\(/.test(hookBody("useMyItineraries")) && /cachedItineraries\(/.test(hookBody("useMyItineraries")),
    "useMyItineraries mirrors the climber's plans to the device and reads them back",
    "useMyItineraries no longer mirrors/reads the device copy — the climber's own plan is gone at the trailhead"],
  [/defineProperty\(a,\s*"_packedAt"/.test(offS) && /stamp\(rows,\s*st\.at,\s*"state"/.test(offS),
    "lib/offline.js stamps a downloaded state's saved copy with when it was saved",
    "lib/offline.js no longer stamps the state's saved reports/corrections with `_packedAt` — the page cannot tell a saved copy from a live one"],
  [/reportsPackedAt=\(tripQ&&tripQ\.data&&tripQ\.data\._packedAt\)/.test(rdS) && (rdS.match(/savedAgo\(reportsPackedAt\)/g) || []).length >= 2,
    "the route page SAYS saved reports are a saved copy, and how old, in both places it shows them",
    "the route page stopped dating the saved reports — an old copy now reads as live"],
  [/_packedAt/.test(cmS.match(/var photosUnavailable=[^;]*;/) ? cmS.match(/var photosUnavailable=[^;]*;/)[0] : ""),
    "a saved (photo-less) contributions list reads as photos-unavailable, not 'no photos'",
    "photosUnavailable ignores the `_packedAt` stamp — a route served from the device claims it has NO photos"],
  [!!contribsLive && /kind\s*!==\s*"photo"/.test(contribsLive[0]) && /kind=neq\.photo/.test(snap),
    "a state download stores no photo rows (live download and the nightly state file)",
    "the state download now stores photo rows (live path or scripts/build-state-snapshots.mjs) — offline they\n"
    + "       render as broken tiles, and photosUnavailable's premise is gone"],
];
for (const [cond, good, why] of SAVED) { if (cond) ok(good); else fail(why); }

/* Fail closed on a run that quietly stopped asking. Raise this when you add an assertion; never
 * lower it to make a run pass. */
const EXPECTED = 34;
if (ran < EXPECTED)
  dead("only " + ran + " assertion(s) RAN, expected " + EXPECTED
    + " — this guard stopped asking half its questions and still exited 0.");

if (bad) {
  console.error("\ncheck:offline-claims: " + bad + " failure(s) — an offline promise is not backed by the\n"
    + "mechanism that makes it true. Either restore the wiring, or change the copy to match what\n"
    + "the app actually stores. Over-claiming is the direction a climber cannot check.");
  process.exit(1);
}
console.log("\ncheck:offline-claims: ok — a downloaded state is browsable, searchable and carries its\n"
  + "reports, corrections and names, dated (" + ran + " assertions), and the screens that describe it\n"
  + "still say what is NOT on the device. There is no per-route trip pack.");
