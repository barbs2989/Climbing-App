#!/usr/bin/env node
// ROUTE BREAKDOWN's shortfall line must be a sentence, and must say what is MISSING.
//
// Captured verbatim on CI's demo walk:
//
//     ROUTE BREAKDOWN
//     18 roped pitches, in route order. The route lists 20 pitches and 18 sections are described here.
//
// Two things wrong with the second sentence. It is a RUN-ON — "and" joins a noun phrase
// ("20 pitches") to a clause ("18 sections are described here"), so it has to be re-read. And it
// REPEATS the count the first sentence just gave, under a different noun: 18 "roped pitches"
// becomes 18 "sections".
//
// What a climber wants from that line is the number of pitches with NO description. `pitchCount`
// is the described roped pitches, so the subtraction stays in one unit — `rows.length` would mix
// in travel legs on a route that has both.
//
// IT CANNOT GO ZERO OR NEGATIVE where it renders: pitchShortfall fires only when
// route.pitches > pitchDetail.length, and pitchCount is at most pitchDetail.length (rows are
// pitchDetail split into pitch/stage kinds). Assertion 5 pins that across shapes.
//
// RENDERED, not just executed, because a sentence composed correctly and never concatenated into
// `intro` is the same defect wearing a different hat. This uses check:bare's harness.
//
//   node scripts/oneoff/probe-breakdown-shortfall-sentence.mjs

import { build } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);

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

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-short-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

let bad = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); bad++; };
const un = (h) => h.replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");

// n roped pitches described, `claims` written on the route.
const route = (claims, nPitch, nStage) => ({
  id: "probe", name: "Probe", grade: "5.9", gradeSystem: "yds", discipline: "trad",
  pitches: claims,
  pitchDetail: [].concat(
    Array.from({ length: nPitch }, (_, i) => ({ pitch: String(i + 1), grade: "5.8", lengthM: 30, note: "A pitch." })),
    Array.from({ length: nStage || 0 }, (_, i) => ({ pitch: "Approach gully " + (i + 1), lengthM: 100, note: "A walk." })),
  ),
});

const textOf = (h) => un(h).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const near = (t, heading, n) => { const i = t.indexOf(heading); return i < 0 ? "" : t.slice(i, i + n); };

// ---- the demo-walk shape: route claims 20, describes 18 roped pitches.
const t1 = textOf(render(route(20, 18, 0), "planner"));
if (t1.length < 1500) fail(`the render is only ${t1.length} chars — nothing below is meaningful`);
else ok(`rendered (${t1.length} chars)`);

const seg = near(t1, "ROUTE BREAKDOWN", 320);
if (!seg) fail("ANCHOR LOST: ROUTE BREAKDOWN did not render — the rest of this run is vacuous");
else ok("ROUTE BREAKDOWN renders on the Plan tab");

// ---- 1. the run-on is gone.
if (/pitches and \d+ sections? (are|is) described here/.test(seg))
  fail(`the run-on sentence is still there: ${JSON.stringify(seg.slice(0, 200))}`);
else ok("the run-on 'N pitches and M sections are described here' is gone");

// ---- 2. it states the gap, in pitches, and the arithmetic is right (20 claimed, 18 described).
if (/The route lists 20 pitches, so 2 are not described here\./.test(seg))
  ok("it states the gap: 'The route lists 20 pitches, so 2 are not described here.'");
else fail(`the shortfall line reads: ${JSON.stringify(seg.slice(0, 240))}`);

// ---- 3. the intro is unchanged and not repeated by it.
if (/18 roped pitches, in route order\./.test(seg)) ok("the intro still counts the described pitches");
else fail(`the intro changed: ${JSON.stringify(seg.slice(0, 200))}`);

// ---- 4. SINGULAR agreement — one missing pitch must not read "1 are".
const s2 = near(textOf(render(route(19, 18, 0), "planner")), "ROUTE BREAKDOWN", 320);
if (/so 1 is not described here\./.test(s2)) ok("one missing pitch reads 'so 1 is not described here.'");
else fail(`singular agreement is wrong: ${JSON.stringify(s2.slice(0, 240))}`);

// ---- 5. pitchShortfall IS DELIBERATELY CONSERVATIVE ON A MIXED ROUTE, and that is documented
// behaviour rather than a gap: it compares route.pitches against EVERYTHING described (pitches AND
// travel legs), because a "section" may cover several pitches, so 22 claimed against 18 pitches +
// 4 legs makes NO claim. This assertion exists because my first version of it asserted the
// opposite and failed on correct code.
const s3 = near(textOf(render(route(22, 18, 4), "planner")), "ROUTE BREAKDOWN", 420);
if (!/not described here/.test(s3)) ok("a mixed route whose total matches its claim says nothing");
else fail(`a mixed route claimed a shortfall it cannot support: ${JSON.stringify(s3.slice(0, 300))}`);

// ---- 5b. ...but when it DOES fire on a mixed route, the subtraction stays in PITCHES. 30 claimed
// against 18 roped + 4 legs: rows.length is 22, so a rows-based subtraction would say 8 — mixing
// travel legs into a count of undescribed PITCHES. pitchCount is why it says 12.
const s3b = near(textOf(render(route(30, 18, 4), "planner")), "ROUTE BREAKDOWN", 460);
if (/so 12 are not described here\./.test(s3b)) ok("a mixed route subtracts pitches from pitches (30 - 18 = 12)");
else fail(`mixed route with a real shortfall reads: ${JSON.stringify(s3b.slice(0, 320))}`);

// ---- 6. NO SHORTFALL, NO SENTENCE. A route that describes everything it claims must say nothing,
// or the line becomes noise on every route and stops being read.
const s4 = near(textOf(render(route(18, 18, 0), "planner")), "ROUTE BREAKDOWN", 320);
if (!/not described here/.test(s4)) ok("a fully described route makes no shortfall claim");
else fail(`a fully described route still claims a shortfall: ${JSON.stringify(s4.slice(0, 240))}`);

console.log(bad ? `\n${bad} problem(s).` : "\nall assertions passed");
process.exit(bad ? 1 : 0);
