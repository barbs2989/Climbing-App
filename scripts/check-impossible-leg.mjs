#!/usr/bin/env node
/* A LEG CANNOT BE SHORTER THAN THE STRAIGHT LINE BETWEEN ITS OWN TWO PINS, and the route page
 * was printing 473 that are.
 *
 * The waypoint list renders "N.N mi from last" between consecutive pins, computed as
 * `wp.distMi - prev.distMi`. Measured THROUGH THE HYDRATION THE APP USES — `normalizeWaypoints`
 * then `tidyWaypoints`, which reorders and de-duplicates, so the raw array order is not what
 * renders — 473 of 2,405 printed legs on 261 routes are smaller than the great-circle distance
 * between the two pins they span — `wa_luna_glacier` prints **0.0 mi**
 * for a leg whose pins are 14.2 miles apart, `wa_lizard_mountain_south_route` prints 3.7 mi for
 * one that is 16.3. Impossible rather than suspicious: no prose and no judgement are needed.
 *
 * IT IS THE PER-LEG FORM OF audit:waypoint-distances, WHICH IS WHY IT IS BIGGER. That audit
 * measures the CUMULATIVE distance from the trailhead and reports 211 pins on 118 routes; a
 * route can be clean cumulatively and still print an impossible leg, and its skip rules
 * (placeholder coordinates, a distMi that does not start at 0, a non-monotonic list) put ~360
 * routes out of its frame that still render a leg distance here.
 *
 * THE HONEST ANSWER IS NO NUMBER, NOT A DIFFERENT ONE. Substituting the straight line is
 * forbidden for the reason `campDistMi` already records in core — a chord is not a trail
 * distance — and it would trade a number a climber can see is wrong for one they cannot. The
 * elevation change on the same row is untouched; only the mileage goes.
 *
 * 20% OF PRINTED LEG DISTANCES DISAPPEAR, and the shape of that is measured: 23 routes lose
 * EVERY leg distance and 16 of those have only ONE leg; three lose 6-7, and they are the badly
 * broken rows audit:waypoint-distances already reports. The other 238 lose some and keep the
 * rest. Suppression is proportionate rather than a blanket.
 *
 * PURELY GEOMETRIC, so it needs no knowledge of which convention the row uses. 57 of 653 WA
 * routes store a `distMi` that is not cumulative from the trailhead, where the app's own
 * subtraction is meaningless anyway; this catches those without a second rule.
 *
 * WHAT IT DOES NOT COVER, stated rather than implied: the BAIL-POINT rows in SafetyMatrix take
 * the same `cumMi` treatment, and no fixture here reaches them — those rows need a route carrying
 * bail data, and this guard's fixtures do not. `cumMi` is executed directly, so the rule is
 * proven; what is unproven is that THAT call site is wired. Treat it as covered by
 * `check:dead-props` and by review, not by this.
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
export { legMi, cumMi } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
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

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-legmi-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render, legMi, cumMi } = require_(out);
for (const [n, f] of [["legMi", legMi], ["cumMi", cumMi]]) if (typeof f !== "function") { console.error(`check:impossible-leg: ${n} is not exported from ClimbMatchCore.jsx`); process.exit(1); }

const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

let fail = 0;
const eq = (label, got, want) => {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};

/* Two pins ~4.3 mi apart (0.0625 deg of latitude is 4.32 mi), so a stored leg of 0.5 mi is
   impossible and one of 6 mi is a perfectly ordinary switchbacking approach. */
const A = { lat: 47.0, lng: -121.0 }, B = { lat: 47.0625, lng: -121.0 };
const pin = (over) => Object.assign({ type: "Junction", name: "Pin", elev: 4000, lat: A.lat, lng: A.lng }, over);

console.log("legMi, executed directly");
eq("an impossible leg returns null", legMi(pin({ distMi: 0 }), pin({ distMi: 0.5, lat: B.lat, lng: B.lng })), null);
eq("a possible leg returns the stored difference", legMi(pin({ distMi: 0 }), pin({ distMi: 6, lat: B.lat, lng: B.lng })), 6);
/* One-sided: a leg LONGER than the chord is every real trail, and flagging it would suppress
   almost every distance on the site. */
eq("a leg far longer than the chord is kept", legMi(pin({ distMi: 0 }), pin({ distMi: 40, lat: B.lat, lng: B.lng })), 40);
eq("a leg equal to the chord is kept", Math.round(legMi(pin({ distMi: 0 }), pin({ distMi: 4.32, lat: B.lat, lng: B.lng }))), 4);
/* An UNPLACED pin cannot contradict anything, so the stored number stands. Suppressing it would
   remove a distance from every route whose pins carry no coordinate. */
eq("an unplaced pin leaves the distance alone", legMi(pin({ distMi: 0, lat: null, lng: null }), pin({ distMi: 0.5, lat: B.lat, lng: B.lng })), 0.5);
eq("a missing distMi is still null", legMi(pin({ distMi: null }), pin({ distMi: 0.5, lat: B.lat, lng: B.lng })), null);
/* The app prints Math.abs(segMi), and 3 WA routes store a backwards pair. The magnitude is what
   has to be possible; the ordering is audit:waypoint-order's subject. */
eq("a backwards pair is judged on its magnitude", legMi(pin({ distMi: 6 }), pin({ distMi: 0, lat: B.lat, lng: B.lng })), 6);

const route = (wps) => ({
  id: "probe_leg", name: "Probe", grade: "Grade III", gradeSystem: "yds",
  discipline: "mountaineering", pitches: 4, distKm: 12, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
  waypoints: wps,
});
const WPS = (mi) => [
  { n: 1, type: "Trailhead", name: "Road gate", elev: 3000, lat: A.lat, lng: A.lng, distMi: 0 },
  { n: 2, type: "Summit", name: "True summit", elev: 7000, lat: B.lat, lng: B.lng, distMi: mi },
];
const planOf = (wps) => text(render(route(wps), "planner"));

console.log("\non screen");
const good = planOf(WPS(6));
eq("ANCHOR: the waypoint list rendered", /from last/.test(good), true);
eq("a possible leg prints its distance", /6(\.0)? mi from last/.test(good), true);
const bad = planOf(WPS(0.5));
eq("an impossible leg prints NO distance", /mi from last/.test(bad), false);
/* The elevation on the same row is a different record and is not in question. Dropping it with
   the mileage would be the changing-which-record-wins failure this repo records elsewhere. */
eq("...and the elevation on that row survives", /4,000 ft|4000 ft/.test(bad), true);
eq("...and the row itself still renders", /True summit/.test(bad), true);

/* AND THE WAYPOINT ROW'S OWN CUMULATIVE DISTANCE, which is a third surface printing the same
   contradiction: 197 of the 2,567 cumulative distances the list prints are less than the straight
   line from the route's own trailhead pin, across 112 routes. `cumMi` is `legMi` applied with the
   trailhead as the previous pin — the trailhead's distMi is 0 by convention, so the difference IS
   the cumulative distance and there is one rule rather than a second copy of it. */
console.log("\ncumMi, executed directly");
const th0 = pin({ type: "Trailhead", name: "Road gate", distMi: 0 });
const far = pin({ name: "Camp", distMi: 6, lat: B.lat, lng: B.lng });
const near = pin({ name: "Camp", distMi: 0.5, lat: B.lat, lng: B.lng });
eq("a possible cumulative distance stands", cumMi([th0, far], far), 6);
eq("an impossible one is null", cumMi([th0, near], near), null);
/* A route with no trailhead pin has nothing to contradict, so the number stands. */
eq("no trailhead pin leaves it alone", cumMi([near], near), 0.5);
/* The trailhead compared against ITSELF is a zero-length leg, which must not read as impossible. */
eq("the trailhead's own row is untouched", cumMi([th0, far], th0), 0);

console.log("\nthe waypoint row prints no cumulative distance it cannot support");
const rowBad = planOf([
  { n: 1, type: "Trailhead", name: "Road gate", elev: 3000, lat: A.lat, lng: A.lng, distMi: 0 },
  { n: 2, type: "Junction", name: "Notch", elev: 5000, lat: B.lat, lng: B.lng, distMi: 0.5 },
]);
eq("ANCHOR: the row rendered", /Notch/.test(rowBad), true);
eq("...and prints no impossible cumulative distance", /0\.5 mi/.test(rowBad), false);

/* THE SAME RULE ON THE WHOLE WALK IN. A campsite's distMi is cumulative from the trailhead, so
   CAMPING & BIVY cannot print a number smaller than the straight line from the trailhead pin
   either — 35 of the 412 it prints were. It matters more there than in the leg list: this is the
   number a party uses to decide whether they can reach camp on day one. */
console.log("\nand the same rule on a campsite's whole walk in");
const CAMP = (mi) => [
  { n: 1, type: "Trailhead", name: "Road gate", elev: 3000, lat: A.lat, lng: A.lng, distMi: 0 },
  { n: 2, type: "Campsite", name: "Basin camp", elev: 5000, lat: B.lat, lng: B.lng, distMi: mi },
  { n: 3, type: "Summit", name: "True summit", elev: 7000, lat: B.lat, lng: B.lng, distMi: mi + 1 },
];
const campOf = (wps) => text(render(route(wps), "planner"));
const okCamp = campOf(CAMP(6));
eq("ANCHOR: the camping panel rendered", /CAMPING &amp; BIVY|CAMPING & BIVY/.test(okCamp), true);
eq("a possible camp distance prints", /6(\.0)? mi/.test(okCamp), true);
const badCamp = campOf(CAMP(0.5));
eq("an impossible camp distance prints NO distance", /0\.5 mi/.test(badCamp), false);
/* The elevation and the gain from the trailhead are separate records and are not in question. */
eq("...and the camp's elevation survives", /5,000 ft|5000 ft/.test(badCamp), true);
eq("...and the camp row itself still renders", /Basin camp/.test(badCamp), true);

console.log(fail
  ? `\ncheck:impossible-leg: ${fail} FAILURE(S)`
  : "\ncheck:impossible-leg: ok — no leg distance is printed that its own two pins make impossible.");
process.exit(fail ? 1 : 0);
