// READ-ONLY. What does the Planner's "Or estimate for your party" print on a MULTI-DAY route?
// Runs lib/planTimes.js at the Calculator's defaults (intermediate, 10 kg, party 2, 6:00 AM) on
// every route whose trip plan has more than one day, and compares it with the trip plan.
//   node scripts/oneoff/measure-multiday-estimate.mjs [--out file.json]
import "../lib/load-env.mjs";
import { build } from "esbuild";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = fs.mkdtempSync(path.join(process.env.CLAUDE_JOB_DIR || os.tmpdir(), "tmp", "mde-"));
const bundle = path.join(dir, "planTimes.cjs");
await build({
  entryPoints: [path.join(ROOT, "lib", "planTimes.js")], bundle: true, format: "cjs", platform: "node",
  outfile: bundle, jsx: "automatic", loader: { ".js": "jsx", ".jsx": "jsx" }, logLevel: "silent",
  define: { "import.meta.env": "{}" },
});
const { planTimes, summitDayPlan } = createRequire(import.meta.url)(bundle);

const rows = await selectAll("routes", "id,name,discipline,grade,pitches,length_m,gain_ft,loss_ft,dist_km,timing,itinerary,outing_shape",
  "itinerary=not.is.null", { key: requireServiceKey(), pageSize: 500 });
const dayOf = (h) => Math.floor(Math.round(h * 60) / 1440);
const out = [];
for (const r of rows) {
  const days = r.itinerary && Array.isArray(r.itinerary.days) ? r.itinerary.days : [];
  if (days.length < 2) continue;
  const route = {
    id: r.id, discipline: r.discipline, grade: r.grade, pitches: r.pitches,
    routeFt: r.length_m != null ? Math.round(r.length_m * 3.28084) : null,
    gainM: r.gain_ft != null ? Math.round(r.gain_ft / 3.28084) : null,
    lossM: r.loss_ft != null ? Math.round(r.loss_ft / 3.28084) : null,
    distKm: r.dist_km, itinerary: r.itinerary, outingShape: r.outing_shape, timing: r.timing,
  };
  const p = planTimes(route, {});
  // The Calculator's own defaults: Depart 6:00 for the single push, Leave camp 4:00 for the summit day.
  const sd = summitDayPlan(route, p, { depart: 4 });
  const dayH = days.every((d) => typeof d.hours === "number") ? days.reduce((s, d) => s + d.hours, 0) : null;
  out.push({
    id: r.id, name: r.name, disc: r.discipline, nDays: days.length, dayH,
    pubTotal: r.timing && r.timing.totalHrs != null ? r.timing.totalHrs : null,
    approachH: +p.hikeH.toFixed(2), climbH: +p.techH.toFixed(2), descentH: +p.downH.toFixed(2), tripH: +p.tripH.toFixed(2),
    sumClock: +p.sumH.toFixed(2), retClock: +p.retH.toFixed(2), sumDay: dayOf(p.sumH), retDay: dayOf(p.retH),
    late: p.retH > 18.5, sumLate: !p.publishedIsWholeDay && p.sumH > 13,
    sd, summitDayFromCamp: p.summitDayFromCamp, wholeDay: p.publishedIsWholeDay, legsStored: p.legsStored, floor: p.legsFloor,
  });
}
const n = out.length, c = (f) => out.filter(f).length;
console.log(`${n} multi-day routes (trip plan with 2+ days)`);
console.log(`  Est. return lands on a LATER day ("+Nd"):       ${c((x) => x.retDay > 0)}`);
console.log(`  Est. summit lands on a later day:              ${c((x) => x.sumDay > 0)}`);
console.log(`  red return label (After dark / Overnight):     ${c((x) => x.late)}`);
console.log(`  red summit label (Leave earlier / Overnight):  ${c((x) => x.sumLate)}`);
console.log(`  read as a summit day FROM CAMP:                ${c((x) => x.summitDayFromCamp)}`);
console.log(`  only a floor ("≥"):                            ${c((x) => x.floor)}`);
const withDays = out.filter((x) => x.dayH != null);
const ratio = withDays.map((x) => x.tripH / x.dayH).sort((a, b) => a - b);
console.log(`  Total trip vs the plan's Moving hours (${withDays.length} with day hours): median ${ratio[ratio.length >> 1].toFixed(2)}x, p10 ${ratio[Math.floor(ratio.length * 0.1)].toFixed(2)}x, p90 ${ratio[Math.floor(ratio.length * 0.9)].toFixed(2)}x; within 10%: ${withDays.filter((x) => Math.abs(x.tripH / x.dayH - 1) <= 0.1).length}`);
// THE SUMMIT-DAY VIEW (summitDayPlan): what the box prints since 2026-11-18.
const t = out.filter((x) => x.sd && x.sd.timed), u = out.filter((x) => x.sd && !x.sd.timed);
console.log(`\nsummit-day view: timed ${t.length}, durations only ${u.length} (${["whole", "long", "noclimb"].map((w) => w + " " + u.filter((x) => x.sd.why === w).length).join(", ")})`);
console.log(`  summit day ends at the car: ${t.filter((x) => x.sd.endAt === "car").length}; at camp with back-at-camp known: ${t.filter((x) => x.sd.endAt === "camp" && x.sd.endClock != null).length}, unknown: ${t.filter((x) => x.sd.endAt === "camp" && x.sd.endClock == null).length}`);
console.log(`  red summit (after 1 PM, leaving camp 4 AM): ${t.filter((x) => x.sd.sumLate).length}; red return (after 6:30 PM): ${t.filter((x) => x.sd.late).length}`);
const ups = t.map((x) => x.sd.upH).sort((a, b) => a - b);
console.log(`  summit-day time up from camp: median ${ups[ups.length >> 1].toFixed(1)} hr, p90 ${ups[Math.floor(ups.length * 0.9)].toFixed(1)} hr`);
const o = process.argv.indexOf("--out");
if (o > 0) fs.writeFileSync(process.argv[o + 1], JSON.stringify(out, null, 1));
