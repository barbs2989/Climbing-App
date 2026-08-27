// Does the road/access CHECKED DATE reach a screen, and does it stay silent when there is none?
//
// 0172 adds routes.access_checked_at — the first date column on a table with 94 others, and the
// answer to audit:expiring-closures' standing instruction "date it or drop the claim", which until
// now had nowhere to put the date.
//
// A POPULATED COLUMN IS NOT A RENDERED ONE, and this repo's oldest defect is exactly that:
// descent_text was populated on 1,021 routes and rendered on none, while the contribute form invited
// climbers to write into it. A new column with a new render site is precisely where that happens
// again, so this proves the path end to end rather than assuming the mapper carries it.
//
// check:field-renders cannot answer it. That guard pulls a REAL value and looks for it on screen,
// and this column's value is an ISO timestamp that renders as "27 Aug 2026" — a used-not-echoed
// column, the same category as grade_system. It would report NEVER RENDERS on a working feature.
//
// WHAT IT PINS, IN BOTH DIRECTIONS:
//   - a route carrying a date says so, inside the GETTING THERE panel
//   - a route carrying none says NOTHING — silence is the designed behaviour, not a gap. Rendering
//     "age not recorded" on every undated row would change what ~1,000 WA road blocks say at once,
//     which is a product call and not this change's to make.
//   - the date is formatted by hand, not by toLocaleDateString. A locale-formatted date emits a
//     different string per machine, so any assertion about this line would pass on the author's box
//     and fail in CI — and DLOCALE is a global a signed-in user can change.
//
// Static: one esbuild bundle and two renders. No DB, no browser, so it sits in `npm run build`.
//
// Fails CLOSED: a missing export, a thin render, or a GETTING THERE panel that never appeared are
// each reported as a broken probe. Every "must NOT contain" assertion here passes against a
// component that rendered nothing.
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
// @tanstack/react-query MUST be --external. Bundled, esbuild inlines its own copy and the provider
// created here is a different module instance with a different React context; the render then
// throws "No QueryClient set" with a provider plainly wrapped around it.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(ROOT, `.access-checked-${process.pid}.mjs`);
const entry = path.join(ROOT, `.access-entry-${process.pid}.mjs`);
const clean = () => { fs.rmSync(out, { force: true }); fs.rmSync(entry, { force: true }); };

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);
const dead = (what) => {
  console.error(`\ncheck:access-checked-line FAILED — ${what}.`);
  console.error("Nothing below was checked. Every negative assertion here passes against a");
  console.error("component that rendered nothing, so a broken probe must never read as clean.\n");
  clean();
  process.exit(1);
};

console.log("check:access-checked-line — the road/access date reaches the screen, and is silent without one\n");

try {
  fs.writeFileSync(entry, [
    `export { default as RouteDetail } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};`,
    `export { accessCheckedLine, accessCheckedDate } from ${JSON.stringify(path.join(ROOT, "lib/road.js"))};`,
  ].join("\n"));
  // Bundle INSIDE the project: node resolves `react` from the nearest node_modules, so a bundle in
  // the OS temp dir throws ERR_MODULE_NOT_FOUND.
  execFileSync("npx", ["esbuild", entry,
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch {
  dead("esbuild could not bundle RouteDetail.jsx");
}

// createClient builds a RealtimeClient AT CONSTRUCTION, which needs a WebSocket constructor —
// native on node 22, absent on 20. Nothing here subscribes, so satisfying the capability check is
// enough, and doing it explicitly keeps this runnable on both rather than dying on node 20.
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class { constructor() { throw new Error("probe: no realtime"); } };
}

const mod = await import(out + "?t=" + Date.now());
const { RouteDetail, accessCheckedLine, accessCheckedDate } = mod;
if (typeof RouteDetail !== "function") dead("RouteDetail.jsx has no default export — ANCHOR LOST");
if (typeof accessCheckedLine !== "function") dead("lib/road.js does not export accessCheckedLine — ANCHOR LOST");
if (typeof accessCheckedDate !== "function") dead("lib/road.js does not export accessCheckedDate — ANCHOR LOST");

// ── 1. the pure function, both branches ──────────────────────────────────────────────────────────
const WHEN = "2026-08-27T12:00:00Z";
const withDate = accessCheckedLine({ accessCheckedAt: WHEN });
const noDate = accessCheckedLine({ accessCheckedAt: null });
const noField = accessCheckedLine({});

if (withDate && withDate.includes("27 Aug 2026")) ok("a dated route produces a line naming the date");
else fail(`a dated route produced ${JSON.stringify(withDate)}`);
if (noDate === null) ok("a route with a null date produces nothing");
else fail(`a null date produced ${JSON.stringify(noDate)}`);
if (noField === null) ok("a route with no such field produces nothing");
else fail(`a missing field produced ${JSON.stringify(noField)}`);
if (accessCheckedLine({ accessCheckedAt: "not-a-date" }) === null) ok("an unparseable value produces nothing");
else fail("an unparseable value produced a line");

/* HAND-FORMATTED, NOT LOCALE-FORMATTED. Asserted rather than left to review: a toLocaleDateString
   date renders differently per machine, so this assertion is the only thing standing between the
   line and a guard that passes locally and fails in CI. */
if (accessCheckedDate(WHEN) === "27 Aug 2026") ok("the date is hand-formatted and machine-independent");
else fail(`accessCheckedDate returned ${JSON.stringify(accessCheckedDate(WHEN))}, expected "27 Aug 2026"`);

/* IT MUST NOT CLAIM MORE THAN IT KNOWS. The column records a reading, not a guarantee — a Forest
   Service alert read on a Tuesday can be superseded on the Wednesday. */
if (withDate && !/\bverified\b/i.test(withDate)) ok('the line says "checked", never "verified"');
else fail("the line claims the road was VERIFIED, which overclaims what the column records");

// ── 2. it reaches the screen ─────────────────────────────────────────────────────────────────────
const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnMount: false } } });
const noop = () => {};
const ROUTE = (extra) => Object.assign({
  id: "probe_route", name: "Probe Route", grade: "5.8", discipline: "alpine", pitches: 4,
  mountainId: "probe_area", areaType: "peak",
  road: { name: "Probe River Road (FR 99)", status: "Gravel to the trailhead", driveNote: "From the highway, 11 miles." },
}, extra || {});

const render = (route) => renderToStaticMarkup(
  React.createElement(QueryClientProvider, { client: qc },
    React.createElement(RouteDetail, {
      route, initialSubTab: "planner", onBack: noop, onSubTab: noop,
      contribs: [], myReports: [], connections: [], comments: {},
      hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
      crewsForRoute: [], myStars: {}, presence: null,
    })));

let dated, undated;
try { dated = render(ROUTE({ accessCheckedAt: WHEN })); undated = render(ROUTE()); }
catch (e) { dead(`RouteDetail threw while rendering: ${String(e && e.message).slice(0, 200)}`); }

if (dated.length < 900 || undated.length < 900) dead(`a render came back thin (${dated.length} / ${undated.length} chars)`);

/* SSR escapes: renderToStaticMarkup emits &amp; and &#x27;. Match the un-escaped words only, the
   trap [[ssr-probes-must-match-escaped-html]] records. */
const text = (h) => h.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ");
const dTxt = text(dated), uTxt = text(undated);

// The panel must exist in BOTH renders, or the negative assertion below is vacuous — it would pass
// on a GETTING THERE panel that never rendered at all.
if (!/GETTING THERE/.test(dTxt) || !/GETTING THERE/.test(uTxt)) dead("the GETTING THERE panel did not render — ANCHOR LOST");
ok("the GETTING THERE panel renders in both states");

/* SCOPED TO THE PANEL, never the tab. This repo has made the tab-wide mistake three times in one
   sitting on the camping work; the Planner legitimately says "road" elsewhere. */
const panel = (t) => { const i = t.indexOf("GETTING THERE"); return i < 0 ? "" : t.slice(i, i + 1400); };

if (/27 Aug 2026/.test(panel(dTxt))) ok("a dated route shows the date inside GETTING THERE");
else fail("a dated route does NOT show the date inside GETTING THERE — the column reaches no screen");

if (!/last checked/i.test(panel(uTxt))) ok("an undated route shows no checked line");
else fail("an undated route rendered a checked line");

if (dated.length > undated.length) ok("the dated render is longer, so the line is genuinely added");
else fail("the dated and undated renders are the same size — nothing was added");

clean();
console.log(failures
  ? `\ncheck:access-checked-line: ${failures} failure(s)`
  : "\ncheck:access-checked-line: ok — the date reaches GETTING THERE, and an undated route says nothing.");
process.exit(failures ? 1 : 0);

// Injection-tested:
//   remove the {accessCheckedLine(route)?...} render site from RouteDetail  -> section 2 fails
//   make accessCheckedLine return a line when the date is null             -> section 1 + 2 fail
//   swap the hand formatter for toLocaleDateString                         -> the format case fails
//   rename either export                                                    -> ANCHOR LOST, exit 1
