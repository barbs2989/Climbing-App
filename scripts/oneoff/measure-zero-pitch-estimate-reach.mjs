#!/usr/bin/env node
/* DOES A ROPED ROUTE STORING `pitches = 0` ACTUALLY RENDER A TIME ESTIMATE WITH NO CLIMBING LEG?
 *
 * #1779 reported the column counts and said plainly that the render reach was NOT measured:
 * 120,474 roped routes store `pitches = 0` against 611 with a real count, and `techHrs` returns 0
 * for those — no climbing leg at all. `0074` records the root cause: 0 means "unknown" for a roped
 * route and "no pitches" for a boulder problem. A column count is not a defect count, because the
 * Plan tab is content-gated; this asks the question that was left open.
 *
 * THE GATE CHAIN, read from RouteDetail.jsx rather than assumed — and the FIRST gate is the one
 * that decides this question, which a count of the column cannot see:
 *
 *   cragOnly = ["trad","sport","bouldering"].includes(catOf(route))
 *   {!cragOnly ? <Calculator/> : null}          <- THE ESTIMATE DOES NOT EXIST FOR A CRAG ROUTE
 *   hasPlanContent(route)                       -> is there a Plan tab at all?
 *   hasAnyEstimate = hasHikeInputs || hasPublishedSummitH || hasDerivedSummitH || !!route.pitches
 *   techH          = published ?: derived ?: techHrs(route.pitches, ...)
 *
 * A trad or sport route NEVER renders a time estimate — the Calculator is not mounted for it at
 * all. Those two dominate the roped catalog, so most of the 120,474 cannot make a false claim by
 * construction. This was NOT in the first version of this script, and the render validation in
 * section 3 is what caught it: 21 of 28 sampled rows "disagreed" because the tile was not there.
 * A static predicate over columns is a claim about the renderer, and this one was wrong.
 *
 * AND THE LAST DISJUNCT IS WHY THIS MATTERS LESS THAN THE COLUMN COUNT SUGGESTS. `!!route.pitches`
 * is FALSY at 0, so a route storing 0 does NOT claim an estimate on the strength of its pitch
 * count. It renders one only if it has hike inputs or a published/derived summit time — and where
 * a published or derived time exists, THAT is the climbing leg and nothing is missing. So the
 * defect population is the narrow middle: hike inputs, no timing, zero pitches — a roped climb
 * timed as a pure walk.
 *
 * `retH` agrees: `route.pitches > 0 ? techH*0.7 : (hikeCoversWholeDay ? 0 : hikeH*0.75)`, so the
 * return leg also takes the WALK branch. The route is consistently modelled as a hike.
 *
 * THE STATIC PREDICATE IS A CLAIM ABOUT THE RENDERER, so section 3 RENDERS a sample of real rows
 * through the real RouteDetail and fails if the prediction and the screen disagree — in either
 * direction. Without that this is arithmetic about columns wearing a finding's clothes.
 *
 * REPORT ONLY. Writes nothing.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);
const argv = process.argv.slice(2);
const STATE = argv.includes("--state") ? argv[argv.indexOf("--state") + 1] : null;
const SAMPLE = argv.includes("--sample") ? parseInt(argv[argv.indexOf("--sample") + 1]) : 12;

/* `pitches` means ROPED pitches. A boulder problem storing 0 is stating a fact, not a gap — that
   is exactly the conflation 0074 records, so the boulder disciplines are out of scope by
   construction rather than by a filter someone has to remember. */
const ROPED = new Set(["trad", "sport", "alpine", "ice", "mixed", "aid", "rock"]);

// hasPlanContent is LIFTED from the app rather than retyped; a copy would agree with itself
// whatever RouteDetail does, which is the whole question.
const rdSrc = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
const hpc = rdSrc.match(/function hasPlanContent\(route\)\{[\s\S]*?\n?\}/);
if (!hpc) { console.error("FAIL - ANCHOR LOST: hasPlanContent is not where this expects it. Nothing measured."); process.exit(1); }
const hasPlanContent = new Function(`${hpc[0]}; return hasPlanContent;`)();
// Self-test the lift before trusting it.
if (hasPlanContent({ approach: "walk in" }) !== true || hasPlanContent({}) !== false) {
  console.error("FAIL - the lifted hasPlanContent does not behave as documented. Nothing measured.");
  process.exit(1);
}

/* `catOf` decides cragOnly and therefore whether the Calculator is mounted at all. Lifted from
   ClimbMatchCore for the same reason, and self-tested: it folds discipline "rock" onto its style,
   which defaults to Trad, so a `rock` route is a CRAG route and renders no estimate. */
const coreSrc = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const cm = coreSrc.match(/function catOf\(r\)\{[\s\S]*?\n?\}/);
if (!cm) { console.error("FAIL - ANCHOR LOST: catOf is not where this expects it. Nothing measured."); process.exit(1); }
const catOf = new Function(`${cm[0]}; return catOf;`)();
if (catOf({ discipline: "alpine" }) !== "alpine" || catOf({ discipline: "rock" }) !== "trad" || catOf({ discipline: "rock", style: "Sport" }) !== "sport") {
  console.error("FAIL - the lifted catOf does not behave as documented. Nothing measured.");
  process.exit(1);
}
const CRAG = ["trad", "sport", "bouldering"];
const isCragOnly = (rt) => CRAG.includes(catOf(rt));

const FT = 3.28084;
// Mimic dbRouteToCamel for the fields the gate reads. It SPREADS the raw row, so anything not
// renamed arrives under its column name — `pitches` among them, checked rather than assumed.
const camel = (r) => ({
  ...r,
  distKm: r.dist_km,
  gainM: r.gain_ft != null ? Math.round(r.gain_ft / FT) : null,
  lossM: r.loss_ft != null ? Math.round(r.loss_ft / FT) : null,
  descentText: r.descent_text,
  approachLogistics: r.approach_logistics || null,
  timing: r.timing,
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
  mountainId: "probe_area",
});

const gate = (rt) => {
  const t = rt.timing;
  const hasHikeInputs = (rt.distKm != null && rt.distKm !== "") || (rt.gainM != null && rt.gainM !== "");
  const hasPublished = !!(t && t.summitTimeHrs != null);
  const derived = (!hasPublished && t && t.totalHrs != null)
    ? Math.max(0, t.totalHrs - (t.approachTimeHrs || 0) - (t.descentTimeHrs || 0)) : null;
  const hasDerived = derived != null && derived > 0;
  const publishedIsWholeDay = !!(t && t.summitTimeHrs != null && t.totalHrs != null && t.summitTimeHrs === t.totalHrs && t.approachTimeHrs == null);
  const hasAnyEstimate = hasHikeInputs || hasPublished || hasDerived || !!rt.pitches;
  return { hasHikeInputs, hasPublished, hasDerived, publishedIsWholeDay, hasAnyEstimate };
};

const k = anonKey();
/* `driveMinSLC` is one of hasPlanContent's inputs and there is NO such column — it is seed-only,
   like `avgPitchLength`. Asking for it returns 42703 and kills the read, so it is deliberately
   absent here: on a DB route that input is always undefined and can never open the Plan tab. */
const COLS = "id,name,discipline,pitches,grade,dist_km,gain_ft,loss_ft,timing,road,approach,descent,descent_text,approach_logistics,waypoints,rappels";
async function readAll() {
  const out = []; let last = "";
  for (;;) {
    const f = STATE ? `&id=like.${STATE}_*` : "";
    const url = `${SUPABASE_URL}/rest/v1/routes?select=${COLS}${f}&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`;
    const res = await fetch(url, { headers: headers(k) });
    if (!res.ok) throw new Error(`read failed ${res.status} ${await res.text()}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}

const rows = await readAll();
if (!rows.length) { console.error("FAIL - read 0 routes. A broken query, not a clean catalog."); process.exit(1); }

const roped = rows.filter((r) => ROPED.has(r.discipline));
const zero = roped.filter((r) => !r.pitches);            // 0 and null are both falsy to the app
const real = roped.filter((r) => r.pitches > 0);

const buckets = { noCalculator: [], noPlanTab: [], noEstimate: [], timed: [], DEFECT: [] };
for (const r of zero) {
  const rt = camel(r);
  if (isCragOnly(rt)) { buckets.noCalculator.push(rt); continue; }   // the estimate is not mounted
  if (!hasPlanContent(rt)) { buckets.noPlanTab.push(rt); continue; }
  const g = gate(rt);
  if (!g.hasAnyEstimate) { buckets.noEstimate.push(rt); continue; }
  if (g.hasPublished || g.hasDerived) { buckets.timed.push(rt); continue; }
  buckets.DEFECT.push(rt);
}

const scope = STATE ? STATE.toUpperCase() : "the whole catalog";
console.log(`\n=== does a roped \`pitches = 0\` route render an estimate with no climbing leg? (${scope}) ===\n`);
console.log(`  ${rows.length} routes read`);
console.log(`  ${roped.length} are a ROPED discipline (${[...ROPED].join(", ")})`);
console.log(`     ${real.length} carry a real pitch count`);
console.log(`     ${zero.length} store 0 or null  <- the population #1779 reported\n`);
console.log(`  Of those ${zero.length}:`);
console.log(`    ${String(buckets.noCalculator.length).padStart(7)}  are a CRAG discipline, so <Calculator/> is never mounted - there is NO`);
console.log(`             time estimate on the page at all, and no claim to be wrong`);
console.log(`    ${String(buckets.noPlanTab.length).padStart(7)}  have NO Plan tab at all (hasPlanContent false) - nothing is claimed`);
console.log(`    ${String(buckets.noEstimate.length).padStart(7)}  have a Plan tab and render "N/A" - no hike inputs, no timing, and`);
console.log(`             \`!!route.pitches\` is FALSY at 0, so no estimate is claimed`);
console.log(`    ${String(buckets.timed.length).padStart(7)}  carry a published or derived summit time - THAT is the climbing leg,`);
console.log(`             so nothing is missing`);
console.log(`    ${String(buckets.DEFECT.length).padStart(7)}  RENDER A NUMBER WITH A ZERO CLIMBING LEG  <- the defect\n`);

if (buckets.DEFECT.length) {
  console.log(`  The defect set, by discipline:`);
  const byDisc = new Map();
  for (const r of buckets.DEFECT) byDisc.set(r.discipline, (byDisc.get(r.discipline) || 0) + 1);
  for (const [d, n] of [...byDisc.entries()].sort((a, b) => b[1] - a[1])) console.log(`    ${String(n).padStart(7)}  ${d}`);
  console.log(`\n  Examples:`);
  for (const r of buckets.DEFECT.slice(0, 10)) console.log(`    ${r.id}  [${r.discipline}]  grade=${JSON.stringify(String(r.grade || "").slice(0, 28))}  distKm=${r.distKm}  gainM=${r.gainM}`);
  console.log("");
}

/* SECTION 3 - VALIDATE THE PREDICTION AGAINST THE ACTUAL SCREEN.
   A bucket count derived from columns is a claim about the renderer. This renders real rows and
   fails if the screen disagrees, in EITHER direction: a predicted "N/A" that shows a number, or a
   predicted number that shows "N/A". */
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route) {
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
    React.createElement(RouteDetail, { route, initialSubTab: "planner", onBack: noop, onSubTab: noop,
      contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {},
      gearEdits: {}, diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null })));
}
`;
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-zeropitch-"));
const outFile = path.join(outDir, "bundle.cjs");
let render;
try {
  await build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
    bundle: true, format: "cjs", platform: "node", jsx: "automatic",
    loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
    outfile: outFile, logLevel: "error",
  });
  ({ render } = require_(outFile));
} catch (e) {
  console.error(`FAIL - could not build the render harness: ${e.message}`);
  process.exit(1);
}
process.on("exit", () => { try { fs.rmSync(outDir, { recursive: true, force: true }); } catch {} });

// The value div sits immediately BEFORE the "Est. <label>" caption; the label is
// discipline-dependent (top-out / finish / summit), so match the caption loosely and capture
// the value that precedes it.
const VALUE = /<div[^>]*>([^<]*)<\/div><div[^>]*>Est\.\s*(top-out|finish|summit)</;
const readTile = (html) => { const m = html.match(VALUE); return m ? { value: m[1].trim(), label: m[2] } : null; };

const pick = (arr, n) => arr.slice(0, Math.max(0, n));
/* The `absent` cases are the load-bearing half: they assert the estimate is NOT on the page for a
   crag route. Without them this validates only the rows that DO render and would have re-confirmed
   the very prediction that turned out to be wrong. */
const cases = [
  ...pick(buckets.DEFECT, SAMPLE).map((r) => ({ r, expect: "number" })),
  ...pick(buckets.noEstimate, SAMPLE).map((r) => ({ r, expect: "N/A" })),
  ...pick(buckets.timed, Math.min(4, SAMPLE)).map((r) => ({ r, expect: "number" })),
  ...pick(buckets.noCalculator, Math.min(6, SAMPLE)).map((r) => ({ r, expect: "absent" })),
];
console.log(`  --- VALIDATION: the prediction rendered through the real RouteDetail (${cases.length} rows)\n`);
let checked = 0, wrong = 0;
for (const c of cases) {
  let html;
  try { html = render(c.r); } catch (e) { console.log(`    ERROR ${c.r.id}: ${e.message.slice(0, 90)}`); wrong++; continue; }
  const tile = readTile(html);
  const got = !tile ? "absent" : tile.value === "N/A" ? "N/A" : "number";
  checked++;
  if (got !== c.expect) {
    wrong++;
    console.log(`    MISMATCH ${c.r.id} [${c.r.discipline}]: predicted ${c.expect}, screen shows ${got}${tile ? ` (${JSON.stringify(tile.value)})` : " - no estimate tile on the page"}`);
  }
}
console.log(`    ${checked} rendered, ${wrong} disagreed with the prediction\n`);

/* SECTION 4 - IS THE DEFECT HEDGED? The app already owns a marker for "this number is a LOWER
   BOUND": `approachUnknown` prefixes "≥" when the hike inputs are incomplete. There is no
   equivalent for an unknown CLIMBING leg, so a route with COMPLETE hike inputs and no pitch count
   presents an EXACT total that silently counts the climbing as zero — while the Climbing tile
   beside it already says "N/A". Read off the screen rather than re-derived. */
if (buckets.DEFECT.length) {
  console.log(`  --- IS IT HEDGED? The "≥" marker means "lower bound" and already exists.\n`);
  let hedged = 0, bare = 0;
  for (const r of buckets.DEFECT) {
    let html;
    try { html = render(r); } catch { continue; }
    const tile = readTile(html);
    if (!tile) continue;
    const isHedged = tile.value.startsWith("≥");
    if (isHedged) hedged++; else bare++;
    console.log(`    ${isHedged ? "hedged " : "BARE   "} ${r.id}  Est. ${tile.label} = ${tile.value}`);
  }
  console.log(`\n    ${hedged} already carry "≥" (their hike inputs are incomplete, so the app already`);
  console.log(`      says the number is a lower bound).`);
  console.log(`    ${bare} present an EXACT total beside a Climbing tile reading "N/A" - the sharp end`);
  console.log(`      of this defect, and the #641 direction: erring short on "am I down before dark".\n`);
}
if (!cases.length) { console.error("FAIL - nothing to validate; the buckets are empty, so the prediction is untested."); process.exit(1); }
if (wrong) { console.error(`FAIL - the static prediction and the screen disagree on ${wrong} row(s). The bucket counts above are not trustworthy.`); process.exit(1); }
console.log(`  ok - the screen agrees with the prediction on every sampled row.\n`);
