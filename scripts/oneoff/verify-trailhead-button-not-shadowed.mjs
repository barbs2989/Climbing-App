// A Trailhead waypoint with NO coordinate suppressed the "Directions to crag" button on routes
// whose approach_logistics carried a perfectly good one.
//
// RouteDetail picked the trailhead by TYPE ALONE:
//
//   const th = waypoints.find(w => wpIs(w,"Trailhead"))     // <- matches an UNCOORDINATED pin
//           || (al.trailheadLat!=null ? {...} : null)       // <- so this never gets a chance
//           || waypoints.find(w => w.lat!=null && /trailhead|parking/.test(w.name));
//   if (!th || th.lat == null) return null;                 // <- and then it bails out
//
// `||` short-circuits on the first TRUTHY value and an object with `lat:null` is truthy, so the
// fallback that exists precisely for this case could not fire. Three WA routes are affected:
// wa_mount_adams_mazama_glacier_headwall, wa_vesper_peak_north_face_ragged_edge, wa_west_face_2.
//
// Vesper proves it is a READER bug rather than a data one: the pin and the approach_logistics
// entry name the SAME trailhead ("Sunrise Mine Trailhead"), and only the pin lacks coordinates.
//
// WHAT THIS CAN AND CANNOT ASSERT. Both directions IIFEs are `onClick={()=>window.open(url)}`,
// and renderToStaticMarkup DOES NOT SERIALISE onClick — the URL is in a closure, not an
// attribute. So the destination is invisible here and only the button's PRESENCE is observable.
// The first draft asserted on `destination=` and reported failures that were purely an artifact of
// that; the same "fault is out of frame" shape the repo already records. Assert presence, and
// never claim this file verifies where the button points.
//
// Renders the real RouteDetail. No DB, no browser.
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { build } from "esbuild";
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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-th-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

/* The button under test is the cragOnly one on Overview, so the fixture is `trad`. The Plan tab's
   trailhead link is a different surface (TrailheadCard, an <a href>) with the OPPOSITE priority —
   it reads approach_logistics first — and is not what this file is about. */
const route = (waypoints, approachLogistics) => ({
  id: "probe_th", name: "Probe", grade: "5.8", gradeSystem: "yds",
  discipline: "trad", pitches: 4, mountainId: "probe_area",
  approach: "Walk uphill.", waypoints, approachLogistics,
  _dbArea: { id: "probe_area", name: "Probe Crag", areaType: "crag", region: "Washington" },
});

// Lifted from wa_vesper_peak_north_face_ragged_edge, verbatim in shape.
const UNCOORDINATED = [{ type: "Trailhead", name: "Sunrise Mine Trailhead (Trail No. 707)", lat: null, lng: null }];
const COORDINATED = [{ type: "Trailhead", name: "Sunrise Mine Trailhead", lat: 48.0239, lng: -121.4742 }];
const LOGISTICS = { trailhead: "Sunrise Mine Trailhead (Trail #707, FR-4065)",
  trailheadLat: 48.02388889, trailheadLng: -121.4741444 };

let failures = 0;
const fail = m => { console.log("  FAIL  " + m); failures++; };
const ok = m => console.log("  ok    " + m);
const BTN = "Directions to crag";
const shows = (wp, al) => render(route(wp, al), "overview")
  .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").includes(BTN);

shows(UNCOORDINATED, LOGISTICS)
  ? ok("an uncoordinated pin no longer shadows approach_logistics — the button renders")
  : fail("a Trailhead pin with lat:null still suppresses the button; the fallback never fires");

shows(COORDINATED, LOGISTICS)
  ? ok("a coordinated pin still produces the button")
  : fail("the button vanished for a route with a perfectly good pin — the fix broke the normal case");

shows([], LOGISTICS)
  ? ok("no pin at all still falls through to approach_logistics")
  : fail("approach_logistics alone no longer produces a button");

shows(UNCOORDINATED, null)
  ? fail("a directions button rendered with no usable coordinate anywhere")
  : ok("no coordinate anywhere -> no button, rather than a broken one");

/* Guard against a vacuous pass: if the anchor text ever moves, every `shows()` above returns false
   and the emptiness assertions would still read green. */
shows(COORDINATED, null) || fail(`ANCHOR LOST — "${BTN}" renders on no fixture; the assertions above proved nothing`);

console.log(failures ? `\n${failures} failure(s)` : "\nok — the fallback is reachable and the normal case is unchanged");
process.exit(failures ? 1 : 0);
