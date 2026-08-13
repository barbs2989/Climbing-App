// Can a climber's agreed descent correction be out-voted by the enrichment prose?
//
// The DESCENT section renders descentBeta(route), which is:
//     const a = route.descent, b = route.descentText
//     return b.length > a.length ? b : a
// i.e. LENGTH decides. `descentText` is the contribute-form key (it is in SS, and the
// section's own pencil opens it); `descent` is the enrichment column. So a climber who
// agrees a SHORTER, more accurate descent — "the gully is closed, walk off east" replacing
// three paragraphs — is silently overruled by the longer stale text.
//
// This is the rule check:rappel-readers already enforces for rappels (#787/#791): an agreed
// correction must out-vote the enrichment, not the reverse. `_contribFields` is the general
// record of which contribute-form keys were accepted; sectionProvenance() already reads it.
import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname;
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from "./RouteDetail.jsx";
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route, tab) {
  try {
    return renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: tab, onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
  } catch (e) { return "THREW: " + e.message; }
}
`;
const { build } = await import("esbuild");
const out = join(mkdtempSync(join(tmpdir(), "cm-desc-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = createRequire(import.meta.url)(out);

const LONG_ENRICHMENT = "Descend the standard south gully, which is long and loose and takes "
  + "most parties three hours of careful downclimbing past several rotten bands before the "
  + "talus fan finally eases toward the basin and the climbers trail reappears near the lake.";
const SHORT_CORRECTION = "South gully is closed by rockfall — walk off east.";

const base = {
  id: "probe", name: "Probe Route", grade: "5.7", gradeSystem: "yds",
  discipline: "trad", pitches: 4, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "crag", region: "Washington" },
};
const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

let bad = 0;
const say = (ok, msg) => { if (!ok) bad++; console.log((ok ? "  ok   " : "  FAIL ") + msg); };

console.log("\nA climber agrees a SHORTER, correct descent. Which one reaches the screen?\n");

// Control: with no correction recorded, the longer enrichment prose is the right answer.
const noEdit = strip(render({ ...base, descent: LONG_ENRICHMENT, descentText: "" }, "planner"));
say(!/^ ?THREW/.test(noEdit), "renders without throwing                      [CONTROL]");
say(noEdit.includes("three hours of careful downclimbing"),
  "with no correction, enrichment prose shows        [CONTROL]");

// Control: a LONGER correction already wins today, so the probe is not vacuous.
const longer = strip(render({
  ...base, descent: "Short stale text.", descentText: LONG_ENRICHMENT,
  _contribFields: ["descentText"],
}, "planner"));
say(longer.includes("three hours of careful downclimbing"),
  "a LONGER correction wins today                    [CONTROL]");

// The finding.
const shorter = strip(render({
  ...base, descent: LONG_ENRICHMENT, descentText: SHORT_CORRECTION,
  _contribFields: ["descentText"],
}, "planner"));
say(shorter.includes("closed by rockfall"),
  "an agreed SHORTER correction reaches the screen");
say(!shorter.includes("three hours of careful downclimbing"),
  "...and the stale enrichment prose does NOT");

if (bad) { console.error(`\n${bad} assertion(s) failed.`); process.exit(1); }
console.log("\nAn agreed correction out-votes the enrichment, whatever its length.");
