// For EVERY column on `routes`: is it populated, and does its value reach any screen?
//
// This is the audit that would have caught #707 (descent_text: 1,021 routes populated, 0
// rendered anywhere — editable via Suggest-a-fix, mapped in dbRouteToCamel, and read by
// nothing) and the Plan/Safety finding in #687. Both were found by hand, one column at a
// time. Nobody had asked it column-by-column.
//
// Method: take REAL routes that have the column populated, run each through the real
// dbRouteToCamel + RouteDetail with react-dom/server, and look for a distinctive token from
// the actual value in the rendered text of every sub-tab. Real data, real render tree — not
// a grep for the field name, because "editable + mapped" is exactly what descent_text had.
//
// THE FIRST FIVE VERSIONS OF THIS SCRIPT ALL REPORTED CONFIDENT NONSENSE. Every guard below
// exists because one of them shipped a false finding:
//   1. ROOT was scripts/oneoff/.. = scripts/, which SKIP excludes -> walked 0 files, "clean".
//   2. select=* blew the edge limit -> HTTP 500 with an HTML body, not a PostgREST error.
//   3. limit=1000 + a LIKE filter -> 57014 statement timeout on the anon role's 3s budget.
//   4. `catch { continue }` around render() made "threw" and "not rendered" identical, and
//      it reported `grade` and `descent` as unread when both demonstrably render.
//   5. Tokens were taken from JSON KEYS ("routefinding", "estimatePerSeason") and matched
//      CASE-SENSITIVELY, so `difficulty` read as unread while rendering "DIFFICULTY
//      BREAKDOWN / Exposure / ...".
//
// So it now self-tests before it reports: known-rendered columns must come back rendered,
// and a synthetic field nothing reads must come back unread. If either fails, it exits 1
// rather than print findings. A detector that cannot detect must not look clean.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs"; import os from "os"; import path from "path";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const ROOT = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");
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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-cols-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true,
  format: "cjs", platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" },
  define: { "import.meta.env": "{}" }, outfile: out, logLevel: "error" });
const { render, dbRouteToCamel } = require_(out);

const COLS = (() => {
  const snap = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/schema-snapshot.json"), "utf8"));
  const r = snap.tables.routes;
  return (Array.isArray(r) ? r : r.columns || Object.keys(r)).map((c) => (typeof c === "string" ? c : c.name));
})();
// Structural plumbing: not content, nothing is expected to render it.
const PLUMBING = new Set(["id", "area_id", "sort_order", "auto_generated", "grade_num",
  "disciplines", "lists", "gear_bucket", "gear_confidence", "elev_pts", "gps_contributor_name",
  "lat", "lng", "stars", "classic", "grade_system", "source"]);
const TABS = ["overview", "conditions", "planner", "safety", "photos"];

// Normalise BOTH sides identically: lowercase, and treat every run of non-alphanumerics as a
// single space. That makes "Route-finding" match "routefinding" and "off-trail" match
// "off trail" — fix (5). Matching raw substrings is what produced the false positives.
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const pageText = (h) => norm(h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " "));

// Tokens come from VALUES ONLY. Walking an object with Object.values (never its keys) is
// fix (5): "estimatePerSeason" and "trailheadDirection" are schema, not content, and no
// screen will ever print them.
function valueStrings(v, depth = 0, out = []) {
  if (v == null || depth > 4) return out;
  if (typeof v === "string") { out.push(v); return out; }
  if (typeof v === "number" || typeof v === "boolean") return out;   // no distinctive words
  if (Array.isArray(v)) { for (const x of v) valueStrings(x, depth + 1, out); return out; }
  if (typeof v === "object") { for (const x of Object.values(v)) valueStrings(x, depth + 1, out); }
  return out;
}
// Several candidates per example, longest first — one unlucky word should not decide a column.
function tokensFor(v) {
  const words = valueStrings(v).flatMap((s) => norm(s).split(" "));
  return [...new Set(words.filter((w) => w.length >= 8))].sort((a, b) => b.length - a.length).slice(0, 6);
}

console.log("fetching a sample of WA routes…");
const BULK = new Set(["gpx", "elev_pts"]);                    // fix (2): huge, and not text
const FETCH = COLS.filter((c) => !BULK.has(c)).join(",");
// fix (3): 1000 always times out; 400 usually works but the anon role's 3s budget is shared,
// so a loaded database fails a limit that succeeded minutes earlier. Step down rather than
// die — and if even the smallest page fails, say so instead of reporting on a short sample.
async function sample() {
  for (const limit of [400, 250, 150, 80]) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${FETCH}&id=like.wa_%25&order=id.asc&limit=${limit}`, { headers: headers(anonKey()) });
    if (r.ok) return { rows: JSON.parse(await r.text()), limit };
    const body = (await r.text()).slice(0, 90);
    console.log(`  limit=${limit} -> ${r.status} ${body.includes("57014") ? "(statement timeout, retrying smaller)" : body}`);
  }
  return null;
}
const got = await sample();
if (!got) { console.error("could not read a sample at any page size — the database is too loaded to audit right now."); process.exit(1); }
const rows = got.rows;
console.log("rows:", rows.length, `(limit=${got.limit})`, "| columns:", COLS.length);

// Render once per route, not once per column — the same route serves many columns.
const cache = new Map();
function tabsFor(route) {
  if (cache.has(route.id)) return cache.get(route.id);
  const camel = dbRouteToCamel(route);
  const pages = []; const errs = [];
  for (const tab of TABS) {
    // fix (4): a throw is recorded, never silently treated as "did not render".
    try { pages.push(pageText(render(camel, tab))); }
    catch (e) { errs.push(tab + ": " + e.message.split("\n")[0].slice(0, 80)); }
  }
  const v = { pages, errs };
  cache.set(route.id, v);
  return v;
}

const populatedFor = (col) => rows.filter((r) => {
  const v = r[col];
  return v != null && v !== "" && !(Array.isArray(v) && !v.length) &&
         !(typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);
});

// Try up to EXAMPLES routes; a column counts as read if ANY of them renders ANY of its
// tokens. One example is not evidence — that is how `grade` and `descent` were misreported.
const EXAMPLES = 6;
function assess(col, extra) {
  const pool = (extra ? [extra] : populatedFor(col));
  if (!pool.length) return { verdict: "unpopulated", n: 0 };
  let tried = 0, threwAll = 0, lastErr = "", anyTokens = false;
  for (const r of pool.slice(0, EXAMPLES)) {
    const toks = tokensFor(r[col]);
    if (!toks.length) continue;
    anyTokens = true; tried++;
    const { pages, errs } = tabsFor(r);
    if (!pages.length) { threwAll++; lastErr = errs[0] || ""; continue; }
    for (const p of pages) for (const t of toks) if (p.includes(t)) return { verdict: "rendered", n: pool.length, example: r.id, token: t };
  }
  if (!anyTokens) return { verdict: "no-word-value", n: pool.length };
  if (tried && threwAll === tried) return { verdict: "INCONCLUSIVE-threw", n: pool.length, err: lastErr };
  return { verdict: "NO READER", n: pool.length, example: pool[0].id, tokens: tokensFor(pool[0][col]).slice(0, 3) };
}

// ── self-test: prove the detector can detect, before believing a single finding ──────────
const KNOWN_READ = ["name", "overview", "approach", "descent", "hazards", "fa", "beta", "season"];
const selfFail = [];
let confirmed = 0;
for (const c of KNOWN_READ) {
  const a = assess(c);
  // "NO READER" on a column that demonstrably renders = the detector is broken. But
  // "unpopulated" / "no-word-value" only means this sample cannot exercise it (in a slice of
  // WA routes `fa` is often the literal string "unknown" — no 8-letter word to search for).
  // Untestable is not the same as broken, so it neither passes nor fails; it just does not
  // count toward the quorum below.
  if (a.verdict === "NO READER") selfFail.push(`${c} -> NO READER, but this column demonstrably renders`);
  else if (a.verdict === "rendered") confirmed++;
}
if (confirmed < 4) selfFail.push(`only ${confirmed} of ${KNOWN_READ.length} known-rendered columns were positively confirmed — too few to trust a sweep`);
// Negative control: a field nothing reads must come back unread. If this says "rendered",
// the matcher is matching boilerplate and every finding is worthless.
{
  const base = rows.find((r) => r.overview);
  const probe = { ...base, __probe__: "zzqqxx unmistakable sentinel phrase" };
  cache.delete(probe.id); cache.set(probe.id + "#p", null); cache.delete(probe.id + "#p");
  const camel = dbRouteToCamel(probe);
  let found = false;
  for (const tab of TABS) { try { if (pageText(render(camel, tab)).includes("unmistakable")) found = true; } catch {} }
  if (found) selfFail.push("negative control rendered — the matcher matches boilerplate");
}
if (selfFail.length) {
  console.error("\nSELF-TEST FAILED — not reporting findings:");
  for (const f of selfFail) console.error("  " + f);
  process.exit(1);
}
console.log("self-test ok: " + confirmed + " known-rendered columns positively confirmed, negative control clean\n");

// ── the actual sweep ─────────────────────────────────────────────────────────────────────
const results = [];
for (const col of COLS) { if (!PLUMBING.has(col)) results.push({ col, ...assess(col) }); }

const unread = results.filter((r) => r.verdict === "NO READER").sort((a, b) => b.n - a.n);
const threw = results.filter((r) => r.verdict === "INCONCLUSIVE-threw");
console.log("=== POPULATED but rendered on NO sub-tab ===");
if (!unread.length) console.log("  (none)");
for (const u of unread) console.log(`  ${u.col.padEnd(22)} ${String(u.n).padStart(4)} of ${rows.length} sampled   e.g. ${u.example}  tried=${JSON.stringify(u.tokens)}`);
if (threw.length) { console.log("\n=== INCONCLUSIVE — every render threw, nothing was checked ==="); for (const t of threw) console.log(`  ${t.col.padEnd(22)} ${t.err}`); }
console.log("\nrendered fine: " + results.filter((r) => r.verdict === "rendered").length +
            " | unpopulated in sample: " + results.filter((r) => r.verdict === "unpopulated").length +
            " | numeric/no-word value: " + results.filter((r) => r.verdict === "no-word-value").length);
console.log(`
What this run does NOT cover, so nobody reads more into a clean result than it carries:
  • Numeric columns (dist_km, gain_ft, max_angle …) have no word to search for. An unread
    numeric column would NOT be caught by this method.
  • The sample is the first ${rows.length} WA routes by id, so it is alphabetically biased and
    columns unpopulated within it were never exercised — listed above as "unpopulated in
    sample", which means untested, not clean.
  • It renders the route-detail sub-tabs only. A column read somewhere else entirely (the
    area browser, search, the logbook) is out of scope.`);
