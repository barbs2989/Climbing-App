// check:field-renders reports access.land_manager as reaching no screen, but RouteDetail
// plainly builds a ["Land manager", landMgrVal] row from it. One of the two is wrong. Render
// the guard's own sample route on every sub-tab and look.
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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-lm-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true,
  format: "cjs", platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" },
  define: { "import.meta.env": "{}" }, outfile: out, logLevel: "error" });
const { render, dbRouteToCamel } = require_(out);

const ID = process.argv[2] || "adams_avalanche_glacier";
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*,areas(*)&id=eq.${encodeURIComponent(ID)}`, { headers: headers(anonKey()) });
const [row] = await r.json();
if (!row) { console.error("no such route:", ID); process.exit(1); }
const camel = dbRouteToCamel(row);
const lm = (camel.access || {}).landManager || (camel.access || {}).land_manager;
console.log("route:", ID);
console.log("access keys:", Object.keys(camel.access || {}).join(", "));
console.log("land_manager:", JSON.stringify(lm));
console.log("discipline:", row.discipline, "| area:", row.areas && row.areas.name, "\n");

const strip = (h) => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
for (const tab of ["overview", "conditions", "planner", "safety", "photos"]) {
  let txt = "";
  try { txt = strip(render(camel, tab)); } catch (e) { console.log(tab.padEnd(11), "THREW:", e.message.split("\n")[0].slice(0, 70)); continue; }
  const hasLabel = txt.includes("Land manager");
  const hasValue = lm ? txt.includes(String(lm).slice(0, 40)) : false;
  console.log(tab.padEnd(11), "label:", hasLabel ? "YES" : "no ", "| value:", hasValue ? "YES" : "no ", "| chars:", txt.length);
  if (hasLabel && !hasValue) {
    const i = txt.indexOf("Land manager");
    console.log("            context:", JSON.stringify(txt.slice(i - 60, i + 180)));
  }
}
