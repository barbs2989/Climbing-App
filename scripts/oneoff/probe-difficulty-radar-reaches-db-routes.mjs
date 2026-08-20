// Does a DB route's `difficulty` actually reach the screen once mapped?
// Same harness as check:bare — esbuild-bundle RouteDetail, render with react-dom/server.
// Mapping a column is not rendering it: that is the descent_text lesson (populated on 1,021
// routes, rendered on none). So render twice and require the page to CHANGE.
import { build } from "esbuild";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";

const ROOT = "/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/wa-area-parent-audit";
const require_ = createRequire(import.meta.url);

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
        route, initialSubTab: "overview", onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-radar-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

const base = {
  id: "probe_trad", name: "Probe", grade: "5.9", gradeSystem: "yds",
  discipline: "trad", pitches: 6, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "crag", region: "Washington" },
};
// the real shape, straight out of the live column
const DIFF = { physical: 4, technical: 5, exposure: 3, commitment: 2, routefinding: 1 };

const without = render(base);
const withD = render(Object.assign({}, base, { difficulty: DIFF }));
const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const tw = text(without), td = text(withD);

let bad = 0;
const ok = (c, m) => { console.log((c ? "  ok    " : "  FAIL  ") + m); if (!c) bad++; };

ok(without.length > 400, `bare route renders at all (${without.length} chars)`);
ok(without !== withD, `the page CHANGES when difficulty is present (${without.length} -> ${withD.length})`);
// DiffRadar's own axis labels — it returns null without `d`, so these can only come from it
for (const label of ["Route-finding", "Commitment", "Exposure", "Technical", "Physical"])
  ok(!tw.includes(label) && td.includes(label), `axis "${label}" appears only with difficulty set`);
// the per-discipline blurb text, proving axBlurb is reached too
ok(td.includes("place solid protection") || td.includes("place gear"),
   "the trad-specific axis blurb renders (axBlurb reached)");

console.log(bad ? `\n${bad} FAILURE(S)` : `\nPROVEN — difficulty reaches the screen; DiffRadar renders`);
process.exit(bad ? 1 : 0);
