// `check:ui` scans rendered copy for NaN / undefined / [object Object] — on TWENTY screens, and
// exactly ONE route detail, which it picks by name. `check:bare` renders one synthetic route with
// no enrichment. Neither sweeps the CATALOG, and this repo's own history says the defects live in
// the rows: a column populated on 8,000 routes and shaped differently on 30 of them.
//
// This renders REAL rows through the REAL hydration (dbRouteToCamel) across every sub-tab and
// scans the text. No browser and no dev server, so it costs a bundle and a render per route.
//
// THE PARTNERS SUB-TAB IS OUT OF THIS SWEEP'S FRAME, and the run says so rather than burying it
// in a "too thin" count. Measured: it renders 357 characters on every route — the header chrome,
// the sub-tab bar and the words "Find a partner" — with or without a crew passed in, because its
// content is hook-driven and produces nothing server-side. So this sweep covers FIVE sub-tabs,
// not six, and nothing has yet asked the same question of Partners; the browser guards
// (check:overflow, check:selected-state) reach it and do not scan for these needles.
//
//   node scripts/oneoff/probe-ssr-sweep-for-broken-copy.mjs --limit 120
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs"; import os from "os"; import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? d) : d; };
const LIMIT = Number(arg("--limit", 80));
const TABS = ["overview", "conditions", "planner", "safety", "partners", "photos"];

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
export { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route, tab) {
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
    React.createElement(RouteDetail, { route, initialSubTab: tab, onBack: noop, onSubTab: noop,
      contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {},
      gearEdits: {}, diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-sweep-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs",
  platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error" });
const { render, dbRouteToCamel } = require_(out);
const { SUPABASE_URL, anonKey, headers } = await import(path.join(ROOT, "scripts/lib/supabase-env.mjs"));

const text = (h) => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

/* The needles `check:ui` uses, plus Infinity — which it does not look for and which every one of
   these divisions can produce. Word-bounded so a route named "Undefined Arete" is not a finding,
   and `null` is deliberately NOT here: it is a legitimate English word in this catalog's prose. */
const BAD = [
  ["NaN", /\bNaN\b/],
  ["undefined", /\bundefined\b/],
  ["Infinity", /-?\bInfinity\b/],
  ["[object Object]", /\[object Object\]/],
];

const k = anonKey();
/* SAMPLE THE RICH ROWS, NOT THE FIRST N. Ordered by id, the first 40 are one region of near-empty
   crag stubs — 40 of their 240 renders were too thin to judge anything. The shapes that break a
   render live in the ENRICHED columns, so the default pool is routes carrying waypoints (1,016
   catalog-wide) and the sample is STRIDED across it rather than taken from the front, so a run
   covers the whole alphabet instead of one letter. `--all` widens the pool to every route. */
const POOL = argv.includes("--all") ? "" : "&waypoints=not.is.null";
const cnt = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id${POOL}&limit=1`, { headers: { ...headers(k), Prefer: "count=exact" } });
const total = Number(String(cnt.headers.get("content-range") || "").split("/")[1]) || 0;
if (!total) { console.error("FAIL — the pool is empty. A broken query, not a clean catalog."); process.exit(1); }
const stride = Math.max(1, Math.floor(total / LIMIT));
const rows = [];
for (let off = 0; off < total && rows.length < LIMIT; off += stride) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*${POOL}&order=id.asc&offset=${off}&limit=1`, { headers: headers(k) });
  if (!r.ok) { console.error(`read failed ${r.status}`); process.exit(1); }
  rows.push(...await r.json());
}
console.log(`pool ${total} route(s); sampling every ${stride}${POOL ? " (routes carrying waypoints)" : " (all routes)"}\n`);
if (!rows.length) { console.error("FAIL — read 0 routes. A broken query, not a clean catalog."); process.exit(1); }

let rendered = 0, thin = 0, threw = 0;
/* WHICH sub-tab is thin, not just how many. A bare count reads as mysterious; named, it is
   almost always one tab that legitimately renders nothing for this row. */
const thinBy = {};
const hits = [];
for (const raw of rows) {
  let route; try { route = dbRouteToCamel(raw); } catch (e) { threw++; console.log(`  THREW in hydration: ${raw.id} — ${e.message}`); continue; }
  for (const tab of TABS) {
    let t;
    try { t = text(render(route, tab)); }
    catch (e) { threw++; console.log(`  THREW rendering ${raw.id} [${tab}] — ${e.message}`); continue; }
    if (t.length < 400) { thin++; thinBy[tab] = (thinBy[tab] || 0) + 1; continue; }
    rendered++;
    for (const [name, re] of BAD) {
      const m = t.match(re);
      if (!m) continue;
      const i = t.indexOf(m[0]);
      hits.push({ id: raw.id, tab, name, ctx: t.slice(Math.max(0, i - 90), i + 60).trim() });
    }
  }
}
for (const h of hits) console.log(`  ${h.name.padEnd(15)} ${h.id.padEnd(40)} [${h.tab}]  …${h.ctx}…`);
const thinNote = Object.entries(thinBy).map(([t, n]) => `${t} x${n}`).join(", ");
console.log(`\n${rows.length} route(s) read; ${rendered} render(s) scanned across ${TABS.length} sub-tabs (${thin} too thin to judge${thinNote ? ` — ${thinNote}` : ""}, ${threw} threw)`);
console.log(hits.length ? `${hits.length} broken string(s) on screen.` : `no NaN, undefined, Infinity or [object Object] in any rendered copy.`);
if (thinBy.partners === rows.length) console.log(`(partners rendered thin on EVERY route, as expected — its content is hook-driven and produces nothing under SSR. This run covered ${TABS.length - 1} sub-tabs, not ${TABS.length}.)`);
if (!rendered) { console.error("FAIL — nothing rendered, so a clean result means nothing."); process.exit(1); }
process.exit(hits.length ? 1 : 0);
