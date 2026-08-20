// 512 sites are live across 799 routes, but they have only ever been verified as DATA. This
// renders the real RouteDetail over REAL rows pulled from the live DB and reports what the
// CAMPING & BIVY panel actually looks like at length.
//
// The worry is specific: the northern Pickets now carry THIRTEEN sites on one route. A panel is
// a different thing at 13 entries than at 4, and no guard asks that question.
//
// Bundling follows check-camping-section.mjs exactly (stdin + resolveDir: ROOT), because an
// entry written into a tmpdir cannot resolve node_modules.
//
// renderToStaticMarkup ESCAPES & to &amp; — un-escape before matching or the heading reads as
// absent and a false NO looks like a real defect.
import { selectAll } from "../lib/supabase-env.mjs";
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import os from "os";

const require_ = createRequire(import.meta.url);
const ROOT = process.cwd();

const WANT = process.argv.slice(2).filter(a => !a.startsWith("--"));
const IDS = WANT.length ? WANT : [
  "wa_whatcom_peak_southwest_route",   // 13 sites — the longest panel in the catalog
  "wa_mount_rainier_ptarmigan_ridge",  // curated per-route, PLANNED / DESCENT labelling
  "wa_rimrock_ridge_scramble",         // the repaired row
  "wa_mount_stone_putvin",             // Olympics, mixed camp and bivy
];

const rows = await selectAll("routes", "*", `id=in.(${IDS.join(",")})`, { pageSize: 20 });
if (!rows.length) { console.log("FAIL: read no routes"); process.exit(1); }
console.log(`fetched ${rows.length} of ${IDS.length} requested\n`);

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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-camp-probe-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

const strip = html => html.replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const camel = r => { const o = { ...r }; for (const [k, v] of Object.entries(r)) o[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v; return o; };

for (const r of rows) {
  let html;
  try { html = render(Object.assign(camel(r), { mountainId: r.area_id, _dbArea: { id: r.area_id, name: "Probe", areaType: "peak", region: "Washington" } })); }
  catch (e) { console.log(`${r.id}: RENDER THREW — ${e.message}\n`); continue; }
  const text = strip(html);
  const i = text.indexOf("CAMPING & BIVY");
  if (i < 0) { console.log(`${r.id}: NO CAMPING & BIVY panel on the planner tab (discipline=${r.discipline})\n`); continue; }
  // The panel's OWN intro says "Anything marked on the track is also a pin under ROUTE TRACK",
  // so the first occurrence of that string sits INSIDE the panel, not after it. Cutting there
  // slices the panel at its own prose and every site reads as absent — which is exactly how a
  // perfectly healthy panel looked like total failure on this probe's first run. Start looking
  // for the real terminator past the intro.
  const end = text.indexOf("ROUTE TRACK", i + 400);
  const panel = text.slice(i, end > i ? end : text.length);
  const sites = (r.bivy || []).length;
  console.log(`${r.id}   [${r.discipline}]`);
  console.log(`   stored sites: ${sites}   panel: ${panel.length} chars   (whole tab: ${text.length})`);
  console.log(`   head: ${panel.slice(0, 260)}`);
  console.log(`   tail: ...${panel.slice(-200)}`);
  // Names should each appear once in the panel; a repeat is the dedupe failing at length.
  for (const s of (r.bivy || [])) {
    const n = s && s.name ? panel.split(s.name).length - 1 : 0;
    if (n !== 1) console.log(`   !! "${s && s.name}" appears ${n}x in the panel`);
  }
  console.log("");
}
fs.rmSync(path.dirname(out), { recursive: true, force: true });
