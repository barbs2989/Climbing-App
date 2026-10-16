// Does the commitment clarification actually REACH a screen, and stay off one that has no
// commitment grade? A populated column is not a rendered one, and check:bare renders routes with
// NO enrichment — so it cannot have seen this line.
//
// The render invocation is COPIED FROM check:bare rather than re-derived: that guard already
// encodes the traps (jsx: "automatic", define import.meta.env, the full prop set RouteDetail needs,
// a QueryClientProvider), and re-deriving them has cost this repo real time before.
import fs from "fs";
import os from "os";
import path from "path";
import { build } from "esbuild";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);

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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-commit-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

const base = (extra) => ({
  id: "probe_commit", name: "Probe Route", grade: "Class 2+", gradeSystem: "yds",
  discipline: "mountaineering", pitches: 0, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
  ...extra,
});

// renderToStaticMarkup emits HTML entities, so match the ESCAPED form — the em dash and the
// apostrophes in this app's copy are exactly where a naive match fails.
const NOTE = "Commitment counts the climb, not the walk in";
let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${cond || !detail ? "" : `  -- ${detail}`}`);
  if (!cond) fail++;
};

const withCommit = render(base({ commitment: "Grade II" }), "overview");
const noCommit = render(base({}), "overview");

ok("the render is substantial (not an error boundary)", withCommit.length > 2000, `${withCommit.length} chars`);
ok("ANCHOR — the commitment grade itself reaches the screen", /Commitment/.test(withCommit),
  "the TECH STATS panel did not render, so every assertion below is vacuous");
ok("the NCCS gloss still renders", /Half a day/.test(withCommit),
  "the explainer is gone — this change was meant to add a line, not replace one");
ok("the clarification renders beside it", withCommit.includes(NOTE),
  "the note does not reach the screen");
ok("a route with NO commitment grade shows neither", !noCommit.includes(NOTE) && !/Half a day/.test(noCommit),
  "the note renders where there is no grade to explain");

console.log(fail ? `\n${fail} failure(s).` : "\nall cases pass — the clarification reaches the screen only where a commitment grade does.");
process.exitCode = fail ? 1 : 0;
