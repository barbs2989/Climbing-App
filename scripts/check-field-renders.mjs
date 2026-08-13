#!/usr/bin/env node
// check:field-renders — for every enriched route column, does its value actually reach a
// screen? A column can be mapped in dbRouteToCamel, offered in the fix form, and still be
// displayed nowhere. `routes.descent_text` was exactly that: populated on 1,021 routes,
// rendered on none, while the fix form invited climbers to write into it (#707). Grep does
// not find that — every identifier is referenced. Only rendering does.
//
// Method. For each field, take a REAL value out of the live DB, inject it alone onto a bare
// route, render all six sub-tabs with react-dom/server, and look for a distinctive substring
// of that value in the output.
//
// Two mistakes this deliberately avoids:
//
//   Invented shapes. The predecessor (scripts/oneoff/measure-which-tab-renders-each-field.mjs)
//   hand-wrote samples like `emergency: {rangerStation:"…"}`. If the real column is shaped
//   `{phone, sar}` the probe renders nothing and the field looks dead when it is fine. Values
//   come from the DB and go through dbRouteToCamel, so the shape is whatever ships.
//
//   Isolation false-positives. A field may only render beside another one. So each field is
//   measured twice — alone on a bare route, and again on the real route it came from. Only
//   "absent in BOTH" is reported as unrendered; "absent alone, present on the real route" is
//   reported as conditional, which is information, not a bug.
//
// Numeric-only fields (no string leaf to search for) cannot be proven this way and are
// reported as UNPROVABLE rather than quietly passed.
//
// Read-only, anon-key-safe for reads; needs no writes. Exit 1 if any field renders nowhere.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";

const ROOT = process.cwd();          // never hardcode a worktree — the predecessor did, and
                                     // measured a different branch's code than the one you ran it in
const require_ = createRequire(import.meta.url);
const { SUPABASE_URL, headers, anonKey } = await import(path.join(ROOT, "scripts/lib/supabase-env.mjs"));
const KEY = process.env.SUPABASE_SERVICE_KEY || anonKey();
const TABS = ["overview", "conditions", "planner", "safety", "photos", "partners"];

// Column -> the camelCase field RouteDetail would read. Derived from dbRouteToCamel; a column
// whose camel name is identical is listed once.
const FIELDS = [
  ["approach", "approach"], ["descent", "descent"], ["descent_text", "descentText"],
  ["approach_logistics", "approachLogistics"], ["road", "road"], ["access", "access"],
  // `permit_url` was here and is NOT a column: routes has 95 columns and exactly one
  // permit-ish one, `permit`. Every run queried it, got HTTP 400 42703, and the old
  // `if (!r.ok) return []` turned that into "NO DATA" — so a name that had never resolved
  // sat in the results table looking like an unpopulated column. The fail-closed change
  // below surfaced it on its first honest run against a live DB.
  // Removing it is right; the reason first given for it was WRONG, and the wrong reason is
  // the dangerous part — it would justify deleting a working feature.
  //
  // What is true: there is no `permit_url` COLUMN, `lib/db.js` maps only `permits: r.permit`,
  // and this guard's subject is column -> screen. With no column there is nothing here to
  // query, which is the whole justification for dropping the entry.
  //
  // What is FALSE, and was written here: that the contribute form does not offer it and that
  // no DB route can have one. `permitUrl` IS offered — `{k:"permitUrl",label:"Permit link"}`
  // in RouteDetail's own FIELDS list (the fix form is defined there, NOT in ClimbMatch.jsx,
  // which is how the first check missed it) — it is in `SS`, and RouteDetail renders
  // `<a href={route.permitUrl}>` beside the permit prose. A DB route reaches it through the
  // CONTRIBUTION OVERLAY, which needs no column: dbContribs rows are grouped by field, gated
  // on `SS[rc.field]`, and applied onto the route object client-side once the 3-agree gate
  // passes. So the feature works end to end and must not be "cleaned up" on the strength of
  // this guard no longer listing it.
  ["permit", "permits"],
  ["waypoints", "waypoints"], ["gpx", "gpxPts"], ["elev_pts", "elevPts"],
  ["itinerary", "itinerary"], ["timing", "timing"], ["turnaround", "turnaround"],
  ["hazards", "hazards"], ["obj_haz", "objHaz"], ["watch_out", "watchOut"],
  ["comms", "comms"], ["emergency", "emergency"], ["bail", "bail"],
  ["climate", "climate"], ["season", "season"], ["best_season", "bestSeason"],
  ["seasonal_guidance", "seasonalGuidance"], ["seasonal_hazards", "seasonalHazards"],
  ["crowds", "crowds"], ["partner_requirements", "partnerRequirements"],
  ["pitch_detail", "pitchDetail"], ["rappel_detail", "rappelDetail"], ["rappel_count_note", "rappelCountNote"],
  // 0122's three. This list is HAND-MAINTAINED, so a new column is invisible here until someone
  // adds it — and these three were the ones most worth watching: `bivy`'s panel has already been
  // left defined and mounted NOWHERE once, by a merge that kept main's copy of the dense line the
  // mount lived on. The guard that exists to catch exactly that could not see the column.
  ["approach_variants", "approachVariants"], ["climbing_route", "climbingRoute"], ["bivy", "bivy"],
  ["gear", "gear"], ["detailed_rack", "detailedRack"], ["what_to_bring", "whatToBring"],
  ["gear_confidence", "gearConfidence"],
  ["pro_tips", "proTips"], ["pro_needs", "proNeeds"], ["beta", "beta"],
  ["overview", "overview"], ["description", "desc"], ["face", "face"],
  ["sling_rack", "slingRack"], ["rope_note", "ropeNote"], ["corrections", "corrections"],
  ["verif", "verif"], ["data_quality", "dataQuality"], ["lists", "lists"],
  // The six `0135` writes. All have ZERO populated rows, so the real-value method has nothing
  // to pull — they are judged through SENTINELS below and **no query is issued for them**.
  // Listed here so they are walked at all; before this they were absent and unguarded.
  ["prot_rating", "protRating"], ["start_type", "startType"], ["landing", "landing"],
  ["pads", "pads"], ["rock", "rock"], ["crux", "crux"],
];

// The route screen is NOT just <RouteDetail/>. ClimbMatch.jsx mounts sibling panels next to
// it, per sub-tab, each fed enrichRoute(selRoute) — and those panels own whole columns:
// crowds, partner_requirements, seasonal_guidance and data_quality live in EnrichmentPanels,
// emergency in EmergencyRescueCard, aspect in AspectSunPanel. A probe that renders only
// RouteDetail reports every one of them as dead. Mirror the real composition instead.
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
import { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};
import { enrichRoute, AspectSunPanel, EmergencyRescueCard, C, ActionIcon, MOUNTAINS } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
import { SeasonalGuidancePanel, CrowdsPanel, PartnerRequirementsPanel } from ${JSON.stringify(path.join(ROOT, "EnrichmentPanels.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
const h = React.createElement;
export { dbRouteToCamel };
// Mirrors the per-sub-tab sibling blocks in ClimbMatch.jsx.
function siblings(route, tab) {
  const r = enrichRoute(route);
  const mtn = MOUNTAINS.find((x) => x.id === route.mountainId) || route._dbArea;
  // Overview no longer mounts a sibling panel: DataQualityPanel (the DATA QUALITY box) was
  // removed with ProvenancePanel's DATA CONFIDENCE box — two panels grading the route's data
  // above the route itself. The data_quality column is recorded in KNOWN below as a deliberate
  // non-reader. This harness must mirror what the app actually mounts, or it measures a
  // screen nobody sees.
  if (tab === "overview") return [];
  if (tab === "planner") return [
    h(AspectSunPanel, { key: "asp", route: r, sunReports: {}, onSuggestSun: noop }),
    h(SeasonalGuidancePanel, { key: "sg", route: r, C, ActionIcon }),
    h(CrowdsPanel, { key: "cr", route: r, C, ActionIcon }),
  ];
  if (tab === "partners") return [h(PartnerRequirementsPanel, { key: "pr", route: r, C, ActionIcon })];
  if (tab === "safety") return mtn ? [h(EmergencyRescueCard, { key: "er", route: r, mountain: mtn })] : [];
  return [];
}
export function render(route, tab) {
  return renderToStaticMarkup(h(QueryClientProvider, { client: qc },
    h(RouteDetail, { route, initialSubTab: tab, onBack: noop, onSubTab: noop,
      contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {},
      diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null }),
    ...siblings(route, tab)));
}`;

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-fields-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true,
  format: "cjs", platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" },
  define: { "import.meta.env": "{}" }, outfile: out, logLevel: "error" });
const { render, dbRouteToCamel } = require_(out);

const txt = (h) => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&[a-z#0-9]+;/g, " ").replace(/\s+/g, " ").trim();

// EVERY string leaf inside a value, with the key path that reached it. Testing only the
// longest leaf — which is what the predecessor did — condemns a whole column because one
// buried sub-key is not displayed: `pitch_detail` renders a visible table but its per-pitch
// `note` may sit behind a toggle, and a single-needle probe calls that "never renders".
// A field passes if ANY leaf reaches a screen; the leaves that do not are reported by path,
// which is the more useful answer anyway.
function leavesOf(v, depth = 0, keyPath = "") {
  if (depth > 4 || v == null) return [];
  if (typeof v === "string") return v.trim().length >= 14 ? [{ path: keyPath || "(self)", text: v.trim() }] : [];
  if (Array.isArray(v)) return v.flatMap((x, i) => leavesOf(x, depth + 1, keyPath ? keyPath + "[]" : "[]"));
  if (typeof v === "object") return Object.entries(v).flatMap(([k, x]) => leavesOf(x, depth + 1, keyPath ? keyPath + "." + k : k));
  return [];
}
// Dedupe by path — an array of 12 pitches yields 12 leaves at the same path, and one hit
// proves the path renders.
function leafPaths(v) {
  const byPath = new Map();
  for (const l of leavesOf(v)) if (!byPath.has(l.path) || byPath.get(l.path).text.length < l.text.length) byPath.set(l.path, l);
  return [...byPath.values()];
}
// The app splits paragraphs and re-wraps, so match on a contiguous inner slice rather than
// the whole string — a needle that spans a paragraph break would never be found.
const probe = (hay, needle) => {
  const n = needle.replace(/\s+/g, " ").trim();
  for (const piece of n.split(/(?<=[.;])\s+/)) {
    const p = piece.trim();
    if (p.length >= 14 && hay.includes(p.slice(0, 90))) return true;
  }
  return hay.includes(n.slice(0, 60));
};

// Every query that did not come back healthy, so a broken READ can never be reported as a
// finding about the CODE. See the failure this exists for, directly below.
const queryFailures = [];
// Queries that only succeeded on a retry — reported, never swallowed.
const retriedOk = [];

// A request must be able to give up on its own. `fetch` has NO default timeout, so a
// connection the server accepts and then never answers hangs this script forever — and in
// CI that surfaces as an opaque job timeout with no output, which is strictly worse than
// the false pass this change exists to remove. 12s is chosen against measured behaviour,
// not picked round: the anon statement timeout fires at 3s and a cold connection costs
// 3.8-6.4s, so anything still silent at 12s is hung rather than slow.
const REQ_TIMEOUT_MS = 12000;
// Retrying 45 columns three times is only affordable while the failures are occasional.
// When the DB is slow ACROSS THE BOARD every column burns its full retry budget and the run
// stops fitting any sane CI limit, so retries are abandoned once this much wall-clock has
// gone on them; later columns then get a single attempt each and the run still finishes and
// still fails closed. Bounding the spend, not the honesty.
const RETRY_BUDGET_MS = 8 * 60 * 1000;
const startedAt = Date.now();

async function rowWith(col) {
  // order=id.asc is load-bearing: PostgREST gives no ordering guarantee, so an unordered
  // limit=8 returns a DIFFERENT eight rows run to run. That made the whole guard
  // non-deterministic — `rappel_detail` read "renders" one run and "unprovable" the next,
  // with no code change between them. A guard whose verdict depends on server row order
  // cannot be trusted either way.
  const url = `${SUPABASE_URL}/rest/v1/routes?select=*,areas(*)&${col}=not.is.null&order=id.asc&limit=8`;
  // A FAILED QUERY IS NOT AN EMPTY COLUMN, and conflating the two is the bug this block
  // exists for. `if (!r.ok) return []` made a dead database indistinguishable from "no route
  // has this column populated", and the consequence was not a quiet false pass — it was
  // WRONG ADVICE. On 2026-08-12 main went red twice with every one of the 46 columns reading
  // NO DATA, and the only thing the run said was:
  //
  //     STALE allowlist entries (these now render — remove them): data_quality
  //
  // i.e. it told the author to delete correct bookkeeping from KNOWN because the DB was
  // down. Following that instruction would have removed the recorded reason a column is not
  // rendered, and the guard would then have reported that column dead forever after.
  //
  // Worse, that red was an ACCIDENT of KNOWN being non-empty. The stale test is the only
  // thing on this path that exits non-zero when nothing rendered: with an empty allowlist
  // the identical outage prints "ok — every measurable enriched column reaches a screen"
  // and exits 0. So this guard's realistic failure mode was a false pass, exactly like
  // check:counts over an empty read and check:migration-claims with no token. Both of those
  // fail closed; this one did not.
  //
  // Retry with backoff before giving up, for the same reason #854 added a retry to check:ui:
  // the observed failure is transient and it buys down the cost of an intermittent miss
  // without weakening anything — a genuinely broken read fails every attempt and still fails
  // the run.
  //
  // What it is retrying is MEASURED, not guessed. Caught live on 2026-08-12:
  //
  //   emergency: HTTP 500 {"code":"57014","message":"canceling statement due to statement timeout"}
  //
  // 57014 is the statement timeout on the anon role — the same 3s ceiling that made every
  // app-side read of route_duplicate_names error while the identical query looked healthy in
  // the SQL editor, where postgres has no timeout. This query filters an unindexed column
  // with `not.is.null` across ~205k routes, so whether it lands under 3s depends on cache
  // warmth, and the same column passes on one run and times out on the next. One retry was
  // not enough (measured — a single retry still went red), hence three with a backoff.
  let lastErr = null;
  // FIVE attempts, with an EXPONENTIAL backoff, and both numbers come from measurement.
  //
  // The client timeout above is irrelevant to the failure actually being retried: the server
  // gives up at its own 3s statement ceiling and returns a 500, so waiting longer per request
  // buys nothing. Only a LATER attempt against a warmer cache can succeed — and it does. A run
  // on 2026-08-13 recorded `season — succeeded on attempt 3`, so three attempts was landing
  // right on the edge; that same run still lost 17 of 45 columns.
  //
  // The cost is what makes this affordable rather than a treadmill: measured on the live
  // project minutes later, the identical query took 233-654ms for access/hazards/gear and
  // timed out for approach/descent/road, and the slow set MOVES between runs. This is
  // contention on an unindexed `not.is.null` scan over ~205k routes, not a broken column, so
  // the row really is there and another attempt is a fair way to get it.
  //
  // Backoff grows 0.8s, 1.6s, 3.2s, 6.4s because a fixed 400ms re-asks inside the same busy
  // moment. RETRY_BUDGET_MS still caps the whole thing, so a wholesale-slow project degrades
  // to one attempt per column and the run still ends and still fails closed.
  const maxAttempts = (Date.now() - startedAt) < RETRY_BUDGET_MS ? 5 : 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) await new Promise((r) => setTimeout(r, 800 * Math.pow(2, attempt - 2)));
    try {
      const r = await fetch(url, { headers: headers(KEY), signal: AbortSignal.timeout(REQ_TIMEOUT_MS) });
      if (!r.ok) { lastErr = `HTTP ${r.status} ${(await r.text().catch(() => "")).slice(0, 160)}`; continue; }
      const rows = await r.json();
      // Print a retry that WORKED. Absorbing it silently would convert a measurable flake
      // into an invisible one, and the next person to see this go red would have no idea it
      // had been happening at all — the rule #854 set for the same reason.
      if (attempt > 1) retriedOk.push({ col, attempt, err: lastErr });
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      // A thrown fetch (socket hangup, DNS, connection reset) never reached `!r.ok` at all —
      // it crashed the script with an unhandled rejection, which reads as a broken guard
      // rather than a broken database. Caught here so it lands in the same report.
      // Name our own abort for what it is. "The operation was aborted due to timeout" on its
      // own reads like a server message and sends the reader to the DB; this one is ours.
      lastErr = (e && e.name === "TimeoutError")
        ? `no response within ${REQ_TIMEOUT_MS / 1000}s (aborted by this script, not by the server)`
        : String((e && e.message) || e);
    }
  }
  queryFailures.push({ col, err: lastErr });
  return [];
}

// Two bases, because whole sections are discipline-gated: RouteGearCheck (and the essentials
// box it owns) render only when cragOnly is true, and the Plan/Safety tabs behave differently
// either side of that line. Probing alpine alone reported crag-only sections as dead — the
// same blind spot that let #655 hide the crag safety advice.
const BASES = {
  alpine: {
    id: "probe", name: "Probe Route", grade: "5.8", gradeSystem: "yds",
    discipline: "alpine", pitches: 3, mountainId: "probe_area",
    _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
  },
  crag: {
    id: "probe", name: "Probe Route", grade: "5.10a", gradeSystem: "yds",
    discipline: "trad", pitches: 3, mountainId: "probe_area",
    _dbArea: { id: "probe_area", name: "Probe Area", areaType: "crag", region: "Washington" },
  },
};
const BARE = BASES.alpine;

// A THIRD base, for the bouldering-only tiles. `landing`, `pads` and `start_type` are shown
// on a boulder problem and nowhere else, so probing them from `crag` reports live columns as
// dead — the same discipline-gating trap this file already records for `RouteGearCheck`.
const BOULDER = {
  id: "probe", name: "Probe Problem", grade: "V4", gradeSystem: "vscale",
  discipline: "bouldering", pitches: 1, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "crag", region: "Washington" },
};

// SENTINEL COLUMNS — the hole the real-value method cannot see, by construction.
//
// Everything above pulls a REAL value from the live DB. A column with **zero populated rows**
// therefore has nothing to pull, reports `NO DATA`, and is never checked at all — which is
// precisely the moment you most want to know its reader is wired, i.e. just after a migration
// adds it and before any backfill. `0135` shipped the write for these six; #855 then had to
// prove they reach a screen with a 106-line ONE-OFF
// (`scripts/oneoff/probe-six-proposal-columns-render.mjs`), because this guard structurally
// could not answer it. That one-off is now folded in here and deleted: a verification nobody
// runs is not a verification, which is the rule this whole file exists to enforce.
//
// Method: inject a distinctive sentinel onto a bare route and look for it on screen. It proves
// the READER exists independently of whether any row is populated.
//
// Two traps, both inherited from #855's probe rather than rediscovered:
//   - `dbRouteToCamel` emits BOTH `rock` and `rockType` from the single `rock` column, so
//     patching one of them reports a healthy column as dead. Mimic the MAPPER, never the column.
//   - `pads` is numeric and the TECH STATS tiles render through `<CountUp/>`, which is
//     `useState(0)` reaching its target only inside a `useEffect`. Effects do not run under
//     `renderToStaticMarkup`, so a numeric tile renders **0** and its value can never be
//     asserted here. For those, assert only that the page CHANGED — never the number. Same
//     warning `check:bare` carries.
const SENTINELS = {
  prot_rating: { base: BASES.crag, patch: { protRating: "ZZPROTZZ" } },
  start_type: { base: BOULDER, patch: { startType: "ZZSTARTZZ" } },
  landing: { base: BOULDER, patch: { landing: "ZZLANDZZ" } },
  rock: { base: BASES.crag, patch: { rock: "ZZROCKZZ", rockType: "ZZROCKZZ" } },
  crux: { base: BASES.crag, patch: { crux: "ZZCRUXZZ" } },
  pads: { base: BOULDER, patch: { pads: 7 }, numeric: true },
};

// Render a sentinel-patched route across every sub-tab and report where it landed. Numeric
// columns are judged by "did the page change", string columns by finding the sentinel itself.
function assessSentinel(col) {
  const spec = SENTINELS[col];
  const patched = Object.assign({}, spec.base, spec.patch);
  const needle = Object.values(spec.patch).map(String).find((v) => v.startsWith("ZZ"));
  const hits = [];
  let changed = false;
  for (const tab of TABS) {
    let withField = "", without = "";
    try { withField = txt(render(patched, tab)); } catch { /* shape may throw */ }
    try { without = txt(render(spec.base, tab)); } catch { /* shape may throw */ }
    if (withField && withField !== without) changed = true;
    if (needle && withField.includes(needle)) hits.push(tab);
  }
  return { hits, changed, needle };
}

// A field can be USED without being echoed: the RACK box prints rackSummary(route.rack), so
// the raw gear prose never appears verbatim even though the column drives the screen. Without
// this baseline the probe reports such a field as dead and sends you chasing a non-bug.
const BASELINE = {};
for (const [bname, b] of Object.entries(BASES)) {
  for (const tab of TABS) { try { BASELINE[bname + ":" + tab] = txt(render(b, tab)); } catch (e) { BASELINE[bname + ":" + tab] = ""; } }
}

// Render one candidate row and score how many of its leaves reached a screen. Split out of
// the loop so every candidate is judged by identical logic — a second, hand-inlined copy is
// how the retry path quietly diverges from the first-pick path.
function assessRow(cand, field) {
  const renderedAlone = {}, renderedReal = {};
  for (const [bname, b] of Object.entries(BASES)) {
    const isolated = Object.assign({}, b, { [field]: cand.camel[field] });
    for (const tab of TABS) {
      let a = "";
      try { a = txt(render(isolated, tab)); } catch (e) { /* isolated shape may throw */ }
      renderedAlone[bname + ":" + tab] = a;
    }
  }
  for (const tab of TABS) {
    try { renderedReal[tab] = txt(render(cand.camel, tab)); } catch (e) { renderedReal[tab] = ""; }
  }
  const keys = Object.keys(renderedAlone);
  const hitTabs = new Set(), condTabs = new Set(), missing = [];
  for (const leaf of cand.leaves) {
    let seenAlone = false, seenReal = false;
    for (const k of keys) if (probe(renderedAlone[k], leaf.text)) { seenAlone = true; hitTabs.add(k); }
    for (const tab of TABS) if (probe(renderedReal[tab], leaf.text)) { seenReal = true; condTabs.add("real:" + tab); }
    if (!seenAlone && !seenReal) missing.push(leaf.path);
  }
  return { hitTabs, condTabs, missing, keys,
    found: cand.leaves.length - missing.length,
    changedTabs: keys.filter((k) => renderedAlone[k] && renderedAlone[k] !== BASELINE[k]) };
}

// Did this column's value actually reach a screen? POSITIVE evidence only.
//
// #863 made a failed query fail closed, so NO DATA now reliably means "the query succeeded
// and no route has this column populated". That is the remaining hole: a genuinely empty
// column that is ALSO in KNOWN still reaches the stale test below, and the weaker phrasing
// of that test — "the verdict is something other than NEVER RENDERS" — reads NO DATA as
// "this renders now, remove it". Same wrong advice #863 documents, arriving down a path its
// fix does not cover, because no query failed.
//
// Defined up here with a self-test rather than beside its one use, because the self-test has
// to run BEFORE the DB work: this guard's healthy output is "no findings", which is exactly
// what a broken detector prints. Same reasoning as check:overflow's injected shapes.
const RENDERED = (v) => !/^NEVER RENDERS\b|^NO DATA$|^UNPROVABLE/.test(v);
for (const [verdict, want] of [
  ["renders", true], ["partial (2 of 5)", true], ["conditional (alpine only)", true],
  ["used, not echoed (derived/summarised)", true],
  ["NEVER RENDERS", false], ["NO DATA", false], ["UNPROVABLE (numeric/short)", false],
]) {
  if (RENDERED(verdict) !== want) {
    console.error(`check:field-renders FAILED — self-test: RENDERED(${JSON.stringify(verdict)}) should be ${want}.`);
    console.error("The stale-allowlist test depends on this, and nothing has been measured yet.");
    process.exit(1);
  }
}

const results = [];
for (const [col, field] of FIELDS) {
  // Stop early when the database is simply DOWN. If the first several columns each fail
  // every attempt, the remaining forty tell you nothing you do not already know, and
  // grinding through them turns a 3-minute answer into a quarter-hour one — against a
  // never-responding server the full walk was measured at ~14min. This only ever short-
  // circuits a run that is already going to fail closed. The test is that EVERY result so
  // far is a query failure, so a single success anywhere disables it for the whole run —
  // a sporadically flaky column can never trigger it.
  if (queryFailures.length >= 5 && results.length === queryFailures.length) {
    console.log(`\n(abandoning after ${queryFailures.length} consecutive failed column queries — the read is down, not the app)`);
    break;
  }
  // A sentinel column is judged SYNTHETICALLY, so do not query the database for it at all.
  //
  // Querying was the first draft and CI found the flaw within minutes: these columns have zero
  // populated rows BY DEFINITION, so the query can only ever come back empty — it cannot
  // inform the verdict, but it is one more chance to trip the 3s statement timeout, and a
  // 57014 there fails the whole run through the fail-closed path. The first CI run reported
  // `prot_rating` and `start_type` as BOTH "renders (sentinel)" and failed queries, which is
  // the contradiction that gives it away. Six pointless queries, six new ways to go red.
  //
  // Their values are short enums (`PG-13`, `sit`, `granite`), so even once backfilled the
  // real-value method could not judge them — it needs a string leaf of >=14 chars. Sentinel is
  // the right method for these columns permanently, not a stand-in until data arrives.
  if (SENTINELS[col]) {
    const s = assessSentinel(col);
    const shown = SENTINELS[col].numeric ? s.changed : s.hits.length > 0;
    results.push({
      col, field,
      verdict: shown
        ? (SENTINELS[col].numeric
          ? "renders (sentinel — value not assertable, CountUp under SSR)"
          : "renders (sentinel)")
        : "NEVER RENDERS (sentinel)",
      tabs: s.hits.map((t) => "sentinel:" + t), missing: [],
    });
    continue;
  }
  const rows = await rowWith(col);
  if (!rows.length) { results.push({ col, field, verdict: "NO DATA", tabs: [] }); continue; }

  // Rank rows by how many distinct leaf paths the value exposes — the widest test of the
  // column's real shape — but keep the runners-up. ONE row is not enough to declare a column
  // dead: some columns are consumed through a filter, so an unlucky sample renders nothing
  // while the column is fine. `what_to_bring` is passed as `essentials` and de-duplicated
  // against the discipline's assumed gear, so a route whose items are all assumed shows
  // nothing — that sample alone had this column recorded as NEVER RENDERS while it
  // demonstrably renders on 1,025 of 1,037 populated routes (98.8%); the 12 that show
  // nothing hold just ["Helmet"], which is correct de-duplication.
  const ranked = rows.map((row) => { const camel = dbRouteToCamel(row); return { row, camel, leaves: leafPaths(camel[field]) }; })
    .filter((c) => c.leaves.length)
    .sort((a, b) => b.leaves.length - a.leaves.length);
  if (!ranked.length) { results.push({ col, field, verdict: "UNPROVABLE (numeric/short)", tabs: [], missing: [] }); continue; }
  const CANDIDATES = 5;
  let best = ranked[0], picked = null;
  for (const cand of ranked.slice(0, CANDIDATES)) {
    const r = assessRow(cand, field);
    if (!picked || r.found > picked.r.found) { picked = { cand, r }; }
    if (r.found === cand.leaves.length) break;      // fully shown — no better outcome exists
  }
  best = picked.cand;

  const { hitTabs, condTabs, missing, found, changedTabs, keys } = picked.r;
  const verdict = found === 0
    ? (changedTabs.length ? "used, not echoed (derived/summarised)" : "NEVER RENDERS")
    : missing.length === 0 ? (hitTabs.size ? "renders" : "conditional (only beside other fields)")
    : "partial — " + found + "/" + best.leaves.length + " leaves shown";
  const tabs = hitTabs.size ? [...hitTabs] : condTabs.size ? [...condTabs] : changedTabs;
  results.push({ col, field, verdict, tabs, id: best.row.id, missing, sample: best.leaves[0].text.slice(0, 60) });
}

const pad = (s, n) => String(s).padEnd(n);
console.log("\n" + pad("column", 22) + pad("field", 20) + pad("verdict", 40) + "tabs");
console.log("-".repeat(104));
for (const r of results) {
  console.log(pad(r.col, 22) + pad(r.field, 20) + pad(r.verdict, 40) + (r.tabs.join(", ") || "—"));
}

// Known and explained. A column here is NOT a pass — it is a recorded decision, so that a
// column that goes dark tomorrow still fails. Empty this rather than grow it casually.
const KNOWN = {
  // seasonal_hazards was here as NEVER RENDERS. With deterministic ordering it scores
  // "partial — 1/5 leaves shown": only .avalanche.byMonth is consumed, and only when the area
  // has an avyZone. That was always the recorded reason, so the finding has not changed — but
  // "partial" is reported by the PARTIALLY SHOWN section, and KNOWN is keyed on NEVER RENDERS,
  // so leaving it here just makes the allowlist read stale.
  //
  // The other 4 sub-keys have no reader, and 2026-08-09 that was MEASURED rather than left as
  // "needs a home" (scripts/oneoff/measure-seasonal-hazard-overlap.mjs, 505 routes). Against
  // the text the route already shows (watch_out, hazards, obj_haz, climate, season):
  //     exposure            502 routes · 40% word overlap · 13 new content words
  //     weather.typical     495 routes · 48% overlap · 8 new words
  //     weather.probability 448 routes · 39% overlap · 9 new words
  //     crevasses           293 routes · 39% overlap · 10 new words
  // The enrichment cross-references its neighbours on purpose ("already flagged in on-file
  // hazards/watch_out"), so four new prose blocks would buy ~40 content words, half of them a
  // rephrase of WATCH OUT. DECIDED: do not give these a home. Unlike descent_text (#707) or
  // what_to_bring (#732), which said something nothing else did, this is an upstream dedup
  // problem — fix it in enrichment, not by growing the route screen.
  // what_to_bring was here recorded "Unconfirmed", and confirming it CONFIRMED it — the guard
  // was right and the recorded reason was wrong. The items were not "being filtered": the
  // filtered list `ess` was computed and then referenced in exactly one place, the early
  // return `if(!assumed.length&&!ess.length)return null`. It was never rendered. The box
  // printed `assumed`, the generic discipline kit, on all 1,037 populated routes. Fixed by
  // rendering it as "Specific to this route", so the entry is gone rather than reworded.
  // `lists` was here, recorded as "membership keys, not display copy" with a note that the
  // live column holds free prose an exact `.includes("state_hp")` could never satisfy. That
  // note was right and it was the whole bug: the column reached no screen AND fed a badge
  // that could not fire. lib/routeTags.js now maps that prose to slugs at read time and
  // RouteTagRow renders them as chips on the route page, so the column renders and the
  // badge can score. Entry removed rather than reworded — same as what_to_bring above.
  // Its only reader was EnrichmentPanels' DATA QUALITY box on Overview, removed together with
  // ProvenancePanel's DATA CONFIDENCE box: two panels, at the top of the page, both answering
  // "how complete is this route's data" before the route itself. Gaps are now reported by the
  // section that owns the missing field (GapNote), which says the same thing where it can be
  // acted on. This is a DELIBERATE removal of the reader, not an unnoticed hole — which is
  // exactly what this map is for. If the confidence/freshness read earns a home again, it
  // belongs next to the data it grades, not above it.
  // `corrections` lost its reader with the same box. Kept out on purpose rather than re-homed:
  // 501 routes carry it and the modal population is boilerplate — "None — consistent across
  // sources." is a correction that says nothing happened. `verif` did NOT go with it: it says
  // something specific on 19 routes ("UNVERIFIED LOCATION: the parent area could not be found")
  // and now renders as one muted line on Overview (VerifNote), so it is absent from this map.
  corrections: "reader removed with the DATA CONFIDENCE box — graded bookkeeping, and much of "
    + "the column reads \"None — consistent across sources.\" The substantive half of that box, "
    + "`verif`, was kept as a one-line note on Overview rather than allowlisted here.",
  data_quality: "reader removed on purpose — the DATA QUALITY box duplicated DATA CONFIDENCE "
    + "at the top of Overview and both were replaced by per-section gap notices. Give it a "
    + "home beside the fields it grades if it comes back, not another page-level banner.",
};
// FAIL CLOSED ON A BROKEN READ, and do it BEFORE any verdict is interpreted. Everything
// below this line reasons about what rendered; none of it means anything if the rows never
// arrived. This has to come ahead of the stale-allowlist test in particular, because that
// test is what turned an outage into "remove these entries" — advice that was both wrong and
// easy to follow.
if (retriedOk.length) {
  console.log("\nnote: " + retriedOk.length + " column quer" + (retriedOk.length === 1 ? "y" : "ies")
    + " needed a retry (the read is flaky, the result below is still sound):");
  for (const f of retriedOk) console.log(`  ${f.col} — succeeded on attempt ${f.attempt}, first failure: ${f.err}`);
}
if (queryFailures.length) {
  // Separate the two causes, because they need OPPOSITE repairs and a run that conflates
  // them sends the reader the wrong way — the same reasoning #854 applies to check:ui's
  // three-way route failure. A 42703 is this guard's own bookkeeping naming a column that
  // is not there; anything else is the database being unreachable or unhappy.
  const schema = queryFailures.filter((f) => /42703|does not exist/i.test(f.err));
  const transient = queryFailures.filter((f) => !/42703|does not exist/i.test(f.err));
  if (schema.length) {
    console.log("\nTHIS GUARD NAMES A COLUMN THAT DOES NOT EXIST — its own list is stale, the DB is fine.");
    for (const f of schema) console.log(`  ${f.col}: ${f.err}`);
    console.log("  Fix the FIELDS list at the top of this script: drop the entry, or correct the name");
    console.log("  to whatever the column was renamed to. Do NOT touch the KNOWN allowlist for this.");
  }
  if (transient.length) {
    console.log("\nTHE DATABASE READ FAILED — this run proves NOTHING about the app.");
    console.log(`  ${transient.length} of ${FIELDS.length} column queries did not come back, after a retry each.`);
    for (const f of transient.slice(0, 6)) console.log(`  ${f.col}: ${f.err}`);
    if (transient.length > 6) console.log(`  … and ${transient.length - 6} more`);
    console.log("  Nothing here is a finding about the code, and no allowlist entry below is stale.");
    if ((Date.now() - startedAt) >= RETRY_BUDGET_MS) {
      console.log(`  (The ${RETRY_BUDGET_MS / 60000}min retry budget ran out, so later columns got one attempt each`);
      console.log("   rather than three — say so rather than let the attempt count differ silently.)");
    }
    console.log("  Re-run it. If it persists, check the Supabase project is up and the anon key is valid.");
  }
  process.exit(1);
}
// A read can also come back healthy and empty — wrong project, an emptied table, or RLS
// rejecting every row (PostgREST answers 200 with []). No query errored, so the check above
// cannot see it, and every column would read NO DATA and pass vacuously. 46 enriched columns
// are not all empty in a catalog of 205k routes: treat a wholesale-empty read as broken,
// never as clean. Same rule as check:counts refusing an empty read.
const noData = results.filter((r) => r.verdict === "NO DATA");
if (noData.length === results.length && results.length > 0) {
  console.log("\nEVERY column came back with no rows, and no query reported an error.");
  console.log("  That is not a clean catalog — it is a read that found nothing: an empty or wrong");
  console.log("  project, or RLS rejecting every row (PostgREST answers 200 with [] for that).");
  console.log("  Refusing to report this as a pass.");
  process.exit(1);
}
// `startsWith`, not `===`: a sentinel column reports "NEVER RENDERS (sentinel)" and must fail
// exactly like any other unrendered column. An equality test here would let the whole sentinel
// class report a defect and still exit 0 — the false pass this guard keeps having to relearn.
const isDead = (r) => r.verdict.startsWith("NEVER RENDERS");
const dead = results.filter((r) => isDead(r) && !KNOWN[r.col]);
const known = results.filter((r) => isDead(r) && KNOWN[r.col]);
if (known.length) {
  console.log("\nKNOWN, not rendered (recorded reasons):");
  for (const r of known) console.log("  " + r.col + " — " + KNOWN[r.col]);
}
// A name in KNOWN that has started rendering is stale bookkeeping; say so rather than let the
// list rot into a permanent excuse. RENDERED demands positive evidence — see its definition
// above for why "not NEVER RENDERS" is not the same question.
const stale = Object.keys(KNOWN).filter((c) => results.some((r) => r.col === c && RENDERED(r.verdict)));
if (stale.length) { console.log("\nSTALE allowlist entries (these now render — remove them): " + stale.join(", ")); process.exit(1); }
// The other direction the list can rot: a name matching NO column at all. That is bookkeeping
// about a column that has been renamed or dropped, and nothing above can see it — the stale
// test only ever looks at columns that ARE in `results`. It would otherwise sit here forever
// describing something gone. Precedent: #863 found `permit_url` had never been a column.
const orphan = Object.keys(KNOWN).filter((c) => !results.some((r) => r.col === c));
if (orphan.length) {
  console.error("\ncheck:field-renders FAILED — allowlist names no such column: " + orphan.join(", "));
  console.error("Renamed, dropped, or never existed? Fix the list rather than leaving it describing a column that is gone.");
  process.exit(1);
}
const cond = results.filter((r) => r.verdict.startsWith("conditional"));
const unprovable = results.filter((r) => r.verdict.startsWith("UNPROVABLE") || r.verdict === "NO DATA");
console.log("\n" + results.length + " fields · " + dead.length + " render nowhere · " + cond.length
  + " conditional · " + unprovable.length + " unprovable/no data");
if (unprovable.length) console.log("unprovable (no string leaf to search for): " + unprovable.map((r) => r.col).join(", "));
const partial = results.filter((r) => r.verdict.startsWith("partial"));
if (partial.length) {
  console.log("\nPARTIALLY SHOWN — these sub-keys reached no screen:");
  for (const r of partial) console.log("  " + r.col + ": " + r.missing.join(", ") + "   (sample " + r.id + ")");
}
if (dead.length) {
  console.log("\nFIELDS THAT REACH NO SCREEN:");
  // A sentinel column has no sample row by definition — printing "sample route undefined"
  // beside it reads as a broken guard rather than a real finding, which is the wrong thing to
  // hand somebody at the moment they are being told a column is dead.
  for (const r of dead) {
    if (r.verdict.startsWith("NEVER RENDERS (sentinel")) {
      const spec = SENTINELS[r.col];
      console.log("  " + r.col + "  (no populated row — probed with a sentinel on a bare "
        + spec.base.discipline + " route)\n      injected: " + JSON.stringify(spec.patch));
      continue;
    }
    console.log("  " + r.col + "  (sample route " + r.id + ")\n      value: " + JSON.stringify(r.sample));
  }
  process.exit(1);
}
console.log("\ncheck:field-renders: ok — every measurable enriched column reaches a screen.");
