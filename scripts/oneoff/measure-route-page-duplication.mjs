#!/usr/bin/env node
// WHAT DOES THE ROUTE PAGE SAY TWICE?
//
// Three defects of one class were found by hand on 2026-09-02/03, each by somebody happening to
// look at the right screen: ROUTE BETA and PITCH-BY-PITCH as two stacked boxes (#1450), two
// GETTING THERE panels with a drive control each (#1493), and `road.driveNote` printed under the
// label "Trailhead" on 249 crag routes (#1479). Finding a class three times by eye is the signal
// to measure it instead.
//
// The question is deliberately narrow and mechanical: for a REAL route, rendered tab by tab, which
// stored VALUES reach the screen more than once? A value printed twice on one tab is either a
// duplicated section or a value in two roles; a value printed on two tabs may be fine (a route
// name) or may be a section living in two places.
//
// IT REPORTS, IT DOES NOT JUDGE. Some repetition is correct — a grade belongs in the header strap
// AND in the grades panel, and `hazards` is deliberately merged from three columns. So this prints
// candidates with their surroundings and says outright that reading is the next step. Same
// contract as audit:rappel-claims and audit:trailhead-road.
//
// Real rows, not fixtures: a fixture proves the renderer works on invented data, and this class is
// about which of a real row's ~95 columns collide on screen. Reads the DB, so not a build gate.
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = fs.mkdtempSync(path.join(ROOT, ".cm-dup-"));
process.on("exit", () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } });
const entry = path.join(dir, "e.js"), out = path.join(dir, "b.mjs");
fs.writeFileSync(entry, [
  `export { default as RouteDetail } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};`,
  `export { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};`,
].join("\n"));
execFileSync("npx", ["esbuild", entry, "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
  "--define:import.meta.env={}", "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
  "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = class { constructor() { throw new Error("probe: no realtime"); } };
const { RouteDetail, dbRouteToCamel } = await import(out);
if (typeof dbRouteToCamel !== "function") { console.log("BROKEN PROBE: lib/db.js no longer exports dbRouteToCamel — ANCHOR LOST"); process.exit(1); }

// The most-enriched rows are where columns can collide at all; a thin route has nothing to repeat.
const LIMIT = Number(process.env.LIMIT || 12);
const rows = await selectAll("routes", "*",
  "road=not.is.null&approach=not.is.null&pitch_detail=not.is.null&approach_logistics=not.is.null", { pageSize: 200 });
if (!rows.length) { console.log("BROKEN PROBE: no enriched routes read — a failed read is not an empty catalog"); process.exit(1); }
const sample = rows.slice(0, LIMIT);
console.log(`read ${rows.length} fully-enriched routes; rendering ${sample.length}\n`);

const TABS = ["overview", "planner", "conditions", "safety", "photos", "partners"];
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};

/* THE UNIT IS A STORED STRING, not a word. Words repeat constantly and mean nothing; a whole
   stored value appearing twice is a section printed twice. Leaves are collected from the row so
   the comparison is "what the DATABASE holds" rather than "what looks similar on screen". */
function leaves(v, col, depth = 0, acc = []) {
  if (depth > 4) return acc;
  if (typeof v === "string") { const t = v.trim(); if (t.length >= 25) acc.push([t, col]); return acc; }
  if (Array.isArray(v)) { v.forEach((x) => leaves(x, col, depth + 1, acc)); return acc; }
  if (v && typeof v === "object") { Object.values(v).forEach((x) => leaves(x, col, depth + 1, acc)); return acc; }
  return acc;
}
/* THE HEADER IS NOT DUPLICATION. `name` renders in the header strap on every sub-tab, which is
   what a header is for, and it swamped the first run — one line per tab per route. Excluded by
   COLUMN rather than by "appears on all six tabs", because a genuine section living on all six
   would be excluded by the latter and is exactly what this looks for. */
const HEADER_COLS = new Set(["name", "id", "area_id"]);
const textOf = (h) => h.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'")
  .replace(/&quot;/g, '"').replace(/&#xB7;/g, "·").replace(/\s+/g, " ");
const countIn = (hay, needle) => { let n = 0, i = 0; for (;;) { const j = hay.indexOf(needle, i); if (j < 0) break; n++; i = j + 1; } return n; };

let sameTab = 0, twoTabs = 0, rendered = 0;
for (const raw of sample) {
  let route;
  try { route = dbRouteToCamel(raw); } catch (e) { console.log(`  ${raw.id}: dbRouteToCamel threw — ${String(e.message).slice(0, 80)}`); continue; }
  route.mountainId = route.mountainId || "probe_area";
  route._dbArea = route._dbArea || { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" };
  /* WHICH COLUMN a repeated value came from decides the repair, so it is tracked rather than
     discarded. ONE column reaching the screen twice is a UI defect — a section rendered in two
     places. TWO columns holding the same string is a DATA defect, and the fix is in the catalog,
     not the renderer. A first version collapsed the values into a Set and could not tell them
     apart, which would have sent every finding to the wrong half of the codebase. */
  const byVal = new Map();
  for (const [col, v] of Object.entries(raw)) {
    if (HEADER_COLS.has(col)) continue;
    for (const [t] of leaves(v, col)) {
      const k = t.slice(0, 60);
      if (!byVal.has(k)) byVal.set(k, { text: t, cols: new Set() });
      byVal.get(k).cols.add(col);
    }
  }
  /* CONTAINMENT IS NOT DUPLICATION, and the first run reported it as such. Matching a 60-char
     PREFIX finds that prefix wherever it appears — including inside a LONGER stored value. On
     wa_action_potential, `access.land_manager` is "Okanogan-Wenatchee National Forest (Methow
     Valley Ranger District)" and `access.notes` opens "…this corridor is entirely Okanogan-
     Wenatchee National Forest (Methow Valley Ranger District)…", so the shorter value was
     reported as printed twice when the page shows two different sentences, correctly, under two
     different labels. A whole GROUP of findings was that artifact.
     So a candidate is dropped when some OTHER stored value contains it: the repeat then belongs
     to the longer value, and this measures section duplication rather than English. */
  for (const [key, info] of [...byVal]) {
    for (const [otherKey, other] of byVal) {
      if (otherKey === key) continue;
      if (other.text.includes(info.text)) { byVal.delete(key); break; }
    }
  }
  const perTab = {};
  let threw = false;
  for (const tab of TABS) {
    try {
      perTab[tab] = textOf(renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
        React.createElement(RouteDetail, {
          route, initialSubTab: tab, onBack: noop, onSubTab: noop,
          contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {},
          gearEdits: {}, diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null,
        }))));
    } catch (e) { console.log(`  ${route.id} [${tab}]: threw — ${String(e.message).slice(0, 90)}`); threw = true; break; }
  }
  if (threw) continue;
  rendered++;
  for (const [key, info] of byVal) {
    const tabsWith = TABS.filter((t) => perTab[t].includes(key));
    const worst = Math.max(...TABS.map((t) => countIn(perTab[t], key)));
    const cols = [...info.cols];
    const where = cols.length > 1 ? `DATA: ${cols.join("+")}` : `UI: ${cols[0]}`;
    if (worst > 1) {
      sameTab++;
      const t = TABS.find((x) => countIn(perTab[x], key) === worst);
      console.log(`  SAME TAB x${worst}  ${route.id} [${t}]  ${where}  ${JSON.stringify(info.text.slice(0, 80))}`);
    } else if (tabsWith.length > 1) {
      twoTabs++;
      console.log(`  TWO TABS        ${route.id} [${tabsWith.join(",")}]  ${where}  ${JSON.stringify(info.text.slice(0, 80))}`);
    }
  }
}

if (!rendered) { console.log("BROKEN PROBE: nothing rendered — the counts below would be about no page at all"); process.exit(1); }
console.log(`\n${rendered} route(s) rendered across ${TABS.length} sub-tabs.`);
console.log(`  a stored value printed TWICE on ONE tab: ${sameTab}`);
console.log(`  a stored value printed on TWO tabs:      ${twoTabs}`);
console.log("\nCANDIDATES, NOT DEFECTS. Some repetition is correct — a grade belongs in the header");
console.log("strap and in the grades panel, and `hazards` is deliberately merged from three columns.");
console.log("Read each with its surroundings before changing anything.");
