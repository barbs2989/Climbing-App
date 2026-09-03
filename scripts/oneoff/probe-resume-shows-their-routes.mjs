// Does another climber's résumé show their CLIMBS, or the words "Logged climb"?
//
// Two defects lived on this screen and neither is visible from the columns — the logs are
// fetched, the component renders, and every row is well-formed prose:
//
//   1. `routeById` resolves a DB route only if its id is in `dbOnlyRouteIds`, which is built
//      from the VIEWER's own lists/logs/crews/offline set. A climber you are looking AT is not
//      in it, so every route on their résumé missed and rendered as the literal placeholder
//      "Logged climb" — no name, no area, no grade — and SENDS BY GRADE, which drops a log it
//      cannot resolve, read "No sends in the selected disciplines" for a climber with sends.
//
//   2. `resumeLogs` hardcoded `partners:null`, and the row rendered
//      `partner ? " · with X" : " · solo"`. A missing field published as a positive claim about
//      how somebody climbed.
//
// Rendered against LIVE rows through the real dbRouteToCamel, because either step could drop
// the value while the column stayed populated.
//
//   node scripts/oneoff/probe-resume-shows-their-routes.mjs [routeId ...]

import { build } from "esbuild";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { requireServiceKey, SUPABASE_URL } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ids = process.argv.slice(2).filter(a => !a.startsWith("-"));
const IDS = ids.length ? ids : ["wa_mount_baker_north_ridge", "wa_liberty_bell_beckey_route"];

// node_modules/.cache, not the OS temp dir: a bare import resolves from the nearest
// node_modules to the IMPORTING file, and check:grade-parser skips node_modules so the
// bundle's inlined gradeNumFrom is not counted as a second parser.
const dir = path.join(ROOT, "node_modules/.cache/climbmatch-probes");
mkdirSync(dir, { recursive: true });
const ep = path.join(dir, "resume-ep-" + process.pid + ".jsx");
writeFileSync(ep, `
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {Resume, ROUTES} from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
import {dbRouteToCamel} from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};
export {React, renderToStaticMarkup, Resume, ROUTES, dbRouteToCamel};
`);
const built = await build({
  entryPoints: [ep], bundle: true, write: false, format: "esm", platform: "node",
  jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  external: ["react", "react-dom", "react-dom/server", "react/jsx-runtime", "@tanstack/react-query", "@supabase/supabase-js", "leaflet"],
  absWorkingDir: ROOT, logLevel: "error",
});
const bundle = path.join(dir, "resume-" + process.pid + ".mjs");
writeFileSync(bundle, built.outputFiles[0].text);
let m;
try { m = await import(bundle); } finally { rmSync(bundle, { force: true }); rmSync(ep, { force: true }); }
const { React, renderToStaticMarkup, Resume, ROUTES, dbRouteToCamel } = m;

// the exact select useRoutesByIds issues, so what is rendered is what the app would hold
const url = SUPABASE_URL, key = requireServiceKey();
const sel = "*,areas(name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,parent:parent_id(name))";
const res = await fetch(url + "/rest/v1/routes?select=" + encodeURIComponent(sel) + "&id=in.(" + IDS.join(",") + ")",
  { headers: { apikey: key, Authorization: "Bearer " + key } });
if (!res.ok) { console.log("read failed " + res.status + " " + (await res.text()).slice(0, 200)); process.exit(1); }
const rows = await res.json();
if (!rows.length) { console.log("no routes matched " + IDS.join(", ") + " — cannot judge the render"); process.exit(1); }
console.log("routes fetched: " + rows.length + " of " + IDS.length);

// exactly resumeRouteById's body
const map = {};
rows.forEach(x => { map[x.id] = dbRouteToCamel(x); });
const resumeRouteById = id => (ROUTES || []).find(x => x.id === id) || map[id] || undefined;
rows.forEach(x => console.log("   " + x.id + " -> " + JSON.stringify(map[x.id].name)
  + "  " + JSON.stringify(map[x.id].grade) + "  " + JSON.stringify((map[x.id]._dbArea || {}).name)));

// exactly the shape resumeLogs builds — note there is no `partners` key at all
const climber = { id: "00000000-0000-0000-0000-000000000000", name: "Robin Vale", avatar: "", location: "Seattle, WA", username: "robin" };
const logs = rows.map((x, i) => ({ routeId: x.id, date: "2026-0" + (6 + (i % 3)) + "-1" + (i % 9), tickType: i % 2 ? "Lead" : "Summit" }));

const html = renderToStaticMarkup(React.createElement(Resume, {
  climber, logs, unavailable: false, onClose() {}, fstate: "none",
  editable: false, courses: null, extra: null, routeById: resumeRouteById,
}));
const text = html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
console.log("\nrendered " + html.length + " chars");
console.log(text.slice(0, 640));

let bad = 0;
const fail = m => { console.log("  FAIL  " + m); bad++; };
if (html.length < 4000) fail("render is too thin to judge — every absence assertion below would pass vacuously");
rows.forEach(x => {
  const c = map[x.id];
  if (!text.includes(c.name)) fail("route name missing: " + c.name);
  if (c.grade && !text.includes(c.grade)) fail("grade missing: " + c.grade);
  const a = (c._dbArea || {}).name;
  if (a && !text.includes(a)) fail("area missing: " + a);
});
if (text.includes("Logged climb")) fail('still renders the placeholder "Logged climb"');
if (/ · solo/.test(text)) fail('still claims "· solo" for a climber whose partners were never recorded');
if (/No sends in the selected disciplines/.test(text)) fail("SENDS BY GRADE is empty for a climber with sends");

console.log("\n" + (bad ? bad + " failure(s)" : "ok — name, grade, area and the grade pyramid all reach the row; no placeholder, no solo claim"));
process.exit(bad ? 1 : 0);
