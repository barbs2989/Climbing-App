// Does a reader actually SEE the duplicated sentence twice, on one tab?
//
// 163 WA routes repeat approach sentences inside `climbing_route`. That is a fact about two
// columns, and this repo has been wrong before by stopping there: a rack correction reached
// the right TAB and the wrong BOX, and `descent_text` was populated on 1,021 routes and
// rendered on none. Whether duplication is a DEFECT depends entirely on whether one screen
// states it twice, so render the real RouteDetail over the real row and count.
//
// Counts the sentence in the rendered markup, and separately checks that both section
// headings are present — a sentence appearing twice is only damning if the two sections a
// reader is told to distinguish are both on screen at once.
//
//   node scripts/oneoff/probe-duplicated-approach-on-screen.mjs [routeId]
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
const ID = process.argv[2] || "wa_mount_watson_scramble";

const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=eq.${ID}`, { headers: headers(key) });
if (!res.ok) throw new Error(`routes -> ${res.status}`);
const rows = JSON.parse(await res.text());
if (!rows.length) throw new Error(`no route ${ID} — a clean answer here would be a false pass`);
const row = rows[0];

// RouteDetail reads camelCase for these two, so the mapping has to be done rather than assumed.
const route = { ...row, mountainId: row.area_id, gradeSystem: row.grade_system || "yds",
  climbingRoute: row.climbing_route || [], approachVariants: row.approach_variants || [],
  _dbArea: { id: row.area_id, name: "Probe Area", areaType: "peak", region: "Washington" } };

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
}
`;
// tmpdir, never scripts/oneoff/ — a bundle written inside the repo inlines lib/grade.js and
// trips check:grade-parser. Measured this session, not predicted.
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-dup-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

// renderToStaticMarkup escapes, so strip tags and decode the few entities that matter before
// counting — otherwise an apostrophe in the prose defeats every match.
const textOf = html => html.replace(/<[^>]*>/g, " ")
  .replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
  .replace(/&mdash;|&#8212;/g, "—").replace(/\s+/g, " ");

const sentences = t => String(t || "").split(/(?<=[.;!?])\s+|\n+/)
  .map(s => s.trim()).filter(s => s.length > 60);

const crText = [].concat(row.climbing_route || [])
  .map(v => (v && typeof v === "object") ? [v.label, v.notes].filter(Boolean).join(". ") : String(v)).join("\n");

// Take only sentences that appear VERBATIM in both columns. A paraphrase is a duplicate to a
// reader but cannot be counted by string search, and over-claiming here would be the same
// mistake as the too-loose proxy earlier in this session.
const shared = sentences(row.approach).filter(a => crText.includes(a.replace(/[.;]$/, "")));

console.log(`route: ${ID} — ${row.name}  [${row.discipline}]`);
console.log(`${shared.length} approach sentence(s) appear verbatim in climbing_route\n`);
if (!shared.length) { console.log("nothing verbatim to look for — try a route with a 1.00 match"); process.exit(1); }

let worst = 0;
for (const tab of ["planner", "overview"]) {
  const txt = textOf(render(route, tab));
  const hasApproach = /\bAPPROACH\b/.test(txt), hasClimbing = /CLIMBING ROUTE/.test(txt);
  let twice = 0;
  for (const s of shared) {
    const needle = s.replace(/[.;]$/, "").replace(/\s+/g, " ").slice(0, 120);
    let n = 0, i = 0;
    for (;;) { const j = txt.indexOf(needle, i); if (j < 0) break; n++; i = j + 1; }
    if (n >= 2) twice++;
  }
  worst = Math.max(worst, twice);
  console.log(`  ${tab.padEnd(9)} APPROACH=${hasApproach}  CLIMBING ROUTE=${hasClimbing}  sentences printed twice: ${twice}/${shared.length}`);
}

console.log();
if (worst) console.log(`CONFIRMED — one tab prints the same sentence in both sections (${worst} of ${shared.length}).`);
else console.log("not reproduced on screen — the columns overlap but a reader never sees both at once.");
process.exit(0);
