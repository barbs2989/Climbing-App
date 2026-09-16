#!/usr/bin/env node
/* THE PLAN TAB PRINTED TWO DIFFERENT "ONE WAY" APPROACHES FOR ONE CLIMB.
 *
 * TrailheadCard's tile is LABELLED "Approach (one way)" and read `route.distKm` raw, while the
 * TECH STATS tile on the same route reads `effDistKm(route)` -- the route's own itinerary,
 * halved unless the trip is recorded as a loop or point-to-point. CLAUDE.md records that
 * `dist_km` holds TWO CONVENTIONS AT ONCE, so on a row storing the ROUND TRIP the raw read
 * labelled a there-and-back total as a one-way walk.
 *
 * Measured (scripts/oneoff/measure-planner-distance-vs-the-tile.mjs): of 790 WA routes carrying
 * both figures, 335 differ by more than 15% and on 215 of those the stored column is the larger.
 *
 * RENDERS THE REAL RouteDetail over REAL ROWS rather than reading the source: dbRouteToCamel and
 * the card's own gating sit between the column and the screen, and either could make a
 * correct-looking fix reach nothing.
 *
 * NON-VACUITY IS THE LOAD-BEARING HALF. A probe that only asserts "the tile shows effDistKm" is
 * satisfied by a tile that shows nothing at all, and by a row where the two figures happen to be
 * equal. So each fixture must (a) actually render the card, and (b) have two figures that DIFFER
 * -- both asserted before the tile is judged.
 *
 * WHICH FIGURE IS TRUE IS NOT SETTLED HERE and must not be: this changes only which SOURCE a
 * reader prefers, which is lib/outing.js's own stated contract.
 */
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
import { effDistKm } from "../../lib/outing.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);

/* The largest movers the measurement reports, plus one recorded `point` shape -- where effDistKm
   does NOT halve, so a "fix" that always halved would fail here. */
const WANT = [
  "wa_mount_queets_south",
  "wa_blizzard_peak_standard",
  "wa_goode_mountain_southwest_couloir",
  "wa_mount_ferry_standard",
];
const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=in.(${WANT.join(",")})`, { headers: headers(anonKey()) });
if (!res.ok) { console.log(`FAIL: read failed (${res.status})`); process.exit(1); }
const rows = await res.json();
if (rows.length < 2) { console.log(`FAIL: read ${rows.length} routes -- refusing to report a clean result`); process.exit(1); }

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: "planner", onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-appway-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

// renderToStaticMarkup ESCAPES -- un-escape before matching. [[ssr-probes-must-match-escaped-html]]
const strip = h => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
  .replace(/\s+/g, " ").trim();
const camel = r => { const o = { ...r }; for (const [k, v] of Object.entries(r)) o[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v; return o; };
// The app's own imperial formatting, so the string compared is the string rendered.
const mi = km => (km * 0.621371).toFixed(1) + " mi";

let pass = 0, fail = 0, judged = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ok    ${m}`); } else { fail++; console.log(`  FAIL  ${m}`); } };

for (const r of rows) {
  const route = Object.assign(camel(r), { mountainId: r.area_id, _dbArea: { id: r.area_id, name: "Probe", areaType: "peak", region: "Washington" } });
  const rawKm = route.distKm, effKm = effDistKm(route);
  console.log(`\n${r.id}`);
  if (rawKm == null || effKm == null) { console.log("   SKIP -- one of the two figures is absent"); continue; }

  // NON-VACUITY (a): the two figures must genuinely differ, or every assertion below is trivially
  // satisfied and a reverted fix would still pass.
  if (mi(rawKm) === mi(effKm)) { console.log(`   SKIP -- both figures render as ${mi(effKm)}, so this row cannot discriminate`); continue; }

  const text = strip(render(route));
  // SCOPE TO THE CARD, never the tab: the Plan tab prints other distances (TECH STATS, the
  // approach prose), so a tab-wide match reads one tile's number as another's. The rule
  // check:camping records three times over.
  const h = text.indexOf("TRAILHEAD");
  if (h < 0) { console.log("   ANCHOR LOST -- no TRAILHEAD heading; the card did not render, so nothing below was checked"); fail++; continue; }
  const after = text.slice(h + "TRAILHEAD".length);
  const nextHead = after.search(/\b[A-Z][A-Z][A-Z &’'-]{4,}\b/);
  const card = nextHead > 0 ? after.slice(0, nextHead) : after.slice(0, 600);

  // NON-VACUITY (b): the tile must be on screen at all, or "does not show the raw figure" passes
  // against a card that renders no approach.
  if (!/Approach \(one way\)/.test(card)) { console.log("   SKIP -- this row renders no Approach tile"); continue; }

  judged++;
  console.log(`   itinerary-derived ${mi(effKm)}   stored column ${mi(rawKm)}`);
  ok(card.includes(mi(effKm)), `the tile states the itinerary-derived one-way figure (${mi(effKm)})`);
  ok(!card.includes(mi(rawKm)), `the tile does NOT state the stored round-trip figure (${mi(rawKm)})`);
}

console.log(`\n${judged} route(s) judged, ${pass} passed, ${fail} failed`);
if (!judged) { console.log("FAIL: no row could discriminate -- this run proved nothing."); process.exit(1); }
process.exit(fail ? 1 : 0);
