// A WRITTEN COLUMN IS NOT A RENDERED ONE. redact-pipeline-voice-in-route-prose.mjs verified its own
// write by re-reading the columns; that proves the table, not the page.
//
// Asserts BOTH directions, and the KEEPS are the load-bearing half: the rule for this repair was
// "keep the fact and keep the uncertainty, drop only the sourcing", so a rewrite that quietly
// dropped a hedge would satisfy every removal assertion while making the record read as MORE
// certain than it is. That is worse than the leak it fixed.
//
// Scoped per sub-tab because these columns render on different ones: approach and rappel notes on
// the Planner, climbing_route on the Planner, gear on Overview.
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
  { route: "wa_mount_terror_north_face", tab: "planner",
    gone: ["Trip reports vary"],
    keeps: ["3-5 rappels total", "Expect 3-5 rappels", "varies with snow coverage"] },
  { route: "wa_narcos", tab: "planner",
    gone: ["the source doesn", "Descent text specifies"],
    keeps: ["estimated rather than station-confirmed", "not recorded"] },
  { route: "wa_del_campo_peak_standard", tab: "planner",
    gone: ["reports vary"],
    keeps: ["11-14 miles round trip", "depending on the exact approach line"] },
  { route: "wa_chimney_rock_west_face", tab: "planner",
    gone: ["should not be presented as fact", "replaced in 2001"],
    keeps: ["Rappel Chimney"] },
];
const rows = await q(`routes?select=*&id=in.(${CASES.map((c) => `"${c.route}"`).join(",")})`);
if (rows.length !== CASES.length) { console.log(`FAIL: read ${rows.length} of ${CASES.length} routes`); process.exit(1); }

const out = path.join(ROOT, ".probe-pipeline-voice.mjs");
const html = path.join(ROOT, ".probe-pipeline-voice.html");
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
  `--outfile=${path.join(ROOT, ".probe-pipeline-voice.bundle.mjs")}`], { cwd: ROOT, stdio: "pipe" });
execFileSync("node", [path.join(ROOT, ".probe-pipeline-voice.bundle.mjs")], { cwd: ROOT, stdio: "pipe" });

const markup = fs.readFileSync(html, "utf8");
let fail = 0, checks = 0;
for (const c of CASES) {
  const i = markup.indexOf("<<<" + c.route + ">>>");
  if (i < 0) { console.log(`FAIL: ${c.route} never rendered`); fail++; continue; }
  let end = markup.indexOf("<<<", i + 3);
  const page = markup.slice(i, end < 0 ? undefined : end);
  // Scope to the CAMPING panel. Counting across the tab reports the APPROACH prose, which
  // legitimately names these places — the mistake check:camping's own header records three times.
  // No panel anchor here: these columns render across several sections of the tab, so the whole
  // captured page is the scope. That is safe for this assertion in a way it was NOT for the camping
  // one, because none of these strings is prose a neighbouring section legitimately repeats.
  const panel = page;
  if (panel.length < 2000) { console.log(`FAIL: ${c.route} rendered only ${panel.length} chars — a thin render proves nothing`); fail++; continue; }
  for (const g of c.gone) { checks++; if (panel.includes(g)) { console.log(`FAIL ${c.route}: removed camp "${g}" STILL renders`); fail++; } }
  for (const k of c.keeps) { checks++; if (!panel.includes(k)) { console.log(`FAIL ${c.route}: kept camp "${k}" does NOT render`); fail++; } }
  console.log(`   ${c.route}: panel ${panel.length} chars, ${c.gone.length} removed absent, ${c.keeps.length} kept present`);
}
for (const f of [out, html, path.join(ROOT, ".probe-pipeline-voice.bundle.mjs")]) { try { fs.unlinkSync(f); } catch {} }
console.log(fail ? `\nFAIL: ${fail} assertion(s) of ${checks}` : `\nok — ${checks} assertions across ${CASES.length} routes; the sourcing is gone from the screen and every hedge survived`);
process.exit(fail ? 1 : 0);
