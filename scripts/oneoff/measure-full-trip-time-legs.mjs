// READ-ONLY. Where does FULL TRIP TIME print "N/A" (or nothing) for a leg that another Plan-tab surface
// times? The owner (2026-11-23): "sometimes it doesn't show the approach time or have the time for other
// legs when it shows it in other places."
//
// Runs the SHIPPED lib/planTimes.js on every route the Calculator mounts for (not CRAG_CATS) and applies
// each tile's own show-test, as Calculator.tsx wrote it before this fix (the `old*` tests) and after it
// (the `P.*` flags planTimes now returns). The other surfaces are SummitLegsCard (TRAILHEAD TO SUMMIT,
// always timed off planTimes.totalH) and DescentLegStrip (downH).
//   node scripts/oneoff/measure-full-trip-time-legs.mjs [--out file.json]
import "../lib/load-env.mjs";
import { build } from "esbuild";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = fs.mkdtempSync(path.join(process.env.CLAUDE_JOB_DIR ? path.join(process.env.CLAUDE_JOB_DIR, "tmp") : os.tmpdir(), "ftt-"));
const entry = path.join(dir, "entry.js");
fs.writeFileSync(entry, `export { planTimes, summitDayPlan, realPitches, climbPitches } from ${JSON.stringify(path.join(ROOT, "lib", "planTimes.js"))};\nexport { catOf, CRAG_CATS } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};\n`);
const bundle = path.join(dir, "bundle.cjs");
await build({
  entryPoints: [entry], bundle: true, format: "cjs", platform: "node",
  outfile: bundle, jsx: "automatic", loader: { ".js": "jsx", ".jsx": "jsx" }, logLevel: "silent",
  define: { "import.meta.env": "{}" },
});
const M = createRequire(import.meta.url)(bundle);
const { planTimes, summitDayPlan, realPitches, catOf } = M;
const CRAG = M.CRAG_CATS || ["trad", "sport", "toprope", "aid", "bouldering"];

const rows = await selectAll("routes", "id,name,area_id,discipline,grade,pitches,length_m,gain_ft,loss_ft,dist_km,timing,itinerary,outing_shape",
  "discipline=not.in.(sport,toprope,bouldering)", { key: requireServiceKey(), pageSize: 1000 });
/* A TRAD (or rock) route on a PEAK is alpine to catOf() (climbsAPeak reads the area's type), so it mounts Full
   trip time too: every route the card can reach is read, and catOf decides with the area it would see. */
const peaks = new Set((await selectAll("areas", "id", "area_type=eq.peak", { key: requireServiceKey(), pageSize: 1000 })).map((a) => a.id));
const blank = (v) => v == null || v === "";
const out = { approach: [], climb: [], descent: [], total: [], mdClimbHidden: [], mdWalkInHidden: [] };
// AFTER: the same question asked of the flags Calculator.tsx now reads. Each must be 0.
const after = { approach: 0, climb: 0, descent: 0, total: 0, legCardZero: 0 };
let mounted = 0, multi = 0, tradOnPeak = 0, gainFromPlan = 0, gainFromPlanUntimed = 0, distFromPlan = 0, lengthCapped = 0;
for (const r of rows) {
  const route = {
    id: r.id, discipline: r.discipline, grade: r.grade, pitches: r.pitches, mountainId: r.area_id, _dbArea: { areaType: peaks.has(r.area_id) ? "peak" : null },
    routeFt: r.length_m != null ? Math.round(r.length_m * 3.28084) : null,
    gainM: r.gain_ft != null ? Math.round(r.gain_ft / 3.28084) : null,
    lossM: r.loss_ft != null ? Math.round(r.loss_ft / 3.28084) : null,
    distKm: r.dist_km, itinerary: r.itinerary, outingShape: r.outing_shape, timing: r.timing,
  };
  if (CRAG.includes(catOf(route))) continue;
  mounted++;
  if (/^(trad|rock|aid)$/.test(r.discipline || "")) tradOnPeak++;
  const P = planTimes(route, {});
  // THE TRIP PLAN'S GAIN AND MILES: the leg card prints them (routeAscentFt, effDistKm); did the walk time them?
  const planGainFt = Array.isArray(r.itinerary && r.itinerary.days) ? r.itinerary.days.reduce((a, d) => a + ((d && d.gainFt) || 0), 0) : 0;
  if (blank(route.gainM) && planGainFt > 0) { gainFromPlan++; if (P.walkGainM == null) gainFromPlanUntimed++; }
  if (blank(route.distKm) && P.walkKm != null) distFromPlan++;
  if (!P.legsStored && realPitches(route) === 0 && M.climbPitches(route) > 0) lengthCapped++; // climbing timed on the length curve
  const tag = { id: r.id, name: r.name, disc: r.discipline, hikeH: +P.hikeH.toFixed(2), techH: +P.techH.toFixed(2), downH: +P.downH.toFixed(2), tripH: +P.tripH.toFixed(2) };
  const oldHike = !blank(route.distKm) || !blank(route.gainM);
  const oldAny = oldHike || P.hasPublishedSummitH || P.hasDerivedSummitH || realPitches(route) > 0 || P.loneApproachH != null || P.loneDescentH != null;
  const sd = summitDayPlan(route, P, { depart: 4 });
  if (sd) {
    multi++;
    // The multi-day view used to time the climb only as a summit-day clock, never as a duration.
    if (sd.timed && P.techH > 0.05) out.mdClimbHidden.push(tag);
    if (sd.why === "whole") out.mdWalkInHidden.push(tag);
    continue;
  }
  if (P.publishedIsWholeDay) continue; // one car-to-car figure, the same on every surface
  if (!(oldHike || P.storedApproachH != null || P.loneApproachH != null) && P.hikeH > 0.05) out.approach.push(tag);
  if (!P.climbKnown && P.techH > 0.05) out.climb.push(tag);
  if (!(oldAny && (P.downH > 0 || P.storedDescentH != null)) && P.downH > 0.05) out.descent.push(tag);
  if (!oldAny && P.tripH > 0.05) out.total.push(tag);
  if (!P.approachTimed && P.hikeH > 0) after.approach++;
  if (!P.climbTimed && P.techH > 0) after.climb++;
  if (!P.descentTimed && P.downH > 0) after.descent++;
  if (!P.anyTimed && P.tripH > 0) after.total++;
  // The leg card used to print "â‰¥0.0hr" for a leg Full trip time calls N/A.
  if (!P.descentTimed && P.downH === 0) after.legCardZero++;
}
console.log(`${rows.length} routes read; ${mounted} mount Full trip time (${tradOnPeak} of them trad/rock/aid on a peak); ${multi} of those show the multi-day view`);
console.log(`One-day view â€” a tile printed N/A while planTimes (and the leg card under GETTING THERE) timed it:`);
console.log(`  Approach: ${out.approach.length}   Climbing: ${out.climb.length}   Descent: ${out.descent.length}   Total: ${out.total.length}`);
console.log(`  AFTER the fix: Approach ${after.approach}   Climbing ${after.climb}   Descent ${after.descent}   Total ${after.total}  (a descent leg card now leaves out its "â‰¥0.0hr": ${after.legCardZero})`);
console.log(`Trip plan holds the gain the leg card prints (no gain_ft): ${gainFromPlan}, of them the walk ignores it: ${gainFromPlanUntimed}; trip plan holds the miles (no dist_km): ${distFromPlan}; climbing timed from the length alone (no published time, no pitch count): ${lengthCapped}`);
console.log(`Multi-day view â€” the climb timed only as a clock, no duration: ${out.mdClimbHidden.length}; only one whole-trip figure: ${out.mdWalkInHidden.length}`);
for (const k of ["approach", "climb", "descent", "total"]) for (const x of out[k].slice(0, 4)) console.log(`  [${k}] ${x.id}  approach ${x.hikeH}  climb ${x.techH}  descent ${x.downH}`);
const i = process.argv.indexOf("--out");
if (i > 0) fs.writeFileSync(process.argv[i + 1], JSON.stringify(out, null, 1));
