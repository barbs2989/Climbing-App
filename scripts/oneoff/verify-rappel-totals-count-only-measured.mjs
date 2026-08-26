// Does nulling the invented rappel lengths actually reach the screen, and did it cost anything?
//
// A 200 from PostgREST proved the column changed. It says nothing about what a climber sees, and
// nothing at all about whether the page is now WORSE — an all-em-dash table with no explanation
// would be a poorer screen than the confident-but-invented total it replaced.
//
// Renders the real RouteDetail against the real rows through dbRouteToCamel, and asserts in both
// directions:
//   GONE     — the manufactured totals ("210 m total" from seven estimates) are off the screen.
//   SURVIVED — the prose that told a climber what to expect is still there, the em dash renders
//              in place of each removed number, and every table that lost ALL its distances says
//              why. That last one is the point: silence would be the regression.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { loadEnv } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
const env = loadEnv();
const U = env.VITE_SUPABASE_URL, K = env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-raptot-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render, dbRouteToCamel } = require_(out);
const text = (h) => h.replace(/<[^>]+>/g, " ")
  .replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
  .replace(/&mdash;|&#8212;/g, "—").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ");

// The four whose table lost every distance — the strongest case, and the one that could regress
// into a silent wall of em dashes.
const ALL_NULLED = [
  ["wa_northeast_ridge_1963_route", "210 m"],
  ["wa_mount_torment_torment_forbidden_traverse", null],
  ["wa_south_ridge", "85 m"],
  ["wa_west_twin_needle_south_route", "80 m"],
];
// A partial one: its measured stations must still total, and still say "across N of M".
const PARTIAL = "wa_forbidden_peak_west_ridge";

let failures = 0;
const fail = (m) => { console.log(`  FAIL ${m}`); failures++; };
const pass = (m) => console.log(`  ok   ${m}`);

const ids = [...ALL_NULLED.map(([i]) => i), PARTIAL];
const page = new Map();
for (const id of ids) {
  const r = await fetch(`${U}/rest/v1/routes?id=eq.${id}&select=*`, { headers: H });
  if (!r.ok) { console.error(`read failed for ${id}: ${r.status} — nothing verified.`); process.exit(1); }
  const [row] = await r.json();
  if (!row) { console.error(`no row for ${id} — nothing verified.`); process.exit(1); }
  page.set(id, text(render(dbRouteToCamel(row), "planner")));
}

// 0 — the probe must be able to fire. A render with no rappel section would satisfy every
// "the total is gone" assertion vacuously.
const withTable = ids.filter((id) => /RAPPEL/i.test(page.get(id)));
if (!withTable.length) { console.log("ANCHOR LOST: no rendered Planner tab shows a rappel section."); process.exit(1); }
pass(`a rappel section renders on ${withTable.length} of ${ids.length} routes walked`);

console.log("\nGONE — no manufactured total on screen:");
for (const [id, wasTotal] of ALL_NULLED) {
  const t = page.get(id);
  if (wasTotal && t.includes(wasTotal + " total")) fail(`${id} still prints "${wasTotal} total"`);
  else pass(`${id} prints no manufactured total${wasTotal ? ` (was "${wasTotal} total")` : ""}`);
}

console.log("\nSURVIVED — the page did not just go quiet:");
for (const [id] of ALL_NULLED) {
  const t = page.get(id);
  if (t.includes("—")) pass(`${id} renders an em dash where a distance was`);
  else fail(`${id} shows no em dash — the station rows may have gone entirely`);
  // Every one of these must explain itself. Silence is the regression this guards against.
  const explains = /not documented|no per-station|not published|estimate|gives no|Not specifically documented|no source/i.test(t);
  if (explains) pass(`${id} says on screen why there are no distances`);
  else fail(`${id} lost every distance and explains nothing — worse than the total it replaced`);
}

console.log("\nPARTIAL — a measured station still counts:");
const p = page.get(PARTIAL);
if (/\d+\s*(?:m|ft) across \d+ of \d+/i.test(p)) pass(`${PARTIAL} still prints "… across N of M"`);
else fail(`${PARTIAL} lost its partial total wording`);
// WORD-BOUNDED, and case-sensitive for NaN. `/undefined|NaN|null/i` reported this route three
// times over on the letters inside "Quien Sabe Glacier remnant" and "glacier-remnant" — rem·nan·t.
// A needle that flags correct prose is the mistake this repo keeps recording.
if (/\bundefined\b|\bNaN\b|\bnull\b/.test(p)) fail(`${PARTIAL} renders undefined/NaN/null`);
else pass(`${PARTIAL} renders no undefined/NaN/null`);

console.log(failures
  ? `\n${failures} failure(s)`
  : "\nno findings — the invented totals are gone, and every emptied table says why.");
process.exit(failures ? 1 : 0);
