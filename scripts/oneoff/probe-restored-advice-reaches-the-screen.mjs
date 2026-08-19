// Does the restored avalanche advice actually reach the Safety tab?
//
// The classifier change is measurable in isolation — 10 WA routes moved from "no snow" to
// "snow yes" — and that is NOT the claim worth making. A verdict is not a screen. This repo
// has shipped `descent_text` populated on 1,021 routes and rendered on none, and a rack
// correction that reached the right TAB and the wrong BOX. So render the real RouteDetail
// over the real row and look for the line.
//
// Renders BOTH ways from one bundle: once with the row as it is, once with the two blind
// columns nulled to reproduce main's behaviour. If the line is present in both, the probe is
// vacuous and says so — the trap check:bare records, where an assertion passed on a Safety-tab
// link that had nothing to do with the panel under test.
//
//   node scripts/oneoff/probe-restored-advice-reaches-the-screen.mjs [routeId]
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
const ID = process.argv[2] || "wa_roan_wall_center_stage";

const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=eq.${ID}`, { headers: headers(key) });
if (!res.ok) throw new Error(`routes -> ${res.status}`);
const rows = JSON.parse(await res.text());
if (!rows.length) throw new Error(`no route ${ID} — a clean answer here would be a false pass`);
const row = rows[0];

// dbRouteToCamel is the app's own mapper and pulling it in would drag lib/db.js and supabase
// into the bundle. RouteDetail reads both spellings for every column corpus() cares about, so
// the snake_case row is enough for THIS question and nothing is being mimicked by hand.
const route = { ...row, mountainId: row.area_id, gradeSystem: row.grade_system || "yds",
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
// Bundled into a tmpdir, never into scripts/oneoff/: an esbuild bundle written inside the repo
// inlines lib/grade.js and trips check:grade-parser, which is exactly how an earlier probe in
// this session broke the whole build. Measured, not predicted.
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-terrain-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

const blind = { ...route, climbing_route: null, climbingRoute: null,
  approach_variants: null, approachVariants: null };

// The alpine avalanche line, as RouteDetail renders it. renderToStaticMarkup escapes, so match
// text that survives escaping — see the ssr-probes-must-match-escaped-html note.
const NEEDLE = /Check the avalanche forecast/i;

let ok = 0, bad = 0;
for (const tab of ["safety", "overview"]) {
  const after = render(route, tab);
  const before = render(blind, tab);
  const inAfter = NEEDLE.test(after), inBefore = NEEDLE.test(before);
  const verdict = inAfter && !inBefore ? "RESTORED"
    : inAfter && inBefore ? "present either way (probe is vacuous on this tab)"
      : !inAfter && !inBefore ? "absent either way (wrong tab for this panel)"
        : "REGRESSED — present before, gone after";
  console.log(`  ${tab.padEnd(9)} before=${String(inBefore).padEnd(5)} after=${String(inAfter).padEnd(5)}  ${verdict}`);
  if (verdict === "RESTORED") ok++;
  if (verdict.startsWith("REGRESSED")) bad++;
}

console.log(`\nroute: ${ID} — ${row.name}`);
if (bad) { console.log("FAIL — the change removed advice from a screen"); process.exit(1); }
if (!ok) { console.log("INCONCLUSIVE — the line never differed on either tab"); process.exit(1); }
console.log(`ok — the avalanche line is on screen after the fix and was not before (${ok} tab(s))`);
