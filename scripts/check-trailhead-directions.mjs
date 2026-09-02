// ONE "drive to the trailhead" CONTROL PER PAGE, and the coordinates travel with it.
//
// The Plan tab carried two of them. A full-width "Directions to trailhead (Google Maps)" button sat
// under GETTING THERE; a "Drive here" button and a copy-the-coordinates button sat inside
// TrailheadCard a few centimetres below it. Same destination — both resolve through the same
// trailheadPoint(), which #1215/#1231 consolidated precisely so the page could not offer two — so
// the second was not a choice, it was the page repeating itself. The road name and status were
// printed twice over in the same pair of boxes.
//
// NOTHING EXISTING COULD SEE IT. check:dead-props asks whether a prop is read; both controls were
// read and both worked. check:field-renders asks whether a column reaches a screen; these reach it
// twice, which is more than enough for that guard. check:waypoint-placement asks whether the
// coordinate is DRAWABLE, not whether it is drawn once. A duplicate is invisible to every guard
// that asks "does this reach a screen" — the question has to be "how many times".
//
// WHAT IT PINS:
//   - exactly ONE directions control on the Plan tab, and it is above the APPROACH heading, i.e.
//     with GETTING THERE where the rest of the drive already is
//   - the coordinates render beside it. They are what you read out over the radio or paste into a
//     GPS, so they belong at the end of the road rather than in the panel about the walk. Before
//     this they rendered in TrailheadCard and nowhere else.
//   - TrailheadCard draws NO drive control and does not restate the road
//   - a route with no trailhead coordinate on file renders NEITHER control rather than a dead one
//   - the crag Overview branch has exactly one too — it is a second GETTING THERE panel, and a
//     rule about one of them is not a rule
//   - the SEASONAL GATE still reaches a screen. It used to have two render sites and the surviving
//     one only showed it as a suffix on the road STATUS row, so a route with a gate and no status
//     would have lost it silently in this change. That is the shape this file records under
//     [[changing-which-record-wins-leaves-the-neighbouring-field-behind]].
//
// Static: one esbuild bundle and four renders. No DB, no browser, so it sits in `npm run build`.
//
// Fails CLOSED: a thin render, a GETTING THERE panel that never appeared, or an APPROACH heading
// that moved are each a broken probe — every "exactly one" assertion here is satisfied by a page
// that rendered nothing at all.
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
// @tanstack/react-query MUST be --external. Bundled, esbuild inlines its own copy and the provider
// created here is a different module instance with a different React context; the render then
// throws "No QueryClient set" with a provider plainly wrapped around it.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const dead = (m) => { console.log("  BROKEN GUARD  " + m); process.exit(1); };

const dir = fs.mkdtempSync(path.join(ROOT, ".cm-thdir-"));
const entry = path.join(dir, "entry.js");
const out = path.join(dir, "bundle.mjs");
const clean = () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } };
process.on("exit", clean);

try {
  fs.writeFileSync(entry, `export { default as RouteDetail } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};\n`);
  // Bundle INSIDE the project: node resolves `react` from the nearest node_modules, so a bundle in
  // the OS temp dir throws ERR_MODULE_NOT_FOUND.
  execFileSync("npx", ["esbuild", entry,
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch {
  dead("esbuild could not bundle RouteDetail.jsx");
}

// createClient builds a RealtimeClient AT CONSTRUCTION, which needs a WebSocket constructor —
// native on node 22, absent on 20. Nothing here subscribes, so satisfying the capability check is
// enough, and doing it explicitly keeps this runnable on both rather than dying on node 20.
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class { constructor() { throw new Error("probe: no realtime"); } };
}

const { RouteDetail } = await import(out + "?t=" + Date.now());
if (typeof RouteDetail !== "function") dead("RouteDetail.jsx has no default export — ANCHOR LOST");

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnMount: false } } });
const noop = () => {};
const LAT = 48.61234, LNG = -121.23456;
const COORD = "48.61234, -121.23456";

const ROUTE = (extra) => Object.assign({
  id: "probe_route", name: "Probe Route", grade: "5.8", discipline: "alpine", pitches: 4,
  mountainId: "probe_area", areaType: "peak",
  approach: "From the trailhead, walk the old grade for two miles.",
  road: { name: "Probe River Road (FR 99)", status: "Gravel to the trailhead", driveNote: "From the highway, 11 miles." },
  approachLogistics: { trailhead: "Probe Trailhead", trailheadLat: LAT, trailheadLng: LNG, trailheadDirection: "From the highway, turn north." },
  waypoints: [{ name: "Probe Trailhead", type: "Trailhead", lat: LAT, lng: LNG, elev: 2400 }],
}, extra || {});

const render = (route, tab) => renderToStaticMarkup(
  React.createElement(QueryClientProvider, { client: qc },
    React.createElement(RouteDetail, {
      route, initialSubTab: tab, onBack: noop, onSubTab: noop,
      contribs: [], myReports: [], connections: [], comments: {},
      hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
      crewsForRoute: [], myStars: {}, presence: null,
    })));

let plan, noCoord, crag, gateOnly;
try {
  plan = render(ROUTE(), "planner");
  // No coordinate anywhere: no pin, no logistics lat/lng. trailheadPoint() resolves nothing.
  noCoord = render(ROUTE({ approachLogistics: { trailhead: "Probe Trailhead" }, waypoints: [] }), "planner");
  // cragOnly puts GETTING THERE on OVERVIEW instead, with its own directions control.
  crag = render(ROUTE({ discipline: "sport", areaType: "crag", pitches: 1 }), "overview");
  // A seasonal gate with NO road status — the one shape that could have lost the gate here.
  gateOnly = render(ROUTE({ road: { name: "Probe River Road (FR 99)", seasonalGate: "Gated 1 Nov to 1 Jun" } }), "planner");
} catch (e) { dead(`RouteDetail threw while rendering: ${String(e && e.message).slice(0, 200)}`); }

for (const [n, h] of [["planner", plan], ["no-coordinate", noCoord], ["crag overview", crag], ["gate-only", gateOnly]]) {
  if (h.length < 900) dead(`the ${n} render came back thin (${h.length} chars)`);
}

/* SSR escapes: renderToStaticMarkup emits &amp; and &#x27;. Match the un-escaped words only, the
   trap [[ssr-probes-must-match-escaped-html]] records. */
const text = (h) => h.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ");
const pTxt = text(plan), nTxt = text(noCoord), cTxt = text(crag), gTxt = text(gateOnly);

// The panel must exist, or every count below is a statement about a page that never rendered.
if (!/GETTING THERE/.test(pTxt)) dead("the Plan tab's GETTING THERE panel did not render — ANCHOR LOST");
if (!/GETTING THERE/.test(cTxt)) dead("the crag Overview's GETTING THERE panel did not render — ANCHOR LOST");
if (!/TRAILHEAD/.test(pTxt)) dead("TrailheadCard did not render — ANCHOR LOST, and the duplication assertions below would be vacuous");
if (!/APPROACH/.test(pTxt)) dead("the APPROACH heading did not render — ANCHOR LOST, nothing bounds the panel");
ok("both GETTING THERE panels and TrailheadCard render, so the counts below mean something");

// ── 1. exactly one drive control, and it is with GETTING THERE ───────────────────────────────────
const count = (t, re) => (t.match(re) || []).length;
/* COUNTED ON THE DESTINATION URL, NEVER ON THE LABEL. A label test is a deny-list over English and
   this catalog writes prose into the fields that render here: `approach_logistics.trailheadDirection`
   saying "Drive here and park at the gate" would make a correct page report two controls, which is
   the direction that teaches people to ignore a guard. Only a control carries the maps URL.
   SSR escapes `&` inside an attribute, so the `&amp;` alternative is required rather than defensive. */
const DRIVE = /maps\/dir\/\?api=1&(?:amp;)?destination=/g;

const nPlan = count(plan, DRIVE);
if (nPlan === 1) ok("the Plan tab offers exactly one drive-to-trailhead control");
else fail(`the Plan tab offers ${nPlan} drive-to-trailhead control(s) — it must offer exactly one, with GETTING THERE`);

const nCrag = count(crag, DRIVE);
if (nCrag === 1) ok("the crag Overview offers exactly one drive control");
else fail(`the crag Overview offers ${nCrag} drive control(s)`);

/* ABOVE THE APPROACH HEADING is how "with GETTING THERE" is asserted without a character window:
   the control renders as a sibling of the road card, so slicing a fixed number of characters after
   the heading would encode a guess about the panel's size — the trap this repo records for the
   camping panel and the Logbook badge. The order of the two headings is the invariant. */
const iGetting = pTxt.indexOf("GETTING THERE");
const iApproach = pTxt.indexOf("APPROACH", iGetting);
const iDrive = pTxt.search(/Directions to trailhead \(Google Maps\)/);
if (iDrive > iGetting && iApproach > iGetting && iDrive < iApproach) ok("the surviving control sits between GETTING THERE and APPROACH");
else fail(`the drive control is not with GETTING THERE (GETTING THERE @${iGetting}, control @${iDrive}, APPROACH @${iApproach})`);

// ── 2. the coordinates came with it ──────────────────────────────────────────────────────────────
const nCoord = count(pTxt, new RegExp(COORD.replace(/[.\\+*?[^\]$(){}=!<>|:\-#]/g, "\\$&"), "g"));
if (nCoord === 1) ok("the coordinates render exactly once");
else fail(`the coordinates render ${nCoord} time(s) — they must render once, beside the directions control`);
if (nCoord === 1 && pTxt.indexOf(COORD) > iGetting && pTxt.indexOf(COORD) < iApproach) ok("the coordinates render with GETTING THERE");
else if (nCoord === 1) fail("the coordinates render, but not inside GETTING THERE");

if (count(cTxt, new RegExp(COORD.replace(/[.\\+*?[^\]$(){}=!<>|:\-#]/g, "\\$&"), "g")) === 1) ok("the crag Overview shows the coordinates too");
else fail("the crag Overview offers directions without the coordinates");

// ── 3. TrailheadCard restates nothing ────────────────────────────────────────────────────────────
/* SCOPED TO THE CARD, never the tab. The Planner legitimately names the road elsewhere — GETTING
   THERE itself does — so a tab-wide count reports correct work. This repo made the tab-wide mistake
   three times in one sitting on the camping work. */
const cardStart = plan.indexOf(">TRAILHEAD<");
const cardEnd = plan.indexOf("ROUTE BREAKDOWN", cardStart);
const card = cardStart < 0 ? "" : plan.slice(cardStart, cardEnd > 0 ? cardEnd : plan.length);
if (!card) dead("could not locate TrailheadCard in the markup — ANCHOR LOST");
if (!DRIVE.test(card)) ok("TrailheadCard draws no drive control");
else fail("TrailheadCard still draws its own drive control");
DRIVE.lastIndex = 0;
if (!/Road ·|Road &#xB7;/.test(card)) ok("TrailheadCard does not restate the road");
else fail("TrailheadCard still restates the road that GETTING THERE already names");

// ── 4. no coordinate on file — neither control, and it says so ───────────────────────────────────
if (count(noCoord, DRIVE) === 0) ok("a route with no trailhead coordinate offers no drive control");
else fail("a route with no trailhead coordinate still offers a drive control that goes nowhere");
if (/No trailhead coordinates on file yet/.test(nTxt)) ok("...and says why, rather than going quiet");
else fail("a route with no trailhead coordinate says nothing about it");

// ── 5. the seasonal gate survived losing its second render site ──────────────────────────────────
if (/Gated 1 Nov to 1 Jun/.test(gTxt)) ok("a seasonal gate with no road status still reaches the screen");
else fail("a route whose road has a seasonal gate and NO status now renders the gate nowhere — it lost its only other render site");

console.log("");
if (failures) {
  console.log(`check:trailhead-directions: ${failures} failure(s).`);
  console.log("The route page must offer exactly one way to drive to the trailhead, with GETTING THERE,");
  console.log("and the coordinates must be beside it (TrailheadDirections in RouteDetail.jsx).");
  process.exit(1);
}
console.log("check:trailhead-directions: ok — one drive control per page, with GETTING THERE, coordinates beside it.");

// Injection-tested — see scripts/oneoff/inject-trailhead-directions-cases.mjs.
