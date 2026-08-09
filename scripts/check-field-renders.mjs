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
  ["permit", "permits"], ["permit_url", "permitUrl"],
  ["waypoints", "waypoints"], ["gpx", "gpxPts"], ["elev_pts", "elevPts"],
  ["itinerary", "itinerary"], ["timing", "timing"], ["turnaround", "turnaround"],
  ["hazards", "hazards"], ["obj_haz", "objHaz"], ["watch_out", "watchOut"],
  ["comms", "comms"], ["emergency", "emergency"], ["bail", "bail"],
  ["climate", "climate"], ["season", "season"], ["best_season", "bestSeason"],
  ["seasonal_guidance", "seasonalGuidance"], ["seasonal_hazards", "seasonalHazards"],
  ["crowds", "crowds"], ["partner_requirements", "partnerRequirements"],
  ["pitch_detail", "pitchDetail"], ["rappel_detail", "rappelDetail"], ["rappel_count_note", "rappelCountNote"],
  ["gear", "gear"], ["detailed_rack", "detailedRack"], ["what_to_bring", "whatToBring"],
  ["pro_tips", "proTips"], ["pro_needs", "proNeeds"], ["beta", "beta"],
  ["overview", "overview"], ["description", "desc"], ["face", "face"],
  ["sling_rack", "slingRack"], ["rope_note", "ropeNote"], ["corrections", "corrections"],
  ["verif", "verif"], ["data_quality", "dataQuality"], ["lists", "lists"],
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
import { SeasonalGuidancePanel, CrowdsPanel, DataQualityPanel, PartnerRequirementsPanel } from ${JSON.stringify(path.join(ROOT, "EnrichmentPanels.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
const h = React.createElement;
export { dbRouteToCamel };
// Mirrors the per-sub-tab sibling blocks in ClimbMatch.jsx.
function siblings(route, tab) {
  const r = enrichRoute(route);
  const mtn = MOUNTAINS.find((x) => x.id === route.mountainId) || route._dbArea;
  if (tab === "overview") return [h(DataQualityPanel, { key: "dq", route: r, C, ActionIcon })];
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

async function rowWith(col) {
  // order=id.asc is load-bearing: PostgREST gives no ordering guarantee, so an unordered
  // limit=8 returns a DIFFERENT eight rows run to run. That made the whole guard
  // non-deterministic — `rappel_detail` read "renders" one run and "unprovable" the next,
  // with no code change between them. A guard whose verdict depends on server row order
  // cannot be trusted either way.
  const url = `${SUPABASE_URL}/rest/v1/routes?select=*,areas(*)&${col}=not.is.null&order=id.asc&limit=8`;
  const r = await fetch(url, { headers: headers(KEY) });
  if (!r.ok) return [];
  const rows = await r.json();
  return Array.isArray(rows) ? rows : [];
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

const results = [];
for (const [col, field] of FIELDS) {
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
  lists: "membership keys, not display copy — consumed by ticksFor/inList via "
    + "`.includes(\"state_hp\")`. NOTE: the live column holds free prose (\"Bulger List "
    + "(Washington's 100 highest peaks)\"), which that exact-match test can never satisfy, so "
    + "the badge it feeds cannot fire for DB routes. A data-shape question, not a render one.",
};
const dead = results.filter((r) => r.verdict === "NEVER RENDERS" && !KNOWN[r.col]);
const known = results.filter((r) => r.verdict === "NEVER RENDERS" && KNOWN[r.col]);
if (known.length) {
  console.log("\nKNOWN, not rendered (recorded reasons):");
  for (const r of known) console.log("  " + r.col + " — " + KNOWN[r.col]);
}
// A name in KNOWN that has started rendering is stale bookkeeping; say so rather than let the
// list rot into a permanent excuse.
const stale = Object.keys(KNOWN).filter((c) => !results.some((r) => r.col === c && r.verdict === "NEVER RENDERS"));
if (stale.length) { console.log("\nSTALE allowlist entries (these now render — remove them): " + stale.join(", ")); process.exit(1); }
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
  for (const r of dead) console.log("  " + r.col + "  (sample route " + r.id + ")\n      value: " + JSON.stringify(r.sample));
  process.exit(1);
}
console.log("\ncheck:field-renders: ok — every measurable enriched column reaches a screen.");
