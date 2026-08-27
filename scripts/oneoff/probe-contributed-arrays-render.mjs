// Do CONTRIBUTED array rows reach the boxes that render them?
//
// Covers both array editors added for the contribute sweep: climbing_route's sections and
// approach_variants' ways in. Both had a pencil that opened a DIFFERENT column's editor, so
// both are new paths from the form to a panel, and neither is exercised by any other guard.
//
// A populated column is not a rendered one — that is the `descent_text` lesson (1,021 routes
// populated, rendered on none) and the rack one (the correction reached the right TAB and the
// wrong BOX). So this renders the real ClimbingRouteTable over the shape the form now submits
// rather than over the shape enrichment happens to write.
//
// The two shapes differ on purpose and that is the risk being checked: the editor collects
// {label, cls, notes} because `class` is a reserved word to type around in the draft state, and
// structuredVal emits {n, label, class, notes} — the keys the table reads. If those ever drift,
// the contribution is accepted, merged, and renders as an empty row.

import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = path.join(ROOT, `.crc-${process.pid}.mjs`);
const clean = () => fs.rmSync(out, { force: true });
let failures = 0, cases = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const dead = (w) => { console.error(`\nprobe FAILED — ${w}. Nothing below was checked.\n`); clean(); process.exit(1); };

try {
  execFileSync("npx", ["esbuild", path.join(ROOT, "RouteDetail.jsx"),
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic", "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch { dead("esbuild could not bundle RouteDetail.jsx"); }

const mod = await import(out + "?t=" + Date.now());
const { ClimbingRouteTable, ApproachVariants } = mod;
if (typeof ClimbingRouteTable !== "function") dead("RouteDetail.jsx does not export ClimbingRouteTable — ANCHOR LOST");
if (typeof ApproachVariants !== "function") dead("RouteDetail.jsx does not export ApproachVariants — ANCHOR LOST");

// Exactly what structuredVal({type:"sections"}) emits for two filled rows.
const submitted = [
  { n: 1, label: "Snow slopes to the notch", class: "Class 2-3", notes: "Firm early; the runnel softens by mid-morning." },
  { n: 2, label: "Summit block", class: "5.7", notes: "One short step on the left arete, then walk-off ground." },
];
const route = { id: "probe", mountainId: "probe_area", name: "Probe", climbingRoute: submitted };

let markup;
try { markup = renderToStaticMarkup(React.createElement(ClimbingRouteTable, { route, onEdit: null })); }
catch (e) { dead("ClimbingRouteTable threw: " + (e && e.message)); }
if (markup.length < 400) dead(`rendered only ${markup.length} characters`);

const has = (t) => markup.includes(t.replace(/&/g, "&amp;").replace(/'/g, "&#x27;"));
for (const [what, txt] of [
  ["section 1 label", "Snow slopes to the notch"],
  ["section 2 label", "Summit block"],
  ["the class chip", "Class 2-3"],
  ["a technical class chip", "5.7"],
  ["section 1 notes", "the runnel softens by mid-morning"],
  ["section 2 notes", "One short step on the left arete"],
]) {
  cases++;
  if (has(txt)) ok(`${what} reaches the box`);
  else fail(`${what} does NOT render — the contributed shape and the reader's keys have drifted`);
}

// A row the climber left blank must not render an empty numbered section.
cases++;
const sparse = renderToStaticMarkup(React.createElement(ClimbingRouteTable,
  { route: { ...route, climbingRoute: [{ n: 1, label: "Only a label", class: "", notes: "" }] }, onEdit: null }));
if (sparse.includes("Only a label") && sparse.length > 300) ok("a label-only section still renders");
else fail("a label-only section does not render");

/* ---- approach_variants ----
   Exactly what structuredVal({type:"variants"}) emits. The numbers are NUMBERS here on purpose:
   the editor holds them as strings while typing and parses on submit, and a numeric string would
   both render differently and break the tolerant comparison that lets two parties who measured
   4.8 and 4.9 miles agree. `hazards` is an array; the editor collects it as one-per-line text. */
const vSubmitted = [{
  name: "Snow Creek trail, log crossing and the climbers' trail",
  season: "Jul-Sep", distMi: 4.8, gainFt: 4200, hours: "3-4",
  notes: "Brushy above the log crossing; the climbers' trail is easy to lose in the dark.",
  hazards: ["No water above the lake", "Loose talus in the upper approach"],
}];
let vMarkup;
try {
  vMarkup = renderToStaticMarkup(React.createElement(ApproachVariants,
    { route: { ...route, approachVariants: vSubmitted }, onEdit: null }));
} catch (e) { dead("ApproachVariants threw: " + (e && e.message)); }
if (vMarkup.length < 400) dead(`ApproachVariants rendered only ${vMarkup.length} characters`);
const vHas = (t) => vMarkup.includes(t.replace(/&/g, "&amp;").replace(/'/g, "&#x27;"));
for (const [what, txt] of [
  ["the way-in name", "Snow Creek trail, log crossing"],
  ["the notes", "easy to lose in the dark"],
  ["the first hazard", "No water above the lake"],
  ["the second hazard", "Loose talus in the upper approach"],
]) {
  cases++;
  if (vHas(txt)) ok(`variants: ${what} reaches the panel`);
  else fail(`variants: ${what} does NOT render — the contributed shape and the reader's keys have drifted`);
}
/* The distance and gain render through the app's unit formatters, so the raw number is not
   asserted — what matters is that the row is not silently dropped for carrying them. */
cases++;
if (vMarkup.length > 700) ok(`variants: a fully filled row renders (${vMarkup.length}ch)`);
else fail(`variants: a filled row rendered only ${vMarkup.length} characters`);

clean();
if (cases < 12) dead(`only ${cases} case(s) ran`);
console.log(`\nprobe-contributed-arrays-render: ${cases} case(s), ${failures} failure(s)  [${markup.length}ch]`);
process.exit(failures ? 1 : 0);
