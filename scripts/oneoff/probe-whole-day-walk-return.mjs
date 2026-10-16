// When the walking figure already covers the whole day, does the RETURN still add 75% more of it?
//
// PREMISE, read off the code rather than assumed:
//   hikeH  = scarfHrs(distKm, gainM, lossM)                     -- one walk
//   totalH = hikeH + techH ; sumH = depart + totalH
//   retH   = publishedIsWholeDay ? sumH : sumH + (pitches>0 ? techH*0.7 : hikeH*0.75)
// so hikeH is meant to be the ONE-WAY approach. `gainCoversWholeOuting` (|loss-gain|/gain <= 3%)
// is the app's own test for rows whose figures are the whole outing, and for those it already
// relabels the tile "On foot" and says in TECH STATS "Total ascent is the whole day from the
// trailhead, not just the walk in". The return leg ignored that and added the walk a second time.
//
// 433 of the 484 qualifying WA rows have gain EXACTLY equal to loss — a round trip or a traverse
// ending at its start elevation, not a coincidence on a one-way approach.
//
//   node scripts/oneoff/probe-whole-day-walk-return.mjs
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs"; import os from "os"; import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
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
export function render(route){ return renderToStaticMarkup(React.createElement(QueryClientProvider,{client:qc},
  React.createElement(RouteDetail,{route,initialSubTab:"planner",onBack:noop,onSubTab:noop,
    contribs:[],myReports:[],connections:[],comments:{},hzVotes:{},sunReports:{},gearEdits:{},
    diffRatings:{},crewsForRoute:[],myStars:{},presence:null}))); }
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-wd-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs",
  platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error" });
const { render, dbRouteToCamel } = require_(out);

const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
let after = "", rows = [];
for (;;) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*,areas(path,name,area_type,region,lat,lng,elevation_ft)&gain_ft=not.is.null&loss_ft=not.is.null` + (after ? `&id=gt.${after}` : "") + `&order=id.asc&limit=500`, { headers: headers(key) });
  const t = await r.text();
  if (!r.ok) { console.error("READ FAILED " + r.status + " " + t.slice(0, 160)); process.exit(1); }
  const b = JSON.parse(t);
  if (!Array.isArray(b)) { console.error("NOT AN ARRAY"); process.exit(1); }
  if (!b.length) break;
  rows = rows.concat(b.filter((x) => String(x.id).startsWith("wa_")));
  after = b[b.length - 1].id;
  if (b.length < 500) break;
}
if (!rows.length) { console.error("REFUSING — empty read"); process.exit(1); }

const txt = (h) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ");
const wholeDay = (r) => { const g = +r.gain_ft, l = +r.loss_ft; return g > 0 && l > 0 && Math.abs(l - g) / g <= 0.03; };
/* PITCHED whole-outing rows are a DIFFERENT case and must keep their return leg: theirs is
   `techH*0.7`, the descent of the CLIMB, which the walk never double-counted. 212 WA rows are
   that shape, and short-circuiting the whole expression would strip a real leg from them. */
const walkOnly = (r) => wholeDay(r) && !(Number(r.pitches) > 0);
const publishedWholeDay = (r) => { const t = r.timing || {}; return t.summitTimeHrs != null && t.totalHrs != null && t.summitTimeHrs === t.totalHrs && t.approachTimeHrs == null; };
// "N.Nhr On foot" then Total, then the two clock times.
const TILES = /([\d.]+)hr On foot ([\d.]+)hr (?:Climbing|Car-to-car) ([\d.]+)hr Total ([^ ]+ [AP]M(?: \(\+\d+d\))?) Est\. summit.*?([^ ]+ [AP]M(?: \(\+\d+d\))?) Est\. return/;

let checked = 0, sameAsSummit = 0, stillAdds = [], notMatched = 0;
for (const row of rows.filter((r) => walkOnly(r) && !publishedWholeDay(r) && +r.dist_km > 0).slice(0, 120)) {
  let t = "";
  try { t = txt(render(dbRouteToCamel(row))); } catch { continue; }
  const m = t.match(TILES);
  if (!m) { notMatched++; continue; }
  checked++;
  if (m[4] === m[5]) sameAsSummit++;
  else stillAdds.push(`${row.id}  summit ${m[4]} -> return ${m[5]}`);
}
console.log(`whole-outing rows rendered with the tile row matched : ${checked}`);
console.log(`  Est. return EQUALS Est. summit (nothing re-added)  : ${sameAsSummit}`);
console.log(`  still adds a return leg                            : ${stillAdds.length}`);
for (const x of stillAdds.slice(0, 10)) console.log(`      ${x}`);
console.log(`  tile row not matched (layout changed?)             : ${notMatched}`);

// A ONE-WAY route must be untouched — the return leg is real there. So must a PITCHED
// whole-outing route, whose return is the climb's descent rather than the walk's.
const oneWay = rows.filter((r) => (!wholeDay(r) || Number(r.pitches) > 0) && !publishedWholeDay(r) && +r.gain_ft > 0 && +r.dist_km > 0).slice(0, 60);
let oneWayKept = 0, oneWayLost = [];
for (const row of oneWay) {
  let t = "";
  try { t = txt(render(dbRouteToCamel(row))); } catch { continue; }
  const m = t.match(/([^ ]+ [AP]M(?: \(\+\d+d\))?) Est\. summit.*?([^ ]+ [AP]M(?: \(\+\d+d\))?) Est\. return/);
  if (!m) continue;
  if (m[1] !== m[2]) oneWayKept++; else oneWayLost.push(row.id);
}
console.log(`\none-way OR pitched rows still adding a return leg (must stay) : ${oneWayKept}`);
console.log(`  one-way rows that LOST their return leg           : ${oneWayLost.length}`);
for (const x of oneWayLost.slice(0, 8)) console.log(`      ${x}`);

const bad = stillAdds.length || oneWayLost.length || !checked || !oneWayKept;
console.log(bad ? "\nPROBE FAILED" : "\nok — a whole-day walk is not re-added, and a one-way route keeps its return leg.");
process.exit(bad ? 1 : 0);
