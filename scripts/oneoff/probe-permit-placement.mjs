// Prove where the route's own permit renders, now that it has moved off Overview.
//
// The failure this guards against is not a crash — it is the permit rendering NOWHERE, or
// rendering in both places at once. Both look fine in a diff. Harness copied from
// scripts/check-bare-route.mjs so it mounts RouteDetail the same way the build gate does.
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { build } from "esbuild";

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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-permit-")), "bundle.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs", platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" }, outfile: out, logLevel: "error" });
const { render } = require_(out);

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? "  ok   " : "  FAIL ") + msg); if (!cond) fails++; };

const PERMIT = "Free self-issue Mount Baker Wilderness permit";
const base = {
  id: "probe", name: "Probe Route", grade: "5.8", gradeSystem: "yds", discipline: "alpine",
  pitches: 6, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
};

// ── 1. Permit WITH a link, on a route that also has an access block ──
const withAccess = { ...base, permits: PERMIT, permitUrl: "https://example.invalid/permit",
  access: { permit: "Mount Baker Climbing", land_manager: "U.S. Forest Service", parking_pass: "Northwest Forest Pass" } };
const ov = render(withAccess, "overview"), plan = render(withAccess, "planner");
console.log("\nPermit + link + access block");
ok(!ov.includes(PERMIT), "Overview no longer carries the permit");
ok(!ov.includes("example.invalid"), "Overview no longer carries the permit LINK");
ok(plan.includes(PERMIT), "Plan carries the permit");
ok(plan.includes("example.invalid"), "Plan carries the permit link");
ok(plan.includes("ACCESS &amp; REGULATIONS") || plan.includes("ACCESS & REGULATIONS"), "…and the access panel is what is on screen");
// It must appear ONCE. Rendering in both the row list and the link is the duplicate case.
ok(plan.split(PERMIT).length - 1 === 1, "appears exactly once, not once as a row and once as a link");

// ── 2. Permit with NO link — must still be a labelled row, not a bare grey line ──
const noUrl = { ...base, permits: PERMIT, access: { land_manager: "U.S. Forest Service" } };
const plan2 = render(noUrl, "planner");
console.log("\nPermit, no link");
ok(plan2.includes(PERMIT), "Plan carries the permit text");
ok(plan2.includes("Permit details"), "…under a label saying what it is");
ok(!render(noUrl, "overview").includes(PERMIT), "Overview does not");

// ── 3. Permit but NO access block at all. This is the regression the gap gate could cause:
// every other row here comes from `access`, so an empty access object used to short-circuit
// to a GapNote — which would have swallowed the permit that just moved in. ──
const permitOnly = { ...base, permits: PERMIT, permitUrl: "https://example.invalid/permit" };
const plan3 = render(permitOnly, "planner");
console.log("\nPermit with an EMPTY access block");
ok(plan3.includes(PERMIT), "the permit survives when there is no access data around it");
ok(!plan3.includes("No access or permit information"), "does not claim there is no permit information");

// ── 4. Genuinely nothing: the gap note must still appear ──
const nothing = { ...base };
console.log("\nNo permit and no access");
ok(render(nothing, "planner").includes("No access or permit information"), "the gap note still fires when there really is nothing");

console.log(fails ? `\n${fails} FAILED` : "\nall assertions passed");
process.exit(fails ? 1 : 0);
