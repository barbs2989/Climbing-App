#!/usr/bin/env node
// check:pitch-split — a pitch_detail entry must reach the section that describes it.
//
// The app used to decide this per ROUTE, from the discipline alone (isPitched, one line in
// RouteDetail.jsx). Measured against the live catalog on 2026-08-09, that put 117 routes
// under "PITCH-BY-PITCH" whose entries are a walking itinerary — wa_ruby_mountain_south_ridge
// is "Trailhead to Fourth of July Pass / Fourth of July Pass to ~4,950 ft promontory / …" —
// and 88 routes under "ROUTE STAGES" whose entries are numbered pitches.
//
// The deeper problem is that no per-route verdict CAN be right: 144 routes hold both kinds.
// wa_big_four_mountain_tower_route is "Approach gully / First tower / Notch rappel / Second
// and third towers / Summit snowfield" — travel, climbing, descent, climbing, travel. So the
// split is per ENTRY, and this guard asserts the entries land in the right place by
// RENDERING the real component, not by re-checking the classifier against itself.
//
// Fixtures are real `pitch_detail` payloads copied out of the live catalog, the same reason
// check:overlay-discovery lifts its payloads from the app's own setter call sites: an
// invented payload proves the renderer works on invented data.
//
// Effects do not run under renderToStaticMarkup — never assert on a CountUp number here.

import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { appSources } from "./lib/guard-sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require_ = createRequire(import.meta.url);

// Fails loudly if a named source has moved, rather than quietly scanning a shorter list.
appSources(ROOT, "check:pitch-split");

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route, tab) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: tab, onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-pitch-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

const route = (id, discipline, pitches, pitchDetail) => ({
  id, name: id, grade: "5.8", gradeSystem: "yds", discipline, pitches, pitchDetail,
  mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
});

// ── real payloads, live catalog 2026-08-09 ────────────────────────────────────────────
const CASES = [
  {
    name: "wa_ruby_mountain_south_ridge — every entry is travel",
    route: route("probe_stageonly", "trad", null, [
      { pitch: "Trailhead to Fourth of July Pass", grade: "Maintained trail, Class 1", notes: "Switchbacks through forest." },
      { pitch: "Fourth of July Pass to ~4,950 ft promontory", grade: "Class 2, faint bootpath", notes: "Follow the bootpath north." },
      { pitch: "~6,600 ft to summit (7,426 ft)", grade: "Class 2-3 scramble", notes: "Blocky scrambling to the top." },
    ]),
    expectBeta: ["Trailhead to Fourth of July Pass", "Class 2-3 scramble"],
    expectNoPitchTable: true,
  },
  {
    name: "wa_amphitheater_mountain_finger_of_fatwa — every entry is a pitch",
    route: route("probe_pitchonly", "mountaineering", 4, [
      { pitch: "P1", grade: "5.10-ish", notes: "Face and cracks.", anchor: "2 bolts" },
      { pitch: "P2", grade: "5.11c (crux)", notes: "Thin headwall.", bolts: 6 },
      { pitch: "P3", grade: "5.11b", notes: "Sustained." },
    ]),
    expectPitch: ["PITCH-BY-PITCH", "5.11c (crux)"],
    expectNoBeta: true,
  },
  {
    name: "wa_big_four_mountain_tower_route — both kinds on one route",
    route: route("probe_mixed", "trad", null, [
      { pitch: "Approach gully", grade: "low 5th class", notes: "Prominent gully on the NE side." },
      { pitch: "First tower", grade: "5.7", notes: "Work west onto the tower." },
      { pitch: "Second and third towers", grade: "5.6-5.7", notes: "Continue along the crest." },
      { pitch: "Summit snowfield", grade: "steep snow", notes: "Snow to the top." },
    ]),
    expectPitch: ["PITCH-BY-PITCH", "First tower", "5.6-5.7"],
    expectBeta: ["ROUTE BETA", "Approach gully", "Summit snowfield"],
  },
  {
    name: "wa_baldy_standard — bare numbers on a walk-up are stages, not pitches",
    route: route("probe_walkup", "scrambling", null, [
      { pitch: "1", grade: "Class 2", notes: "Rough path to a low sub-peak on Gray Wolf Ridge." },
      { pitch: "2", grade: "Class 2", notes: "Open slopes to the summit." },
    ]),
    expectBeta: ["ROUTE BETA", "Gray Wolf Ridge"],
    expectNoPitchTable: true,
  },
];

const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&#x2F;/g, "/")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ");

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);

for (const c of CASES) {
  let html;
  // "planner", not "overview": PITCH-BY-PITCH and ROUTE BETA moved to the Plan tab, beside
  // the approach, descent and rack — the split this guard checks is unchanged, only where it
  // renders. Rendering the wrong tab does not fail loudly on its own; it reports every entry
  // as reaching NEITHER section, which is how this was caught.
  try { html = render(c.route, "planner"); }
  catch (e) { fail(`${c.name} threw: ${e.message.split("\n")[0].slice(0, 140)}`); continue; }
  const t = text(html);

  for (const bad of ["NaN", "undefined", "[object Object]"]) {
    if (t.includes(bad)) fail(`${c.name} rendered "${bad}" in visible copy`);
  }
  // The badge used to be built as "P"+label, so a descriptive label printed "PFirst tower"
  // inside a 26px circle. Nothing else in the app produces that shape.
  const glued = /\bP(?:[A-Z][a-z]+ [a-z]|Approach|Lower|Upper|Summit|Chimney)/.exec(t);
  if (glued) fail(`${c.name} glued the pitch badge onto a descriptive label: "${glued[0]}"`);

  for (const s of (c.expectBeta || [])) {
    if (!t.includes(s)) fail(`${c.name}: expected ROUTE BETA to carry ${JSON.stringify(s)}`);
  }
  for (const s of (c.expectPitch || [])) {
    if (!t.includes(s)) fail(`${c.name}: expected PITCH-BY-PITCH to carry ${JSON.stringify(s)}`);
  }
  if (c.expectNoPitchTable && t.includes("PITCH-BY-PITCH")) {
    fail(`${c.name}: rendered PITCH-BY-PITCH over entries that are not pitches`);
  }
  if (c.expectNoBeta && t.includes("ROUTE BETA")) {
    fail(`${c.name}: rendered ROUTE BETA over entries that are real pitches`);
  }
  // Nothing may be silently dropped — every entry has to surface in one section or the other.
  for (const p of c.route.pitchDetail) {
    const probe = String(p.notes || "").slice(0, 24);
    if (probe && !t.includes(probe)) fail(`${c.name}: entry ${JSON.stringify(p.pitch)} reached NEITHER section`);
  }
  if (!failures) ok(c.name);
}

// A guard that finds nothing because it rendered nothing is the failure mode here.
if (!CASES.length) fail("no fixtures — this guard verified nothing");

console.log("");
if (failures) {
  console.log(`check:pitch-split FAILED — ${failures} problem(s).`);
  console.log("Every pitch_detail entry must render in exactly one of PITCH-BY-PITCH or");
  console.log("ROUTE BETA, chosen by the entry's own content (pitchEntryKind in RouteDetail.jsx).");
  process.exit(1);
}
console.log(`check:pitch-split: ok — ${CASES.length} real payloads split correctly, nothing dropped.`);

// ── Injection-tested 2026-08-09. Re-run these after any change to pitchEntryKind,
// splitPitchDetail, PitchTable or RouteBeta; a guard nobody has seen fail is not a guard.
//
//  1. Restore the original per-route verdict — insert `return isPitched(route)?"pitch":"stage";`
//     as the first line of pitchEntryKind.            -> 4 failures, naming all three shapes.
//  2. Restore the glued badge — render {"P"+p._n} instead of {"P"+p._badge} in PitchTable.
//                                                     -> 1 failure: "PFirst t".
//  3. Drop the stages instead of rehoming them — `const stages=[]` in RouteBeta.
//                                                     -> 14 failures, including
//                                                        'entry "1" reached NEITHER section'.

