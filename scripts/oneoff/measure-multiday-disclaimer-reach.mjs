#!/usr/bin/env node
/* Who is actually SHOWN "This route is typically done over multiple days"?
 *
 * The planner's amber disclaimer is gated on `route.campOptions`, and campOptions is SEED-ONLY:
 * `routes` has no such column under any spelling, the DB store is `bivy`, and deploy.yml sets
 * VITE_USE_DB=true. So the question is not "is the gate a good one" but "does it fire for anybody
 * in production at all".
 *
 * THE MAPPER IS EXECUTED, NEVER GREPPED. dbRouteToCamel opens `return { ...r, ... }` -- it SPREADS
 * the raw row -- so a zero grep in lib/db.js proves nothing about a column, which is a mistake
 * CLAUDE.md records a session making about `difficulty`. Run the mapper and read the property.
 *
 * It also sizes the REPLACEMENT signal against the one the app already uses elsewhere:
 * RouteGearEssentialsBox derives multi-day from the route's own ITINERARY day count and adds a
 * tent and a sleeping bag on the strength of it. Two derivations of one fact on one page is the
 * defect this repo records under _memN and _hfr, so the interesting number is not just "how many
 * routes have an itinerary" but "on how many do the two gates DISAGREE".
 *
 * Read-only, report-only. Decides nothing.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { selectAll } from "../lib/supabase-env.mjs";

const require_ = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
function dead(m) { console.error("BROKEN: " + m); process.exit(1); }

/* ── 1. does campOptions survive the mapper at all? ─────────────────────────────────────────── */
const tmp = fs.mkdtempSync(path.join(ROOT, ".cm-mdr-"));
const out = path.join(tmp, "b.cjs");
try {
  await build({
    stdin: {
      contents: "export { dbRouteToCamel } from " + JSON.stringify(path.join(ROOT, "lib/db.js")) + ";",
      resolveDir: ROOT, loader: "js",
    },
    bundle: true, format: "cjs", platform: "node", jsx: "automatic",
    loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
    outfile: out, logLevel: "error",
  });
} catch (e) { fs.rmSync(tmp, { recursive: true, force: true }); dead("could not bundle lib/db.js: " + e.message); }
const { dbRouteToCamel } = require_(out);
if (typeof dbRouteToCamel !== "function") { fs.rmSync(tmp, { recursive: true, force: true }); dead("lib/db.js does not export dbRouteToCamel"); }

/* ── 2. the two gates, LIFTED from source rather than retyped ───────────────────────────────── */
const RD = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
function lift(re, what) {
  const m = re.exec(RD);
  if (!m) { fs.rmSync(tmp, { recursive: true, force: true }); dead("ANCHOR LOST: " + what); }
  const rest = RD.slice(m.index + m[0].length);
  if (new RegExp(re.source, re.flags).exec(rest)) { fs.rmSync(tmp, { recursive: true, force: true }); dead("AMBIGUOUS: " + what); }
  return m[1];
}
// The planner's disclaimer gate, and the gear box's -- a copy of either would agree with itself
// whatever the app does, which is the whole question.
const PLANNER_EXPR = lift(/,multiDay=([^;]+);/, "the planner's multiDay gate");
const GEAR_EXPR = lift(/const _multiDay=([^;]+);/, "RouteGearEssentialsBox's _multiDay gate");
const plannerGate = new Function("route", "return !!(" + PLANNER_EXPR + ");");
// The gear box computes _itDays on the line before, so give the lifted expression that local.
const GEAR_DAYS = lift(/const _itDays=([^;]+);/, "RouteGearEssentialsBox's _itDays");
const gearGate = new Function("route", "const _itDays=(" + GEAR_DAYS + ");return !!(" + GEAR_EXPR + ");");

console.log("planner gate  : multiDay = " + PLANNER_EXPR);
console.log("gear box gate : _multiDay = " + GEAR_EXPR + "   (_itDays = " + GEAR_DAYS + ")");
console.log("");

const rows = await selectAll(
  "routes",
  "id,name,discipline,bivy,itinerary,timing,pitches,dist_km,gain_ft",
  "id=like.wa_*",
  { pageSize: 1000 },
);
fs.rmSync(tmp, { recursive: true, force: true });
if (!rows.length) dead("read 0 routes - not a clean catalog, a failed read");

/* Is a 2+ day itinerary really "typically done over multiple days", or a leisurely OPTION? The
   gear box already makes the STRONGER commitment on this same signal -- it tells you to carry a
   tent, a sleeping bag, a stove and extra food -- so a signal good enough to pack a tent for is
   good enough to caveat a single-push estimate. Sampled anyway rather than argued. */
const sample = [];
let campOptionsPresent = 0, plannerFires = 0, gearFires = 0, disagree = 0;
let withItin = 0, multiDayItin = 0, withBivy = 0, bivyStarred = 0;
const examples = [];
for (const r of rows) {
  const route = dbRouteToCamel(r);
  if (route.campOptions !== undefined) campOptionsPresent++;
  const days = (route.itinerary && route.itinerary.days && route.itinerary.days.length) || 0;
  if (days) withItin++;
  if (days > 1) multiDayItin++;
  const bivy = Array.isArray(route.bivy) ? route.bivy : [];
  if (bivy.length) withBivy++;
  if (bivy.some((c) => c && c.stars > 0)) bivyStarred++;
  const p = plannerGate(route), g = gearGate(route);
  if (p) plannerFires++;
  if (g) gearFires++;
  if (p !== g) { disagree++; if (examples.length < 8) examples.push(r.id + "  planner=" + p + " gear=" + g + " days=" + days); }
  if (days > 1 && sample.length < 4) {
    const it = route.itinerary;
    sample.push("  " + r.id + "  days=" + days +
      (it.totalNote ? "\n      totalNote: " + String(it.totalNote).slice(0, 150) : "") +
      it.days.slice(0, 3).map((d) => "\n        - " + JSON.stringify(d).slice(0, 130)).join(""));
  }
}

console.log("WA routes read                                   : " + rows.length);
console.log("...where campOptions SURVIVES dbRouteToCamel      : " + campOptionsPresent);
console.log("");
console.log("planner disclaimer fires on                      : " + plannerFires);
console.log("gear box adds overnight kit on                    : " + gearFires);
console.log("the two gates DISAGREE on                         : " + disagree);
for (const e of examples) console.log("    " + e);
console.log("");
console.log("a sample of what a 2+ day itinerary actually holds:");
for (const x of sample) console.log(x);
console.log("");
console.log("routes carrying an itinerary at all               : " + withItin);
console.log("...of 2+ days (the gear box's signal)             : " + multiDayItin);
console.log("routes carrying a bivy entry                      : " + withBivy);
console.log("...with a starred camp (the seed gate's shape)    : " + bivyStarred);
console.log("");
if (campOptionsPresent === 0 && plannerFires === 0) {
  console.log("FINDING: campOptions reaches NO route through the mapper, so the planner's amber");
  console.log("disclaimer renders for nobody in production -- on exactly the routes whose single-push");
  console.log("estimate is least believable. The gear box, in the same file, already derives the same");
  console.log("fact from the route's own itinerary and is right " + multiDayItin + " times.");
} else {
  console.log("The gate is NOT dead on this catalog - re-read before treating it as the seed-only class.");
}
