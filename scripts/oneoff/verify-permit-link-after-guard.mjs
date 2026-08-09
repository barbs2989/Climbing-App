// Verify the shipped permit link against the simulation, through the REAL render.
// The simulation replayed a copy of the branch logic; this asserts the app itself now emits
// the expected href — a copy that has drifted from the component proves nothing.
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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-pm-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true,
  format: "cjs", platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" },
  define: { "import.meta.env": "{}" }, outfile: out, logLevel: "error" });
const { render, dbRouteToCamel } = require_(out);

// id -> the agency page it must now link to (null = no link at all)
const EXPECT = {
  // Forest Service peaks that carried the "crossing into North Cascades NP" boilerplate.
  wa_tomyhoi_peak_southeast_ridge: null,
  wa_table_mountain_standard_scramble: null,
  wa_mount_larrabee_south_ridge: null,
  wa_5_deadly_venoms: null,
  // Olympic NATIONAL FOREST, not the park.
  wa_the_brothers_south_couloir: null,
  // Genuinely Park Service — these must be untouched.
  wa_mount_torment_south_ridge: "nps.gov/noca",
  wa_mount_challenger_challenger_glacier: "nps.gov/noca",
  wa_mount_olympus_west_ridge: "nps.gov/olym",
};
const AGENCY = [["nps.gov/noca", /nps\.gov\/noca/], ["nps.gov/olym", /nps\.gov\/olym/],
  ["nps.gov/mora", /nps\.gov\/mora/], ["recreation.gov/permits", /recreation\.gov\/permits/],
  ["recreation.gov", /recreation\.gov(?!\/permits)/]];

let fail = 0, checked = 0;
for (const [id, want] of Object.entries(EXPECT)) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*,areas(*)&id=eq.${encodeURIComponent(id)}`, { headers: headers(anonKey()) });
  const [row] = await r.json();
  if (!row) { console.log(`SKIP ${id} — not in the DB`); continue; }
  let html = "";
  try { html = render(dbRouteToCamel(row), "planner"); }
  catch (e) { console.log(`FAIL ${id} — render threw: ${e.message.split("\n")[0].slice(0, 60)}`); fail++; continue; }
  const got = (AGENCY.find(([, re]) => re.test(html)) || [null])[0];
  checked++;
  const ok = want === null ? got === null : got === want;
  if (!ok) { fail++; console.log(`FAIL ${id}\n     want ${want === null ? "NO permit link" : want}, got ${got || "none"}`); }
  else console.log(`ok   ${id.padEnd(44)} ${want === null ? "no permit link" : want}`);
}
console.log(`\n${checked} checked, ${fail} failed`);
process.exit(fail ? 1 : 0);
