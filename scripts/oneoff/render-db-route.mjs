#!/usr/bin/env node
// Render a REAL DB route through the real RouteDetail, and report which sub-tabs the
// tab strip offers + which discipline catOf() lands on.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";

const ROOT = "/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/rappels-rack-filter-class-audit";
const require_ = createRequire(import.meta.url);
const { SUPABASE_URL, anonKey, headers } = await import(path.join(ROOT, "scripts/lib/supabase-env.mjs"));

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
import { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};
import { catOf } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export { dbRouteToCamel, catOf };
export function render(route, tab) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: tab, onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-probe-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render, dbRouteToCamel, catOf } = require_(out);

const key = anonKey();
const id = process.argv[2] || "wa_black_peak_east_buttress";
const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*,areas(name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,parent:parent_id(name))&id=eq.${id}`, { headers: headers(key) });
const [row] = JSON.parse(await res.text());
if (!row) { console.log("no such route"); process.exit(1); }
const route = dbRouteToCamel(row);
console.log("id:", route.id, "| discipline:", route.discipline, "| style:", route.style, "| catOf:", catOf(route));
console.log("grade:", JSON.stringify(route.grade), "| gradeSystem:", route.gradeSystem, "| rockGrade:", JSON.stringify(route.rockGrade), "| alpineGrade:", route.alpineGrade);

const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, "\n").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g,'"').split("\n").map(s=>s.trim()).filter(Boolean);

for (const tab of ["overview", "planner", "safety"]) {
  let html;
  try { html = render(route, tab); } catch (e) { console.log(`\n--- ${tab}: THREW ${e.message}`); continue; }
  const t = text(html);
  console.log(`\n=== TAB ${tab} === (${t.length} text nodes)`);
  console.log(t.join(" | ").slice(0, 40000));
}
