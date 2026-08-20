// Three sport routes gained a rack that does not reach the RACK box. Find out why before
// concluding anything — "sport routes do not show a rack" is a story, and the box's own gate
// (`if(!allRack.length&&!onEditRack)return null`) is not discipline-aware, so the story is
// probably wrong. Read-only.
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { build } from "esbuild";
import { createRequire } from "module";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
import { routeRackFor, DISC_RACK } from ${JSON.stringify(path.join(ROOT, "lib/rack.js"))};
import { catOf } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export { routeRackFor, DISC_RACK, catOf };
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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-why-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs",
  platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error" });
const { render, routeRackFor, catOf } = require_(out);
const text = (h) => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ");

const RACK = ["Bolted throughout — 16 bolts on pitch 1", "Pitches above run 6 to 12 bolts each"];
for (const disc of ["sport", "trad", "alpine"]) {
  const route = { id: "probe", name: "Probe", grade: "5.11+", gradeSystem: "yds", discipline: disc,
    pitches: 7, mountainId: "probe_area", rack: RACK,
    _dbArea: { id: "probe_area", name: "Probe Area", areaType: "crag", region: "Washington" } };
  console.log(`\n### discipline=${disc}  catOf=${catOf(route)}`);
  console.log(`    routeRackFor -> ${JSON.stringify(routeRackFor(route))}`);
  for (const tab of ["overview", "planner", "safety"]) {
    const t = text(render(route, tab));
    const hasHeading = / RACK /.test(t);
    const hasText = t.includes("Bolted throughout");
    console.log(`    ${tab.padEnd(8)} RACK heading: ${hasHeading ? "yes" : "no "}   our text: ${hasText ? "yes" : "no"}`);
    if (hasHeading && !hasText) {
      const i = t.indexOf(" RACK ");
      console.log(`        around the heading: ${JSON.stringify(t.slice(i, i + 260))}`);
    }
  }
}
