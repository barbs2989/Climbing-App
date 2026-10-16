// The guard proves legMi on a fixture. This proves it on the REAL rows, through the REAL
// hydration — dbRouteToCamel and normalizeWaypoints both sit between the column and the screen,
// and either could have made the suppression reach nothing while every fixture assertion stayed
// green. Same standard probe-copied-road-block-reaches-the-screen.mjs sets.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs"; import os from "os"; import path from "path"; import { fileURLToPath } from "url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);
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
      contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {},
      gearEdits: {}, diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-legreal-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs",
  platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error" });
const { render, dbRouteToCamel } = require_(out);
const { SUPABASE_URL, anonKey, headers } = await import(path.join(ROOT, "scripts/lib/supabase-env.mjs"));
const k = anonKey();
const text = (h) => h.replace(/<style[\s\S]*?<\/style>/g," ").replace(/<[^>]+>/g," ").replace(/&#x27;/g,"'").replace(/&amp;/g,"&").replace(/\s+/g," ");
const IDS = ["wa_luna_glacier", "wa_lizard_mountain_south_route", "wa_mount_rainier_liberty_ridge", "wa_mount_baker_coleman_deming"];
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=in.(${IDS.join(",")})&select=*`, { headers: headers(k) });
const rows = await r.json();
if (rows.length !== IDS.length) { console.error(`read ${rows.length} of ${IDS.length} - refusing`); process.exit(1); }
/* COUNTING, not looking for "0.0". `wa_lizard_mountain_south_route` prints 3.7 mi for a 16.3 mi
   leg — a spot-check for a zero would call that clean. The expected number of printed legs is
   derived here from the same geometry the app uses, so the assertion is exact. */
const MI = 1.609344;
const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const D = (a, b, c, d) => { const R = 6371, t = (x) => x * Math.PI / 180, dp = t(c - a), dl = t(d - b);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h)); };
let fail = 0, rendered = 0;
for (const raw of rows) {
  const route = dbRouteToCamel(raw);
  const wp = route.waypoints || [];
  let printable = 0, possible = 0;
  for (let i = 1; i < wp.length; i++) {
    const a = wp[i - 1], b = wp[i];
    const am = num(a.distMi), bm = num(b.distMi);
    if (am == null || bm == null || num(a.lat) == null || num(b.lat) == null) continue;
    if (Number(a.lat) === Number(b.lat) && Number(a.lng) === Number(b.lng)) continue;
    printable++;
    if (Math.abs(bm - am) >= D(Number(a.lat), Number(a.lng), Number(b.lat), Number(b.lng)) / MI * 0.98) possible++;
  }
  const t = text(render(route));
  if (t.length < 800) { console.log(`  SKIP ${raw.id}: rendered only ${t.length} chars`); continue; }
  rendered++;
  const shown = (t.match(/mi from last/g) || []).length;
  const ok = shown === possible;
  if (!ok) fail++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${raw.id.padEnd(40)} ${t.length} chars   ${printable} printable leg(s), ${possible} possible, ${shown} shown`);
}
if (!rendered) { console.error("FAIL - nothing rendered, so every assertion is vacuous"); process.exit(1); }
console.log(fail ? `\n${fail} of ${rendered} live route(s) print MORE leg distances than their own pins allow.` : `\nverified on ${rendered} live route(s): every printed leg distance is possible, and every impossible one is gone.`);
process.exit(fail ? 1 : 0);
