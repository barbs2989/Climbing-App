// Render SummitBriefing over REAL rows for two real peaks and assert what it says.
//
// Two peaks on purpose, because they exercise opposite branches of the one rule the panel
// is built on: Mount Baker's nine routes all carry the identical permit string (agreed ->
// state it), Mount Stuart's do not (Teanaway-side vs Enchantments-side -> refuse to name
// one). A probe run against only Baker would pass with the disagreement branch deleted.
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";

const h = headers(requireServiceKey());
async function routesFor(areaId) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&area_id=eq.${areaId}`, { headers: h });
  return r.json();
}

// Bundled the way scripts/check-bare-route.mjs does it, and each part of that is load-bearing:
//
//  * to a TEMP dir, inlining every dependency. Writing the bundle inside the repo instead —
//    the obvious way to let node find react — drops an esbuild artifact into the tree that
//    contains an inlined copy of `gradeNumFrom`, and `check:grade-parser` then fails the
//    BUILD with "grade_num is parsed in more than one place". Measured, not predicted: that
//    is exactly how the first run of this probe broke the build.
//  * through `stdin` with an explicit `resolveDir`, because esbuild resolves imports
//    relative to the ENTRY's directory — an entry file written into the temp dir cannot
//    find react at all. `resolveDir` points module resolution back at the repo.
const dir = mkdtempSync(join(tmpdir(), "briefing-"));
const ENTRY = `
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { SummitBriefing } from ${JSON.stringify(join(process.cwd(), "lib/DbAreaBrowser.jsx"))};
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
// Defining it empty leaves USE_DB off, which is right: this probe hands the component its
// rows directly and must not touch the network from inside the bundle.
await build({ stdin: { contents: ENTRY, resolveDir: process.cwd(), loader: "js" }, bundle: true, format: "cjs", outfile, platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" }, logLevel: "error" });
const { render } = createRequire(import.meta.url)(outfile);

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? "  ok   " : "  FAIL ") + msg); if (!cond) fails++; };

// ── Mount Baker: nine mountaineering routes, one permit string on all of them ──
const baker = await routesFor("wa_mount_baker");
const bakerHtml = render({ id: "wa_mount_baker", name: "Mount Baker", area_type: "peak", elevation_ft: 10781 }, baker);
console.log(`\nMount Baker — ${baker.length} routes`);
ok(bakerHtml.includes("ACROSS EVERY ROUTE HERE"), "the panel renders at all");
ok(/Ways up/.test(bakerHtml) && bakerHtml.includes(baker.length + " routes"), "counts the ways up");
ok(bakerHtml.includes("mountaineering"), "names the discipline");
ok(/Approach/.test(bakerHtml), "gives an approach range");
ok(bakerHtml.includes("Shortest is"), "names the shortest route rather than averaging");
ok(/Elevation gain/.test(bakerHtml), "gives a gain range");
// The permit is identical on all nine, so the panel must STATE it, not hedge.
ok(bakerHtml.includes("Free self-issue Mount Baker Wilderness permit"), "states the shared permit verbatim");
// Baker's nine routes state the manager and the pass in two spellings each ("NW Forest
// Pass" / "Northwest Forest Pass"). None of that is a conflict, so nothing here may hedge.
ok(!bakerHtml.includes("Differs by route"), "does NOT hedge where the routes only differ in WORDING");
ok(bakerHtml.includes("Mount Baker-Snoqualmie"), "shows the MORE SPECIFIC of two agreeing land-manager strings");
ok(/Northwest Forest Pass|NW Forest Pass/.test(bakerHtml), "shows the parking pass");
ok(bakerHtml.includes("Confirm current permits and closures"), "carries the land-manager caveat");

// ── Mount Stuart: fourteen routes, TWO different permit regimes ──
const stuart = await routesFor("wa_mount_stuart");
const stuartHtml = render({ id: "wa_mount_stuart", name: "Mount Stuart", area_type: "peak", elevation_ft: 9415 }, stuart);
const permits = new Set(stuart.map(r => r.permit).filter(Boolean));
console.log(`\nMount Stuart — ${stuart.length} routes, ${permits.size} distinct permit strings`);
ok(permits.size > 1, "fixture really does disagree (else the next assertion is vacuous)");
ok(stuartHtml.includes("Differs by route"), "refuses to name one permit when the routes disagree");
for (const p of permits) ok(!stuartHtml.includes(p.slice(0, 60)), "does not print permit text: " + p.slice(0, 42) + "…");
ok(/Rock difficulty/.test(stuartHtml), "gives a rock-grade span (14 routes, most carry rock_grade)");
// grade_num would rank a Roman commitment grade on the same scale as class; rock_grade must not.
ok(!/Class 2 to Class 4/.test(bakerHtml), "does not render a grade span off the conflated grade_num column");

// ── A sport crag must get nothing: not its question ──
const cragHtml = render({ id: "x", name: "Some Crag", area_type: "crag" },
  [{ discipline: "sport", name: "A", dist_km: 1 }, { discipline: "sport", name: "B", dist_km: 2 }, { discipline: "bouldering", name: "C" }]);
console.log("\nSport crag");
ok(cragHtml === "", "renders nothing for a non-alpine area");

// ── A single-route peak must get nothing: it would only restate the one row below it ──
const soloHtml = render({ id: "y", name: "Solo Peak", area_type: "peak" }, [baker[0]]);
ok(soloHtml === "", "renders nothing for a one-route peak");

console.log(fails ? `\n${fails} FAILED` : "\nall assertions passed");
process.exit(fails ? 1 : 0);
