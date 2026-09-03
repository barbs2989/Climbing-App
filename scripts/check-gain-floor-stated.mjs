#!/usr/bin/env node
/* A gain the route's OWN PINS say is impossible must not be quoted as a plan silently.
 *
 * A party on the summit that started at the trailhead has gained at least summit - trailhead, so
 * a `gain_ft` below that cannot be the trailhead-to-summit figure. The number is not decoration:
 * dbRouteToCamel maps it to gainM, scarfHrs() turns it into the approach estimate, and that feeds
 * Est. summit, Est. return and the After-dark warning. Measured on the live catalog: 87 WA routes,
 * median 0.44 hr understated, worst 3.59 hr - Rainier's Tahoma Glacier stores 5,007 ft against
 * 11,506 ft between its own two pins, and the Plan tab said nothing.
 *
 * WHY A GUARD RATHER THAN A COMMENT. audit:gain has reported this class for months and its own
 * entry says the DATA repair is per-route research, because "a transform would have to invent a
 * value". True, and it says nothing about the READER: stating what the row's own pins prove needs
 * no research at all. That distinction is the whole change, and a comment recording it would rot.
 *
 * THE NEGATIVES ARE THE POINT. A caveat on a route that is merely conservative, or on one using
 * the documented high-camp convention, is a false alarm on correct data - and this repo's own
 * history says a needle that flags correct work is one people learn to ignore.
 *
 * Static SSR (no browser, no DB), so it sits in `npm run build`.
 */
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-gainfloor-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

/* Shaped on wa_mount_rainier_tahoma_glacier: gain_ft 5007, pins 2900 -> 14406. gainM because
   dbRouteToCamel hands the app metres; the helper converts, and getting that backwards would
   silence the caveat catalog-wide. */
const route = (over) => Object.assign({
  id: "probe_gain", name: "Probe", grade: "Grade III", gradeSystem: "yds",
  discipline: "mountaineering", pitches: 4, distKm: 12, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
  gainM: 5007 / 3.28084,
  waypoints: [
    { n: 1, type: "Trailhead", name: "Road gate", elev: 2900, lat: 46.8, lng: -121.8 },
    { n: 2, type: "Summit", name: "True summit", elev: 14406, lat: 46.85, lng: -121.76 },
  ],
}, over || {});

let fail = 0;
const eq = (label, got, want) => {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};

const planOf = (r) => text(render(r, "planner"));

console.log("the Plan tab renders at all (so an ABSENT caveat is not vacuous)");
const base = planOf(route());
eq("ANCHOR: the plan tab rendered", base.length > 1500, true);
eq("ANCHOR: it is the planner", /Est\. return|Est\. summit/.test(base), true);

console.log("\na gain the route's own pins contradict is stated");
/* SCOPED TO THE SENTENCE, never the tab. `11,506 ft` is also the summit pin's own elevation in
   the waypoint list below, so a tab-wide `includes` for it PASSED with the caveat deleted -
   caught by injection, not by reading. Count inside the panel. */
const CAVEAT = /Lower bound — the recorded gain of ([^ ]+ (?:ft|m)) is less than the ([^ ]+ (?:ft|m)) between this route’s own trailhead and summit pins\. ([^]*?longer\.)/;
const cav = base.match(CAVEAT);
eq("the caveat renders", !!cav, true);
eq("...quoting the RECORDED gain", cav ? cav[1] : null, "5,007 ft");
/* 11,047 not 11,506: the fixture's 4 pitches account for ~459 ft, and the sentence is about
   the WALK. Quoting the whole-outing rise beside a claim about the approach would overstate
   it by exactly the climbing vertical. */
eq("...and the pin-derived rise, NET of the climbing", cav ? cav[2] : null, "11,047 ft");
eq("...and saying which one the times used", /figured on the smaller number/.test(cav ? cav[3] : ""), true);

console.log("\nand must NOT fire on correct data");
/* Conservative is fine: too much gain is possible, because a real route rolls over bumps its
   endpoints cannot see. Only too little is impossible. */
eq("a gain ABOVE the pin rise is silent", /trailhead and summit pins/.test(planOf(route({ gainM: 13000 / 3.28084 }))), false);
eq("a gain equal to the rise is silent", /trailhead and summit pins/.test(planOf(route({ gainM: 11506 / 3.28084 }))), false);
/* The documented convention - the gain is measured from a point the row RECORDS. audit:gain
   excludes these and so must this, or the caveat accuses 24 correct routes. */
eq("a recorded high camp at the implied start is silent", /trailhead and summit pins/.test(planOf(route({
  waypoints: route().waypoints.concat([{ n: 3, type: "Campsite", name: "High camp", elev: 9399, lat: 46.83, lng: -121.78 }]),
}))), false);
/* ...AND THE SAME CAMP RECORDED IN `bivy` RATHER THAN `waypoints`, which is where most of them
   live. The predicate read ONLY waypoints, so 12 of the 49 routes that fire on the live catalog
   were being told their correct gain was impossible - a quarter of them. The worst was
   wa_mount_rainier_tahoma_glacier: the caveat claimed it 6,499 ft short while the row records a
   camp at 9,440 ft, 41 ft from the implied start; wa_south_ridge_6 matched to the FOOT. A false
   warning is how a real one stops being read. Measured A/B: 49 -> 37, and the 12 go to 0.
   The fixture is the WHOLE-ROW shape - dbRouteToCamel spreads the raw row, so `bivy` reaches the
   app beside `waypoints`, and campSites() already merges the same two stores for CAMPING. */
eq("a high camp recorded in BIVY is equally silent", /trailhead and summit pins/.test(planOf(route({
  bivy: [{ name: "Emerald Ridge camp", elev: 9399 }],
}))), false);
/* ...but a bivy at some OTHER height must not silence it, or the widening would excuse any route
   that happens to record a camp anywhere. */
eq("a bivy far from the implied start still fires", /trailhead and summit pins/.test(planOf(route({
  bivy: [{ name: "Valley camp", elev: 3200 }],
}))), true);
/* THE CLIMBING VERTICAL IS CREDITED FIRST, and this is the case that corrects #1353 as merged.
   `scarfHrs` is the HIKE leg and `techHrs` the climbing leg, so `gain_ft` is the APPROACH gain,
   not trailhead-to-summit. A route whose pitch count alone explains the gap has a perfectly
   plausible gain and must NOT be accused: wa_liberty_traverse is 26 pitches over a 2,520 ft rise,
   so the walk accounts for none of it. Measured on the live catalog, this is the difference
   between 87 routes flagged and 51 — 36 of them were false. */
eq("pitches account for the gap -> silent", /trailhead and summit pins/.test(planOf(route({
  gainM: 2001 / 3.28084, pitches: 26,
  waypoints: [
    { n: 1, type: "Trailhead", name: "TH", elev: 3000, lat: 46.8, lng: -121.8 },
    { n: 2, type: "Summit", name: "Summit", elev: 5520, lat: 46.85, lng: -121.76 },
  ],
}))), false);
eq("...and the SAME route with no pitches is still stated", /trailhead and summit pins/.test(planOf(route({
  gainM: 2001 / 3.28084, pitches: 0,
  waypoints: [
    { n: 1, type: "Trailhead", name: "TH", elev: 3000, lat: 46.8, lng: -121.8 },
    { n: 2, type: "Summit", name: "Summit", elev: 5520, lat: 46.85, lng: -121.76 },
  ],
}))), true);
eq("no pins -> silent", /trailhead and summit pins/.test(planOf(route({ waypoints: null }))), false);
eq("no summit pin -> silent", /trailhead and summit pins/.test(planOf(route({
  waypoints: [{ n: 1, type: "Trailhead", name: "Road gate", elev: 2900, lat: 46.8, lng: -121.8 }],
}))), false);
eq("no gain -> silent (that is the MISSING-input note's job)", /trailhead and summit pins/.test(planOf(route({ gainM: null }))), false);
/* 300 ft is the audit's own slack for rounding between two records, not a fresh threshold.
   MEASURED NOTE, so nobody contrives a case for it: near the boundary the slack rule and the
   recorded-start rule COINCIDE by construction. implied = summit - gain, so as gain approaches
   the rise the implied start approaches the trailhead pin - which is recorded. Breaking the
   slack alone therefore leaves these two silent, and injection 2 fails only on the
   above-the-rise case. Each rule is pinned by its own injection instead. */
eq("inside the 300 ft slack -> silent", /trailhead and summit pins/.test(planOf(route({ gainM: 11300 / 3.28084 }))), false);

console.log(fail
  ? `\ncheck:gain-floor-stated: ${fail} FAILURE(S)`
  : "\ncheck:gain-floor-stated: ok — a gain the route's own pins contradict is stated, and correct data stays quiet.");
process.exit(fail ? 1 : 0);
