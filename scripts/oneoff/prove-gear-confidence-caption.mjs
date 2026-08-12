// Prove the gear_confidence caption renders — and, just as important, that it STAYS SILENT
// on a verified rack.
//
// check:field-renders classifies `gear_confidence` as UNPROVABLE: its values are short enums
// ("inferred"/"verified"), and that guard proves a column by finding its literal value on
// screen, which a 8-character word would match by accident. So the render has to be proven
// here instead, by rendering the real RouteDetail three ways and asserting all three states.
//
// Same harness as check:bare-route.mjs. Effects do not run under renderToStaticMarkup, so
// never assert on anything animated.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-gearconf-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

// A route with a REAL route-specific rack, so `rackGeneric` is false and the caption is the
// one under test. Shape copied from a live inferred row (wa_nest_route).
// NOTE: `rackGeneric` is `!routeRackFor(route)`, and routeRackFor reads `detailedRack` /
// `proNeeds` — NOT `rack`. A fixture carrying only `rack` stays in the GENERIC branch, whose
// caption already says "nobody has recorded what this route itself takes", so the caveat
// under test never renders. Set detailedRack or this proof silently tests nothing.
const withRack = (gearConfidence) => ({
  id: "probe_rack", name: "Probe Route", grade: "5.9", gradeSystem: "yds",
  discipline: "trad", pitches: 4, mountainId: "probe_area",
  detailedRack: "Single rack of cams 0.3-3in, small-to-mid stoppers, 4 alpine draws",
  rack: ["Single rack of cams 0.3-3in", "Small-to-mid stopper set", "4 alpine draws"],
  gear: ["Rock shoes & harness", "Light trad rack", "Helmet"],
  gearConfidence,
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "crag", region: "Washington" },
});

// Stop BEFORE the apostrophe: renderToStaticMarkup escapes it to &#x27;, so matching
// "this route's own description" against the markup fails on correct output.
const CAVEAT = "inferred from this route";
const ANCHOR = "Protection and technical gear";
const GENERIC = "Standard rack for this discipline";

let failed = 0;
const check = (label, cond, detail) => {
  console.log(`  ${cond ? "ok  " : "FAIL"}  ${label}${cond ? "" : " — " + detail}`);
  if (!cond) failed++;
};

// The caption lives on the planner sub-tab for a crag discipline (RouteGearCheck is cragOnly
// for some, so render planner where the RACK box is mounted).
for (const tab of ["planner", "overview"]) {
  const inferred = render(withRack("inferred"), tab);
  const verified = render(withRack("verified"), tab);
  const missing = render(withRack(null), tab);
  console.log(`\n[${tab}]`);
  // A skip here used to `continue`, and with BOTH sub-tabs skipped the run printed "all
  // assertions passed" having verified nothing — the vacuous pass this codebase keeps
  // catching. Not mounting is now a failure, not a shrug.
  if (!inferred.includes(ANCHOR) && !verified.includes(ANCHOR)) {
    check("RACK box mounts on this sub-tab", false, `neither render contains ${JSON.stringify(ANCHOR)} — nothing below was checked`);
    continue;
  }
  check("ANCHOR present (the RACK caption still exists)", inferred.includes(ANCHOR), "the caption was renamed — this proof is now blind");
  check("inferred rack SAYS so", inferred.includes(CAVEAT), "the caveat did not render");
  check("verified rack stays SILENT", !verified.includes(CAVEAT), "a verified rack was captioned as inferred");
  check("unset gear_confidence stays SILENT", !missing.includes(CAVEAT), "a route with no verdict was captioned as inferred");
  check("verified/unset still show the plain caption", verified.includes(ANCHOR) && missing.includes(ANCHOR), "the plain caption disappeared");
  // The generic-rack copy must still win when there is no route-specific rack at all.
  // Drop detailedRack/proNeeds, NOT rack/gear — those two are what routeRackFor reads, so
  // clearing only rack/gear leaves the route still in the non-generic branch and this
  // control asserts nothing.
  const noRack = render({ ...withRack("inferred"), detailedRack: undefined, proNeeds: undefined, rack: undefined, gear: undefined }, tab);
  check("no route rack => generic copy, not the caveat", !noRack.includes(CAVEAT) || noRack.includes(GENERIC), "the caveat fired on a route with no rack of its own");
}

console.log(failed ? `\n${failed} assertion(s) failed` : "\nall assertions passed");
process.exit(failed ? 1 : 0);
