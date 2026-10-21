#!/usr/bin/env node
// Every route with TWO OR MORE pitches must show a ROUTE BREAKDOWN section and a RAPPELS section, full or
// empty, on the tab that holds its plan content: Overview on a crag route (trad/sport/toprope/aid/bouldering,
// which has no Plan tab since #2223), Plan on everything else. An empty one is a headed card with a pencil
// (EmptySection), never a bare one-line note, so a climber can see the section and fill it in (owner,
// 2026-10-15, on Castleton Tower's 4-pitch Kor-Ingalls Route).
//
// Walks the WHOLE live catalog (pitches >= 2, service key), hydrates each row through the app's own
// dbRouteToCamel and renders the real RouteDetail server-side. Then a synthetic pass: a single-pitch crag
// route GAINS pitches (a contributed count, then a contributed pitch list with `pitches` still 0) and the
// sections must appear.
//
// Exempt, as the app gates them: bouldering (no pitches), and RAPPELS where the route says there are none
// (rappelsAreNone: a stated walk-off).
// Usage: node scripts/oneoff/audit-multipitch-sections.mjs [--limit=N]
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);
const { selectAll, requireServiceKey, SUPABASE_URL, headers } = await import(path.join(ROOT, "scripts/lib/supabase-env.mjs"));
const LIMIT = +((process.argv.find((a) => a.startsWith("--limit=")) || "").split("=")[1] || 0);

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
import { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};
import { catOf } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });
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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-mp-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const _err = console.error; console.error = (...a) => { if (!/useLayoutEffect/.test(String(a[0]))) _err(...a); };
const { render, dbRouteToCamel, catOf } = require_(out);
const CRAG = ["trad", "sport", "toprope", "aid", "bouldering"];
const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, "\n").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").split("\n").map((s) => s.trim()).filter(Boolean).join(" | ");
// A section is HEADED when its heading is followed by the pencil: "ROUTE BREAKDOWN | ✎ Edit" or, filled,
// "ROUTE BREAKDOWN" after its Tap-for-detail chip; RAPPELS may read "RAPPELS · 3 rappels" or "3 RAPPELS".
const HAS_BREAKDOWN = /(^|\| )ROUTE BREAKDOWN( \||$)/;
const HAS_RAPPELS = /(^|\| )[^|]*RAPPELS[^|]*( \||$)/;
// The app hides RAPPELS where the route DENIES rappels (rappelsAreNone); that is an exemption, not a miss.
const WALKOFF = /^\s*(?:none|no\b|n\/a|not required|zero|0)\b|walk[- ]?off/i;

function check(route, label, problems, counts) {
  const crag = CRAG.includes(catOf(route));
  const tab = crag ? "overview" : "planner";
  let t;
  try { t = text(render(route, tab)); } catch (e) { problems.push(`${label} ${route.id}: THREW ${e.message}`); return; }
  counts.rendered++;
  if (route.discipline === "bouldering" || catOf(route) === "bouldering") { counts.boulder++; return; }
  if (!HAS_BREAKDOWN.test(t)) problems.push(`${label} ${route.id} (${route.discipline}, ${route.pitches}p, ${tab}): no ROUTE BREAKDOWN section`);
  if (!HAS_RAPPELS.test(t)) {
    if (WALKOFF.test(String(route.rappels || "")) || /^0x?$/.test(String(route.rappels || "").trim())) counts.walkoff++;
    else problems.push(`${label} ${route.id} (${route.discipline}, ${route.pitches}p, ${tab}): no RAPPELS section`);
  }
  if (/\| No pitch-by-pitch breakdown/.test(t) && !/ROUTE BREAKDOWN \| ✎ Edit \| No pitch-by-pitch breakdown/.test(t)) problems.push(`${label} ${route.id}: empty breakdown is a bare note, not a headed section`);
  if (/\| No rappel information/.test(t) && !/RAPPELS \| ✎ Edit \| No rappel information/.test(t)) problems.push(`${label} ${route.id}: empty rappels is a bare note, not a headed section`);
}

const key = requireServiceKey();
const SEL = "*,areas(name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,parent:parent_id(name))";
// The fetch is ~9,000 rows with an areas embed and takes minutes; one dropped socket (EPIPE) is common.
// Under load the paged `pitches>=2` scan hits the statement timeout (57014). --ids=FILE (one id per line,
// e.g. from `select id from routes where pitches >= 2` via `npx supabase db query --linked -o csv`) fetches
// those rows by id in chunks instead, which is an index lookup.
const IDS = (process.argv.find((a) => a.startsWith("--ids=")) || "").slice(6);
let rows = [];
if (IDS) {
  const ids = fs.readFileSync(IDS, "utf8").split("\n").map((s) => s.trim()).filter((s) => s && s !== "id");
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100).map((x) => `"${x.replace(/"/g, '\\"')}"`).join(",");
    for (let t = 0; ; t++) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${SEL}&id=in.(${encodeURIComponent(chunk)})`, { headers: headers(key) });
        const body = await res.text();
        if (!res.ok) throw new Error(`${res.status} ${body.slice(0, 120)}`);
        rows.push(...JSON.parse(body)); break;
      } catch (e) { if (t >= 3) throw e; }
    }
  }
  if (rows.length !== ids.length) console.log(`WARNING: asked for ${ids.length} ids, got ${rows.length} rows`);
} else {
  for (let i = 0; ; i++) { try { rows = await selectAll("routes", SEL, "pitches=gte.2", { key, pageSize: 500 }); break; } catch (e) { if (i >= 3) throw e; console.log(`fetch failed (${e.message}), retrying`); } }
}
const problems = [], counts = { rendered: 0, boulder: 0, walkoff: 0 };
const byDisc = {};
for (const row of (LIMIT ? rows.slice(0, LIMIT) : rows)) {
  const r = dbRouteToCamel(row);
  byDisc[r.discipline] = (byDisc[r.discipline] || 0) + 1;
  check(r, "catalog", problems, counts);
}

console.log(`catalog pass: ${problems.length} problem(s) so far`);
// SYNTHETIC: a route that GAINS pitches later. Take a real single-pitch crag row of each roped discipline.
for (const disc of ["trad", "sport", "aid"]) {
  // ONE row, fetched directly: selectAll pages until the table runs out, so pageSize 1 walked every
  // single-pitch row of the discipline one request at a time.
  // Retried: after minutes of rendering, the pooled keep-alive socket is often dead (EPIPE).
  let row;
  for (let t = 0; ; t++) {
    try { const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${SEL}&discipline=eq.${disc}&pitches=eq.1&rappels=is.null&rappel_detail=is.null&limit=1`, { headers: headers(key) }); [row] = JSON.parse(await res.text()); break; }
    catch (e) { if (t >= 3) throw e; }
  }
  if (!row) { problems.push(`synthetic: no single-pitch ${disc} row to test with`); continue; }
  const base = dbRouteToCamel(row);
  const t1 = text(render(base, "overview"));
  if (HAS_BREAKDOWN.test(t1)) problems.push(`synthetic ${base.id}: a 1-pitch ${disc} route already shows ROUTE BREAKDOWN`);
  if (HAS_RAPPELS.test(t1)) problems.push(`synthetic ${base.id}: a 1-pitch ${disc} route already shows RAPPELS (it lowers off)`);
  check({ ...base, pitches: 3 }, `synthetic(count 1->3,${disc})`, problems, counts);
  const t3 = text(render({ ...base, pitches: 0, pitchDetail: [{ pitch: 1, grade: "5.8", lengthM: 30 }, { pitch: 2, grade: "5.9", lengthM: 35 }] }, "overview"));
  if (!HAS_RAPPELS.test(t3)) problems.push(`synthetic ${base.id}: pitches=0 with 2 contributed pitches shows no RAPPELS`);
  if (!HAS_BREAKDOWN.test(t3)) problems.push(`synthetic ${base.id}: pitches=0 with 2 contributed pitches shows no ROUTE BREAKDOWN`);
}

console.log(`routes with pitches >= 2: ${rows.length} ${JSON.stringify(byDisc)}`);
console.log(`rendered ${counts.rendered} (bouldering exempt ${counts.boulder}, stated walk-off exempt from RAPPELS ${counts.walkoff})`);
if (problems.length) { console.log(`${problems.length} problem(s):`); problems.slice(0, 80).forEach((p) => console.log("  " + p)); process.exit(1); }
console.log("OK: every multi-pitch route shows ROUTE BREAKDOWN and RAPPELS as headed sections, and a route that gains pitches gains them");
