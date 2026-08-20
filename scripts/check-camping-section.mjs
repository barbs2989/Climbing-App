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
// Since the sites are COLLAPSED (8d) it pins both directions of that, because a disclosure has
// two ways to be wrong and only one of them is visible: prose still in the default view means
// nothing was shortened, and prose no longer SELECTED means the disclosure did not hide it, it
// deleted it — the `descent_text` shape, populated on 1,021 routes and rendered on none.
//
// WHAT IT CANNOT PROVE, stated rather than implied: that the tap works. SSR renders initial
// state and cannot click, so this asserts the data is selected and that a labelled control
// exists to reveal it. `check:clickable` holds announced-but-inert controls at ZERO and
// requires the Enter/Space triad, and the tap itself is driven in a real browser by
// scripts/oneoff/probe-camping-expand-onscreen.mjs — collapsed shows none of the prose, the
// control found BY ACCESSIBLE NAME reveals all four fields, and a second tap closes it again.
// Re-run that probe after any change to CampSite; it needs a dev server and Chrome, which is
// why it is not in this build gate.
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
import RouteDetail, { campDetail } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
export { campDetail };
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
const { render, campDetail } = require_(out);

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

// ── 7. TWO ELEVATION CONVENTIONS. Measured on the live catalog: of 175 bivy sites, 77 carry
//    `elev` (feet), 55 carry ONLY `elevM` (metres), 43 carry neither, and ZERO carry both.
//    uElev() takes feet, so reading `elev` alone rendered no elevation at all for 31% of
//    sites — present in the data, absent from the screen, and invisible to any coverage
//    check because the column is populated. Wing Lake is the real row: elevM 2103 = 6,900 ft.
{
  const t = text(render(route("alpine", { bivy: [{ name: "Wing Lake", elevM: 2103 }] }), "planner"));
  if (/6,9\d\d ft/.test(t)) ok("a site carrying only elevM renders its elevation in feet");
  else fail("elevM-only site rendered no usable elevation — " + (t.match(/Wing Lake[^☾]{0,40}/) || ["not found"])[0]);
  // And feet must NOT be re-converted: 5900 ft stays 5,900, not 19,357.
  const f = text(render(route("alpine", { bivy: [{ name: "Glacier Basin camp", elev: 5900 }] }), "planner"));
  if (f.includes("5,900 ft")) ok("a site carrying elev (feet) is not double-converted");
  else fail("feet were mangled — " + (f.match(/Glacier Basin camp[^☾]{0,40}/) || ["not found"])[0]);
}

// ── 8. `type` (camp | bivy | hut on 77 of 175 sites) is the one field that says WHICH of the
//    two merged things a row is, so it must reach the screen.
{
  const t = text(render(route("alpine", { bivy: [{ name: "Sulphide camp", type: "camp" }, { name: "Notch bivy", type: "bivy" }] }), "planner"));
  if (t.includes("Camp") && t.includes("Bivy")) ok("site `type` renders as a chip");
  else fail("site `type` does not reach the screen");
  // `camp` must NOT be labelled "Established camp": dispersed basin sites and developed
  // campgrounds share that type, so the stronger word is a false claim on every dispersed one.
  if (!t.includes("Established camp")) ok("`camp` is labelled neutrally, not as 'Established camp'");
  else fail("a dispersed site would be labelled 'Established camp' — overclaims what it is");
}

// ── 8b. The "also a pin on the route track" line is CONDITIONAL. Only 4 of 175 catalog sites
//    carry coordinates, so stating it unconditionally sends climbers looking for absent pins.
{
  const noCoord = text(render(route("alpine", { bivy: [{ name: "Basin camp" }] }), "planner"));
  if (!/pin under ROUTE TRACK/.test(noCoord)) ok("no track-pin claim when no site is on the track");
  else fail("claims sites are pinned on the track when none are");
  const onTrack = text(render(route("alpine", { waypoints: [WP] }), "planner"));
  if (/pin under ROUTE TRACK/.test(onTrack)) ok("the track-pin claim appears when a site IS on the track");
  else fail("a waypoint-derived site should say it is pinned on the track");
}

// ── 8c. THE CONTRIBUTED SHAPE RENDERS. `bivy` became contributable, and structuredVal() emits a
//    specific object per site: every text key present as a STRING (empty when the climber left it
//    blank) and `elev` as a number or null. That is not the shape enrichment writes — enrichment
//    omits keys it has nothing for. If the panel rendered empty chips for blank strings, every
//    contributed site would carry three or four blank pills, and no fixture built from enrichment
//    data would ever show it.
{
  const contributed = [{ name: "Climber's camp", type: "bivy", elev: null, capacity: "", water: "", permit: "", notes: "" }];
  const t = text(render(route("alpine", { bivy: contributed }), "planner"));
  const start = t.indexOf(HEAD), after = t.indexOf("ROUTE TRACK", start);
  if (start < 0) fail("a contributed-shape site did not render at all");
  else {
    const panel = t.slice(start, after > 0 ? after : start + 2000);
    if (panel.includes("Climber's camp")) ok("a site in the CONTRIBUTED shape renders");
    else fail("a site in the contributed shape did not render its name");
  }
  // Blank strings must produce no detail row. This USED to be a markup scan for "Water:" chips,
  // and the collapse silently made it vacuous — the chips are gone, so the count is 0 whatever
  // campDetail() does, and a broken selector would have read as a pass. Asked of the pure
  // function instead, where it is a real question again.
  const blank = campDetail({ name: "Climber's camp", capacity: "", water: "", permit: "", notes: "" });
  if (blank.length === 0) ok("blank contributed strings select no detail rows");
  else fail(`a blank contributed site produced ${blank.length} detail row(s): ${JSON.stringify(blank)}`);
}

// ── 8d. THE COLLAPSE. `capacity`, `water` and `permit` hold PROSE — median 130 / 136 / 297
//    characters on the live catalog, up to 1,386 — and they used to render as rounded chips,
//    which put a paragraph inside a pill on 5,001 / 5,008 / 5,020 of 5,083 sites. The panel ran
//    to 15,796 characters on one route, always fully expanded on a 390px phone.
//
//    Two directions, and BOTH matter. The prose must be out of the collapsed view (or nothing
//    was shortened) and it must still be SELECTED for display (or the disclosure did not hide
//    it, it deleted it — the `descent_text` shape: populated on 1,021 routes, rendered on none).
{
  const LONG = { name: "Prose camp", type: "camp", elev: 5000,
    capacity: "CAPACITY_PROSE about how many tents fit and where they sit relative to the moraine.",
    water: "WATER_PROSE about a melt stream that runs until late August and then stops entirely.",
    permit: "PERMIT_PROSE about a quota area that must be booked well in advance of the trip.",
    notes: "NOTES_PROSE about the walk in." };
  const t = text(render(route("alpine", { bivy: [LONG] }), "planner"));
  const start = t.indexOf(HEAD), after = t.indexOf("ROUTE TRACK", start + 1);
  const panel = t.slice(start, after > start ? after : start + 3000);

  const leaked = ["CAPACITY_PROSE", "WATER_PROSE", "PERMIT_PROSE", "NOTES_PROSE"].filter(k => panel.includes(k));
  if (!leaked.length) ok("prose fields are collapsed out of the default view");
  else fail(`the panel still renders prose before any tap: ${leaked.join(", ")} — the collapse is not doing its job`);

  // The name, the elevation and the type are the AUTHORED, STRUCTURED fields and must survive
  // the collapse — a row reduced to a chevron is not a summary.
  for (const [what, needle] of [["the site name", "Prose camp"], ["the elevation", "5,000 ft"], ["the type", "Camp"]]) {
    if (panel.includes(needle)) ok(`${what} survives the collapse`);
    else fail(`${what} is missing from the collapsed row — nothing identifies this site`);
  }

  // And the prose must still be selected, so a tap has something to reveal.
  const sel = campDetail(LONG).map(r => r[0]).join(",");
  if (sel === "Capacity,Water,Permit") ok("capacity, water and permit are still selected for the expanded view");
  else fail(`campDetail selected "${sel}" — the prose a tap should reveal is not being selected`);

  // There must be a way IN. A collapsed row with no labelled control is data behind no door,
  // and this app announces controls by their accessible name, so the label must name the site.
  const raw = render(route("alpine", { bivy: [LONG] }), "planner");
  if (/aria-label="[^"]*camping detail for Prose camp[^"]*"/.test(raw)) ok("the collapsed row carries a labelled expand control naming the site");
  else fail("no aria-labelled expand control names the site — the prose is unreachable and unannounced");
}

// ── 9. No camping data anywhere → no section, and no crash.
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
// The five collapse cases (8c/8d) are automated in
// scripts/oneoff/inject-camping-collapse-cases.mjs — 5/5, each proving its edit landed by
// checksum first. Re-run it after any change to CampSite or campDetail.
