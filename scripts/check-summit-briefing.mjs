#!/usr/bin/env node
// check:summit-briefing — the peak page's ACROSS EVERY ROUTE HERE panel says only what its
// routes agree on, and does not withhold what they do.
//
// `SummitBriefing` (lib/DbAreaBrowser.jsx) is the summary above the route list on an area
// page: how many ways up, the rock-grade span, the approach and gain ranges, and then a
// Permit / Land manager / Parking block. That block is the interesting half, because it is
// the part that must REFUSE: routes on one summit can genuinely need different permits —
// Mount Stuart's Teanaway-side approach never enters the Enchantment quota boundary its
// north-side routes do — and naming one of them there would be a wrong answer delivered
// with a mountain's authority.
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
// TWO REAL PEAKS AND TWO SYNTHETIC ONES, and each pair exercises a branch the other cannot.
// Baker's nine routes name one agency at four levels of specificity (state it); Stuart's
// fourteen carry two permit regimes (refuse); Adams' ten include Yakama Nation land, which
// is a different manager rather than a fuller description of one (refuse). The synthetic
// pair pins the ORDER-INSENSITIVITY that broke — a fact written agency-first and place-first
// is one fact — and its negative, so the rule cannot be widened until it agrees on anything.
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { SUPABASE_URL, headers, anonKey } from "./lib/supabase-env.mjs";

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
// The land-manager / permit / parking line for one label, so an assertion is scoped to the
// row it is about rather than to the whole panel — the panel says "Northwest Forest Pass"
// in more than one place, and a panel-wide match reads one row's copy as another's.
const HEDGE = "Differs by route";
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
// The permit is identical on all nine, so the panel must STATE it, not hedge.
ok(bakerHtml.includes("Free self-issue Mount Baker Wilderness permit"), "states the shared permit verbatim");
// The nine name one agency at four levels of detail — "U.S. Forest Service", "USDA Forest
// Service — Mount Baker-Snoqualmie National Forest, Mt. Baker NRA", and two leading with the
// forest instead of the agency. None of that is a conflict, so nothing here may hedge, and
// what shows must be the FULLEST of them rather than the bare agency name.
const bakerLm = row(bakerHtml, "Land manager");
ok(!!bakerLm, "renders a Land manager row at all");
ok(!!bakerLm && !bakerLm.includes(HEDGE), "does NOT hedge the land manager where the routes differ only in WORDING");
ok(!!bakerLm && /M(?:t\.|ount) Baker-Snoqualmie National Forest/.test(bakerLm) && /Wilderness/.test(bakerLm),
   "shows the MOST SPECIFIC of the agreeing land-manager strings, not the bare agency");
const bakerPp = row(bakerHtml, "Parking / entrance");
ok(!!bakerPp && !bakerPp.includes(HEDGE), "does NOT hedge the parking pass");
ok(!!bakerPp && /Northwest Forest Pass/.test(bakerPp), "shows the parking pass");
ok(bakerHtml.includes("Confirm current permits and closures"), "carries the land-manager caveat");

// ── Mount Stuart: fourteen routes, TWO permit regimes ─────────────────────────────────────
const stuart = await routesFor("wa_mount_stuart");
if (stuart.length < 5) dead(`wa_mount_stuart returned ${stuart.length} routes`);
const stuartHtml = render({ id: "wa_mount_stuart", name: "Mount Stuart", area_type: "peak", elevation_ft: 9415 }, stuart);
const permits = new Set(stuart.map(r => r.permit).filter(Boolean));
console.log(`\nMount Stuart — ${stuart.length} routes, ${permits.size} distinct permit strings`);
ok(permits.size > 1, "fixture really does disagree (else the next assertion is vacuous)");
const stuartPermit = row(stuartHtml, "Permit");
ok(!!stuartPermit && stuartPermit.includes(HEDGE), "refuses to name one permit when the routes disagree");
for (const p of permits) ok(!stuartHtml.includes(p.slice(0, 60)), "does not print permit text: " + p.slice(0, 42) + "…");
ok(/Rock difficulty/.test(stuartHtml), "gives a rock-grade span (14 routes, most carry rock_grade)");
// grade_num would rank a Roman commitment grade on the same scale as class; rock_grade must not.
ok(!/Class 2 to Class 4/.test(bakerHtml), "does not render a grade span off the conflated grade_num column");

// ── Mount Adams: a DIFFERENT manager, not a fuller description of one ─────────────────────
//
// This is the load-bearing negative for the containment rule. Baker proves the panel speaks
// where the routes only differ in wording; without a peak whose routes name genuinely
// different land, a rule that agreed on everything would pass Baker's half outright.
const adams = await routesFor("wa_mount_adams");
if (adams.length < 5) dead(`wa_mount_adams returned ${adams.length} routes`);
const adamsLmValues = new Set(adams.map(r => ((r.access && typeof r.access === "object") ? r.access : {}).land_manager || ((r.access && typeof r.access === "object") ? r.access : {}).landManager).filter(Boolean));
const adamsHtml = render({ id: "wa_mount_adams", name: "Mount Adams", area_type: "peak", elevation_ft: 12281 }, adams);
console.log(`\nMount Adams — ${adams.length} routes, ${adamsLmValues.size} distinct land managers`);
ok([...adamsLmValues].some(v => /Yakama/i.test(v)), "fixture really does carry Yakama Nation land (else the next assertion is vacuous)");
const adamsLm = row(adamsHtml, "Land manager");
ok(!!adamsLm && adamsLm.includes(HEDGE), "refuses to name one land manager where the routes name different LAND");
for (const v of adamsLmValues) if (/Yakama/i.test(v)) ok(!adamsHtml.includes(v.slice(0, 40)), "does not print a land-manager string: " + v.slice(0, 40));

// ── Synthetic: the same fact in two word ORDERS is one fact ───────────────────────────────
//
// The defect this guard was written after. A prefix test makes "U.S. Forest Service" and
// "Mt. Baker-Snoqualmie National Forest … (USFS)" read as a disagreement, purely because the
// second leads with the place. It is synthetic rather than a live peak because the live case
// is now FIXED, and a case that can only exist while the tree is unhealthy is not a case.
const mk = (lm) => ({ discipline: "mountaineering", name: "R" + Math.random(), dist_km: 5, gain_ft: 3000, access: { land_manager: lm } });
const orderHtml = render({ id: "z", name: "Order Peak", area_type: "peak" }, [
  mk("U.S. Forest Service"),
  mk("Gifford Pinchot National Forest — Mount Adams Wilderness (USFS)"),
]);
console.log("\nSynthetic — one agency, two word orders");
const orderLm = row(orderHtml, "Land manager");
ok(!!orderLm && !orderLm.includes(HEDGE), "one agency written agency-first and place-first is ONE fact");
ok(!!orderLm && /Gifford Pinchot/.test(orderLm), "and the fuller of the two is what shows");

// ── Synthetic: two genuinely different managers must still refuse ─────────────────────────
//
// Without this the rule above is satisfied by agreeing on everything, which is the direction
// that puts a wrong permit on a mountain's summary line.
const clashHtml = render({ id: "z2", name: "Clash Peak", area_type: "peak" }, [
  mk("Gifford Pinchot National Forest — Mount Adams Wilderness"),
  mk("Okanogan-Wenatchee National Forest — Pasayten Wilderness"),
]);
const clashLm = row(clashHtml, "Land manager");
console.log("\nSynthetic — two different forests");
ok(!!clashLm && clashLm.includes(HEDGE), "two different national forests are NOT one fact");

// ── The gates: not every area gets this panel ─────────────────────────────────────────────
const cragHtml = render({ id: "x", name: "Some Crag", area_type: "crag" },
  [{ discipline: "sport", name: "A", dist_km: 1 }, { discipline: "sport", name: "B", dist_km: 2 }, { discipline: "bouldering", name: "C" }]);
console.log("\nGates");
ok(cragHtml === "", "renders nothing for a non-alpine area");
ok(render({ id: "y", name: "Solo Peak", area_type: "peak" }, [baker[0]]) === "", "renders nothing for a one-route peak");

// A guard that quietly stops asking half its questions still exits 0. Raise this when you
// add an assertion; never lower it to make a run pass.
if (ran < 26) dead(`only ${ran} assertions RAN — this guard has ${ran} of its questions left`);

console.log(fails ? `\n${fails} FAILED` : `\nall ${ran} assertions passed`);
process.exit(fails ? 1 : 0);
