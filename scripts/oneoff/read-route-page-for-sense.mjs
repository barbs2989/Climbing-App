#!/usr/bin/env node
// READ THE ROUTE PAGE, don't assert about it.
//
// Every guard on this page asks a yes/no question it already knows to ask. Nothing reads the
// prose for sense, and CLAUDE.md records that the two defects found that way — Home's friend feed
// and the Logbook count disagreement — both came from a person reading a CI artifact rather than
// from any assertion. This renders a REAL enriched row through the REAL dbRouteToCamel across all
// six sub-tabs and prints the text, plus the cheap machine checks worth having beside it.
//
//   node scripts/oneoff/read-route-page-for-sense.mjs [routeId]

import { build } from "esbuild";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
const WANT = process.argv[2] || null;

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
import { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib", "db.js"))};
export { dbRouteToCamel };
/* RouteDetail calls react-query hooks, so it needs a provider. retry:false so a read that cannot
   reach the network fails fast instead of holding the render; every query is PENDING under
   renderToStaticMarkup regardless — effects do not run — so what this prints is the page as it
   arrives BEFORE any DB read lands. That is the honest frame for reading it, and it is also the
   state a climber on a slow connection actually sees first. */
const noop = () => {};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
export function render(route, tab) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      /* THE FULL PROP SET, lifted from check:bare rather than invented. A short list throws
         "Cannot read properties of undefined" naming the ROUTE ID, which reads like a bad row
         and sends you to the database — CLAUDE.md records that exact misdiagnosis. */
      React.createElement(RouteDetail, {
        route, initialSubTab: tab, onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;
/* INSIDE THE PROJECT, not os.tmpdir(): node resolves bare imports from the nearest node_modules,
   so a bundle in the OS temp dir throws ERR_MODULE_NOT_FOUND for react-query. CLAUDE.md records
   this trap for check:waypoint-placement; it bites any probe that bundles RouteDetail.

   AND THE NAME STARTS WITH A DOT DELIBERATELY. #1574 hardened seven guards that walk the repo
   root and statSync every entry: a temp file appearing there and vanishing between a sibling's
   readdir and its stat killed that sibling with ENOENT, and the guards run concurrently. Those
   walkers now skip dot entries, so a dot-prefixed directory is the safe shape for anything
   written at the root. Do not rename this to a bare `cm-read-…`. */
const tmpDir = fs.mkdtempSync(path.join(ROOT, ".cm-read-"));
const out = path.join(tmpDir, "b.cjs");
process.on("exit", () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} });
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
    /* ALL THREE EXTERNAL, not just react-query. Marking only react-query external leaves React
     BUNDLED while react-query resolves its own copy from node_modules — two Reacts, and the
     render dies with "Invalid hook call ... more than one copy of React". The Inbox probe records
     the mirror of this (bundling react-query gives the provider a different module instance). One
     resolution source for all three is the only stable answer. */
  outfile: out, logLevel: "error", external: ["react", "react-dom", "react-dom/server", "@tanstack/react-query"],
});
const { render, dbRouteToCamel } = require_(out);

// A route with enough enrichment that every sub-tab has something to say. Picked by DATA, not by
// name: a thin row makes every tab look clean because there is nothing on it to be wrong.
const filter = WANT ? `id=eq.${WANT}` : "id=eq.wa_mount_baker_north_ridge";
const rows = await selectAll("routes", "*", filter, { pageSize: 5 });
if (!rows.length) { console.log("no such route — pass an id, or the default has been renamed"); process.exit(1); }
const route = dbRouteToCamel(rows[0]);
console.log(`### ${route.name}  (${route.id})  ${route.discipline} ${route.grade} ${route.pitches}p\n`);

const TABS = ["overview", "planner", "conditions", "safety", "partners", "photos"];
const strip = (h) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

/* The machine half is deliberately SMALL — these are the shapes that are unarguable. Anything
   subtler is what the printed text is for. `NaN`/`undefined`/`[object Object]` are check:ui's
   scan; the repeated-heading one is not covered anywhere and is how the trailhead duplication
   looked before it was found. */
const BAD = /\bNaN\b|\bundefined\b|\[object Object\]|\bnull\b/;

/* FOUR THINGS THIS INSTRUMENT CANNOT SEE, and each of them looks like a defect if you forget:
   1. NUMERIC TILES READ ZERO. They render through <CountUp/>, which is useState(0) reaching its
      target inside a useEffect — and effects do not run under renderToStaticMarkup. So Overview
      says "6.1 mi Dist" in the header strap and "0.0 mi Distance" in TECHNICAL STATS on the SAME
      screen, and that contradiction is this renderer, not the app. Never read a number here.
   2. EVERY react-query READ IS PENDING, so "No reports yet" / "No partners listed yet" are the
      not-yet-loaded state, not an outage lie. check:outage is the instrument for that question.
   3. REPEATED HEADING-SHAPED TEXT IS MOSTLY NOISE. "APPROACH" legitimately appears as the
      APPROACHES variants panel, the APPROACH prose section, and a PUBLISHED TIMES label. Read the
      three occurrences before believing any of them is a duplication.
   4. `access` IS A CRAG-LEVEL BLOB. Every route on one peak shares it, so a seasonal-closure note
      naming a trailhead this route does not use is the documented structure rather than
      contamination — all 8 Mount Baker routes carry the same south-side note. */

for (const tab of TABS) {
  let html = "";
  try { html = render(route, tab); }
  catch (e) { console.log(`--- ${tab.toUpperCase()}: THREW ${e.message}\n`); continue; }
  const text = strip(html);
  console.log(`--- ${tab.toUpperCase()}  (${text.length} chars)`);

  const hit = text.match(BAD);
  if (hit) {
    const i = text.indexOf(hit[0]);
    console.log(`    !! ${hit[0]} — ...${text.slice(Math.max(0, i - 90), i + 90)}...`);
  }

  // A heading rendered twice on one tab is the trailhead-duplication shape. Headings here are
  // uppercase runs of 4+ chars; count only ones appearing more than once.
  const heads = text.match(/\b[A-Z][A-Z &'’-]{3,}\b/g) || [];
  const seen = {};
  for (const h of heads) { const k = h.trim(); if (k.length > 4) seen[k] = (seen[k] || 0) + 1; }
  const dupes = Object.entries(seen).filter(([, n]) => n > 1);
  if (dupes.length) console.log("    repeated heading-shaped text: " + dupes.map(([k, n]) => `${k} x${n}`).join(", "));

  const LIM = Number(process.env.CHARS || 1500);
  console.log("    " + text.slice(0, LIM) + (text.length > LIM ? " …" : ""));
  console.log("");
}
