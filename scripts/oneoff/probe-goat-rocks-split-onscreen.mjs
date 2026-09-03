// A WRITTEN COLUMN IS NOT A RENDERED ONE. fix-goat-rocks-st-helens-camp-split.mjs verified its own
// write by re-reading `routes.bivy`; that proves the table, not the page. CAMPING & BIVY renders
// through dbRouteToCamel -> campSites(), which MERGES the bivy store with campsite waypoints and
// dedupes on name — so a removed entry could still reach the screen from the other store, and the
// repair would read as applied while the climber still sees a camp 59 km away.
//
// Renders the real RouteDetail over the real rows and asserts BOTH directions: the foreign camps
// are gone, and the mountain's own camps survived. Asserting only the removal would go green on a
// repair that emptied the section.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const H = headers(anonKey());
const q = async (p) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
  return r.json();
};

const CASES = [
  { route: "wa_mount_st_helens_monitor_ridge", gone: ["Snowgrass Flat", "Goat Lake", "Chambers Lake", "Conrad Meadows"], keeps: ["Climbers Bivouac", "Marble Mountain"] },
  { route: "wa_old_snowy_mountain_r1", gone: ["Climbers Bivouac", "Marble Mountain"], keeps: ["Snowgrass Flat", "Goat Lake", "Chambers Lake", "Conrad Meadows"] },
  { route: "wa_gilbert_peak_west_route", gone: ["Climbers Bivouac", "Marble Mountain"], keeps: ["Snowgrass Flat", "Goat Lake"] },
];
const rows = await q(`routes?select=*&id=in.(${CASES.map((c) => `"${c.route}"`).join(",")})`);
if (rows.length !== CASES.length) { console.log(`FAIL: read ${rows.length} of ${CASES.length} routes`); process.exit(1); }

const out = path.join(ROOT, ".probe-goat-rocks.mjs");
const html = path.join(ROOT, ".probe-goat-rocks.html");
fs.writeFileSync(out, [
  'import fs from "fs";',
  'import React from "react";',
  'import { renderToStaticMarkup } from "react-dom/server";',
  'import { QueryClient, QueryClientProvider } from "@tanstack/react-query";',
  `import RouteDetail from ${JSON.stringify(ROOT + "/RouteDetail.jsx")};`,
  `import { dbRouteToCamel } from ${JSON.stringify(ROOT + "/lib/db.js")};`,
  `const rows = ${JSON.stringify(rows)};`,
  'const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });',
  'const parts = [];',
  'for (const raw of rows) {',
  '  const route = dbRouteToCamel(raw);',
  '  const m = renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },',
  '    React.createElement(RouteDetail, {',
  '      route, initialSubTab: "planner", onBack(){}, onSubTab(){},',
  '      contribs: [], myReports: [], connections: [], comments: {},',
  '      hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},',
  '      crewsForRoute: [], myStars: {}, presence: null,',
  '    })));',
  '  parts.push("<<<" + raw.id + ">>>" + m);',
  '}',
  `fs.writeFileSync(${JSON.stringify(html)}, parts.join(""));`,
  'process.exit(0);',
].join("\n"));

execFileSync("npx", ["esbuild", out, "--bundle", "--platform=node", "--format=esm",
  "--jsx=automatic", "--loader:.jsx=jsx", "--external:react", "--external:react-dom",
  "--external:@tanstack/react-query", "--define:import.meta.env={}",
  `--outfile=${path.join(ROOT, ".probe-goat-rocks.bundle.mjs")}`], { cwd: ROOT, stdio: "pipe" });
execFileSync("node", [path.join(ROOT, ".probe-goat-rocks.bundle.mjs")], { cwd: ROOT, stdio: "pipe" });

const markup = fs.readFileSync(html, "utf8");
let fail = 0, checks = 0;
for (const c of CASES) {
  const i = markup.indexOf("<<<" + c.route + ">>>");
  if (i < 0) { console.log(`FAIL: ${c.route} never rendered`); fail++; continue; }
  let end = markup.indexOf("<<<", i + 3);
  const page = markup.slice(i, end < 0 ? undefined : end);
  // Scope to the CAMPING panel. Counting across the tab reports the APPROACH prose, which
  // legitimately names these places — the mistake check:camping's own header records three times.
  const h = page.indexOf("CAMPING &amp; BIVY");
  if (h < 0) { console.log(`FAIL: ${c.route} rendered no CAMPING & BIVY panel`); fail++; continue; }
  // End the panel at the ROUTE TRACK HEADING, matched in RAW html as ">ROUTE TRACK<".
  // The stripped text is unusable: this panel's own intro prose ends "...is also a pin
  // under ROUTE TRACK.", so a plain-text anchor terminates the slice INSIDE the panel and
  // cuts it to ~667 chars before any camp renders — a route with no campsite waypoint never
  // shows that sentence, so the bug hides until one does. check:track-caveat records the
  // same two-surfaces trap from the other side.
  const nx = page.indexOf(">ROUTE TRACK<", h);
  const panel = page.slice(h, nx < 0 ? h + 12000 : nx);
  if (panel.length < 200) { console.log(`FAIL: ${c.route} camping panel is only ${panel.length} chars — a thin render proves nothing`); fail++; continue; }
  for (const g of c.gone) { checks++; if (panel.includes(g)) { console.log(`FAIL ${c.route}: removed camp "${g}" STILL renders`); fail++; } }
  for (const k of c.keeps) { checks++; if (!panel.includes(k)) { console.log(`FAIL ${c.route}: kept camp "${k}" does NOT render`); fail++; } }
  console.log(`   ${c.route}: panel ${panel.length} chars, ${c.gone.length} removed absent, ${c.keeps.length} kept present`);
}
for (const f of [out, html, path.join(ROOT, ".probe-goat-rocks.bundle.mjs")]) { try { fs.unlinkSync(f); } catch {} }
console.log(fail ? `\nFAIL: ${fail} assertion(s) of ${checks}` : `\nok — ${checks} assertions across ${CASES.length} routes; the split reaches the screen in both directions`);
process.exit(fail ? 1 : 0);
