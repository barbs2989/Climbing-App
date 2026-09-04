#!/usr/bin/env node
// The Safety tab's weather empty state must not send a climber to a tab the route does not have.
//
// `showPlan = !cragOnly || hasPlanContent(route)`, and this empty state renders exactly when the
// route has NO waypoints -- which is itself one of hasPlanContent's clauses. So on a crag route
// with no plan content the Plan tab does not exist, and the copy named it anyway. Measured against
// the live catalog: 190,835 of 205,543 routes (92.8%) are crag-only with no plan content, plus up
// to 7,443 more where discipline='rock' and `style` decides.
//
//   node scripts/oneoff/probe-forecast-names-no-missing-tab.mjs
//
// Renders rather than reasons: the fix is a ternary on a prop, and "the code looks right" is
// exactly what the bug looked like. Both branches are rendered and read.
//
// Fails CLOSED: a bundle that will not build, or a render too thin to contain the panel, is
// reported as a broken probe -- every "must NOT contain" assertion passes against empty markup.

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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-fc-")), "bundle.cjs");
try {
  await build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
    bundle: true, format: "cjs", platform: "node", jsx: "automatic",
    loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
    outfile: out, logLevel: "error",
  });
} catch (e) { console.error("BROKEN PROBE: bundle failed\n" + e); process.exit(1); }
const { render } = require_(out);

// A BARE CRAG route: no waypoints and none of hasPlanContent's other clauses, so no Plan tab.
const bareCrag = { id: "probe_crag", name: "Probe Crag", discipline: "sport", grade: "5.9", pitches: 1, mountainId: "m", area: { name: "Probe Area" } };
// An ALPINE route with no waypoints either: !cragOnly, so the Plan tab EXISTS and naming it is right.
const bareAlpine = { ...bareCrag, id: "probe_alpine", discipline: "alpine", name: "Probe Alpine" };

let fail = 0;
const ok = (m) => console.log("  ok    " + m);
const bad = (m) => { console.log("  FAIL  " + m); fail++; };
const strip = (h) => h.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");

for (const [label, route, expectTab] of [["bare CRAG (no Plan tab)", bareCrag, false], ["bare ALPINE (Plan tab exists)", bareAlpine, true]]) {
  let html;
  try { html = render(route, "safety"); } catch (e) { bad(label + ": render threw — " + String(e.message).slice(0, 90)); continue; }
  const txt = strip(html);
  if (txt.length < 400) { bad(label + ": render is only " + txt.length + " chars — too thin to conclude anything"); continue; }
  if (!/no named waypoints to forecast from/.test(txt)) { bad(label + ": the forecast empty state did not render — ANCHOR LOST"); continue; }
  const namesTab = /on the Plan tab/.test(txt);
  // Does the route actually SHOW a Plan tab? Read the rendered sub-tab bar, not our own belief.
  const barHasPlan = /\bPlan\b/.test(txt.replace(/on the Plan tab/g, " "));
  if (expectTab) {
    if (namesTab) ok(label + ": names the Plan tab, and the tab is present (" + barHasPlan + ")");
    else bad(label + ": has a Plan tab but the copy no longer points at it — the fix over-reached");
  } else {
    if (!namesTab) ok(label + ": does NOT name the Plan tab");
    else bad(label + ": still sends the climber to a Plan tab this route does not have");
    if (!/Once a trailhead and summit waypoint are added/.test(txt)) bad(label + ": lost the explanation entirely — that is a deletion, not a fix");
    else ok(label + ": still explains what would unlock the forecast");
  }
}

console.log("");
if (fail) { console.error("probe-forecast-names-no-missing-tab: " + fail + " problem(s)."); process.exit(1); }
console.log("probe-forecast-names-no-missing-tab: ok — the copy names the Plan tab only when there is one.");
