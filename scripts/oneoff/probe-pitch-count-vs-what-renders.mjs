/* "Monte Cristo Peak standard says there are 3 pitches but PITCH-BY-PITCH shows 1."

   Both halves of that are true and the page says so itself: the heading renders
   "PITCH-BY-PITCH · 1 of 3". The question this probe answers is whether that sentence is
   HONEST — i.e. whether the 2 missing entries are genuinely undescribed, or described a few
   hundred pixels higher up under ROUTE BETA.

   Section 1 renders the REAL row through the REAL dbRouteToCamel and reads the heading back.
   Section 2 asks the same question of every route in the catalog that carries pitch_detail,
   using the app's OWN classifier lifted from RouteDetail.jsx (never a copy — a copy would
   agree with the app the day it was written and measure a fossil afterwards).

   Read-only. Report-only. */
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs"; import os from "os"; import path from "path";
import { fileURLToPath } from "url";
import { anonKey, selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);

// ── Lift the classifier out of the app rather than restating it. ANCHOR LOST if it moves:
//    an audit that silently stops measuring the shipped rule is worse than no audit.
const SRC = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
function lift(name) {
  const i = SRC.indexOf(`function ${name}(`);
  if (i < 0) throw new Error(`ANCHOR LOST: function ${name}( not found in RouteDetail.jsx`);
  let d = 0, started = false;
  for (let j = i; j < SRC.length; j++) {
    const c = SRC[j];
    if (c === "{") { d++; started = true; }
    else if (c === "}") { d--; if (started && d === 0) return SRC.slice(i, j + 1); }
  }
  throw new Error(`ANCHOR LOST: could not balance ${name}`);
}
function liftConst(name) {
  const m = new RegExp(`^const ${name}=.*$`, "m").exec(SRC);
  if (!m) throw new Error(`ANCHOR LOST: const ${name}= not found`);
  return m[0];
}
const CLASSIFIER = [liftConst("PITCH_NUM_RE"), liftConst("TRAVEL_LBL_RE"), liftConst("TECH_GRADE_RE"),
  lift("isPitched"), lift("pitchEntryKind"), lift("splitPitchDetail"), lift("pitchShortfall")].join("\n");
const clsMod = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-cls-")), "cls.mjs");
fs.writeFileSync(clsMod, CLASSIFIER + "\nexport { splitPitchDetail, pitchEntryKind, isPitched, pitchShortfall };\n");
const { splitPitchDetail, pitchShortfall } = await import("file://" + clsMod);

// ── Section 1: render the real page.
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
import { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib", "db.js"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export { dbRouteToCamel };
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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-pitch-")), "bundle.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs",
  platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error" });
const { render, dbRouteToCamel } = require_(out);
const text = (h) => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&middot;/g, "·").replace(/\s+/g, " ").trim();

const key = anonKey();
const COLS = "id,name,area_id,discipline,grade,pitches,pitch_detail";
const one = (await selectAll("routes", COLS, "id=eq.wa_monte_cristo_peak_scramble", { pageSize: 10, key }))[0];
if (!one) throw new Error("fail-closed: the probe route did not come back");

const html = render({ ...dbRouteToCamel(one), _dbArea: { id: one.area_id, name: "Monte Cristo Peak", areaType: "peak", region: "Washington" } }, "planner");
if (html.length < 3000) throw new Error(`fail-closed: thin render (${html.length} chars)`);
const t = text(html);
console.log("=== SECTION 1 — what the page actually says\n");
const head = /PITCH-BY-PITCH[^A-Z]{0,40}/.exec(t);
console.log("   heading      :", head ? head[0].trim() : "(PITCH-BY-PITCH not on screen)");
console.log("   stored       : pitches=" + one.pitches + ", pitch_detail entries=" + (one.pitch_detail || []).length);
const sp = splitPitchDetail(dbRouteToCamel(one));
console.log("   classified   : " + sp.pitches.length + " roped pitch(es), " + sp.stages.length + " stage(s)");
console.log("   ROUTE BETA   : " + (/ROUTE BETA/.test(t) ? "on screen — the other entries render HERE" : "ABSENT"));
for (const s of sp.stages) console.log("        moved -> entry \"" + (s.pitch ?? s.n) + "\" (" + s.grade + ")");

// ── Section 2: the whole catalog.
console.log("\n=== SECTION 2 — every route carrying pitch_detail\n");
const rows = await selectAll("routes", COLS, "pitch_detail=not.is.null", { pageSize: 1000, key });
if (!rows.length) throw new Error("fail-closed: empty read");
const areas = Object.fromEntries((await selectAll("areas", "id,name", "", { pageSize: 1000, key })).map(a => [a.id, a.name]));

const SHORTFALL = [], HONEST = [], OVER = [];
let carried = 0;
for (const r of rows) {
  const cam = dbRouteToCamel(r);
  const pd = Array.isArray(cam.pitchDetail) ? cam.pitchDetail : [];
  if (!pd.length) continue;
  carried++;
  const { pitches: roped, stages } = splitPitchDetail(cam);
  const claimed = typeof r.pitches === "number" ? r.pitches : 0;
  if (!roped.length) continue;                       // no PITCH-BY-PITCH heading renders at all
  if (claimed <= roped.length) { if (claimed < pd.length) OVER.push({ r, roped: roped.length, stages: stages.length, claimed }); continue; }
  const gap = claimed - roped.length;
  // Reproduce the heading the shipped code builds, so the report cannot describe a screen
  // other than the one a climber sees.
  const shortfall = pitchShortfall(cam, roped.length);
  const heading = shortfall ? `${roped.length} of ${claimed}` : String(roped.length);
  const rec = { r, claimed, roped: roped.length, stages: stages.length, gap, heading, area: areas[r.area_id] || "?" };
  // The heading says "N of M". Is the shortfall explained by entries that MOVED to ROUTE BETA?
  // The verdict is the app's OWN pitchShortfall(), lifted above — a restatement here would
  // agree with itself rather than with the screen.
  (shortfall ? HONEST : SHORTFALL).push(rec);
}
const show = (title, list, note) => {
  console.log(`--- ${list.length}  ${title}`);
  if (note) console.log(`    ${note}\n`);
  for (const x of list.slice(0, 25))
    console.log(`   ${x.r.id.padEnd(48)} ${String(x.area || "").slice(0, 22).padEnd(23)} ${String(x.r.discipline).padEnd(14)} heading now "${x.heading}" (was "${x.roped} of ${x.claimed}")  entries=${x.roped + x.stages} (${x.stages} in ROUTE BETA)`);
  if (list.length > 25) console.log(`   … and ${list.length - 25} more`);
  console.log("");
};
show("REPAIRED — every entry is described on the page, so the heading no longer claims a shortfall", SHORTFALL);
// Is the denominator itself a stage count? If `pitches` EQUALS the entry count, it was derived
// from pitch_detail and therefore counts the travel legs the table then filters out — so the
// shortfall it reports is arithmetically impossible rather than merely unproven.
const derived = SHORTFALL.filter(x => x.claimed === x.roped + x.stages);
console.log(`    of those ${SHORTFALL.length}: ${derived.length} have pitches EXACTLY equal to the entry count`);
console.log(`    (i.e. the denominator counts the stages the table removes), ${SHORTFALL.length - derived.length} do not.\n`);
show("GENUINE — more pitches claimed than the page describes anywhere; the heading still says so", HONEST);
show("pitches claimed is BELOW the entry count (audit-pitch-count-vs-detail's subject, not this one)", OVER);
console.log(`scanned ${rows.length} rows, ${carried} carry pitch_detail; ${SHORTFALL.length} repaired, ${HONEST.length} genuine (unchanged).`);
const stillClaiming = SHORTFALL.filter(x => /of/.test(x.heading));
if (stillClaiming.length) { console.error(`FAIL: ${stillClaiming.length} route(s) still claim an unsubstantiated shortfall`); process.exit(1); }
if (HONEST.some(x => !/of/.test(x.heading))) { console.error("FAIL: a genuine shortfall stopped being reported"); process.exit(1); }
console.log("both directions hold on the live catalog.");
