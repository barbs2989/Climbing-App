// ONE way to drive to the trailhead per screen, the coordinates beside it, and a label that
// describes the value under it.
//
// #1437 moved TrailheadCard up under GETTING THERE and dropped the standalone "Directions to
// trailhead" button that used to stand there — the two resolved the same trailheadPoint(), so the
// page was offering one destination twice, and printing the road name and status twice with it.
// That fix has no gate: its check is scripts/oneoff/probe-trailhead-sits-with-getting-there.mjs,
// and nothing runs scripts/oneoff/. This is the gate.
//
// NOTHING ELSE CAN SEE THIS CLASS. check:dead-props asks whether a prop is read — both controls
// were read and both worked. check:field-renders asks whether a column reaches a screen — these
// reached it twice, which is more than enough for that guard. check:waypoint-placement asks
// whether a coordinate is DRAWABLE, not whether it is drawn once. A duplicate is invisible to
// every guard that asks "does this reach a screen"; the question has to be "how many times".
//
// COUNTING A CONTROL IS THE WHOLE PROBLEM, and both obvious methods are blind in opposite
// directions. This was measured, not reasoned about:
//   - by LABEL, over the page text: a deny-list over English. This catalog writes prose into the
//     very fields that render here, so an `approach_logistics.trailheadDirection` reading "Drive
//     here and park at the gate" makes a correct page report two controls.
//   - by DESTINATION URL, over the markup: the Plan tab's control is an <a href>, but the crag
//     Overview's is <button onClick={window.open(...)}> — React does not serialize a handler, so
//     the URL is not in the markup at all. Counting hrefs reported ZERO controls on a screen that
//     plainly has one, and a first version of this guard would have been silently blind to it.
// So it counts ANCHOR-OR-BUTTON ELEMENTS WHOSE OWN TEXT IS A DRIVE LABEL. Prose lives in a div and
// is not counted; a handler-only button is. Neither blind spot survives.
//
// Static: one esbuild bundle and five renders. No DB, no browser, so it sits in `npm run build`.
//
// Fails CLOSED: a thin render, a GETTING THERE panel that never appeared, a missing APPROACH
// heading, or a TrailheadCard that did not render are each a broken probe — every "exactly one"
// assertion here is satisfied by a page that rendered nothing at all.
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
const clean = () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } };
process.on("exit", clean);
const entry = path.join(dir, "entry.js");
const out = path.join(dir, "bundle.mjs");

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
const DRIVE_NOTE = "Eleven miles up the valley from the highway.";

const ROUTE = (extra) => Object.assign({
  id: "probe_route", name: "Probe Route", grade: "5.8", discipline: "alpine", pitches: 4,
  mountainId: "probe_area", areaType: "peak",
  approach: "From the trailhead, walk the old grade for two miles.",
  road: { name: "Probe River Road (FR 99)", status: "Gravel to the trailhead", driveNote: DRIVE_NOTE },
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

const CRAG = (extra) => ROUTE(Object.assign({ discipline: "sport", areaType: "crag", pitches: 1 }, extra || {}));

let plan, noCoord, cragOv, cragPlan, gateOnly;
try {
  plan = render(ROUTE(), "planner");
  // No coordinate anywhere: no pin, no logistics lat/lng. trailheadPoint() resolves nothing.
  noCoord = render(ROUTE({ approachLogistics: { trailhead: "Probe Trailhead" }, waypoints: [] }), "planner");
  cragOv = render(CRAG(), "overview");   // cragOnly puts a GETTING THERE panel on OVERVIEW too
  cragPlan = render(CRAG(), "planner");
  // A seasonal gate with NO road status — the one shape that could have lost the gate when
  // TrailheadCard's own road line was dropped.
  gateOnly = render(ROUTE({ road: { name: "Probe River Road (FR 99)", seasonalGate: "Gated 1 Nov to 1 Jun" } }), "planner");
} catch (e) { dead(`RouteDetail threw while rendering: ${String(e && e.message).slice(0, 200)}`); }

for (const [n, h] of [["planner", plan], ["no-coordinate", noCoord], ["crag overview", cragOv], ["crag planner", cragPlan], ["gate-only", gateOnly]]) {
  if (h.length < 900) dead(`the ${n} render came back thin (${h.length} chars)`);
}

/* SSR escapes: renderToStaticMarkup emits &amp; and &#x27;. Match the un-escaped words only, the
   trap [[ssr-probes-must-match-escaped-html]] records. */
const text = (h) => h.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ");
const pTxt = text(plan), nTxt = text(noCoord), coTxt = text(cragOv);

/* A CONTROL, not a phrase and not a URL — see the header. An <a> or <button> whose own text IS a
   drive label. `[^<]*` keeps it to the element's own text, so a label wrapped around other markup
   is not matched and neither is a paragraph that merely says "drive here". */
const DRIVE_LABEL = /^(?:Drive here|Directions to (?:trailhead|crag) \(Google Maps\))$/;
const driveControls = (html) => [...html.matchAll(/<(a|button)\b[^>]*>([^<]*)<\/\1>/g)]
  .map((m) => m[2].replace(/&amp;/g, "&").trim())
  .filter((t) => DRIVE_LABEL.test(t));

// The panels must exist, or every count below is a statement about a page that never rendered.
if (!/GETTING THERE/.test(pTxt)) dead("the Plan tab's GETTING THERE panel did not render — ANCHOR LOST");
if (!/GETTING THERE/.test(coTxt)) dead("the crag Overview's GETTING THERE panel did not render — ANCHOR LOST");
if (!/TRAILHEAD/.test(pTxt)) dead("TrailheadCard did not render — ANCHOR LOST, and the duplication assertions below would be vacuous");
if (!/APPROACH/.test(pTxt)) dead("the APPROACH heading did not render — ANCHOR LOST, nothing bounds the panel");
if (!driveControls(plan).length && !driveControls(cragOv).length) dead("no drive control found on ANY screen — the control detector matches nothing");
ok("both GETTING THERE panels, TrailheadCard and the APPROACH heading render, so the counts below mean something");

// ── 1. one drive control per screen, and it is with GETTING THERE ────────────────────────────────
for (const [n, html] of [["Plan tab", plan], ["crag Overview", cragOv], ["crag Plan tab", cragPlan]]) {
  const c = driveControls(html);
  if (c.length === 1) ok(`${n}: exactly one drive control (${JSON.stringify(c[0])})`);
  else fail(`${n}: ${c.length} drive control(s) — ${JSON.stringify(c)}. One destination must be offered once.`);
}

/* ABOVE THE APPROACH HEADING is how "with GETTING THERE" is asserted without a character window:
   the control renders inside TrailheadCard, which sits between the road panel and APPROACH, so
   slicing a fixed number of characters after the heading would encode a guess about the panel's
   size — the trap this repo records for the camping panel and the Logbook badge. The ORDER of the
   two headings is the invariant. */
const iGetting = pTxt.indexOf("GETTING THERE");
const iApproach = pTxt.indexOf("APPROACH", iGetting);
const iDrive = pTxt.indexOf("Drive here");
if (iDrive > iGetting && iApproach > iGetting && iDrive < iApproach) ok("the Plan tab's control sits between GETTING THERE and APPROACH");
else fail(`the drive control is not with GETTING THERE (GETTING THERE @${iGetting}, control @${iDrive}, APPROACH @${iApproach})`);

// ── 2. the coordinates are beside it ─────────────────────────────────────────────────────────────
const coordRe = new RegExp(COORD.replace(/[.\-]/g, "\\$&"), "g");
const nCoord = (pTxt.match(coordRe) || []).length;
if (nCoord === 1) ok("the coordinates render exactly once on the Plan tab");
else fail(`the coordinates render ${nCoord} time(s) — they must render once, beside the drive control`);
if (nCoord === 1 && pTxt.indexOf(COORD) > iGetting && pTxt.indexOf(COORD) < iApproach) ok("...and inside GETTING THERE, not down in the approach prose");
else if (nCoord === 1) fail("the coordinates render, but not with GETTING THERE");

// ── 3. nothing is restated ───────────────────────────────────────────────────────────────────────
/* SCOPED TO THE CARD, never the tab. The Planner legitimately names the road elsewhere — GETTING
   THERE itself does — so a tab-wide count reports correct work. This repo made the tab-wide
   mistake three times in one sitting on the camping work. */
const cardStart = plan.indexOf(">TRAILHEAD<");
const cardEnd = plan.indexOf("ROUTE BREAKDOWN", cardStart);
const card = cardStart < 0 ? "" : plan.slice(cardStart, cardEnd > 0 ? cardEnd : plan.length);
if (!card) dead("could not locate TrailheadCard in the markup — ANCHOR LOST");
if (!/Road ·|Road &#xB7;/.test(card)) ok("TrailheadCard does not restate the road GETTING THERE already names");
else fail("TrailheadCard restates the road that GETTING THERE already names");
const nNote = (pTxt.match(new RegExp(DRIVE_NOTE.replace(/[.]/g, "\\$&"), "g")) || []).length;
if (nNote === 1) ok("the drive note is printed once");
else fail(`the drive note is printed ${nNote} time(s) on one tab`);

// ── 4. a label describes the value under it ──────────────────────────────────────────────────────
/* The crag Overview printed `road.driveNote || road.name` under the heading "Trailhead", so 249
   crag-family routes read "Roughly 25-30 minutes (about 20 miles) from Dayton, WA" as the name of
   the trailhead — a description of the DRIVE, under the name of the place you drive to, and the
   same string the Plan tab labels correctly as "Drive notes". One label cannot be right for both
   values, so it is chosen per value. */
const oIdx = coTxt.indexOf("GETTING THERE");
const oPanel = oIdx < 0 ? "" : coTxt.slice(oIdx, oIdx + 700);
if (!new RegExp("Trailhead\\s+" + DRIVE_NOTE.replace(/[.]/g, "\\$&")).test(oPanel)) ok('the crag Overview does not label the drive "Trailhead"');
else fail('the crag Overview prints the drive note under the label "Trailhead" — a description of the drive, under the name of the place you drive to');
if (new RegExp("The drive\\s+" + DRIVE_NOTE.replace(/[.]/g, "\\$&")).test(oPanel)) ok("...it labels it as the drive");
else fail("the crag Overview's drive note has no label naming it as the drive");

// ── 5. no coordinate on file — no control, and it says so ────────────────────────────────────────
if (driveControls(noCoord).length === 0) ok("a route with no trailhead coordinate offers no drive control");
else fail("a route with no trailhead coordinate still offers a drive control that goes nowhere");
if (/No trailhead coordinates on file yet/.test(nTxt)) ok("...and says why, rather than going quiet");
else fail("a route with no trailhead coordinate says nothing about it");

// ── 6. the seasonal gate survived losing its second render site ──────────────────────────────────
if (/Gated 1 Nov to 1 Jun/.test(text(gateOnly))) ok("a seasonal gate with no road status still reaches the screen");
else fail("a route whose road has a seasonal gate and NO status renders the gate nowhere — it lost its only other render site");

console.log("");
if (failures) {
  console.log(`check:trailhead-directions: ${failures} failure(s).`);
  console.log("A screen must offer exactly one way to drive to the trailhead, with GETTING THERE, the");
  console.log("coordinates beside it, and a label that describes the value under it.");
  process.exit(1);
}
console.log("check:trailhead-directions: ok — one drive control per screen, coordinates beside it, labels match their values.");

// Injection-tested — see scripts/oneoff/inject-trailhead-directions-cases.mjs.
