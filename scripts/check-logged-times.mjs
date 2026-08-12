// check:logged-times — a climber's logged time must reach the planner.
//
// WHY THIS NEEDS ITS OWN GUARD. The "what parties actually took" panel renders only when
// somebody has logged a real number of minutes, and NO existing guard ever puts the app in
// that state:
//
//   * check:bare renders a route with no enrichment and no activity — panel correctly absent.
//   * check:ui walks the seeded demo, whose `cond.carToCar` is PROSE ("7 hr", "3 days",
//     "Turned around"). Prose is deliberately ignored, so the panel never appears there either.
//   * check:zero walks an empty account. Nothing logged, nothing to show.
//   * check:field-renders covers `routes` columns; these are `climb_logs` columns.
//
// So the feature would be invisible to the entire suite — the shape check:anniversary exists
// for, where a surface nothing exercises breaks silently and stays broken. It is also the
// `descent_text` shape one level over: a column populated and rendered nowhere, which nothing
// notices because every guard asks whether data EXISTS, not whether it arrives on screen.
//
// Renders the real RouteDetail with react-dom/server, so it proves the path end to end without
// a browser or a database: fast, deterministic, and safe to sit in `npm run build`.
//
// Effects do not run under renderToStaticMarkup — never assert on anything animated.
import { build } from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appSources } from "./lib/guard-sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = "check:logged-times";
appSources(ROOT, GUARD);

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route, tab, myReports) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: tab, onBack: noop, onSubTab: noop,
        contribs: [], myReports: myReports || [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-logged-times-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = await import(out);

// Alpine, because the Calculator is gated on !cragOnly. A crag route has no time-to-summit
// panel at all, so probing one would assert the absence of something that was never there.
const ROUTE = {
  id: "guard_logged_times", name: "Guard Route", grade: "5.8", pitches: 4,
  mountainId: "guard_area", discipline: "alpine", distKm: 10, gainM: 1200, lossM: 1200,
};
const HEADING = "WHAT PARTIES ACTUALLY TOOK";
const REPORTS = [
  { user: "A", date: "2026-07-01", tickType: "Summit", cond: { carToCarMin: 540 } },
  { user: "B", date: "2026-07-02", tickType: "Summit", cond: { carToCarMin: 600 } },
  { user: "C", date: "2026-07-03", tickType: "Summit", cond: { carToCarMin: 900, approachMin: 150 } },
  { user: "D", date: "2026-07-04", tickType: "Turned around", cond: { carToCarMin: 60 } },
];

let fails = 0;
const ck = (label, cond) => { console.log("  " + (cond ? "ok  " : "FAIL") + "  " + label); if (!cond) fails++; };

const withTimes = render(ROUTE, "planner", REPORTS);
if (!withTimes || withTimes.length < 400) {
  console.error(`\n${GUARD} FAILED — the route page rendered ${withTimes ? withTimes.length : 0} chars.`);
  console.error("Nothing below was actually checked.\n");
  process.exit(1);
}
ck("the panel renders when a time is logged", withTimes.includes(HEADING));
ck("median car-to-car is shown", withTimes.includes("10h car-to-car"));
ck("the spread is shown, not just a point", withTimes.includes("9h") && withTimes.includes("15h"));
// The count is the honesty check: a turned-around party covered real ground but did not
// produce a car-to-car for the ROUTE, so counting it would understate the route every time.
ck("a turned-around party is excluded from the count", withTimes.includes("Median of 3 logged trips"));
ck("per-leg median reaches the screen", withTimes.includes("approach 2h 30m"));

// Ordering is a claim about authority: measured reality above the formula that predicts it.
const iT = withTimes.indexOf(HEADING), iM = withTimes.indexOf("Scarf");
ck("evidence sits ABOVE the model", iT > -1 && iM > -1 && iT < iM);

const one = render(ROUTE, "planner", [{ user: "A", date: "2026-07-01", tickType: "Summit", cond: { carToCarMin: 480 } }]);
ck("a single report says so, and is not pluralised", one.includes("Median of 1 logged trip") && !one.includes("logged trips"));

const none = render(ROUTE, "planner", []);
ck("no logged time means no panel, not an empty state", !none.includes(HEADING));
ck("the estimate still renders without any logs", none.includes("Scarf"));

// The whole reason numeric minutes exist as a separate field. If this ever passes, something
// started parsing English durations and the number on screen is fiction.
const prose = render(ROUTE, "planner", [{ user: "A", date: "2026-07-01", tickType: "Summit", cond: { carToCar: "3 days" } }]);
ck("PROSE carToCar never fabricates a number", !prose.includes(HEADING));

if (fails) {
  console.error(`\n${GUARD} FAILED — ${fails} assertion(s).`);
  console.error("A climber's logged time is collected, shared with other climbers since #787,");
  console.error("and is meant to appear on the planner above the estimate. Check that Calculator");
  console.error("still receives `activity`, and that dbReports still carries `carToCarMin`.\n");
  process.exit(1);
}
console.log(`\n${GUARD}: ok — logged times reach the planner, and prose never becomes a number.`);

// ---- injection cases -----------------------------------------------------------------
//   1. Stop passing `activity` to <Calculator>        -> fails; the panel disappears.
//      (check:dead-props also catches this one, from the other direction.)
//   2. Drop `cond.carToCarMin` from the dbReports map -> other climbers' totals vanish; this
//      still passes on myReports alone, which is why the DB mapping keeps its own comment.
//   3. Count non-completion ticks in the total        -> fails on the party count (4, not 3).
//   4. Parse the prose `carToCar`                     -> fails the last assertion.
//   5. Use a mean instead of a median                 -> fails "10h car-to-car" (mean is 11h).
