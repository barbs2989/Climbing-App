// Does the waypoint caveat fire on REAL rows, not just the guard's constructed fixtures?
//
// `check:waypoint-caveat` builds its own waypoints. That proves the predicates and the render
// site, and says NOTHING about whether live data satisfies them — a fixture can quietly encode an
// assumption the catalog does not share. This renders actual rows through the real RouteDetail.
//
// IT IMMEDIATELY FOUND THE CAPTION'S REAL LIMIT, which every synthetic test had missed:
//
//   `wa_himmelhorn_southeast_route` and `wa_preacher_mountain_scramble` are fabricated beyond
//   doubt — Himmelhorn's five intermediate pins claim 5,100-7,400 ft and the ground under them
//   reads 1,191-1,612 — and BOTH render no caveat at all. Their coordinates sit at 6 decimals and
//   are not collinear, so `waypointsAreOnOneLine`, `someWaypointsAreComputed` and
//   `longestArithmeticRun` all correctly return nothing.
//
// SO THE CAPTION CATCHES FABRICATION THAT LEFT A STRUCTURAL FINGERPRINT, AND ONLY THAT. Pins that
// were manufactured and then ROUNDED to surveyed precision are indistinguishable from real ones by
// any test that reads only the coordinates. Measured 2026-08-20: 180 of the 1,016 routes with pins
// would show a caveat (18%), and the precision histogram says why — 371 pins carry more than 8
// decimals while 3,353 sit at 4-6, which is exactly what a survey looks like.
//
// The only thing that catches the rounded ones is the GROUND — `audit:waypoint-elevations`, which
// is 3,506 USGS requests and cannot run at render time. Closing that gap in the app needs the
// verdict PRECOMPUTED and stored, which is a schema decision, not a predicate.
//
//   node scripts/oneoff/probe-caveat-on-real-rows.mjs
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs"; import os from "os"; import path from "path";
import { fileURLToPath } from "url";
import { manufacturedWaypointCaveat, SYNTHETIC_WAYPOINT_CAVEAT, COMPUTED_WAYPOINT_CAVEAT } from "../../lib/track.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
const env = {};
for (const f of [".env.local", ".env"]) {
  try { for (const l of fs.readFileSync(path.join(ROOT, f), "utf8").split("\n")) {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !(m[1] in env)) env[m[1]] = m[2].trim(); } } catch {}
}
if (!env.VITE_SUPABASE_URL) { console.error("no Supabase env — failing closed"); process.exit(1); }
const H = { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: "Bearer " + env.VITE_SUPABASE_ANON_KEY };
const g = async p => (await fetch(env.VITE_SUPABASE_URL + "/rest/v1/" + p, { headers: H })).json();

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route, tab) {
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
    React.createElement(RouteDetail, { route, initialSubTab: tab, onBack: noop, onSubTab: noop,
      contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {},
      gearEdits: {}, diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null })));
}`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-real-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs",
  platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error" });
const { render } = require_(out);
const text = h => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

// FINGERPRINTED: the audit names these AND they left a structural tell, so the caption must fire.
const FINGERPRINTED = ["wa_castle_peak_pasayten_scramble"];
// ROUNDED: fabricated beyond doubt by the DEM, but structurally clean. The caption CANNOT see
// these, and that is the documented limit rather than a regression. Listed so it stays visible.
const ROUNDED = ["wa_himmelhorn_southeast_route", "wa_preacher_mountain_scramble"];
// CONTROL: real routes. A caveat here would be worse than no caveat at all.
const CONTROL = ["wa_mount_stuart_north_ridge", "wa_mount_baker_coleman_deming"];

const rows = await g(`routes?id=in.(${[...FINGERPRINTED, ...ROUNDED, ...CONTROL].join(",")})&select=*,areas(id,name,area_type,lat,lng,elevation_ft)`);
if (!rows.length) { console.error("READ EMPTY — failing closed"); process.exit(1); }

let bad = 0;
for (const r of rows.sort((a, b) => a.id < b.id ? -1 : 1)) {
  const route = { ...r, gpxPts: r.gpx, mountainId: r.area_id,
    _dbArea: r.areas ? { id: r.areas.id, name: r.areas.name, areaType: r.areas.area_type, region: "Washington" } : null };
  const cav = manufacturedWaypointCaveat(r.waypoints);
  const html = text(render(route, "planner"));
  const onScreen = html.includes(SYNTHETIC_WAYPOINT_CAVEAT) || html.includes(COMPUTED_WAYPOINT_CAVEAT);
  const kind = FINGERPRINTED.includes(r.id) ? "fingerprinted" : ROUNDED.includes(r.id) ? "rounded" : "control";
  const want = kind === "fingerprinted";
  const okRow = onScreen === want && (!want || !!cav);
  if (!okRow) bad++;
  console.log(`${okRow ? "ok  " : "BAD "} ${r.id.padEnd(40)} ${kind.padEnd(14)} caveat=${onScreen ? (cav === SYNTHETIC_WAYPOINT_CAVEAT ? "line" : "computed") : "none"}`);
}
console.log(`\n${rows.length} real rows rendered, ${bad} wrong.`);
console.log(`The 'rounded' rows showing no caveat is the DOCUMENTED LIMIT, not a bug — see the header.`);
process.exit(bad ? 1 : 0);
