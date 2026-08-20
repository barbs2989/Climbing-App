// A populated column is not a rendered one — the trap this repo records more than any other.
//
// routeRackFor() reads contribRack -> detailedRack -> proNeeds -> route.rack, and NOT
// route.gear. The write still reaches the box, but only through dbRouteToCamel's fallback
// `rack: toArr(r.rack).length ? toArr(r.rack) : gearArr(r.gear)` — so it works if and only if
// `routes.rack` is empty on these rows. That is a real condition, not a detail: a populated
// `rack` would shadow every entry just written and the RACK box would keep saying "not this
// route's own" while the column looked healthy.
//
// So: check the shadowing condition on the live rows, then RENDER the real RouteDetail and look
// for the text. Read-only.
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { build } from "esbuild";
import { createRequire } from "module";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);
const k = anonKey();

const IDS = ["wa_batskins","wa_bobcat_cringe","wa_bowling_to_biscuits","wa_clay","wa_curious_poses",
"wa_freedom_fighter_2","wa_house_of_the_7th_bobcat","wa_narrow_arrow_overhang","wa_princely_ambitions",
"wa_sagittarius","wa_sisu","wa_starfish_enterprise","wa_technicians_of_the_sacred"];

const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,discipline,grade,pitches,gear,rack,detailed_rack,pro_needs&id=in.(${IDS.join(",")})`, { headers: headers(k) })).json();

console.log(`\n=== 1. is the new gear value shadowed by an existing rack/detailed_rack/pro_needs? ===`);
let shadowed = 0;
for (const r of rows) {
  const sh = [r.rack && (Array.isArray(r.rack) ? r.rack.length : String(r.rack).trim()) ? "rack" : null,
              r.detailed_rack ? "detailed_rack" : null, r.pro_needs ? "pro_needs" : null].filter(Boolean);
  if (sh.length) { console.log(`  SHADOWED ${r.id} by ${sh.join(", ")} — the gear write will not reach the box`); shadowed++; }
}
if (!shadowed) console.log(`  none — all ${rows.length} rows have an empty rack/detailed_rack/pro_needs, so gear falls through to route.rack`);

// ── 2. render it ────────────────────────────────────────────────────────────────────────────
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
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
}`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-rack-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs",
  platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error" });
const { render } = require_(out);
const text = (h) => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ");

console.log(`\n=== 2. does it reach the RACK box on screen? ===`);
let bad = 0, seen = 0;
for (const r of rows) {
  /* Mirrors dbRouteToCamel's fallback exactly, because that fallback IS the thing under test. */
  const rack = (Array.isArray(r.rack) && r.rack.length) ? r.rack : (Array.isArray(r.gear) ? r.gear : []);
  const route = { id: r.id, name: r.name, grade: r.grade, gradeSystem: "yds", discipline: r.discipline,
    pitches: r.pitches || 2, mountainId: "probe_area", rack,
    _dbArea: { id: "probe_area", name: "Probe Area", areaType: "crag", region: "Washington" } };
  const t = text(render(route, "overview"));
  const first = (r.gear || [])[0] || "";
  /* Match a distinctive FRAGMENT, not the whole entry: the box may wrap or truncate, and an
     exact-string test would report a rendered rack as missing. */
  const needle = first.split(/[—,;:]/)[0].trim().slice(0, 34);
  const generic = /not this route's own/i.test(t);
  const found = needle && t.includes(needle);
  seen++;
  if (!found || generic) { console.log(`  FAIL ${r.id}: ${found ? "" : `"${needle}" not on screen; `}${generic ? "still labelled as a generic rack" : ""}`); bad++; }
  else console.log(`  ok   ${r.id}: "${needle}"`);
}
console.log();
if (!seen) { console.error("FAIL — nothing rendered"); process.exit(1); }
if (bad) { console.error(`${bad} of ${seen} derived racks do not reach the RACK box.`); process.exit(1); }
console.log(`ok — all ${seen} derived racks reach the RACK box, and none is still labelled generic.`);
