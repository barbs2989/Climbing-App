// Does `audit-unread-route-columns.mjs` actually attribute a render to the column it claims?
//
// That script renders a FULLY-POPULATED real route and looks for the column's token anywhere
// in the output. If two columns hold overlapping prose, a token from column A matches text
// that column B rendered, and A is scored "rendered" though nothing reads it. Its own output
// shows the mechanism: seasonal_guidance and seasonal_hazards drew the IDENTICAL token
// "drier-than-the-crest" from the same route. Its __probe__ negative control cannot catch
// this — a unique sentinel never collides with another column by construction.
//
// The test here is the one #719's check:field-renders uses: BLANK the column and re-render.
// If the token survives, the match was never attributable.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs"; import os from "os"; import path from "path";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const ROOT = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");
if (!fs.existsSync(path.join(ROOT, "RouteDetail.jsx"))) { console.error("ROOT wrong:", ROOT); process.exit(1); }
const require_ = createRequire(import.meta.url);

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
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
    React.createElement(RouteDetail, { route, initialSubTab: tab, onBack: noop, onSubTab: noop,
      contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {},
      diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null })));
}`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-attr-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true,
  format: "cjs", platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" },
  define: { "import.meta.env": "{}" }, outfile: out, logLevel: "error" });
const { render, dbRouteToCamel } = require_(out);

const COLS = (() => {
  const snap = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/schema-snapshot.json"), "utf8"));
  const r = snap.tables.routes;
  return (Array.isArray(r) ? r : r.columns || Object.keys(r)).map((c) => (typeof c === "string" ? c : c.name));
})();
const PLUMBING = new Set(["id", "area_id", "sort_order", "auto_generated", "grade_num",
  "disciplines", "lists", "gear_bucket", "gear_confidence", "elev_pts", "gps_contributor_name",
  "lat", "lng", "stars", "classic", "grade_system", "source"]);
const TABS = ["overview", "conditions", "planner", "safety", "photos"];

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const pageText = (h) => norm(h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " "));
function valueStrings(v, depth = 0, out = []) {
  if (v == null || depth > 4) return out;
  if (typeof v === "string") { out.push(v); return out; }
  if (typeof v === "number" || typeof v === "boolean") return out;
  if (Array.isArray(v)) { for (const x of v) valueStrings(x, depth + 1, out); return out; }
  if (typeof v === "object") { for (const x of Object.values(v)) valueStrings(x, depth + 1, out); }
  return out;
}
function tokensFor(v) {
  const words = valueStrings(v).flatMap((s) => norm(s).split(" "));
  return [...new Set(words.filter((w) => w.length >= 8))].sort((a, b) => b.length - a.length).slice(0, 6);
}

const BULK = new Set(["gpx", "elev_pts"]);
const FETCH = COLS.filter((c) => !BULK.has(c)).join(",");
async function sample() {
  for (const limit of [400, 250, 150, 80]) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${FETCH}&id=like.wa_%25&order=id.asc&limit=${limit}`, { headers: headers(anonKey()) });
    if (r.ok) return { rows: JSON.parse(await r.text()), limit };
    const body = (await r.text()).slice(0, 90);
    console.log(`  limit=${limit} -> ${r.status} ${body.includes("57014") ? "(timeout, retrying smaller)" : body}`);
  }
  return null;
}
console.log("fetching sample…");
const got = await sample();
if (!got) { console.error("could not read a sample at any page size."); process.exit(1); }
const rows = got.rows;
if (rows.length < 50) { console.error("sample too small to conclude:", rows.length); process.exit(1); }
console.log("rows:", rows.length, "| columns:", COLS.length, "\n");

const renderAll = (route) => {
  const camel = dbRouteToCamel(route);
  const pages = [];
  for (const tab of TABS) { try { pages.push(pageText(render(camel, tab))); } catch { /* counted by the sweep */ } }
  return pages;
};
const populatedFor = (col) => rows.filter((r) => {
  const v = r[col];
  return v != null && v !== "" && !(Array.isArray(v) && !v.length) &&
         !(typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);
});

const attributed = [], ambiguous = [], skipped = [];
for (const col of COLS) {
  if (PLUMBING.has(col) || BULK.has(col)) continue;
  const pool = populatedFor(col);
  if (!pool.length) continue;
  let verdict = null;
  for (const r of pool.slice(0, 6)) {
    const toks = tokensFor(r[col]);
    if (!toks.length) continue;
    const full = renderAll(r);
    const hit = toks.find((t) => full.some((p) => p.includes(t)));
    if (!hit) continue;                                  // the sweep would call this NO READER
    // The attribution test: same route, this column blanked.
    const blanked = renderAll({ ...r, [col]: null });
    const survives = blanked.some((p) => p.includes(hit));
    verdict = { col, id: r.id, token: hit, survives };
    break;
  }
  if (!verdict) { skipped.push(col); continue; }
  (verdict.survives ? ambiguous : attributed).push(verdict);
}

console.log("=== ATTRIBUTED — token disappears when the column is blanked ===");
console.log(`  ${attributed.length} column(s): ${attributed.map((a) => a.col).join(", ") || "(none)"}\n`);
console.log("=== AMBIGUOUS — token still renders with the column BLANKED ===");
console.log("    the sweep scored these 'rendered' on evidence another column produced.");
for (const a of ambiguous) console.log(`  ${a.col.padEnd(24)} token="${a.token}"  e.g. ${a.id}`);
if (!ambiguous.length) console.log("  (none)");
console.log(`\nnot reached (no token / no render hit): ${skipped.length}`);
