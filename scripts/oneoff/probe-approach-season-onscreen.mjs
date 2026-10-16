// Does the APPROACHES panel still say everything it used to, after the season pill was shortened?
//
// The pill now renders seasonShort(). That is only half a fix: shortening a display field is a
// LOSS unless the full text still reaches the screen somewhere. This repo has the shape on
// record twice — `descent_text` populated on 1,021 routes and rendered on none, and the rack
// correction that reached the right TAB but not the right BOX — so "it renders somewhere on the
// page" is not the question. The full sentence must be inside the variant's own card.
//
// Renders the real RouteDetail over the REAL rows carrying the longest seasons in the catalog.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);

const IDS = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const WANT = IDS.length ? IDS : [
  "wa_magic_mountain_northeast_couloir",   // 392 chars — the longest in the catalog
  "wa_eldorado_peak_eldorado_glacier_nw",  // 325
  "wa_guye_peak_southeast_gully",          // 245
];
const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=in.(${WANT.join(",")})`, { headers: headers(anonKey()) });
if (!res.ok) { console.log(`FAIL: read failed (${res.status})`); process.exit(1); }
const rows = await res.json();
if (!rows.length) { console.log("FAIL: read no routes"); process.exit(1); }

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: "planner", onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-appr-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

// renderToStaticMarkup ESCAPES & to &amp; — un-escape before matching, or a heading reads as
// absent and a false NO looks like a real defect.
const strip = (h) => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const camel = (r) => { const o = { ...r }; for (const [k, v] of Object.entries(r)) o[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v; return o; };

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);

for (const r of rows) {
  console.log(`\n${r.id}`);
  const html = render(Object.assign(camel(r), { mountainId: r.area_id, _dbArea: { id: r.area_id, name: "Probe", areaType: "peak", region: "Washington" } }));
  const text = strip(html);
  // What the PILL actually shows. seasonShort() is a fallback chain (month-range regex, then a
  // cut at ;/./( , then a hard truncate), so "it returned something" is not the same as "it
  // returned a window" — print it and judge it.
  const pills = [...html.matchAll(/border-radius:20px;padding:2px 9px;white-space:nowrap"[^>]*>([^<]*)</g)].map((m)=>m[1]);
  if (pills.length) console.log("   pills: " + pills.map((x)=>JSON.stringify(strip(x))).join("  "));

  // Bound the slice to the APPROACHES panel. The heading carries a count, so match its stem.
  const i = text.indexOf("APPROACHES · ");
  if (i < 0) { fail("no APPROACHES panel rendered — nothing else here was checked"); continue; }
  // Terminator found by structure, never by a fixed offset: a magic window broke this exact
  // family of probe twice in one day, once when the panel got shorter and once on a route
  // object longer than the guess.
  const nextHeads = ["CAMPING & BIVY", "ROUTE TRACK", "WAYPOINTS"].map((h) => text.indexOf(h, i + 1)).filter((n) => n > i);
  const end = nextHeads.length ? Math.min(...nextHeads) : text.length;
  const panel = text.slice(i, end);

  for (const v of (r.approach_variants || [])) {
    const full = String(v.season || "").trim().replace(/\s+/g, " ");
    if (!full) continue;
    const name = (v.name || "").slice(0, 34);
    // 1. The full sentence is still on screen, inside this panel.
    if (panel.includes(full)) ok(`full season prose (${full.length} chars) still renders — ${JSON.stringify(name)}`);
    else fail(`the ${full.length}-char season for ${JSON.stringify(name)} is GONE from the panel — shortening lost it`);
    // 2. And it appears ONCE. A short window would otherwise print in the pill and again as prose.
    const n = panel.split(full).length - 1;
    if (n <= 1) ok(`  and appears ${n} time(s), not duplicated`);
    else fail(`  the season text appears ${n} times — the pill and the prose are both printing it`);
  }
  console.log(`   panel: ${panel.length} chars`);
}

fs.rmSync(path.dirname(out), { recursive: true, force: true });
console.log(failures ? `\napproach season probe: ${failures} failure(s).` : "\napproach season probe: ok — the pill is a window and the full prose still reaches the card.");
process.exit(failures ? 1 : 0);
