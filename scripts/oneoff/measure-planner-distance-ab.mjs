#!/usr/bin/env node
/* A/B: what does the SCREEN say if the planner's hike leg reads effDistKm instead of the raw
 * dist_km column?
 *
 * measure-planner-distance-vs-the-tile.mjs answers "how many hours does the hike leg move".
 * That is not the decision-relevant number. The decision-relevant number is how many routes
 * gain or lose the RED "After dark" label, because CLAUDE.md records #641 as the direction that
 * reads green and this whole question is whether the change errs short on "are you down before
 * dark".
 *
 * The planner statement is LIFTED from RouteDetail.jsx and executed, never retyped -- the same
 * mechanism measure-after-dark-on-a-multiday-estimate.mjs uses, and for the same reason: a copy
 * would agree with itself whatever the app does. The ONLY difference between the A leg and the B
 * leg is which distance is handed in, so any movement is attributable to that alone.
 *
 * NOT SPENT BY THE CHANGE IT MEASURED, which this repo has had to learn twice: a one-shot
 * before/after verifier that pins one side goes stale the day its change merges and then reports
 * failures about work already on main. The lifted statement is PARAMETERISED on the distance and
 * run twice with two inputs -- one statement, two arguments -- so leg A is always the raw column
 * and leg B always effDistKm whichever the app currently reads. It prints which side the app is
 * on rather than inferring it, and fails ANCHOR LOST if the hike leg stops reading a distance it
 * recognises at all.
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
import { effDistKm, itinTotalMi, recShapeOf } from "../../lib/outing.js";

const require_ = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RD = path.join(ROOT, "RouteDetail.jsx");
function dead(m) { console.error("BROKEN: " + m); process.exit(1); }

const src = fs.readFileSync(RD, "utf8");
function lift(re, what) {
  const m = re.exec(src);
  if (!m) dead("ANCHOR LOST: " + what);
  const rest = src.slice(m.index + m[0].length);
  if (new RegExp(re.source, re.flags).exec(rest)) dead("AMBIGUOUS: " + what);
  return m[0];
}
const STMT_EST = lift(/const hikeH=scarfHrs\([\s\S]*?retH=[^;]*;/, "the estimate statement");
const STMT_FLAG = lift(/const late=retH>[^;]*;/, "the late/sumLate statement");
if (STMT_EST.length < 200) dead("estimate statement lifted short");

/* THE B LEG IS THE A LEG WITH ONE SUBSTITUTION, made on the lifted text rather than by writing a
   second statement: scarfHrs(route.distKm,...) -> scarfHrs(__DIST,...). Everything downstream --
   totalH, sumH, retH, the two thresholds -- is the app's own, unmodified. */
const DIST_RE = /scarfHrs\((route\.distKm|effDistKm\(route\))\s*,/;
const cur = DIST_RE.exec(STMT_EST);
if (!cur) dead("ANCHOR LOST: the planner's hike leg no longer reads a distance this script recognises");
const STMT_PARAM = STMT_EST.replace(DIST_RE, "scarfHrs(__DIST,");
const SIDE = cur[1] === "effDistKm(route)" ? "effDistKm (shipped)" : "the raw dist_km column";

const mk = (est) => new Function(
  "route", "__DIST", "fit", "pack", "party", "depart",
  "scarfHrs", "techHrs", "gn", "gainCoversWholeOuting",
  `
  const hasPublishedSummitH=route.timing&&route.timing.summitTimeHrs!=null;
  const derivedSummitH=(!hasPublishedSummitH&&route.timing&&route.timing.totalHrs!=null)?Math.max(0,route.timing.totalHrs-(route.timing.approachTimeHrs||0)-(route.timing.descentTimeHrs||0)):null;
  const hasDerivedSummitH=derivedSummitH!=null&&derivedSummitH>0;
  const publishedIsWholeDay=!!(route.timing&&route.timing.summitTimeHrs!=null&&route.timing.totalHrs!=null&&route.timing.summitTimeHrs===route.timing.totalHrs&&route.timing.approachTimeHrs==null);
  const hikeCoversWholeDay=gainCoversWholeOuting(route);
  ${est}
  ${STMT_FLAG}
  return { hikeH, sumH, retH, late, sumLate };
`);
const run = mk(STMT_PARAM);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cm-abdist-"));
const out = path.join(tmp, "b.cjs");
await build({
  stdin: {
    contents: "export { scarfHrs, techHrs, gn, gainCoversWholeOuting } from " +
      JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx")) + ";",
    resolveDir: ROOT, loader: "js",
  },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const M = require_(out);
for (const n of ["scarfHrs", "techHrs", "gn", "gainCoversWholeOuting"]) {
  if (typeof M[n] !== "function") dead("core does not export " + n);
}

const DEF = /useState\(\{fit:"([a-z]+)",pack:(\d+),party:(\d+),depart:(\d+)\}\)/.exec(src);
if (!DEF) dead("ANCHOR LOST: the calculator defaults");
const fit = DEF[1], pack = +DEF[2], party = +DEF[3], depart = +DEF[4];

const rows = await selectAll(
  "routes",
  "id,name,dist_km,gain_ft,loss_ft,pitches,grade,discipline,timing,waypoints,itinerary,outing_shape",
  "id=like.wa_*",
  { pageSize: 1000 },
);
if (!rows.length) dead("read 0 routes");

let n = 0, moved = 0, lateOff = 0, lateOn = 0, sumOff = 0, sumOn = 0;
let lateA = 0, lateB = 0;
const byShape = new Map();
const offRows = [], onRows = [], margins = [];
for (const r of rows) {
  const route = {
    distKm: r.dist_km,
    gainM: r.gain_ft != null ? r.gain_ft / 3.28084 : null,
    lossM: r.loss_ft != null ? r.loss_ft / 3.28084 : null,
    pitches: r.pitches, grade: r.grade, discipline: r.discipline,
    timing: r.timing, waypoints: r.waypoints,
    itinerary: r.itinerary, outingShape: r.outing_shape,
    gain_ft: r.gain_ft, loss_ft: r.loss_ft,
  };
  const eff = effDistKm(route);
  if (route.distKm == null || eff == null) continue;
  let a, b;
  try {
    a = run(route, route.distKm, fit, pack, party, depart, M.scarfHrs, M.techHrs, M.gn, M.gainCoversWholeOuting);
    b = run(route, eff, fit, pack, party, depart, M.scarfHrs, M.techHrs, M.gn, M.gainCoversWholeOuting);
  } catch { continue; }
  if (!isFinite(a.retH) || !isFinite(b.retH)) continue;
  n++;
  if (a.late) lateA++;
  if (b.late) lateB++;
  const changed = Math.abs(a.retH - b.retH) > 0.01;
  if (!changed) continue;
  moved++;
  const shape = recShapeOf(route) || "(none)";
  const k = shape + (b.retH < a.retH ? " / shorter" : " / longer");
  byShape.set(k, (byShape.get(k) || 0) + 1);
  // a multi-day route already renders the amber "single-push estimate is a reference only" box
  // The route's OWN itinerary, not the app's `multiDay` flag: that flag reads route.campOptions,
  // which is seed-only (0 hits in lib/db.js, the column is `bivy`), so the amber "single-push
  // estimate is a reference only" box cannot render on a DB route at all.
  const days = (route.itinerary && route.itinerary.days || []).length;
  const multiDay = days > 1;
  if (a.late && !b.late) { lateOff++; offRows.push({ id: r.id, a: a.retH, b: b.retH, shape, multiDay }); }
  if (!a.late && b.late) { lateOn++; onRows.push({ id: r.id, a: a.retH, b: b.retH, shape, multiDay }); }
  margins.push(Math.min(Math.abs(a.retH - 18.5), Math.abs(b.retH - 18.5)));
  if (a.sumLate && !b.sumLate) sumOff++;
  if (!a.sumLate && b.sumLate) sumOn++;
}

console.log("the planner today reads    : " + SIDE);
console.log("defaults read from source : fit=" + fit + " pack=" + pack + " party=" + party + " depart=" + depart);
console.log("routes with both figures  : " + n);
console.log("estimates that MOVE at all: " + moved);
console.log("");
console.log('"After dark" fires on      : ' + lateA + "  (raw dist_km)   ->  " + lateB + "  (effDistKm)");
console.log("  warnings SUPPRESSED (the #641 direction) : " + lateOff);
console.log("  warnings ADDED      (more conservative)  : " + lateOn);
console.log('"Leave earlier" suppressed : ' + sumOff + "   added: " + sumOn);
console.log("");
console.log("movement by recorded trip shape:");
for (const [k, v] of Array.from(byShape.entries()).sort((x, y) => y[1] - x[1])) {
  console.log("  " + k.padEnd(22) + v);
}
const fmtR = (x) => x.id.padEnd(44) + " ret " + x.a.toFixed(1) + "h -> " + x.b.toFixed(1) + "h  shape=" + x.shape + (x.multiDay ? "  [" + "multi-day itinerary]" : "");
console.log("");
console.log("every SUPPRESSED warning (" + offRows.length + "), worst first:");
for (const x of offRows.sort((p, q) => (p.a - p.b) - (q.a - q.b) > 0 ? -1 : 1).slice(0, 25)) console.log("  " + fmtR(x));
const mdOff = offRows.filter((x) => x.multiDay).length;
console.log("  ...of which are a MULTI-DAY itinerary: " + mdOff + " of " + offRows.length);
/* IS THE "0 SUPPRESSED" ROBUST, OR A KNIFE EDGE? A warning can only be lost by CROSSING 18.5
   downward, so the answer is how close the movers sit to that line. Report the margin rather
   than asserting the result holds. */
{
  const m = margins.sort((a, b) => a - b);
  const q = (p) => m[Math.min(m.length - 1, Math.floor(p * m.length))];
  console.log("");
  console.log("how far the MOVING estimates sit from the 18.5h warning line (hours):");
  console.log("  closest " + m[0].toFixed(2) + "   p10 " + q(0.1).toFixed(2) + "   p50 " + q(0.5).toFixed(2) + "   p90 " + q(0.9).toFixed(2));
  console.log("  movers within 2h of the line (the only ones that could flip): " + m.filter((x) => x < 2).length);
}
console.log("");
console.log("every ADDED warning (" + onRows.length + "):");
for (const x of onRows.slice(0, 15)) console.log("  " + fmtR(x));
fs.rmSync(tmp, { recursive: true, force: true });
