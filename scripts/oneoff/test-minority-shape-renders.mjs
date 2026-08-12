// A whole-table shape audit found FIVE routes columns holding more than one JS shape.
// #780 fixed two (gear, watch_out). This asks the only question that matters about the
// other three: does the app SURVIVE the minority shape, and does it still show anything?
//
//   pitch_detail  918 arrays + 2 strings
//   itinerary     544 objects + 322 strings
//   sling_rack    221 objects + 21 arrays
//
// Renders the real RouteDetail (bundled from source, not a copy) with the REAL row, so a
// throw here is a throw a climber would get.
//
// usage: node scripts/oneoff/test-minority-shape-renders.mjs
import { build } from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { requireServiceKey, headers, SUPABASE_URL } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
import { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};
const h = React.createElement, noop = () => {};
// RouteDetail mounts react-query hooks; without a provider EVERY render throws
// "No QueryClient set" — which reads exactly like the crash under test. The control cases
// below exist to catch that: they failed identically on the first run, which is how the
// missing provider was found rather than reported as a finding.
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
export { dbRouteToCamel };
export function render(route, tab) {
  return renderToStaticMarkup(h(QueryClientProvider, { client: qc },
    h(RouteDetail, {
      route, initialSubTab: tab, onBack: noop, onSubTab: noop,
      contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {},
      diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null })));
}`;

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-shape-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true,
  format: "cjs", platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" },
  define: { "import.meta.env": "{}" }, outfile: out, logLevel: "error" });
const { render, dbRouteToCamel } = require_(out);

const H = headers(requireServiceKey());
async function row(id) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*,areas(*)&id=eq.${id}`, { headers: H });
  const [x] = await r.json();
  if (!x) { console.error(`ANCHOR LOST: ${id} is not in the live DB — nothing below was checked.`); process.exit(1); }
  return x;
}

const TABS = ["overview", "conditions", "planner", "safety", "photos", "ranks"];
const CASES = [
  { col: "pitch_detail", shape: "string", id: "wa_hozomeen_mountain_south_peak_southeast_buttress" },
  { col: "pitch_detail", shape: "string", id: "wa_hozomeen_mountain_south_peak_southwest_route" },
  { col: "itinerary", shape: "string", id: "adams_avalanche_glacier" },
  { col: "itinerary", shape: "string", id: "wa_abernathy_peak_south_ridge" },
  { col: "sling_rack", shape: "array", id: "wa_american_border_peak_southeast_face" },
  // Controls: the MAJORITY shape of each, which must stay clean.
  { col: "pitch_detail", shape: "array (control)", id: "adams_northwest_ridge" },
  { col: "itinerary", shape: "object (control)", id: "wa_a_servant_to_liberty" },
  { col: "sling_rack", shape: "object (control)", id: "wa_a_servant_to_liberty" },
];

let threw = 0, dirty = 0;
for (const c of CASES) {
  const camel = dbRouteToCamel(await row(c.id));
  const bad = [];
  for (const tab of TABS) {
    try {
      const html = render(camel, tab);
      if (/\[object Object\]|\bNaN\b|\bundefined\b/.test(html.replace(/<[^>]+>/g, " "))) bad.push(`${tab}:bad-token`);
    } catch (e) {
      bad.push(`${tab}:THREW ${String(e.message).slice(0, 80)}`);
    }
  }
  const verdict = bad.length ? "FAIL" : "ok  ";
  if (bad.some((b) => b.includes("THREW"))) threw++;
  else if (bad.length) dirty++;
  console.log(`  ${verdict} ${c.col.padEnd(13)} ${c.shape.padEnd(18)} ${c.id}`);
  for (const b of bad) console.log(`         ${b}`);
}
console.log(threw || dirty ? `\n${threw} route(s) threw, ${dirty} rendered a bad token` : "\nevery shape rendered cleanly");

// Not throwing is only half of it. The pitch_detail prose is the ONLY description those two
// routes have, so the fix has to keep it on screen — "no crash" would be satisfied just as
// well by silently dropping it, which is the descent_text failure all over again.
console.log("\nprose from a string pitch_detail must still reach a screen:");
let lost = 0;
for (const id of ["wa_hozomeen_mountain_south_peak_southeast_buttress", "wa_hozomeen_mountain_south_peak_southwest_route"]) {
  const src = await row(id);
  const probe = String(src.pitch_detail).trim().slice(0, 60);
  const camel = dbRouteToCamel(src);
  let seenOn = null;
  for (const tab of TABS) {
    const text = render(camel, tab).replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ");
    if (text.includes(probe.replace(/\s+/g, " "))) { seenOn = tab; break; }
  }
  if (!seenOn) lost++;
  console.log(`  ${seenOn ? "ok  " : "FAIL"} ${id} ${seenOn ? "renders on " + seenOn : "PROSE LOST — it no longer appears on any sub-tab"}`);
}
// Same question of the other two minority shapes. They do not crash, but "does not crash"
// and "is shown to anybody" are different claims, and only the second one matters to a
// climber. Reported rather than asserted: whether a prose itinerary DESERVES a home is a
// product call, not a bug, so this prints the state instead of failing the run.
console.log("\nreachability of the non-crashing minority shapes (report only):");
for (const [col, id] of [["itinerary", "adams_avalanche_glacier"], ["itinerary", "wa_abernathy_peak_south_ridge"],
                         ["itinerary", "wa_a_servant_to_liberty"], ["sling_rack", "wa_american_border_peak_southeast_face"]]) {
  const src = await row(id);
  const v = src[col];
  const isMinority = col === "itinerary" ? typeof v === "string" : Array.isArray(v);
  // Probe the MIDDLE of the string, never its opening. ItineraryView parses a prose
  // itinerary's "Day 1:" / "Day 2:" prefixes into day cards, so the opening characters are
  // exactly the part that does not survive verbatim — a prefix probe called
  // adams_avalanche_glacier's itinerary missing at both 55 and 30 chars, while "Mad Cat
  // Meadow" from the middle of the same sentence is plainly on the planner tab. A
  // reachability probe aimed at reformatted text manufactures findings.
  // ...and it is not enough to avoid the FIRST marker: a fixed offset lands on a later one.
  // Split on the day markers and probe inside the longest surviving segment, which is text
  // the renderer passes through verbatim.
  const mid = (s) => {
    const seg = String(s).trim().split(/Day\s*\d+\s*:/i).map((x) => x.trim()).sort((a, b) => b.length - a.length)[0] || "";
    return seg.slice(0, 30);
  };
  const probe = col === "itinerary"
    ? (typeof v === "string" ? mid(v) : mid(((v.days || [{}])[0] || {}).note || ""))
    : String((v && v[0] && v[0].sizeCm) || "");
  const camel = dbRouteToCamel(src);
  let on = null;
  for (const tab of TABS) {
    const t = render(camel, tab).replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
    if (probe && t.includes(probe.replace(/\s+/g, " "))) { on = tab; break; }
  }
  console.log(`  ${col.padEnd(11)} ${(isMinority ? "minority" : "majority").padEnd(9)} ${id.padEnd(38)} ${on ? "renders on " + on : "NOT ON ANY TAB"}`);
}

process.exit(threw || dirty || lost ? 1 : 0);

// Injection-tested 2026-08-12:
//   pitchDetail:r.pitch_detail (revert the coercion) -> both Hozomeen routes THROW on
//     overview with "route.pitchDetail.reduce is not a function"
//   keep the coercion, drop the beta rescue        -> no crash, but PROSE LOST on both.
//     This is the case that matters: a crash-only test would have passed a fix that
//     silently discarded the only description those two routes have.
// The three majority-shape controls stayed green throughout; on the very first run they
// all failed with "No QueryClient set", which is how the missing provider was caught
// instead of being reported as a finding.
