// Does a route's own avalanche ratings reach the screen when its AREA has no forecast zone?
//
// The panel was gated `mountain && mountain.avyZone && avyRelevant` while the ratings live on the
// ROUTE, so 146 of 184 avy-relevant routes carrying real month-by-month ratings rendered nothing.
// Chair Peak's north face has twelve months of them.
//
// FOUR CASES, and the last two are the ones that keep the fix honest. Widening a safety panel's
// gate is the direction where being wrong SHOWS AN AVALANCHE FORECAST WHERE THERE IS NONE, so a
// probe that only proved the panel appears would be certifying half the change.

import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
// RouteDetail reaches react-query hooks, so it needs a provider — and the library must be
// --external below, or esbuild inlines its own copy and this provider is a different module
// instance with a different context ("No QueryClient set" with a provider plainly in place).
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = path.join(ROOT, `.avy-${process.pid}.mjs`);
const clean = () => fs.rmSync(out, { force: true });
let failures = 0, cases = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const dead = (w) => { console.error(`\nprobe FAILED — ${w}. Nothing below was checked.\n`); clean(); process.exit(1); };

try {
  execFileSync("npx", ["esbuild", path.join(ROOT, "RouteDetail.jsx"),
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic", "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch { dead("esbuild could not bundle RouteDetail.jsx"); }

const mod = await import(out + "?t=" + Date.now());
const RouteDetail = mod.default || mod.RouteDetail;
if (typeof RouteDetail !== "function") dead("RouteDetail.jsx has no default export — ANCHOR LOST");

// The prop set check:bare uses; a short list throws with a message that reads like a bad row.
// LIFTED FROM check:bare's fixture rather than guessed: several props are indexed by route id
// (hzVotes[route.id] and friends), so a short list throws "Cannot read properties of undefined",
// which reads like a bad row rather than a bad harness.
const noop = () => {};
const base = {
  onBack: noop, onSubTab: noop, contribs: [], myReports: [], connections: [], comments: {},
  hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {}, crewsForRoute: [], myStars: {},
  presence: null,
};
const ZONE_PROSE = "NWAC West Slopes North is the nearest forecast zone, but NWAC's daily avalanche forecast does not run during this route's July-September climbing season.";
const route = (over) => ({
  id: "probe", name: "Probe", grade: "5.6", gradeSystem: "yds", pitches: 4,
  discipline: "alpine", mountainId: "probe_area",
  // The case under test: a real area that carries NO avy_zone.
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
  seasonalHazards: { avalanche: { zone: ZONE_PROSE, byMonth: { January: "Considerable", June: "Moderate", July: "N/A" } } },
  ...over,
});

function render(r) {
  try {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, { ...base, route: r, initialSubTab: "safety" })));
  } catch (e) { dead("RouteDetail threw: " + (e && e.message)); }
}

const m = render(route());
if (m.length < 2000) dead(`the Safety tab rendered only ${m.length} characters`);

cases++;
if (m.includes("AVALANCHE FORECAST")) ok("an area with no avy_zone still shows the panel from the route's own ratings");
else fail("the panel is still hidden when the area has no avy_zone — the gate did not move");

cases++;
if (m.includes("Considerable") && m.includes("Moderate")) ok("the month ratings reach the screen");
else fail("the month grid does not render");

// The zone field is PROSE (p50 128 chars, max 327), so it must not land in the label slot.
cases++;
if (m.includes("Forecast coverage:")) ok("the route's coverage prose renders as prose, under the grid");
else fail("the route's zone text does not render at all");

// A route whose avalanche is declared N/A on every month, with no area zone, must show NOTHING.
cases++;
const na = render(route({ seasonalHazards: { avalanche: { zone: "N/A - non-glaciated summer alpine rock route", byMonth: { July: "N/A", August: "N/A" } } } }));
if (!na.includes("AVALANCHE FORECAST")) ok("all-N/A ratings and no area zone: no panel invented");
else fail("a panel appeared for a route whose every month is N/A — the gate is too wide");

// And a route with no avalanche data at all.
cases++;
const none = render(route({ seasonalHazards: {} }));
if (!none.includes("AVALANCHE FORECAST")) ok("no avalanche data and no area zone: no panel");
else fail("a panel appeared for a route with no avalanche data");

clean();
if (cases < 5) dead(`only ${cases} case(s) ran`);
console.log(`\nprobe-avalanche-panel-renders: ${cases} case(s), ${failures} failure(s)  [${m.length}ch]`);
process.exit(failures ? 1 : 0);
