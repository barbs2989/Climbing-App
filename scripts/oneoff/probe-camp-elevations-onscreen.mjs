// A WRITTEN COLUMN IS NOT A RENDERED ONE. The elevation fills verified themselves by re-reading
// `routes.bivy`; that proves the table, not the page. CAMPING & BIVY renders through
// dbRouteToCamel -> campSites(), which MERGES the bivy store with campsite waypoints and dedupes on
// NAME — so a filled elevation could still be shadowed by the other store's copy of the same camp.
//
// Asserts the number reaches the panel AND the camp name with it: a bare number search would be
// satisfied by an elevation matching by coincidence elsewhere on the tab. Scoped to the panel,
// never the tab, since approach prose legitimately quotes elevations.
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

// One case per peak, each asserting BOTH directions. The keeps matter more than the gone: a
// repair that emptied the section would satisfy every removal assertion.
const CASES = [
  // Skagit Queen: the waypoint stated 4,000 ft at ground of 3,089, and both stores must agree now.
  { route: "wa_storm_king_southwest_scramble", gone: ["4,000 ft"], keeps: ["Skagit Queen", "3,093"] },
  { route: "wa_booker_mountain_south_ridge", gone: [], keeps: ["Five Mile Camp", "3,921"] },
  { route: "wa_swiss_peak_standard_route", gone: [], keeps: ["Luna Camp", "2,432"] },
  { route: "wa_spider_mountain_north_face", gone: [], keeps: ["Spider-Formidable Col", "7,320"] },
];
const rows = await q(`routes?select=*&id=in.(${CASES.map((c) => `"${c.route}"`).join(",")})`);
if (rows.length !== CASES.length) { console.log(`FAIL: read ${rows.length} of ${CASES.length} routes`); process.exit(1); }

const out = path.join(ROOT, ".probe-camp-elev.mjs");
const html = path.join(ROOT, ".probe-camp-elev.html");
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
  `--outfile=${path.join(ROOT, ".probe-camp-elev.bundle.mjs")}`], { cwd: ROOT, stdio: "pipe" });
execFileSync("node", [path.join(ROOT, ".probe-camp-elev.bundle.mjs")], { cwd: ROOT, stdio: "pipe" });

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
for (const f of [out, html, path.join(ROOT, ".probe-camp-elev.bundle.mjs")]) { try { fs.unlinkSync(f); } catch {} }
console.log(fail ? `\nFAIL: ${fail} assertion(s) of ${checks}` : `\nok — ${checks} assertions across ${CASES.length} routes; every filled elevation reaches the camping panel with its own camp`);
process.exit(fail ? 1 : 0);
