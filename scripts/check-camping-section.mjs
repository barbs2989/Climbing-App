#!/usr/bin/env node
// check:camping — CAMPING & BIVY must reach the Planner tab, on every discipline that can
// benight a party, and must merge its two stores into one section.
//
// Why this exists, and why a comment was not enough. This mount has ALREADY been silently
// lost once: it lived on a dense line, main changed the same line, and the merge kept main's
// copy — leaving the panel defined and rendered NOWHERE. Nothing caught it. check:dead-props
// sees props, not unmounted components; check:refs sees bindings, and every binding was fine;
// and `routes.bivy` was populated, so any data-coverage check looked healthy. The repair left
// a comment saying "confirm BIVY still reaches the screen", which is exactly the kind of
// semantic invariant this repo has learned rots. So it is asserted by rendering.
//
// It also pins the two things that were WRONG before 2026-08-13 and would otherwise regress
// quietly, because both look correct in isolation:
//   1. The panel sat on the SAFETY tab. Where you sleep is a planning decision; on Safety it
//      was behind a tab nobody opens for logistics.
//   2. SCRAMBLING was excluded from the gate. A scramble that overruns benights a party
//      exactly like an alpine route does.
//
// And it pins the MERGE: `route.bivy` and Campsite WAYPOINTS are two stores holding the same
// fact. Rendered apart, a route could show a camp pin under WAYPOINTS while this panel said
// nothing — two answers to one question.
//
// SSR, no browser and no DB, so it sits in `npm run build` and cannot flake.

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

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-camp-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

// renderToStaticMarkup ESCAPES: "CAMPING & BIVY" is emitted as "CAMPING &amp; BIVY".
// Un-escape before matching, or the heading reads as absent and a false NO looks like a
// real defect. Same helper shape as check:bare, for the same reason.
const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

const HEAD = "CAMPING & BIVY";
const route = (discipline, extra) => Object.assign({
  id: "probe_" + discipline, name: "Probe " + discipline, grade: "5.6", gradeSystem: "yds",
  discipline, pitches: 4, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
}, extra || {});

const SITE = { name: "Boston Basin", elev: 1890, capacity: "6 tents", water: "snowmelt", permit: "NPS permit", notes: "Toilet at the lower camp." };
const WP = { name: "Sahale Glacier Camp", type: "Campsite", lat: 48.48, lng: -121.06, elev: 2360, directions: "Above the moraine." };

// Every discipline that can benight a party. SCRAMBLING is the one that was missing.
const GATED = ["alpine", "mountaineering", "scrambling", "ice", "mixed"];
// catOf() folds `rock` into trad/sport, so these are the crag shapes that must NOT show it.
const CRAG = ["trad", "sport", "bouldering"];

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);
const has = (d, tab, extra) => text(render(route(d, extra), tab)).includes(HEAD);

// ── 0. The probe must be able to FAIL. If a fixture carrying camping data cannot produce the
//    heading on any tab, every assertion below is vacuous and the run proves nothing.
const anyTab = ["overview", "planner", "safety", "conditions"].some(t => has("alpine", t, { bivy: [SITE] }));
if (!anyTab) {
  console.log("  FAIL  ANCHOR LOST: a route WITH bivy data renders no '" + HEAD + "' on any tab.");
  console.log("        Either the heading was renamed or the panel is unmounted. Nothing below was checked.");
  process.exit(1);
}
ok("probe is live — a route with camping data renders the section somewhere");

// ── 1. It reaches the PLANNER tab, on every gated discipline.
for (const d of GATED) {
  if (has(d, "planner", { bivy: [SITE] })) ok(`${d}: renders on the Planner tab`);
  else fail(`${d}: CAMPING & BIVY does NOT reach the Planner tab`);
}

// ── 2. It LEFT the Safety tab, and never sat on Overview. Both directions matter: a panel on
//    two tabs double-renders, and #769 records the shape where "either mount" reads as fine.
for (const tab of ["safety", "overview"]) {
  if (has("alpine", tab, { bivy: [SITE] })) fail(`CAMPING & BIVY still renders on the ${tab} tab — it belongs only on Planner`);
  else ok(`not left behind on the ${tab} tab`);
}

// ── 3. Crag routes are not offered it. Camping on a sport pitch is noise.
for (const d of CRAG) {
  if (has(d, "planner", { bivy: [SITE] })) fail(`${d}: crag route should not render CAMPING & BIVY`);
  else ok(`${d}: correctly absent`);
}

// ── 4. THE MERGE. A Campsite waypoint with no `bivy` row must still produce the section —
//    this is the half that did not render at all before.
if (has("alpine", "planner", { waypoints: [WP] })) ok("a Campsite WAYPOINT alone produces the section");
else fail("a Campsite waypoint does not reach CAMPING & BIVY — the two stores are not merged");

// ── 5. Dedupe. A site recorded in BOTH stores must list once, not twice.
//    Count INSIDE the panel, not across the tab. The Planner also renders ROUTE TRACK and its
//    map legend, which name the same waypoint legitimately — a whole-tab count reads 2 for
//    correct code and sends you hunting a dedupe bug that is not there. (It did, on the first
//    run of this script.) The panel ends where the next section heading begins.
{
  const t = text(render(route("alpine", {
    bivy: [SITE], waypoints: [{ name: "Boston Basin", type: "Campsite", lat: 48.4, lng: -121.0 }],
  }), "planner"));
  const start = t.indexOf(HEAD);
  const after = t.indexOf("ROUTE TRACK", start);
  if (start < 0) fail("dedupe case: the panel did not render at all");
  else if (after < 0) fail("ANCHOR LOST: 'ROUTE TRACK' no longer follows the panel — this slice cannot be bounded");
  else {
    const panel = t.slice(start, after);
    const n = (panel.match(/Boston Basin/g) || []).length;
    if (n === 1) ok("a site held in both stores lists exactly once inside the panel");
    else fail(`a site held in both stores rendered ${n} times inside the panel (want 1) — dedupe is broken`);
  }
}

// ── 6. The count in the heading is the MERGED count, not either store's.
{
  const t = text(render(route("alpine", { bivy: [SITE], waypoints: [WP] }), "planner"));
  if (t.includes(HEAD + " · 2")) ok("the heading counts both stores (· 2)");
  else fail("the heading does not show the merged count of 2 — " + (t.match(/CAMPING & BIVY · \d+/) || ["no count found"])[0]);
}

// ── 7. No camping data anywhere → no section, and no crash.
if (has("alpine", "planner", {})) fail("a route with no camping data still renders the section");
else ok("no camping data renders no section");

console.log(failures
  ? `\ncheck:camping: ${failures} failure(s).`
  : "\ncheck:camping: ok — CAMPING & BIVY reaches the Planner tab and merges both stores.");
process.exit(failures ? 1 : 0);

// Injection-tested (re-run these after any change to the panel or its mount):
//   1. Delete the CampingPanel mount from the planner line   -> ANCHOR LOST, exits 1.
//   2. Drop "scrambling" from the gate                        -> case 1 fails naming scrambling.
//   3. Move the mount back to the safety line                 -> cases 1 and 2 both fail.
//   4. Make campSites() return only route.bivy                -> case 4 fails (waypoint half).
//   5. Remove the `seen` dedupe from campSites()              -> case 5 fails with 2 (want 1).
