#!/usr/bin/env node
// Does researched ROUTE BREAKDOWN / CLIMBING ROUTE content actually REACH the route page?
//
// A 200 from the write and a matching re-read prove the ROW changed; neither proves a climber sees
// it. This reads the live rows named in the batch files, maps them through the app's own
// dbRouteToCamel, renders RouteDetail's Plan tab server-side (the same harness check:pitch-split
// uses), and requires that every entry's label and the opening of every entry's notes are in the
// markup. It checks what the batch WROTE, so it is spent once the rows are edited again — a
// failure after that means "re-read the route", not necessarily a defect.
//
// Usage: node scripts/oneoff/verify-route-breakdown-renders.mjs audits/route-breakdown/<batch>.json [...]

import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const files = process.argv.slice(2);
if (!files.length) { console.error("usage: verify-route-breakdown-renders.mjs <batch.json...>"); process.exit(1); }
const want = {};
for (const f of files) for (const [id, spec] of Object.entries(JSON.parse(fs.readFileSync(f, "utf8")))) {
  if (Array.isArray(spec.pitch_detail) && spec.pitch_detail.length) want[id] = { kind: "pitch_detail", rows: spec.pitch_detail };
  else if (Array.isArray(spec.climbing_route) && spec.climbing_route.length) want[id] = { kind: "climbing_route", rows: spec.climbing_route };
}
const ids = Object.keys(want);
if (!ids.length) { console.error("FAIL — the batch files hold no pitch_detail or climbing_route entries; refusing to report clean."); process.exit(1); }

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
export { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route) {
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
    React.createElement(RouteDetail, { route, initialSubTab: "planner", onBack: noop, onSubTab: noop,
      contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {}, gearEdits: {},
      diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-rb-")), "bundle.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs", platform: "node",
  jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" }, outfile: out, logLevel: "error" });
const { render, dbRouteToCamel } = createRequire(import.meta.url)(out);

// The markup HTML-escapes text; compare against the escaped form of the same prefix.
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
let bad = 0, checked = 0;
for (const id of ids) {
  const [row] = await selectAll("routes", "*", `id=eq.${encodeURIComponent(id)}`);
  if (!row) { console.log(`FAIL ${id} — no such row`); bad++; continue; }
  let html;
  try { html = render(dbRouteToCamel(row)); } catch (e) { console.log(`FAIL ${id} — render threw: ${e.message}`); bad++; continue; }
  const { kind, rows } = want[id];
  const misses = [];
  if (kind === "pitch_detail" && !html.includes("ROUTE BREAKDOWN")) misses.push("no ROUTE BREAKDOWN heading");
  if (kind === "climbing_route" && !html.includes("CLIMBING ROUTE · " + rows.length + " section")) misses.push(`no "CLIMBING ROUTE · ${rows.length} section" heading`);
  rows.forEach((r, i) => {
    const note = String(r.notes || r.note || "").slice(0, 60);
    if (note && !html.includes(esc(note))) misses.push(`entry ${i + 1} notes not on the page`);
    checked++;
  });
  if (kind === "pitch_detail") {
    const n = (html.match(/data-kind="(?:pitch|stage)"/g) || []).length;
    if (n !== rows.length) misses.push(`${n} breakdown rows rendered, batch wrote ${rows.length}`);
  }
  if (misses.length) { bad++; console.log(`FAIL ${id} — ${misses.join("; ")}`); }
  else console.log(`ok   ${id} — ${rows.length} ${kind === "pitch_detail" ? "breakdown rows" : "sections"} on the Plan tab`);
}
console.log(`\n${ids.length - bad}/${ids.length} routes render every researched entry (${checked} entries checked)`);
process.exit(bad ? 1 : 0);
