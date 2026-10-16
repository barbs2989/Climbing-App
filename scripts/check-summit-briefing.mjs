#!/usr/bin/env node
// check:summit-briefing — the peak page's ACROSS EVERY ROUTE HERE panel says only what its
// routes agree on, and does not withhold what they do.
//
// `SummitBriefing` (lib/DbAreaBrowser.jsx) is the summary above the route list on an area
// page: how many ways up, the rock-grade span, and the approach and gain ranges. It used to
// end with a Permit / Land manager / Parking "Access & permits" block; the owner had that
// removed from the peak overview on 2026-10-04, so this now asserts it STAYS GONE — on Mount
// Baker, whose routes all agree on those facts and so would be the first to bring it back.
//
// WHY THIS IS A GUARD AND NOT THE PROBE IT REPLACES. It shipped in #943 as
// scripts/oneoff/probe-summit-briefing.mjs, and nothing runs scripts/oneoff/. Measured
// 2026-09-09, it was RED on main and had been for an unknown length of time: two of its
// twenty assertions failed, and both were real — Mount Baker's peak page had stopped naming
// its land manager and its parking pass. Nothing about the app looked wrong, because the
// panel's refusal is a legitimate state that renders perfectly. `a verification nobody runs
// is not a verification`, on a surface whose whole contract is when to speak and when not to.
//
// It reads the live catalog, so it is NOT a build gate — the reasoning that keeps
// check:counts out. It runs on every PR and every push to main via render-guards.yml, on
// the ANON key: `routes` is publicly readable and CI has no business holding a key that
// bypasses RLS, the same stance check:field-renders takes one job over.
//
// THREE REAL PEAKS. Baker for the panel's basic rows and the access block's absence; Stuart
// for the rock-grade span; Adams for the approach range, whose two readings are furthest apart.
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { SUPABASE_URL, headers, anonKey } from "./lib/supabase-env.mjs";
import { effDistKm } from "../lib/outing.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const dead = (what) => {
  console.error(`\ncheck:summit-briefing FAILED — ${what}.`);
  console.error("Nothing below was checked. Most of what this asserts is an ABSENCE, and every");
  console.error("such assertion passes against a component that rendered nothing at all.\n");
  process.exit(1);
};

const h = headers(anonKey());
async function routesFor(areaId) {
  let res;
  try { res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&area_id=eq.${areaId}`, { headers: h }); }
  catch (e) { dead(`the catalog is unreachable (${e.message}) — a failed read is not a clean panel`); }
  if (!res.ok) dead(`reading ${areaId} returned ${res.status} ${(await res.text()).slice(0, 160)}`);
  return res.json();
}

// Bundled the way scripts/check-bare-route.mjs does it, and each part of that is load-bearing:
//
//  * to a TEMP dir, inlining every dependency. Writing the bundle inside the repo instead —
//    the obvious way to let node find react — drops an esbuild artifact into the tree that
//    contains an inlined copy of `gradeNumFrom`, and `check:grade-parser` then fails the
//    BUILD with "grade_num is parsed in more than one place". Measured, not predicted: that
//    is exactly how the first run of this broke the build.
//  * through `stdin` with an explicit `resolveDir`, because esbuild resolves imports
//    relative to the ENTRY's directory — an entry file written into the temp dir cannot
//    find react at all. `resolveDir` points module resolution back at the repo.
const dir = mkdtempSync(join(tmpdir(), "briefing-"));
const ENTRY = `
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { SummitBriefing } from ${JSON.stringify(join(ROOT, "lib/DbAreaBrowser.jsx"))};
export function render(area, routes) {
  const C = new Proxy({}, { get: (_, k) => "#123456" });
  return renderToStaticMarkup(React.createElement(SummitBriefing, {
    area, routes, C,
    uElev: ft => Math.round(ft).toLocaleString() + " ft",
    uDistMi: mi => (Math.round(mi * 100) / 100) + " mi",
  }));
}
`;
// CJS, not ESM: react-dom/server is CommonJS and reaches for `require("stream")`, which an
// ESM bundle turns into a "Dynamic require of stream is not supported" throw at import time.
const outfile = join(dir, "bundle.cjs");
// `import.meta.env` is Vite's, and pulling in DbAreaBrowser drags lib/supabase.js with it.
// Defining it empty leaves USE_DB off, which is right: this hands the component its rows
// directly and must not touch the network from inside the bundle.
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs", outfile, platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" }, logLevel: "error" });
const { render } = createRequire(import.meta.url)(outfile);

let fails = 0, ran = 0;
const ok = (cond, msg) => { ran++; console.log((cond ? "  ok   " : "  FAIL ") + msg); if (!cond) fails++; };
// One labelled row, so an assertion is scoped to the row it is about rather than the panel.
function row(html, label) {
  const i = html.indexOf(">" + label + "<");
  if (i < 0) return null;
  const j = html.indexOf("</div></div>", i);
  return j < 0 ? html.slice(i) : html.slice(i, j);
}

// ── Mount Baker: nine routes, ONE agency written four ways ────────────────────────────────
const baker = await routesFor("wa_mount_baker");
if (baker.length < 5) dead(`wa_mount_baker returned ${baker.length} routes — the fixture is not the peak this asserts about`);
const bakerHtml = render({ id: "wa_mount_baker", name: "Mount Baker", area_type: "peak", elevation_ft: 10781 }, baker);
if (bakerHtml.length < 400) dead(`the Mount Baker panel rendered ${bakerHtml.length} characters — every assertion below would pass vacuously`);
console.log(`\nMount Baker — ${baker.length} routes`);
ok(bakerHtml.includes("ACROSS EVERY ROUTE HERE"), "the panel renders at all");
ok(/Ways up/.test(bakerHtml) && bakerHtml.includes(baker.length + " routes"), "counts the ways up");
ok(bakerHtml.includes("mountaineering"), "names the discipline");
ok(/Approach/.test(bakerHtml), "gives an approach range");
ok(bakerHtml.includes("Shortest is"), "names the shortest route rather than averaging");
ok(/Elevation gain/.test(bakerHtml), "gives a gain range");
// The Access & permits block was removed by the owner. Baker's routes all agree on permit,
// land manager and parking pass, so this is the peak where a revert would show first.
ok(!/Access &(?:amp;)? permits/i.test(bakerHtml), "has NO Access & permits block");
for (const label of ["Permit", "Land manager", "Parking / entrance"]) ok(!row(bakerHtml, label), `has no ${label} row`);
ok(!bakerHtml.includes("Confirm current permits and closures"), "has no land-manager caveat either");

// ── Mount Stuart: fourteen routes, TWO permit regimes ─────────────────────────────────────
const stuart = await routesFor("wa_mount_stuart");
if (stuart.length < 5) dead(`wa_mount_stuart returned ${stuart.length} routes`);
const stuartHtml = render({ id: "wa_mount_stuart", name: "Mount Stuart", area_type: "peak", elevation_ft: 9415 }, stuart);
console.log(`\nMount Stuart — ${stuart.length} routes`);
ok(/Rock difficulty/.test(stuartHtml), "gives a rock-grade span (14 routes, most carry rock_grade)");
// grade_num would rank a Roman commitment grade on the same scale as class; rock_grade must not.
ok(!/Class 2 to Class 4/.test(bakerHtml), "does not render a grade span off the conflated grade_num column");

// ── Mount Adams: the approach range ───────────────────────────────────────────────────────
const adams = await routesFor("wa_mount_adams");
if (adams.length < 5) dead(`wa_mount_adams returned ${adams.length} routes`);
const adamsHtml = render({ id: "wa_mount_adams", name: "Mount Adams", area_type: "peak", elevation_ft: 12281 }, adams);
console.log(`\nMount Adams — ${adams.length} routes`);
/* THE APPROACH RANGE MUST BE THE ONE THE ROUTE PAGE SHOWS. This row read `dist_km` raw while
   RouteDetail has always preferred the route's own itinerary, so one climb had two approach
   distances depending on the screen — usually by a FACTOR OF TWO, because on those rows `dist_km`
   holds the round trip. Reverting it changes no identifier and every other assertion here stays
   green, which is why it is pinned: `audit:silent-reverts` says in its own closing caveat it
   cannot see a change of that shape. Mount Adams is the fixture because its two readings are
   furthest apart. */
const miOf = (km) => Math.round(km * 0.621371 * 100) / 100;
const span = (vals) => { const v = vals.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b); return v.length ? [v[0], v[v.length - 1]] : null; };
const rawSpan = span(adams.map((r) => Number(r.dist_km)));
const effSpan = span(adams.map((r) => Number(effDistKm(r))));
ok(!!rawSpan && !!effSpan && (miOf(rawSpan[0]) !== miOf(effSpan[0]) || miOf(rawSpan[1]) !== miOf(effSpan[1])),
   "fixture: the raw and effective approach ranges DIFFER (else the next two are vacuous)");
const adamsAp = row(adamsHtml, "Approach");
ok(!!adamsAp && adamsAp.includes(miOf(effSpan[1]) + " mi"),
   `the Approach row shows the route page's own distance (${miOf(effSpan[1])} mi)`);
ok(!!adamsAp && !adamsAp.includes(miOf(rawSpan[1]) + " mi"),
   `and NOT the raw dist_km column (${miOf(rawSpan[1])} mi)`);

// ── The gates: not every area gets this panel ─────────────────────────────────────────────
const cragHtml = render({ id: "x", name: "Some Crag", area_type: "crag" },
  [{ discipline: "sport", name: "A", dist_km: 1 }, { discipline: "sport", name: "B", dist_km: 2 }, { discipline: "bouldering", name: "C" }]);
console.log("\nGates");
ok(cragHtml === "", "renders nothing for a non-alpine area");
ok(render({ id: "y", name: "Solo Peak", area_type: "peak" }, [baker[0]]) === "", "renders nothing for a one-route peak");

// A guard that quietly stops asking half its questions still exits 0. Raise this when you
// add an assertion; never lower it to make a run pass.
if (ran < 17) dead(`only ${ran} assertions RAN — this guard has ${ran} of its questions left`);

console.log(fails ? `\n${fails} FAILED` : `\nall ${ran} assertions passed`);
process.exit(fails ? 1 : 0);
