// The Plan tab's published-times panel was headed "PUBLISHED TIMES · CAR-TO-CAR" — hardcoded on
// every route carrying a `timing` object. Measured over the 1,005 WA routes that have one, 404
// contradict it in their own words and only 217 support it.
//
// This renders the real RouteDetail over a route whose timing plainly describes an overnight, and
// asserts the heading no longer claims car-to-car WHILE the times themselves still render. The
// second half is what stops the fix being "delete the panel": a heading that lost its numbers
// would satisfy the first assertion on its own.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from "${path.join(ROOT, "RouteDetail.jsx")}";
const noop = () => {};
export function render(route) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: "planner", onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-pt-")), "b.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);
const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&")
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/\s+/g, " ");

// The shape Mount Stuart's North Ridge actually carries: a two-day plan with a bivy.
const OVERNIGHT_ROUTE = {
  id: "probe_stuart", name: "North Ridge (probe)", grade: "5.9", gradeSystem: "yds",
  discipline: "alpine", pitches: 20, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Peak", areaType: "peak", region: "Washington" },
  timing: {
    recommendedStart: "5:30 AM from camp",
    approachTimeHrs: 12, summitTimeHrs: 11, totalHrs: 23,
    sectionBreakdown: [
      { section: "Approach", fromTo: "Approach and climb to a bivy below the Gendarme", hrs: 12, note: "ZZAPPROACHNOTEZZ" },
      { section: "Climb", fromTo: "Finish the ridge to the summit", hrs: 11 },
    ],
  },
};

const html = render(OVERNIGHT_ROUTE);
const t = text(html);

// ── 0. The probe must be able to fail.
if (!t.includes("PUBLISHED TIMES")) {
  console.log("  FAIL  ANCHOR LOST: the published-times panel did not render at all. Nothing below was checked.");
  process.exit(1);
}
ok("the published-times panel renders");

// ── 1. It no longer asserts a trip style the row contradicts.
//    ASSERTED ON THE HEADING ELEMENT, not the page. The Plan tab legitimately says "car-to-car"
//    elsewhere — "Add the day-by-day timing — approach, camps, car-to-car — to help the next
//    party" is an invitation to contribute, and a whole-page regex fails on it. (It did: that is
//    the fourth time in one day I have read a screen where I meant an element.)
const HEAD = />PUBLISHED TIMES(?:[^<]*)</.exec(html);
if (!HEAD) fail("the PUBLISHED TIMES heading element is not in the markup — it was renamed, so nothing below was checked");
else if (/CAR-?TO-?CAR/i.test(HEAD[0])) fail("the heading still claims CAR-TO-CAR over a plan that starts from camp and climbs to a bivy: " + JSON.stringify(HEAD[0]));
else ok("the heading makes no car-to-car claim: " + JSON.stringify(HEAD[0].replace(/[<>]/g, "")));

// ── 2. …and the panel still says what it is for. Dropping the numbers would satisfy 1 alone.
const nums = ["12 hr", "11 hr", "23 hr"].filter((n) => t.includes(n));
if (nums.length === 3) ok("the published times still render: " + nums.join(", "));
else fail("the panel lost its times (" + nums.length + "/3 present) — the fix deleted the thing it was meant to label");

if (t.includes("5:30 AM from camp")) ok("the row's own recommended start is still on screen, which is where the trip style now comes from");
else fail("the recommended start is gone, so nothing conveys the trip style any more");

if (t.includes("ZZAPPROACHNOTEZZ")) ok("the section breakdown still renders");
else fail("the section breakdown is gone");

console.log(failures ? `\n${failures} assertion(s) failed.` : "\nok — the panel reports the published times without asserting how they were done.");
process.exit(failures ? 1 : 0);
