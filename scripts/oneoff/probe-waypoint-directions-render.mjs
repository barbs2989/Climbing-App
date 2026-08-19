// Does the written text actually REACH A SCREEN? Reader-exists plus data-exists is not
// renders. Pulls the real row from the live DB and renders the real RouteDetail.
// ROOT is THIS worktree deliberately — scripts/oneoff/render-db-route.mjs hardcodes a
// different one, which would measure another branch's code.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
const ROOT = "/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/pitch-beta-waypoints-audit";
const require_ = createRequire(import.meta.url);
const { SUPABASE_URL, anonKey, headers } = await import(path.join(ROOT, "scripts/lib/supabase-env.mjs"));
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
import { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export { dbRouteToCamel };
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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-wp-")), "bundle.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs",
  platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error" });
const { render, dbRouteToCamel } = require_(out);
const key = anonKey();

// One route from each wave: a DRIVE at index 0, and LEGS at index >=1.
const CASES = [
  ["wa_mount_stone_putvin", 0, "drive"],
  ["wa_monte_cristo_peak_scramble", 5, "leg"],
];
let fails = 0;
for (const [id, idx, kind] of CASES) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*,areas(name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,parent:parent_id(name))&id=eq.${id}`, { headers: headers(key) });
  const [row] = JSON.parse(await res.text());
  if (!row) { console.log(`${id}: NO ROW`); fails++; continue; }
  const route = dbRouteToCamel(row);
  const want = String(row.waypoints[idx].directions || "");
  if (!want) { console.log(`${id}[${idx}]: nothing stored — probe cannot fire`); fails++; continue; }
  // Match a distinctive slice, not the whole string: SSR escapes entities, so compare on a
  // fragment that carries no & < > ' — see the ssr-probes-must-match-escaped-html rule.
  const needle = want.split(/[,.;—]/).map(s => s.trim()).filter(s => s.length > 25 && !/[&<>'"]/.test(s))[0];
  if (!needle) { console.log(`${id}: no clean needle`); fails++; continue; }
  let hit = null;
  for (const tab of ["overview", "planner", "safety", "conditions"]) {
    let html; try { html = render(route, tab); } catch (e) { console.log(`  ${tab} THREW ${e.message}`); continue; }
    if (html.includes(needle)) { hit = tab; break; }
  }
  const gh = hit ? render(route, hit).includes("Getting here") : false;
  console.log(`${kind.padEnd(5)} ${id.padEnd(34)} idx ${idx}  ${hit ? `RENDERS on ${hit} tab` : "NOT FOUND on any tab"}  |  "Getting here" label: ${gh}`);
  if (!hit || !gh) fails++;
}
console.log(fails ? `\n${fails} case(s) failed` : `\nboth waves reach a screen`);
process.exit(fails ? 1 : 0);
