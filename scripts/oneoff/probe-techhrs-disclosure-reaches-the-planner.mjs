// Does the climbing-time assumption reach a screen, and ONLY where the halving applies?
//
// Prove-it-can-fail discipline: an SSR probe that matches nothing reads identically to a real
// defect, so this asserts BOTH directions -- present at 5.6, absent at 5.10 -- and refuses to
// judge anything if the Planner tab did not render, which would make every "absent" vacuous.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { build } from "esbuild";

const ROOT = "/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/pitch-beta-waypoints-audit";
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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-techhrs-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = await import(out);

const NEEDLE = "Climbing time assumes a party moving continuously";
const route = (grade, pitches) => ({
  id: "guard_techhrs", name: "Guard Route", grade, pitches,
  mountainId: "guard_area", discipline: "alpine",
  distKm: 10, gainM: 1200, lossM: 1200, avgPitchLength: 50,
});

const easy = render(route("5.6", 10), "planner");
const hard = render(route("5.10a", 10), "planner");
const noPitch = render(route("5.6", 0), "planner");

if (!easy || easy.length < 400) {
  console.error(`FAILED — the route page rendered ${easy ? easy.length : 0} chars. Nothing below was checked.`);
  process.exit(1);
}

let fails = 0;
const ck = (label, cond) => { console.log("  " + (cond ? "ok  " : "FAIL") + "  " + label); if (!cond) fails++; };

// If this anchor is gone the three assertions below mean nothing.
ck("ANCHOR: the estimate tiles rendered", easy.includes("Est. summit") || easy.includes("Est. return"));
ck("disclosure renders on a 10-pitch 5.6 (halving applies)", easy.includes(NEEDLE));
ck("ABSENT on a 10-pitch 5.10a (halving does not apply)", !hard.includes(NEEDLE));
ck("ABSENT with no pitches (no climbing estimate at all)", !noPitch.includes(NEEDLE));

console.log(fails ? `\n${fails} assertion(s) failed` : "\nall assertions hold");
process.exit(fails ? 1 : 0);
