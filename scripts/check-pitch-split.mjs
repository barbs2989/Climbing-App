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
// IT USED TO READ THE VERDICT OFF THE HEADING — pitches under "PITCH-BY-PITCH", travel legs
// under "ROUTE BETA", two boxes stacked on the Plan tab. That stacking was itself a claim the
// record never made: on the 144 mixed routes it read as every walk first and then every pitch,
// which is not the climb. They are one ordered list now (ROUTE BREAKDOWN), so the only place
// the classification survives is in how a row is DRAWN, and the assertion moved to the row's
// own `data-kind`. That is strictly stronger than the heading test it replaces: it is per
// entry rather than per page, and it can also check the ORDER, which nothing did before.
//
// #1440's shortfall rule is unchanged and its two cases are kept. Merging the sections removes
// the MECHANISM that produced the false claim — everything described is now in one list — but a
// route that genuinely climbs more pitches than the page describes must still say so.
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
    expect: [["stage", "Trailhead to Fourth of July Pass"], ["stage", "Fourth of July Pass"], ["stage", "6,600 ft to summit"]],
  },
  {
    name: "wa_amphitheater_mountain_finger_of_fatwa — every entry is a pitch",
    route: route("probe_pitchonly", "mountaineering", 4, [
      { pitch: "P1", grade: "5.10-ish", notes: "Face and cracks.", anchor: "2 bolts" },
      { pitch: "P2", grade: "5.11c (crux)", notes: "Thin headwall.", bolts: 6 },
      { pitch: "P3", grade: "5.11b", notes: "Sustained." },
    ]),
    expect: [["pitch", "P1"], ["pitch", "P2"], ["pitch", "P3"]],
  },
  {
    name: "wa_big_four_mountain_tower_route — both kinds on one route",
    route: route("probe_mixed", "trad", null, [
      { pitch: "Approach gully", grade: "low 5th class", notes: "Prominent gully on the NE side." },
      { pitch: "First tower", grade: "5.7", notes: "Work west onto the tower." },
      { pitch: "Second and third towers", grade: "5.6-5.7", notes: "Continue along the crest." },
      { pitch: "Summit snowfield", grade: "steep snow", notes: "Snow to the top." },
    ]),
    expect: [["stage", "Approach gully"], ["pitch", "First tower"], ["pitch", "Second and third towers"], ["stage", "Summit snowfield"]],
  },
  {
    // wa_monte_cristo_peak_scramble, live catalog 2026-09-02. `pitches` is 3 and ALL THREE
    // entries are described: one roped pitch in this table, two stages under ROUTE BETA on
    // the same tab. The heading read "1 of 3" — telling a climber two pitches were
    // undescribed while both were on screen above it. 55 routes did that; on 52 of them
    // `route.pitches` is exactly the entry count, so the denominator was counting the very
    // stages the table filters out and the shortfall could not have existed.
    name: "wa_monte_cristo_peak_scramble — every entry described, so NO shortfall may be claimed",
    route: route("probe_noshortfall", "scrambling", 3, [
      { pitch: "1", grade: "5.6", lengthM: 9, notes: "Crux chimney: three moves rated 5.6, 5.2, 5.6; now bolted." },
      { pitch: "2", grade: "3rd/4th class ramp", lengthM: 30, notes: "From the bolted rap anchor a steepish ramp leads left." },
      { pitch: "3", grade: "Class 3-4 (4th avoidable)", lengthM: 75, notes: "Loose red volcanic breccia scrambling to the summit." },
    ]),
    expect: [["pitch", "P1"], ["stage", "2"], ["stage", "3"]],
    expectText: ["steepish ramp leads left"],
    expectNoText: ["The route lists 3 pitches"],
  },
  {
    // The other direction, or the rule above is satisfied by never claiming a shortfall at
    // all. A route that genuinely describes fewer pitches than it climbs must still say so.
    name: "a route claiming more pitches than the page describes ANYWHERE still reads N of M",
    route: route("probe_shortfall", "trad", 6, [
      { pitch: "P1", grade: "5.9", notes: "Corner to a good ledge.", anchor: "2 bolts" },
      { pitch: "P2", grade: "5.10a", notes: "Thin face past a small roof.", bolts: 4 },
    ]),
    expect: [["pitch", "P1"], ["pitch", "P2"]],
    /* The sentence STATES THE GAP rather than restating both totals. It used to read "The route
       lists 6 pitches and 2 sections are described here." — a run-on whose "and" joins a noun
       phrase to a clause, and which repeats the count the intro has just given under a different
       noun. `expectNoText` keeps that form out, so this case pins the SHAPE as well as the fact
       that a shortfall is claimed at all. */
    expectText: ["The route lists 6 pitches, so 4 are not described here."],
    expectNoText: ["sections are described here"],
  },
  {
    name: "wa_baldy_standard — bare numbers on a walk-up are stages, not pitches",
    route: route("probe_walkup", "scrambling", null, [
      { pitch: "1", grade: "Class 2", notes: "Rough path to a low sub-peak on Gray Wolf Ridge." },
      { pitch: "2", grade: "Class 2", notes: "Open slopes to the summit." },
    ]),
    expect: [["stage", "1"], ["stage", "2"]],
    expectText: ["Gray Wolf Ridge"],
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

  if (!t.includes("ROUTE BREAKDOWN")) {
    // Distinguishing these is the whole point: one is a fixture too thin to render the section
    // at all, the other is the section rendering and getting the entries wrong.
    fail(`${c.name}: ROUTE BREAKDOWN never rendered — nothing below was actually checked`);
    continue;
  }
  // One row per pitch_detail entry, in the record's own order, each tagged with the kind it was
  // drawn as. Read from the MARKUP rather than the text: with a single heading the classification
  // is no longer a word on the page — it is the badge shape, the accent and the detail block, and
  // none of those survive tag-stripping.
  const rows = [...html.matchAll(/data-kind="(pitch|stage)"[^>]*?data-label="([^"]*)"/g)]
    .map((m) => [m[1], m[2].replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"')]);
  if (rows.length !== c.route.pitchDetail.length) {
    fail(`${c.name}: ${rows.length} row(s) rendered for ${c.route.pitchDetail.length} pitch_detail entries`);
  }
  (c.expect || []).forEach(([kind, needle], i) => {
    const row = rows[i];
    if (!row) { fail(`${c.name}: no row at position ${i + 1} (expected the ${kind} ${JSON.stringify(needle)})`); return; }
    if (row[0] !== kind) fail(`${c.name}: entry ${i + 1} (${JSON.stringify(row[1])}) drawn as a ${row[0]}, expected a ${kind}`);
    if (!row[1].includes(needle)) fail(`${c.name}: row ${i + 1} is ${JSON.stringify(row[1])}, expected it to carry ${JSON.stringify(needle)} — the ORDER is wrong, or the label is`);
  });
  for (const s of (c.expectText || [])) {
    if (!t.includes(s)) fail(`${c.name}: expected the section to carry ${JSON.stringify(s)}`);
  }
  for (const s2 of (c.expectNoText || [])) {
    if (t.includes(s2)) fail(`${c.name}: claimed a shortfall it cannot substantiate — found ${JSON.stringify(s2)}`);
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
  console.log("Every pitch_detail entry must render as exactly one row of ROUTE BREAKDOWN, in the");
  console.log("record's own order, drawn as a pitch or a section by the entry's own content");
  console.log("(pitchEntryKind / breakdownRows in RouteDetail.jsx).");
  process.exit(1);
}
console.log(`check:pitch-split: ok — ${CASES.length} real payloads split correctly, nothing dropped.`);

// ── Injection-tested. Re-run after any change to pitchEntryKind, breakdownRows,
// pitchShortfall or RouteBreakdown; a guard nobody has seen fail is not a guard.
// scripts/oneoff/inject-route-breakdown-cases.mjs drives all six.
//
//  1. Restore the per-route verdict — insert `return isPitched(route)?"pitch":"stage";` as the
//     first line of pitchEntryKind.
//  2. Restore the glued badge — render {"P"+r._n} instead of {"P"+r._badge}.
//  3. Drop one kind instead of drawing it — filter the stages out of breakdownRows' result.
//  4. Lose the ORDER — return stages-then-pitches from breakdownRows, i.e. the old two boxes
//     rebuilt inside one section. ONLY the order assertion can see this, which is why it exists.
//  5. #1440's rule, reverted — compare route.pitches against the roped count rather than
//     rows.length, so a fully-described route claims a shortfall again.
//  6. #1440's rule, satisfied by deletion — never claim a shortfall. A rule that only ever
//     suppresses is satisfied by removing the feature, so this direction is asserted too.

