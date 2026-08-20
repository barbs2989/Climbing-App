// Does the CRUX GRADE tile actually change on screen, for a REAL row?
//
// `cruxGrade()` returning the right string proves the helper. It does not prove the tile calls it:
// the three call sites are on dense lines in RouteDetail.jsx, and a helper nothing renders is the
// `descent_text` shape — populated on 1,021 routes and displayed on none. This renders the real
// component over the real row and reads the markup.
//
//   node scripts/oneoff/probe-crux-tile-onscreen.mjs
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs"; import os from "os"; import path from "path";
import { fileURLToPath } from "url";

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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-crux-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs",
  platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error" });
const { render } = require_(out);
const text = h => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

// Fixtures whose `grade` leads with a commitment grade — the rows the tile was wrong on.
// `wa_tomyhoi_peak_southeast_ridge` earns its place: "Class 3-4" is NOT numeric, so CountUp passes
// it through literally and this probe can read the real value rather than CountUp's initial 0.
//
// `wa_liberty_cap_liberty_ridge_finish` was here and was REMOVED, not fixed: it is `mountaineering`,
// whose stats branch renders no Crux grade tile at all. That predates this change — the edit only
// swapped the function inside an existing stats.push and touched no gating — and whether a
// mountaineering route should show a crux grade is a separate question.
const IDS = ["wa_mount_stuart_north_ridge", "wa_the_pyramid_picket_south_route", "wa_tomyhoi_peak_southeast_ridge"];
const rows = await g(`routes?id=in.(${IDS.join(",")})&select=*,areas(id,name,area_type,lat,lng,elevation_ft)`);
if (!rows.length) { console.error("READ EMPTY — failing closed"); process.exit(1); }

let bad = 0;
for (const r of rows.sort((a, b) => a.id < b.id ? -1 : 1)) {
  const route = { ...r, gpxPts: r.gpx, mountainId: r.area_id, cruxGrade: r.crux,
    _dbArea: r.areas ? { id: r.areas.id, name: r.areas.name, areaType: r.areas.area_type, region: "Washington" } : null };
  const html = render(route, "overview");
  // Read the MARKUP, not the stripped text. The first version sliced 60 characters back from the
  // label and split on whitespace, which returned neighbouring tiles' numbers — and still printed
  // "ok", because the extracted junk contains no Roman numeral. An assertion that cannot find its
  // value must FAIL, not pass by accident.
  // The value sits inside a <span> — the tile wraps every stat in <CountUp/>. Miss that and the
  // regex matches nothing, which the first version reported as "anchor moved" on every row.
  const m = /<div[^>]*>(?:<span[^>]*>)?([^<]*)(?:<\/span>)?<\/div><div[^>]*>Crux grade<\/div>/i.exec(html);
  if (!m) { console.log(`BAD  ${r.id.padEnd(42)} could not read the tile value — anchor moved or tile absent`); bad++; continue; }
  const shown = m[1].replace(/&#x27;/g, "'").replace(/&amp;/g, "&").trim();
  if (!shown) { console.log(`BAD  ${r.id.padEnd(42)} tile rendered EMPTY`); bad++; continue; }
  // NEVER assert the NUMBER here. <CountUp/> is useState(0) reaching its target in a useEffect,
  // and effects do not run under renderToStaticMarkup — so a numeric grade like "5.9" renders as
  // "0.0" no matter what. What IS readable is whether a Roman numeral is still on the tile, and
  // that is the whole defect. A non-numeric grade ("Class 3-4", "AI3+") is not clean to CountUp
  // and passes through literally, so those rows show their real value.
  const stillCommitment = /^(Grade\s+)?[IVX]+(\s*[-/]\s*[IVX]+)?$/i.test(shown);
  if (stillCommitment) bad++;
  console.log(`${stillCommitment ? "BAD " : "ok  "} ${r.id.padEnd(42)} grade=${JSON.stringify(r.grade).padEnd(28)} tile shows "${shown}"`);
}
console.log(`\n${rows.length} real rows rendered, ${bad} still showing a commitment grade under "Crux grade".`);
process.exit(bad ? 1 : 0);
