// Does the APPROACHES repair reach the screen -- and did it damage anything on the way?
//
// A 200 from PostgREST proved the columns changed. It proves nothing about what a climber sees,
// and nothing at all about whether a mechanical prose transform wrecked good writing. This renders
// the REAL RouteDetail against the REAL rows, mapped through dbRouteToCamel, which is the shape
// the reader actually gets.
//
// It asserts in BOTH directions, and the second is the one that matters:
//
//   GONE     -- no "_DEFECTS", no database `row`, no column name, no batch/sweep voice, and no
//               bare route id anywhere on the rendered Planner tab.
//   SURVIVED -- the climber fact each passage carried is still on screen, and the three protected
//               idioms ("TWO COLS IN A ROW", "four things in a row", "a jagged row") still read as
//               written. A sweep that silently rewrote those would pass every GONE assertion.
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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-approaches-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render, dbRouteToCamel } = require_(out);
const text = (h) => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
  .replace(/&mdash;|&#8212;/g, "—").replace(/\s+/g, " ");

// Deliberately not the whole page: several of these must ALSO be true of the raw markup, and the
// entity-decoding above is exactly the trap [[ssr-probes-must-match-escaped-html]] records.
const GONE = [
  [/_DEFECTS/i, "the internal document reference"],
  [/(?<!in a )(?<!jagged )\brow(?:'s|s)?\b/i, 'database vocabulary ("row")'],
  [/\bfa field\b|\bapproach_logistics\b|\baspect column\b/i, "a column name"],
  [/\bthis batch\b|\bthis sweep\b|SHOULD NOT BE RE-ARGUED/i, "batch or sweep voice"],
  [/\bwa_[a-z0-9_]+\b/i, "a bare route id"],
  [/\brename is pending\b|\bprose has been corrected\b|\bpreviously listed\b/i, "changelog voice"],
];

// The climber fact each repaired passage carried. If a sweep can delete these, it deleted the
// point of the note along with the working language.
const SURVIVED = [
  ["wa_mount_shuksan_hanging_glacier", "disagree by around a thousand feet"],
  ["wa_mount_shuksan_hanging_glacier", "rather than at a number"],
  ["wa_mount_baker_boulder_glacier", "Two elevations are published for it and they do not agree"],
  ["wa_himmelhorn_southeast_route", "the published standard route on this peak is on the NORTHWEST aspect"],
  ["wa_copper_peak_south_route", "Navigate by the glacier and the notch"],
  ["wa_mount_cameron_standard", "Carry a map, count your summits"],
  ["wa_liberty_bell_thin_red_line", "Use the pond and the hairpin"],
  ["wa_bonanza_peak_west_ridge", "so treat it with caution"],
  ["wa_mount_baker_boulder_park_cleaver", "published first-ascent records for the two are muddled"],
  ["wa_west_face", "carries no hazard, gear or descent information of its own"],
];

// Prose that merely CONTAINS the word the sweep rewrites. Rewriting these would be a repair that
// damages correct writing, and every GONE assertion would still pass.
const IDIOMS_KEPT = [
  ["wa_sinister_peak_southwest_route", "TWO COLS IN A ROW"],
  ["wa_mount_stuart_stuart_glacier_couloir", "four things in a row"],
  ["wa_the_pleiades_scramble", "a jagged row"],
];

const ids = [...new Set([...SURVIVED, ...IDIOMS_KEPT].map(([id]) => id))];
const rows = new Map();
for (const id of ids) {
  const r = await fetch(`${U}/rest/v1/routes?id=eq.${id}&select=*`, { headers: H });
  if (!r.ok) { console.error(`read failed for ${id}: ${r.status} — nothing verified.`); process.exit(1); }
  const [row] = await r.json();
  if (!row) { console.error(`no row for ${id} — nothing verified.`); process.exit(1); }
  rows.set(id, dbRouteToCamel(row));
}

let failures = 0;
const fail = (m) => { console.log(`  FAIL ${m}`); failures++; };
const pass = (m) => console.log(`  ok   ${m}`);

// The panel lives on the Planner tab.
const planner = new Map();
for (const id of ids) planner.set(id, text(render(rows.get(id), "planner")));

// 0 — the probe must be able to fire at all. A render that produced no APPROACHES panel would
// satisfy every GONE assertion vacuously.
let sawPanel = 0;
for (const id of ids) if (/APPROACHES/.test(planner.get(id))) sawPanel++;
if (!sawPanel) { console.log("ANCHOR LOST: no rendered Planner tab shows an APPROACHES panel."); process.exit(1); }
pass(`APPROACHES panel renders on ${sawPanel} of ${ids.length} routes walked`);

console.log("\nGONE — working language is off the screen:");
for (const [re, why] of GONE) {
  const hits = ids.filter((id) => re.test(planner.get(id)));
  if (hits.length) {
    const id = hits[0], m = planner.get(id).match(re);
    const at = planner.get(id).indexOf(m[0]);
    fail(`${why} still renders on ${hits.length} route(s), e.g. ${id}: …${planner.get(id).slice(Math.max(0, at - 70), at + 80)}…`);
  } else pass(`${why} appears on none of the ${ids.length} routes`);
}

console.log("\nSURVIVED — the climber fact is still on screen:");
for (const [id, needle] of SURVIVED) {
  if (planner.get(id).includes(needle)) pass(`${id}: “${needle.slice(0, 52)}…”`);
  else fail(`${id} LOST “${needle}” — the repair deleted the point of the note`);
}

console.log("\nIDIOMS KEPT — correct prose was not rewritten:");
for (const [id, needle] of IDIOMS_KEPT) {
  if (planner.get(id).includes(needle)) pass(`${id}: “${needle}”`);
  else fail(`${id} LOST the idiom “${needle}” — the sweep damaged correct writing`);
}

console.log(failures ? `\n${failures} failure(s)` : "\nno findings — the repair reaches the screen and nothing correct was damaged");
process.exit(failures ? 1 : 0);
