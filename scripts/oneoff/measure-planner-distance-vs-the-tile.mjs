#!/usr/bin/env node
/* THE ROUTE PAGE ANSWERS "HOW FAR IS THE APPROACH" TWICE, AND THE PLANNER'S COPY IS THE RAW
 * COLUMN.
 *
 * `lib/outing.js` exists because two SCREENS disagreed: the peak page read `dist_km` raw while
 * the route page preferred the route's own itinerary. That fix landed on the route page's TECH
 * STATS tile (`const distKm=effDistKm(route)`) and did NOT reach the PLANNER, which still calls
 *   scarfHrs(route.distKm, route.gainM, route.lossM, fit, pack)
 * -- so on a row whose `dist_km` holds the ROUND TRIP, the tile says one thing and the hike leg
 * behind Est. summit / Est. return / the After-dark warning is charged another.
 *
 * THIS MEASURES, IT DOES NOT DECIDE. The change would move a safety-adjacent estimate, and
 * CLAUDE.md records (#641) that erring SHORT on "are you down before dark" is the direction that
 * reads green. So the question this answers is: how many routes move, by how much, and IN WHICH
 * DIRECTION -- and what does the CLIMBER see on the same page while it happens.
 *
 * Read-only, anon key. Both helpers are IMPORTED from lib/outing.js rather than retyped: a copy
 * would agree with itself whatever the app does, which is the whole question.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selectAll } from "../lib/supabase-env.mjs";
import { effDistKm, itinTotalMi, recShapeOf } from "../../lib/outing.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATE = (process.argv.find((a) => a.startsWith("--state=")) || "--state=wa").split("=")[1];

const KM_PER_MI = 1.60934;
// The planner's own fitness default, so the hours quoted here are the hours the page quotes.
const scarfHrs = (distKm, gainM, lossM) => {
  const f = { sx: 4.8, sy: 600, sz: 800 };
  return (+distKm || 0) / f.sx + (+gainM || 0) / f.sy + (+lossM || 0) / f.sz;
};

const rows = await selectAll(
  "routes",
  "id,name,area_id,dist_km,gain_ft,loss_ft,itinerary,outing_shape",
  STATE === "all" ? "" : `id=like.${STATE}_*`,
  { pageSize: 1000 }
);
if (!rows.length) { console.log(`FAIL: read 0 routes for state=${STATE} — a broken read reports a clean catalog.`); process.exit(1); }

// dbRouteToCamel is what the route page's `route` object has been through, so mimic the two
// fields both readers touch rather than handing raw PostgREST rows to a camelCase reader.
const camel = (r) => ({
  distKm: r.dist_km,
  gainM: r.gain_ft != null ? r.gain_ft / 3.28084 : null,
  lossM: r.loss_ft != null ? r.loss_ft / 3.28084 : null,
  itinerary: r.itinerary,
  outingShape: r.outing_shape,
});

let comparable = 0, differ = 0, plannerLonger = 0, plannerShorter = 0;
const moved = [];
for (const r of rows) {
  const route = camel(r);
  const raw = route.distKm, eff = effDistKm(route);
  if (raw == null || eff == null || !(raw > 0) || !(eff > 0)) continue;
  comparable++;
  const relDiff = Math.abs(raw - eff) / Math.max(raw, eff);
  if (relDiff <= 0.15) continue;
  differ++;
  const hRaw = scarfHrs(raw, route.gainM, route.lossM);
  const hEff = scarfHrs(eff, route.gainM, route.lossM);
  if (raw > eff) plannerLonger++; else plannerShorter++;
  moved.push({
    id: r.id, name: r.name,
    rawMi: raw / KM_PER_MI, effMi: eff / KM_PER_MI,
    dH: hEff - hRaw, shape: recShapeOf(route) || "(none)",
    itinMi: itinTotalMi(route),
  });
}

console.log(`state=${STATE}  routes read: ${rows.length}`);
console.log(`comparable (both a stored distance and an itinerary-derived one): ${comparable}`);
console.log(`differ by more than 15%: ${differ}`);
console.log(`  the PLANNER currently charges MORE than the tile shows: ${plannerLonger}`);
console.log(`  the PLANNER currently charges LESS than the tile shows: ${plannerShorter}`);

if (moved.length) {
  const d = moved.map((m) => m.dH).sort((a, b) => a - b);
  const q = (p) => d[Math.min(d.length - 1, Math.floor(p * d.length))];
  console.log(`\nhours the hike leg would MOVE if the planner used effDistKm (negative = shorter estimate):`);
  console.log(`  p10 ${q(0.1).toFixed(2)}   p50 ${q(0.5).toFixed(2)}   p90 ${q(0.9).toFixed(2)}   min ${d[0].toFixed(2)}   max ${d[d.length-1].toFixed(2)}`);
  const optimistic = moved.filter((m) => m.dH < 0).length;
  console.log(`  routes whose estimate would get SHORTER (the #641 direction): ${optimistic} of ${moved.length}`);
  console.log(`\nthe 12 largest movers:`);
  for (const m of moved.sort((a, b) => Math.abs(b.dH) - Math.abs(a.dH)).slice(0, 12)) {
    console.log(`  ${m.dH >= 0 ? "+" : ""}${m.dH.toFixed(2)} hr  ${m.id}`);
    console.log(`      tile ${m.effMi.toFixed(1)} mi vs planner ${m.rawMi.toFixed(1)} mi   itinerary ${m.itinMi} mi   shape ${m.shape}`);
  }
}
console.log(`\nREPORT ONLY. Which figure is right is per-row: CLAUDE.md records that dist_km holds two`);
console.log(`conventions at once and that a blanket transform breaks as many rows as it fixes.`);
