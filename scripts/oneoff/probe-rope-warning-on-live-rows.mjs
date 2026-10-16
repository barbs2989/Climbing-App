// Does the STATED two-rope warning from #1329 reach the screen on real rows?
//
// That change was verified by diffing lib/rappels.js across 151 station tables old-vs-new. That
// proves the MODULE moved as intended; it does not prove the sentence reaches a climber. #1353
// shipped a defect that survived exactly that gap — every check asked whether the helper fired,
// none asked whether the premise was sound or whether the render agreed.
//
// So: render real rows through the real dbRouteToCamel and check both directions.
//   - a row STATING two ropes are required must show the warning
//   - a row offering the one-rope alternative ("or two single-rope rappels") must NOT
//
// THE PLANNER TAB, not Overview. RappelTable is mounted under `tab==="planner"`; rendering
// Overview reports 26 rows where the helper fires and nothing shows, which reads as a defect in
// the fix and is a defect in the probe.
//
//   node scripts/oneoff/probe-rope-warning-on-live-rows.mjs
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs"; import os from "os"; import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
import { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};
import { rappelRopeNeed, rappelSingleRopeWarning } from ${JSON.stringify(path.join(ROOT, "lib/rappels.js"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export { dbRouteToCamel, rappelRopeNeed, rappelSingleRopeWarning };
export function render(route, tab) {
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
    React.createElement(RouteDetail, { route, initialSubTab: tab, onBack: noop, onSubTab: noop,
      contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {},
      gearEdits: {}, diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-rope-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs",
  platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error" });
const { render, dbRouteToCamel, rappelRopeNeed, rappelSingleRopeWarning } = require_(out);

const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*,areas(path,name,area_type,region,lat,lng,elevation_ft)&rappel_detail=not.is.null&order=id.asc&limit=1000`, { headers: headers(key) });
const body = await r.text();
if (!r.ok) { console.error("READ FAILED " + r.status + " " + body.slice(0, 200)); process.exit(1); }
const rows = JSON.parse(body);
if (!Array.isArray(rows) || !rows.length) { console.error("REFUSING — empty read"); process.exit(1); }

const STATED = /states that a single 60 m rope will not link its stations/;
const MEASURED = /does not reach the longest station here \(\d+ m\)/;
const txt = (h) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ");
// The one-rope alternative — a warning here would be FALSE.
const ONE_ROPE_WORKS = /\bor\s+(?:as\s+)?two\s+single[- ]rope\s+(?:rappels|raps)\b|\bor\s+split\s+into\s+two\b/i;

let stated = [], measured = [], silent = 0, falseOnAlternative = [], notRendered = [];
for (const row of rows) {
  const cam = dbRouteToCamel(row);
  const need = rappelRopeNeed(cam);
  const warn = rappelSingleRopeWarning(cam);
  if (!warn) { silent++; continue; }
  let html = "";
  try { html = txt(render(cam, "planner")); } catch (e) { notRendered.push(`${row.id} THREW`); continue; }
  const onScreen = STATED.test(html) || MEASURED.test(html);
  if (!onScreen) { notRendered.push(row.id); continue; }
  (need.max == null ? stated : measured).push(row.id);
  // A row whose station prose offers the one-rope alternative must not carry a STATED requirement.
  const det = Array.isArray(row.rappel_detail) ? row.rappel_detail : [];
  const prose = det.map((d) => [d && d.notes, d && d.station, d && d.pull].filter(Boolean).join(" ")).join("  ");
  if (need.max == null && ONE_ROPE_WORKS.test(prose)) falseOnAlternative.push(row.id);
}

console.log(`rows with a station table         : ${rows.length}`);
console.log(`  warning silent (no requirement) : ${silent}`);
console.log(`  MEASURED warning on screen      : ${measured.length}   (length-derived, pre-existing)`);
console.log(`  STATED warning on screen        : ${stated.length}   (#1329's new path)`);
for (const id of stated) console.log(`      ${id}`);
console.log(`  helper fired but nothing rendered: ${notRendered.length}`);
for (const id of notRendered.slice(0, 8)) console.log(`      ${id}`);
console.log(`  STATED on a row offering the one-rope alternative (FALSE) : ${falseOnAlternative.length}`);
for (const id of falseOnAlternative) console.log(`      ${id}`);

if (stated.length) {
  const row = rows.find((x) => x.id === stated[0]);
  const t = txt(render(dbRouteToCamel(row), "planner"));
  const m = t.match(/This route states[^.]*\./);
  console.log(`\n${stated[0]} on screen:\n  ${m ? m[0] : "-- not matched --"}`);
}
const bad = notRendered.length || falseOnAlternative.length || !stated.length;
console.log(bad ? "\nPROBE FAILED" : "\nok — every warning the helper produces reaches the screen, and none sits on a row where one rope works.");
process.exit(bad ? 1 : 0);
