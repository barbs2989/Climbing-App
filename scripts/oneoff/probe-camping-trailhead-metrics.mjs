// Does each camping site now state its elevation, its gain from the trailhead, and its distance
// from the trailhead — and does it stay SILENT where the catalog records none of those?
//
// Two halves, deliberately separate. The pure half pins what campFromTrailhead() SAYS, including
// the cases real data may not exercise today. The render half proves the string reaches the
// screen, which no amount of unit testing can show — the descent_text lesson: a column populated
// on 1,021 routes and rendered on none.
//
// Reads the live DB for the render half. Not a build gate.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
let fails = 0;
const ok = (c, m) => { console.log(`   ${c ? "ok  " : "FAIL"}  ${m}`); if (!c) fails++; };

// Backticks are forbidden inside this template literal — an earlier probe put one in a comment
// here and it terminated the string, producing a SyntaxError that read as a bundler fault.
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail, { campFromTrailhead } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
export { campFromTrailhead };
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-camp-")), "b.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { campFromTrailhead, render } = require_(out);

// ---------------------------------------------------------------- 1. what it SAYS
console.log("== campFromTrailhead(), the pure half\n");
ok(campFromTrailhead({ distMi: 4.2, gainFt: 2170 }) === "4.2 mi · 2,170 ft above the trailhead",
   `both numbers: ${JSON.stringify(campFromTrailhead({ distMi: 4.2, gainFt: 2170 }))}`);
ok(campFromTrailhead({ distMi: 4.2, gainFt: null }) === "4.2 mi from the trailhead",
   `distance only reads "from", not "above": ${JSON.stringify(campFromTrailhead({ distMi: 4.2, gainFt: null }))}`);
ok(campFromTrailhead({ distMi: null, gainFt: 2170 }) === "2,170 ft above the trailhead",
   `gain only: ${JSON.stringify(campFromTrailhead({ distMi: null, gainFt: 2170 }))}`);
ok(campFromTrailhead({ distMi: null, gainFt: -1250 }) === "1,250 ft below the trailhead",
   `BELOW the trailhead is worded, never a negative gain: ${JSON.stringify(campFromTrailhead({ distMi: null, gainFt: -1250 }))}`);
ok(campFromTrailhead({ distMi: null, gainFt: null }) === "",
   "a site with neither number says NOTHING — no 0, no placeholder");
ok(campFromTrailhead({ distMi: null, gainFt: 0 }) === "",
   "a gain that rounds to zero is dropped rather than shown as \"0 ft above\"");
ok(campFromTrailhead({ distMi: 4.2, gainFt: 0 }) === "4.2 mi from the trailhead",
   "zero gain still lets the distance through");
ok(campFromTrailhead(null) === "" && campFromTrailhead(undefined) === "",
   "a missing site does not throw");
// The chip must stay a CHIP. check:token-boxes counts anything over 60 characters as a paragraph.
const longest = campFromTrailhead({ distMi: 88.88, gainFt: -12345 });
ok(longest.length <= 60, `the longest shape it can emit is ${longest.length} chars (${JSON.stringify(longest)}) — still a token`);

// ---------------------------------------------------------------- 2. does it REACH the screen
const H = headers(anonKey());
const q = async (p) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
  return r.json();
};
// A route whose camping sites are on the TRACK is the only kind that can carry a distance, so
// sampling by bivy alone would prove the gain and silently skip the distance entirely.
const rows = await q("routes?select=*&waypoints=not.is.null&bivy=not.is.null&limit=200");
if (!rows.length) { console.log("FAIL: read no routes — an empty probe proves nothing"); process.exit(1); }

const arr = (v) => (Array.isArray(v) ? v : []);
const isTh = (w) => /trailhead/i.test(String((w && w.type) || ""));
const isCamp = (w) => /camp|bivy/i.test(String((w && w.type) || ""));
const withTh = rows.filter((r) => arr(r.waypoints).some(isTh));
const withTrackCamp = withTh.filter((r) => arr(r.waypoints).some(isCamp));
console.log(`\n== render: ${rows.length} routes read, ${withTh.length} with a trailhead pin, ${withTrackCamp.length} with a camp ON the track\n`);

// RouteDetail reads camelCase; the DB row is snake_case. dbRouteToCamel SPREADS the raw row and
// then adds aliases, so mimic that rather than renaming — the documented trap that had a session
// conclude a live column was mapped by nothing.
const camel = (r) => { const o = { ...r }; for (const [k, v] of Object.entries(r)) o[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v; return o; };

let renderErr = null;
let rendered = 0, sawAbove = 0, sawBelow = 0, sawDist = 0;
const samples = [];
const distinct = new Map();
for (const r of (withTrackCamp.length ? withTrackCamp : withTh).slice(0, 25)) {
  let html = "";
  try { html = render(camel(r), "planner"); } catch (e) { if (!renderErr) { renderErr = e; } continue; }
  rendered++;
  // renderToStaticMarkup escapes, so match the escaped text — the documented SSR trap.
  for (const m of html.matchAll(/([\d.,]+ (?:mi|km)(?: · [\d,]+ (?:ft|m))?|[\d,]+ (?:ft|m)) (above|below|from) the trailhead/g)) {
    if (m[2] === "above") sawAbove++; else if (m[2] === "below") sawBelow++;
    if (/mi|km/.test(m[1])) sawDist++;
    distinct.set(m[0], (distinct.get(m[0]) || 0) + 1);
  }
}
if (renderErr) { console.log(`   FIRST RENDER ERROR: ${renderErr && renderErr.message}`); console.log(String(renderErr && renderErr.stack).split("\n").slice(0,6).join("\n")); }
console.log(`   routes rendered            : ${rendered}`);
console.log(`   "... above the trailhead"  : ${sawAbove}`);
console.log(`   "... below the trailhead"  : ${sawBelow}`);
console.log(`   carrying a trail distance  : ${sawDist}`);
const withDist = [...distinct.keys()].filter((k) => / (?:mi|km) /.test(k) || / (?:mi|km) \u00b7 /.test(k) || /^[\d.,]+ (?:mi|km) /.test(k));
console.log(`\n   distinct strings on screen: ${distinct.size}`);
console.log(`   ...of which carry a DISTANCE: ${withDist.length}`);
[...distinct.entries()].slice(0, 8).forEach(([k, n]) => console.log(`      x${String(n).padStart(3)}  ${k}`));
if (withDist.length) { console.log(`\n   distance examples:`); withDist.slice(0, 8).forEach((k) => console.log(`      ${k}`)); }

console.log("");
ok(rendered > 0, "the panel rendered at all");
ok(sawAbove + sawBelow > 0, "the trailhead relation reaches the screen on real data");

// A zero here is not a pass. It would mean the distance half is wired to nothing, which is
// exactly the shape that ships a populated column rendered nowhere.
ok(sawDist > 0, "a real TRAIL DISTANCE reaches the screen (not merely the gain)");

process.exit(fails ? 1 : 0);
