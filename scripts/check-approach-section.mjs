#!/usr/bin/env node
// check:approach-section — the Plan tab has ONE approach section, and it says which way in is
// the one most parties take.
//
// It used to have two: "APPROACHES · N ways in" (the `approach_variants` cards) and, directly
// under it, a separate APPROACH box holding the `approach` paragraph. Read top to bottom the
// paragraph looked like a third way in, and nothing said which way people actually go. Measured
// 2026-09-24: 796 routes carry both columns, and on 771 the paragraph is the long-form account
// of the FIRST variant. So it now renders inside the main way in's card, and the main way in is
// the variant marked `primary:true`, else index 0.
//
// What this pins, rendering the real RouteDetail with react-dom/server:
//   1. Exactly ONE APPROACH heading on the Plan tab, and no "APPROACHES ·" heading beside it.
//   2. On a route with both columns, the paragraph renders INSIDE the main card — not after the
//      last card, which is where a sibling section would put it.
//   3. MOST USED lands on the `primary:true` entry when that entry is not index 0, and that card
//      is drawn first. It needs a RECORDED mark: unmarked ways in keep their order but no badge, and
//      a single way in carries none — there is no choice to rank.
//   3b. The paragraph, and the route-level numbers, follow `longForm:true` when the paragraph
//      describes a way in that is NOT the most used one.
//   4. The stream-crossing chip reads HAZARDS only. A crossing in the hazards trips it; "Icicle
//      Creek Road" in the notes or name does not.
//   5. Each shape reaches a screen: paragraph only, ways in only, and neither (the GapNote).
//   6. A crag with ways in and nothing else gets a Plan tab to show them on.
//   7. The main card borrows a route-level number under the SAME label Overview gives it: on a
//      summit route gain_ft is the whole ascent, never "approach gain".
//
// Structurally blind to: whether the `primary` mark is TRUE on the ground. That is data, set by
// research; this only proves the screen honours whatever the column says.
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const check = (cond, m) => (cond ? ok(m) : fail(m));
const dead = (m) => { console.log("  BROKEN GUARD  " + m); process.exit(1); };

const dir = fs.mkdtempSync(path.join(ROOT, ".cm-apsec-"));
const clean = () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } };
process.on("exit", clean);
const entry = path.join(dir, "entry.js");
const out = path.join(dir, "bundle.mjs");
try {
  fs.writeFileSync(entry, `export { default as RouteDetail, approachHasCrossing } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};\n`);
  execFileSync("npx", ["esbuild", entry,
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch {
  dead("esbuild could not bundle RouteDetail.jsx");
}
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class { constructor() { throw new Error("probe: no realtime"); } };
}
const { RouteDetail, approachHasCrossing } = await import(out + "?t=" + Date.now());
if (typeof RouteDetail !== "function") dead("RouteDetail.jsx has no default export — ANCHOR LOST");
if (typeof approachHasCrossing !== "function") dead("RouteDetail.jsx no longer exports approachHasCrossing — ANCHOR LOST");

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnMount: false } } });
const noop = () => {};
const PROSE = "Probe paragraph: follow the old grade two miles to the lake outlet.";
const V0 = { name: "Probe north trail", season: "Jul-Sep", notes: "Probe summary of the north trail.", hazards: ["Loose talus below the col."] };
const V1 = { name: "Probe south gully", season: "May-Jun, while the gully holds snow", notes: "Probe summary of the south gully.", hazards: ["Ford the Probe River at the old bridge site; high in June."] };
const ROUTE = (extra) => Object.assign({
  id: "probe_route", name: "Probe Route", grade: "5.8", discipline: "alpine", pitches: 4,
  mountainId: "probe_area", areaType: "peak",
  approach: PROSE, approachVariants: [V0, V1],
}, extra || {});
const render = (route, tab) => renderToStaticMarkup(
  React.createElement(QueryClientProvider, { client: qc },
    React.createElement(RouteDetail, {
      route, initialSubTab: tab, onBack: noop, onSubTab: noop,
      contribs: [], myReports: [], connections: [], comments: {},
      hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
      crewsForRoute: [], myStars: {}, presence: null,
    })));
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/\s+/g, " ");
const cards = (html) => html.split(/data-approach-card="/).slice(1).map((c) => ({ kind: c.slice(0, c.indexOf('"')), text: text(c.split(/data-approach-card="/)[0]) }));
const count = (s, needle) => s.split(needle).length - 1;

let both, prim1, single, proseOnly, varsOnly, none, cragVars, cragNone, summit;
try {
  both = render(ROUTE({ approachVariants: [Object.assign({}, V0, { primary: true }), V1] }), "planner");
  prim1 = render(ROUTE({ approachVariants: [V0, Object.assign({}, V1, { primary: true })] }), "planner");
  single = render(ROUTE({ approachVariants: [Object.assign({}, V0, { primary: true })] }), "planner");
  proseOnly = render(ROUTE({ approachVariants: [] }), "planner");
  varsOnly = render(ROUTE({ approach: undefined }), "planner");
  none = render(ROUTE({ approach: undefined, approachVariants: [] }), "planner");
  cragVars = render(ROUTE({ discipline: "sport", areaType: "crag", pitches: 1, approach: undefined, approachVariants: [V0] }), "overview");
  cragNone = render(ROUTE({ discipline: "sport", areaType: "crag", pitches: 1, approach: undefined, approachVariants: [] }), "overview");
  summit = render(ROUTE({ approachVariants: [V0], gainFt: 5500, gainM: 1676 }), "planner");
} catch (e) {
  dead("RouteDetail threw while rendering: " + (e && e.message));
}
if (!text(both).includes("APPROACH")) dead("the Plan tab renders no APPROACH heading at all — ANCHOR LOST");

console.log("1. one section");
check(count(text(both), "APPROACH ") - count(text(both), "APPROACH ·") >= 1 && !text(both).includes("APPROACHES"), "no second \"APPROACHES\" heading beside APPROACH");
check((both.match(/>APPROACH</g) || []).length === 1, "exactly one APPROACH heading on the Plan tab");

console.log("2. the paragraph lives inside the main card");
const bc = cards(both);
check(bc.length === 2, "two ways in render as two cards (got " + bc.length + ")");
check(bc[0] && bc[0].kind === "main" && bc[0].text.includes(PROSE), "the paragraph renders inside the MAIN card");
check(bc.slice(1).every((c) => !c.text.includes(PROSE)), "...and in no other card");
check(count(text(both), PROSE) === 1, "...exactly once on the tab");

console.log("3. most used");
check(bc[0] && bc[0].text.includes("Most used") && bc[0].text.includes(V0.name), "primary:true on the first way in: drawn first, badged Most used");
const unmarked = render(ROUTE(), "planner");
const uc = cards(unmarked);
check(uc[0] && uc[0].text.includes(V0.name) && !text(unmarked).includes("Most used"), "with NO recorded mark the first way in is drawn first but NOT badged — order is not a claim");
check(uc[0] && uc[0].text.includes(PROSE), "...and the paragraph still hangs under it");
const pc = cards(prim1);
check(pc[0] && pc[0].text.includes(V1.name) && pc[0].text.includes("Most used"), "primary:true on index 1 draws it FIRST, badged Most used");
check(pc[1] && pc[1].text.includes(V0.name) && !pc[1].text.includes("Most used"), "...and the unmarked one loses the badge");
check(pc[0] && pc[0].text.includes(PROSE), "...and the paragraph follows the main way in");
check(!text(single).includes("Most used"), "a single way in carries no badge — there is no choice to rank");

console.log("3b. the paragraph follows longForm");
const lf = render(ROUTE({ gainFt: 1200, discipline: "trad", areaType: "peak", approachVariants: [Object.assign({}, V0, { primary: true }), Object.assign({}, V1, { longForm: true })] }), "planner");
const lc = cards(lf);
check(lc[0] && lc[0].text.includes(V0.name) && lc[0].text.includes("Most used") && !lc[0].text.includes(PROSE), "longForm on another way in: the Most used card does NOT carry the paragraph");
check(lc[1] && lc[1].text.includes(PROSE), "...the way in it describes does");
check(lc[1] && /approach gain/.test(lc[1].text) && !(lc[0] && /approach gain/.test(lc[0].text)), "...and so do the route-level numbers, which measure the same approach");
console.log("4. stream crossing reads hazards only");
check(bc[1] && bc[1].text.includes("Stream crossing"), "a ford in the hazards shows the chip");
check(bc[0] && !bc[0].text.includes("Stream crossing"), "a way in with no crossing hazard does not");
check(approachHasCrossing(["Ford the river"]) && approachHasCrossing(["Cross Mountaineer Creek on a log"]) && approachHasCrossing(["Creek crossing can be high"]), "the matcher recognises ford / cross X creek / creek crossing");
check(approachHasCrossing(["Slick or partly submerged log bridges over Mountaineer Creek early season"]) && approachHasCrossing(["A Terror Creek log crossing that can be submerged"]), "a log bridge or log crossing over named water is a crossing");
check(!approachHasCrossing(["avalanche debris of slide alder and downed logs"]) && !approachHasCrossing(["Railway crossing on the approach"]) && !approachHasCrossing(["Crevasses on the North Mowich crossing"]), "...but downed logs, a railway or a glacier crossing is not");
check(!approachHasCrossing(["Icicle Creek Road washes out"]) && !approachHasCrossing(["Rockfall below the river bench"]), "...and not a place named after a creek, or a river mentioned in passing");
const nameOnly = render(ROUTE({ approachVariants: [{ name: "Icicle Creek Road to the ford-free trail", notes: "Cross the creek on the bridge.", hazards: ["Loose rock"] }] }), "planner");
check(!text(nameOnly).includes("Stream crossing"), "a crossing in the NOTES or NAME does not trip the chip");

console.log("5. every shape reaches a screen");
check(text(proseOnly).includes(PROSE) && (proseOnly.match(/>APPROACH</g) || []).length === 1, "paragraph only: one APPROACH, with the paragraph");
check(text(varsOnly).includes(V0.name) && text(varsOnly).includes(V1.name) && !text(varsOnly).includes("Full description"), "ways in only: every way in, no empty Full description");
check(text(none).includes("No approach description"), "neither: the GapNote says the walk is not written down");

console.log("6. a crag with only ways in gets a Plan tab");
check(/>Plan</.test(cragVars), "a crag whose only approach data is ways in offers a Plan tab");
check(!/>Plan</.test(cragNone), "...and a bare crag still does not (control)");

console.log("7. borrowed numbers keep Overview's label");
const sc = cards(summit);
check(sc[0] && /total ascent/.test(sc[0].text) && !/approach gain/.test(sc[0].text), "on a summit route the borrowed gain reads \"total ascent\", never \"approach gain\"");

if (failures) { console.log(`\ncheck:approach-section: ${failures} FAILED`); process.exit(1); }
console.log("\ncheck:approach-section: ok — one APPROACH section; the main way in is first, marked, and carries the paragraph.");
