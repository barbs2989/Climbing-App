// check:field-renders reports seasonal_hazards.crevasses as reaching no screen, and after
// #1 that is CORRECT-BY-DESIGN for the route it samples: that value is
// "N/A - no glacier travel on this route", a negation the Safety block deliberately
// suppresses (it is evidence for lib/terrain.js, noise as a bullet on a rock scramble).
//
// But "correct for the sample" is not "correct". Two branches stay unproven by that guard:
// a crevasses value with REAL content, and the OBJECT shape ({timing, location}) that 34 WA
// routes carry — `.length`-on-a-string territory. Render both and look.
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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-sh-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true,
  format: "cjs", platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" },
  define: { "import.meta.env": "{}" }, outfile: out, logLevel: "error" });
const { render, dbRouteToCamel } = require_(out);

const get = async (id) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*,areas(*)&id=eq.${encodeURIComponent(id)}`, { headers: headers(anonKey()) });
  const [row] = await r.json();
  return row ? dbRouteToCamel(row) : null;
};

// Page from `wa_` (enrichment is WA-scoped and ids sort alphabetically) and classify.
let after = "wa_", strCase = null, objCase = null, negCase = null;
for (let i = 0; i < 40 && (!strCase || !objCase || !negCase); i++) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,seasonal_hazards&order=id.asc&limit=1000&id=gt.${encodeURIComponent(after)}`, { headers: headers(anonKey()) });
  const page = await r.json();
  if (!page.length) break;
  for (const row of page) {
    const cv = row.seasonal_hazards && row.seasonal_hazards.crevasses;
    if (!cv) continue;
    // Classify by CONTENT as well as shape. The first draft split on shape alone and picked
    // `wa_boving_roofs` as the object case — whose joined value is "N/A None — dry granite
    // formation…", i.e. also a negation. It was correctly suppressed, and the probe reported
    // a FAIL against working code. The two axes are independent: object-vs-string, and
    // negation-vs-content.
    const joined = typeof cv === "string" ? cv : [cv.timing, cv.location].filter(Boolean).join(" ");
    const neg = /^\s*(n\/a|na\b|none\b|not applicable)/i.test(String(joined).trim());
    if (neg) { negCase ||= row.id; continue; }
    if (typeof cv === "object") { objCase ||= row.id; continue; }
    strCase ||= row.id;
  }
  after = page[page.length - 1].id;
  if (page.length < 1000) break;
}

const cases = [
  ["real prose (string)", strCase, true],
  ["object shape {timing,location}", objCase, true],
  ["negation — must NOT render", negCase, false],
];
let bad = 0;
for (const [label, id, shouldShow] of cases) {
  if (!id) { console.log(`${label}: no such route in the catalog — SKIPPED`); continue; }
  const route = await get(id);
  const cv = (route.seasonalHazards || {}).crevasses;
  const text = typeof cv === "string" ? cv : [cv && cv.timing, cv && cv.location].filter(Boolean).join(" ");
  const html = render(route, "safety");
  const needle = String(text).replace(/\s+/g, " ").trim().slice(0, 40);
  const plain = html.replace(/<[^>]*>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");
  const shown = needle.length > 6 && plain.includes(needle);
  const ok = shown === shouldShow;
  if (!ok) bad++;
  console.log(`\n${ok ? "ok  " : "FAIL"} ${label}  [${id}]`);
  console.log(`     value: ${JSON.stringify(String(text).slice(0, 90))}`);
  console.log(`     on Safety: ${shown ? "rendered" : "absent"} (expected ${shouldShow ? "rendered" : "absent"})`);
  if (!ok) console.log(`     SEASONAL HAZARDS heading present: ${plain.includes("SEASONAL HAZARDS")}`);
}
console.log(bad ? `\n${bad} case(s) wrong.` : "\nall crevasses cases behave as intended.");
process.exit(bad ? 1 : 0);
